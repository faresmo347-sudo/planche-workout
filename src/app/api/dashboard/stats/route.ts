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

    // This week's training days
    const startDate = new Date(profile.startDate);
    const now = new Date();
    const weekNumber =
      Math.floor(
        (now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      ) + 1;

    // Get the start of this week (Monday)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const thisWeekSessions = await db.workoutSession.count({
      where: {
        completed: true,
        date: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
    });

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
