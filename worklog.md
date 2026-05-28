---
Task ID: 1-2
Agent: Main Agent
Task: Add workout persistence + fix workout completion tracking

Work Log:
- Analyzed the full workout-view.tsx component (~1800 lines) to understand exercise state management
- Analyzed the /api/workout/log API route to understand how sessions are saved
- Identified that exerciseStates were only in React state (lost on navigation)
- Identified that React Query caches weren't invalidated after workout completion

Task 1 - Workout Persistence:
- Added `WORKOUT_PROGRESS_KEY` constant and `getTodayString()` helper
- Modified the fetch useEffect to restore from localStorage after initializing states
- Added persistence useEffect that saves exerciseStates, navigation indices, date, and dayType to localStorage on every change
- Added auto-clear of stale data (different date or dayType)
- Added localStorage.removeItem() on successful workout completion
- Graceful error handling for corrupted localStorage data

Task 2 - Fix Completion Tracking:
- Added `useQueryClient` import from @tanstack/react-query
- After successful POST to /api/workout/log, invalidate 4 query keys:
  - workout-today, dashboard-stats, workout-history, progress
- This causes Dashboard, Progress view etc. to refetch and show updated data

Stage Summary:
- Modified: src/components/workout-view.tsx
- Lint passes cleanly, dev server compiles successfully
- Workout progress now survives page navigation and browser refresh
- Completed workouts now properly update the dashboard stats and progress views
