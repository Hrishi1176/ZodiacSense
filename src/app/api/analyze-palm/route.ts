export const maxDuration = 90;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkAndIncrementQuota } from '@/lib/quota';
import { connectToDatabase } from '@/lib/db';
import Reading from '@/models/Reading';
import { callGrokVision, fillTemplate } from '@/lib/ai';
import { resolveLanguage } from '@/lib/language';
import { translateToLocale } from '@/lib/serverTranslate';
import { computeBirthChart, type BirthChartData } from '@/lib/ephemeris';
import { houseDistance } from '@/lib/vedic/constants';
import palmReadingPrompt from '@/config/prompts/palm-reading.prompt.json';

// Fallback coordinates (India center) when no saved location exists
const DEFAULT_LAT = 20.5937;
const DEFAULT_LNG = 78.9629;
const IST_OFFSET = 330; // UTC+5:30

/** Current date/time expressed in IST for the ephemeris */
function nowIST(): { date: string; time: string } {
  const ist = new Date(Date.now() + IST_OFFSET * 60000);
  return { date: ist.toISOString().slice(0, 10), time: ist.toISOString().slice(11, 16) };
}

function skySummary(chart: BirthChartData): string {
  const p = (label: string, pos: { sign: string; degree: string; isRetrograde?: boolean }) =>
    `${label}: ${pos.sign} ${pos.degree}${pos.isRetrograde ? ' (retrograde)' : ''}`;
  return [
    p('Sun', chart.sun), p('Moon', chart.moon), p('Mars', chart.mars),
    p('Mercury', chart.mercury), p('Venus', chart.venus), p('Jupiter', chart.jupiter),
    p('Saturn', chart.saturn), p('Rahu', chart.rahu), p('Ketu', chart.ketu),
  ].join(' | ');
}

/**
 * Build the transit context injected into the palm prompt.
 * Personalized when the user has a saved birth chart; otherwise a general
 * current-sky snapshot.
 */
async function buildTransitContext(userId: string): Promise<string> {
  const { date, time } = nowIST();

  const latest = await Reading.findOne({ userId, type: 'birth_chart' })
    .sort({ createdAt: -1 })
    .lean();

  const natal = latest?.metadata?.chart as
    | { ascendant?: { sign: string }; moon?: { sign: string }; nakshatra?: { name: string }; currentDasha?: string; dashaEndsAt?: string }
    | undefined;
  const geo = latest?.metadata?.geo as { lat?: number; lng?: number } | undefined;

  const transit = computeBirthChart(
    date,
    time,
    typeof geo?.lat === 'number' ? geo.lat : DEFAULT_LAT,
    typeof geo?.lng === 'number' ? geo.lng : DEFAULT_LNG,
    IST_OFFSET,
  );

  const lines: string[] = [`Date of analysis: ${date} ${time} IST`];

  if (natal?.moon?.sign) {
    const moonSign = natal.moon.sign;
    lines.push(
      `PERSONALIZED CONTEXT (user's saved birth chart): Natal Moon in ${moonSign}${natal.nakshatra?.name ? ` (${natal.nakshatra.name})` : ''}${natal.ascendant?.sign ? `, natal Ascendant ${natal.ascendant.sign}` : ''}${natal.currentDasha ? `, running Mahadasha: ${natal.currentDasha}${natal.dashaEndsAt ? ` (until ${natal.dashaEndsAt})` : ''}` : ''}.`,
      `Current sky: ${skySummary(transit)}`,
      `Key transits from natal Moon: Saturn is ${houseDistance(moonSign, transit.saturn.sign)}th from natal Moon, Jupiter is ${houseDistance(moonSign, transit.jupiter.sign)}th, Rahu is ${houseDistance(moonSign, transit.rahu.sign)}th, Mars is ${houseDistance(moonSign, transit.mars.sign)}th.`,
    );
  } else {
    lines.push(
      'GENERAL CONTEXT (no saved birth chart — give broad, approximate guidance only):',
      `Current sky: ${skySummary(transit)}`,
    );
  }

  lines.push(`Today's Panchang: Tithi ${transit.panchang.tithi}; Yoga ${transit.panchang.yoga}; Karana ${transit.panchang.karana}.`);
  return lines.join('\n');
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !(session.user as any)?.id) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to get your reading.' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    // Check & increment daily quota for palm_reading
    const quotaResult = await checkAndIncrementQuota(userId, 'palm_reading');
    if (!quotaResult.allowed) {
      return NextResponse.json(
        { error: `Daily limit reached for Palm Reading. You have 0 of ${quotaResult.limit} readings left today.` },
        { status: 429 }
      );
    }

    const { leftHand, rightHand, language } = await req.json();

    if (!leftHand || !rightHand) {
      return NextResponse.json({ error: 'Both left and right hand images are required.' }, { status: 400 });
    }

    // Validate that both are base64 data URLs or valid URLs
    const isValidImage = (img: string) =>
      img.startsWith('data:image/') || img.startsWith('http://') || img.startsWith('https://');

    if (!isValidImage(leftHand) || !isValidImage(rightHand)) {
      return NextResponse.json(
        { error: 'Invalid image format. Images must be base64 data URLs or public image URLs.' },
        { status: 400 }
      );
    }

    // Current-transit context (personalized from saved birth chart when available)
    await connectToDatabase();
    let transitContext = 'Transit data unavailable — give general guidance only.';
    try {
      transitContext = await buildTransitContext(userId);
    } catch (transitError) {
      console.warn('[analyze-palm] Transit context failed — continuing without it:', transitError);
    }

    // Fill prompts (English generation — translated after; transit context injected)
    const finalSystemPrompt = palmReadingPrompt.systemPrompt;
    const userPrompt = fillTemplate(palmReadingPrompt.userPromptTemplate, {
      transitContext,
    });

    const aiResponse = await callGrokVision(
      palmReadingPrompt.model,
      finalSystemPrompt,
      userPrompt,
      [leftHand, rightHand],
      palmReadingPrompt.maxTokens,
    );

    // Translate the English report to the user's locale (no-op for English)
    const targetLocale = resolveLanguage(language);
    let finalText = aiResponse.text;
    try {
      finalText = await translateToLocale(finalText, targetLocale);
    } catch (translateError) {
      console.warn('[analyze-palm] Translation failed — returning English report:', translateError);
    }

    // Store reading in MongoDB
    const newReading = new Reading({
      userId,
      type: 'palm_reading',
      inputData: {
        leftHandLength: leftHand.length,
        rightHandLength: rightHand.length,
        format: leftHand.startsWith('data:') ? 'base64' : 'url',
      },
      result: finalText,
      metadata: {
        model: aiResponse.model,
        tokens: aiResponse.usage,
        transitContextUsed: transitContext.split('\n')[0],
      },
    });
    await newReading.save();

    return NextResponse.json({
      result: finalText,
      remainingQuota: quotaResult.remaining,
      limit: quotaResult.limit,
    });
  } catch (error: any) {
    console.error('[analyze-palm] Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
