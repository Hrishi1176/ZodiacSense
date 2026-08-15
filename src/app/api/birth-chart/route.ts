export const maxDuration = 90; // Max duration for structured AI responses

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkAndIncrementQuota } from '@/lib/quota';
import { connectToDatabase } from '@/lib/db';
import Reading from '@/models/Reading';
import User from '@/models/User';
import { geocodeCity, getTimezoneForCoords } from '@/lib/geocode';
import { computeBirthChart, formatChartForPrompt } from '@/lib/ephemeris';
import { callGrokText, fillTemplate } from '@/lib/ai';
import { retrieveVedicContext } from '@/lib/rag';
import { buildStructuredAnalysis, buildAnalysisJSON } from '@/lib/vedic/structured-analysis';
import { verifyResponse } from '@/lib/verify';
import { resolveLanguage } from '@/lib/language';
import { translateToLocale } from '@/lib/serverTranslate';
import birthChartPrompt from '@/config/prompts/birth-chart.prompt.json';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !(session.user as any)?.id) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to generate your birth chart.' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    // Check & increment daily quota for birth_chart
    const quotaResult = await checkAndIncrementQuota(userId, 'birth_chart');
    if (!quotaResult.allowed) {
      return NextResponse.json(
        { error: `Daily limit reached for Birth Chart. You have 0 of ${quotaResult.limit} readings left today.` },
        { status: 429 }
      );
    }

    const { name, date, time, location, lat, lng, language } = await req.json();

    if (!name || !date || !time || !location) {
      return NextResponse.json({ error: 'All birth details are required (name, date, time, location).' }, { status: 400 });
    }

    // ─── Step 1: Geocode (map-picked coordinates skip Nominatim) ───────────
    let geo;
    if (typeof lat === 'number' && typeof lng === 'number') {
      const tz = getTimezoneForCoords(lat, lng);
      geo = { lat, lng, displayName: location, timezone: tz.timezone, utcOffsetMinutes: tz.utcOffsetMinutes };
    } else {
      geo = await geocodeCity(location);
    }
    console.log(`[birth-chart] Geocoded "${location}" → ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)} (${geo.timezone})`);

    // ─── Step 2: Compute planetary positions (Swiss Ephemeris) ────────────
    const chart = computeBirthChart(date, time, geo.lat, geo.lng, geo.utcOffsetMinutes);
    const chartData = formatChartForPrompt(chart, name, date, time, geo.displayName || location);

    // ─── Step 3: Run ALL deterministic rule engines ───────────────────────
    const analysis = buildStructuredAnalysis(chart);
    const analysisJSON = buildAnalysisJSON(analysis);

    // ─── Step 4: Retrieve Vedic knowledge (RAG) ──────────────────────────
    const vedicContext = retrieveVedicContext(chart);

    // ─── Step 5: Build explanation-only prompt ────────────────────────────
    const ratingTable = Object.entries(analysis.ratings)
      .map(([area, score]) => `| ${area.charAt(0).toUpperCase() + area.slice(1)} | ${'⭐'.repeat(score)} (${score}/5) |`)
      .join('\n');

    const userPrompt = fillTemplate(birthChartPrompt.userPromptTemplate, {
      name,
      date,
      time,
      location: geo.displayName || location,
      chartData,
      yogaSection: analysis.formatted.yogaSection,
      doshaSection: analysis.formatted.doshaSection,
      planetStrengthTable: analysis.formatted.planetStrengthTable,
      navamsaAscendant: analysis.navamsa.ascendant,
      vargottamaPlanets: analysis.navamsa.vargottamaPlanets.length > 0
        ? analysis.navamsa.vargottamaPlanets.join(', ')
        : 'None',
      marriageStrength: `${analysis.navamsa.marriageStrength.score}/5 (Venus: ${analysis.navamsa.marriageStrength.venusDignity}, 7th lord: ${analysis.navamsa.marriageStrength.seventhLordDignity})`,
      dashamsaAscendant: analysis.dashamsa.ascendant,
      careerStrength: `${analysis.dashamsa.careerStrength.score}/5 (Sun: ${analysis.dashamsa.careerStrength.sunDignity}, 10th lord: ${analysis.dashamsa.careerStrength.tenthLordDignity}, Saturn: ${analysis.dashamsa.careerStrength.saturnDignity})`,
      houseTable: analysis.formatted.houseTable,
      ratingTable,
      confidenceTable: analysis.formatted.confidenceTable,
      currentDasha: chart.currentDasha,
      dashaEndsAt: chart.dashaEndsAt,
    });

    const finalSystemPrompt = fillTemplate(birthChartPrompt.systemPrompt, {
      vedicContext,
      structuredAnalysis: analysisJSON,
    });

    // ─── Step 6: AI explanation (NOT reasoning) ─────────────────────────
    const aiResponse = await callGrokText(
      birthChartPrompt.model,
      finalSystemPrompt,
      userPrompt,
      birthChartPrompt.maxTokens,
      { temperature: 0.2, topP: 0.9 }
    );

    // ─── Step 7: Self-verification (catch hallucinations) ────────────────
    const verification = await verifyResponse(aiResponse.text, analysisJSON, 'English');
    let finalText = verification.correctedText ?? aiResponse.text;

    // Translate the English report to the user's locale (no-op for English)
    const targetLocale = resolveLanguage(language);
    try {
      finalText = await translateToLocale(finalText, targetLocale);
    } catch (translateError) {
      console.warn('[birth-chart] Translation failed — returning English report:', translateError);
    }

    // ─── Step 8: Store reading in MongoDB ─────────────────────────────────
    await connectToDatabase();
    const newReading = new Reading({
      userId,
      type: 'birth_chart',
      inputData: { name, date, time, location },
      result: finalText,
      metadata: {
        geo: { lat: geo.lat, lng: geo.lng, timezone: geo.timezone },
        chart: {
          ayanamsha: chart.ayanamsha,
          ascendant: chart.ascendant,
          sun: chart.sun,
          moon: chart.moon,
          mars: chart.mars,
          mercury: chart.mercury,
          jupiter: chart.jupiter,
          venus: chart.venus,
          saturn: chart.saturn,
          rahu: chart.rahu,
          ketu: chart.ketu,
          houses: chart.houses,
          nakshatra: chart.nakshatra,
          currentDasha: chart.currentDasha,
          currentAntardasha: chart.currentAntardasha,
          currentPratyantardasha: chart.currentPratyantardasha,
          dashaEndsAt: chart.dashaEndsAt,
          panchang: chart.panchang,
        },
        // Store structured analysis for future reference (chat, dashboard, regression tests)
        structuredAnalysis: {
          yogas: analysis.yogas,
          doshas: analysis.doshas,
          ratings: analysis.ratings,
          confidenceScores: analysis.confidenceScores,
          navamsa: analysis.navamsa,
          dashamsa: analysis.dashamsa,
          planetCount: analysis.planets.length,
        },
        verification: {
          verified: verification.verified,
          issueCount: verification.issues.length,
        },
        tokens: aiResponse.usage,
      },
    });
    await newReading.save();

    // ─── Step 9: Auto-save birth details to the user's profile ────────────
    // So the profile presets + map location stay in sync with the last chart
    try {
      await User.findByIdAndUpdate(userId, {
        $set: {
          birthDetails: {
            name,
            date,
            time,
            location: geo.displayName || location,
            lat: geo.lat,
            lng: geo.lng,
          },
        },
      });
    } catch (profileError) {
      console.warn('[birth-chart] Failed to auto-save birth details to profile:', profileError);
    }

    return NextResponse.json({
      id: newReading._id.toString(),
      result: finalText,
      metadata: {
        ascendant: chart.ascendant.sign,
        sunSign: chart.sun.sign,
        moonSign: chart.moon.sign,
        nakshatra: `${chart.nakshatra.name} (Pada ${chart.nakshatra.pada})`,
        currentDasha: chart.currentDasha,
        ayanamsha: chart.ayanamsha,
        geocodedLocation: geo.displayName,
        timezone: geo.timezone,
        // Deterministic planet positions (language-independent, drives the chart wheel)
        planets: analysis.planets.map((p) => ({
          planet: p.planet,
          sign: p.sign,
          house: p.house,
          dignity: p.dignity,
          isRetrograde: p.isRetrograde,
        })),
        // Return structured data to frontend
        yogas: analysis.yogas.map((y) => ({ name: y.name, strength: y.strength, confidence: y.confidence })),
        doshas: analysis.doshas.map((d) => ({ name: d.name, severity: d.severity })),
        ratings: analysis.ratings,
        confidenceScores: analysis.confidenceScores,
        verified: verification.verified,
      },
      remainingQuota: quotaResult.remaining,
      limit: quotaResult.limit,
    });
  } catch (error: any) {
    console.error('[birth-chart] Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
