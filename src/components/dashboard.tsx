'use client'

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
  RotateCcw,
  Trophy,
  Zap,
} from 'lucide-react'
import type {
  SkillData,
  ApiWorkoutResponse,
  ApiExercise,
  ProfileData,
} from '@/lib/types'
import {
  SKILLS,
  getProfile,
  generateWorkoutToday,
  getDashboardStats,
  getStageProgressByWorkouts,
  saveWorkoutSession,
  type WorkoutSession,
} from '@/lib/client-data'

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface DashboardProps {
  setActiveTab: (tab: string) => void
  onWorkoutLogged?: () => void
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
/*  Hydration-safe greeting store                                      */
/* ------------------------------------------------------------------ */

const SERVER_GREETING = { text: 'Hello', Icon: Sun } as const
let _clientGreeting: { text: string; Icon: typeof Sun } | null = null

function getGreetingSnapshot() {
  if (!_clientGreeting) {
    const hour = new Date().getHours()
    if (hour < 12) _clientGreeting = { text: 'Good morning', Icon: Sun }
    else if (hour < 17) _clientGreeting = { text: 'Good afternoon', Icon: Sun }
    else _clientGreeting = { text: 'Good evening', Icon: Moon }
  }
  return _clientGreeting
}

function getServerGreetingSnapshot() { return SERVER_GREETING }
function serverGreetingSubscribe() { return () => {} }

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getDayTypeLabel(dayType: string): string {
  switch (dayType) {
    case 'planche_focus':
      return 'Planche Focus'
    case 'fl_focus':
      return 'FL Focus'
    case 'combined':
      return 'Combined'
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
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SkillProgressCard({
  skill,
  skillName,
  icon: Icon,
}: {
  skill: SkillData | undefined
  skillName: 'planche' | 'front_lever'
  icon: React.ElementType
}) {
  const stageProgress = getStageProgressByWorkouts(skillName)
  const stage = skill?.stages.find((s) => s.stageNumber === stageProgress.currentStage)
  const nextStage = skill?.stages.find((s) => s.stageNumber === stageProgress.currentStage + 1)

  if (!skill || !stage) {
    return (
      <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 px-5 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">
                {skill?.label ?? (skillName === 'planche' ? 'Planche' : 'Front Lever')}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Stage {stageProgress.currentStage}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <p className="text-sm text-muted-foreground">
            Loading stage data...
          </p>
          <div className="space-y-1.5 mt-3">
            <div className="h-2 bg-muted rounded-full animate-pulse w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const isMaxStage = !nextStage
  const progress = stageProgress.percentComplete

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
          {isMaxStage && (
            <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
              <Trophy className="w-3 h-3 mr-0.5" />
              Max
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {stage.goalDescription}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {isMaxStage ? 'Stage mastered' : `Week ${stageProgress.currentWeekInStage}/${stageProgress.totalWeeksInStage} · ${stageProgress.workoutsInStage}/${stageProgress.workoutsNeeded} workouts`}
            </span>
            <span className="font-medium text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 rounded-full" />
          {!isMaxStage && nextStage && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Stage {stage.stageNumber}</span>
              <span>Stage {nextStage.stageNumber}: {nextStage.name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard Component                                           */
/* ------------------------------------------------------------------ */
export default function Dashboard({ setActiveTab, onWorkoutLogged }: DashboardProps) {
  /* ---- in-progress workout check (hydration-safe) ---- */
  const hasInProgressWorkout = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        const savedRaw = localStorage.getItem('workout-progress')
        if (savedRaw) {
          const saved = JSON.parse(savedRaw)
          const now = new Date()
          const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
          return saved.date === today
        }
      } catch {
        // Ignore localStorage errors
      }
      return false
    },
    () => false
  )

  /* ---- load data from client store ---- */
  const profile: ProfileData = getProfile()
  const skills: SkillData[] = SKILLS
  const workout: ApiWorkoutResponse = generateWorkoutToday()
  const stats = getDashboardStats()

  const plancheSkill = skills.find((s) => s.name === 'planche')
  const flSkill = skills.find((s) => s.name === 'front_lever')

  // Hydration-safe greeting
  const { text: greeting, Icon: GreetingIcon } = useSyncExternalStore(
    serverGreetingSubscribe,
    getGreetingSnapshot,
    getServerGreetingSnapshot
  )

  const isRestDay = workout?.dayType === 'rest'
  const nonWarmupExercises = workout ? getNonWarmupExercises(workout.sections) : []
  const totalExercises = workout ? countAllExercises(workout.sections) : 0
  const duration = workout ? estimateDuration(workout.sections) : 0

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

      {/* ============ RESUME WORKOUT BANNER ============ */}
      {hasInProgressWorkout && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="rounded-2xl shadow-sm bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
                <RotateCcw className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Workout in Progress
                </p>
                <p className="text-xs text-muted-foreground">
                  You have an unfinished workout today. Resume where you left off.
                </p>
              </div>
              <Button
                onClick={() => setActiveTab('workout')}
                size="sm"
                className="shrink-0 rounded-xl min-h-[40px]"
              >
                <Play className="w-3.5 h-3.5 mr-1" />
                Resume
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ============ SKILL PROGRESS CARDS ============ */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <SkillProgressCard
          skill={plancheSkill}
          skillName="planche"
          icon={CircleDot}
        />
        <SkillProgressCard
          skill={flSkill}
          skillName="front_lever"
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
            {isRestDay ? (
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
                {stats.totalWorkouts}
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
                {stats.plancheMaxHold != null
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
                {stats.flMaxHold != null
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

      {/* ============ WEEK COMPLETE BANNER ============ */}
      {stats.thisWeekSessions === 0 && stats.totalWorkouts > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="rounded-2xl shadow-sm bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Week Complete!
                  </p>
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary border-0 text-[10px] shrink-0"
                  >
                    <Zap className="w-2.5 h-2.5 mr-0.5" />
                    +5%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Week {stats.weekNumber - 1} completed! Overload increased by 5%
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ============ THIS WEEK TRAINING DAYS ============ */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 shrink-0">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {stats.thisWeekSessions}/7 sessions this week
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.weekNumber != null
                    ? `Program week ${stats.weekNumber}`
                    : 'Loading...'}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const isCompleted = day <= stats.thisWeekSessions
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
            </div>
            {/* Weekly progress message */}
            <div className="mt-3">
              {stats.thisWeekSessions === 7 ? (
                <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                  <Zap className="w-3 h-3" />
                  Week {stats.weekNumber} completed! Overload increased by 5%
                </p>
              ) : stats.thisWeekSessions === 0 && stats.totalWorkouts > 0 ? (
                <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                  <Trophy className="w-3 h-3" />
                  New week started — keep it up!
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Complete all 7 sessions to advance to week {stats.weekNumber + 1}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
