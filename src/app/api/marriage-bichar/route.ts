export const maxDuration = 60; // Max duration for Vercel Hobby plan

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkAndIncrementQuota } from '@/lib/quota';
import { connectToDatabase } from '@/lib/db';
import Reading from '@/models/Reading';
import { computeBirthChart } from '@/lib/ephemeris';
import { callGrokText, fillTemplate } from '@/lib/ai';
import marriageBicharPrompt from '@/config/prompts/marriage-bichar.prompt.json';

// Default coordinates for India (used when no location is provided for partners)
const DEFAULT_LAT = 20.5937;
const DEFAULT_LNG = 78.9629;
const DEFAULT_UTC_OFFSET = 330; // IST = UTC+5:30

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

    // Compute birth chart data for both partners
    // Use noon (12:00) as default time if not provided — sun sign will still be accurate;
    // Moon sign may be off by 1 sign for births near sign boundaries (noted in metadata)
    const p1Time = partner1.time || '12:00';
    const p2Time = partner2.time || '12:00';

    const chart1 = computeBirthChart(partner1.date, p1Time, DEFAULT_LAT, DEFAULT_LNG, DEFAULT_UTC_OFFSET);
    const chart2 = computeBirthChart(partner2.date, p2Time, DEFAULT_LAT, DEFAULT_LNG, DEFAULT_UTC_OFFSET);

    // Fill marriage bichar prompt template
    const userPrompt = fillTemplate(marriageBicharPrompt.userPromptTemplate, {
      partner1Name:            partner1.name,
      partner1Date:            partner1.date,
      partner1Sun:             chart1.sun.sign,
      partner1Moon:            chart1.moon.sign,
      partner1Nakshatra:       chart1.nakshatra.name,
      partner1Pada:            chart1.nakshatra.pada,
      partner1NakshatraLord:   chart1.nakshatra.lord,
      partner1Ascendant:       chart1.ascendant.sign,

      partner2Name:            partner2.name,
      partner2Date:            partner2.date,
      partner2Sun:             chart2.sun.sign,
      partner2Moon:            chart2.moon.sign,
      partner2Nakshatra:       chart2.nakshatra.name,
      partner2Pada:            chart2.nakshatra.pada,
      partner2NakshatraLord:   chart2.nakshatra.lord,
      partner2Ascendant:       chart2.ascendant.sign,
    });

    const finalSystemPrompt = `${marriageBicharPrompt.systemPrompt}\n\nIMPORTANT: You must write the ENTIRE response in ${language || 'English'}. Do not output English if another language was requested.`;

    // Call Grok AI
    const aiResponse = await callGrokText(
      marriageBicharPrompt.model,
      finalSystemPrompt,
      userPrompt,
      marriageBicharPrompt.maxTokens,
    );

    // Store reading in MongoDB
    await connectToDatabase();
    const newReading = new Reading({
      userId,
      type: 'marriage_bichar',
      inputData: { partner1, partner2 },
      result: aiResponse.text,
      metadata: {
        partner1Chart: {
          sun: chart1.sun.sign,
          moon: chart1.moon.sign,
          nakshatra: chart1.nakshatra.name,
          ascendant: chart1.ascendant.sign,
          timeAssumed: !partner1.time,
        },
        partner2Chart: {
          sun: chart2.sun.sign,
          moon: chart2.moon.sign,
          nakshatra: chart2.nakshatra.name,
          ascendant: chart2.ascendant.sign,
          timeAssumed: !partner2.time,
        },
        tokens: aiResponse.usage,
      },
    });
    await newReading.save();

    return NextResponse.json({
      result: aiResponse.text,
      metadata: {
        partner1: {
          name: partner1.name,
          sunSign: chart1.sun.sign,
          moonSign: chart1.moon.sign,
          nakshatra: `${chart1.nakshatra.name} (Pada ${chart1.nakshatra.pada})`,
          ascendant: chart1.ascendant.sign,
          timeAssumed: !partner1.time,
        },
        partner2: {
          name: partner2.name,
          sunSign: chart2.sun.sign,
          moonSign: chart2.moon.sign,
          nakshatra: `${chart2.nakshatra.name} (Pada ${chart2.nakshatra.pada})`,
          ascendant: chart2.ascendant.sign,
          timeAssumed: !partner2.time,
        },
      },
      remainingQuota: quotaResult.remaining,
      limit: quotaResult.limit,
    });
  } catch (error: any) {
    console.error('[marriage-bichar] Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
