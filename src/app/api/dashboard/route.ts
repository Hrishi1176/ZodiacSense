import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserQuotaStatus } from '@/lib/quota';
import { connectToDatabase } from '@/lib/db';
import Reading from '@/models/Reading';

export async function GET() {
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

    // Calculate AI Life Analytics summary based on readings history
    const totalReadings = readings.length;
    const palmCount = readings.filter((r) => r.type === 'palm_reading').length;
    const birthCount = readings.filter((r) => r.type === 'birth_chart').length;
    const marriageCount = readings.filter((r) => r.type === 'marriage_bichar').length;

    let aiAnalytics = '';

    if (totalReadings === 0) {
      aiAnalytics = 'Welcome to your Cosmic Dashboard! Perform your first Palm Reading, Birth Chart, or Marriage Bichar to unlock personalized AI Life Analytics.';
    } else {
      aiAnalytics = `✨ Personal Cosmic Energy Synthesis for ${session.user?.name || 'Cosmic Seeker'}:
You have conducted ${totalReadings} cosmic readings (${palmCount} Palm Readings, ${birthCount} Birth Charts, and ${marriageCount} Marriage Synergy checks). 

Key Life Insight: Your planetary alignment highlights strong intuitive awareness and rising destiny power. Continue exploring your inner potential and trust your creative impulses during major life choices.`;
    }

    return NextResponse.json({
      quotaStatus,
      readings,
      analytics: {
        totalReadings,
        summary: aiAnalytics,
        countsByType: {
          palm_reading: palmCount,
          birth_chart: birthCount,
          marriage_bichar: marriageCount,
        },
      },
    });
  } catch (error: any) {
    console.error('Dashboard Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
