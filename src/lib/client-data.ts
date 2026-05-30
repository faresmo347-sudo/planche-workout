/**
 * Client-side data store — replaces all server-side API routes.
 * All static data (skills, exercises, stages) is hardcoded.
 * All user data (profile, workout sessions, max holds, pain reports)
 * is persisted to localStorage and synced to the server for
 * cross-device persistence.
 */

import type {
  SkillData,
  StageData,
  ExerciseData,
  ProfileData,
  ApiExercise,
  ApiWorkoutResponse,
  MaxHoldData,
  PainReportData,
} from './types'

// ─── localStorage keys ────────────────────────────────────────────────────────

const LS_PROFILE = 'cali-profile'
const LS_SESSIONS = 'cali-sessions'
const LS_MAX_HOLDS = 'cali-max-holds'
const LS_PAIN_REPORTS = 'cali-pain-reports'

// ─── helpers ──────────────────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function lsSet<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage full or unavailable
  }
}

// ─── Server Sync ────────────────────────────────────────────────────────────────

/**
 * Fire-and-forget POST to /api/sync — sends all localStorage data to the server.
 * Errors are caught silently so the app works offline.
 */
function syncToServer(): void {
  if (typeof window === 'undefined') return
  try {
    const profile = lsGet<ProfileData>(LS_PROFILE, DEFAULT_PROFILE)
    const sessions = lsGet<WorkoutSession[]>(LS_SESSIONS, [])
    const maxHolds = lsGet<MaxHoldData[]>(LS_MAX_HOLDS, [])
    const painReports = lsGet<PainReportData[]>(LS_PAIN_REPORTS, [])

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, sessions, maxHolds, painReports }),
    }).catch(() => {
      // Silently ignore sync errors — app works offline
    })
  } catch {
    // Silently ignore
  }
}

/**
 * Initialize data from the server on app mount.
 * If server has data, overwrite localStorage with server data.
 * If server has no data but localStorage does, push localStorage data to server.
 */
export async function initFromServer(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const res = await fetch('/api/sync')
    if (!res.ok) return

    const data = await res.json()

    if (data.hasData) {
      // Server has data — overwrite localStorage
      if (data.profile) {
        lsSet(LS_PROFILE, data.profile)
      }
      if (data.sessions && Array.isArray(data.sessions)) {
        lsSet(LS_SESSIONS, data.sessions)
      }
      if (data.maxHolds && Array.isArray(data.maxHolds)) {
        lsSet(LS_MAX_HOLDS, data.maxHolds)
      }
      if (data.painReports && Array.isArray(data.painReports)) {
        lsSet(LS_PAIN_REPORTS, data.painReports)
      }
    } else {
      // Server has no data but localStorage might — push local data up
      const localProfile = lsGet<ProfileData>(LS_PROFILE, DEFAULT_PROFILE)
      const localSessions = lsGet<WorkoutSession[]>(LS_SESSIONS, [])
      const localMaxHolds = lsGet<MaxHoldData[]>(LS_MAX_HOLDS, [])
      const localPainReports = lsGet<PainReportData[]>(LS_PAIN_REPORTS, [])

      // Only sync if there's meaningful local data
      if (localSessions.length > 0 || localProfile.id !== 'default-user') {
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: localProfile,
            sessions: localSessions,
            maxHolds: localMaxHolds,
            painReports: localPainReports,
          }),
        }).catch(() => {
          // Silently ignore
        })
      }
    }
  } catch {
    // Silently ignore — app works offline
  }
}

function cuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Count how many workouts have been logged for a specific skill.
 * Planche-focus days count for planche, FL-focus days count for FL,
 * combined days count for both.
 */
function countSkillWorkouts(skillName: 'planche' | 'front_lever'): number {
  const sessions = getWorkoutSessions()
  let count = 0
  for (const s of sessions) {
    if (s.dayType === 'combined') {
      count++
    } else if (skillName === 'planche' && s.dayType === 'planche_focus') {
      count++
    } else if (skillName === 'front_lever' && s.dayType === 'fl_focus') {
      count++
    }
  }
  return count
}

/**
 * Determine the current stage for a skill based on logged workouts.
 * Each stage has a `workoutsRequired` threshold (cumulative).
 */
export function computeCurrentStage(skillName: 'planche' | 'front_lever'): number {
  const skill = SKILLS.find(s => s.name === skillName)
  if (!skill) return 1

  const skillWorkouts = countSkillWorkouts(skillName)
  
  // Find the highest stage where workoutsRequired <= skillWorkouts
  let stage = 1
  for (const s of skill.stages) {
    if (skillWorkouts >= s.workoutsRequired) {
      stage = s.stageNumber
    }
  }
  return stage
}

/**
 * Get stage progress info based on workouts completed (not time).
 * Includes the current week within the stage (0-indexed workouts → week number).
 */
