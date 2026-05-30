# Task 3 - Main Agent: Error Handling & Resilience

## Summary
Improved error handling and resilience across all major components to prevent crashes when APIs are temporarily down during server restarts or deployments.

## Files Changed

1. **`src/components/providers.tsx`**
   - Added `retry: 2` and `retryDelay: 1000` to default QueryClient options

2. **`src/components/dashboard.tsx`**
   - Added `retry: 2` and `placeholderData: (prev) => prev` to all 4 useQuery calls
   - Replaced "No stage data available" fallback with skeleton card
   - Added workout API error state with "Try Again" button
   - Added stats API error fallbacks showing "—" instead of crashing

3. **`src/components/workout-view.tsx`**
   - Replaced useEffect fetch with useCallback `fetchWorkoutData` with auto-retry (2 retries, 1s delay)
   - "Try Again" button now calls fetchWorkoutData(0) instead of window.location.reload()
   - Added `saveError` state for workout save failures (separate from `error`)
   - Inline error message near "Complete Workout" button when save fails
   - Verified "Log & Save Workout" works: POSTs to /api/workout/log, clears localStorage, invalidates caches

4. **`src/components/progress-view.tsx`**
   - Added `retry: 2` and `placeholderData: (prev) => prev` to all 5 useQuery calls
   - Progress API failure shows "Failed to load progress" with retry button
   - Workout history and max holds API failures show friendly fallback cards

5. **`src/components/phase-workouts-view.tsx`**
   - Added `retry: 2` and `placeholderData: (prev) => prev` to both useQuery calls
   - Skills/profile API failure shows "Failed to load skill data" with retry button

## Key Design Decisions
- Used `placeholderData: (prev) => prev` to keep previous data visible during refetch, preventing layout shifts
- Workout save errors use a separate `saveError` state so the workout view isn't destroyed
- The `saveError` message reassures users that data is saved locally
- All retry buttons use actual refetch/retry functions instead of `window.location.reload()`
