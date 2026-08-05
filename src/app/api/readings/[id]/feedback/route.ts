import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import Reading from '@/models/Reading';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isAccurate } = await req.json();
    if (typeof isAccurate !== 'boolean') {
      return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Make sure the reading belongs to the user
    const reading = await Reading.findOneAndUpdate(
      { _id: params.id, userId: (session.user as any).id },
      { $set: { isAccurate } },
      { new: true }
    );

    if (!reading) {
      return NextResponse.json({ error: 'Reading not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[feedback] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
