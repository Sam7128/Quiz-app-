# Learnings - MindSpark Upgrade

- Consolidated App.tsx UI state into a reducer with a sync_banks_data action to preserve valid bank selections during refreshes.
- Exporting initialAppState/appReducer from App.tsx keeps reducer tests colocated without extra files.
  
- Added React.memo wrappers for main child components to avoid unnecessary re-renders.
- Converted many handlers in App.tsx to useCallback (handleCreateFolder, handleDeleteFolder, handleMoveBank, handleEditingBankChange, handleToggleQuizBank, startQuiz, handleAnswer, nextQuestion, handleShare).
- Extracted framer-motion animation variants in QuizCard into a constant (QUIZ_CARD_ANIM) so the object identity is stable between renders.
- Verified unit tests pass and production build succeeds locally.

- Promise.all optimization: Replaced serial async loops with parallel execution using Promise.all and map for independent async operations.
- In App.tsx startQuiz: Changed for-await loop fetching questions from selected banks to Promise.all(map(getQuestions)) reducing total load time.
- In services/cloudStorage.ts syncLocalToCloud: Used Promise.all with async map functions for parallel bank creation and upload, while maintaining sequential dependency within each bank.
- This pattern is effective when operations are I/O bound and independent, significantly improving user experience for data loading.## 2026-01-31 13:18:57 - Orchestrator Progress Update

**Phase 0 - Foundation:** ✅ COMPLETE
- Task 1: Vitest setup + React 19 verification ✅

**Phase 1 - Performance:** ✅ COMPLETE  
- Task 2: App.tsx useReducer refactoring ✅
- Task 3: React.memo + useCallback optimization ✅
- Task 4: Parallel loading with Promise.all ✅

**Phase 2 - UI/UX:** 🚧 IN PROGRESS
- Task 5: Dark mode - PARTIAL (ThemeContext exists, needs completion)
- Task 6-8: Pending

**Status:** 4/14 tasks complete, Phase 1 successfully delivered

**Next Action:** Complete Task 5 dark mode implementation


## 2026-01-31 - Keyboard Shortcuts Implementation

- Created `hooks/useKeyboardShortcuts.ts` hook for reusable keyboard event handling
- Implemented quiz navigation shortcuts: 1-4 for option selection, Enter for submit/next, H for hint toggle, Esc for exit
- Added `onExit` prop to QuizCard component to enable keyboard exit functionality
- Used `useEffect` with `window.addEventListener` for global keyboard events, with proper cleanup
- Handled both single-choice (direct submit on 1-4) and multiple-choice (select on 1-4, submit on Enter) question types
- Added `preventDefault()` to avoid conflicts with browser shortcuts
- Verified implementation with `npm test && npm run build` success
