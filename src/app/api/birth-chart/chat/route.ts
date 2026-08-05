export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkQuotaAvailability, incrementQuotaUsage } from '@/lib/quota';
import { connectToDatabase } from '@/lib/db';
import Reading from '@/models/Reading';
import { callGrokText, fillTemplate } from '@/lib/ai';
import chatPrompt from '@/config/prompts/birth-chart-chat.prompt.json';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string } | undefined;

    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = sessionUser.id;
    const { readingId, message, history, language } = await req.json();
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';

    if (!readingId || !trimmedMessage) {
      return NextResponse.json({ error: 'Missing reading context or message.' }, { status: 400 });
    }

    await connectToDatabase();
    const reading = await Reading.findOne({ _id: readingId, userId }).lean();
    
    if (!reading) {
      return NextResponse.json({ error: 'Reading context not found.' }, { status: 404 });
    }

    const quotaStatus = await checkQuotaAvailability(userId, 'chatbot');
    if (!quotaStatus.allowed) {
      return NextResponse.json(
        { error: `Daily limit reached for Astrologer Chat. You have 0 of ${quotaStatus.limit} chats left today.` },
        { status: 429 }
      );
    }

    // Format chat history
    let historyStr = '';
    if (Array.isArray(history)) {
      historyStr = history
        .filter((msg: unknown): msg is { role: string; content: string } => {
          return !!msg && typeof msg === 'object'
            && typeof (msg as { role?: unknown }).role === 'string'
            && typeof (msg as { content?: unknown }).content === 'string';
        })
        .slice(-6)
        .map((msg) => `${msg.role === 'user' ? 'User' : 'Astrologer'}: ${msg.content.trim()}`)
        .join('\n');
    }

    // Prepare context
    const chartContext = reading.result || JSON.stringify(reading.inputData);
    const currentTime = new Date().toISOString();
    const preferredLanguage = typeof language === 'string' && language.trim() ? language.trim() : 'English';
    const finalSystemPrompt = fillTemplate(chatPrompt.systemPrompt, { language: preferredLanguage });

    const userPrompt = fillTemplate(chatPrompt.userPromptTemplate, {
      chartData: chartContext,
      timeContext: `Current time is ${currentTime}`,
      history: historyStr || 'None',
      query: trimmedMessage,
      language: preferredLanguage,
    });

    const aiResponse = await callGrokText(
      chatPrompt.model,
      finalSystemPrompt,
      userPrompt,
      chatPrompt.maxTokens,
    );

    const quotaResult = await incrementQuotaUsage(userId, 'chatbot');

    return NextResponse.json({
      reply: aiResponse.text,
      remainingQuota: quotaResult.remaining,
      limit: quotaResult.limit
    });
  } catch (error: unknown) {
    console.error('[chatbot] Error:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
