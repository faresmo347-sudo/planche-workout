import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const maxHolds = await db.maxHold.findMany({
      orderBy: { exerciseName: 'asc' },
    });

    return NextResponse.json({ maxHolds });
  } catch (error) {
    console.error('Error fetching max holds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch max holds' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { exerciseName, maxHoldSeconds } = body;

    if (!exerciseName || maxHoldSeconds === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: exerciseName, maxHoldSeconds' },
        { status: 400 }
      );
    }

    if (maxHoldSeconds < 0) {
      return NextResponse.json(
        { error: 'maxHoldSeconds must be non-negative' },
        { status: 400 }
      );
    }

    // Upsert: create if doesn't exist, update if it does
    const maxHold = await db.maxHold.upsert({
      where: { exerciseName },
      update: {
        maxHoldSeconds,
        lastTestedAt: new Date(),
      },
      create: {
        exerciseName,
        maxHoldSeconds,
        lastTestedAt: new Date(),
      },
    });

    return NextResponse.json({ maxHold });
  } catch (error) {
    console.error('Error updating max hold:', error);
    return NextResponse.json(
      { error: 'Failed to update max hold' },
      { status: 500 }
    );
  }
}
