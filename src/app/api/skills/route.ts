import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const skills = await db.skill.findMany({
      include: {
        stages: {
          orderBy: { stageNumber: 'asc' },
          include: {
            exercises: {
              orderBy: { progressionOrder: 'asc' },
            },
          },
        },
      },
    });

    const result = skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      label: skill.label,
      icon: skill.icon,
      stages: skill.stages.map((stage) => ({
        id: stage.id,
        stageNumber: stage.stageNumber,
        name: stage.name,
        goalDescription: stage.goalDescription,
        startMonth: stage.startMonth,
        endMonth: stage.endMonth,
        targetHoldMin: stage.targetHoldMin,
        targetHoldMax: stage.targetHoldMax,
        exercises: stage.exercises.map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          category: exercise.category,
          type: exercise.type,
          description: exercise.description,
          formCues: exercise.formCues ? JSON.parse(exercise.formCues) : [],
          targetSetsMin: exercise.targetSetsMin,
          targetSetsMax: exercise.targetSetsMax,
          targetRepsMin: exercise.targetRepsMin,
          targetRepsMax: exercise.targetRepsMax,
          targetHoldMin: exercise.targetHoldMin,
          targetHoldMax: exercise.targetHoldMax,
          restSeconds: exercise.restSeconds,
          equipment: exercise.equipment,
          progressionOrder: exercise.progressionOrder,
        })),
      })),
    }));

    return NextResponse.json({ skills: result });
  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}
