import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// Prilepin table for isometric holds
function getPrilepinForIsometric(maxHoldSeconds: number): {
  targetHoldMin: number;
  targetHoldMax: number;
  targetSetsMin: number;
  targetSetsMax: number;
} {
  if (maxHoldSeconds <= 7) {
    return { targetHoldMin: 3, targetHoldMax: 4, targetSetsMin: 6, targetSetsMax: 8 };
  } else if (maxHoldSeconds <= 12) {
    return { targetHoldMin: 5, targetHoldMax: 8, targetSetsMin: 5, targetSetsMax: 7 };
  } else if (maxHoldSeconds <= 18) {
    return { targetHoldMin: 9, targetHoldMax: 12, targetSetsMin: 4, targetSetsMax: 6 };
  } else if (maxHoldSeconds <= 25) {
    return { targetHoldMin: 13, targetHoldMax: 18, targetSetsMin: 3, targetSetsMax: 5 };
  } else {
    return { targetHoldMin: 19, targetHoldMax: 25, targetSetsMin: 3, targetSetsMax: 4 };
  }
}

interface ExerciseWithStage {
  id: string;
  name: string;
  category: string;
  type: string;
  description: string | null;
  formCues: string | null;
  targetSetsMin: number;
  targetSetsMax: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetHoldMin: number | null;
  targetHoldMax: number | null;
  restSeconds: number;
  equipment: string | null;
  progressionOrder: number;
}

