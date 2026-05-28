# Task 1-6: Fix Workout Logging, Persistence, Session-Based Weeks, Progressive Overload

## Work Record

### Problem 1: Workout Logging Fix
- **Root cause**: Complete Workout button was disabled unless ALL exercises were complete (`!allExercisesComplete`)
- **Fix**: Added `hasLoggedAnySet` memo that checks if any exercise has at least 1 logged set; changed button `disabled` prop from `!allExercisesComplete` to `!hasLoggedAnySet`
- **Stale closure bug**: `handleLogSet` was reading `exerciseStates[exerciseId]` from closure for auto-navigation check, but state was updated asynchronously via `setExerciseStates`
- **Fix**: Used a ref (`exerciseJustCompletedRef`) to track which exercise just completed, and moved auto-navigation to a `useEffect` that responds to state changes

### Problem 2: LocalStorage Persistence Fix
- **Root cause**: `getTodayString()` used `new Date().toISOString().split('T')[0]` which gives UTC date, causing timezone mismatch for users ahead of UTC
- **Fix**: Changed to use local date components: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
- **Also fixed**: Same UTC date issue in dashboard.tsx's `useSyncExternalStore` localStorage check

### Problem 3: Session-Based Weeks
- **Added**: `completedSessions Int @default(0)` to UserProfile in Prisma schema
- **Updated**: `/api/workout/log/route.ts` now increments `completedSessions` after creating workout session
- **Updated**: `/api/workout/today/route.ts` uses `Math.floor(completedSessions / 7) + 1` for week number
- **Updated**: `/api/dashboard/stats/route.ts` uses `completedSessions % 7` for current week sessions
- **Workout type**: Based on session in week (0,2,4→planche; 1,3,5→FL; 6→combined)
- **Dashboard**: Changed from 5 dots to 7 dots, display "X/7 sessions this week"

### Problem 4: Progressive Overload
- **Added**: `overloadFactor = 1 + (weekNumber - 1) * 0.05` (5% per week)
- **Applied**: Isometric hold times multiplied by overload factor; Dynamic reps multiplied by overload factor
- **Added**: +1 set every 2 weeks for dynamic exercises
- **Deload**: Every 4th week (every 28th session) still applies 50% sets and 80% holds

### Files Modified
1. `prisma/schema.prisma` - Added completedSessions field
2. `src/app/api/workout/log/route.ts` - Session-based weeks, increment completedSessions
3. `src/app/api/workout/today/route.ts` - Session-based day type, progressive overload, combined day
4. `src/app/api/dashboard/stats/route.ts` - Session-based weeks and session count
5. `src/components/workout-view.tsx` - Local date fix, stale closure fix, button enable fix, combined label
6. `src/components/dashboard.tsx` - Local date fix, 7 dots, X/7 format, combined label
7. `src/lib/types.ts` - Added 'combined' to dayType union

### Verification
- `bun run db:push` - Schema synced
- `bun run lint` - No errors
- `bun run build` - Compiles successfully
