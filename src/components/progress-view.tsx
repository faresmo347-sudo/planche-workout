'use client'

import { SKILLS, getProfile, getProgressData, getMaxHolds, getWorkoutHistory, getStageProgressByWorkouts, computeCurrentStage } from '@/lib/client-data'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Target,
  Calendar,
  CheckCircle2,
  Circle,
  Award,
  BarChart3,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Dumbbell,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { format, parseISO } from 'date-fns'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

import type {
  ExerciseProgress,
  StageProgress,
  ProfileData,
  SkillData,
  MaxHoldData,
} from '@/lib/types'

/* -------------------------------------------------------------------------- */
/*  API response shapes                                                       */
/* -------------------------------------------------------------------------- */

interface ProgressApiResponse {
  exerciseProgress: {
    exerciseId: string
    exerciseName: string
    type: string
    category: string
    dataPoints: { date: string; sessionId: string; value: number; sets: number; rpe: number | null }[]
  }[]
  stageProgress: {
    monthsElapsed: number
    planche: {
      stageNumber: number
      name: string
      goalDescription: string
      startMonth: number
      endMonth: number
      progressInStage: number
    } | null
    frontLever: {
      stageNumber: number
      name: string
      goalDescription: string
      startMonth: number
      endMonth: number
      progressInStage: number
    } | null
  }
  totalSessions: number
}

interface WorkoutHistoryItem {
  id: string
  date: string
  dayType: string
  weekNumber: number
  isDeload: boolean
  completed: boolean
  exercisesCompleted: number
  exercises: {
    name: string
    type: string
    category: string
    setNumber: number
    holdTimeSeconds: number | null
    reps: number | null
    rpe: number | null
  }[]
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d')
  } catch {
    return dateStr
  }
}

function formatDateLong(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

function dayTypeLabel(dayType: string): string {
  const labels: Record<string, string> = {
    planche_focus: 'Planche Focus',
    fl_focus: 'FL Focus',
    combined: 'Combined',
    rest: 'Rest Day',
  }
  return labels[dayType] ?? dayType
}

function dayTypeColor(dayType: string): string {
  const colors: Record<string, string> = {
    planche_focus: 'bg-emerald-100 text-emerald-800',
    fl_focus: 'bg-amber-100 text-amber-800',
    combined: 'bg-teal-100 text-teal-800',
    rest: 'bg-stone-100 text-stone-600',
  }
  return colors[dayType] ?? 'bg-stone-100 text-stone-600'
}

/* -------------------------------------------------------------------------- */
/*  Animation variants                                                        */
/* -------------------------------------------------------------------------- */

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' as const },
  }),
}

/* -------------------------------------------------------------------------- */
/*  Stage Timeline                                                            */
/* -------------------------------------------------------------------------- */

