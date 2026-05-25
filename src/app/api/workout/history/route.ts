import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const sessions = await db.workoutSession.findMany({
      orderBy: { date: 'desc' },
      take: 20,
      include: {
        logs: {
          include: {
            exercise: {
              select: {
                name: true,
                type: true,
                category: true,
              },
            },
          },
        },
      },
    });

    const history = sessions.map((session) => ({
      id: session.id,
      date: session.date.toISOString(),
      dayType: session.dayType,
      weekNumber: session.weekNumber,
      isDeload: session.isDeload,
      completed: session.completed,
      exercisesCompleted: session.logs.length,
      exercises: session.logs.map((log) => ({
        name: log.exercise.name,
        type: log.exercise.type,
        category: log.exercise.category,
        setNumber: log.setNumber,
        holdTimeSeconds: log.holdTimeSeconds,
        reps: log.reps,
        rpe: log.rpe,
      })),
    }));

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching workout history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workout history' },
      { status: 500 }
    );
  }
}
