export const maxDuration = 90;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkAndIncrementQuota } from '@/lib/quota';
import { connectToDatabase } from '@/lib/db';
import Reading from '@/models/Reading';
import { geocodeCity, getTimezoneForCoords } from '@/lib/geocode';
import { computeBirthChart } from '@/lib/ephemeris';
import { callGrokText, fillTemplate } from '@/lib/ai';
import { retrieveMarriageContext } from '@/lib/rag';
import { resolveLanguage } from '@/lib/language';
import { translateToLocale } from '@/lib/serverTranslate';
import { computeAshtakoot } from '@/lib/vedic/ashtakoot';
import { analyzeManglik } from '@/lib/vedic/chart-analysis';
import { computeMarriageMuhurtas } from '@/lib/vedic/muhurta';
import marriageBicharPrompt from '@/config/prompts/marriage-bichar.prompt.json';

// Default coordinates for India (used when no location is provided for partners)
const DEFAULT_LAT = 20.5937;
const DEFAULT_LNG = 78.9629;
const DEFAULT_UTC_OFFSET = 330; // IST = UTC+5:30

interface PartnerInput {
  name?: string;
  date?: string;
  time?: string;
  location?: string;
  lat?: number;
  lng?: number;
}

interface PartnerGeo {
  lat: number;
  lng: number;
  displayName: string;
  timezone: string;
  utcOffsetMinutes: number;
  locationAssumed: boolean;
}

