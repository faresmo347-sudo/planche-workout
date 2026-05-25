---
Task ID: 1
Agent: Main Agent
Task: Add Phase Explorer - browse workouts for every training phase

Work Log:
- Fixed the `Home` naming conflict in page.tsx (Home icon vs Home function)
- Explored the full codebase: dashboard, workout-view, progress-view, pain-dialog, API routes, Prisma schema
- Determined that the `/api/skills` endpoint already returns all stages with exercises, so no new API endpoint was needed
- Created `src/components/phase-workouts-view.tsx` - a new Phase Explorer component with:
  - Planche / Front Lever skill selector buttons
  - Interactive phase timeline (stages 1-4) with current stage highlighting
  - Detailed stage card showing: goal, exercise count, duration, target hold times
  - Exercises grouped by category (skill, accessory, core, warmup, cooldown) with type icons
  - "All Phases at a Glance" summary card
  - Calm sage-green aesthetic matching the existing app
  - Framer Motion animations for smooth transitions
- Updated `src/app/page.tsx` to add "Phases" tab (Layers icon) in the bottom navigation
- Fixed ESLint errors about creating components during render (changed dynamic icon resolution to conditional rendering)
- Verified lint passes and dev server compiles successfully

Stage Summary:
- New file: `src/components/phase-workouts-view.tsx`
- Modified: `src/app/page.tsx` (added Phases tab + Layers icon import)
- Feature: Users can now browse all 4 training phases for both Planche and Front Lever, see exercises per phase, and understand the full training roadmap