export function getStageProgressByWorkouts(skillName: 'planche' | 'front_lever'): {
  currentStage: number
  workoutsInStage: number
  workoutsNeeded: number
  currentWeekInStage: number
  totalWeeksInStage: number
  percentComplete: number
} {
  const skill = SKILLS.find(s => s.name === skillName)
  if (!skill) return { currentStage: 1, workoutsInStage: 0, workoutsNeeded: 0, currentWeekInStage: 0, totalWeeksInStage: 26, percentComplete: 0 }

  const currentStage = computeCurrentStage(skillName)
  const currentStageData = skill.stages.find(s => s.stageNumber === currentStage)
  const nextStageData = skill.stages.find(s => s.stageNumber === currentStage + 1)

  if (!currentStageData || !nextStageData) {
    // Already at max stage
    return { currentStage, workoutsInStage: 0, workoutsNeeded: 0, currentWeekInStage: 0, totalWeeksInStage: currentStageData?.weeksDuration ?? 26, percentComplete: 100 }
  }

  const totalSkillWorkouts = countSkillWorkouts(skillName)
  const workoutsInCurrentStage = totalSkillWorkouts - currentStageData.workoutsRequired
  const workoutsNeededForNext = nextStageData.workoutsRequired - currentStageData.workoutsRequired
  const percentComplete = Math.min(100, Math.round((workoutsInCurrentStage / workoutsNeededForNext) * 100))

  // 4 skill workouts per week, so currentWeekInStage = floor(workoutsInCurrentStage / 4) + 1
  const currentWeekInStage = Math.min(currentStageData.weeksDuration, Math.floor(workoutsInCurrentStage / 4) + 1)

  return {
    currentStage,
    workoutsInStage: workoutsInCurrentStage,
    workoutsNeeded: workoutsNeededForNext,
    currentWeekInStage,
    totalWeeksInStage: currentStageData.weeksDuration,
    percentComplete,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STATIC DATA — Skills, Stages, Exercises (from seed.ts)
// ═══════════════════════════════════════════════════════════════════════════════

export const SKILLS: SkillData[] = [
  {
    id: 'planche',
    name: 'planche',
    label: 'Planche',
    icon: 'circle-dot',
    stages: [
      {
        id: 'planche-stage-1',
        stageNumber: 1,
        name: 'Tuck & Advanced Tuck Planche',
        goalDescription: 'Achieve a consistent 15-20 second Tuck Planche hold and progress to a 5-10 second Advanced Tuck Planche hold',
        startMonth: 1,
        endMonth: 6,
        weeksDuration: 26,
        targetHoldMin: 15,
        targetHoldMax: 20,
        workoutsRequired: 0,
        exercises: [
          { id: 'p1-tuck-planche', name: 'Tuck Planche Hold', category: 'skill', type: 'isometric', description: 'Foundation hold — build straight-arm pushing strength with knees tucked tight', formCues: ['Lean shoulders forward past hands', 'Push down through fingers', 'Lock elbows straight', 'Tuck knees tight to chest', 'Protract shoulders fully', 'Look at hands'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 5, targetHoldMax: 12, restSeconds: 180 },
          { id: 'p1-adv-tuck-planche', name: 'Advanced Tuck Planche Hold', category: 'skill', type: 'isometric', description: 'Elevate hips to shoulder height with flat back — the bridge to straddle', formCues: ['Back must be flat, not rounded', 'Hips pushed away from hands', 'Arms completely straight', 'Shoulders protracted', 'Core braced tight'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 3, targetHoldMax: 8, restSeconds: 180 },
          { id: 'p1-pppu', name: 'Pseudo Planche Push-ups', category: 'accessory', type: 'dynamic', description: 'Build planche-specific pushing power with increased lean angle', formCues: ['Hands positioned at waist level', 'Lean shoulders past hands', 'Elbows tucked to sides', 'Full range of motion', 'Maintain hollow body'], targetSets: 3, targetRepsMin: 6, targetRepsMax: 12, targetHoldMin: null, targetHoldMax: null, restSeconds: 120 },
          { id: 'p1-planche-leans', name: 'Planche Leans (Tuck)', category: 'accessory', type: 'isometric', description: 'Build extreme straight-arm lean strength — the key to planche', formCues: ['Lean as far forward as possible', 'Keep arms locked straight', 'Maintain tuck position', 'Protract shoulders hard', 'Hold for time'], targetSets: 3, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 10, targetHoldMax: 20, restSeconds: 120 },
          { id: 'p1-scap-pushups', name: 'Scapular Push-ups', category: 'accessory', type: 'dynamic', description: 'Isolate scapular protraction — essential for planche stability', formCues: ['Arms stay straight', 'Only shoulder blades move', 'Push floor away (protraction)', 'Let chest sink (retraction)', 'Full range of motion'], targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, targetHoldMin: null, targetHoldMax: null, restSeconds: 90 },
          { id: 'p1-frog-stand', name: 'Frog Stand Hold', category: 'accessory', type: 'isometric', description: 'Balance on hands with knees on elbows — build wrist and balance foundation', formCues: ['Knees resting on triceps', 'Lean forward progressively', 'Fingers grip the floor', 'Look at hands', 'Build to 30+ seconds'], targetSets: 3, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 15, targetHoldMax: 30, restSeconds: 90 },
          { id: 'p1-hollow-body', name: 'Hollow Body Hold', category: 'core', type: 'isometric', description: 'Build the core compression needed to hold planche', formCues: ['Lower back pressed into floor', 'Arms extended overhead', 'Legs straight and together', 'Core fully braced', 'Breathe steadily'], targetSets: 3, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 15, targetHoldMax: 30, restSeconds: 60 },
        ],
      },
      {
        id: 'planche-stage-2',
        stageNumber: 2,
        name: 'Straddle Planche',
        goalDescription: 'Achieve a consistent 5-10 second Straddle Planche hold with perfect form',
        startMonth: 7,
        endMonth: 12,
        weeksDuration: 26,
        targetHoldMin: 5,
        targetHoldMax: 10,
        workoutsRequired: 104,
        exercises: [
          { id: 'p2-straddle-planche', name: 'Straddle Planche Hold', category: 'skill', type: 'isometric', description: 'Open legs wide to reduce leverage — the first real planche shape', formCues: ['Arms completely locked', 'Shoulders protracted', 'Back flat', 'Legs straddled wide', 'Hips at shoulder height'], targetSets: 5, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 2, targetHoldMax: 6, restSeconds: 210 },
          { id: 'p2-straddle-leans', name: 'Straddle Planche Leans', category: 'accessory', type: 'isometric', description: 'Push lean further with straddle leg position to build leverage strength', formCues: ['Legs straddled', 'Lean as far forward as possible', 'Keep arms locked', 'Protract shoulders', 'Build time gradually'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 5, targetHoldMax: 12, restSeconds: 150 },
          { id: 'p2-band-straddle', name: 'Band-Assisted Straddle Planche', category: 'accessory', type: 'isometric', description: 'Use resistance band to feel the full straddle position, then wean off', formCues: ['Use light band around hips', 'Focus on holding position', 'Progress to thinner bands', 'Arms locked straight'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 5, targetHoldMax: 10, restSeconds: 180 },
          { id: 'p2-adv-pppu', name: 'Advanced PPPU (Increased Lean)', category: 'accessory', type: 'dynamic', description: 'Deeper lean PPPU — build dynamic strength at straddle-level angles', formCues: ['Hands at waist level', 'Maximum lean forward', 'Elbows tucked', 'Full ROM', 'Body stays straight'], targetSets: 4, targetRepsMin: 4, targetRepsMax: 8, targetHoldMin: null, targetHoldMax: null, restSeconds: 150 },
          { id: 'p2-planche-negatives', name: 'Straddle Planche Negatives', category: 'accessory', type: 'eccentric', description: 'Slow descent into straddle planche — build strength through the negative', formCues: ['Start in tuck planche', 'Slowly open legs to straddle', 'Control the descent', 'Maintain straight arms', '5+ second negative'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 4, targetHoldMax: 8, restSeconds: 210 },
          { id: 'p2-straddle-press', name: 'Straddle Press to Handstand (Wall)', category: 'accessory', type: 'dynamic', description: 'Press from straddle L to handstand against wall — build overhead press strength', formCues: ['Start in straddle L-sit', 'Compress and press up', 'Use wall for support', 'Arms stay locked', 'Control the movement'], targetSets: 3, targetRepsMin: 3, targetRepsMax: 5, targetHoldMin: null, targetHoldMax: null, restSeconds: 180 },
          { id: 'p2-l-sit', name: 'L-Sit Hold (Parallettes)', category: 'core', type: 'isometric', description: 'Elevated L-sit on parallettes — build hip flexor and core compression', formCues: ['Legs straight and together', 'Hips at 90 degrees', 'Push down through hands', 'Core engaged', 'Chest up'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 10, targetHoldMax: 20, restSeconds: 90 },
        ],
      },
      {
        id: 'planche-stage-3',
        stageNumber: 3,
        name: 'Full Planche',
        goalDescription: 'Achieve a 3-5 second Full Planche hold with legs together and straight body',
        startMonth: 13,
        endMonth: 18,
        weeksDuration: 26,
        targetHoldMin: 3,
        targetHoldMax: 5,
        workoutsRequired: 208,
        exercises: [
          { id: 'p3-full-planche', name: 'Full Planche Hold', category: 'skill', type: 'isometric', description: 'Legs together, body straight — the holy grail of planche training', formCues: ['Legs together, straight', 'Arms completely locked', 'Hips at shoulder height', 'Full body tension', 'Protract shoulders maximally'], targetSets: 5, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 1, targetHoldMax: 3, restSeconds: 300 },
          { id: 'p3-planche-eccentrics', name: 'Full Planche Eccentrics', category: 'accessory', type: 'eccentric', description: 'Slow negative from handstand to planche — strongest strength builder', formCues: ['Controlled descent', '5-10 second negative', 'Arms stay locked', 'Keep body tension', 'Use spotter if needed'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 4, targetHoldMax: 8, restSeconds: 300 },
          { id: 'p3-extreme-pppu', name: 'Full Planche PPPU (Elevated Feet)', category: 'accessory', type: 'dynamic', description: 'PPPU with feet elevated at full planche lean angle — extreme pushing power', formCues: ['Feet elevated on block', 'Maximum forward lean', 'Hands at waist', 'Full ROM', 'Maintain straight body'], targetSets: 4, targetRepsMin: 3, targetRepsMax: 6, targetHoldMin: null, targetHoldMax: null, restSeconds: 180 },
          { id: 'p3-planche-press', name: 'Planche Press to Handstand', category: 'accessory', type: 'dynamic', description: 'Press from planche to handstand — build overhead strength and control', formCues: ['Start in planche', 'Press up to handstand', 'Controlled movement', 'Arms stay locked', 'Use wall for safety'], targetSets: 4, targetRepsMin: 1, targetRepsMax: 3, targetHoldMin: null, targetHoldMax: null, restSeconds: 240 },
          { id: 'p3-straddle-to-full', name: 'Straddle to Full Planche Transition', category: 'accessory', type: 'dynamic', description: 'Slowly bring legs together from straddle planche — bridge the gap', formCues: ['Start in straddle planche', 'Slowly close legs', 'Maintain lean and height', 'Arms stay locked', 'Control is key'], targetSets: 4, targetRepsMin: 1, targetRepsMax: 3, targetHoldMin: null, targetHoldMax: null, restSeconds: 240 },
          { id: 'p3-dragon-press', name: 'Dragon Press (Pike Push-up to Planche)', category: 'accessory', type: 'dynamic', description: 'From pike push-up, lean into planche position and press back — combo strength', formCues: ['Start in pike', 'Lean forward to planche', 'Press back to pike', 'Arms bend then extend', 'Controlled movement'], targetSets: 3, targetRepsMin: 3, targetRepsMax: 5, targetHoldMin: null, targetHoldMax: null, restSeconds: 180 },
          { id: 'p3-dragon-flags', name: 'Dragon Flags', category: 'core', type: 'eccentric', description: 'Full body core strength — lower straight body with only shoulders on bench', formCues: ['Body stays straight', 'Lower slowly', 'Only shoulders touch bench', 'Control the movement', 'Core braced tight'], targetSets: 4, targetRepsMin: 5, targetRepsMax: 8, targetHoldMin: null, targetHoldMax: null, restSeconds: 120 },
        ],
      },
      {
        id: 'planche-stage-4',
        stageNumber: 4,
        name: 'Mastering Full Planche',
        goalDescription: 'Achieve a consistent 10+ second Full Planche hold and integrate dynamic elements',
        startMonth: 19,
        endMonth: 24,
        weeksDuration: 26,
        targetHoldMin: 10,
        targetHoldMax: 15,
        workoutsRequired: 312,
        exercises: [
          { id: 'p4-full-planche-hold', name: 'Sustained Full Planche Hold', category: 'skill', type: 'isometric', description: 'Build endurance — hold full planche for 10+ seconds with perfect form', formCues: ['Perfect form every rep', 'Legs together', 'Arms locked', 'Build endurance', 'Multiple sets'], targetSets: 5, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 3, targetHoldMax: 8, restSeconds: 300 },
          { id: 'p4-planche-pushups', name: 'Planche Push-ups', category: 'skill', type: 'dynamic', description: 'Bend arms in full planche — the ultimate pushing expression', formCues: ['Start in full planche', 'Bend arms while maintaining position', 'Push back up', 'Controlled movement', 'Full ROM'], targetSets: 4, targetRepsMin: 1, targetRepsMax: 3, targetHoldMin: null, targetHoldMax: null, restSeconds: 300 },
          { id: 'p4-planche-transitions', name: 'Planche to Handstand Flow', category: 'skill', type: 'dynamic', description: 'Seamless transitions between planche and handstand — build control and flow', formCues: ['Start in planche', 'Press to handstand', 'Lower back to planche', 'Smooth transitions', 'Build flow'], targetSets: 4, targetRepsMin: 1, targetRepsMax: 3, targetHoldMin: null, targetHoldMax: null, restSeconds: 240 },
          { id: 'p4-planche-superman', name: 'Full Planche Superman Transitions', category: 'skill', type: 'dynamic', description: 'Move from planche to superman (arch) and back — dynamic full-body control', formCues: ['Start in full planche', 'Transition to superman arch', 'Return to planche', 'Keep arms locked', 'Smooth flow'], targetSets: 3, targetRepsMin: 2, targetRepsMax: 4, targetHoldMin: null, targetHoldMax: null, restSeconds: 240 },
          { id: 'p4-1-arm-assist', name: 'One-Arm Assisted Planche Hold', category: 'accessory', type: 'isometric', description: 'Full planche with one hand on a block or fingertips — start building 1-arm strength', formCues: ['One hand flat, one on fingertips', 'Keep full planche shape', 'Shift weight to full hand', 'Arms locked', 'Hold for time'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 2, targetHoldMax: 5, restSeconds: 300 },
          { id: 'p4-hollow-body-advanced', name: 'Hollow Body Rocks (Weighted)', category: 'core', type: 'dynamic', description: 'Weighted hollow body rocks — elite-level core endurance', formCues: ['Hold weight behind head', 'Maintain hollow body', 'Rock from shoulders to hips', 'No piking at hips', 'Continuous tension'], targetSets: 4, targetRepsMin: 20, targetRepsMax: 40, targetHoldMin: null, targetHoldMax: null, restSeconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'front_lever',
    name: 'front_lever',
    label: 'Front Lever',
    icon: 'grip-horizontal',
    stages: [
      {
        id: 'fl-stage-1',
        stageNumber: 1,
        name: 'Advanced Tuck to One-Leg FL',
        goalDescription: 'Achieve a consistent 15-20 second Advanced Tuck FL hold and progress to a 5-10 second One-Leg FL hold',
        startMonth: 1,
        endMonth: 6,
        weeksDuration: 26,
        targetHoldMin: 15,
        targetHoldMax: 20,
        workoutsRequired: 0,
        exercises: [
          { id: 'fl1-adv-tuck-fl', name: 'Advanced Tuck Front Lever Hold', category: 'skill', type: 'isometric', description: 'Foundation hold — build straight-arm pulling strength with flat back', formCues: ['Hang from bar with straight arms', 'Lift body to horizontal', 'Back flat, not rounded', 'Hips extended past 90°', 'Retract shoulders', 'Core braced tight'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 5, targetHoldMax: 12, restSeconds: 180 },
          { id: 'fl1-one-leg-fl', name: 'One-Leg Front Lever Hold', category: 'skill', type: 'isometric', description: 'Bridge to straddle — extend one leg while keeping position stable', formCues: ['One leg straight, one tucked', 'Keep arms locked', 'Body horizontal', 'Retract shoulders', 'Switch legs each set'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 3, targetHoldMax: 8, restSeconds: 180 },
          { id: 'fl1-fl-raises', name: 'Front Lever Raises (Adv Tuck)', category: 'accessory', type: 'dynamic', description: 'Dynamic pull from hang to FL position — build explosive lat strength', formCues: ['Start from dead hang', 'Raise to FL position', 'Control the movement', 'Arms stay straight', 'Pull with lats'], targetSets: 3, targetRepsMin: 5, targetRepsMax: 8, targetHoldMin: null, targetHoldMax: null, restSeconds: 120 },
          { id: 'fl1-fl-rows', name: 'Front Lever Rows (Adv Tuck)', category: 'accessory', type: 'dynamic', description: 'Rows in FL position — build pulling strength at horizontal', formCues: ['Maintain FL position', 'Pull chest to bar', 'Arms bend and extend', 'Keep body horizontal', 'Control the movement'], targetSets: 3, targetRepsMin: 5, targetRepsMax: 10, targetHoldMin: null, targetHoldMax: null, restSeconds: 120 },
          { id: 'fl1-scap-pulls', name: 'Scapular Pulls', category: 'accessory', type: 'dynamic', description: 'Isolate scapular depression — the foundation of all pulling strength', formCues: ['Arms stay straight', 'Only scapulae move', 'Pull shoulders down', 'Squeeze lats', 'Full range of motion'], targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, targetHoldMin: null, targetHoldMax: null, restSeconds: 90 },
          { id: 'fl1-inverted-hang', name: 'Inverted Hang Hold', category: 'accessory', type: 'isometric', description: 'Hang upside down with straight body — build comfort and shoulder stability', formCues: ['Body fully inverted', 'Arms straight', 'Core engaged', 'Shoulders active', 'Build to 30+ seconds'], targetSets: 3, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 15, targetHoldMax: 30, restSeconds: 90 },
          { id: 'fl1-hanging-leg-raises', name: 'Hanging Leg Raises', category: 'core', type: 'dynamic', description: 'Build core compression strength needed for front lever', formCues: ['Arms straight', 'Legs straight and together', 'Raise to bar height', 'Control the descent', 'No swinging'], targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetHoldMin: null, targetHoldMax: null, restSeconds: 60 },
        ],
      },
      {
        id: 'fl-stage-2',
        stageNumber: 2,
        name: 'Straddle Front Lever',
        goalDescription: 'Achieve a consistent 10-15 second Straddle Front Lever hold with perfect form',
        startMonth: 7,
        endMonth: 12,
        weeksDuration: 26,
        targetHoldMin: 10,
        targetHoldMax: 15,
        workoutsRequired: 104,
        exercises: [
          { id: 'fl2-straddle-fl', name: 'Straddle Front Lever Hold', category: 'skill', type: 'isometric', description: 'Open legs wide — the first real front lever shape', formCues: ['Legs straddled wide', 'Arms locked straight', 'Body horizontal', 'Shoulders retracted', 'Core engaged'], targetSets: 5, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 2, targetHoldMax: 8, restSeconds: 210 },
          { id: 'fl2-straddle-fl-rows', name: 'Straddle FL Rows', category: 'accessory', type: 'dynamic', description: 'Dynamic rows in straddle FL — build pulling power at straddle leverage', formCues: ['Maintain straddle FL', 'Pull chest to bar', 'Control the movement', 'Keep body horizontal', 'Legs stay straddled'], targetSets: 4, targetRepsMin: 3, targetRepsMax: 6, targetHoldMin: null, targetHoldMax: null, restSeconds: 150 },
          { id: 'fl2-band-straddle-fl', name: 'Band-Assisted Straddle FL', category: 'accessory', type: 'isometric', description: 'Use band to feel the full straddle position, then progressively wean off', formCues: ['Use light band for assistance', 'Focus on position quality', 'Progress to thinner bands', 'Arms stay straight'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 5, targetHoldMax: 10, restSeconds: 180 },
          { id: 'fl2-ice-cream-makers', name: 'Ice Cream Makers', category: 'accessory', type: 'dynamic', description: 'FL to inverted hang and back — build dynamic control and shoulder strength', formCues: ['Start in FL position', 'Extend to inverted hang', 'Return to FL', 'Controlled movement', 'Arms stay straight'], targetSets: 4, targetRepsMin: 2, targetRepsMax: 5, targetHoldMin: null, targetHoldMax: null, restSeconds: 150 },
          { id: 'fl2-pullups-hard', name: 'L-Sit Pull-ups', category: 'accessory', type: 'dynamic', description: 'Pull-ups with legs in L-sit — extra core and lat demand', formCues: ['Hold L-sit throughout', 'Full range of motion', 'Control the negative', 'Squeeze lats at top', 'No kipping'], targetSets: 4, targetRepsMin: 5, targetRepsMax: 10, targetHoldMin: null, targetHoldMax: null, restSeconds: 120 },
          { id: 'fl2-fl-negatives', name: 'Straddle FL Negatives', category: 'accessory', type: 'eccentric', description: 'Slow descent from inverted hang to straddle FL — overload the negative', formCues: ['Start inverted', 'Slow descent', '5+ second negative', 'Arms stay locked', 'Control every inch'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 4, targetHoldMax: 8, restSeconds: 180 },
          { id: 'fl2-hanging-leg-raises-adv', name: 'Hanging Leg Raises (Weighted)', category: 'core', type: 'dynamic', description: 'Weighted leg raises — build elite core compression for full FL', formCues: ['Add light weight between feet', 'Legs straight', 'Raise to bar height', 'Control the descent', 'No swinging'], targetSets: 4, targetRepsMin: 5, targetRepsMax: 8, targetHoldMin: null, targetHoldMax: null, restSeconds: 60 },
        ],
      },
      {
        id: 'fl-stage-3',
        stageNumber: 3,
        name: 'Full Front Lever',
        goalDescription: 'Achieve a 5-10 second Full Front Lever hold with legs together and straight body',
        startMonth: 13,
        endMonth: 18,
        weeksDuration: 26,
        targetHoldMin: 5,
        targetHoldMax: 10,
        workoutsRequired: 208,
        exercises: [
          { id: 'fl3-full-fl', name: 'Full Front Lever Hold', category: 'skill', type: 'isometric', description: 'Legs together, body horizontal — the holy grail of front lever', formCues: ['Legs together, straight', 'Body completely horizontal', 'Arms locked', 'Shoulders retracted', 'Full body tension'], targetSets: 5, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 1, targetHoldMax: 5, restSeconds: 300 },
          { id: 'fl3-fl-negatives', name: 'Full Front Lever Negatives', category: 'accessory', type: 'eccentric', description: 'Slow negative from inverted hang — the strongest FL strength builder', formCues: ['Start inverted', 'Slow descent to FL', '5-10 second negative', 'Arms locked', 'Control every inch'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 4, targetHoldMax: 8, restSeconds: 300 },
          { id: 'fl3-weighted-pullups', name: 'Weighted Pull-ups', category: 'accessory', type: 'dynamic', description: 'Heavy pull-ups with added weight — build raw lat and bicep strength', formCues: ['Full ROM', 'Control the negative', 'Add weight progressively', 'Squeeze lats at top', 'Use dip belt or backpack'], targetSets: 4, targetRepsMin: 4, targetRepsMax: 6, targetHoldMin: null, targetHoldMax: null, restSeconds: 180 },
          { id: 'fl3-straddle-to-full', name: 'Straddle to Full FL Transition', category: 'accessory', type: 'dynamic', description: 'Close legs from straddle FL to full FL — bridge the gap', formCues: ['Start in straddle FL', 'Slowly bring legs together', 'Maintain height and tension', 'Arms stay locked', 'Control is everything'], targetSets: 4, targetRepsMin: 1, targetRepsMax: 3, targetHoldMin: null, targetHoldMax: null, restSeconds: 240 },
          { id: 'fl3-fl-rows-full', name: 'Full FL Rows (Assisted)', category: 'accessory', type: 'dynamic', description: 'Rows in full FL position with band assist — build dynamic pulling at full leverage', formCues: ['Maintain FL position', 'Use band for assistance', 'Pull chest to bar', 'Full ROM', 'Progressively remove band'], targetSets: 4, targetRepsMin: 2, targetRepsMax: 4, targetHoldMin: null, targetHoldMax: null, restSeconds: 180 },
          { id: 'fl3-dragon-flags', name: 'Dragon Flags', category: 'core', type: 'eccentric', description: 'Full body core strength — the gold standard of calisthenics core work', formCues: ['Body stays straight', 'Lower slowly', 'Only shoulders touch bench', 'Control the movement', 'Core braced tight'], targetSets: 4, targetRepsMin: 5, targetRepsMax: 8, targetHoldMin: null, targetHoldMax: null, restSeconds: 120 },
        ],
      },
      {
        id: 'fl-stage-4',
        stageNumber: 4,
        name: 'Mastering Full Front Lever',
        goalDescription: 'Achieve a consistent 15+ second Full Front Lever hold and integrate dynamic elements',
        startMonth: 19,
        endMonth: 24,
        weeksDuration: 26,
        targetHoldMin: 15,
        targetHoldMax: 20,
        workoutsRequired: 312,
        exercises: [
          { id: 'fl4-sustained-fl', name: 'Sustained Full FL Hold', category: 'skill', type: 'isometric', description: 'Build endurance — hold full FL for 15+ seconds with perfect form', formCues: ['Perfect form every rep', 'Legs together', 'Arms locked', 'Build endurance', 'Multiple sets'], targetSets: 5, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 5, targetHoldMax: 10, restSeconds: 300 },
          { id: 'fl4-fl-pullups', name: 'Front Lever Pull-ups', category: 'skill', type: 'dynamic', description: 'Pull-ups in full FL — the ultimate pulling expression', formCues: ['Maintain FL position', 'Pull chest to bar', 'Bend arms while horizontal', 'Full ROM', 'Controlled movement'], targetSets: 4, targetRepsMin: 1, targetRepsMax: 3, targetHoldMin: null, targetHoldMax: null, restSeconds: 300 },
          { id: 'fl4-fl-transitions', name: 'FL to Muscle-Up Flow', category: 'skill', type: 'dynamic', description: 'Transition from FL to muscle-up and back — elite dynamic control', formCues: ['Start in full FL', 'Pull to muscle-up', 'Return to FL', 'Smooth transitions', 'Full control'], targetSets: 4, targetRepsMin: 1, targetRepsMax: 3, targetHoldMin: null, targetHoldMax: null, restSeconds: 240 },
          { id: 'fl4-1-arm-fl-assist', name: 'One-Arm Assisted FL Hold', category: 'accessory', type: 'isometric', description: 'Full FL with one hand on towel or fingertips — start building 1-arm FL', formCues: ['One hand grips bar fully', 'Other hand on towel/fingertips', 'Maintain FL shape', 'Shift weight to full hand', 'Hold for time'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 2, targetHoldMax: 5, restSeconds: 300 },
          { id: 'fl4-360-pull', name: 'FL 360° Pull', category: 'skill', type: 'dynamic', description: 'Pull from FL around the bar in a full circle — elite skill', formCues: ['Start in full FL', 'Pull and rotate around bar', 'Complete the circle', 'Arms stay engaged', 'Controlled movement'], targetSets: 3, targetRepsMin: 1, targetRepsMax: 2, targetHoldMin: null, targetHoldMax: null, restSeconds: 300 },
          { id: 'fl4-hollow-body-adv', name: 'Hollow Body Rocks (Weighted)', category: 'core', type: 'dynamic', description: 'Weighted hollow body rocks — elite-level core endurance', formCues: ['Hold weight behind head', 'Maintain hollow body', 'Rock from shoulders to hips', 'Continuous tension', 'Full control'], targetSets: 4, targetRepsMin: 20, targetRepsMax: 40, targetHoldMin: null, targetHoldMax: null, restSeconds: 60 },
        ],
      },
    ],
  },
]

// Warmup & Cooldown exercises (global, not tied to a specific stage)
export const WARMUP_EXERCISES: ExerciseData[] = [
  { id: 'wu-arm-circles', name: 'Arm Circles', category: 'warmup', type: 'dynamic', description: 'Large and small arm circles to warm up shoulders', formCues: ['30 seconds forward', '30 seconds backward', 'Full ROM', 'Gradually increase size'], targetSets: 1, targetRepsMin: 30, targetRepsMax: 30, targetHoldMin: null, targetHoldMax: null, restSeconds: 0 },
  { id: 'wu-wrist-rotations', name: 'Wrist Rotations', category: 'warmup', type: 'dynamic', description: 'Rotate wrists in both directions', formCues: ['Slow controlled circles', 'Both directions', '10 each way'], targetSets: 1, targetRepsMin: 10, targetRepsMax: 10, targetHoldMin: null, targetHoldMax: null, restSeconds: 0 },
  { id: 'wu-band-dislocates', name: 'Band Dislocates', category: 'warmup', type: 'dynamic', description: 'Move resistance band from front to back overhead', formCues: ['Hold band wide', 'Slow overhead pass', 'Gradually narrow grip', '10 reps'], targetSets: 1, targetRepsMin: 10, targetRepsMax: 10, targetHoldMin: null, targetHoldMax: null, restSeconds: 0 },
  { id: 'wu-cat-cow', name: 'Cat-Cow Stretch', category: 'warmup', type: 'dynamic', description: 'Alternate between arching and rounding the back', formCues: ['On all fours', 'Inhale arch (cow)', 'Exhale round (cat)', 'Flow with breath'], targetSets: 1, targetRepsMin: 10, targetRepsMax: 10, targetHoldMin: null, targetHoldMax: null, restSeconds: 0 },
  { id: 'wu-jumping-jacks', name: 'Jumping Jacks', category: 'warmup', type: 'dynamic', description: 'Classic jumping jacks to raise heart rate', formCues: ['Full range of motion', 'Land softly', 'Keep rhythm'], targetSets: 1, targetRepsMin: 30, targetRepsMax: 30, targetHoldMin: null, targetHoldMax: null, restSeconds: 0 },
]

export const COOLDOWN_EXERCISES: ExerciseData[] = [
  { id: 'cd-chest-stretch', name: 'Chest/Doorway Stretch', category: 'cooldown', type: 'isometric', description: 'Stretch chest in doorway or against wall', formCues: ['30 seconds each side', 'Feel stretch in chest', 'Breathe deeply', 'Relax into stretch'], targetSets: 1, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 30, targetHoldMax: 30, restSeconds: 0 },
  { id: 'cd-lat-stretch', name: 'Lat Stretch (Hanging)', category: 'cooldown', type: 'isometric', description: 'Hang from bar and relax to stretch lats', formCues: ['Hang with straight arms', 'Relax completely', 'Breathe deeply', '30+ seconds'], targetSets: 1, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 30, targetHoldMax: 30, restSeconds: 0 },
  { id: 'cd-shoulder-stretch', name: 'Behind-Back Shoulder Stretch', category: 'cooldown', type: 'isometric', description: 'Pull arm across body or behind back', formCues: ['30 seconds each side', 'Gentle pull', 'Never force', 'Breathe'], targetSets: 1, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 30, targetHoldMax: 30, restSeconds: 0 },
  { id: 'cd-wrist-stretch', name: 'Wrist Flexor/Extensor Stretch', category: 'cooldown', type: 'isometric', description: 'Stretch wrists in both directions on floor', formCues: ['Palms down, lean back', 'Palms up, lean back', '30 seconds each', 'Gentle pressure'], targetSets: 1, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 30, targetHoldMax: 30, restSeconds: 0 },
  { id: 'cd-foam-roll', name: 'Foam Rolling (Lats & Shoulders)', category: 'cooldown', type: 'dynamic', description: 'Foam roll lats and shoulder area', formCues: ['Slow rolling', 'Spend time on tight spots', '2 minutes total', 'Breathe into tight areas'], targetSets: 1, targetRepsMin: 2, targetRepsMax: 2, targetHoldMin: null, targetHoldMax: null, restSeconds: 0 },
]

// ═══════════════════════════════════════════════════════════════════════════════
//  USER DATA — Profile
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_PROFILE: ProfileData = {
  id: 'default-user',
  age: 16,
  heightCm: 175,
  weightKg: 70,
  pullUpsMax: 15,
  muscleUpsMax: 3,
  pushUpsMax: 48,
  plancheStage: 1,
  flStage: 1,
  startDate: todayISO(),
}

export function getProfile(): ProfileData {
  return lsGet<ProfileData>(LS_PROFILE, DEFAULT_PROFILE)
}

export function saveProfile(profile: Partial<ProfileData>): ProfileData {
  const current = getProfile()
  const updated = { ...current, ...profile }
  lsSet(LS_PROFILE, updated)
  syncToServer()
  return updated
}

export function getCompletedSessions(): number {
  const sessions = getWorkoutSessions()
  return sessions.length
}

// ═══════════════════════════════════════════════════════════════════════════════
//  USER DATA — Workout Sessions
// ═══════════════════════════════════════════════════════════════════════════════

export interface WorkoutSession {
  id: string
  date: string
  dayType: string
  weekNumber: number
  isDeload: boolean
  completed: boolean
  notes: string | null
  exercises: {
    exerciseId: string
    exerciseName: string
    type: string
    category: string
    setNumber: number
    holdTimeSeconds: number | null
    reps: number | null
    weightKg: number | null
    rpe: number | null
    painReported: boolean
    painNotes: string | null
  }[]
}

export function getWorkoutSessions(): WorkoutSession[] {
  return lsGet<WorkoutSession[]>(LS_SESSIONS, [])
}

export function saveWorkoutSession(session: WorkoutSession): void {
  const sessions = getWorkoutSessions()
  sessions.push(session)
  lsSet(LS_SESSIONS, sessions)
  syncToServer()
}

// ═══════════════════════════════════════════════════════════════════════════════
//  USER DATA — Max Holds
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_MAX_HOLDS: MaxHoldData[] = [
  { id: cuid(), exerciseName: 'Tuck Planche Hold', maxHoldSeconds: 8, lastTestedAt: new Date().toISOString() },
  { id: cuid(), exerciseName: 'Advanced Tuck Planche Hold', maxHoldSeconds: 3, lastTestedAt: new Date().toISOString() },
  { id: cuid(), exerciseName: 'Advanced Tuck Front Lever Hold', maxHoldSeconds: 7, lastTestedAt: new Date().toISOString() },
  { id: cuid(), exerciseName: 'One-Leg Front Lever Hold', maxHoldSeconds: 2, lastTestedAt: new Date().toISOString() },
]

export function getMaxHolds(): MaxHoldData[] {
  return lsGet<MaxHoldData[]>(LS_MAX_HOLDS, DEFAULT_MAX_HOLDS)
}

export function upsertMaxHold(exerciseName: string, maxHoldSeconds: number): MaxHoldData {
  const holds = getMaxHolds()
  const idx = holds.findIndex(h => h.exerciseName === exerciseName)
  const entry: MaxHoldData = {
    id: idx >= 0 ? holds[idx].id : cuid(),
    exerciseName,
    maxHoldSeconds,
    lastTestedAt: new Date().toISOString(),
  }
  if (idx >= 0) {
    holds[idx] = entry
  } else {
    holds.push(entry)
  }
  lsSet(LS_MAX_HOLDS, holds)
  syncToServer()
  return entry
}

// ═══════════════════════════════════════════════════════════════════════════════
//  USER DATA — Pain Reports
// ═══════════════════════════════════════════════════════════════════════════════

export function getPainReports(): PainReportData[] {
  return lsGet<PainReportData[]>(LS_PAIN_REPORTS, [])
}

export function savePainReport(report: Omit<PainReportData, 'id' | 'date'>): PainReportData {
  const reports = getPainReports()
  const entry: PainReportData = {
    id: cuid(),
    date: new Date().toISOString(),
    ...report,
  }
  reports.unshift(entry)
  lsSet(LS_PAIN_REPORTS, reports)
  syncToServer()
  return entry
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WORKOUT GENERATION (replaces /api/workout/today)
// ═══════════════════════════════════════════════════════════════════════════════

function getPrilepinForIsometric(maxHoldSeconds: number) {
  if (maxHoldSeconds <= 7) return { targetHoldMin: 3, targetHoldMax: 4, targetSetsMin: 6, targetSetsMax: 8 }
  if (maxHoldSeconds <= 12) return { targetHoldMin: 5, targetHoldMax: 8, targetSetsMin: 5, targetSetsMax: 7 }
  if (maxHoldSeconds <= 18) return { targetHoldMin: 9, targetHoldMax: 12, targetSetsMin: 4, targetSetsMax: 6 }
  if (maxHoldSeconds <= 25) return { targetHoldMin: 13, targetHoldMax: 18, targetSetsMin: 3, targetSetsMax: 5 }
  return { targetHoldMin: 19, targetHoldMax: 25, targetSetsMin: 3, targetSetsMax: 4 }
}

function formatExercise(
  ex: ExerciseData,
  isDeload: boolean,
  maxHoldSeconds?: number | null,
  overloadFactor?: number,
): ApiExercise {
  const factor = overloadFactor ?? 1

  if (ex.type === 'isometric') {
    let targetSetsMin: number, targetSetsMax: number, targetHoldMin: number, targetHoldMax: number

    if (maxHoldSeconds != null && maxHoldSeconds > 0) {
      const p = getPrilepinForIsometric(maxHoldSeconds)
      targetHoldMin = p.targetHoldMin
      targetHoldMax = p.targetHoldMax
      targetSetsMin = p.targetSetsMin
      targetSetsMax = p.targetSetsMax
    } else {
      targetHoldMin = ex.targetHoldMin ?? 5
      targetHoldMax = ex.targetHoldMax ?? 10
      targetSetsMin = ex.targetSets
      targetSetsMax = ex.targetSets
    }

    if (factor > 1) {
      targetHoldMin = Math.round(targetHoldMin * factor)
      targetHoldMax = Math.round(targetHoldMax * factor)
    }

    if (isDeload) {
      targetSetsMin = Math.max(1, Math.round(targetSetsMin * 0.5))
      targetSetsMax = Math.max(1, Math.round(targetSetsMax * 0.5))
      targetHoldMin = Math.round(targetHoldMin * 0.8)
      targetHoldMax = Math.round(targetHoldMax * 0.8)
    }

    return {
      id: ex.id,
      name: ex.name,
      type: ex.type,
      category: ex.category,
      targetSetsMin,
      targetSetsMax,
      holdTimeMin: targetHoldMin,
      holdTimeMax: targetHoldMax,
      restSeconds: ex.restSeconds,
      formCues: ex.formCues,
      description: ex.description,
    }
  } else {
    let targetSetsMin = ex.targetSets
    let targetSetsMax = ex.targetSets
    let targetRepsMin = ex.targetRepsMin ?? 5
    let targetRepsMax = ex.targetRepsMax ?? 8

    if (factor > 1) {
      targetRepsMin = Math.round(targetRepsMin * factor)
      targetRepsMax = Math.round(targetRepsMax * factor)
    }

    if (overloadFactor && overloadFactor > 1) {
      const sessionWeek = Math.round((overloadFactor - 1) / 0.05) + 1
      if (sessionWeek % 2 === 0) {
        targetSetsMax = targetSetsMax + 1
      }
    }

    if (isDeload) {
      targetSetsMin = Math.max(1, Math.round(targetSetsMin * 0.5))
      targetSetsMax = Math.max(1, Math.round(targetSetsMax * 0.5))
      targetRepsMax = targetRepsMin
    }

    return {
      id: ex.id,
      name: ex.name,
      type: ex.type,
      category: ex.category,
      targetSetsMin,
      targetSetsMax,
      targetRepsMin,
      targetRepsMax,
      restSeconds: ex.restSeconds,
      formCues: ex.formCues,
      description: ex.description,
    }
  }
}

export function generateWorkoutToday(): ApiWorkoutResponse {
  const profile = getProfile()
  const sessions = getWorkoutSessions()
  const completedSessions = sessions.length
  const maxHolds = getMaxHolds()
  const maxHoldMap = new Map<string, number>()
  for (const mh of maxHolds) {
    maxHoldMap.set(mh.exerciseName, mh.maxHoldSeconds)
  }

  // Determine workout type
  const sessionInWeek = completedSessions % 7
  let dayType: 'planche_focus' | 'fl_focus' | 'combined'
  let focusSkill: string | null = null
  let focusStageNum: number | null = null

  if (sessionInWeek === 6) {
    dayType = 'combined'
  } else if (sessionInWeek % 2 === 0) {
    dayType = 'planche_focus'
    focusSkill = 'planche'
    focusStageNum = computeCurrentStage('planche')
  } else {
    dayType = 'fl_focus'
    focusSkill = 'front_lever'
    focusStageNum = computeCurrentStage('front_lever')
  }

  // Progressive overload: factor only increases when a full week (7 sessions) is completed.
  // 0-6 sessions = week 1, factor 1.0 (no overload)
  // 7-13 sessions = week 2, factor 1.05 (+5%)
  // 14-20 sessions = week 3, factor 1.10 (+10%)
  // etc.
  const completedWeeks = Math.floor(completedSessions / 7) // fully completed weeks
  const weekNumber = completedWeeks + 1 // current week number
  const isDeload = weekNumber > 1 && weekNumber % 4 === 0
  const overloadFactor = 1 + completedWeeks * 0.05

  const now = new Date()
  const dayOfWeek = now.getDay()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const plancheSkill = SKILLS.find(s => s.name === 'planche')!
  const flSkill = SKILLS.find(s => s.name === 'front_lever')!

  const formatWithMaxHold = (ex: ExerciseData) => {
    const maxHold = maxHoldMap.get(ex.name)
    return formatExercise(ex, isDeload, maxHold, overloadFactor)
  }

  if (dayType === 'combined') {
    const plancheStage = plancheSkill.stages.find(s => s.stageNumber === computeCurrentStage('planche'))
    const flStage = flSkill.stages.find(s => s.stageNumber === computeCurrentStage('front_lever'))
    const plancheSkillExercises = plancheStage?.exercises.filter(e => e.category === 'skill') ?? []
    const flSkillExercises = flStage?.exercises.filter(e => e.category === 'skill') ?? []

    return {
      date: now.toISOString(),
      dayName: dayNames[dayOfWeek],
      dayType,
      weekNumber,
      isDeload,
      focusSkill: 'combined',
      focusStage: null,
      stageName: `${plancheStage?.name ?? 'Planche'} + ${flStage?.name ?? 'FL'}`,
      sections: {
        warmup: WARMUP_EXERCISES.map(ex => formatExercise(ex, isDeload, undefined, overloadFactor)),
        skill: [...plancheSkillExercises, ...flSkillExercises].map(formatWithMaxHold),
        accessory: [],
        core: [],
        cooldown: COOLDOWN_EXERCISES.map(ex => formatExercise(ex, isDeload, undefined, overloadFactor)),
      },
    }
  }

  // Non-combined day
  const skill = focusSkill === 'planche' ? plancheSkill : flSkill
  const stageNum = focusStageNum ?? 1
  const stage = skill.stages.find(s => s.stageNumber === stageNum)

  if (!stage) {
    return {
      date: now.toISOString(),
      dayName: dayNames[dayOfWeek],
      dayType: 'rest',
      weekNumber,
      isDeload,
      message: 'No stage data found. Check your profile settings.',
      sections: { warmup: [], skill: [], accessory: [], core: [], cooldown: [] },
    }
  }

  const skillExercises = stage.exercises.filter(e => e.category === 'skill')
  const accessoryExercises = stage.exercises.filter(e => e.category === 'accessory')
  const coreExercises = stage.exercises.filter(e => e.category === 'core')

  return {
    date: now.toISOString(),
    dayName: dayNames[dayOfWeek],
    dayType,
    weekNumber,
    isDeload,
    focusSkill,
    focusStage: focusStageNum,
    stageName: stage.name,
    sections: {
      warmup: WARMUP_EXERCISES.map(ex => formatExercise(ex, isDeload, undefined, overloadFactor)),
      skill: skillExercises.map(formatWithMaxHold),
      accessory: accessoryExercises.map(formatWithMaxHold),
      core: coreExercises.map(formatWithMaxHold),
      cooldown: COOLDOWN_EXERCISES.map(ex => formatExercise(ex, isDeload, undefined, overloadFactor)),
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD STATS (replaces /api/dashboard/stats)
// ═══════════════════════════════════════════════════════════════════════════════

export function getDashboardStats() {
  const sessions = getWorkoutSessions()
  const maxHolds = getMaxHolds()
  const profile = getProfile()
  const completedSessions = sessions.length
  const completedWeeks = Math.floor(completedSessions / 7)
  const weekNumber = completedWeeks + 1
  const thisWeekSessions = completedSessions % 7

  const plancheMaxHold = maxHolds.find(mh =>
    mh.exerciseName.toLowerCase().includes('tuck planche')
  )
  const flMaxHold = maxHolds.find(mh =>
    mh.exerciseName.toLowerCase().includes('tuck front lever')
  )

  const plancheStageProgress = getStageProgressByWorkouts('planche')
  const flStageProgress = getStageProgressByWorkouts('front_lever')

  return {
    totalWorkouts: completedSessions,
    plancheMaxHold: plancheMaxHold?.maxHoldSeconds ?? null,
    plancheMaxHoldName: plancheMaxHold?.exerciseName ?? null,
    flMaxHold: flMaxHold?.maxHoldSeconds ?? null,
    flMaxHoldName: flMaxHold?.exerciseName ?? null,
    thisWeekSessions,
    weekNumber,
    plancheStage: plancheStageProgress.currentStage,
    flStage: flStageProgress.currentStage,
    plancheWorkoutsInStage: plancheStageProgress.workoutsInStage,
    plancheWorkoutsNeeded: plancheStageProgress.workoutsNeeded,
    plancheStagePercent: plancheStageProgress.percentComplete,
    flWorkoutsInStage: flStageProgress.workoutsInStage,
    flWorkoutsNeeded: flStageProgress.workoutsNeeded,
    flStagePercent: flStageProgress.percentComplete,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PROGRESS DATA (replaces /api/progress)
// ═══════════════════════════════════════════════════════════════════════════════

export function getProgressData() {
  const profile = getProfile()
  const sessions = getWorkoutSessions()
  const plancheSkill = SKILLS.find(s => s.name === 'planche')!
  const flSkill = SKILLS.find(s => s.name === 'front_lever')!

  const now = new Date()
  const startDate = new Date(profile.startDate)
  const monthsElapsed =
    (now.getFullYear() - startDate.getFullYear()) * 12 +
    (now.getMonth() - startDate.getMonth())

  // Exercise progress
  const exerciseProgressMap: Record<string, {
    exerciseId: string
    exerciseName: string
    type: string
    category: string
    dataPoints: { date: string; sessionId: string; value: number; sets: number; rpe: number | null }[]
  }> = {}

  for (const session of sessions) {
    const logsByExercise = new Map<string, typeof session.exercises>()
    for (const log of session.exercises) {
      const existing = logsByExercise.get(log.exerciseId) ?? []
      existing.push(log)
      logsByExercise.set(log.exerciseId, existing)
    }

    for (const [exerciseId, logs] of logsByExercise) {
      if (logs.length === 0) continue
      const exercise = logs[0]

      if (!exerciseProgressMap[exercise.exerciseName]) {
        exerciseProgressMap[exercise.exerciseName] = {
          exerciseId,
          exerciseName: exercise.exerciseName,
          type: exercise.type,
          category: exercise.category,
          dataPoints: [],
        }
      }

      if (exercise.type === 'isometric') {
        const maxHold = Math.max(...logs.map(l => l.holdTimeSeconds ?? 0))
        exerciseProgressMap[exercise.exerciseName].dataPoints.push({
          date: session.date,
          sessionId: session.id,
          value: maxHold,
          sets: logs.length,
          rpe: logs.find(l => l.rpe != null)?.rpe ?? null,
        })
      } else {
        const maxReps = Math.max(...logs.map(l => l.reps ?? 0))
        exerciseProgressMap[exercise.exerciseName].dataPoints.push({
          date: session.date,
          sessionId: session.id,
          value: maxReps,
          sets: logs.length,
          rpe: logs.find(l => l.rpe != null)?.rpe ?? null,
        })
      }
    }
  }

  // Stage progress
  const plancheStageProgress = getStageProgressByWorkouts('planche')
  const flStageProgress = getStageProgressByWorkouts('front_lever')

  const plancheStageInfo = plancheSkill.stages.find(s => s.stageNumber === plancheStageProgress.currentStage)
  const flStageInfo = flSkill.stages.find(s => s.stageNumber === flStageProgress.currentStage)

  const stageProgress = {
    monthsElapsed,
    planche: plancheStageInfo
      ? {
          stageNumber: plancheStageProgress.currentStage,
          name: plancheStageInfo.name,
          goalDescription: plancheStageInfo.goalDescription,
          startMonth: plancheStageInfo.startMonth,
          endMonth: plancheStageInfo.endMonth,
          progressInStage: plancheStageProgress.percentComplete,
          workoutsInStage: plancheStageProgress.workoutsInStage,
          workoutsNeeded: plancheStageProgress.workoutsNeeded,
        }
      : null,
    frontLever: flStageInfo
      ? {
          stageNumber: flStageProgress.currentStage,
          name: flStageInfo.name,
          goalDescription: flStageInfo.goalDescription,
          startMonth: flStageInfo.startMonth,
          endMonth: flStageInfo.endMonth,
          progressInStage: flStageProgress.percentComplete,
          workoutsInStage: flStageProgress.workoutsInStage,
          workoutsNeeded: flStageProgress.workoutsNeeded,
        }
      : null,
  }

  return {
    exerciseProgress: Object.values(exerciseProgressMap),
    stageProgress,
    totalSessions: sessions.length,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WORKOUT HISTORY (replaces /api/workout/history)
// ═══════════════════════════════════════════════════════════════════════════════

export function getWorkoutHistory() {
  const sessions = getWorkoutSessions()
  return sessions
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20)
    .map(session => ({
      id: session.id,
      date: session.date,
      dayType: session.dayType,
      weekNumber: session.weekNumber,
      isDeload: session.isDeload,
      completed: session.completed,
      exercisesCompleted: session.exercises.length,
      exercises: session.exercises,
    }))
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAIN SUGGESTION
// ═══════════════════════════════════════════════════════════════════════════════

export function getPainSuggestion(severity: number): string {
  if (severity <= 3) return 'Monitor and reduce intensity slightly'
  if (severity <= 6) return 'Reduce sets/reps by 25%, consider easier progression'
  return 'Stop the exercise, rest for 48-72 hours, consider consulting a professional'
}
