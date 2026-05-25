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

    // Calculate weekNumber if not provided
    let calculatedWeekNumber = weekNumber;
    if (!calculatedWeekNumber) {
      const profile = await db.userProfile.findUnique({
        where: { id: 'default-user' },
      });
      if (profile) {
        const startDate = new Date(profile.startDate);
        const sessionDate = new Date(date);
        calculatedWeekNumber =
          Math.floor(
            (sessionDate.getTime() - startDate.getTime()) /
              (7 * 24 * 60 * 60 * 1000)
          ) + 1;
      } else {
        calculatedWeekNumber = 1;
      }
    }

    // Calculate isDeload if not provided
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

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Error creating workout log:', error);
    return NextResponse.json(
      { error: 'Failed to create workout log' },
      { status: 500 }
    );
  }
}
