import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkAndIncrementQuota } from '@/lib/quota';
import { connectToDatabase } from '@/lib/db';
import Reading from '@/models/Reading';

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

    const { partner1, partner2 } = await req.json();

    if (!partner1?.name || !partner1?.date || !partner2?.name || !partner2?.date) {
      return NextResponse.json({ error: 'Details for both partners are required.' }, { status: 400 });
    }

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
                content: 'You are an expert Vedic marriage matching (Gun Milan & Ashtakoota) astrologer. Provide a warm, balanced compatibility evaluation.',
              },
              {
                role: 'user',
                content: `Calculate marriage compatibility (Marriage Bichar) between:
Partner 1: ${partner1.name} (DOB: ${partner1.date})
Partner 2: ${partner2.name} (DOB: ${partner2.date})

Evaluate emotional harmony, Venus-Mars synergy, communication alignment, and cosmic advice for a strong union.`,
              },
            ],
            max_tokens: 800,
          }),
        });

        const grokData = await grokResponse.json();
        aiResultText = grokData.choices?.[0]?.message?.content || '';
      } catch (err) {
        console.error('Grok API Error:', err);
      }
    }

    if (!aiResultText) {
      aiResultText = `💍 Cosmic Compatibility Report for ${partner1.name} & ${partner2.name}:

• Overall Harmony Score: 88% Cosmic Synergy
• Emotional Connection (Moon Alignment): Strong mutual understanding and natural empathy. Both partners complement each other's emotional rhythms well.
• Passion & Drive (Venus-Mars Trine): Excellent energetic chemistry and shared life goals. You inspire each other towards creative growth.
• Key Advice for Harmony: Open communication and respecting personal space will turn minor planetary friction into long-lasting bond strength.`;
    }

    // Store reading in MongoDB
    await connectToDatabase();
    const newReading = new Reading({
      userId,
      type: 'marriage_bichar',
      inputData: { partner1, partner2 },
      result: aiResultText,
    });
    await newReading.save();

    return NextResponse.json({
      result: aiResultText,
      remainingQuota: quotaResult.remaining,
      limit: quotaResult.limit,
    });
  } catch (error: any) {
    console.error('Marriage Bichar Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