function StageTimeline({
  currentStage,
  totalStages,
  stageNames,
}: {
  currentStage: number
  totalStages: number
  stageNames: string[]
}) {
  return (
    <div className="flex items-center justify-between w-full py-2">
      {Array.from({ length: totalStages }, (_, i) => {
        const stageNum = i + 1
        const isPast = stageNum < currentStage
        const isCurrent = stageNum === currentStage
        const isFuture = stageNum > currentStage

        return (
          <div key={stageNum} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1">
              <div className="relative flex items-center justify-center">
                {isPast && (
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
                {isCurrent && (
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" />
                    <div className="relative w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{stageNum}</span>
                    </div>
                  </div>
                )}
                {isFuture && (
                  <div className="w-8 h-8 rounded-full border-2 border-stone-300 flex items-center justify-center">
                    <span className="text-xs font-medium text-stone-400">{stageNum}</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[56px] truncate">
                {stageNames[i] ?? `Stage ${stageNum}`}
              </span>
            </div>
            {/* Connector line */}
            {stageNum < totalStages && (
              <div
                className={`flex-1 h-0.5 mx-1 -mt-4 ${
                  stageNum < currentStage ? 'bg-emerald-400' : 'bg-stone-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Skill Stage Card                                                          */
/* -------------------------------------------------------------------------- */

function SkillStageCard({
  skillName,
  skillLabel,
  icon: Icon,
  stageInfo,
  stages,
  index,
}: {
  skillName: 'planche' | 'front_lever'
  skillLabel: string
  icon: React.ElementType
  stageInfo: NonNullable<ProgressApiResponse['stageProgress']['planche']>
  stages: SkillData['stages']
  index: number
}) {
  const stageProgress = getStageProgressByWorkouts(skillName)
  const currentStageData = stages.find((s) => s.stageNumber === stageProgress.currentStage)
  const nextStageData = stages.find((s) => s.stageNumber === stageProgress.currentStage + 1)
  const isMaxStage = !nextStageData
  const stageNames = stages.map((s) => s.name)
  const workoutsRemaining = isMaxStage ? 0 : stageProgress.workoutsNeeded - stageProgress.workoutsInStage

  return (
    <motion.div
      custom={index}
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
    >
      <Card className="rounded-2xl shadow-sm border-stone-200/60 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Icon className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">{skillLabel}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Stage {stageInfo.stageNumber} &middot; {stageInfo.name}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs font-medium">
              {stageProgress.percentComplete}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Timeline */}
          <StageTimeline
            currentStage={stageInfo.stageNumber}
            totalStages={stages.length}
            stageNames={stageNames}
          />

          {/* Goal description */}
          <div className="bg-stone-50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-sm text-stone-700 leading-relaxed">{stageInfo.goalDescription}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {isMaxStage
                  ? 'Stage mastered!'
                  : `${stageProgress.workoutsInStage}/${stageProgress.workoutsNeeded} workouts to next stage`}
              </span>
              <span className="font-medium text-foreground">{stageProgress.percentComplete}%</span>
            </div>
            <Progress value={stageProgress.percentComplete} className="h-2.5 rounded-full" />
          </div>

          {/* Workout info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Dumbbell className="w-3.5 h-3.5" />
              <span>{stageProgress.workoutsInStage} workouts done</span>
            </div>
            {!isMaxStage && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{workoutsRemaining} workouts to Stage {stageInfo.stageNumber + 1}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Chart Tooltip                                                             */
/* -------------------------------------------------------------------------- */

function ChartTooltipContent({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean
  payload?: any[]
  label?: string
  unit: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-white/95 backdrop-blur-sm border border-stone-200 px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        {payload[0].value} {unit}
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Progress Charts Section                                                   */
/* -------------------------------------------------------------------------- */

function ProgressChartsSection({
  exerciseProgress,
  skills,
}: {
  exerciseProgress: ProgressApiResponse['exerciseProgress']
  skills: SkillData[]
}) {
  const [chartTab, setChartTab] = useState<'hold' | 'reps' | 'all'>('hold')
  const [selectedExercise, setSelectedExercise] = useState<string>('')

  // Group exercises by skill
  const exerciseGroups = useMemo(() => {
    const plancheExercises: { name: string; type: string; latestValue: number | null }[] = []
    const flExercises: { name: string; type: string; latestValue: number | null }[] = []

    for (const ep of exerciseProgress) {
      const lastPoint = ep.dataPoints.length > 0 ? ep.dataPoints[ep.dataPoints.length - 1].value : null
      const entry = { name: ep.exerciseName, type: ep.type, latestValue: lastPoint }

      // Determine which skill this exercise belongs to based on category matching
      const isPlanche = skills.find(
        (s) => s.name === 'planche'
      )?.stages.some((st) => st.exercises.some((ex) => ex.name === ep.exerciseName))
      const isFL = skills.find(
        (s) => s.name === 'front_lever'
      )?.stages.some((st) => st.exercises.some((ex) => ex.name === ep.exerciseName))

      if (isPlanche) plancheExercises.push(entry)
      else if (isFL) flExercises.push(entry)
      else plancheExercises.push(entry) // default to planche
    }

    return { plancheExercises, flExercises }
  }, [exerciseProgress, skills])

  // Filter exercises based on tab
  const filteredExercises = useMemo(() => {
    if (chartTab === 'hold') {
      return exerciseProgress.filter((ep) => ep.type === 'isometric')
    }
    if (chartTab === 'reps') {
      return exerciseProgress.filter((ep) => ep.type !== 'isometric')
    }
    return exerciseProgress
  }, [exerciseProgress, chartTab])

  // Auto-select first exercise
  const currentExercise = useMemo(() => {
    if (selectedExercise) {
      return filteredExercises.find((ep) => ep.exerciseName === selectedExercise) ?? null
    }
    return filteredExercises.length > 0 ? filteredExercises[0] : null
  }, [filteredExercises, selectedExercise])

  const chartData = useMemo(() => {
    if (!currentExercise) return []
    return currentExercise.dataPoints.map((dp) => ({
      date: formatDateShort(dp.date),
      value: dp.value,
    }))
  }, [currentExercise])

  const isIsometric = currentExercise?.type === 'isometric'

  if (exerciseProgress.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm border-stone-200/60">
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <BarChart3 className="w-10 h-10 text-stone-300 mb-3" />
          <p className="text-sm text-muted-foreground">No data yet &mdash; start training!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      custom={2}
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
    >
      <Card className="rounded-2xl shadow-sm border-stone-200/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Progress Charts
            </CardTitle>
            <Tabs value={chartTab} onValueChange={(v) => { setChartTab(v as 'hold' | 'reps' | 'all'); setSelectedExercise('') }}>
              <TabsList className="h-8">
                <TabsTrigger value="hold" className="text-xs px-2.5 h-6">Hold Times</TabsTrigger>
                <TabsTrigger value="reps" className="text-xs px-2.5 h-6">Reps</TabsTrigger>
                <TabsTrigger value="all" className="text-xs px-2.5 h-6">All Exercises</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Exercise selector */}
          <Select
            value={selectedExercise || (filteredExercises[0]?.exerciseName ?? '')}
            onValueChange={setSelectedExercise}
          >
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Select exercise" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Planche Exercises</SelectLabel>
                {exerciseGroups.plancheExercises
                  .filter((ex) =>
                    chartTab === 'all' ||
                    (chartTab === 'hold' && ex.type === 'isometric') ||
                    (chartTab === 'reps' && ex.type !== 'isometric')
                  )
                  .map((ex) => (
                    <SelectItem key={ex.name} value={ex.name}>
                      <span className="flex items-center gap-2">
                        {ex.name}
                        {ex.latestValue !== null && (
                          <span className="text-muted-foreground text-xs">
                            ({ex.latestValue}{ex.type === 'isometric' ? 's' : ' reps'})
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Front Lever Exercises</SelectLabel>
                {exerciseGroups.flExercises
                  .filter((ex) =>
                    chartTab === 'all' ||
                    (chartTab === 'hold' && ex.type === 'isometric') ||
                    (chartTab === 'reps' && ex.type !== 'isometric')
                  )
                  .map((ex) => (
                    <SelectItem key={ex.name} value={ex.name}>
                      <span className="flex items-center gap-2">
                        {ex.name}
                        {ex.latestValue !== null && (
                          <span className="text-muted-foreground text-xs">
                            ({ex.latestValue}{ex.type === 'isometric' ? 's' : ' reps'})
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Chart */}
          {currentExercise && chartData.length > 0 ? (
            <div className="w-full h-[240px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                {isIsometric ? (
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#78716c' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#78716c' }}
                      axisLine={false}
                      tickLine={false}
                      unit="s"
                    />
                    <Tooltip
                      content={({ active, payload, label }) => (
                        <ChartTooltipContent active={active} payload={payload} label={label} unit="sec" />
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#5a8a6a"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#5a8a6a', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#5a8a6a', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#78716c' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#78716c' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => (
                        <ChartTooltipContent active={active} payload={payload} label={label} unit="reps" />
                      )}
                    />
                    <Bar
                      dataKey="value"
                      fill="#b8860b"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
              {currentExercise ? 'No data points yet for this exercise' : 'Select an exercise to view chart'}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Workout History Section                                                   */
/* -------------------------------------------------------------------------- */

function WorkoutHistorySection({ history }: { history: WorkoutHistoryItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (history.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm border-stone-200/60">
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <Calendar className="w-10 h-10 text-stone-300 mb-3" />
          <p className="text-sm text-muted-foreground">No workouts logged yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      custom={3}
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
    >
      <Card className="rounded-2xl shadow-sm border-stone-200/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Workout History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="max-h-96">
            <div className="space-y-1 pr-2 custom-scrollbar">
              {history.map((session) => (
                <Collapsible
                  key={session.id}
                  open={expandedId === session.id}
                  onOpenChange={(open) =>
                    setExpandedId(open ? session.id : null)
                  }
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-stone-50 transition-colors text-left">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-5">
                          {expandedId === session.id ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{formatDateLong(session.date)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 ${dayTypeColor(session.dayType)}`}
                            >
                              {dayTypeLabel(session.dayType)}
                            </Badge>
                            {session.isDeload && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                Deload
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Dumbbell className="w-3 h-3" />
                        <span>{session.exercisesCompleted} exercises</span>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-8 mb-2 space-y-1">
                      {session.exercises.map((ex, i) => (
                        <div
                          key={`${ex.name}-${ex.setNumber}-${i}`}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded bg-stone-50"
                        >
                          <span className="text-stone-700">
                            Set {ex.setNumber}: {ex.name}
                          </span>
                          <span className="text-muted-foreground">
                            {ex.holdTimeSeconds != null
                              ? `${ex.holdTimeSeconds}s`
                              : ex.reps != null
                                ? `${ex.reps} reps`
                                : ''}
                            {ex.rpe != null && ` · RPE ${ex.rpe}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Max Holds Section                                                         */
/* -------------------------------------------------------------------------- */

function MaxHoldsSection({ maxHolds }: { maxHolds: MaxHoldData[] }) {
  if (maxHolds.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm border-stone-200/60">
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <Award className="w-10 h-10 text-stone-300 mb-3" />
          <p className="text-sm text-muted-foreground">No max hold tests recorded yet</p>
        </CardContent>
      </Card>
    )
  }

  const maxVal = Math.max(...maxHolds.map((mh) => mh.maxHoldSeconds), 1)

  return (
    <motion.div
      custom={4}
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
    >
      <Card className="rounded-2xl shadow-sm border-stone-200/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            Max Hold Times
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {maxHolds.map((mh) => {
            const pct = Math.min(100, (mh.maxHoldSeconds / maxVal) * 100)
            return (
              <div key={mh.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{mh.exerciseName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-emerald-700">
                      {Math.round(mh.maxHoldSeconds)}s
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Retest
                    </Button>
                  </div>
                </div>
                <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Last tested {formatDateLong(mh.lastTestedAt)}
                </p>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */

export default function ProgressView() {
  const progressData = getProgressData()
  const profile = getProfile()
  const skills = SKILLS
  const maxHolds = getMaxHolds()
  const rawHistory = getWorkoutHistory()

  const plancheSkill = skills.find((s) => s.name === 'planche')
  const flSkill = skills.find((s) => s.name === 'front_lever')

  // Map workout history to match WorkoutHistoryItem shape
  const history: WorkoutHistoryItem[] = rawHistory.map((session) => ({
    id: session.id,
    date: session.date,
    dayType: session.dayType,
    weekNumber: session.weekNumber,
    isDeload: session.isDeload,
    completed: session.completed,
    exercisesCompleted: session.exercisesCompleted,
    exercises: session.exercises.map((ex: any) => ({
      name: ex.exerciseName ?? ex.name,
      type: ex.type,
      category: ex.category,
      setNumber: ex.setNumber,
      holdTimeSeconds: ex.holdTimeSeconds,
      reps: ex.reps,
      rpe: ex.rpe,
    })),
  }))

  if (!progressData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="rounded-2xl shadow-sm max-w-sm w-full">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <BarChart3 className="w-12 h-12 text-stone-300 mb-4" />
            <p className="text-sm text-muted-foreground mb-1">No data yet</p>
            <p className="text-xs text-muted-foreground">Start training to see your progress!</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-xl font-bold text-foreground">Progress</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {profile
                ? `Training since ${formatDateLong(profile.startDate)}`
                : 'Track your calisthenics journey'}
            </p>
          </div>
          {progressData.totalSessions > 0 && (
            <Badge variant="secondary" className="text-xs">
              {progressData.totalSessions} sessions
            </Badge>
          )}
        </motion.div>

        {/* Stage Progress Overview */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {progressData.stageProgress.planche && plancheSkill && (
            <SkillStageCard
              skillName="planche"
              skillLabel="Planche"
              icon={Target}
              stageInfo={progressData.stageProgress.planche}
              stages={plancheSkill.stages}
              index={0}
            />
          )}
          {progressData.stageProgress.frontLever && flSkill && (
            <SkillStageCard
              skillName="front_lever"
              skillLabel="Front Lever"
              icon={Award}
              stageInfo={progressData.stageProgress.frontLever}
              stages={flSkill.stages}
              index={1}
            />
          )}
        </section>

        {/* Progress Charts */}
        <section>
          <ProgressChartsSection
            exerciseProgress={progressData.exerciseProgress}
            skills={skills}
          />
        </section>

        {/* Workout History */}
        <section>
          <WorkoutHistorySection history={history} />
        </section>

        {/* Max Holds */}
        <section>
          <MaxHoldsSection maxHolds={maxHolds} />
        </section>

        {/* Bottom spacer for mobile */}
        <div className="h-6" />
      </div>
    </div>
  )
}
