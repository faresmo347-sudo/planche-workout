'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Heart,
  AlertTriangle,
  Activity,
  Shield,
  Loader2,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

import type { PainReportData } from '@/lib/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface PainDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseId?: string
}

// ─── Body parts ───────────────────────────────────────────────────────────────

const BODY_PARTS = [
  'Shoulders',
  'Elbows',
  'Wrists',
  'Lower Back',
  'Core',
  'Biceps',
  'Triceps',
  'Other',
] as const

type BodyPart = (typeof BODY_PARTS)[number]

// ─── Severity helpers ─────────────────────────────────────────────────────────

function getSeverityLevel(severity: number): 'low' | 'medium' | 'high' {
  if (severity <= 3) return 'low'
  if (severity <= 6) return 'medium'
  return 'high'
}

function getSeverityColor(severity: number): string {
  const level = getSeverityLevel(severity)
  switch (level) {
    case 'low':
      return 'text-emerald-700 dark:text-emerald-400'
    case 'medium':
      return 'text-amber-700 dark:text-amber-400'
    case 'high':
      return 'text-rose-700 dark:text-rose-400'
  }
}

function getSeverityBg(severity: number): string {
  const level = getSeverityLevel(severity)
  switch (level) {
    case 'low':
      return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
    case 'medium':
      return 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
    case 'high':
      return 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800'
  }
}

function getSeverityBadge(severity: number): string {
  const level = getSeverityLevel(severity)
  switch (level) {
    case 'low':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
    case 'medium':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700'
    case 'high':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border-rose-300 dark:border-rose-700'
  }
}

function getSeverityIcon(severity: number) {
  const level = getSeverityLevel(severity)
  switch (level) {
    case 'low':
      return <Shield className="size-4 text-emerald-600 dark:text-emerald-400" />
    case 'medium':
      return <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
    case 'high':
      return <Heart className="size-4 text-rose-500 dark:text-rose-400" />
  }
}

function getSuggestion(severity: number): string {
  if (severity <= 3) {
    return 'Monitor and reduce intensity slightly'
  }
  if (severity <= 6) {
    return 'Reduce sets/reps by 25%, consider easier progression'
  }
  return 'Stop the exercise, rest for 48-72 hours, consider consulting a professional'
}

function getSupportMessage(severity: number): string {
  if (severity <= 3) {
    return "You're listening to your body — that's wisdom. Keep moving mindfully. 💚"
  }
  if (severity <= 6) {
    return "Taking a step back now prevents bigger setbacks later. You're making the right call. 💛"
  }
  return "Your body is asking for rest, and that's okay. Recovery IS training. Be kind to yourself. 🩷"
}

// ─── Workout exercise type for the selector ───────────────────────────────────

interface WorkoutExercise {
  id: string
  name: string
  category: string
  type: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PainDialog({ open, onOpenChange, exerciseId }: PainDialogProps) {
  const queryClient = useQueryClient()

  // Form state
  const [bodyPart, setBodyPart] = useState<BodyPart | ''>('')
  const [severity, setSeverity] = useState<number[]>([3])
  const [notes, setNotes] = useState('')
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    exerciseId ?? ''
  )
  const [submitted, setSubmitted] = useState(false)

  const currentSeverity = severity[0]
  const severityLevel = getSeverityLevel(currentSeverity)

  // Fetch recent pain reports
  const {
    data: painReportsData,
    isLoading: isLoadingReports,
  } = useQuery({
    queryKey: ['pain-reports'],
    queryFn: async () => {
      const res = await fetch('/api/pain')
      if (!res.ok) throw new Error('Failed to fetch pain reports')
      return res.json() as Promise<{ painReports: PainReportData[] }>
    },
  })

  // Fetch today's workout exercises for the exercise selector
  const { data: workoutData } = useQuery({
    queryKey: ['workout-today'],
    queryFn: async () => {
      const res = await fetch('/api/workout/today')
      if (!res.ok) throw new Error('Failed to fetch workout')
      return res.json() as Promise<{
        sections: Record<string, WorkoutExercise[]>
      }>
    },
  })

