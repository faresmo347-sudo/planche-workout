import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const profile = await db.userProfile.findUnique({
      where: { id: 'default-user' },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Total completed workouts
    const totalWorkouts = await db.workoutSession.count({
      where: { completed: true },
    });

    // Max holds for main skills
    const maxHolds = await db.maxHold.findMany();
    const plancheMaxHold = maxHolds.find((mh) =>
      mh.exerciseName.toLowerCase().includes('tuck planche')
    );
    const flMaxHold = maxHolds.find((mh) =>
      mh.exerciseName.toLowerCase().includes('tuck front lever')
    );

    // Session-based week number (1 week = 7 completed sessions)
    const weekNumber = Math.floor(profile.completedSessions / 7) + 1;

    // Sessions completed in current week (out of 7)
    const thisWeekSessions = profile.completedSessions % 7;

    return NextResponse.json({
      totalWorkouts,
      plancheMaxHold: plancheMaxHold?.maxHoldSeconds ?? null,
      plancheMaxHoldName: plancheMaxHold?.exerciseName ?? null,
      flMaxHold: flMaxHold?.maxHoldSeconds ?? null,
      flMaxHoldName: flMaxHold?.exerciseName ?? null,
      thisWeekSessions,
      weekNumber,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
