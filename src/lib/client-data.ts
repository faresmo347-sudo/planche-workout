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
        targetHoldMin: 15,
        targetHoldMax: 20,
        exercises: [
          { id: 'p1-tuck-planche', name: 'Tuck Planche Hold', category: 'skill', type: 'isometric', description: 'Hold tuck planche position on fingers with knees tucked to chest', formCues: ['Lean shoulders forward past hands', 'Push down through fingers', 'Lock elbows straight', 'Tuck knees tight to chest', 'Protract shoulders fully', 'Look at hands'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 5, targetHoldMax: 12, restSeconds: 180 },
          { id: 'p1-adv-tuck-planche', name: 'Advanced Tuck Planche Hold', category: 'skill', type: 'isometric', description: 'Hold advanced tuck with back flat and hips pushed away from hands', formCues: ['Back must be flat, not rounded', 'Hips pushed away from hands', 'Arms completely straight', 'Shoulders protracted', 'Core braced tight'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 3, targetHoldMax: 8, restSeconds: 180 },
          { id: 'p1-pppu', name: 'Pseudo Planche Push-ups', category: 'accessory', type: 'dynamic', description: 'Push-ups with hands positioned lower toward waist to increase lean', formCues: ['Hands positioned at waist level', 'Lean shoulders past hands', 'Elbows tucked to sides', 'Full range of motion', 'Maintain hollow body'], targetSets: 3, targetRepsMin: 6, targetRepsMax: 12, targetHoldMin: null, targetHoldMax: null, restSeconds: 120 },
          { id: 'p1-planche-leans', name: 'Planche Leans (Tuck)', category: 'accessory', type: 'isometric', description: 'Lean forward in tuck position to build straight-arm strength', formCues: ['Lean as far forward as possible', 'Keep arms locked straight', 'Maintain tuck position', 'Protract shoulders hard', 'Hold for time'], targetSets: 3, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 10, targetHoldMax: 20, restSeconds: 120 },
          { id: 'p1-scap-pushups', name: 'Scapular Push-ups', category: 'accessory', type: 'dynamic', description: 'Push-ups focusing on scapular protraction and retraction', formCues: ['Arms stay straight', 'Only shoulder blades move', 'Push floor away (protraction)', 'Let chest sink (retraction)', 'Full range of motion'], targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, targetHoldMin: null, targetHoldMax: null, restSeconds: 90 },
          { id: 'p1-hollow-body', name: 'Hollow Body Hold', category: 'core', type: 'isometric', description: 'Lying on back, lift shoulders and legs while pressing lower back into floor', formCues: ['Lower back pressed into floor', 'Arms extended overhead', 'Legs straight and together', 'Core fully braced', 'Breathe steadily'], targetSets: 3, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 15, targetHoldMax: 30, restSeconds: 60 },
        ],
      },
      {
        id: 'planche-stage-2',
        stageNumber: 2,
        name: 'Straddle Planche',
        goalDescription: 'Achieve a consistent 5-10 second Straddle Planche hold with perfect form',
        startMonth: 7,
        endMonth: 15,
        targetHoldMin: 5,
        targetHoldMax: 10,
        exercises: [
          { id: 'p2-straddle-planche', name: 'Straddle Planche Hold', category: 'skill', type: 'isometric', description: 'Hold straddle planche with legs apart, straight arms', formCues: ['Arms completely locked', 'Shoulders protracted', 'Back flat', 'Legs straddled wide', 'Hips at shoulder height'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 3, targetHoldMax: 8, restSeconds: 180 },
          { id: 'p2-straddle-leans', name: 'Straddle Planche Leans', category: 'accessory', type: 'isometric', description: 'Lean forward in straddle position to build leverage strength', formCues: ['Legs straddled', 'Lean as far forward as possible', 'Keep arms locked', 'Protract shoulders', 'Build time gradually'], targetSets: 3, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 8, targetHoldMax: 15, restSeconds: 120 },
          { id: 'p2-band-straddle', name: 'Band-Assisted Straddle Planche', category: 'accessory', type: 'isometric', description: 'Straddle planche with resistance band assistance', formCues: ['Use light band around hips', 'Focus on holding position', 'Progress to thinner bands', 'Arms locked straight'], targetSets: 3, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 8, targetHoldMax: 15, restSeconds: 180 },
          { id: 'p2-adv-pppu', name: 'Advanced PPPU (Increased Lean)', category: 'accessory', type: 'dynamic', description: 'Pseudo planche push-ups with greater lean angle', formCues: ['Hands at waist level', 'Maximum lean forward', 'Elbows tucked', 'Full ROM', 'Body stays straight'], targetSets: 3, targetRepsMin: 5, targetRepsMax: 10, targetHoldMin: null, targetHoldMax: null, restSeconds: 120 },
          { id: 'p2-planche-negatives', name: 'Planche Negatives (Tuck to Straddle)', category: 'accessory', type: 'eccentric', description: 'Slowly lower from tuck to straddle planche position', formCues: ['Start in tuck planche', 'Slowly open legs to straddle', 'Control the descent', 'Maintain straight arms', '5+ second negative'], targetSets: 3, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 5, targetHoldMax: 10, restSeconds: 180 },
          { id: 'p2-l-sit', name: 'L-Sit Hold', category: 'core', type: 'isometric', description: 'Hold L-sit position on floor or parallettes', formCues: ['Legs straight and together', 'Hips at 90 degrees', 'Push down through hands', 'Core engaged', 'Chest up'], targetSets: 3, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 15, targetHoldMax: 30, restSeconds: 60 },
        ],
      },
      {
        id: 'planche-stage-3',
        stageNumber: 3,
        name: 'Full Planche',
        goalDescription: 'Achieve a 3-5 second Full Planche hold with legs together and straight body',
        startMonth: 16,
        endMonth: 24,
        targetHoldMin: 3,
        targetHoldMax: 5,
        exercises: [
          { id: 'p3-full-planche', name: 'Full Planche Hold', category: 'skill', type: 'isometric', description: 'Hold full planche with legs together and body straight', formCues: ['Legs together, straight', 'Arms completely locked', 'Hips at shoulder height', 'Full body tension', 'Protract shoulders maximally'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 2, targetHoldMax: 5, restSeconds: 240 },
          { id: 'p3-planche-eccentrics', name: 'Full Planche Eccentrics', category: 'accessory', type: 'eccentric', description: 'Slow negative from handstand to planche or straddle to full', formCues: ['Controlled descent', '5-10 second negative', 'Arms stay locked', 'Keep body tension', 'Use spotter if needed'], targetSets: 3, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 5, targetHoldMax: 10, restSeconds: 240 },
          { id: 'p3-extreme-pppu', name: 'Extreme PPPU (Elevated Feet)', category: 'accessory', type: 'dynamic', description: 'Pseudo planche push-ups with feet elevated and extreme lean', formCues: ['Feet elevated on block', 'Maximum forward lean', 'Hands at waist', 'Full ROM', 'Maintain straight body'], targetSets: 3, targetRepsMin: 4, targetRepsMax: 8, targetHoldMin: null, targetHoldMax: null, restSeconds: 120 },
          { id: 'p3-planche-press', name: 'Planche Press (Tuck/Straddle to Handstand)', category: 'accessory', type: 'dynamic', description: 'Press from planche position to handstand', formCues: ['Start in planche', 'Press up to handstand', 'Controlled movement', 'Arms stay locked', 'Use wall for safety'], targetSets: 3, targetRepsMin: 1, targetRepsMax: 3, targetHoldMin: null, targetHoldMax: null, restSeconds: 180 },
          { id: 'p3-v-ups', name: 'V-Ups', category: 'core', type: 'dynamic', description: 'Lie flat then touch toes with hands while keeping legs straight', formCues: ['Legs straight', 'Touch toes with hands', 'Controlled movement', 'Full extension at bottom', 'Core engaged throughout'], targetSets: 3, targetRepsMin: 8, targetRepsMax: 15, targetHoldMin: null, targetHoldMax: null, restSeconds: 60 },
        ],
      },
      {
        id: 'planche-stage-4',
        stageNumber: 4,
        name: 'Mastering Full Planche',
        goalDescription: 'Achieve a consistent 10+ second Full Planche hold and integrate dynamic elements',
        startMonth: 25,
        endMonth: 30,
        targetHoldMin: 10,
        targetHoldMax: 15,
        exercises: [
          { id: 'p4-full-planche-hold', name: 'Sustained Full Planche Hold', category: 'skill', type: 'isometric', description: 'Hold full planche for maximum time, focusing on consistency', formCues: ['Perfect form every rep', 'Legs together', 'Arms locked', 'Build endurance', 'Multiple sets'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 5, targetHoldMax: 12, restSeconds: 240 },
          { id: 'p4-planche-pushups', name: 'Planche Push-ups', category: 'skill', type: 'dynamic', description: 'Push-ups performed in full planche position', formCues: ['Start in full planche', 'Bend arms while maintaining position', 'Push back up', 'Controlled movement', 'Full ROM'], targetSets: 3, targetRepsMin: 1, targetRepsMax: 5, targetHoldMin: null, targetHoldMax: null, restSeconds: 240 },
          { id: 'p4-planche-transitions', name: 'Planche to Handstand Transitions', category: 'skill', type: 'dynamic', description: 'Dynamic transitions between planche and handstand', formCues: ['Start in planche', 'Press to handstand', 'Lower back to planche', 'Smooth transitions', 'Build flow'], targetSets: 3, targetRepsMin: 1, targetRepsMax: 3, targetHoldMin: null, targetHoldMax: null, restSeconds: 180 },
          { id: 'p4-hollow-body-advanced', name: 'Hollow Body Rocks', category: 'core', type: 'dynamic', description: 'Hollow body position with controlled rocking motion', formCues: ['Maintain hollow body', 'Rock from shoulders to hips', 'No piking at hips', 'Arms overhead', 'Continuous tension'], targetSets: 3, targetRepsMin: 15, targetRepsMax: 30, targetHoldMin: null, targetHoldMax: null, restSeconds: 60 },
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
        targetHoldMin: 15,
        targetHoldMax: 20,
        exercises: [
          { id: 'fl1-adv-tuck-fl', name: 'Advanced Tuck Front Lever Hold', category: 'skill', type: 'isometric', description: 'Hold advanced tuck front lever with back flat and hips extended', formCues: ['Hang from bar with straight arms', 'Lift body to horizontal', 'Back flat, not rounded', 'Hips extended past 90°', 'Retract shoulders', 'Core braced tight'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 5, targetHoldMax: 12, restSeconds: 180 },
          { id: 'fl1-one-leg-fl', name: 'One-Leg Front Lever Hold', category: 'skill', type: 'isometric', description: 'Front lever with one leg extended, one leg tucked', formCues: ['One leg straight, one tucked', 'Keep arms locked', 'Body horizontal', 'Retract shoulders', 'Switch legs each set'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 3, targetHoldMax: 8, restSeconds: 180 },
          { id: 'fl1-fl-raises', name: 'Front Lever Raises (Adv Tuck)', category: 'accessory', type: 'dynamic', description: 'Raise from hang to advanced tuck front lever position repeatedly', formCues: ['Start from dead hang', 'Raise to FL position', 'Control the movement', 'Arms stay straight', 'Pull with lats'], targetSets: 3, targetRepsMin: 5, targetRepsMax: 8, targetHoldMin: null, targetHoldMax: null, restSeconds: 120 },
          { id: 'fl1-fl-rows', name: 'Front Lever Rows (Adv Tuck)', category: 'accessory', type: 'dynamic', description: 'Rows performed in advanced tuck front lever position', formCues: ['Maintain FL position', 'Pull chest to bar', 'Arms bend and extend', 'Keep body horizontal', 'Control the movement'], targetSets: 3, targetRepsMin: 5, targetRepsMax: 10, targetHoldMin: null, targetHoldMax: null, restSeconds: 120 },
          { id: 'fl1-scap-pulls', name: 'Scapular Pulls', category: 'accessory', type: 'dynamic', description: 'Hanging from bar, pull shoulder blades down and together', formCues: ['Arms stay straight', 'Only scapulae move', 'Pull shoulders down', 'Squeeze lats', 'Full range of motion'], targetSets: 3, targetRepsMin: 10, targetRepsMax: 15, targetHoldMin: null, targetHoldMax: null, restSeconds: 90 },
          { id: 'fl1-hanging-leg-raises', name: 'Hanging Leg Raises', category: 'core', type: 'dynamic', description: 'Hang from bar and raise straight legs to bar height', formCues: ['Arms straight', 'Legs straight and together', 'Raise to bar height', 'Control the descent', 'No swinging'], targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetHoldMin: null, targetHoldMax: null, restSeconds: 60 },
        ],
      },
      {
        id: 'fl-stage-2',
        stageNumber: 2,
        name: 'Straddle Front Lever',
        goalDescription: 'Achieve a consistent 10-15 second Straddle Front Lever hold with perfect form',
        startMonth: 7,
        endMonth: 15,
        targetHoldMin: 10,
        targetHoldMax: 15,
        exercises: [
          { id: 'fl2-straddle-fl', name: 'Straddle Front Lever Hold', category: 'skill', type: 'isometric', description: 'Hold straddle front lever with legs apart and body horizontal', formCues: ['Legs straddled wide', 'Arms locked straight', 'Body horizontal', 'Shoulders retracted', 'Core engaged'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 3, targetHoldMax: 10, restSeconds: 180 },
          { id: 'fl2-straddle-fl-rows', name: 'Straddle FL Rows', category: 'accessory', type: 'dynamic', description: 'Rows performed in straddle front lever position', formCues: ['Maintain straddle FL', 'Pull chest to bar', 'Control the movement', 'Keep body horizontal', 'Legs stay straddled'], targetSets: 3, targetRepsMin: 4, targetRepsMax: 8, targetHoldMin: null, targetHoldMax: null, restSeconds: 120 },
          { id: 'fl2-band-straddle-fl', name: 'Band-Assisted Straddle FL', category: 'accessory', type: 'isometric', description: 'Straddle front lever with resistance band assistance', formCues: ['Use light band for assistance', 'Focus on position quality', 'Progress to thinner bands', 'Arms stay straight'], targetSets: 3, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 8, targetHoldMax: 15, restSeconds: 180 },
          { id: 'fl2-ice-cream-makers', name: 'Ice Cream Makers', category: 'accessory', type: 'dynamic', description: 'From front lever, extend arms to invert, then return to FL', formCues: ['Start in FL position', 'Extend to inverted hang', 'Return to FL', 'Controlled movement', 'Arms stay straight'], targetSets: 3, targetRepsMin: 3, targetRepsMax: 6, targetHoldMin: null, targetHoldMax: null, restSeconds: 120 },
          { id: 'fl2-pullups-hard', name: 'Advanced Pull-up Variations', category: 'accessory', type: 'dynamic', description: 'Harder pull-up variations (L-sit pull-ups, wide grip)', formCues: ['Full range of motion', 'Control the negative', 'Squeeze at top', 'Vary grip width', 'Add pause at top'], targetSets: 3, targetRepsMin: 6, targetRepsMax: 12, targetHoldMin: null, targetHoldMax: null, restSeconds: 120 },
          { id: 'fl2-hanging-leg-raises-adv', name: 'Hanging Leg Raises (Weighted)', category: 'core', type: 'dynamic', description: 'Hanging leg raises with added weight between feet', formCues: ['Add light weight between feet', 'Legs straight', 'Raise to bar height', 'Control the descent', 'No swinging'], targetSets: 3, targetRepsMin: 6, targetRepsMax: 10, targetHoldMin: null, targetHoldMax: null, restSeconds: 60 },
        ],
      },
      {
        id: 'fl-stage-3',
        stageNumber: 3,
        name: 'Full Front Lever',
        goalDescription: 'Achieve a 5-10 second Full Front Lever hold with legs together and straight body',
        startMonth: 16,
        endMonth: 24,
        targetHoldMin: 5,
        targetHoldMax: 10,
        exercises: [
          { id: 'fl3-full-fl', name: 'Full Front Lever Hold', category: 'skill', type: 'isometric', description: 'Hold full front lever with legs together and body completely horizontal', formCues: ['Legs together, straight', 'Body completely horizontal', 'Arms locked', 'Shoulders retracted', 'Full body tension'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 2, targetHoldMax: 8, restSeconds: 240 },
          { id: 'fl3-fl-negatives', name: 'Full Front Lever Negatives', category: 'accessory', type: 'eccentric', description: 'Slowly lower from inverted hang to full front lever', formCues: ['Start inverted', 'Slow descent to FL', '5-10 second negative', 'Arms locked', 'Control every inch'], targetSets: 3, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 5, targetHoldMax: 10, restSeconds: 240 },
          { id: 'fl3-weighted-pullups', name: 'Weighted Pull-ups', category: 'accessory', type: 'dynamic', description: 'Pull-ups with added weight for building pulling strength', formCues: ['Full ROM', 'Control the negative', 'Add weight progressively', 'Squeeze lats at top', 'Use dip belt or backpack'], targetSets: 3, targetRepsMin: 5, targetRepsMax: 8, targetHoldMin: null, targetHoldMax: null, restSeconds: 150 },
          { id: 'fl3-straight-arm-pulldowns', name: 'Straight Arm Pulldowns (Band)', category: 'accessory', type: 'dynamic', description: 'Pulldowns with straight arms using resistance band', formCues: ['Arms stay straight', 'Pull band down to hips', 'Squeeze lats', 'Control the return', 'Full ROM'], targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, targetHoldMin: null, targetHoldMax: null, restSeconds: 90 },
          { id: 'fl3-dragon-flags', name: 'Dragon Flags', category: 'core', type: 'eccentric', description: 'Lie on bench/ground, grip behind head, lower straight body', formCues: ['Body stays straight', 'Lower slowly', 'Only shoulders touch bench', 'Control the movement', 'Core braced tight'], targetSets: 3, targetRepsMin: 5, targetRepsMax: 8, targetHoldMin: null, targetHoldMax: null, restSeconds: 90 },
        ],
      },
      {
        id: 'fl-stage-4',
        stageNumber: 4,
        name: 'Mastering Full Front Lever',
        goalDescription: 'Achieve a consistent 15+ second Full Front Lever hold and integrate dynamic elements',
        startMonth: 25,
        endMonth: 30,
        targetHoldMin: 15,
        targetHoldMax: 20,
        exercises: [
          { id: 'fl4-sustained-fl', name: 'Sustained Full FL Hold', category: 'skill', type: 'isometric', description: 'Hold full front lever for maximum time, focusing on endurance', formCues: ['Perfect form every rep', 'Legs together', 'Arms locked', 'Build endurance', 'Multiple sets'], targetSets: 4, targetRepsMin: null, targetRepsMax: null, targetHoldMin: 8, targetHoldMax: 15, restSeconds: 240 },
          { id: 'fl4-fl-pullups', name: 'Front Lever Pull-ups', category: 'skill', type: 'dynamic', description: 'Pull-ups performed in full front lever position', formCues: ['Maintain FL position', 'Pull chest to bar', 'Bend arms while horizontal', 'Full ROM', 'Controlled movement'], targetSets: 3, targetRepsMin: 1, targetRepsMax: 5, targetHoldMin: null, targetHoldMax: null, restSeconds: 240 },
          { id: 'fl4-fl-transitions', name: 'FL Transitions', category: 'skill', type: 'dynamic', description: 'Dynamic transitions between FL variations', formCues: ['Move between FL positions', 'Smooth transitions', 'Maintain tension', 'Build flow', 'Full control'], targetSets: 3, targetRepsMin: 2, targetRepsMax: 5, targetHoldMin: null, targetHoldMax: null, restSeconds: 180 },
          { id: 'fl4-hollow-body-adv', name: 'Hollow Body Rocks (Weighted)', category: 'core', type: 'dynamic', description: 'Hollow body rocks with weight held behind head', formCues: ['Hold light weight behind head', 'Maintain hollow body', 'Rock from shoulders to hips', 'Continuous tension', 'Full control'], targetSets: 3, targetRepsMin: 10, targetRepsMax: 20, targetHoldMin: null, targetHoldMax: null, restSeconds: 60 },
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
    focusStageNum = profile.plancheStage
  } else {
    dayType = 'fl_focus'
    focusSkill = 'front_lever'
    focusStageNum = profile.flStage
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
    const plancheStage = plancheSkill.stages.find(s => s.stageNumber === profile.plancheStage)
    const flStage = flSkill.stages.find(s => s.stageNumber === profile.flStage)
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

  return {
    totalWorkouts: completedSessions,
    plancheMaxHold: plancheMaxHold?.maxHoldSeconds ?? null,
    plancheMaxHoldName: plancheMaxHold?.exerciseName ?? null,
    flMaxHold: flMaxHold?.maxHoldSeconds ?? null,
    flMaxHoldName: flMaxHold?.exerciseName ?? null,
    thisWeekSessions,
    weekNumber,
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
  const plancheStageInfo = plancheSkill.stages.find(s => s.stageNumber === profile.plancheStage)
  const flStageInfo = flSkill.stages.find(s => s.stageNumber === profile.flStage)

  const stageProgress = {
    monthsElapsed,
    planche: plancheStageInfo
      ? {
          stageNumber: profile.plancheStage,
          name: plancheStageInfo.name,
          goalDescription: plancheStageInfo.goalDescription,
          startMonth: plancheStageInfo.startMonth,
          endMonth: plancheStageInfo.endMonth,
          progressInStage: Math.min(
            100,
            Math.max(
              0,
              Math.round(
                ((monthsElapsed - plancheStageInfo.startMonth) /
                  (plancheStageInfo.endMonth - plancheStageInfo.startMonth)) *
                  100
              )
            )
          ),
        }
      : null,
    frontLever: flStageInfo
      ? {
          stageNumber: profile.flStage,
          name: flStageInfo.name,
          goalDescription: flStageInfo.goalDescription,
          startMonth: flStageInfo.startMonth,
          endMonth: flStageInfo.endMonth,
          progressInStage: Math.min(
            100,
            Math.max(
              0,
              Math.round(
                ((monthsElapsed - flStageInfo.startMonth) /
                  (flStageInfo.endMonth - flStageInfo.startMonth)) *
                  100
              )
            )
          ),
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
