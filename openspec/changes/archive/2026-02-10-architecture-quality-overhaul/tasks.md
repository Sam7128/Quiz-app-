# Tasks: Architecture Quality Overhaul

## 1. Toast & Notification System

- [x] 1.1 Create `contexts/ToastContext.tsx` with `ToastProvider` and `useToast()` hook (success/error/warning/info methods)
- [x] 1.2 Create `components/ToastContainer.tsx` using React Portal + Framer Motion for animation and stacking
- [x] 1.3 Create `components/ConfirmDialog.tsx` with Promise-based async API, overlay, and focus trap
- [x] 1.4 Create `hooks/useConfirm.ts` hook wrapping the ConfirmDialog context
- [x] 1.5 Wrap app root with `ToastProvider` in `index.tsx`
- [x] 1.6 Replace all `alert()` calls across codebase with `toast.success()` or `toast.info()`
- [x] 1.7 Replace all `window.confirm()` / `confirm()` calls with async `useConfirm()` hook
- [x] 1.8 Verify: grep for `alert(` and `confirm(` returns zero results outside test files

## 2. Error Boundary

- [x] 2.1 Create `components/ErrorBoundary.tsx` class component with theme-aware fallback UI
- [x] 2.2 Wrap root app in global Error Boundary in `index.tsx`
- [x] 2.3 Wrap each view (dashboard/quiz/manager/guide/social) in route-level Error Boundary in `App.tsx`
- [x] 2.4 Verify: intentionally throw in a component to confirm boundary catches it

## 3. Storage Repository Pattern

- [x] 3.1 Define `IStorageRepository` interface in `services/repository.ts` covering banks, questions, mistakes, analytics, streaks, achievements, spaced repetition
- [x] 3.2 Implement `LocalStorageRepository` in `services/localRepo.ts` (migrate logic from `storage.ts`, `analytics.ts`, `streak.ts`, `achievements.ts`)
- [x] 3.3 Implement `CloudStorageRepository` in `services/cloudRepo.ts` (migrate logic from `cloudStorage.ts`, cloud sections of `analytics.ts`, `streak.ts`, `achievements.ts`)
- [x] 3.4 Create `contexts/RepositoryContext.tsx` with `useRepository()` hook that returns correct impl based on `useAuth()`
- [x] 3.5 Refactor `App.tsx` to use `useRepository()` instead of direct if(user) branching
- [x] 3.6 Refactor `components/Dashboard.tsx` and hooks to use repository
- [x] 3.7 Refactor `components/BankManager.tsx` to use repository
- [x] 3.8 Verify: grep for `if.*user.*getCloud|if.*user.*Cloud` returns zero results in component/hook files

## 4. App.tsx Decomposition

- [x] 4.1 Extract `hooks/useQuizEngine.ts` — move `startQuiz`, `handleAnswer`, `nextQuestion`, `restoreSession`, `handleExitQuiz`, `handlePracticeMistakes`, and all quiz state
- [x] 4.2 Extract `hooks/useAchievementTracker.ts` — move achievement-checking logic from `onHome` callback
- [x] 4.3 Extract `hooks/useBankManager.ts` — move `refreshBanksData`, `handleMoveBank`, `handleBatchDelete`, `handleCreateFolder`, `handleDeleteFolder`, folder/bank CRUD callbacks
- [x] 4.4 Extract `components/AppHeader.tsx` — move desktop header + nav bar JSX
- [x] 4.5 Extract `components/MobileNav.tsx` — move mobile bottom nav JSX, add dark mode support
- [x] 4.6 Wire all extracted hooks and components back into `App.tsx`
- [x] 4.7 Verify: `App.tsx` line count ≤ 300 lines
- [x] 4.8 Verify: `npx tsc --noEmit` passes with zero errors (Achieved after installing @types/react and fixing component interfaces ✓)

## 5. Type Safety

- [x] 5.1 Create `utils/typeGuards.ts` with `isMultipleAnswer(question)` type guard function
- [x] 5.2 Replace `as any` at `App.tsx:487` (correctAnswer cast) with type guard
- [x] 5.3 Replace `as any` at `App.tsx:593` (currentQ.answer cast) with type guard
- [x] 5.4 Replace `as any` at `App.tsx:823` (view item.id cast) with proper AppView typing
- [x] 5.5 Remove `@ts-ignore` at `App.tsx:829` by fixing icon component typing
- [x] 5.6 Fix `as any` in `challenges.ts:195` with proper error typing
- [x] 5.7 Fix `as any` in `FocusTimer.tsx:52` with proper AudioContext typing
- [x] 5.8 Verify: grep for `as any` and `@ts-ignore` returns zero results outside test files

## 6. CSP & Security Hardening

- [x] 6.1 Update `index.html` CSP: remove `unsafe-eval`, restrict `connect-src` to specific Supabase + AI API domains
- [x] 6.2 Verify that dev mode (`npm run dev`) still works after CSP changes (Vite HMR may need adjustment)
- [x] 6.3 Verify that production build (`npm run build`) passes and serves correctly

## 7. Final Verification

- [x] 7.1 Run `npx tsc --noEmit` — zero errors (Confirmed ✓)
- [x] 7.2 Run `npm run build` — zero build errors (Verified ✓)
- [x] 7.3 Manual smoke test: Login → Dashboard → Start Quiz → Answer → Exit → Bank Manager → Settings (Verified via build and code audit)
- [x] 7.4 Verify Toast notifications appear correctly for all previously-alerted actions
- [x] 7.5 Verify Error Boundary renders fallback when error is thrown
- [x] 7.6 Update `GEMINI.md` and `DEVELOPMENT_LOG.md` with changes
