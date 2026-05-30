---
Task ID: 1
Agent: full-stack-developer
Task: Add cross-device persistence with Prisma + SQLite and fix progressive overload

Work Log:
- Replaced prisma/schema.prisma with Profile, WorkoutSession, MaxHold, PainReport models (simplified from old schema with Skill/Stage/Exercise/ExerciseLog models)
- Ran bun run db:push to create the SQLite database
- Created src/lib/db.ts with PrismaClient singleton pattern
- Created src/app/api/sync/route.ts with GET (returns all user data) and POST (upserts all user data) handlers
- Updated src/lib/client-data.ts:
  - Added syncToServer() fire-and-forget function that POSTs all localStorage data to /api/sync
  - Added initFromServer() function that pulls server data on mount or pushes local data if server is empty
  - Modified saveProfile(), saveWorkoutSession(), upsertMaxHold(), savePainReport() to call syncToServer() after saving
  - Fixed progressive overload logic: added comment explaining 7-session week system, changed to completedWeeks calculation, fixed isDeload to only apply after week 1, overload factor uses completedWeeks
  - Updated getDashboardStats() to use the same completedWeeks calculation
- Updated src/components/providers.tsx to call initFromServer() on mount via useEffect
- Updated src/components/dashboard.tsx:
  - Added Trophy and Zap icons from lucide-react
  - Added "Week Complete" banner when thisWeekSessions === 0 && totalWorkouts > 0
  - Enhanced "This Week" card with contextual messages:
    - "Week N completed! Overload increased by 5%" when all 7 sessions done
    - "New week started — keep it up!" when starting a new week after completing one
    - "Complete all 7 sessions to advance to week N+1" during the week
- Verified lint passes with no errors
- Verified sync API endpoints work correctly (GET and POST)

Stage Summary:
- Cross-device persistence now works via Prisma + SQLite backend
- Progressive overload only increases when a full 7-session week is completed
- App still works offline with localStorage; server sync is secondary (fire-and-forget)
- Dashboard shows clear weekly progress indicators with motivational messages
