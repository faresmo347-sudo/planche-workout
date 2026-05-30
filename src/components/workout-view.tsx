'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { generateWorkoutToday, saveWorkoutSession, type WorkoutSession } from '@/lib/client-data'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, RotateCcw, Check, Plus, Minus, Info,
  AlertCircle, ChevronRight, Clock, Flame, SkipForward,
  Trophy, ChevronLeft, Heart
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import type {
  ApiExercise,
  ApiWorkoutResponse,
  ApiWorkoutSections,
  SetLog,
} from '@/lib/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const SECTION_ORDER: (keyof ApiWorkoutSections)[] = [
  'warmup',
  'skill',
  'accessory',
  'core',
  'cooldown',
]

const SECTION_LABELS: Record<keyof ApiWorkoutSections, string> = {
  warmup: 'Warm-up',
  skill: 'Skill Work',
  accessory: 'Accessory Strength',
  core: 'Core',
  cooldown: 'Cool-down',
}

const SECTION_ICONS: Record<keyof ApiWorkoutSections, string> = {
  warmup: '🔥',
  skill: '🎯',
  accessory: '💪',
  core: '🧱',
  cooldown: '🧘',
}

const DAY_TYPE_LABELS: Record<string, string> = {
  planche_focus: 'Planche Focus',
  fl_focus: 'FL Focus',
  combined: 'Combined',
  rest: 'Rest Day',
}

// ─── Helper: get today's date as YYYY-MM-DD ────────────────────────────────

function getTodayString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
}

// ─── Helper: format seconds as MM:SS ────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.floor(totalSeconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// ─── CircularTimer ───────────────────────────────────────────────────────────

interface CircularTimerProps {
  progress: number // 0 to 1
  timeDisplay: string
  isActive: boolean
  isWithinTarget: boolean
  size?: number
  label?: string
}

function CircularTimer({
  progress,
  timeDisplay,
  isActive,
  isWithinTarget,
  size = 180,
  label,
}: CircularTimerProps) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(progress, 1))

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Pulse ring when active */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `2px solid ${isWithinTarget ? 'oklch(0.48 0.08 155)' : 'oklch(0.65 0.04 120)'}` }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Green glow when within target */}
      {isWithinTarget && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size - 20,
            height: size - 20,
            background: 'radial-gradient(circle, oklch(0.48 0.08 155 / 0.15) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(0.90 0.01 120)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isWithinTarget ? 'oklch(0.48 0.08 155)' : 'oklch(0.60 0.04 155)'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-light tracking-wider tabular-nums text-foreground">
          {timeDisplay}
        </span>
        {label && (
          <span className="text-xs text-muted-foreground mt-1">{label}</span>
        )}
      </div>
    </div>
  )
}

// ─── SetTracker ──────────────────────────────────────────────────────────────

interface SetTrackerProps {
  currentSet: number
  totalSets: number
  completedSets: number
}

