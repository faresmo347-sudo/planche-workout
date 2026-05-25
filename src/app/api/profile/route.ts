import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

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

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      plancheStage,
      flStage,
      weightKg,
      heightCm,
      age,
      pullUpsMax,
      muscleUpsMax,
      pushUpsMax,
      startDate,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (plancheStage !== undefined) updateData.plancheStage = plancheStage;
    if (flStage !== undefined) updateData.flStage = flStage;
    if (weightKg !== undefined) updateData.weightKg = weightKg;
    if (heightCm !== undefined) updateData.heightCm = heightCm;
    if (age !== undefined) updateData.age = age;
    if (pullUpsMax !== undefined) updateData.pullUpsMax = pullUpsMax;
    if (muscleUpsMax !== undefined) updateData.muscleUpsMax = muscleUpsMax;
    if (pushUpsMax !== undefined) updateData.pushUpsMax = pushUpsMax;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);

    const profile = await db.userProfile.update({
      where: { id: 'default-user' },
      data: updateData,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
