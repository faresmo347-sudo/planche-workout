export interface ExerciseData {
  id: string
  name: string
  category: string
  type: string
  description: string | null
  formCues: string[]
  targetSets: number
  targetRepsMin: number | null
  targetRepsMax: number | null
  targetHoldMin: number | null
  targetHoldMax: number | null
  restSeconds: number
}

export interface WorkoutSection {
  name: string
  exercises: ExerciseData[]
}

export interface WorkoutData {
  dayType: string
  weekNumber: number
  isDeload: boolean
  sections: WorkoutSection[]
}

export interface StageData {
  id: string
  stageNumber: number
  name: string
  goalDescription: string
  startMonth: number
  endMonth: number
  targetHoldMin: number | null
  targetHoldMax: number | null
  exercises: ExerciseData[]
}

export interface SkillData {
  id: string
  name: string
  label: string
  icon: string | null
  stages: StageData[]
}

export interface ProfileData {
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

export interface ProgressPoint {
  date: string
  value: number
}

export interface ExerciseProgress {
  exerciseName: string
  type: string
  data: ProgressPoint[]
}

export interface StageProgress {
  skillName: string
  currentStage: number
  currentStageName: string
  monthsElapsed: number
  stageStartMonth: number
  stageEndMonth: number
  percentComplete: number
}

export interface ProgressData {
  exercises: ExerciseProgress[]
  stages: StageProgress[]
}

export interface PainReportData {
  id: string
  date: string
  bodyPart: string
  severity: number
  notes: string | null
  actionTaken: string | null
}

export interface MaxHoldData {
  id: string
  exerciseName: string
  maxHoldSeconds: number
  lastTestedAt: string
}

// API Response types for /api/workout/today
export interface ApiExercise {
  id: string
  name: string
  type: 'isometric' | 'dynamic' | 'eccentric'
  category: string
  targetSetsMin: number
  targetSetsMax: number
  holdTimeMin?: number | null
  holdTimeMax?: number | null
  targetRepsMin?: number | null
  targetRepsMax?: number | null
  restSeconds: number
  formCues: string[]
  description?: string | null
}

export interface ApiWorkoutSections {
  warmup: ApiExercise[]
  skill: ApiExercise[]
  accessory: ApiExercise[]
  core: ApiExercise[]
  cooldown: ApiExercise[]
}

export interface ApiWorkoutResponse {
  date: string
  dayName: string
  dayType: 'planche_focus' | 'fl_focus' | 'combined' | 'rest'
  weekNumber: number
  isDeload: boolean
  focusSkill?: string | null
  focusStage?: number | null
  stageName?: string | null
  sections: ApiWorkoutSections
  message?: string
}

// Set logging types
export interface SetLog {
  exerciseId: string
  setNumber: number
  holdTimeSeconds?: number
  reps?: number
  weightKg?: number
  rpe?: number
  painReported: boolean
  painNotes?: string
}

export interface ExerciseSetState {
  currentSet: number
  sets: SetLog[]
  isComplete: boolean
}