function SetTracker({ currentSet, totalSets, completedSets }: SetTrackerProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSets }, (_, i) => {
        const setNum = i + 1
        const isCompleted = setNum <= completedSets
        const isCurrent = setNum === currentSet
        return (
          <motion.div
            key={setNum}
            className={`flex items-center justify-center rounded-full transition-all duration-300 ${
              isCompleted
                ? 'bg-primary text-primary-foreground w-7 h-7'
                : isCurrent
                  ? 'border-2 border-primary bg-primary/10 w-7 h-7'
                  : 'border border-border bg-muted w-6 h-6'
            }`}
            animate={isCompleted ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {isCompleted ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <span className={`text-xs ${isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {setNum}
              </span>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── RPEInput ────────────────────────────────────────────────────────────────

interface RPEInputProps {
  value: number
  onChange: (value: number) => void
}

function RPEInput({ value, onChange }: RPEInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">RPE</span>
        <span className="text-sm font-medium text-foreground tabular-nums">{value}/10</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={1}
        max={10}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Easy</span>
        <span>Max</span>
      </div>
    </div>
  )
}

// ─── RestTimer ───────────────────────────────────────────────────────────────

interface RestTimerProps {
  restSeconds: number
  onRestComplete: () => void
  onSkipRest: () => void
}

function RestTimer({ restSeconds, onRestComplete, onSkipRest }: RestTimerProps) {
  const [remaining, setRemaining] = useState(restSeconds)
  const [isRunning, setIsRunning] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isRunning) return

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setIsRunning(false)
          onRestComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, onRestComplete])

  const progress = 1 - remaining / restSeconds

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Rest Period</span>
        </div>
        <span className="text-2xl font-light tabular-nums text-primary">
          {formatTime(remaining)}
        </span>
      </div>
      <Progress value={progress * 100} className="h-2" />
      <Button
        variant="ghost"
        size="sm"
        onClick={onSkipRest}
        className="w-full text-muted-foreground hover:text-primary min-h-[44px]"
      >
        <SkipForward className="w-4 h-4 mr-1" />
        Skip Rest
      </Button>
    </motion.div>
  )
}

// ─── PainReportButton ────────────────────────────────────────────────────────

interface PainReportButtonProps {
  onReport: () => void
}

function PainReportButton({ onReport }: PainReportButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onReport}
      className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 min-h-[44px] gap-1"
    >
      <AlertCircle className="w-3.5 h-3.5" />
      <span className="text-xs">Pain</span>
    </Button>
  )
}

// ─── FormGuidanceSheet ───────────────────────────────────────────────────────

interface FormGuidanceSheetProps {
  exercise: ApiExercise
  open: boolean
  onOpenChange: (open: boolean) => void
}

function FormGuidanceSheet({ exercise, open, onOpenChange }: FormGuidanceSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh]">
        <SheetHeader>
          <SheetTitle className="text-lg">{exercise.name}</SheetTitle>
          <SheetDescription>
            {exercise.description || 'Focus on proper form for each rep.'}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6 space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs capitalize">
              {exercise.type}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {exercise.category}
            </Badge>
          </div>

          {exercise.formCues.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Form Cues</h4>
              <ul className="space-y-2">
                {exercise.formCues.map((cue, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="mt-1.5 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">{cue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {exercise.type === 'isometric' && (
            <div className="rounded-xl bg-primary/5 p-3">
              <p className="text-sm text-primary font-medium">
                Hold for {exercise.holdTimeMin}–{exercise.holdTimeMax}s per set
              </p>
            </div>
          )}
          {exercise.type === 'eccentric' && (
            <div className="rounded-xl bg-primary/5 p-3">
              <p className="text-sm text-primary font-medium">
                Lower slowly over {exercise.holdTimeMin}–{exercise.holdTimeMax}s
              </p>
            </div>
          )}
          {exercise.type === 'dynamic' && (
            <div className="rounded-xl bg-primary/5 p-3">
              <p className="text-sm text-primary font-medium">
                Target {exercise.targetRepsMin}–{exercise.targetRepsMax} reps per set
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── IsometricExerciseCard ───────────────────────────────────────────────────

interface IsometricExerciseCardProps {
  exercise: ApiExercise
  currentSet: number
  completedSets: number
  isComplete: boolean
  onLogSet: (data: { holdTimeSeconds: number; rpe: number; painReported: boolean; painNotes?: string }) => void
}

function IsometricExerciseCard({
  exercise,
  currentSet,
  completedSets,
  isComplete,
  onLogSet,
}: IsometricExerciseCardProps) {
  const [timerRunning, setTimerRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [holdComplete, setHoldComplete] = useState(false)
  const [achievedTime, setAchievedTime] = useState(0)
  const [rpe, setRpe] = useState(5)
  const [painReported, setPainReported] = useState(false)
  const [showFormGuide, setShowFormGuide] = useState(false)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const targetMin = exercise.holdTimeMin ?? 5
  const targetMax = exercise.holdTimeMax ?? 10
  const totalSets = exercise.targetSetsMax

  // Timer logic
  useEffect(() => {
    if (!timerRunning) return

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev >= targetMax) {
          // Auto-stop at target max
          setTimerRunning(false)
          setHoldComplete(true)
          setAchievedTime(targetMax)
          return targetMax
        }
        return prev + 0.1
      })
    }, 100)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerRunning, targetMax])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const handleStartHold = () => {
    setTimerRunning(true)
    setElapsed(0)
    setHoldComplete(false)
    setAchievedTime(0)
    setPainReported(false)
  }

  const handleStopHold = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTimerRunning(false)
    const time = Math.round(elapsed * 10) / 10
    setAchievedTime(time)
    setHoldComplete(true)
  }

  const handleLogSet = () => {
    onLogSet({
      holdTimeSeconds: achievedTime,
      rpe,
      painReported,
      painNotes: painReported ? 'Pain reported during hold' : undefined,
    })
    // Reset state for next set
    setElapsed(0)
    setHoldComplete(false)
    setAchievedTime(0)
    setRpe(5)
    setPainReported(false)
    // Show rest timer if more sets remain and rest time is non-zero
    if (currentSet < totalSets && exercise.restSeconds > 0) {
      setShowRestTimer(true)
    }
  }

  const handleRestComplete = () => {
    setShowRestTimer(false)
  }

  const handleSkipRest = () => {
    setShowRestTimer(false)
  }

  const progress = targetMax > 0 ? elapsed / targetMax : 0
  const isWithinTarget = elapsed >= targetMin && elapsed <= targetMax

  return (
    <>
      <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">{exercise.name}</CardTitle>
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {exercise.type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Target: {targetMin}–{targetMax}s hold
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFormGuide(true)}
              className="w-10 h-10 shrink-0"
            >
              <Info className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Set Tracker */}
          <SetTracker
            currentSet={currentSet}
            totalSets={totalSets}
            completedSets={completedSets}
          />

          {/* Timer Area */}
          {!isComplete && (
            <div className="flex flex-col items-center py-2">
              <CircularTimer
                progress={progress}
                timeDisplay={formatTime(Math.floor(elapsed))}
                isActive={timerRunning}
                isWithinTarget={isWithinTarget}
                label={timerRunning ? 'Holding...' : holdComplete ? 'Complete!' : 'Ready'}
              />

              {/* Timer Controls */}
              <div className="flex items-center gap-3 mt-4">
                {!timerRunning && !holdComplete && (
                  <Button
                    onClick={handleStartHold}
                    className="min-h-[48px] min-w-[140px] rounded-xl text-base"
                    size="lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Hold
                  </Button>
                )}
                {timerRunning && (
                  <Button
                    onClick={handleStopHold}
                    variant="outline"
                    className="min-h-[48px] min-w-[140px] rounded-xl text-base border-primary text-primary"
                    size="lg"
                  >
                    <Pause className="w-5 h-5 mr-2" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Hold Complete - Log Set */}
          <AnimatePresence>
            {holdComplete && !isComplete && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="rounded-xl bg-primary/5 p-3 text-center">
                  <p className="text-sm text-muted-foreground">Time achieved</p>
                  <p className="text-2xl font-semibold text-primary tabular-nums">
                    {achievedTime.toFixed(1)}s
                  </p>
                  {achievedTime >= targetMin && (
                    <Badge className="mt-1 text-[10px]" variant="default">
                      <Check className="w-3 h-3 mr-0.5" /> Target reached
                    </Badge>
                  )}
                </div>

                <RPEInput value={rpe} onChange={setRpe} />

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleLogSet}
                    className="flex-1 min-h-[48px] rounded-xl"
                    size="lg"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Log Set
                  </Button>
                  <PainReportButton onReport={() => setPainReported(!painReported)} />
                </div>
                {painReported && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-destructive"
                  >
                    Pain reported for this set. Consider adjusting form.
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Exercise Complete */}
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl bg-primary/5 p-3 text-center"
            >
              <Check className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-sm font-medium text-primary">All sets complete</p>
            </motion.div>
          )}

          {/* Rest Timer */}
          <AnimatePresence>
            {showRestTimer && (
              <RestTimer
                restSeconds={exercise.restSeconds}
                onRestComplete={handleRestComplete}
                onSkipRest={handleSkipRest}
              />
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <FormGuidanceSheet
        exercise={exercise}
        open={showFormGuide}
        onOpenChange={setShowFormGuide}
      />
    </>
  )
}

// ─── DynamicExerciseCard ─────────────────────────────────────────────────────

interface DynamicExerciseCardProps {
  exercise: ApiExercise
  currentSet: number
  completedSets: number
  isComplete: boolean
  onLogSet: (data: { reps: number; weightKg?: number; rpe: number; painReported: boolean; painNotes?: string }) => void
}

function DynamicExerciseCard({
  exercise,
  currentSet,
  completedSets,
  isComplete,
  onLogSet,
}: DynamicExerciseCardProps) {
  const targetMin = exercise.targetRepsMin ?? 6
  const targetMax = exercise.targetRepsMax ?? 12
  const totalSets = exercise.targetSetsMax
  const [reps, setReps] = useState(targetMin)
  const [weight, setWeight] = useState<number | null>(null)
  const [rpe, setRpe] = useState(5)
  const [painReported, setPainReported] = useState(false)
  const [showFormGuide, setShowFormGuide] = useState(false)
  const [showRestTimer, setShowRestTimer] = useState(false)

  const handleLogSet = () => {
    onLogSet({
      reps,
      weightKg: weight ?? undefined,
      rpe,
      painReported,
      painNotes: painReported ? 'Pain reported during reps' : undefined,
    })
    // Reset for next set
    setReps(targetMin)
    setWeight(null)
    setRpe(5)
    setPainReported(false)
    // Show rest timer if more sets remain and rest time is non-zero
    if (currentSet < totalSets && exercise.restSeconds > 0) {
      setShowRestTimer(true)
    }
  }

  const handleRestComplete = () => {
    setShowRestTimer(false)
  }

  const handleSkipRest = () => {
    setShowRestTimer(false)
  }

  return (
    <>
      <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">{exercise.name}</CardTitle>
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {exercise.type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Target: {targetMin}–{targetMax} reps
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFormGuide(true)}
              className="w-10 h-10 shrink-0"
            >
              <Info className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Set Tracker */}
          <SetTracker
            currentSet={currentSet}
            totalSets={totalSets}
            completedSets={completedSets}
          />

          {/* Rep Counter */}
          {!isComplete && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setReps(Math.max(0, reps - 1))}
                  className="w-14 h-14 rounded-2xl border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Minus className="w-6 h-6" />
                </Button>

                <div className="flex flex-col items-center w-20">
                  <span className="text-4xl font-light tabular-nums text-foreground">
                    {reps}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">reps</span>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setReps(reps + 1)}
                  className="w-14 h-14 rounded-2xl border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Plus className="w-6 h-6" />
                </Button>
              </div>

              {/* Target range indicator */}
              <div className="text-center">
                {reps >= targetMin && reps <= targetMax ? (
                  <Badge variant="default" className="text-[10px]">
                    <Check className="w-3 h-3 mr-0.5" /> In target range
                  </Badge>
                ) : reps < targetMin ? (
                  <span className="text-xs text-muted-foreground">
                    Add {targetMin - reps} more to reach target
                  </span>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    Above target
                  </Badge>
                )}
              </div>

              {/* Weight input (optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Weight (optional)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setWeight(Math.max(0, (weight ?? 0) - 2.5))}
                    className="w-10 h-10 rounded-xl"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 text-center">
                    <span className="text-lg tabular-nums font-light">
                      {weight !== null ? `${weight}` : '—'}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">kg</span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setWeight((weight ?? 0) + 2.5)}
                    className="w-10 h-10 rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* RPE */}
              <RPEInput value={rpe} onChange={setRpe} />

              {/* Log Set Button + Pain */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleLogSet}
                  className="flex-1 min-h-[48px] rounded-xl"
                  size="lg"
                  disabled={reps === 0}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Log Set {currentSet}
                </Button>
                <PainReportButton onReport={() => setPainReported(!painReported)} />
              </div>
              {painReported && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-destructive"
                >
                  Pain reported for this set. Consider adjusting form.
                </motion.p>
              )}
            </div>
          )}

          {/* Exercise Complete */}
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl bg-primary/5 p-3 text-center"
            >
              <Check className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-sm font-medium text-primary">All sets complete</p>
            </motion.div>
          )}

          {/* Rest Timer */}
          <AnimatePresence>
            {showRestTimer && (
              <RestTimer
                restSeconds={exercise.restSeconds}
                onRestComplete={handleRestComplete}
                onSkipRest={handleSkipRest}
              />
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <FormGuidanceSheet
        exercise={exercise}
        open={showFormGuide}
        onOpenChange={setShowFormGuide}
      />
    </>
  )
}

// ─── EccentricExerciseCard ───────────────────────────────────────────────────

interface EccentricExerciseCardProps {
  exercise: ApiExercise
  currentSet: number
  completedSets: number
  isComplete: boolean
  onLogSet: (data: { holdTimeSeconds: number; rpe: number; painReported: boolean; painNotes?: string }) => void
}

function EccentricExerciseCard({
  exercise,
  currentSet,
  completedSets,
  isComplete,
  onLogSet,
}: EccentricExerciseCardProps) {
  const [timerRunning, setTimerRunning] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [holdComplete, setHoldComplete] = useState(false)
  const [achievedTime, setAchievedTime] = useState(0)
  const [rpe, setRpe] = useState(5)
  const [painReported, setPainReported] = useState(false)
  const [showFormGuide, setShowFormGuide] = useState(false)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const targetMin = exercise.holdTimeMin ?? 5
  const targetMax = exercise.holdTimeMax ?? 10
  const totalSets = exercise.targetSetsMax

  // Timer logic — countdown
  useEffect(() => {
    if (!timerRunning) return

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 0.1) {
          setTimerRunning(false)
          setHoldComplete(true)
          setAchievedTime(targetMax)
          return 0
        }
        return Math.max(0, prev - 0.1)
      })
    }, 100)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerRunning, targetMax])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const handleStartEccentric = () => {
    setRemaining(targetMax)
    setTimerRunning(true)
    setHoldComplete(false)
    setAchievedTime(0)
    setPainReported(false)
  }

  const handleStopEccentric = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTimerRunning(false)
    const time = Math.round((targetMax - remaining) * 10) / 10
    setAchievedTime(time)
    setHoldComplete(true)
  }

  const handleLogSet = () => {
    onLogSet({
      holdTimeSeconds: achievedTime,
      rpe,
      painReported,
      painNotes: painReported ? 'Pain reported during eccentric' : undefined,
    })
    setRemaining(0)
    setHoldComplete(false)
    setAchievedTime(0)
    setRpe(5)
    setPainReported(false)
    if (currentSet < totalSets && exercise.restSeconds > 0) {
      setShowRestTimer(true)
    }
  }

  const handleRestComplete = () => {
    setShowRestTimer(false)
  }

  const handleSkipRest = () => {
    setShowRestTimer(false)
  }

  const progress = targetMax > 0 ? (targetMax - remaining) / targetMax : 0
  const isWithinTarget = remaining <= targetMax - targetMin && remaining > 0

  return (
    <>
      <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">{exercise.name}</CardTitle>
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {exercise.type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Target: {targetMin}–{targetMax}s negative
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFormGuide(true)}
              className="w-10 h-10 shrink-0"
            >
              <Info className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Set Tracker */}
          <SetTracker
            currentSet={currentSet}
            totalSets={totalSets}
            completedSets={completedSets}
          />

          {/* Instruction */}
          {!isComplete && (
            <div className="rounded-xl bg-accent/50 p-3 text-center">
              <p className="text-sm text-accent-foreground font-medium">
                ↓ Lower slowly
              </p>
            </div>
          )}

          {/* Timer Area */}
          {!isComplete && (
            <div className="flex flex-col items-center py-2">
              <CircularTimer
                progress={progress}
                timeDisplay={formatTime(Math.floor(remaining))}
                isActive={timerRunning}
                isWithinTarget={isWithinTarget}
                label={timerRunning ? 'Lowering...' : holdComplete ? 'Complete!' : 'Ready'}
              />

              {/* Timer Controls */}
              <div className="flex items-center gap-3 mt-4">
                {!timerRunning && !holdComplete && (
                  <Button
                    onClick={handleStartEccentric}
                    className="min-h-[48px] min-w-[160px] rounded-xl text-base"
                    size="lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Negative
                  </Button>
                )}
                {timerRunning && (
                  <Button
                    onClick={handleStopEccentric}
                    variant="outline"
                    className="min-h-[48px] min-w-[140px] rounded-xl text-base border-primary text-primary"
                    size="lg"
                  >
                    <Pause className="w-5 h-5 mr-2" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Eccentric Complete - Log Set */}
          <AnimatePresence>
            {holdComplete && !isComplete && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="rounded-xl bg-primary/5 p-3 text-center">
                  <p className="text-sm text-muted-foreground">Time achieved</p>
                  <p className="text-2xl font-semibold text-primary tabular-nums">
                    {achievedTime.toFixed(1)}s
                  </p>
                  {achievedTime >= targetMin && (
                    <Badge className="mt-1 text-[10px]" variant="default">
                      <Check className="w-3 h-3 mr-0.5" /> Target reached
                    </Badge>
                  )}
                </div>

                <RPEInput value={rpe} onChange={setRpe} />

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleLogSet}
                    className="flex-1 min-h-[48px] rounded-xl"
                    size="lg"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Log Set
                  </Button>
                  <PainReportButton onReport={() => setPainReported(!painReported)} />
                </div>
                {painReported && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-destructive"
                  >
                    Pain reported for this set. Consider adjusting form.
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Exercise Complete */}
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl bg-primary/5 p-3 text-center"
            >
              <Check className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-sm font-medium text-primary">All sets complete</p>
            </motion.div>
          )}

          {/* Rest Timer */}
          <AnimatePresence>
            {showRestTimer && (
              <RestTimer
                restSeconds={exercise.restSeconds}
                onRestComplete={handleRestComplete}
                onSkipRest={handleSkipRest}
              />
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <FormGuidanceSheet
        exercise={exercise}
        open={showFormGuide}
        onOpenChange={setShowFormGuide}
      />
    </>
  )
}

// ─── SectionHeader ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  name: string
  icon: string
  exerciseCount: number
  completedCount: number
  isCurrent: boolean
}

function SectionHeader({ name, icon, exerciseCount, completedCount, isCurrent }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between py-2 ${isCurrent ? 'opacity-100' : 'opacity-60'}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {name}
        </h3>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground tabular-nums">
          {completedCount}/{exerciseCount}
        </span>
        {completedCount === exerciseCount && exerciseCount > 0 && (
          <Check className="w-3.5 h-3.5 text-primary" />
        )}
      </div>
    </div>
  )
}

// ─── CompletionScreen ────────────────────────────────────────────────────────

interface CompletionScreenProps {
  workout: ApiWorkoutResponse
  exerciseStates: Record<string, ExerciseState>
  onBackToHome: () => void
}

function CompletionScreen({ workout, exerciseStates, onBackToHome }: CompletionScreenProps) {
  // Calculate workout summary stats
  const completedExercises = SECTION_ORDER.flatMap((key) => workout.sections[key]).filter(
    (ex) => exerciseStates[ex.id]?.isComplete
  )
  const totalSets = Object.values(exerciseStates).reduce(
    (sum, state) => sum + state.completedSets,
    0
  )

  // Estimate total workout time from logged sets
  const estimatedMinutes = (() => {
    let seconds = 0
    // Add hold times from isometric/eccentric sets
    for (const state of Object.values(exerciseStates)) {
      for (const set of state.sets) {
        if (set.holdTimeSeconds) seconds += set.holdTimeSeconds
        // Estimate ~3s per rep for dynamic exercises
        if (set.reps) seconds += set.reps * 3
      }
    }
    // Add rest periods between sets (approx 90s per set)
    seconds += totalSets * 90
    // Add warmup/cooldown buffer
    if (workout.sections.warmup.length > 0) seconds += 600
    if (workout.sections.cooldown.length > 0) seconds += 480
    return Math.max(1, Math.round(seconds / 60))
  })()

  // Calculate weekly progress (workouts this week from logged sets)
  const focusLabel = workout.focusSkill === 'planche' ? 'Planche' : 'Front Lever'
  const stageLabel = workout.stageName || `Stage ${workout.focusStage ?? 1}`

  // Build exercise list grouped by section
  const exerciseSummary = SECTION_ORDER
    .filter((key) => workout.sections[key].length > 0)
    .map((key) => ({
      sectionKey: key,
      label: SECTION_LABELS[key],
      icon: SECTION_ICONS[key],
      exercises: workout.sections[key].map((ex) => ({
        name: ex.name,
        type: ex.type,
        completedSets: exerciseStates[ex.id]?.completedSets ?? 0,
        totalSets: ex.targetSetsMax,
        isComplete: exerciseStates[ex.id]?.isComplete ?? false,
        bestHold: exerciseStates[ex.id]?.sets.reduce(
          (max, s) => Math.max(max, s.holdTimeSeconds ?? 0),
          0
        ),
        bestReps: exerciseStates[ex.id]?.sets.reduce(
          (max, s) => Math.max(max, s.reps ?? 0),
          0
        ),
      })),
    }))

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md mx-auto space-y-6 py-6"
    >
      {/* ─── Celebration Header ──────────────────────── */}
      <div className="flex flex-col items-center text-center space-y-3">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 0.6, repeat: 2 }}
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <Trophy className="w-10 h-10 text-primary" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-semibold text-foreground"
        >
          Workout Complete!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground text-sm max-w-xs"
        >
          Great job finishing your session. Rest up and come back stronger next time.
        </motion.p>
      </div>

      {/* ─── Quick Stats Row ──────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-3 gap-3"
      >
        <Card className="rounded-xl shadow-sm bg-card">
          <CardContent className="p-3 flex flex-col items-center text-center">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 mb-1.5">
              <Flame className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-lg font-semibold leading-none">
              {completedExercises.length}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">
              Exercises
            </span>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm bg-card">
          <CardContent className="p-3 flex flex-col items-center text-center">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 mb-1.5">
              <Check className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-lg font-semibold leading-none">
              {totalSets}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">
              Sets
            </span>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm bg-card">
          <CardContent className="p-3 flex flex-col items-center text-center">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-lg font-semibold leading-none">
              ~{estimatedMinutes}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">
              Minutes
            </span>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Exercise Summary ──────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="rounded-2xl shadow-sm bg-card">
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-base">Exercise Summary</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {exerciseSummary.map((section) => (
                <div key={section.sectionKey}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">
                    {section.icon} {section.label}
                  </p>
                  <div className="space-y-1">
                    {section.exercises.map((ex, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                              ex.isComplete
                                ? 'bg-primary text-primary-foreground'
                                : 'border border-border'
                            }`}
                          >
                            {ex.isComplete && <Check className="w-2.5 h-2.5" />}
                          </div>
                          <span className="text-sm truncate">{ex.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {ex.bestHold > 0 && (
                            <span className="text-[10px] text-primary font-medium tabular-nums">
                              {ex.bestHold.toFixed(1)}s
                            </span>
                          )}
                          {ex.bestReps > 0 && (
                            <span className="text-[10px] text-primary font-medium tabular-nums">
                              {ex.bestReps} reps
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {ex.completedSets}/{ex.totalSets}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Progress Toward Next Phase ──────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="rounded-2xl shadow-sm bg-card">
          <CardHeader className="pb-2 px-5 pt-5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
                <ChevronRight className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Progress</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Week {workout.weekNumber} &middot; {DAY_TYPE_LABELS[workout.dayType] || workout.dayType}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Focus</span>
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                {focusLabel} &middot; {stageLabel}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Today&apos;s Session</span>
              <span className="text-sm font-medium text-primary">Completed</span>
            </div>
            {workout.isDeload && (
              <div className="rounded-xl bg-primary/5 p-2.5 text-center">
                <p className="text-xs text-primary font-medium">Deload Week — Recovery is progress</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Keep showing up consistently. Each session builds toward your next stage advancement.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Back to Home Button ──────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="pt-2"
      >
        <Button
          onClick={onBackToHome}
          className="w-full min-h-[52px] rounded-xl text-base font-medium"
          size="lg"
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Back to Home
        </Button>
      </motion.div>

      {/* ─── Animated Heart ──────────────────────── */}
      <motion.div
        className="flex justify-center pt-1"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Heart className="w-5 h-5 text-primary" />
      </motion.div>
    </motion.div>
  )
}

// ─── ExerciseCard (wrapper) ──────────────────────────────────────────────────

interface ExerciseCardWrapperProps {
  exercise: ApiExercise
  currentSet: number
  completedSets: number
  isComplete: boolean
  onLogSet: (data: Record<string, unknown>) => void
  exerciseIndex: number
  totalExercises: number
}

function ExerciseCardWrapper({
  exercise,
  currentSet,
  completedSets,
  isComplete,
  onLogSet,
  exerciseIndex,
  totalExercises,
}: ExerciseCardWrapperProps) {
  if (exercise.type === 'isometric') {
    return (
      <>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs text-muted-foreground tabular-nums">
            Exercise {exerciseIndex + 1} / {totalExercises}
          </span>
        </div>
        <IsometricExerciseCard
          exercise={exercise}
          currentSet={currentSet}
          completedSets={completedSets}
          isComplete={isComplete}
          onLogSet={(data) => onLogSet(data)}
        />
      </>
    )
  }

  if (exercise.type === 'eccentric') {
    return (
      <>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs text-muted-foreground tabular-nums">
            Exercise {exerciseIndex + 1} / {totalExercises}
          </span>
        </div>
        <EccentricExerciseCard
          exercise={exercise}
          currentSet={currentSet}
          completedSets={completedSets}
          isComplete={isComplete}
          onLogSet={(data) => onLogSet(data)}
        />
      </>
    )
  }

  // Dynamic (default)
  return (
    <>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs text-muted-foreground tabular-nums">
          Exercise {exerciseIndex + 1} / {totalExercises}
        </span>
      </div>
      <DynamicExerciseCard
        exercise={exercise}
        currentSet={currentSet}
        completedSets={completedSets}
        isComplete={isComplete}
        onLogSet={(data) => onLogSet(data)}
      />
    </>
  )
}

// ─── Main WorkoutView Component ──────────────────────────────────────────────

interface ExerciseState {
  currentSet: number
  completedSets: number
  isComplete: boolean
  sets: SetLog[]
}

const WORKOUT_PROGRESS_KEY = 'workout-progress'

interface WorkoutViewProps {
  setActiveTab?: (tab: string) => void
  onWorkoutLogged?: () => void
}

export default function WorkoutView({ setActiveTab, onWorkoutLogged }: WorkoutViewProps) {
  const [workout, setWorkout] = useState<ApiWorkoutResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exerciseStates, setExerciseStates] = useState<Record<string, ExerciseState>>({})
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [workoutComplete, setWorkoutComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Load workout data from client-side store
  useEffect(() => {
    try {
      setLoading(true)
      setError(null)
      const data: ApiWorkoutResponse = generateWorkoutToday()
      setWorkout(data)

      // Initialize exercise states
      const states: Record<string, ExerciseState> = {}
      for (const sectionKey of SECTION_ORDER) {
        const exercises = data.sections[sectionKey]
        for (const ex of exercises) {
          states[ex.id] = {
            currentSet: 1,
            completedSets: 0,
            isComplete: false,
            sets: [],
          }
        }
      }

      // Restore from localStorage if available and valid
      try {
        const savedRaw = localStorage.getItem(WORKOUT_PROGRESS_KEY)
        if (savedRaw) {
          const saved = JSON.parse(savedRaw) as {
            date: string
            dayType: string
            exerciseStates: Record<string, ExerciseState>
            currentSectionIndex: number
            currentExerciseIndex: number
          }
          const today = getTodayString()
          // Only restore if date matches today and dayType matches
          if (saved.date === today && saved.dayType === data.dayType) {
            // Merge saved states into initialized states
            for (const exId of Object.keys(saved.exerciseStates)) {
              if (exId in states) {
                states[exId] = saved.exerciseStates[exId]
              }
            }
            setCurrentSectionIndex(saved.currentSectionIndex)
            setCurrentExerciseIndex(saved.currentExerciseIndex)
          } else {
            // Stale data — clear it
            localStorage.removeItem(WORKOUT_PROGRESS_KEY)
          }
        }
      } catch {
        // If localStorage parsing fails, just start fresh
        localStorage.removeItem(WORKOUT_PROGRESS_KEY)
      }

      setExerciseStates(states)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workout')
    } finally {
      setLoading(false)
    }
  }, [])

  // Persist exercise states and navigation to localStorage
  useEffect(() => {
    if (!workout || Object.keys(exerciseStates).length === 0) return

    const data = {
      date: getTodayString(),
      dayType: workout.dayType,
      exerciseStates,
      currentSectionIndex,
      currentExerciseIndex,
    }
    localStorage.setItem(WORKOUT_PROGRESS_KEY, JSON.stringify(data))
  }, [exerciseStates, currentSectionIndex, currentExerciseIndex, workout])

  // Get all exercises as a flat list with section info
  const allExercisesWithSection = React.useMemo(() => {
    if (!workout) return []
    const result: { exercise: ApiExercise; sectionKey: keyof ApiWorkoutSections }[] = []
    for (const sectionKey of SECTION_ORDER) {
      for (const ex of workout.sections[sectionKey]) {
        result.push({ exercise: ex, sectionKey })
      }
    }
    return result
  }, [workout])

  // Get current section and exercise
  const currentSectionKey = SECTION_ORDER[currentSectionIndex] as keyof ApiWorkoutSections | undefined
  const currentSectionExercises = currentSectionKey && workout ? workout.sections[currentSectionKey] : []
  const currentExercise = currentSectionExercises[currentExerciseIndex]

  // Calculate completed exercises per section
  const getSectionProgress = useCallback(
    (sectionKey: keyof ApiWorkoutSections) => {
      if (!workout) return { total: 0, completed: 0 }
      const exercises = workout.sections[sectionKey]
      const completed = exercises.filter(
        (ex) => exerciseStates[ex.id]?.isComplete
      ).length
      return { total: exercises.length, completed }
    },
    [workout, exerciseStates]
  )

  // Check if all exercises are complete
  const allExercisesComplete = React.useMemo(() => {
    return allExercisesWithSection.every(
      ({ exercise }) => exerciseStates[exercise.id]?.isComplete
    )
  }, [allExercisesWithSection, exerciseStates])

  // Check if user has logged at least 1 set (for enabling Complete Workout button)
  const hasLoggedAnySet = React.useMemo(() => {
    return Object.values(exerciseStates).some(
      (state) => state.completedSets > 0
    )
  }, [exerciseStates])

  // Navigate to next exercise
  const navigateToNextExercise = useCallback(() => {
    if (!workout) return

    const sections = SECTION_ORDER.filter(
      (key) => workout.sections[key].length > 0
    )

    // Find next exercise in current section
    if (currentExerciseIndex < currentSectionExercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1)
      return
    }

    // Move to next section
    const currentSectionOrderIndex = sections.indexOf(currentSectionKey as keyof ApiWorkoutSections)
    if (currentSectionOrderIndex < sections.length - 1) {
      const nextSectionKey = sections[currentSectionOrderIndex + 1]
      setCurrentSectionIndex(SECTION_ORDER.indexOf(nextSectionKey))
      setCurrentExerciseIndex(0)
    }
  }, [workout, currentSectionIndex, currentExerciseIndex, currentSectionExercises, currentSectionKey])

  // Navigate to previous exercise
  const navigateToPrevExercise = useCallback(() => {
    if (!workout) return

    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1)
      return
    }

    // Move to previous section
    const sections = SECTION_ORDER.filter(
      (key) => workout.sections[key].length > 0
    )
    const currentSectionOrderIndex = sections.indexOf(currentSectionKey as keyof ApiWorkoutSections)
    if (currentSectionOrderIndex > 0) {
      const prevSectionKey = sections[currentSectionOrderIndex - 1]
      setCurrentSectionIndex(SECTION_ORDER.indexOf(prevSectionKey))
      setCurrentExerciseIndex(workout.sections[prevSectionKey].length - 1)
    }
  }, [workout, currentSectionIndex, currentExerciseIndex, currentSectionKey])

  // Ref to track exercise completion for auto-navigation without stale closure
  const exerciseJustCompletedRef = useRef<string | null>(null)

  // Handle logging a set
  const handleLogSet = useCallback(
    (exerciseId: string, data: Record<string, unknown>) => {
      if (!workout) return

      const exercise = allExercisesWithSection.find(
        (e) => e.exercise.id === exerciseId
      )?.exercise
      if (!exercise) return

      const totalSets = exercise.targetSetsMax

      setExerciseStates((prev) => {
        const current = prev[exerciseId] || {
          currentSet: 1,
          completedSets: 0,
          isComplete: false,
          sets: [],
        }

        const newSet: SetLog = {
          exerciseId,
          setNumber: current.currentSet,
          holdTimeSeconds: (data.holdTimeSeconds as number) || undefined,
          reps: (data.reps as number) || undefined,
          weightKg: (data.weightKg as number) || undefined,
          rpe: (data.rpe as number) || undefined,
          painReported: (data.painReported as boolean) || false,
          painNotes: (data.painNotes as string) || undefined,
        }

        const newCompletedSets = current.completedSets + 1
        const isNowComplete = newCompletedSets >= totalSets

        // Set ref for auto-navigation (avoids stale closure)
        if (isNowComplete) {
          exerciseJustCompletedRef.current = exerciseId
        }

        return {
          ...prev,
          [exerciseId]: {
            currentSet: Math.min(current.currentSet + 1, totalSets),
            completedSets: newCompletedSets,
            isComplete: isNowComplete,
            sets: [...current.sets, newSet],
          },
        }
      })
    },
    [workout, allExercisesWithSection]
  )

  // Effect to handle auto-navigation when an exercise is completed
  useEffect(() => {
    if (exerciseJustCompletedRef.current) {
      const id = exerciseJustCompletedRef.current
      exerciseJustCompletedRef.current = null
      // Delay navigation slightly for visual feedback
      setTimeout(() => navigateToNextExercise(), 500)
    }
  }, [exerciseStates, navigateToNextExercise])

  // Handle Complete Workout
  const handleCompleteWorkout = useCallback(async () => {
    if (!workout) return

    setSubmitting(true)
    setSaveError(null)
    try {
      // Flatten all logged sets
      const allLoggedSets: SetLog[] = []
      for (const sectionKey of SECTION_ORDER) {
        for (const ex of workout.sections[sectionKey]) {
          const state = exerciseStates[ex.id]
          if (state) {
            allLoggedSets.push(...state.sets)
          }
        }
      }

      // Build session object from logged sets
      const session: WorkoutSession = {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        date: new Date().toISOString(),
        dayType: workout.dayType,
        weekNumber: workout.weekNumber,
        isDeload: workout.isDeload,
        completed: true,
        notes: null,
        exercises: allLoggedSets.map((set) => ({
          exerciseId: set.exerciseId,
          exerciseName: allExercisesWithSection.find(e => e.exercise.id === set.exerciseId)?.exercise.name ?? set.exerciseId,
          type: allExercisesWithSection.find(e => e.exercise.id === set.exerciseId)?.exercise.type ?? 'dynamic',
          category: allExercisesWithSection.find(e => e.exercise.id === set.exerciseId)?.exercise.category ?? 'accessory',
          setNumber: set.setNumber,
          holdTimeSeconds: set.holdTimeSeconds ?? null,
          reps: set.reps ?? null,
          weightKg: set.weightKg ?? null,
          rpe: set.rpe ?? null,
          painReported: set.painReported ?? false,
          painNotes: set.painNotes ?? null,
        })),
      }

      saveWorkoutSession(session)

      // Clear saved progress from localStorage
      localStorage.removeItem(WORKOUT_PROGRESS_KEY)

      setWorkoutComplete(true)

      // Notify parent that workout was logged
      onWorkoutLogged?.()
    } catch (err) {
      // Don't use setError here — that would wipe the workout view
      setSaveError(err instanceof Error ? err.message : 'Failed to save workout. Your data is saved locally — try again.')
    } finally {
      setSubmitting(false)
    }
  }, [workout, exerciseStates, allExercisesWithSection, onWorkoutLogged])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full"
          />
          <p className="text-sm text-muted-foreground">Loading your workout...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-sm w-full rounded-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-2">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => {
            setError(null)
            setLoading(true)
            try {
              const data: ApiWorkoutResponse = generateWorkoutToday()
              setWorkout(data)
              const states: Record<string, ExerciseState> = {}
              for (const sectionKey of SECTION_ORDER) {
                for (const ex of data.sections[sectionKey]) {
                  states[ex.id] = { currentSet: 1, completedSets: 0, isComplete: false, sets: [] }
                }
              }
              setExerciseStates(states)
              setCurrentSectionIndex(0)
              setCurrentExerciseIndex(0)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to load workout')
            } finally {
              setLoading(false)
            }
          }} className="min-h-[44px]">
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  // Rest day - no longer used since we switched to session-based workouts,
  // but keep for backward compatibility just in case
  if (workout?.dayType === 'rest') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-sm w-full rounded-2xl p-6 text-center">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
          >
            <Heart className="w-8 h-8 text-primary" />
          </motion.div>
          <h3 className="font-semibold text-xl mb-2">Rest Day</h3>
          <p className="text-sm text-muted-foreground mb-1">
            {workout.dayName}
          </p>
          <p className="text-sm text-muted-foreground">
            {workout.message || 'Focus on recovery today.'}
          </p>
        </Card>
      </div>
    )
  }

  if (!workout) return null

  // Completion screen
  if (workoutComplete && workout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <CompletionScreen
          workout={workout}
          exerciseStates={exerciseStates}
          onBackToHome={() => setActiveTab?.('dashboard')}
        />
      </div>
    )
  }

  // Section progress indicators
  const sectionIndicators = SECTION_ORDER.filter(
    (key) => workout.sections[key].length > 0
  )

  // Overall progress
  const totalExercises = allExercisesWithSection.length
  const completedExercises = allExercisesWithSection.filter(
    ({ exercise }) => exerciseStates[exercise.id]?.isComplete
  ).length
  const overallProgress = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 space-y-2">
          {/* Top row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="text-xs capitalize">
                <Flame className="w-3 h-3 mr-1" />
                {DAY_TYPE_LABELS[workout.dayType] || workout.dayType}
              </Badge>
              {workout.isDeload && (
                <Badge variant="secondary" className="text-xs">
                  Deload Week
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              Week {workout.weekNumber}
            </span>
          </div>

          {/* Section tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {sectionIndicators.map((sectionKey, idx) => {
              const progress = getSectionProgress(sectionKey)
              const isActive = sectionKey === currentSectionKey
              return (
                <button
                  key={sectionKey}
                  onClick={() => {
                    setCurrentSectionIndex(SECTION_ORDER.indexOf(sectionKey))
                    setCurrentExerciseIndex(0)
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-all shrink-0 min-h-[32px] ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span>{SECTION_ICONS[sectionKey]}</span>
                  <span>{SECTION_LABELS[sectionKey]}</span>
                  {progress.completed === progress.total && progress.total > 0 && (
                    <Check className="w-3 h-3 text-primary" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Overall progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Overall Progress</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {completedExercises}/{totalExercises}
              </span>
            </div>
            <Progress value={overallProgress} className="h-1.5" />
          </div>
        </div>
      </header>

      {/* ─── Main Content ────────────────────────────────────────── */}
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Section Header */}
        {currentSectionKey && (
          <SectionHeader
            name={SECTION_LABELS[currentSectionKey]}
            icon={SECTION_ICONS[currentSectionKey]}
            exerciseCount={currentSectionExercises.length}
            completedCount={getSectionProgress(currentSectionKey).completed}
            isCurrent={true}
          />
        )}

        {/* Exercise Navigation Dots */}
        {currentSectionExercises.length > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            {currentSectionExercises.map((ex, idx) => {
              const isComplete = exerciseStates[ex.id]?.isComplete
              const isCurrent = idx === currentExerciseIndex
              return (
                <button
                  key={ex.id}
                  onClick={() => setCurrentExerciseIndex(idx)}
                  className={`rounded-full transition-all ${
                    isCurrent
                      ? 'w-6 h-2 bg-primary'
                      : isComplete
                        ? 'w-2 h-2 bg-primary/50'
                        : 'w-2 h-2 bg-muted-foreground/30'
                  }`}
                />
              )
            })}
          </div>
        )}

        {/* Exercise Card with Navigation */}
        <div className="relative">
          <AnimatePresence mode="wait">
            {currentExercise && (
              <motion.div
                key={currentExercise.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ExerciseCardWrapper
                  exercise={currentExercise}
                  currentSet={exerciseStates[currentExercise.id]?.currentSet ?? 1}
                  completedSets={exerciseStates[currentExercise.id]?.completedSets ?? 0}
                  isComplete={exerciseStates[currentExercise.id]?.isComplete ?? false}
                  onLogSet={(data) => handleLogSet(currentExercise.id, data)}
                  exerciseIndex={currentExerciseIndex}
                  totalExercises={currentSectionExercises.length}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        {currentSectionExercises.length > 1 && (
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateToPrevExercise}
              disabled={currentSectionIndex === 0 && currentExerciseIndex === 0}
              className="min-h-[44px] text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateToNextExercise}
              disabled={
                currentSectionIndex === sectionIndicators.length - 1 &&
                currentExerciseIndex === currentSectionExercises.length - 1
              }
              className="min-h-[44px] text-muted-foreground"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Exercise List (collapsible overview) */}
        <div className="space-y-1 pt-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1 mb-2">
            All Exercises
          </p>
          <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
            {SECTION_ORDER.filter((key) => workout.sections[key].length > 0).map(
              (sectionKey) => (
                <div key={sectionKey}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-1 py-1">
                    {SECTION_ICONS[sectionKey]} {SECTION_LABELS[sectionKey]}
                  </p>
                  {workout.sections[sectionKey].map((ex) => {
                    const state = exerciseStates[ex.id]
                    const isComplete = state?.isComplete ?? false
                    const isActive = ex.id === currentExercise?.id
                    return (
                      <button
                        key={ex.id}
                        onClick={() => {
                          setCurrentSectionIndex(SECTION_ORDER.indexOf(sectionKey))
                          setCurrentExerciseIndex(
                            workout.sections[sectionKey].findIndex(
                              (e) => e.id === ex.id
                            )
                          )
                        }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all text-sm ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            isComplete
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border'
                          }`}
                        >
                          {isComplete && <Check className="w-3 h-3" />}
                        </div>
                        <span className="truncate flex-1">{ex.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {state?.completedSets ?? 0}/{ex.targetSetsMax}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </main>

      {/* ─── Complete Workout Button (sticky footer) ─────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border/50 p-4 z-40">
        <div className="max-w-lg mx-auto">
          {saveError && (
            <div className="flex items-center gap-2 text-xs text-destructive mb-2 px-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
          <Button
            onClick={handleCompleteWorkout}
            disabled={!hasLoggedAnySet || submitting}
            className="w-full min-h-[52px] rounded-xl text-base font-medium"
            size="lg"
          >
            {submitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                />
                Saving...
              </>
            ) : allExercisesComplete ? (
              <>
                <Trophy className="w-5 h-5 mr-2" />
                Complete Workout
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Complete Workout
                <span className="ml-2 text-xs opacity-70">
                  ({completedExercises}/{totalExercises})
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