function formatExercise(
  exercise: ExerciseWithStage,
  isDeload: boolean,
  maxHoldSeconds?: number | null
) {
  const formCues = exercise.formCues ? JSON.parse(exercise.formCues) : [];

  if (exercise.type === 'isometric') {
    let targetSetsMin: number;
    let targetSetsMax: number;
    let targetHoldMin: number;
    let targetHoldMax: number;

    if (maxHoldSeconds != null && maxHoldSeconds > 0) {
      // Use Prilepin table
      const prilepin = getPrilepinForIsometric(maxHoldSeconds);
      targetHoldMin = prilepin.targetHoldMin;
      targetHoldMax = prilepin.targetHoldMax;
      targetSetsMin = prilepin.targetSetsMin;
      targetSetsMax = prilepin.targetSetsMax;
    } else {
      // Fallback to exercise defaults
      targetHoldMin = exercise.targetHoldMin ?? 5;
      targetHoldMax = exercise.targetHoldMax ?? 10;
      targetSetsMin = exercise.targetSetsMin;
      targetSetsMax = exercise.targetSetsMax;
    }

    if (isDeload) {
      targetSetsMin = Math.max(1, Math.round(targetSetsMin * 0.5));
      targetSetsMax = Math.max(1, Math.round(targetSetsMax * 0.5));
      targetHoldMin = Math.round(targetHoldMin * 0.8);
      targetHoldMax = Math.round(targetHoldMax * 0.8);
    }

    return {
      id: exercise.id,
      name: exercise.name,
      type: exercise.type,
      category: exercise.category,
      targetSetsMin,
      targetSetsMax,
      holdTimeMin: targetHoldMin,
      holdTimeMax: targetHoldMax,
      restSeconds: exercise.restSeconds,
      formCues,
      description: exercise.description,
    };
  } else {
    // Dynamic / eccentric
    let targetSetsMin = exercise.targetSetsMin;
    let targetSetsMax = exercise.targetSetsMax;
    let targetRepsMin = exercise.targetRepsMin ?? 5;
    let targetRepsMax = exercise.targetRepsMax ?? 8;

    if (isDeload) {
      targetSetsMin = Math.max(1, Math.round(targetSetsMin * 0.5));
      targetSetsMax = Math.max(1, Math.round(targetSetsMax * 0.5));
      // Use targetRepsMin instead of targetRepsMax for deload
      targetRepsMax = targetRepsMin;
    }

    return {
      id: exercise.id,
      name: exercise.name,
      type: exercise.type,
      category: exercise.category,
      targetSetsMin,
      targetSetsMax,
      targetRepsMin,
      targetRepsMax,
      restSeconds: exercise.restSeconds,
      formCues,
      description: exercise.description,
    };
  }
}

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

    // Determine day of week and workout type
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, ...
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    type DayType = 'planche_focus' | 'fl_focus' | 'rest';
    let dayType: DayType;
    let focusSkill: string | null = null;
    let focusStageNum: number | null = null;

    switch (dayOfWeek) {
      case 1: // Monday
        dayType = 'planche_focus';
        focusSkill = 'planche';
        focusStageNum = profile.plancheStage;
        break;
      case 2: // Tuesday
        dayType = 'fl_focus';
        focusSkill = 'front_lever';
        focusStageNum = profile.flStage;
        break;
      case 3: // Wednesday
        dayType = 'rest';
        break;
      case 4: // Thursday
        dayType = 'planche_focus';
        focusSkill = 'planche';
        focusStageNum = profile.plancheStage;
        break;
      case 5: // Friday
        dayType = 'fl_focus';
        focusSkill = 'front_lever';
        focusStageNum = profile.flStage;
        break;
      default:
        // Saturday & Sunday
        dayType = 'rest';
        break;
    }

    // Calculate week number and deload
    const startDate = new Date(profile.startDate);
    const weekNumber =
      Math.floor(
        (now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      ) + 1;
    const isDeload = weekNumber % 4 === 0;

    // If rest day, return early
    if (dayType === 'rest') {
      return NextResponse.json({
        date: now.toISOString(),
        dayName: dayNames[dayOfWeek],
        dayType,
        weekNumber,
        isDeload,
        sections: {
          warmup: [],
          skill: [],
          accessory: [],
          core: [],
          cooldown: [],
        },
        message:
          dayOfWeek === 3
            ? 'Active recovery day — light stretching and mobility recommended'
            : 'Rest day — focus on recovery',
      });
    }

    // Get the focus skill
    const skill = await db.skill.findUnique({
      where: { name: focusSkill! },
      include: {
        stages: {
          where: { stageNumber: focusStageNum! },
          include: {
            exercises: {
              orderBy: { progressionOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!skill || skill.stages.length === 0) {
      return NextResponse.json(
        { error: `No stage found for ${focusSkill} stage ${focusStageNum}` },
        { status: 404 }
      );
    }

    const stage = skill.stages[0];

    // Get max holds for isometric exercises
    const maxHolds = await db.maxHold.findMany();
    const maxHoldMap = new Map<string, number>();
    for (const mh of maxHolds) {
      maxHoldMap.set(mh.exerciseName, mh.maxHoldSeconds);
    }

    // Get warmup and cooldown exercises (from any stage)
    const warmupExercises = await db.exercise.findMany({
      where: { category: 'warmup' },
      orderBy: { progressionOrder: 'asc' },
    });

    const cooldownExercises = await db.exercise.findMany({
      where: { category: 'cooldown' },
      orderBy: { progressionOrder: 'asc' },
    });

    // Categorize exercises from the current stage
    const skillExercises = stage.exercises.filter(
      (e) => e.category === 'skill'
    );
    const accessoryExercises = stage.exercises.filter(
      (e) => e.category === 'accessory'
    );
    const coreExercises = stage.exercises.filter(
      (e) => e.category === 'core'
    );

    // Format exercises
    const formatWithMaxHold = (ex: ExerciseWithStage) => {
      const maxHold = maxHoldMap.get(ex.name);
      return formatExercise(ex, isDeload, maxHold);
    };

    const workout = {
      date: now.toISOString(),
      dayName: dayNames[dayOfWeek],
      dayType,
      weekNumber,
      isDeload,
      focusSkill: focusSkill,
      focusStage: focusStageNum,
      stageName: stage.name,
      sections: {
        warmup: warmupExercises.map((ex) => formatExercise(ex, isDeload)),
        skill: skillExercises.map((ex) => formatWithMaxHold(ex as ExerciseWithStage)),
        accessory: accessoryExercises.map((ex) => formatWithMaxHold(ex as ExerciseWithStage)),
        core: coreExercises.map((ex) => formatWithMaxHold(ex as ExerciseWithStage)),
        cooldown: cooldownExercises.map((ex) => formatExercise(ex, isDeload)),
      },
    };

    return NextResponse.json(workout);
  } catch (error) {
    console.error('Error generating workout:', error);
    return NextResponse.json(
      { error: 'Failed to generate workout' },
      { status: 500 }
    );
  }
}
