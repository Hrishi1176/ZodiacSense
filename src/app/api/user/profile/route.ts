import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById((session.user as any).id).lean();
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ birthDetails: user.birthDetails || null });
  } catch (error: any) {
    console.error('[profile] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, date, time, location, lat, lng } = await req.json();

    // Persist map-picked coordinates alongside the place name when provided
    const birthDetails: {
      name: string;
      date: string;
      time: string;
      location: string;
      lat?: number;
      lng?: number;
    } = { name, date, time, location };
    if (typeof lat === 'number' && typeof lng === 'number') {
      birthDetails.lat = lat;
      birthDetails.lng = lng;
    }

    await connectToDatabase();
    const user = await User.findByIdAndUpdate(
      (session.user as any).id,
      { $set: { birthDetails } },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, birthDetails: user.birthDetails });
  } catch (error: any) {
    console.error('[profile] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
