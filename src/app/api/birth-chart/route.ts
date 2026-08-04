import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkAndIncrementQuota } from '@/lib/quota';
import { connectToDatabase } from '@/lib/db';
import Reading from '@/models/Reading';
import { geocodeCity } from '@/lib/geocode';
import { computeBirthChart, formatChartForPrompt } from '@/lib/ephemeris';
import { callGrokText, fillTemplate } from '@/lib/ai';
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

    const { name, date, time, location, language } = await req.json();

    if (!name || !date || !time || !location) {
      return NextResponse.json({ error: 'All birth details are required (name, date, time, location).' }, { status: 400 });
    }

    // Step 1: Geocode the birth location to get accurate lat/lng + UTC offset
    const geo = await geocodeCity(location);
    console.log(`[birth-chart] Geocoded "${location}" → ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)} (${geo.timezone})`);

    // Step 2: Compute accurate planetary positions using VSOP87 ephemeris + Lahiri ayanamsha
    const chart = computeBirthChart(date, time, geo.lat, geo.lng, geo.utcOffsetMinutes);
    const chartData = formatChartForPrompt(chart, name, date, time, geo.displayName || location);

    // Step 3: Fill prompt template with computed chart data
    const userPrompt = fillTemplate(birthChartPrompt.userPromptTemplate, {
      chartData,
      nakshatra: chart.nakshatra.name,
      pada: chart.nakshatra.pada,
      nakshatraLord: chart.nakshatra.lord,
      currentDasha: chart.currentDasha,
      dashaEndsAt: chart.dashaEndsAt,
    });

    const finalSystemPrompt = `${birthChartPrompt.systemPrompt}\n\nIMPORTANT: You must write the ENTIRE response in ${language || 'English'}. Do not output English if another language was requested.`;

    // Step 4: Call Grok AI for interpretation
    const aiResponse = await callGrokText(
      birthChartPrompt.model,
      finalSystemPrompt,
      userPrompt,
      birthChartPrompt.maxTokens,
    );

    // Step 5: Store reading in MongoDB
    await connectToDatabase();
    const newReading = new Reading({
      userId,
      type: 'birth_chart',
      inputData: { name, date, time, location },
      result: aiResponse.text,
      metadata: {
        geo: { lat: geo.lat, lng: geo.lng, timezone: geo.timezone },
        chart: {
          ayanamsha: chart.ayanamsha,
          ascendant: chart.ascendant,
          sun: chart.sun,
          moon: chart.moon,
          nakshatra: chart.nakshatra,
          currentDasha: chart.currentDasha,
          dashaEndsAt: chart.dashaEndsAt,
        },
        tokens: aiResponse.usage,
      },
    });
    await newReading.save();

    return NextResponse.json({
      result: aiResponse.text,
      metadata: {
        ascendant: chart.ascendant.sign,
        sunSign: chart.sun.sign,
        moonSign: chart.moon.sign,
        nakshatra: `${chart.nakshatra.name} (Pada ${chart.nakshatra.pada})`,
        currentDasha: chart.currentDasha,
        ayanamsha: chart.ayanamsha,
        geocodedLocation: geo.displayName,
        timezone: geo.timezone,
      },
      remainingQuota: quotaResult.remaining,
      limit: quotaResult.limit,
    });
  } catch (error: any) {
    console.error('[birth-chart] Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
