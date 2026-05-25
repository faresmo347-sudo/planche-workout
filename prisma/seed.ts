import { db } from '@/lib/db'

async function main() {
  // Create user profile
  await db.userProfile.upsert({
    where: { id: 'default-user' },
    update: {},
    create: {
      id: 'default-user',
      age: 16,
      heightCm: 175,
      weightKg: 70,
      pullUpsMax: 15,
      muscleUpsMax: 3,
      pushUpsMax: 48,
      plancheStage: 1,
      flStage: 1,
      startDate: new Date(),
    },
  })

  // Create Skills
  const planche = await db.skill.upsert({
    where: { name: 'planche' },
    update: {},
    create: {
      name: 'planche',
      label: 'Planche',
      icon: 'circle-dot',
    },
  })

  const frontLever = await db.skill.upsert({
    where: { name: 'front_lever' },
    update: {},
    create: {
      name: 'front_lever',
      label: 'Front Lever',
      icon: 'grip-horizontal',
    },
  })

  // ============ PLANCHE STAGES & EXERCISES ============
  
  // Stage 1: Tuck & Advanced Tuck Planche (Months 1-6)
  const plancheStage1 = await db.stage.upsert({
    where: { id: 'planche-stage-1' },
    update: {},
    create: {
      id: 'planche-stage-1',
      skillId: planche.id,
      stageNumber: 1,
      name: 'Tuck & Advanced Tuck Planche',
      goalDescription: 'Achieve a consistent 15-20 second Tuck Planche hold and progress to a 5-10 second Advanced Tuck Planche hold',
      startMonth: 1,
      endMonth: 6,
      targetHoldMin: 15,
      targetHoldMax: 20,
    },
  })

  const plancheS1Exercises = [
    {
      id: 'p1-tuck-planche',
      name: 'Tuck Planche Hold',
      category: 'skill',
      type: 'isometric',
      description: 'Hold tuck planche position on fingers with knees tucked to chest',
      formCues: JSON.stringify(['Lean shoulders forward past hands', 'Push down through fingers', 'Lock elbows straight', 'Tuck knees tight to chest', 'Protract shoulders fully', 'Look at hands']),
      targetSetsMin: 4, targetSetsMax: 6,
      targetHoldMin: 5, targetHoldMax: 12,
      restSeconds: 180,
      progressionOrder: 1,
    },
    {
      id: 'p1-adv-tuck-planche',
      name: 'Advanced Tuck Planche Hold',
      category: 'skill',
      type: 'isometric',
      description: 'Hold advanced tuck with back flat and hips pushed away from hands',
      formCues: JSON.stringify(['Back must be flat, not rounded', 'Hips pushed away from hands', 'Arms completely straight', 'Shoulders protracted', 'Core braced tight']),
      targetSetsMin: 4, targetSetsMax: 6,
      targetHoldMin: 3, targetHoldMax: 8,
      restSeconds: 180,
      progressionOrder: 2,
    },
    {
      id: 'p1-pppu',
      name: 'Pseudo Planche Push-ups',
      category: 'accessory',
      type: 'dynamic',
      description: 'Push-ups with hands positioned lower toward waist to increase lean',
      formCues: JSON.stringify(['Hands positioned at waist level', 'Lean shoulders past hands', 'Elbows tucked to sides', 'Full range of motion', 'Maintain hollow body']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 6, targetRepsMax: 12,
      restSeconds: 120,
      progressionOrder: 3,
    },
    {
      id: 'p1-planche-leans',
      name: 'Planche Leans (Tuck)',
      category: 'accessory',
      type: 'isometric',
      description: 'Lean forward in tuck position to build straight-arm strength',
      formCues: JSON.stringify(['Lean as far forward as possible', 'Keep arms locked straight', 'Maintain tuck position', 'Protract shoulders hard', 'Hold for time']),
      targetSetsMin: 3, targetSetsMax: 5,
      targetHoldMin: 10, targetHoldMax: 20,
      restSeconds: 120,
      progressionOrder: 4,
    },
    {
      id: 'p1-scap-pushups',
      name: 'Scapular Push-ups',
      category: 'accessory',
      type: 'dynamic',
      description: 'Push-ups focusing on scapular protraction and retraction',
      formCues: JSON.stringify(['Arms stay straight', 'Only shoulder blades move', 'Push floor away (protraction)', 'Let chest sink (retraction)', 'Full range of motion']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 10, targetRepsMax: 15,
      restSeconds: 90,
      progressionOrder: 5,
    },
    {
      id: 'p1-hollow-body',
      name: 'Hollow Body Hold',
      category: 'core',
      type: 'isometric',
      description: 'Lying on back, lift shoulders and legs while pressing lower back into floor',
      formCues: JSON.stringify(['Lower back pressed into floor', 'Arms extended overhead', 'Legs straight and together', 'Core fully braced', 'Breathe steadily']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetHoldMin: 15, targetHoldMax: 30,
      restSeconds: 60,
      progressionOrder: 6,
    },
  ]

  for (const ex of plancheS1Exercises) {
    await db.exercise.upsert({
      where: { id: ex.id },
      update: {},
      create: { ...ex, stageId: plancheStage1.id },
    })
  }

  // Stage 2: Straddle Planche (Months 7-15)
  const plancheStage2 = await db.stage.upsert({
    where: { id: 'planche-stage-2' },
    update: {},
    create: {
      id: 'planche-stage-2',
      skillId: planche.id,
      stageNumber: 2,
      name: 'Straddle Planche',
      goalDescription: 'Achieve a consistent 5-10 second Straddle Planche hold with perfect form',
      startMonth: 7,
      endMonth: 15,
      targetHoldMin: 5,
      targetHoldMax: 10,
    },
  })

  const plancheS2Exercises = [
    {
      id: 'p2-straddle-planche',
      name: 'Straddle Planche Hold',
      category: 'skill',
      type: 'isometric',
      description: 'Hold straddle planche with legs apart, straight arms',
      formCues: JSON.stringify(['Arms completely locked', 'Shoulders protracted', 'Back flat', 'Legs straddled wide', 'Hips at shoulder height']),
      targetSetsMin: 4, targetSetsMax: 6,
      targetHoldMin: 3, targetHoldMax: 8,
      restSeconds: 180,
      progressionOrder: 1,
    },
    {
      id: 'p2-straddle-leans',
      name: 'Straddle Planche Leans',
      category: 'accessory',
      type: 'isometric',
      description: 'Lean forward in straddle position to build leverage strength',
      formCues: JSON.stringify(['Legs straddled', 'Lean as far forward as possible', 'Keep arms locked', 'Protract shoulders', 'Build time gradually']),
      targetSetsMin: 3, targetSetsMax: 5,
      targetHoldMin: 8, targetHoldMax: 15,
      restSeconds: 120,
      progressionOrder: 2,
    },
    {
      id: 'p2-band-straddle',
      name: 'Band-Assisted Straddle Planche',
      category: 'accessory',
      type: 'isometric',
      description: 'Straddle planche with resistance band assistance',
      formCues: JSON.stringify(['Use light band around hips', 'Focus on holding position', 'Progress to thinner bands', 'Arms locked straight']),
      targetSetsMin: 3, targetSetsMax: 5,
      targetHoldMin: 8, targetHoldMax: 15,
      restSeconds: 180,
      progressionOrder: 3,
    },
    {
      id: 'p2-adv-pppu',
      name: 'Advanced PPPU (Increased Lean)',
      category: 'accessory',
      type: 'dynamic',
      description: 'Pseudo planche push-ups with greater lean angle',
      formCues: JSON.stringify(['Hands at waist level', 'Maximum lean forward', 'Elbows tucked', 'Full ROM', 'Body stays straight']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 5, targetRepsMax: 10,
      restSeconds: 120,
      progressionOrder: 4,
    },
    {
      id: 'p2-planche-negatives',
      name: 'Planche Negatives (Tuck to Straddle)',
      category: 'accessory',
      type: 'eccentric',
      description: 'Slowly lower from tuck to straddle planche position',
      formCues: JSON.stringify(['Start in tuck planche', 'Slowly open legs to straddle', 'Control the descent', 'Maintain straight arms', '5+ second negative']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetHoldMin: 5, targetHoldMax: 10,
      restSeconds: 180,
      progressionOrder: 5,
    },
    {
      id: 'p2-l-sit',
      name: 'L-Sit Hold',
      category: 'core',
      type: 'isometric',
      description: 'Hold L-sit position on floor or parallettes',
      formCues: JSON.stringify(['Legs straight and together', 'Hips at 90 degrees', 'Push down through hands', 'Core engaged', 'Chest up']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetHoldMin: 15, targetHoldMax: 30,
      restSeconds: 60,
      progressionOrder: 6,
    },
  ]

  for (const ex of plancheS2Exercises) {
    await db.exercise.upsert({
      where: { id: ex.id },
      update: {},
      create: { ...ex, stageId: plancheStage2.id },
    })
  }

  // Stage 3: Full Planche (Months 16-24)
  const plancheStage3 = await db.stage.upsert({
    where: { id: 'planche-stage-3' },
    update: {},
    create: {
      id: 'planche-stage-3',
      skillId: planche.id,
      stageNumber: 3,
      name: 'Full Planche',
      goalDescription: 'Achieve a 3-5 second Full Planche hold with legs together and straight body',
      startMonth: 16,
      endMonth: 24,
      targetHoldMin: 3,
      targetHoldMax: 5,
    },
  })

  const plancheS3Exercises = [
    {
      id: 'p3-full-planche',
      name: 'Full Planche Hold',
      category: 'skill',
      type: 'isometric',
      description: 'Hold full planche with legs together and body straight',
      formCues: JSON.stringify(['Legs together, straight', 'Arms completely locked', 'Hips at shoulder height', 'Full body tension', 'Protract shoulders maximally']),
      targetSetsMin: 4, targetSetsMax: 6,
      targetHoldMin: 2, targetHoldMax: 5,
      restSeconds: 240,
      progressionOrder: 1,
    },
    {
      id: 'p3-planche-eccentrics',
      name: 'Full Planche Eccentrics',
      category: 'accessory',
      type: 'eccentric',
      description: 'Slow negative from handstand to planche or straddle to full',
      formCues: JSON.stringify(['Controlled descent', '5-10 second negative', 'Arms stay locked', 'Keep body tension', 'Use spotter if needed']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetHoldMin: 5, targetHoldMax: 10,
      restSeconds: 240,
      progressionOrder: 2,
    },
    {
      id: 'p3-extreme-pppu',
      name: 'Extreme PPPU (Elevated Feet)',
      category: 'accessory',
      type: 'dynamic',
      description: 'Pseudo planche push-ups with feet elevated and extreme lean',
      formCues: JSON.stringify(['Feet elevated on block', 'Maximum forward lean', 'Hands at waist', 'Full ROM', 'Maintain straight body']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 4, targetRepsMax: 8,
      restSeconds: 120,
      progressionOrder: 3,
    },
    {
      id: 'p3-planche-press',
      name: 'Planche Press (Tuck/Straddle to Handstand)',
      category: 'accessory',
      type: 'dynamic',
      description: 'Press from planche position to handstand',
      formCues: JSON.stringify(['Start in planche', 'Press up to handstand', 'Controlled movement', 'Arms stay locked', 'Use wall for safety']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 1, targetRepsMax: 3,
      restSeconds: 180,
      progressionOrder: 4,
    },
    {
      id: 'p3-v-ups',
      name: 'V-Ups',
      category: 'core',
      type: 'dynamic',
      description: 'Lie flat then touch toes with hands while keeping legs straight',
      formCues: JSON.stringify(['Legs straight', 'Touch toes with hands', 'Controlled movement', 'Full extension at bottom', 'Core engaged throughout']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 8, targetRepsMax: 15,
      restSeconds: 60,
      progressionOrder: 5,
    },
  ]

  for (const ex of plancheS3Exercises) {
    await db.exercise.upsert({
      where: { id: ex.id },
      update: {},
      create: { ...ex, stageId: plancheStage3.id },
    })
  }

  // Stage 4: Mastering Full Planche (Months 25-30)
  const plancheStage4 = await db.stage.upsert({
    where: { id: 'planche-stage-4' },
    update: {},
    create: {
      id: 'planche-stage-4',
      skillId: planche.id,
      stageNumber: 4,
      name: 'Mastering Full Planche',
      goalDescription: 'Achieve a consistent 10+ second Full Planche hold and integrate dynamic elements',
      startMonth: 25,
      endMonth: 30,
      targetHoldMin: 10,
      targetHoldMax: 15,
    },
  })

  const plancheS4Exercises = [
    {
      id: 'p4-full-planche-hold',
      name: 'Sustained Full Planche Hold',
      category: 'skill',
      type: 'isometric',
      description: 'Hold full planche for maximum time, focusing on consistency',
      formCues: JSON.stringify(['Perfect form every rep', 'Legs together', 'Arms locked', 'Build endurance', 'Multiple sets']),
      targetSetsMin: 4, targetSetsMax: 6,
      targetHoldMin: 5, targetHoldMax: 12,
      restSeconds: 240,
      progressionOrder: 1,
    },
    {
      id: 'p4-planche-pushups',
      name: 'Planche Push-ups',
      category: 'skill',
      type: 'dynamic',
      description: 'Push-ups performed in full planche position',
      formCues: JSON.stringify(['Start in full planche', 'Bend arms while maintaining position', 'Push back up', 'Controlled movement', 'Full ROM']),
      targetSetsMin: 3, targetSetsMax: 5,
      targetRepsMin: 1, targetRepsMax: 5,
      restSeconds: 240,
      progressionOrder: 2,
    },
    {
      id: 'p4-planche-transitions',
      name: 'Planche to Handstand Transitions',
      category: 'skill',
      type: 'dynamic',
      description: 'Dynamic transitions between planche and handstand',
      formCues: JSON.stringify(['Start in planche', 'Press to handstand', 'Lower back to planche', 'Smooth transitions', 'Build flow']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 1, targetRepsMax: 3,
      restSeconds: 180,
      progressionOrder: 3,
    },
    {
      id: 'p4-hollow-body-advanced',
      name: 'Hollow Body Rocks',
      category: 'core',
      type: 'dynamic',
      description: 'Hollow body position with controlled rocking motion',
      formCues: JSON.stringify(['Maintain hollow body', 'Rock from shoulders to hips', 'No piking at hips', 'Arms overhead', 'Continuous tension']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 15, targetRepsMax: 30,
      restSeconds: 60,
      progressionOrder: 4,
    },
  ]

  for (const ex of plancheS4Exercises) {
    await db.exercise.upsert({
      where: { id: ex.id },
      update: {},
      create: { ...ex, stageId: plancheStage4.id },
    })
  }

  // ============ FRONT LEVER STAGES & EXERCISES ============
  
  // Stage 1: Advanced Tuck to One-Leg FL (Months 1-6)
  const flStage1 = await db.stage.upsert({
    where: { id: 'fl-stage-1' },
    update: {},
    create: {
      id: 'fl-stage-1',
      skillId: frontLever.id,
      stageNumber: 1,
      name: 'Advanced Tuck to One-Leg FL',
      goalDescription: 'Achieve a consistent 15-20 second Advanced Tuck FL hold and progress to a 5-10 second One-Leg FL hold',
      startMonth: 1,
      endMonth: 6,
      targetHoldMin: 15,
      targetHoldMax: 20,
    },
  })

  const flS1Exercises = [
    {
      id: 'fl1-adv-tuck-fl',
      name: 'Advanced Tuck Front Lever Hold',
      category: 'skill',
      type: 'isometric',
      description: 'Hold advanced tuck front lever with back flat and hips extended',
      formCues: JSON.stringify(['Hang from bar with straight arms', 'Lift body to horizontal', 'Back flat, not rounded', 'Hips extended past 90°', 'Retract shoulders', 'Core braced tight']),
      targetSetsMin: 4, targetSetsMax: 6,
      targetHoldMin: 5, targetHoldMax: 12,
      restSeconds: 180,
      progressionOrder: 1,
    },
    {
      id: 'fl1-one-leg-fl',
      name: 'One-Leg Front Lever Hold',
      category: 'skill',
      type: 'isometric',
      description: 'Front lever with one leg extended, one leg tucked',
      formCues: JSON.stringify(['One leg straight, one tucked', 'Keep arms locked', 'Body horizontal', 'Retract shoulders', 'Switch legs each set']),
      targetSetsMin: 4, targetSetsMax: 6,
      targetHoldMin: 3, targetHoldMax: 8,
      restSeconds: 180,
      progressionOrder: 2,
    },
    {
      id: 'fl1-fl-raises',
      name: 'Front Lever Raises (Adv Tuck)',
      category: 'accessory',
      type: 'dynamic',
      description: 'Raise from hang to advanced tuck front lever position repeatedly',
      formCues: JSON.stringify(['Start from dead hang', 'Raise to FL position', 'Control the movement', 'Arms stay straight', 'Pull with lats']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 5, targetRepsMax: 8,
      restSeconds: 120,
      progressionOrder: 3,
    },
    {
      id: 'fl1-fl-rows',
      name: 'Front Lever Rows (Adv Tuck)',
      category: 'accessory',
      type: 'dynamic',
      description: 'Rows performed in advanced tuck front lever position',
      formCues: JSON.stringify(['Maintain FL position', 'Pull chest to bar', 'Arms bend and extend', 'Keep body horizontal', 'Control the movement']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 5, targetRepsMax: 10,
      restSeconds: 120,
      progressionOrder: 4,
    },
    {
      id: 'fl1-scap-pulls',
      name: 'Scapular Pulls',
      category: 'accessory',
      type: 'dynamic',
      description: 'Hanging from bar, pull shoulder blades down and together',
      formCues: JSON.stringify(['Arms stay straight', 'Only scapulae move', 'Pull shoulders down', 'Squeeze lats', 'Full range of motion']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 10, targetRepsMax: 15,
      restSeconds: 90,
      progressionOrder: 5,
    },
    {
      id: 'fl1-hanging-leg-raises',
      name: 'Hanging Leg Raises',
      category: 'core',
      type: 'dynamic',
      description: 'Hang from bar and raise straight legs to bar height',
      formCues: JSON.stringify(['Arms straight', 'Legs straight and together', 'Raise to bar height', 'Control the descent', 'No swinging']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 8, targetRepsMax: 12,
      restSeconds: 60,
      progressionOrder: 6,
    },
  ]

  for (const ex of flS1Exercises) {
    await db.exercise.upsert({
      where: { id: ex.id },
      update: {},
      create: { ...ex, stageId: flStage1.id },
    })
  }

  // Stage 2: Straddle Front Lever (Months 7-15)
  const flStage2 = await db.stage.upsert({
    where: { id: 'fl-stage-2' },
    update: {},
    create: {
      id: 'fl-stage-2',
      skillId: frontLever.id,
      stageNumber: 2,
      name: 'Straddle Front Lever',
      goalDescription: 'Achieve a consistent 10-15 second Straddle Front Lever hold with perfect form',
      startMonth: 7,
      endMonth: 15,
      targetHoldMin: 10,
      targetHoldMax: 15,
    },
  })

  const flS2Exercises = [
    {
      id: 'fl2-straddle-fl',
      name: 'Straddle Front Lever Hold',
      category: 'skill',
      type: 'isometric',
      description: 'Hold straddle front lever with legs apart and body horizontal',
      formCues: JSON.stringify(['Legs straddled wide', 'Arms locked straight', 'Body horizontal', 'Shoulders retracted', 'Core engaged']),
      targetSetsMin: 4, targetSetsMax: 6,
      targetHoldMin: 3, targetHoldMax: 10,
      restSeconds: 180,
      progressionOrder: 1,
    },
    {
      id: 'fl2-straddle-fl-rows',
      name: 'Straddle FL Rows',
      category: 'accessory',
      type: 'dynamic',
      description: 'Rows performed in straddle front lever position',
      formCues: JSON.stringify(['Maintain straddle FL', 'Pull chest to bar', 'Control the movement', 'Keep body horizontal', 'Legs stay straddled']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 4, targetRepsMax: 8,
      restSeconds: 120,
      progressionOrder: 2,
    },
    {
      id: 'fl2-band-straddle-fl',
      name: 'Band-Assisted Straddle FL',
      category: 'accessory',
      type: 'isometric',
      description: 'Straddle front lever with resistance band assistance',
      formCues: JSON.stringify(['Use light band for assistance', 'Focus on position quality', 'Progress to thinner bands', 'Arms stay straight']),
      targetSetsMin: 3, targetSetsMax: 5,
      targetHoldMin: 8, targetHoldMax: 15,
      restSeconds: 180,
      progressionOrder: 3,
    },
    {
      id: 'fl2-ice-cream-makers',
      name: 'Ice Cream Makers',
      category: 'accessory',
      type: 'dynamic',
      description: 'From front lever, extend arms to invert, then return to FL',
      formCues: JSON.stringify(['Start in FL position', 'Extend to inverted hang', 'Return to FL', 'Controlled movement', 'Arms stay straight']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 3, targetRepsMax: 6,
      restSeconds: 120,
      progressionOrder: 4,
    },
    {
      id: 'fl2-pullups-hard',
      name: 'Advanced Pull-up Variations',
      category: 'accessory',
      type: 'dynamic',
      description: 'Harder pull-up variations (L-sit pull-ups, wide grip)',
      formCues: JSON.stringify(['Full range of motion', 'Control the negative', 'Squeeze at top', 'Vary grip width', 'Add pause at top']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 6, targetRepsMax: 12,
      restSeconds: 120,
      progressionOrder: 5,
    },
    {
      id: 'fl2-hanging-leg-raises-adv',
      name: 'Hanging Leg Raises (Weighted)',
      category: 'core',
      type: 'dynamic',
      description: 'Hanging leg raises with added weight between feet',
      formCues: JSON.stringify(['Add light weight between feet', 'Legs straight', 'Raise to bar height', 'Control the descent', 'No swinging']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 6, targetRepsMax: 10,
      restSeconds: 60,
      progressionOrder: 6,
    },
  ]

  for (const ex of flS2Exercises) {
    await db.exercise.upsert({
      where: { id: ex.id },
      update: {},
      create: { ...ex, stageId: flStage2.id },
    })
  }

  // Stage 3: Full Front Lever (Months 16-24)
  const flStage3 = await db.stage.upsert({
    where: { id: 'fl-stage-3' },
    update: {},
    create: {
      id: 'fl-stage-3',
      skillId: frontLever.id,
      stageNumber: 3,
      name: 'Full Front Lever',
      goalDescription: 'Achieve a 5-10 second Full Front Lever hold with legs together and straight body',
      startMonth: 16,
      endMonth: 24,
      targetHoldMin: 5,
      targetHoldMax: 10,
    },
  })

  const flS3Exercises = [
    {
      id: 'fl3-full-fl',
      name: 'Full Front Lever Hold',
      category: 'skill',
      type: 'isometric',
      description: 'Hold full front lever with legs together and body completely horizontal',
      formCues: JSON.stringify(['Legs together, straight', 'Body completely horizontal', 'Arms locked', 'Shoulders retracted', 'Full body tension']),
      targetSetsMin: 4, targetSetsMax: 6,
      targetHoldMin: 2, targetHoldMax: 8,
      restSeconds: 240,
      progressionOrder: 1,
    },
    {
      id: 'fl3-fl-negatives',
      name: 'Full Front Lever Negatives',
      category: 'accessory',
      type: 'eccentric',
      description: 'Slowly lower from inverted hang to full front lever',
      formCues: JSON.stringify(['Start inverted', 'Slow descent to FL', '5-10 second negative', 'Arms locked', 'Control every inch']),
      targetSetsMin: 3, targetSetsMax: 5,
      targetHoldMin: 5, targetHoldMax: 10,
      restSeconds: 240,
      progressionOrder: 2,
    },
    {
      id: 'fl3-weighted-pullups',
      name: 'Weighted Pull-ups',
      category: 'accessory',
      type: 'dynamic',
      description: 'Pull-ups with added weight for building pulling strength',
      formCues: JSON.stringify(['Full ROM', 'Control the negative', 'Add weight progressively', 'Squeeze lats at top', 'Use dip belt or backpack']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 5, targetRepsMax: 8,
      restSeconds: 150,
      progressionOrder: 3,
    },
    {
      id: 'fl3-straight-arm-pulldowns',
      name: 'Straight Arm Pulldowns (Band)',
      category: 'accessory',
      type: 'dynamic',
      description: 'Pulldowns with straight arms using resistance band',
      formCues: JSON.stringify(['Arms stay straight', 'Pull band down to hips', 'Squeeze lats', 'Control the return', 'Full ROM']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 8, targetRepsMax: 12,
      restSeconds: 90,
      progressionOrder: 4,
    },
    {
      id: 'fl3-dragon-flags',
      name: 'Dragon Flags',
      category: 'core',
      type: 'eccentric',
      description: 'Lie on bench/ground, grip behind head, lower straight body',
      formCues: JSON.stringify(['Body stays straight', 'Lower slowly', 'Only shoulders touch bench', 'Control the movement', 'Core braced tight']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 5, targetRepsMax: 8,
      restSeconds: 90,
      progressionOrder: 5,
    },
  ]

  for (const ex of flS3Exercises) {
    await db.exercise.upsert({
      where: { id: ex.id },
      update: {},
      create: { ...ex, stageId: flStage3.id },
    })
  }

  // Stage 4: Mastering Full Front Lever (Months 25-30)
  const flStage4 = await db.stage.upsert({
    where: { id: 'fl-stage-4' },
    update: {},
    create: {
      id: 'fl-stage-4',
      skillId: frontLever.id,
      stageNumber: 4,
      name: 'Mastering Full Front Lever',
      goalDescription: 'Achieve a consistent 15+ second Full Front Lever hold and integrate dynamic elements',
      startMonth: 25,
      endMonth: 30,
      targetHoldMin: 15,
      targetHoldMax: 20,
    },
  })

  const flS4Exercises = [
    {
      id: 'fl4-sustained-fl',
      name: 'Sustained Full FL Hold',
      category: 'skill',
      type: 'isometric',
      description: 'Hold full front lever for maximum time, focusing on endurance',
      formCues: JSON.stringify(['Perfect form every rep', 'Legs together', 'Arms locked', 'Build endurance', 'Multiple sets']),
      targetSetsMin: 4, targetSetsMax: 6,
      targetHoldMin: 8, targetHoldMax: 15,
      restSeconds: 240,
      progressionOrder: 1,
    },
    {
      id: 'fl4-fl-pullups',
      name: 'Front Lever Pull-ups',
      category: 'skill',
      type: 'dynamic',
      description: 'Pull-ups performed in full front lever position',
      formCues: JSON.stringify(['Maintain FL position', 'Pull chest to bar', 'Bend arms while horizontal', 'Full ROM', 'Controlled movement']),
      targetSetsMin: 3, targetSetsMax: 5,
      targetRepsMin: 1, targetRepsMax: 5,
      restSeconds: 240,
      progressionOrder: 2,
    },
    {
      id: 'fl4-fl-transitions',
      name: 'FL Transitions',
      category: 'skill',
      type: 'dynamic',
      description: 'Dynamic transitions between FL variations',
      formCues: JSON.stringify(['Move between FL positions', 'Smooth transitions', 'Maintain tension', 'Build flow', 'Full control']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 2, targetRepsMax: 5,
      restSeconds: 180,
      progressionOrder: 3,
    },
    {
      id: 'fl4-hollow-body-adv',
      name: 'Hollow Body Rocks (Weighted)',
      category: 'core',
      type: 'dynamic',
      description: 'Hollow body rocks with weight held behind head',
      formCues: JSON.stringify(['Hold light weight behind head', 'Maintain hollow body', 'Rock from shoulders to hips', 'Continuous tension', 'Full control']),
      targetSetsMin: 3, targetSetsMax: 4,
      targetRepsMin: 10, targetRepsMax: 20,
      restSeconds: 60,
      progressionOrder: 4,
    },
  ]

  for (const ex of flS4Exercises) {
    await db.exercise.upsert({
      where: { id: ex.id },
      update: {},
      create: { ...ex, stageId: flStage4.id },
    })
  }

  // ============ WARMUP & COOLDOWN EXERCISES ============
  const warmupExercises = [
    { id: 'wu-arm-circles', name: 'Arm Circles', category: 'warmup', type: 'dynamic', description: 'Large and small arm circles to warm up shoulders', formCues: JSON.stringify(['30 seconds forward', '30 seconds backward', 'Full ROM', 'Gradually increase size']), targetSetsMin: 1, targetSetsMax: 1, targetRepsMin: 30, targetRepsMax: 30, restSeconds: 0, progressionOrder: 1 },
    { id: 'wu-wrist-rotations', name: 'Wrist Rotations', category: 'warmup', type: 'dynamic', description: 'Rotate wrists in both directions', formCues: JSON.stringify(['Slow controlled circles', 'Both directions', '10 each way']), targetSetsMin: 1, targetSetsMax: 1, targetRepsMin: 10, targetRepsMax: 10, restSeconds: 0, progressionOrder: 2 },
    { id: 'wu-band-dislocates', name: 'Band Dislocates', category: 'warmup', type: 'dynamic', description: 'Move resistance band from front to back overhead', formCues: JSON.stringify(['Hold band wide', 'Slow overhead pass', 'Gradually narrow grip', '10 reps']), targetSetsMin: 1, targetSetsMax: 1, targetRepsMin: 10, targetRepsMax: 10, restSeconds: 0, progressionOrder: 3 },
    { id: 'wu-cat-cow', name: 'Cat-Cow Stretch', category: 'warmup', type: 'dynamic', description: 'Alternate between arching and rounding the back', formCues: JSON.stringify(['On all fours', 'Inhale arch (cow)', 'Exhale round (cat)', 'Flow with breath']), targetSetsMin: 1, targetSetsMax: 1, targetRepsMin: 10, targetRepsMax: 10, restSeconds: 0, progressionOrder: 4 },
    { id: 'wu-jumping-jacks', name: 'Jumping Jacks', category: 'warmup', type: 'dynamic', description: 'Classic jumping jacks to raise heart rate', formCues: JSON.stringify(['Full range of motion', 'Land softly', 'Keep rhythm']), targetSetsMin: 1, targetSetsMax: 1, targetRepsMin: 30, targetRepsMax: 30, restSeconds: 0, progressionOrder: 5 },
  ]

  // Create a generic warmup stage attached to planche stage 1
  for (const ex of warmupExercises) {
    await db.exercise.upsert({
      where: { id: ex.id },
      update: {},
      create: { ...ex, stageId: plancheStage1.id },
    })
  }

  const cooldownExercises = [
    { id: 'cd-chest-stretch', name: 'Chest/Doorway Stretch', category: 'cooldown', type: 'isometric', description: 'Stretch chest in doorway or against wall', formCues: JSON.stringify(['30 seconds each side', 'Feel stretch in chest', 'Breathe deeply', 'Relax into stretch']), targetSetsMin: 1, targetSetsMax: 1, targetHoldMin: 30, targetHoldMax: 30, restSeconds: 0, progressionOrder: 1 },
    { id: 'cd-lat-stretch', name: 'Lat Stretch (Hanging)', category: 'cooldown', type: 'isometric', description: 'Hang from bar and relax to stretch lats', formCues: JSON.stringify(['Hang with straight arms', 'Relax completely', 'Breathe deeply', '30+ seconds']), targetSetsMin: 1, targetSetsMax: 1, targetHoldMin: 30, targetHoldMax: 30, restSeconds: 0, progressionOrder: 2 },
    { id: 'cd-shoulder-stretch', name: 'Behind-Back Shoulder Stretch', category: 'cooldown', type: 'isometric', description: 'Pull arm across body or behind back', formCues: JSON.stringify(['30 seconds each side', 'Gentle pull', 'Never force', 'Breathe']), targetSetsMin: 1, targetSetsMax: 1, targetHoldMin: 30, targetHoldMax: 30, restSeconds: 0, progressionOrder: 3 },
    { id: 'cd-wrist-stretch', name: 'Wrist Flexor/Extensor Stretch', category: 'cooldown', type: 'isometric', description: 'Stretch wrists in both directions on floor', formCues: JSON.stringify(['Palms down, lean back', 'Palms up, lean back', '30 seconds each', 'Gentle pressure']), targetSetsMin: 1, targetSetsMax: 1, targetHoldMin: 30, targetHoldMax: 30, restSeconds: 0, progressionOrder: 4 },
    { id: 'cd-foam-roll', name: 'Foam Rolling (Lats & Shoulders)', category: 'cooldown', type: 'dynamic', description: 'Foam roll lats and shoulder area', formCues: JSON.stringify(['Slow rolling', 'Spend time on tight spots', '2 minutes total', 'Breathe into tight areas']), targetSetsMin: 1, targetSetsMax: 1, targetRepsMin: 2, targetRepsMax: 2, restSeconds: 0, progressionOrder: 5 },
  ]

  for (const ex of cooldownExercises) {
    await db.exercise.upsert({
      where: { id: ex.id },
      update: {},
      create: { ...ex, stageId: plancheStage1.id },
    })
  }

  // ============ INITIAL MAX HOLDS ============
  const maxHolds = [
    { exerciseName: 'Tuck Planche Hold', maxHoldSeconds: 8 },
    { exerciseName: 'Advanced Tuck Planche Hold', maxHoldSeconds: 3 },
    { exerciseName: 'Advanced Tuck Front Lever Hold', maxHoldSeconds: 7 },
    { exerciseName: 'One-Leg Front Lever Hold', maxHoldSeconds: 2 },
  ]

  for (const mh of maxHolds) {
    await db.maxHold.upsert({
      where: { exerciseName: mh.exerciseName },
      update: {},
      create: mh,
    })
  }

  console.log('Seed data created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
