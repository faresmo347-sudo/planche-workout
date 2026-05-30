import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const profile = await db.profile.findFirst()
    const sessions = await db.workoutSession.findMany({
      orderBy: { createdAt: 'asc' },
    })
    const maxHolds = await db.maxHold.findMany()
    const painReports = await db.painReport.findMany({
      orderBy: { date: 'desc' },
    })

    // Parse exercises JSON from sessions
    const parsedSessions = sessions.map((s) => ({
      ...s,
      exercises: JSON.parse(s.exercises),
    }))

    const hasData = !!(profile || parsedSessions.length > 0 || maxHolds.length > 0 || painReports.length > 0)

    return NextResponse.json({
      hasData,
      profile,
      sessions: parsedSessions,
      maxHolds,
      painReports,
    })
  } catch (error) {
    console.error('Sync GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { profile, sessions, maxHolds, painReports } = body as {
      profile?: {
        id: string
        age: number
        heightCm: number
        weightKg: number
        pullUpsMax: number
        muscleUpsMax: number
        pushUpsMax: number
        plancheStage: number
        flStage: number
        startDate: string
      }
      sessions?: {
        id: string
        date: string
        dayType: string
        weekNumber: number
        isDeload: boolean
        completed: boolean
        notes: string | null
        exercises: unknown[]
      }[]
      maxHolds?: {
        id: string
        exerciseName: string
        maxHoldSeconds: number
        lastTestedAt: string
      }[]
      painReports?: {
        id: string
        date: string
        bodyPart: string
        severity: number
        notes: string | null
        exerciseId: string | null
        actionTaken: string | null
      }[]
    }

    // Upsert profile
    if (profile) {
      await db.profile.upsert({
        where: { id: profile.id },
        update: {
          age: profile.age,
          heightCm: profile.heightCm,
          weightKg: profile.weightKg,
          pullUpsMax: profile.pullUpsMax,
          muscleUpsMax: profile.muscleUpsMax,
          pushUpsMax: profile.pushUpsMax,
          plancheStage: profile.plancheStage,
          flStage: profile.flStage,
          startDate: profile.startDate,
        },
        create: {
          id: profile.id,
          age: profile.age,
          heightCm: profile.heightCm,
          weightKg: profile.weightKg,
          pullUpsMax: profile.pullUpsMax,
          muscleUpsMax: profile.muscleUpsMax,
          pushUpsMax: profile.pushUpsMax,
          plancheStage: profile.plancheStage,
          flStage: profile.flStage,
          startDate: profile.startDate,
        },
      })
    }

    // Upsert sessions
    if (sessions && Array.isArray(sessions)) {
      for (const session of sessions) {
        await db.workoutSession.upsert({
          where: { id: session.id },
          update: {
            date: session.date,
            dayType: session.dayType,
            weekNumber: session.weekNumber,
            isDeload: session.isDeload,
            completed: session.completed,
            notes: session.notes,
            exercises: JSON.stringify(session.exercises),
          },
          create: {
            id: session.id,
            date: session.date,
            dayType: session.dayType,
            weekNumber: session.weekNumber,
            isDeload: session.isDeload,
            completed: session.completed,
            notes: session.notes,
            exercises: JSON.stringify(session.exercises),
          },
        })
      }
    }

    // Upsert max holds
    if (maxHolds && Array.isArray(maxHolds)) {
      for (const hold of maxHolds) {
        await db.maxHold.upsert({
          where: { id: hold.id },
          update: {
            exerciseName: hold.exerciseName,
            maxHoldSeconds: hold.maxHoldSeconds,
            lastTestedAt: hold.lastTestedAt,
          },
          create: {
            id: hold.id,
            exerciseName: hold.exerciseName,
            maxHoldSeconds: hold.maxHoldSeconds,
            lastTestedAt: hold.lastTestedAt,
          },
        })
      }
    }

    // Pain reports are append-only
    if (painReports && Array.isArray(painReports)) {
      for (const report of painReports) {
        const existing = await db.painReport.findUnique({
          where: { id: report.id },
        })
        if (!existing) {
          await db.painReport.create({
            data: {
              id: report.id,
              date: report.date,
              bodyPart: report.bodyPart,
              severity: report.severity,
              notes: report.notes,
              exerciseId: report.exerciseId,
              actionTaken: report.actionTaken,
            },
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sync POST error:', error)
    return NextResponse.json(
      { error: 'Failed to sync data' },
      { status: 500 }
    )
  }
}
