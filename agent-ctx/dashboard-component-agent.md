# Task: Create Dashboard Component for Calisthenics Workout App

## Summary
Created the main dashboard view component at `/home/z/my-project/src/components/dashboard.tsx` with a calm sage green + warm neutrals design system.

## Files Created/Modified

### Created
1. **`/home/z/my-project/src/components/dashboard.tsx`** - Main dashboard component
   - Header section with time-based greeting, week number, day type, and deload badge
   - Skill Progress Cards (Planche & Front Lever) with stage info, progress bars
   - Today's Workout Preview Card with exercise list, duration estimate, and Start Workout button
   - Quick Stats Row (total workouts, max holds for both skills)
   - This Week's Training Days card with dot indicators
   - Uses framer-motion for staggered entrance animations
   - Uses useQuery from @tanstack/react-query for data fetching
   - Fully responsive (grid-cols-1 md:grid-cols-2)

2. **`/home/z/my-project/src/app/api/dashboard/stats/route.ts`** - Dashboard stats API endpoint
   - Returns totalWorkouts, plancheMaxHold, flMaxHold, thisWeekSessions, weekNumber

### Modified
1. **`/home/z/my-project/src/app/page.tsx`** - Updated to render Dashboard component
2. **`/home/z/my-project/src/app/layout.tsx`** - Added Providers wrapper (QueryClientProvider), fixed duplicate import, updated metadata

## Design Choices
- Color scheme: Sage greens via `text-primary`, `bg-primary/10` CSS variables (already configured in globals.css)
- Cards: `rounded-2xl shadow-sm hover:shadow-md transition-shadow`
- Padding: `p-5` / `p-6` for content, `gap-4` for spacing
- Icons: Lucide icons (CircleDot, GripHorizontal, Dumbbell, Timer, Leaf, TrendingUp, CalendarDays, Play, Moon, Sun)
- No indigo/blue colors used anywhere
- Custom scrollbar styling via `custom-scrollbar` class

## Verification
- ESLint passes with no errors
- All API routes return 200 with correct data
- Dev server compiles successfully
