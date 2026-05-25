import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function getSuggestion(severity: number): string {
  if (severity <= 3) {
    return 'Monitor and reduce intensity slightly';
  } else if (severity <= 6) {
    return 'Reduce sets/reps by 25%, consider easier progression';
  } else {
    return 'Stop the exercise, rest for 48-72 hours, consider consulting a professional';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bodyPart, severity, exerciseId, notes } = body;

    if (!bodyPart || severity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: bodyPart, severity' },
        { status: 400 }
      );
    }

    if (severity < 1 || severity > 10) {
      return NextResponse.json(
        { error: 'Severity must be between 1 and 10' },
        { status: 400 }
      );
    }

    const suggestion = getSuggestion(severity);

    const painReport = await db.painReport.create({
      data: {
        bodyPart,
        severity,
        exerciseId: exerciseId ?? null,
        notes: notes ?? null,
        actionTaken: suggestion,
      },
    });

    return NextResponse.json(
      {
        painReport,
        suggestion,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating pain report:', error);
    return NextResponse.json(
      { error: 'Failed to create pain report' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const painReports = await db.painReport.findMany({
      where: {
        date: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ painReports });
  } catch (error) {
    console.error('Error fetching pain reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pain reports' },
      { status: 500 }
    );
  }
}
