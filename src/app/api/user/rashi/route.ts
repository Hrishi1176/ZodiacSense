import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import Reading from '@/models/Reading';

/**
 * GET /api/user/rashi
 * Returns the moon sign (rashi) from the user's most recent birth chart reading.
 * Returns { rashi: string } or { rashi: null } if no birth chart exists.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Find the most recent birth_chart reading for this user
    const latestChart = await Reading.findOne(
      { userId: (session.user as any).id, type: 'birth_chart' },
      { 'metadata.chart.moon': 1 },
      { sort: { createdAt: -1 } }
    ).lean();

    const moonSign: string | null = (latestChart as any)?.metadata?.chart?.moon?.sign ?? null;

    return NextResponse.json({ rashi: moonSign });
  } catch (error: any) {
    console.error('[user/rashi] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
