import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

interface ExerciseLogInput {
  exerciseId: string;
  setNumber: number;
  holdTimeSeconds?: number;
  reps?: number;
  weightKg?: number;
  rpe?: number;
  leanDistanceCm?: number;
  bandAssistance?: string;
  painReported?: boolean;
  painNotes?: string;
}

interface WorkoutLogInput {
  date: string;
  dayType: string;
  weekNumber?: number;
  isDeload?: boolean;
  notes?: string;
  exercises: ExerciseLogInput[];
}

export async function POST(request: NextRequest) {
  try {
    const body: WorkoutLogInput = await request.json();
    const { date, dayType, weekNumber, isDeload, notes, exercises } = body;

    if (!date || !dayType || !exercises || exercises.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: date, dayType, exercises' },
        { status: 400 }
      );
    }

    // Get user profile for session-based week calculation
    const profile = await db.userProfile.findUnique({
      where: { id: 'default-user' },
    });

    // Calculate weekNumber based on completed sessions (1 week = 7 sessions)
    let calculatedWeekNumber = weekNumber;
    if (!calculatedWeekNumber && profile) {
      calculatedWeekNumber = Math.floor(profile.completedSessions / 7) + 1;
    } else if (!calculatedWeekNumber) {
      calculatedWeekNumber = 1;
    }

    // Calculate isDeload if not provided (deload every 4th week = every 28th session)
    const calculatedIsDeload = isDeload ?? calculatedWeekNumber % 4 === 0;

    // Create the workout session
    const session = await db.workoutSession.create({
      data: {
        date: new Date(date),
        dayType,
        weekNumber: calculatedWeekNumber,
        isDeload: calculatedIsDeload,
        completed: true,
        notes: notes ?? null,
        logs: {
          create: exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            setNumber: ex.setNumber,
            holdTimeSeconds: ex.holdTimeSeconds ?? null,
            reps: ex.reps ?? null,
            weightKg: ex.weightKg ?? null,
            rpe: ex.rpe ?? null,
            leanDistanceCm: ex.leanDistanceCm ?? null,
            bandAssistance: ex.bandAssistance ?? null,
            painReported: ex.painReported ?? false,
            painNotes: ex.painNotes ?? null,
          })),
        },
      },
      include: {
        logs: {
          include: {
            exercise: true,
          },
        },
      },
    });

    // Increment completedSessions on user profile
    await db.userProfile.update({
      where: { id: 'default-user' },
      data: { completedSessions: { increment: 1 } },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Error creating workout log:', error);
    return NextResponse.json(
      { error: 'Failed to create workout log' },
      { status: 500 }
    );
  }
}
