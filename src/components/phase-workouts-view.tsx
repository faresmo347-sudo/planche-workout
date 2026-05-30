'use client'

import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo } from 'react'
import {
  CircleDot,
  GripHorizontal,
  Timer,
  Repeat,
  ArrowDownCircle,
  ChevronDown,
  ChevronRight,
  Target,
  Clock,
  Calendar,
  Dumbbell,
  Layers,
  Zap,
  Flame,
  Leaf,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { SkillData, StageData, ProfileData } from '@/lib/types'

/* ------------------------------------------------------------------ */
/*  API fetchers                                                       */
/* ------------------------------------------------------------------ */

async function fetchSkills(): Promise<SkillData[]> {
  const res = await fetch('/api/skills')
  if (!res.ok) throw new Error('Failed to fetch skills')
  const data = await res.json()
  return data.skills
}

async function fetchProfile(): Promise<ProfileData> {
  const res = await fetch('/api/profile')
  if (!res.ok) throw new Error('Failed to fetch profile')
  const data = await res.json()
  return data.profile
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getExerciseTypeIcon(type: string) {
  switch (type) {
    case 'isometric':
      return Timer
    case 'dynamic':
      return Repeat
    case 'eccentric':
      return ArrowDownCircle
    default:
      return Dumbbell
  }
}

function getExerciseTypeLabel(type: string) {
  switch (type) {
    case 'isometric':
      return 'Hold'
    case 'dynamic':
      return 'Reps'
    case 'eccentric':
      return 'Negative'
    default:
      return type
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'skill':
      return Zap
    case 'accessory':
      return Dumbbell
    case 'core':
      return Flame
    case 'warmup':
      return Leaf
    case 'cooldown':
      return Leaf
    default:
      return Dumbbell
  }
}

function getCategoryLabel(category: string) {
  switch (category) {
    case 'skill':
      return 'Skill Work'
    case 'accessory':
      return 'Accessory'
    case 'core':
      return 'Core'
    case 'warmup':
      return 'Warm-up'
    case 'cooldown':
      return 'Cool-down'
    default:
      return category
  }
}

function getCategoryBadgeStyle(category: string): string {
  switch (category) {
    case 'skill':
      return 'bg-primary/10 text-primary border-0'
    case 'accessory':
      return 'bg-secondary text-secondary-foreground'
    case 'core':
      return 'bg-amber-50 text-amber-700 border-amber-200/60'
    case 'warmup':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
    case 'cooldown':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
    default:
      return 'bg-secondary text-secondary-foreground'
  }
}

function formatExerciseTarget(ex: StageData['exercises'][0]): string {
  if (ex.type === 'isometric') {
    const holdMin = ex.targetHoldMin ?? '?'
    const holdMax = ex.targetHoldMax ?? '?'
    return `${holdMin}-${holdMax}s hold`
  }
  if (ex.type === 'eccentric') {
    const holdMin = ex.targetHoldMin ?? '?'
    const holdMax = ex.targetHoldMax ?? '?'
    return `${holdMin}-${holdMax}s negative`
  }
  // dynamic
  const repsMin = ex.targetRepsMin ?? '?'
  const repsMax = ex.targetRepsMax ?? '?'
  return `${repsMin}-${repsMax} reps`
}

/* ------------------------------------------------------------------ */
/*  Stage timeline                                                     */
/* ------------------------------------------------------------------ */

function PhaseTimeline({
  stages,
  selectedStage,
  onSelectStage,
  currentStage,
}: {
  stages: StageData[]
  selectedStage: number
  onSelectStage: (stage: number) => void
  currentStage: number
}) {
  return (
    <div className="flex items-center justify-between w-full py-2 gap-1">
      {stages.map((stage, i) => {
        const isSelected = stage.stageNumber === selectedStage
        const isCurrent = stage.stageNumber === currentStage
        const isPast = stage.stageNumber < currentStage
        const isFuture = stage.stageNumber > currentStage

        return (
          <div key={stage.id} className="flex items-center flex-1 last:flex-none">
            {/* Stage node */}
            <button
              onClick={() => onSelectStage(stage.stageNumber)}
              className="flex flex-col items-center gap-1.5 group"
              aria-label={`View Phase ${stage.stageNumber}: ${stage.name}`}
            >
              <div className="relative flex items-center justify-center">
                {/* Past stage */}
                {isPast && (
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                        : 'bg-primary/20 text-primary'
                    }`}
                  >
                    <span className="text-xs font-bold">{stage.stageNumber}</span>
                  </div>
                )}
                {/* Current stage */}
                {isCurrent && (
                  <div className="relative">
                    <div
                      className={`absolute inset-0 rounded-full ${
                        isSelected ? 'bg-primary/30' : 'bg-primary/20'
                      } animate-ping`}
                    />
                    <div
                      className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <span className="text-xs font-bold">{stage.stageNumber}</span>
                    </div>
                  </div>
                )}
                {/* Future stage */}
                {isFuture && (
                  <div
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted-foreground/30 bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <span className="text-xs font-medium">{stage.stageNumber}</span>
                  </div>
                )}
              </div>
              <span
                className={`text-[10px] text-center leading-tight max-w-[64px] truncate transition-colors duration-200 ${
                  isSelected
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground'
                }`}
              >
                Mo {stage.startMonth}-{stage.endMonth}
              </span>
            </button>

            {/* Connector line */}
            {i < stages.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 -mt-4 transition-colors duration-300 ${
                  stage.stageNumber < currentStage
                    ? 'bg-primary/40'
                    : 'bg-border'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Exercise card                                                      */
/* ------------------------------------------------------------------ */

function ExerciseRow({ exercise, index }: { exercise: StageData['exercises'][0]; index: number }) {
  const target = formatExerciseTarget(exercise)

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/50 transition-colors group"
    >
      {/* Type icon */}
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/8 shrink-0">
        {exercise.type === 'isometric' && <Timer className="w-4 h-4 text-primary/70" />}
        {exercise.type === 'dynamic' && <Repeat className="w-4 h-4 text-primary/70" />}
        {exercise.type === 'eccentric' && <ArrowDownCircle className="w-4 h-4 text-primary/70" />}
        {!['isometric', 'dynamic', 'eccentric'].includes(exercise.type) && <Dumbbell className="w-4 h-4 text-primary/70" />}
      </div>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {exercise.name}
        </p>
        {exercise.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">
            {exercise.description}
          </p>
        )}
      </div>

      {/* Target + sets */}
      <div className="text-right shrink-0">
        <p className="text-xs font-medium text-foreground">{target}</p>
        <p className="text-[10px] text-muted-foreground">
          {exercise.targetSetsMin}-{exercise.targetSetsMax} sets
        </p>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Exercise category section                                          */
/* ------------------------------------------------------------------ */

function ExerciseCategorySection({
  category,
  exercises,
  stageNum,
}: {
  category: string
  exercises: StageData['exercises']
  stageNum: number
}) {
  const catLabel = getCategoryLabel(category)
  const badgeStyle = getCategoryBadgeStyle(category)

  if (exercises.length === 0) return null

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-1 pt-2">
        {category === 'skill' && <Zap className="w-3.5 h-3.5 text-muted-foreground" />}
        {category === 'accessory' && <Dumbbell className="w-3.5 h-3.5 text-muted-foreground" />}
        {category === 'core' && <Flame className="w-3.5 h-3.5 text-muted-foreground" />}
        {(category === 'warmup' || category === 'cooldown') && <Leaf className="w-3.5 h-3.5 text-muted-foreground" />}
        {!['skill', 'accessory', 'core', 'warmup', 'cooldown'].includes(category) && <Dumbbell className="w-3.5 h-3.5 text-muted-foreground" />}
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {catLabel}
        </span>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badgeStyle}`}>
          {exercises.length}
        </Badge>
      </div>
      <div className="space-y-0.5">
        {exercises.map((ex, i) => (
          <ExerciseRow key={ex.id} exercise={ex} index={i} />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Stage detail card                                                  */
/* ------------------------------------------------------------------ */

function StageDetailCard({
  stage,
  skillName,
  skillLabel,
  isCurrentStage,
  icon: SkillIcon,
}: {
  stage: StageData
  skillName: string
  skillLabel: string
  isCurrentStage: boolean
  icon: React.ElementType
}) {
  // Group exercises by category in the right order
  const categories = ['warmup', 'skill', 'accessory', 'core', 'cooldown'] as const
  const exercisesByCategory = categories.map((cat) => ({
    category: cat,
    exercises: stage.exercises.filter((e) => e.category === cat),
  }))

  const totalExercises = stage.exercises.length
  const durationMonths = stage.endMonth - stage.startMonth

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden">
        {/* Stage header */}
        <CardHeader className="pb-3 px-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10">
                <SkillIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  Phase {stage.stageNumber}
                </CardTitle>
                <CardDescription className="text-sm mt-0.5">
                  {stage.name}
                </CardDescription>
              </div>
            </div>
            {isCurrentStage && (
              <Badge className="bg-primary/10 text-primary border-0 text-xs shrink-0">
                Current
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-5 space-y-4">
          {/* Goal description */}
          <div className="bg-primary/5 rounded-xl p-3.5">
            <div className="flex items-start gap-2.5">
              <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-primary mb-1">Goal</p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {stage.goalDescription}
                </p>
              </div>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <Dumbbell className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm font-semibold">{totalExercises}</p>
              <p className="text-[10px] text-muted-foreground">Exercises</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm font-semibold">{durationMonths}</p>
              <p className="text-[10px] text-muted-foreground">Months</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <Clock className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm font-semibold">
                {stage.targetHoldMin ?? '—'}-{stage.targetHoldMax ?? '—'}s
              </p>
              <p className="text-[10px] text-muted-foreground">Target Hold</p>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Exercises by category */}
          <div className="space-y-1">
            {exercisesByCategory.map(({ category, exercises }) => (
              <ExerciseCategorySection
                key={category}
                category={category}
                exercises={exercises}
                stageNum={stage.stageNumber}
              />
            ))}
          </div>

          {/* Form cues hint */}
          {stage.exercises.some((e) => e.formCues && e.formCues.length > 0) && (
            <p className="text-[11px] text-muted-foreground text-center italic">
              Tap on an exercise during your workout to see form cues
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Skill phase browser                                                */
/* ------------------------------------------------------------------ */

function SkillPhaseBrowser({
  skill,
  currentStage,
  icon: SkillIcon,
}: {
  skill: SkillData
  currentStage: number
  icon: React.ElementType
}) {
  const [selectedStage, setSelectedStage] = useState(currentStage)

  const activeStage = skill.stages.find((s) => s.stageNumber === selectedStage)

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardContent className="p-4">
          <PhaseTimeline
            stages={skill.stages}
            selectedStage={selectedStage}
            onSelectStage={setSelectedStage}
            currentStage={currentStage}
          />
        </CardContent>
      </Card>

      {/* Stage detail */}
      <AnimatePresence mode="wait">
        {activeStage && (
          <StageDetailCard
            key={activeStage.id}
            stage={activeStage}
            skillName={skill.name}
            skillLabel={skill.label}
            isCurrentStage={activeStage.stageNumber === currentStage}
            icon={SkillIcon}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main PhaseWorkoutsView                                             */
/* ------------------------------------------------------------------ */

export default function PhaseWorkoutsView() {
  const { data: skills, isLoading: skillsLoading, isError: skillsError, refetch: refetchSkills } = useQuery({
    queryKey: ['skills'],
    queryFn: fetchSkills,
    retry: 2,
    placeholderData: (prev) => prev,
  })

  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    retry: 2,
    placeholderData: (prev) => prev,
  })

  const [activeSkill, setActiveSkill] = useState<'planche' | 'front_lever'>('planche')

  const plancheSkill = skills?.find((s) => s.name === 'planche')
  const flSkill = skills?.find((s) => s.name === 'front_lever')
  const currentSkill = activeSkill === 'planche' ? plancheSkill : flSkill
  const currentStageNum =
    activeSkill === 'planche'
      ? profile?.plancheStage ?? 1
      : profile?.flStage ?? 1

  const isLoading = skillsLoading || profileLoading

  /* ---- Loading skeleton ---- */
  if (isLoading) {
    return (
      <div className="space-y-5 pb-8">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
        <div className="h-10 bg-muted rounded-xl animate-pulse" />
        <div className="h-16 bg-muted rounded-2xl animate-pulse" />
        <div className="h-72 bg-muted rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!currentSkill && (skillsError || profileError)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="rounded-2xl shadow-sm max-w-sm w-full">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <Layers className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-1">Failed to load skill data</p>
            <p className="text-xs text-muted-foreground mb-4">Something went wrong. Please try again.</p>
            <Button
              onClick={() => { refetchSkills(); refetchProfile(); }}
              variant="outline"
              size="sm"
              className="rounded-xl"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentSkill) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="rounded-2xl shadow-sm max-w-sm w-full">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <Layers className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground">No skill data available</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-5 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Phase Explorer</h1>
            <p className="text-sm text-muted-foreground">
              Browse workouts for every training phase
            </p>
          </div>
        </div>
      </motion.div>

      {/* Skill tabs */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-2">
          <Button
            variant={activeSkill === 'planche' ? 'default' : 'outline'}
            className={`flex-1 rounded-xl h-11 text-sm font-medium transition-all duration-200 ${
              activeSkill === 'planche'
                ? ''
                : 'border-border/60 hover:bg-muted/60'
            }`}
            onClick={() => setActiveSkill('planche')}
          >
            <CircleDot className="w-4 h-4 mr-2" />
            Planche
          </Button>
          <Button
            variant={activeSkill === 'front_lever' ? 'default' : 'outline'}
            className={`flex-1 rounded-xl h-11 text-sm font-medium transition-all duration-200 ${
              activeSkill === 'front_lever'
                ? ''
                : 'border-border/60 hover:bg-muted/60'
            }`}
            onClick={() => setActiveSkill('front_lever')}
          >
            <GripHorizontal className="w-4 h-4 mr-2" />
            Front Lever
          </Button>
        </div>
      </motion.div>

      {/* Phase browser */}
      <motion.div variants={itemVariants}>
        <SkillPhaseBrowser
          skill={currentSkill}
          currentStage={currentStageNum}
          icon={activeSkill === 'planche' ? CircleDot : GripHorizontal}
        />
      </motion.div>

      {/* Summary cards for all stages at a glance */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-2xl shadow-sm border-border/50">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              All Phases at a Glance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2">
            {currentSkill.stages.map((stage) => {
              const isCurrent = stage.stageNumber === currentStageNum
              const exerciseCount = stage.exercises.length
              const skillExercises = stage.exercises.filter((e) => e.category === 'skill')
              const accessoryExercises = stage.exercises.filter((e) => e.category === 'accessory')

              return (
                <div
                  key={stage.id}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors ${
                    isCurrent
                      ? 'bg-primary/5 border border-primary/20'
                      : 'bg-muted/30'
                  }`}
                >
                  {/* Stage number */}
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <span className="text-xs font-bold">{stage.stageNumber}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isCurrent ? 'text-foreground' : 'text-foreground/80'}`}>
                      {stage.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        Mo {stage.startMonth}-{stage.endMonth}
                      </span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {exerciseCount} exercises
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {skillExercises.length > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
                        {skillExercises.length} skill
                      </Badge>
                    )}
                    {accessoryExercises.length > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-secondary text-secondary-foreground">
                        {accessoryExercises.length} acc
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
