export const maxDuration = 90;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkQuotaAvailability, incrementQuotaUsage } from '@/lib/quota';
import { connectToDatabase } from '@/lib/db';
import Reading from '@/models/Reading';
import { callGrokText, fillTemplate } from '@/lib/ai';
import { retrieveVedicContext } from '@/lib/rag';
import { languageDirective } from '@/lib/language';
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
    let reading;
    if (readingId === 'latest' || !readingId.match(/^[0-9a-fA-F]{24}$/)) {
      reading = await Reading.findOne({ userId, type: 'birth_chart' }).sort({ createdAt: -1 }).lean();
    } else {
      reading = await Reading.findOne({ _id: readingId, userId }).lean();
    }

    if (!reading) {
      return NextResponse.json({ error: 'No birth chart reading found to consult with.' }, { status: 404 });
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

    // Prepare context — include both the AI reading result AND raw chart data
    const readingResult = reading.result || '';
    const chartMeta = reading.metadata?.chart;
    let chartContext = readingResult;
    if (chartMeta) {
      const planetLine = (label: string, p: any) => p ? `${label}: ${p.sign} ${p.degree || ''}${p.isRetrograde ? ' (R)' : ''}` : '';
      const rawChart = [
        `\n--- RAW CHART DATA ---`,
        `Ascendant: ${chartMeta.ascendant?.sign || 'N/A'}`,
        planetLine('Sun', chartMeta.sun),
        planetLine('Moon', chartMeta.moon),
        planetLine('Mars', chartMeta.mars),
        planetLine('Mercury', chartMeta.mercury),
        planetLine('Venus', chartMeta.venus),
        planetLine('Jupiter', chartMeta.jupiter),
        planetLine('Saturn', chartMeta.saturn),
        planetLine('Rahu', chartMeta.rahu),
        planetLine('Ketu', chartMeta.ketu),
        `Nakshatra: ${chartMeta.nakshatra?.name || 'N/A'} (Pada ${chartMeta.nakshatra?.pada || '?'}, Lord: ${chartMeta.nakshatra?.lord || '?'})`,
        `Current Mahadasha: ${chartMeta.currentDasha || 'N/A'} (until ${chartMeta.dashaEndsAt || 'N/A'})`,
        `Ayanamsha: ${chartMeta.ayanamsha || 'N/A'}`,
      ].filter(Boolean).join('\n');
      chartContext = readingResult + rawChart;
    }

    // Retrieve relevant Vedic knowledge targeted to both the chart and the user's specific question
    const vedicContext = chartMeta
      ? retrieveVedicContext(chartMeta as any, trimmedMessage, 10)
      : retrieveVedicContext({} as any, trimmedMessage, 10);
    const currentTime = new Date().toISOString(); // kept for logging
    const preferredLanguage = languageDirective(language);
    const finalSystemPrompt = fillTemplate(chatPrompt.systemPrompt, {
      language: preferredLanguage,
      vedicContext,
    });

    const userPrompt = fillTemplate(chatPrompt.userPromptTemplate, {
      chartData: chartContext,
      timeContext: new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
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