/** Prefer map-picked coordinates, then text geocoding, then India default */
async function resolvePartnerGeo(partner: PartnerInput): Promise<PartnerGeo> {
  if (typeof partner.lat === 'number' && typeof partner.lng === 'number') {
    const tz = getTimezoneForCoords(partner.lat, partner.lng);
    return {
      lat: partner.lat,
      lng: partner.lng,
      displayName: partner.location?.trim() || `${partner.lat.toFixed(3)}, ${partner.lng.toFixed(3)}`,
      timezone: tz.timezone,
      utcOffsetMinutes: tz.utcOffsetMinutes,
      locationAssumed: false,
    };
  }
  if (partner.location?.trim()) {
    const geo = await geocodeCity(partner.location);
    return {
      lat: geo.lat,
      lng: geo.lng,
      displayName: geo.displayName,
      timezone: geo.timezone,
      utcOffsetMinutes: geo.utcOffsetMinutes,
      locationAssumed: false,
    };
  }
  return {
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    displayName: 'India (default)',
    timezone: 'Asia/Kolkata',
    utcOffsetMinutes: DEFAULT_UTC_OFFSET,
    locationAssumed: true,
  };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !(session.user as any)?.id) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to check compatibility.' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    // Check & increment daily quota for marriage_bichar
    const quotaResult = await checkAndIncrementQuota(userId, 'marriage_bichar');
    if (!quotaResult.allowed) {
      return NextResponse.json(
        { error: `Daily limit reached for Marriage Bichar. You have 0 of ${quotaResult.limit} readings left today.` },
        { status: 429 }
      );
    }

    const { partner1, partner2, language } = await req.json();

    if (!partner1?.name || !partner1?.date || !partner2?.name || !partner2?.date) {
      return NextResponse.json({ error: 'Name and date of birth for both partners are required.' }, { status: 400 });
    }

    // Resolve real coordinates per partner (map pick > text geocode > India default)
    const geo1 = await resolvePartnerGeo(partner1);
    const geo2 = await resolvePartnerGeo(partner2);

    // Compute birth chart data for both partners at their actual locations.
    // Use noon (12:00) as default time if not provided — sun sign will still be accurate;
    // Moon sign may be off by 1 sign for births near sign boundaries (noted in metadata)
    const p1Time = partner1.time || '12:00';
    const p2Time = partner2.time || '12:00';

    const chart1 = computeBirthChart(partner1.date, p1Time, geo1.lat, geo1.lng, geo1.utcOffsetMinutes);
    const chart2 = computeBirthChart(partner2.date, p2Time, geo2.lat, geo2.lng, geo2.utcOffsetMinutes);

    // ─── Deterministic ground truth (never recomputed by the AI) ─────────
    const ashtakoot = computeAshtakoot(chart1, chart2, partner1.name, partner2.name);
    const manglik1 = analyzeManglik(chart1);
    const manglik2 = analyzeManglik(chart2);
    const muhurtas = computeMarriageMuhurtas(chart1, chart2, { months: 12, topN: 8 });

    const ashtakootTable = [
      '| Koota | Max | Score | Assessment |',
      '|---|---|---|---|',
      ...ashtakoot.kootas.map((k) => `| ${k.name} | ${k.maxPoints} | ${k.score} | ${k.assessment} |`),
    ].join('\n');

    const manglikLine = (name: string, m: typeof manglik1) =>
      `* ${name}: ${m.isManglik ? 'MANGLIK' : 'NON-MANGLIK'} (severity: ${m.severity}) — Mars in house ${m.marsHouseFromLagna} from Lagna and house ${m.marsHouseFromMoon} from Moon. Cancellation: ${m.cancellation}`;

    const manglikFacts = [
      manglikLine(partner1.name, manglik1),
      manglikLine(partner2.name, manglik2),
      `* Pair note: ${ashtakoot.manglik.note}`,
    ].join('\n');

    const doshaFlags = [
      `* Nadi Dosha: ${ashtakoot.nadiDosha ? 'PRESENT' : 'absent'}`,
      `* Bhakoot Dosha: ${ashtakoot.bhakootDosha ? 'PRESENT' : 'absent'}`,
    ].join('\n');

    const muhurtaList = muhurtas.length
      ? muhurtas
          .map((m) => `* ${m.date} (${m.weekday}) — ${m.tithi}, Moon in ${m.nakshatra} — score ${m.score}. Reasons: ${m.reasons.join('; ')}`)
          .join('\n')
      : 'No fully auspicious dates found in the next 12 months.';

    // Retrieve relevant Vedic knowledge for both charts
    const vedicContext = retrieveMarriageContext(chart1, chart2, 4);

    // Fill marriage bichar prompt template (English generation — translated after)
    const userPrompt = fillTemplate(marriageBicharPrompt.userPromptTemplate, {
      partner1Name:            partner1.name,
      partner1Date:            partner1.date,
      partner1Time:            partner1.time || '12:00 (assumed)',
      partner1Location:        geo1.displayName,
      partner1Sun:             chart1.sun.sign,
      partner1Moon:            chart1.moon.sign,
      partner1Nakshatra:       chart1.nakshatra.name,
      partner1Pada:            chart1.nakshatra.pada,
      partner1NakshatraLord:   chart1.nakshatra.lord,
      partner1Ascendant:       chart1.ascendant.sign,

      partner2Name:            partner2.name,
      partner2Date:            partner2.date,
      partner2Time:            partner2.time || '12:00 (assumed)',
      partner2Location:        geo2.displayName,
      partner2Sun:             chart2.sun.sign,
      partner2Moon:            chart2.moon.sign,
      partner2Nakshatra:       chart2.nakshatra.name,
      partner2Pada:            chart2.nakshatra.pada,
      partner2NakshatraLord:   chart2.nakshatra.lord,
      partner2Ascendant:       chart2.ascendant.sign,

      ashtakootTable,
      ashtakootTotal:          ashtakoot.totalScore,
      ashtakootVerdict:        `${ashtakoot.verdict} — ${ashtakoot.verdictDetail}`,
      manglikFacts,
      doshaFlags,
      muhurtaList,
    });

    const finalSystemPrompt = fillTemplate(marriageBicharPrompt.systemPrompt, {
      vedicContext,
    });

    // Call AI (always English — deterministic numbers are injected as ground truth)
    const aiResponse = await callGrokText(
      marriageBicharPrompt.model,
      finalSystemPrompt,
      userPrompt,
      marriageBicharPrompt.maxTokens,
      { temperature: 0.2, topP: 0.9 }
    );

    // Translate the English report to the user's locale (no-op for English)
    const targetLocale = resolveLanguage(language);
    let finalText = aiResponse.text;
    try {
      finalText = await translateToLocale(finalText, targetLocale);
    } catch (translateError) {
      console.warn('[marriage-bichar] Translation failed — returning English report:', translateError);
    }

    // Shared metadata payload (language-independent)
    const metadataCharts = {
      partner1Chart: {
        sun: chart1.sun.sign,
        moon: chart1.moon.sign,
        nakshatra: chart1.nakshatra.name,
        ascendant: chart1.ascendant.sign,
        timeAssumed: !partner1.time,
        locationAssumed: geo1.locationAssumed,
        location: geo1.displayName,
        geo: { lat: geo1.lat, lng: geo1.lng, timezone: geo1.timezone },
      },
      partner2Chart: {
        sun: chart2.sun.sign,
        moon: chart2.moon.sign,
        nakshatra: chart2.nakshatra.name,
        ascendant: chart2.ascendant.sign,
        timeAssumed: !partner2.time,
        locationAssumed: geo2.locationAssumed,
        location: geo2.displayName,
        geo: { lat: geo2.lat, lng: geo2.lng, timezone: geo2.timezone },
      },
    };

    // Store reading in MongoDB
    await connectToDatabase();
    const newReading = new Reading({
      userId,
      type: 'marriage_bichar',
      inputData: { partner1, partner2 },
      result: finalText,
      metadata: {
        ...metadataCharts,
        ashtakoot: {
          totalScore: ashtakoot.totalScore,
          verdict: ashtakoot.verdict,
          nadiDosha: ashtakoot.nadiDosha,
          bhakootDosha: ashtakoot.bhakootDosha,
          kootas: ashtakoot.kootas.map((k) => ({ name: k.name, maxPoints: k.maxPoints, score: k.score })),
        },
        manglik: ashtakoot.manglik,
        muhurtaDates: muhurtas,
        tokens: aiResponse.usage,
      },
    });
    await newReading.save();

    return NextResponse.json({
      result: finalText,
      metadata: {
        partner1: {
          name: partner1.name,
          sunSign: chart1.sun.sign,
          moonSign: chart1.moon.sign,
          nakshatra: `${chart1.nakshatra.name} (Pada ${chart1.nakshatra.pada})`,
          ascendant: chart1.ascendant.sign,
          timeAssumed: !partner1.time,
          locationAssumed: geo1.locationAssumed,
          location: geo1.displayName,
        },
        partner2: {
          name: partner2.name,
          sunSign: chart2.sun.sign,
          moonSign: chart2.moon.sign,
          nakshatra: `${chart2.nakshatra.name} (Pada ${chart2.nakshatra.pada})`,
          ascendant: chart2.ascendant.sign,
          timeAssumed: !partner2.time,
          locationAssumed: geo2.locationAssumed,
          location: geo2.displayName,
        },
        // Deterministic, language-independent facts for UI cards
        ashtakoot: {
          totalScore: ashtakoot.totalScore,
          maxScore: ashtakoot.maxScore,
          verdict: ashtakoot.verdict,
          kootas: ashtakoot.kootas.map((k) => ({ name: k.name, maxPoints: k.maxPoints, score: k.score })),
        },
        manglik: ashtakoot.manglik,
        muhurtaDates: muhurtas,
      },
      remainingQuota: quotaResult.remaining,
      limit: quotaResult.limit,
    });
  } catch (error: any) {
    console.error('[marriage-bichar] Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
