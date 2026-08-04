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

    const { leftHand, rightHand } = await req.json();

    if (!leftHand || !rightHand) {
      return NextResponse.json({ error: 'Both hand images are required.' }, { status: 400 });
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
            model: 'grok-2-vision-1212',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Perform a detailed palm reading based on these left and right hand palm images. Analyze the Life Line, Head Line, Heart Line, and Fate Line. Provide insights into career, relationships, health, and personal growth.',
                  },
                  { type: 'image_url', image_url: { url: leftHand } },
                  { type: 'image_url', image_url: { url: rightHand } },
                ],
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
      aiResultText = `✨ Palm Alignment Insights for ${session.user?.name || 'Cosmic Seeker'}:

• Left Hand (Inner Potential & Past): Your life line shows resilience and deep inner wisdom. The head line indicates a strong creative mind with analytical depth.
• Right Hand (Present & Destiny): The fate line shows significant career growth and alignment coming in the upcoming cycles. Your heart line reflects deep emotional devotion and capacity for meaningful connections.
• Cosmic Guidance: Embrace key opportunities around communication and creative leadership. Trust your intuition when making major life transitions.`;
    }

    // Store reading in MongoDB
    await connectToDatabase();
    const newReading = new Reading({
      userId,
      type: 'palm_reading',
      inputData: { leftHandLength: leftHand.length, rightHandLength: rightHand.length },
      result: aiResultText,
    });
    await newReading.save();

    return NextResponse.json({
      result: aiResultText,
      remainingQuota: quotaResult.remaining,
      limit: quotaResult.limit,
    });
  } catch (error: any) {
    console.error('Palm Analysis Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
