export const maxDuration = 90;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkAndIncrementQuota } from '@/lib/quota';
import { connectToDatabase } from '@/lib/db';
import Reading from '@/models/Reading';
import { callGrokText, fillTemplate } from '@/lib/ai';
import { resolveLanguage, languageDirective } from '@/lib/language';
import User from '@/models/User';
import horoscopePrompt from '@/config/prompts/horoscope.prompt.json';
import { computeCurrentTransits } from '@/lib/ephemeris';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    
    const body = await req.json();
    const { rashi, language = 'English', timeframe = 'daily', dateRange } = body;

    if (!rashi) {
      return NextResponse.json({ error: 'Missing rashi' }, { status: 400 });
    }

    await connectToDatabase();

    // Check quota based on timeframe
    const quotaKey = `horoscope_${timeframe}` as any;
    const quotaStatus = await checkAndIncrementQuota(userId, quotaKey);
    if (!quotaStatus.allowed) {
      return NextResponse.json(
        { error: `Limit reached for ${timeframe} horoscope.` },
        { status: 429 }
      );
    }

    const now = new Date();
    let timeframeText = 'Today';
    let timeframeDetails = '';

    if (timeframe === 'weekly') {
      const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon ...
      const distanceToMon = (dayOfWeek + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - distanceToMon);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const monStr = monday.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      const sunStr = sunday.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      timeframeText = `This Week (${monStr} – ${sunStr})`;
      timeframeDetails = `TIMEFRAME WINDOW: Weekly prediction from Monday (${monStr}) to Sunday (${sunStr}). Focus on 7-day work momentum, mid-week deals, and weekend relationships.`;
    } else if (timeframe === 'monthly') {
      const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      timeframeText = `${monthName} (1–${lastDay} ${now.toLocaleString('en-US', { month: 'short' })})`;
      timeframeDetails = `TIMEFRAME WINDOW: Full calendar month of ${monthName}. Focus on major solar/planetary transits across the 30-day cycle, monthly budget, and projects.`;
    } else if (timeframe === 'yearly') {
      const year = now.getFullYear();
      timeframeText = `Annual Forecast for Year ${year}`;
      timeframeDetails = `TIMEFRAME WINDOW: Full 12-month annual prediction for year ${year}. Focus on slow-moving major transits (Jupiter, Saturn, Rahu, Ketu) and long-term career/financial milestones.`;
    } else if (timeframe === 'custom' && dateRange?.start && dateRange?.end) {
      timeframeText = `Custom Period: ${dateRange.start} to ${dateRange.end}`;
      timeframeDetails = `TIMEFRAME WINDOW: Custom date range from ${dateRange.start} to ${dateRange.end}. Tailor insights specifically across this exact period.`;
    } else {
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      timeframeText = `Today (${dateStr})`;
      timeframeDetails = `TIMEFRAME WINDOW: Daily prediction for ${dateStr}. Focus on current lunar transit, immediate daily encounters, and day's remedy.`;
    }

    const targetLocale = resolveLanguage(language);
    const langDirective = languageDirective(targetLocale);

    const userDoc = await User.findById(userId).lean();
    let birthContext = "General prediction based on Zodiac sign (Rashi).";
    
    if (userDoc?.birthDetails?.date) {
      const b = userDoc.birthDetails;
      birthContext = `NATIVE'S VERIFIED BIRTH DETAILS (synthesize with transits for personal precision):\nName: ${b.name || 'User'}\nDate of Birth: ${b.date}\nTime of Birth: ${b.time || 'Not provided'}\nPlace of Birth: ${b.location || 'Not provided'}`;
    }

    const liveTransits = computeCurrentTransits();

    const userPrompt = fillTemplate(horoscopePrompt.userPromptTemplate, {
      timeframe: timeframeText,
      rashi: rashi,
      language: langDirective,
      birthContext: `${birthContext}\n\n${timeframeDetails}`,
      liveTransits: liveTransits,
    });


    const aiResponse = await callGrokText(
      horoscopePrompt.model,
      horoscopePrompt.systemPrompt,
      userPrompt,
      horoscopePrompt.maxTokens,
      { temperature: 0.2, topP: 0.9 }
    );

    const finalText = aiResponse.text;

    await connectToDatabase();
    const newReading = new Reading({
      userId,
      type: 'horoscope',
      inputData: { rashi, timeframe, dateRange },
      result: finalText,
      metadata: { language: targetLocale, timeframeText },
    });
    const savedReading = await newReading.save();

    return NextResponse.json({
      success: true,
      readingId: savedReading._id,
      result: finalText,
      quotaStatus
    });
  } catch (error: any) {
    console.error('Horoscope API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