  // Flatten all exercises from the workout sections
  const workoutExercises: WorkoutExercise[] = workoutData?.sections
    ? Object.values(workoutData.sections).flat()
    : []

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: {
      bodyPart: string
      severity: number
      exerciseId?: string
      notes?: string
    }) => {
      const res = await fetch('/api/pain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to submit pain report')
      return res.json() as Promise<{
        painReport: PainReportData
        suggestion: string
      }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pain-reports'] })
      setSubmitted(true)
    },
  })

  // Reset form when dialog opens/closes
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        // Reset on close
        setTimeout(() => {
          setBodyPart('')
          setSeverity([3])
          setNotes('')
          setSelectedExerciseId(exerciseId ?? '')
          setSubmitted(false)
          submitMutation.reset()
        }, 200)
      }
      onOpenChange(isOpen)
    },
    [exerciseId, onOpenChange, submitMutation]
  )

  const handleSubmit = () => {
    if (!bodyPart) return
    submitMutation.mutate({
      bodyPart,
      severity: currentSeverity,
      exerciseId: selectedExerciseId || undefined,
      notes: notes || undefined,
    })
  }

  const canSubmit = bodyPart !== '' && !submitMutation.isPending

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Heart className="size-5 text-rose-400" />
            Report Pain or Discomfort
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Your body matters. Let us know how you&apos;re feeling so we can
            adjust your training accordingly.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 pb-4 space-y-5">
            {/* ── Submitted Success State ── */}
            {submitted && submitMutation.data ? (
              <div className="space-y-4 py-2">
                {/* Supportive message */}
                <div
                  className={`rounded-lg border p-4 ${getSeverityBg(currentSeverity)}`}
                >
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(currentSeverity)}
                    <div className="space-y-1.5">
                      <p className="font-medium text-sm">
                        {getSupportMessage(currentSeverity)}
                      </p>
                      <Separator className="my-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Recommendation:</span>{' '}
                        {submitMutation.data.suggestion}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Summary of what was submitted */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Report Summary
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={getSeverityBadge(currentSeverity)}
                    >
                      Severity {currentSeverity}/10
                    </Badge>
                    <Badge variant="outline">
                      {submitMutation.data.painReport.bodyPart}
                    </Badge>
                  </div>
                  {submitMutation.data.painReport.notes && (
                    <p className="text-sm text-muted-foreground">
                      &ldquo;{submitMutation.data.painReport.notes}&rdquo;
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => handleOpenChange(false)}
                  className="w-full"
                  variant="secondary"
                >
                  I understand — close for now
                </Button>
              </div>
            ) : (
              <>
                {/* ── Body Part Selector ── */}
                <div className="space-y-2">
                  <Label htmlFor="body-part-select">
                    Where are you feeling it?
                  </Label>
                  <Select
                    value={bodyPart}
                    onValueChange={(val) => setBodyPart(val as BodyPart)}
                  >
                    <SelectTrigger
                      id="body-part-select"
                      className="w-full"
                    >
                      <SelectValue placeholder="Select a body part..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BODY_PARTS.map((part) => (
                        <SelectItem key={part} value={part}>
                          {part}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ── Severity Slider ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>How intense is it?</Label>
                    <span
                      className={`text-sm font-semibold tabular-nums ${getSeverityColor(currentSeverity)}`}
                    >
                      {currentSeverity} / 10
                    </span>
                  </div>

                  {/* Gradient track background */}
                  <div
                    className="relative px-0.5"
                    style={
                      {
                        '--thumb-border':
                          severityLevel === 'low'
                            ? '#34d399'
                            : severityLevel === 'medium'
                              ? '#fbbf24'
                              : '#f87171',
                      } as React.CSSProperties
                    }
                  >
                    <div
                      className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(to right, #34d399, #fbbf24, #f87171)',
                      }}
                    />
                    <Slider
                      value={severity}
                      onValueChange={setSeverity}
                      min={1}
                      max={10}
                      step={1}
                      className="relative z-10 [&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:shadow-md [&_[data-slot=slider-thumb]]:border-[var(--thumb-border)]"
                    />
                  </div>

                  {/* Severity scale labels */}
                  <div className="flex justify-between text-xs text-muted-foreground px-0.5">
                    <span>Mild</span>
                    <span>Moderate</span>
                    <span>Severe</span>
                  </div>

                  {/* Live suggestion preview */}
                  <div
                    className={`rounded-lg border p-3 transition-colors ${getSeverityBg(currentSeverity)}`}
                  >
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(currentSeverity)}
                      <p className="text-sm">{getSuggestion(currentSeverity)}</p>
                    </div>
                  </div>
                </div>

                {/* ── Exercise Selector (optional) ── */}
                <div className="space-y-2">
                  <Label htmlFor="exercise-select">
                    Which exercise?{' '}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Select
                    value={selectedExerciseId}
                    onValueChange={setSelectedExerciseId}
                  >
                    <SelectTrigger
                      id="exercise-select"
                      className="w-full"
                    >
                      <SelectValue placeholder="Link to an exercise..." />
                    </SelectTrigger>
                    <SelectContent>
                      {workoutExercises.length === 0 ? (
                        <SelectItem value="_none" disabled>
                          No exercises available
                        </SelectItem>
                      ) : (
                        workoutExercises.map((ex) => (
                          <SelectItem key={ex.id} value={ex.id}>
                            {ex.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* ── Notes ── */}
                <div className="space-y-2">
                  <Label htmlFor="pain-notes">
                    Additional notes{' '}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    id="pain-notes"
                    placeholder="Describe the pain — when it started, what triggers it, anything that helps..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </div>
              </>
            )}

            {/* ── Recent Pain Reports ── */}
            {painReportsData && painReportsData.painReports.length > 0 && (
              <>
                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Activity className="size-4 text-muted-foreground" />
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Recent Reports (30 days)
                    </Label>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {painReportsData.painReports.map((report) => (
                      <div
                        key={report.id}
                        className={`rounded-md border p-3 ${getSeverityBg(report.severity)}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(report.severity)}
                            <span className="text-sm font-medium">
                              {report.bodyPart}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getSeverityBadge(report.severity)}`}
                            >
                              {report.severity}/10
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(report.date), 'MMM d')}
                            </span>
                          </div>
                        </div>
                        {report.notes && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                            {report.notes}
                          </p>
                        )}
                        {report.actionTaken && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            → {report.actionTaken}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {isLoadingReports && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading recent reports...
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ── Footer with submit ── */}
        {!submitted && (
          <DialogFooter className="px-6 pb-6 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="gap-2"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Heart className="size-4" />
                  Submit Report
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
