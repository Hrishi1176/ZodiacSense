export const maxDuration = 60; // Max duration for Vercel Hobby plan

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserQuotaStatus } from '@/lib/quota';
import { connectToDatabase } from '@/lib/db';
import Reading from '@/models/Reading';
import { callGrokText, fillTemplate } from '@/lib/ai';
import dashboardPrompt from '@/config/prompts/dashboard-analytics.prompt.json';

const READING_TYPE_LABELS: Record<string, string> = {
  palm_reading:     'Palm Reading',
  birth_chart:      'Birth Chart',
  marriage_bichar:  'Marriage Compatibility',
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await connectToDatabase();

    const [quotaStatus, readings] = await Promise.all([
      getUserQuotaStatus(userId),
      Reading.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const totalReadings = readings.length;
    const palmCount     = readings.filter((r) => r.type === 'palm_reading').length;
    const birthCount    = readings.filter((r) => r.type === 'birth_chart').length;
    const marriageCount = readings.filter((r) => r.type === 'marriage_bichar').length;
    const latestType    = readings[0]?.type
      ? (READING_TYPE_LABELS[readings[0].type] ?? readings[0].type)
      : 'None';

    let aiSummary = '';

    if (totalReadings === 0) {
      aiSummary = `✨ **Welcome to ZodiacSense, ${session.user?.name?.split(' ')[0] || 'Cosmic Seeker'}!**\n\nYour personalized **AI Life Analytics & Cosmic Synthesis** will automatically analyze your readings as soon as you generate your first **Birth Chart**, **Palm Reading**, or **Marriage Compatibility** report. Select a feature above to get started!`;
    } else {
      try {
        const { language } = await req.json().catch(() => ({ language: 'English' }));

        const readingSnippets = readings.slice(0, 3).map((r: any, i: number) => {
          const label = READING_TYPE_LABELS[r.type] || r.type;
          const fullText = r.result ? r.result.slice(0, 2500) : '';
          return `--- START READING #${i + 1} (${label}) ---\n${fullText}\n--- END READING #${i + 1} ---`;
        }).join('\n\n');

        const userPrompt = fillTemplate(dashboardPrompt.userPromptTemplate, {
          userName:      session.user?.name || 'Cosmic Seeker',
          totalReadings,
          palmCount,
          birthCount,
          marriageCount,
          latestType,
          readingSnippets: readingSnippets || 'No previous text available.',
        });

        const finalSystemPrompt = `${dashboardPrompt.systemPrompt}\n\nIMPORTANT: You must write the ENTIRE response in ${language || 'English'}. Do not output English if another language was requested.`;

        const aiResponse = await callGrokText(
          dashboardPrompt.model,
          finalSystemPrompt,
          userPrompt,
          dashboardPrompt.maxTokens,
        );
        aiSummary = aiResponse.text;
      } catch (aiErr) {
        console.warn('[dashboard] AI analytics generation failed:', aiErr);
        aiSummary = `✨ **Cosmic Synthesis Overview for ${session.user?.name?.split(' ')[0] || 'Cosmic Seeker'}**\n\nYou have completed ${totalReadings} cosmic reading${totalReadings > 1 ? 's' : ''} so far (${birthCount} Birth Charts, ${palmCount} Palm Scans, ${marriageCount} Marriage Compatibilities). Continue exploring to uncover deeper cosmic patterns!`;
      }
    }

    return NextResponse.json({
      quotaStatus,
      readings,
      analytics: {
        totalReadings,
        summary: aiSummary,
        countsByType: {
          palm_reading:    palmCount,
          birth_chart:     birthCount,
          marriage_bichar: marriageCount,
        },
      },
    });
  } catch (error: any) {
    console.error('[dashboard] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
