'use client'

import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { motion } from 'framer-motion'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  CircleDot,
  GripHorizontal,
  Dumbbell,
  Timer,
  Leaf,
  TrendingUp,
  CalendarDays,
  Play,
  Moon,
  Sun,
} from 'lucide-react'
import type {
  ProfileData,
  SkillData,
  StageData,
  ApiWorkoutResponse,
  ApiExercise,
} from '@/lib/types'

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface DashboardProps {
  setActiveTab: (tab: string) => void
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function getGreeting(): { text: string; Icon: typeof Sun } {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Good morning', Icon: Sun }
  if (hour < 17) return { text: 'Good afternoon', Icon: Sun }
  return { text: 'Good evening', Icon: Moon }
}

function getMonthsElapsed(startDate: string): number {
  const start = new Date(startDate)
  const now = new Date()
  return (
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  )
}

function getStageProgress(stage: StageData, monthsElapsed: number): number {
  const duration = stage.endMonth - stage.startMonth
  if (duration <= 0) return 100
  const elapsed = monthsElapsed - stage.startMonth
  return Math.min(100, Math.max(0, Math.round((elapsed / duration) * 100)))
}

function getDayTypeLabel(dayType: string): string {
  switch (dayType) {
    case 'planche_focus':
      return 'Planche Focus'
    case 'fl_focus':
      return 'FL Focus'
    case 'rest':
      return 'Rest Day'
    default:
      return dayType
  }
}

function countAllExercises(sections: ApiWorkoutResponse['sections']): number {
  return (
    (sections.warmup?.length ?? 0) +
    (sections.skill?.length ?? 0) +
    (sections.accessory?.length ?? 0) +
    (sections.core?.length ?? 0) +
    (sections.cooldown?.length ?? 0)
  )
}

function getNonWarmupExercises(
  sections: ApiWorkoutResponse['sections']
): ApiExercise[] {
  return [
    ...(sections.skill ?? []),
    ...(sections.accessory ?? []),
    ...(sections.core ?? []),
  ]
}

function estimateDuration(sections: ApiWorkoutResponse['sections']): number {
  const warmup = (sections.warmup?.length ?? 0) > 0 ? 10 : 0
  const skillCount = sections.skill?.length ?? 0
  const accessoryCount = sections.accessory?.length ?? 0
  const coreCount = sections.core?.length ?? 0
  const cooldown = (sections.cooldown?.length ?? 0) > 0 ? 8 : 0

  const skillMin = skillCount > 0 ? 25 : 0
  const accessoryMin = accessoryCount > 0 ? 25 : 0
  const coreMin = coreCount > 0 ? 8 : 0

  return warmup + skillMin + accessoryMin + coreMin + cooldown
}

function getCategoryBadgeVariant(
  category: string
): 'default' | 'secondary' | 'outline' {
  switch (category) {
    case 'skill':
      return 'default'
    case 'accessory':
      return 'secondary'
    case 'core':
      return 'outline'
    default:
      return 'secondary'
  }
}

/* ------------------------------------------------------------------ */
/*  Fetchers                                                           */
/* ------------------------------------------------------------------ */
async function fetchProfile(): Promise<ProfileData> {
  const res = await fetch('/api/profile')
  if (!res.ok) throw new Error('Failed to fetch profile')
  const data = await res.json()
  return data.profile
}

async function fetchSkills(): Promise<SkillData[]> {
  const res = await fetch('/api/skills')
  if (!res.ok) throw new Error('Failed to fetch skills')
  const data = await res.json()
  return data.skills
}

async function fetchWorkoutToday(): Promise<ApiWorkoutResponse> {
  const res = await fetch('/api/workout/today')
  if (!res.ok) throw new Error('Failed to fetch workout')
  return res.json()
}

async function fetchDashboardStats(): Promise<{
  totalWorkouts: number
  plancheMaxHold: number | null
  plancheMaxHoldName: string | null
  flMaxHold: number | null
  flMaxHoldName: string | null
  thisWeekSessions: number
  weekNumber: number
}> {
  const res = await fetch('/api/dashboard/stats')
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SkillProgressCard({
  skill,
  stageNumber,
  monthsElapsed,
  icon: Icon,
}: {
  skill: SkillData | undefined
  stageNumber: number
  monthsElapsed: number
  icon: React.ElementType
}) {
  const stage = skill?.stages.find((s) => s.stageNumber === stageNumber)
  if (!skill || !stage) {
    return (
      <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">
            No stage data available
          </p>
        </CardContent>
      </Card>
    )
  }

  const progress = getStageProgress(stage, monthsElapsed)

  return (
    <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-card">
      <CardHeader className="pb-2 px-5 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{skill.label}</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Stage {stage.stageNumber}: {stage.name}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {stage.goalDescription}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Stage progress</span>
            <span className="font-medium text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 rounded-full" />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Month {stage.startMonth}</span>
            <span>Month {stage.endMonth}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard Component                                           */
/* ------------------------------------------------------------------ */
export default function Dashboard({ setActiveTab }: DashboardProps) {
  /* ---- data queries ---- */
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  })
  const skillsQuery = useQuery({
    queryKey: ['skills'],
    queryFn: fetchSkills,
  })
  const workoutQuery = useQuery({
    queryKey: ['workout-today'],
    queryFn: fetchWorkoutToday,
  })
  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  })

  const profile = profileQuery.data
  const skills = skillsQuery.data ?? []
  const workout = workoutQuery.data
  const stats = statsQuery.data

  const plancheSkill = skills.find((s) => s.name === 'planche')
  const flSkill = skills.find((s) => s.name === 'front_lever')

  const monthsElapsed = profile ? getMonthsElapsed(profile.startDate) : 0

  // Hydration-safe greeting: useSyncExternalStore with server snapshot
  const emptySubscribe = () => () => {}
  const { text: greeting, Icon: GreetingIcon } = useSyncExternalStore(
    emptySubscribe,
    () => getGreeting(),
    () => ({ text: 'Hello', Icon: Sun })
  )

  const isRestDay = workout?.dayType === 'rest'
  const nonWarmupExercises = workout ? getNonWarmupExercises(workout.sections) : []
  const totalExercises = workout ? countAllExercises(workout.sections) : 0
  const duration = workout ? estimateDuration(workout.sections) : 0

  const isLoading =
    profileQuery.isLoading ||
    skillsQuery.isLoading ||
    workoutQuery.isLoading

  /* ---- render ---- */
  return (
    <motion.div
      className="space-y-5 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ============ HEADER SECTION ============ */}
      <motion.div variants={itemVariants}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <GreetingIcon className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-semibold tracking-tight">
                {greeting}
              </h1>
            </div>
            {workout && (
              <p className="text-sm text-muted-foreground">
                Week {workout.weekNumber} &middot;{' '}
                {getDayTypeLabel(workout.dayType)}
              </p>
            )}
          </div>
          {workout?.isDeload && (
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-0 text-xs shrink-0"
            >
              <Leaf className="w-3 h-3 mr-1" />
              Deload
            </Badge>
          )}
        </div>
      </motion.div>

      {/* ============ SKILL PROGRESS CARDS ============ */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <SkillProgressCard
          skill={plancheSkill}
          stageNumber={profile?.plancheStage ?? 1}
          monthsElapsed={monthsElapsed}
          icon={CircleDot}
        />
        <SkillProgressCard
          skill={flSkill}
          stageNumber={profile?.flStage ?? 1}
          monthsElapsed={monthsElapsed}
          icon={GripHorizontal}
        />
      </motion.div>

      {/* ============ TODAY'S WORKOUT PREVIEW ============ */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-card">
          <CardHeader className="pb-3 px-5 pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Today&apos;s Workout</CardTitle>
                  {workout && (
                    <CardDescription className="text-xs mt-0.5">
                      {getDayTypeLabel(workout.dayType)}
                    </CardDescription>
                  )}
                </div>
              </div>
              {workout && !isRestDay && (
                <Badge
                  variant="outline"
                  className="text-xs border-primary/20 text-primary"
                >
                  {workout.dayName}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              </div>
            ) : isRestDay ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
                  <Leaf className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Rest &amp; Recover
                </p>
                <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
                  {workout?.message ??
                    'Take it easy today. Light stretching and mobility recommended.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Quick info row */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5" />
                    {totalExercises} exercises
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5" />
                    ~{duration} min
                  </span>
                </div>

                {/* Exercise list */}
                <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar">
                  {nonWarmupExercises.map((ex) => (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-muted/60 transition-colors"
                    >
                      <span className="text-sm truncate mr-2">{ex.name}</span>
                      <Badge
                        variant={getCategoryBadgeVariant(ex.category)}
                        className={`text-[10px] shrink-0 ${
                          ex.category === 'skill'
                            ? 'bg-primary/10 text-primary border-0'
                            : ex.category === 'core'
                            ? 'border-primary/20 text-primary'
                            : ''
                        }`}
                      >
                        {ex.category}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Start Workout button */}
                <Button
                  onClick={() => setActiveTab('workout')}
                  className="w-full rounded-xl h-11 text-sm font-medium"
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-1.5" />
                  Start Workout
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ============ QUICK STATS ROW ============ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-3 gap-3">
          {/* Total Workouts */}
          <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-card">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xl font-semibold leading-none">
                {stats?.totalWorkouts ?? 0}
              </span>
              <span className="text-[11px] text-muted-foreground mt-1">
                Workouts
              </span>
            </CardContent>
          </Card>

          {/* Planche Max Hold */}
          <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-card">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 mb-2">
                <CircleDot className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xl font-semibold leading-none">
                {stats?.plancheMaxHold != null
                  ? `${Math.round(stats.plancheMaxHold)}s`
                  : '—'}
              </span>
              <span className="text-[11px] text-muted-foreground mt-1">
                Planche
              </span>
            </CardContent>
          </Card>

          {/* FL Max Hold */}
          <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-card">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 mb-2">
                <GripHorizontal className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xl font-semibold leading-none">
                {stats?.flMaxHold != null
                  ? `${Math.round(stats.flMaxHold)}s`
                  : '—'}
              </span>
              <span className="text-[11px] text-muted-foreground mt-1">
                Front Lever
              </span>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ============ THIS WEEK TRAINING DAYS ============ */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 shrink-0">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {stats?.thisWeekSessions ?? 0} training day
                {(stats?.thisWeekSessions ?? 0) !== 1 ? 's' : ''} this week
              </p>
              <p className="text-xs text-muted-foreground">
                {stats?.weekNumber != null
                  ? `Program week ${stats.weekNumber}`
                  : 'Loading...'}
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((day) => {
                const isCompleted = day <= (stats?.thisWeekSessions ?? 0)
                return (
                  <div
                    key={day}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      isCompleted
                        ? 'bg-primary'
                        : 'bg-muted'
                    }`}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
