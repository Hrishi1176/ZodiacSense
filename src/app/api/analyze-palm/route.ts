export const maxDuration = 60; // Max duration for Vercel Hobby plan

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkAndIncrementQuota } from '@/lib/quota';
import { connectToDatabase } from '@/lib/db';
import Reading from '@/models/Reading';
import { callGrokVision } from '@/lib/ai';
import palmReadingPrompt from '@/config/prompts/palm-reading.prompt.json';

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

    // Call Grok Vision with the two palm images using the structured prompt
    const finalSystemPrompt = `${palmReadingPrompt.systemPrompt}\n\nIMPORTANT: You must write the ENTIRE response in ${language || 'English'}. Do not output English if another language was requested.`;

    const aiResponse = await callGrokVision(
      palmReadingPrompt.model,
      finalSystemPrompt,
      palmReadingPrompt.userPromptText,
      [leftHand, rightHand],
      palmReadingPrompt.maxTokens,
    );

    // Store reading in MongoDB
    await connectToDatabase();
    const newReading = new Reading({
      userId,
      type: 'palm_reading',
      inputData: {
        leftHandLength: leftHand.length,
        rightHandLength: rightHand.length,
        format: leftHand.startsWith('data:') ? 'base64' : 'url',
      },
      result: aiResponse.text,
      metadata: {
        model: aiResponse.model,
        tokens: aiResponse.usage,
      },
    });
    await newReading.save();

    return NextResponse.json({
      result: aiResponse.text,
      remainingQuota: quotaResult.remaining,
      limit: quotaResult.limit,
    });
  } catch (error: any) {
    console.error('[analyze-palm] Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
