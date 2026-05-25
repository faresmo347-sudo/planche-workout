import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get user profile
    const profile = await db.userProfile.findUnique({
      where: { id: 'default-user' },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get all workout sessions with their logs and exercise info
    const sessions = await db.workoutSession.findMany({
      orderBy: { date: 'asc' },
      include: {
        logs: {
          include: {
            exercise: true,
          },
        },
      },
    });

    // Group data by exercise name
    const exerciseProgress: Record<
      string,
      {
        exerciseId: string;
        exerciseName: string;
        type: string;
        category: string;
        dataPoints: {
          date: string;
          sessionId: string;
          value: number;
          sets: number;
          rpe: number | null;
        }[];
      }
    > = {};

    // Also group by session for a timeline view
    const sessionMap = new Map<string, { date: string; weekNumber: number; isDeload: boolean }>();
    for (const session of sessions) {
      sessionMap.set(session.id, {
        date: session.date.toISOString(),
        weekNumber: session.weekNumber,
        isDeload: session.isDeload,
      });

      // Group logs by exercise
      const logsByExercise = new Map<string, typeof session.logs>();
      for (const log of session.logs) {
        const existing = logsByExercise.get(log.exerciseId) ?? [];
        existing.push(log);
        logsByExercise.set(log.exerciseId, existing);
      }

      for (const [exerciseId, logs] of logsByExercise) {
        if (logs.length === 0) continue;
        const exercise = logs[0].exercise;

        if (!exerciseProgress[exercise.name]) {
          exerciseProgress[exercise.name] = {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            type: exercise.type,
            category: exercise.category,
            dataPoints: [],
          };
        }

        // Calculate the best metric for this session
        if (exercise.type === 'isometric') {
          // Max hold time across sets
          const maxHold = Math.max(
            ...logs.map((l) => l.holdTimeSeconds ?? 0)
          );
          exerciseProgress[exercise.name].dataPoints.push({
            date: session.date.toISOString(),
            sessionId: session.id,
            value: maxHold,
            sets: logs.length,
            rpe: logs.find((l) => l.rpe != null)?.rpe ?? null,
          });
        } else {
          // Max reps across sets (for dynamic/eccentric)
          const maxReps = Math.max(...logs.map((l) => l.reps ?? 0));
          exerciseProgress[exercise.name].dataPoints.push({
            date: session.date.toISOString(),
            sessionId: session.id,
            value: maxReps,
            sets: logs.length,
            rpe: logs.find((l) => l.rpe != null)?.rpe ?? null,
          });
        }
      }
    }

    // Get stage progress info
    const plancheSkill = await db.skill.findUnique({
      where: { name: 'planche' },
      include: { stages: { orderBy: { stageNumber: 'asc' } } },
    });
    const flSkill = await db.skill.findUnique({
      where: { name: 'front_lever' },
      include: { stages: { orderBy: { stageNumber: 'asc' } } },
    });

    const now = new Date();
    const startDate = new Date(profile.startDate);
    const monthsElapsed =
      (now.getFullYear() - startDate.getFullYear()) * 12 +
      (now.getMonth() - startDate.getMonth());

    const plancheStageInfo = plancheSkill?.stages.find(
      (s) => s.stageNumber === profile.plancheStage
    );
    const flStageInfo = flSkill?.stages.find(
      (s) => s.stageNumber === profile.flStage
    );

    const stageProgress = {
      monthsElapsed,
      planche: plancheStageInfo
        ? {
            stageNumber: profile.plancheStage,
            name: plancheStageInfo.name,
            goalDescription: plancheStageInfo.goalDescription,
            startMonth: plancheStageInfo.startMonth,
            endMonth: plancheStageInfo.endMonth,
            progressInStage: Math.min(
              100,
              Math.max(
                0,
                Math.round(
                  ((monthsElapsed - plancheStageInfo.startMonth) /
                    (plancheStageInfo.endMonth - plancheStageInfo.startMonth)) *
                    100
                )
              )
            ),
          }
        : null,
      frontLever: flStageInfo
        ? {
            stageNumber: profile.flStage,
            name: flStageInfo.name,
            goalDescription: flStageInfo.goalDescription,
            startMonth: flStageInfo.startMonth,
            endMonth: flStageInfo.endMonth,
            progressInStage: Math.min(
              100,
              Math.max(
                0,
                Math.round(
                  ((monthsElapsed - flStageInfo.startMonth) /
                    (flStageInfo.endMonth - flStageInfo.startMonth)) *
                    100
                )
              )
            ),
          }
        : null,
    };

    return NextResponse.json({
      exerciseProgress: Object.values(exerciseProgress),
      stageProgress,
      totalSessions: sessions.length,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
