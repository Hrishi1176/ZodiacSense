import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkAndIncrementQuota } from '@/lib/quota';
import { connectToDatabase } from '@/lib/db';
import Reading from '@/models/Reading';
import { generateFullBirthChartReport, getSunSign, getAscendant, getNakshatraInfo } from '@/lib/astrology';

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

    const { name, date, time, location } = await req.json();

    if (!name || !date || !time || !location) {
      return NextResponse.json({ error: 'All birth details are required.' }, { status: 400 });
    }

    const sun = getSunSign(date);
    const ascendant = getAscendant(date, time);
    const { nakshatra, pada } = getNakshatraInfo(date, time);

    const grokKey = process.env.GROK_API_KEY;
    let aiResultText = '';

    if (grokKey && grokKey !== 'your_grok_key_here') {
      try {
        const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${grokKey}`,
          },
          body: JSON.stringify({
            model: 'grok-2-1212',
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert master Vedic (Jyotish) & Western Astrologer. Generate a comprehensive, authentic, multi-section Kundali birth chart report from first to last with rich formatting, house details, dasha, and remedies.',
              },
              {
                role: 'user',
                content: `Generate a full, in-depth Vedic & Western Birth Chart Analysis for:
Name: ${name}
Date of Birth: ${date}
Time of Birth: ${time}
Location: ${location}

Calculated Core Placements:
- Sun Sign: ${sun.sign} (${sun.element} element, ruled by ${sun.rulingPlanet})
- Ascendant/Lagna: ${ascendant}
- Nakshatra: ${nakshatra}

Format your response in structured, beautiful markdown headers with:
1. 🌌 CORE ASTROLOGICAL POSITIONS (Sun, Moon, Lagna, Nakshatra)
2. 🪐 12-HOUSE KUNDALI BREAKDOWN (1st to 12th House positions & career, wealth, health, relationships)
3. ⚡ MAHADASHA & PLANETARY TRANSIT FORECAST
4. 💎 GEMSTONE & REMEDIAL GUIDANCE (Upayas, lucky colors, mantras)`,
              },
            ],
            max_tokens: 1200,
          }),
        });

        const grokData = await grokResponse.json();
        aiResultText = grokData.choices?.[0]?.message?.content || '';
      } catch (err) {
        console.error('Grok API Error:', err);
      }
    }

    // Fallback if AI API key is not active
    if (!aiResultText) {
      aiResultText = generateFullBirthChartReport({ name, date, time, location });
    }

    // Store reading in MongoDB
    await connectToDatabase();
    const newReading = new Reading({
      userId,
      type: 'birth_chart',
      inputData: { name, date, time, location },
      result: aiResultText,
    });
    await newReading.save();

    return NextResponse.json({
      result: aiResultText,
      remainingQuota: quotaResult.remaining,
      limit: quotaResult.limit,
    });
  } catch (error: any) {
    console.error('Birth Chart Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
