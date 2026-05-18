# AGENTS.md - MindSpark Development Guide

## 🔒 鐵規 (Absolute Rules)

> **所有 Agent（Codex、Gemini CLI、Claude 等）進入本專案時，必須遵守以下不可違反的規則。**

1. **LANGUAGE_ZH_TW**: 所有互動與回應必須使用**繁體中文**。
2. **CHECKLIST_FIRST**: 每個重大任務必須維護並更新 `CHECKLIST.md`。
3. **NO_ANY**: 嚴禁使用 `any` 型別。使用 `unknown` + 型別守衛。
4. **DATA_SAFETY**: 絕對禁止對正式數據檔案（`user_data.json`、`localStorage` 中的 `mindspark_*`）執行破壞性測試。測試必須使用獨立路徑。進行任何可能影響用戶數據的操作前，必須先備份。
5. **TYPE_FIRST**: 先在 `types.ts` 定義型別 → `npx tsc --noEmit` 編譯檢查 → 再實作邏輯。
6. **REACT_18_SAFETY**: 使用 `useTranslation` 或 async 初始化的元件必須包在 `<Suspense>` 中。關鍵資料使用 Skeleton loader。
7. **PERSISTENCE_INTEGRITY**: Zustand `persist` 必須在 `partialize` 中顯式列出所有欄位。實作自訂 `merge` 函式防止空資料覆蓋。
8. **DEPENDENCY_VERIFY**: 匯入外部套件前先驗證其匯出。注意大版本升級的 breaking changes。
9. **PERFECTIONIST_MODE**: 禁止截斷程式碼，必須輸出完整檔案內容。優先防禦式程式設計和資料安全。
10. **DOCS_MAINTENANCE**: 在每次任務結束或有重大變更時，必須自動檢查並更新 [docs/DEVELOPMENT_LOG.md](file:///c:/Users/user/Desktop/Quiz-app--main/docs/DEVELOPMENT_LOG.md)，內容必須保持與最新代碼狀態同步。GEMINI.md 已廢除，不再維護。

## 📍 模組快速索引

> Agent 可直接跳轉至對應模組的巢狀 `AGENTS.md` 取得精準上下文，無需搜尋整個專案。

| 模組 | 路徑 | 局部記憶 | 職責 |
|------|------|----------|------|
| Components | `components/` | `components/AGENTS.md` | UI 元件、動畫、頁面 |
| Services | `services/` | `services/AGENTS.md` | 業務邏輯、資料存取、AI |
| Hooks | `hooks/` | `hooks/AGENTS.md` | 領域 Hooks（Battle, Quiz 等） |
| Constants | `constants/` | `constants/AGENTS.md` | 靜態資料定義（怪物、技能、成就） |
| Contexts | `contexts/` | `contexts/AGENTS.md` | React Context（Auth, Theme 等） |
| OpenSpec | `openspec/` | `openspec/AGENTS.md` | 規格管理、變更追蹤 |
| Tests | `src/__tests__/` | `src/__tests__/AGENTS.md` | 單元測試 |
| E2E | `e2e/` | `e2e/AGENTS.md` | 端對端測試 |

## Quick Start & Build Commands

### Development
```bash
npm install                  # Install dependencies
npm run dev                  # Start dev server (port 5173)
npm run build               # Build for production (outputs to dist/)
npm run preview             # Preview production build (port 5173)
npm test                    # Run tests (Vitest with jsdom)
```

### Development Server Details
- **Dev Server**: Vite on port 5173 by default (`npm run dev`)
- **E2E Tests**: Playwright configured for port 5200 - see [playwright.config.ts](playwright.config.ts#L9)
- **Preview**: `npm run preview` runs production build locally for testing
- **Build Output**: `npm run build` creates `dist/` directory with Vite + Tailwind CSS v4

### Testing Framework
- **Unit Tests**: Vitest with jsdom - files in [src/__tests__/](src/__tests__/)
- **E2E Tests**: Playwright in [e2e/](e2e/) directory - tests cover JSON import, quiz flow, full app flow
- **Component Tests**: React Testing Library integration tests
- **Requirement**: Run tests before pushing; add tests for new logic in `services/` and `hooks/`.

### Environment Setup
1. Create `.env` from `.env.example` (if available) or create manually.
2. Required variables:
   - `VITE_SUPABASE_URL`: Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon/public key
   - `GEMINI_API_KEY`: Google Gemini API key (or custom via AI config)

## Project Architecture

### Core App Structure
- **index.tsx**: Root entry - wraps `App` with `AuthProvider` and `ThemeProvider` (dark/light mode)
- **App.tsx**: Main logic with `useReducer` for `AppState`/`AppAction` - manages views, quiz modes, game mode toggle, bank sync
- **index.html**: HTML entry point

### Directory Structure (Root-based)
```
├── components/          # React components (functional, typed)
├── services/            # Business logic (Supabase, AI, Storage, Analytics)
├── contexts/            # React Contexts (Auth, Theme, Quiz callbacks)
├── hooks/               # Custom domain hooks (8 total: Battle, ChunkedPractice, Achievements, Challenges, Streak, StudyStats, Sound, Keyboard)
├── types/               # TypeScript definitions
├── constants/           # App data (monsters, skills, achievements, dialogues)
├── src/__tests__/       # Unit tests (Vitest)
├── e2e/                 # E2E tests (Playwright)
└── public/              # Static assets (battle graphics, sounds)
```

### Key Architecture Patterns

**Service Layer + Domain Hooks Model**:
- Components never access storage/Supabase directly
- Services handle all I/O: [services/storage.ts](services/storage.ts) (localStorage), [services/cloudStorage.ts](services/cloudStorage.ts) (Supabase)
- Domain hooks manage isolated features: [hooks/useBattleSystem.ts](hooks/useBattleSystem.ts), [hooks/useAchievements.ts](hooks/useAchievements.ts), [hooks/useChallenges.ts](hooks/useChallenges.ts), etc.

**Dual Data Persistence**:
- **Guest Mode**: Everything in localStorage (`mindspark_*` prefixed keys)
- **User Mode**: Banks/questions from Supabase, learning data (mistakes, spaced repetition, streaks) in localStorage for device-specific persistence
- **Auto-Sync**: On login via `syncLocalToCloud()` - mistakes and spaced repetition stay local by design (device-specific learning)

**Game Mode Toggle**:
- Global `gameMode` boolean in app state (controlled via [components/Settings.tsx](components/Settings.tsx))
- When enabled: battle visual overlay activates, monsters appear, skill animations trigger, damage numbers fly
- Full state persists to localStorage (`mindspark_battle_state`) to survive page refresh

**Path Alias**:
- `@/*` maps to project root `./*` - enables relative imports like `import { useAuth } from '@/contexts/AuthContext'`

## Code Style Guidelines

### Import Organization
1. **Core**: `react`, `react-dom`, external libs.
2. **Types**: `../types`.
3. **Services/Utils**: `../services/*`, `../utils/*`.
4. **Constants**: `../constants`.
5. **Components**: `./Component`.
6. **Hooks/Contexts**: `../hooks`, `../contexts`.
7. **Assets**: Icons, images.

### Component Structure
- Use **functional components** with `React.FC<Props>`.
- **Named exports** (e.g., `export const MyComponent...`).
- **Interfaces** defined above the component.

```typescript
interface Props {
  data: string[];
}

export const MyComponent: React.FC<Props> = ({ data }) => {
  const [state, setState] = useState<string>('');
  // ...
};
```

### TypeScript
- **Strict Typing**: No `any`. Use `unknown` or specific types.
- **Explicit Returns**: Services must have return types.
- **State**: `useState<T>(initial)`.

### Naming
- **Components/Files**: PascalCase (`QuizCard.tsx`).
- **Functions/Vars**: camelCase (`handleSubmit`, `isLoading`).
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRIES`).
- **Booleans**: Prefix with `is`, `has`, `should`.

## Integrations

### Supabase (Cloud Storage)
- **Auth**: Handled in [contexts/AuthContext.tsx](contexts/AuthContext.tsx)
- **Data Sync**: Banks and questions stored in Supabase; learning data (mistakes, spaced repetition) stays in localStorage
- **When User Logs In**: Auto-sync via `syncLocalToCloud()` merges local banks with cloud

### AI Integration (Gemini + OpenAI Support)
- **Config Storage**: Stored in `localStorage` under `mindspark_ai_config` with fields: `provider`, `apiKey`, `model`, `baseUrl` (optional)
- **Service**: [services/ai.ts](services/ai.ts) - enforces strict JSON schema, auto-recovery for malformed responses
- **Features**:
  - PDF question generation via Google Gemini 1.5 (parses PDF files + generates questions)
  - Configurable question type and language
  - Few-shot examples + prompt templates for consistent quality
- **Usage**: Accessed via [components/BankManager.tsx](components/BankManager.tsx) for file uploads

### Achievement System
- **Tracking**: Stored in localStorage with unlock status - see [hooks/useAchievements.ts](hooks/useAchievements.ts) and [services/achievements.ts](services/achievements.ts)
- **Display**: Modal view of achievements (locked/unlocked)
- **Data**: Achievement definitions in [constants/achievements.ts](constants/achievements.ts)

### Gamification Features

**Battle/RPG System** ([hooks/useBattleSystem.ts](hooks/useBattleSystem.ts)):
- **Monster System**: 3-tier difficulty (Normal → Elite → Boss) with dynamic rotation
- **Streak Triggering**: Skills unlock at streaks of 5, 10, 20, 30, 40, 50+
- **Damage Calculation**: Base damage + skill multipliers + 15% critical hit (1.5-3.0x multiplier)
- **Persistence**: Full state saved to `mindspark_battle_state` localStorage

**Skill System** ([constants/skillsData.ts](constants/skillsData.ts)):
- 6-tier progression system with unique attack animations (Fireball, Ice Arrow, etc.)
- Each skill has base damage, critical chance, animation duration
- Triggered automatically at streak milestones

**Streak Tracking** ([hooks/useStreak.ts](hooks/useStreak.ts)):
- Consecutive correct answers counter
- Persists to localStorage, displayed on dashboard

**Challenge System** ([hooks/useChallenges.ts](hooks/useChallenges.ts), [services/challenges.ts](services/challenges.ts)):
- Leaderboard-style challenges with scoring
- Cloud-backed ranking for user profiles

**Study Features**:
- **Micro-Learning with Focus Timer** ([components/MiniTimer.tsx](components/MiniTimer.tsx)): Pomodoro-style 25min default, configurable intervals
- **Fatigue Detection**: Triggers rest break modal after N questions - see [components/RestBreakModal.tsx](components/RestBreakModal.tsx)
- **Study Stats Dashboard** ([hooks/useStudyStats.ts](hooks/useStudyStats.ts), [components/StudyStatsCard.tsx](components/StudyStatsCard.tsx)): Total questions, correct%, time spent
- **Sound Effects** ([hooks/useSoundEffects.ts](hooks/useSoundEffects.ts)): Howler.js-based audio with lazy loading

**Learning Analytics** ([services/spacedRepetition.ts](services/spacedRepetition.ts)):
- **SM-2 Algorithm**: Implements complete spaced repetition with easiness factor, interval calculation, repetition count
- **Mistake Tracking**: Per-question mistake counts + last wrong answer + timestamp stored in `mindspark_recent_mistakes`
- **Session Persistence**: Quiz progress auto-saves to `mindspark_quiz_session`; chunked mode uses `mindspark_chunk_draft:<sessionId>:<chunkIndex>` for mid-chunk restore
- **Analytics Recording**: Both local (`recordLocalStudySession`) and cloud (`recordStudySession`) via [services/analytics.ts](services/analytics.ts)

### Social Features
- **Friend System**: Accept/reject friend requests with status tracking
- **User Profiles**: See leaderboard, challenges, achievements of friends
- **Social View** ([components/Social.tsx](components/Social.tsx)): Compare stats with friends
- **Implementation**: [services/supabase.ts](services/supabase.ts) handles cloud queries

## State Management

**App-Level State** ([App.tsx](App.tsx)):
- Uses `useReducer` with `AppState` and `AppAction` union types
- Manages: quiz views, quiz modes (`random`/`mistake`/`retry_session`), game mode toggle, bank sync status
- Global access via component prop drilling (intentionally simple for team readability)

**Context & Hooks Pattern**:
- [contexts/AuthContext.tsx](contexts/AuthContext.tsx): User auth state and login/logout
- [contexts/ThemeContext.tsx](contexts/ThemeContext.tsx): Dark/light mode toggle with localStorage persistence
- [contexts/QuizContext.tsx](contexts/QuizContext.tsx): Minimal context for quiz-mode callbacks (not global state container)
- **8 Domain Hooks**: Each manages one feature in isolation:
  - `useChunkedPractice`: Chunked session creation/restore/sync/draft handling
  - `useBattleSystem`: Battle state, monster HP, skill triggers, animations
  - `useAchievements`: Achievement unlock tracking
  - `useChallenges`: Challenge scores and leaderboard data
  - `useStreak`: Consecutive correct counter
  - `useStudyStats`: Total questions, accuracy, study time
  - `useSoundEffects`: Audio playback lifecycle
  - `useKeyboardShortcuts`: Keyboard event handling for quiz navigation

**Functional Updates**: Always use setState with previous state: `setState(prev => ({ ...prev, field: value }))`

## Quiz Engine

**Three Quiz Modes**:
1. **Random**: All questions from selected bank in random order
2. **Mistake**: Only questions from `mistakeLog` (wrong answers previously)
3. **Retry Session**: Resume incomplete quiz session from `mindspark_quiz_session`
4. **Chunked**: Practice by chunk session (`mindspark_practice_sessions`) with per-chunk restore draft

**Question Types** ([types.ts](types.ts#L6-L10)):
- Single-choice: `question.type === 'single'` - one correct answer (string match)
- Multiple-choice: `question.type === 'multiple'` - set of correct answers (array subset match)

**Answer Validation**:
- Single: Direct string comparison
- Multiple: Check if all selected answers are in correct set
- Mistakes logged per question with timestamp

**Real-time Feedback Cycle**:
1. User submits answer → validates against correct answer
2. Log mistake if wrong (increments mistake count, stores last error)
3. Update spaced repetition interval (SM-2 calculation)
4. Show explanation or auto-advance based on `showExplanation` flag
5. Update streaks, achievements, damage on correct answer

**Hint & Explanation System**:
- Lazy state flags in [components/QuizCard.tsx](components/QuizCard.tsx): `showHint`, `showExplanation`
- Revealed on demand, not auto-shown
- Used for learning personalization

## Data Persistence Architecture

**localStorage Key Prefix Convention** ([services/storage.ts](services/storage.ts#L3-L18)):
- All keys prefixed with `mindspark_` (e.g., `mindspark_banks`, `mindspark_recent_mistakes`)
- Bulk cleanup: `localStorage.clear()` "nukes" all data safely

**Persistent Storage Keys**:
- `mindspark_banks`: Array of question banks (guest + cloud-synced)
- `mindspark_recent_mistakes`: Last 5 incorrect session objects (FIFO rotation)
- `mindspark_battle_state`: Full game mode state (damage, monsters, skills)
- `mindspark_quiz_session`: In-progress quiz data (resume on page refresh)
- `mindspark_practice_sessions`: Chunked practice sessions (guest fallback + dirty retry queue)
- `mindspark_chunk_draft:<sessionId>:<chunkIndex>`: Mid-chunk restore snapshot
- `mindspark_spaced_repetition`: SM-2 intervals and easiness factors per question
- `mindspark_streak_data`: Current streak count
- `mindspark_achievements`: Unlocked achievement IDs
- `mindspark_settings`: User settings (rest interval, sound toggle, model name)
- `mindspark_folders`: Question bank folder organization
- `mindspark_bank_folder_map`: Bank-to-folder relationships
- `mindspark_ai_config`: AI provider config (Gemini/OpenAI API keys, model, base URL)
- `mindspark_study_sessions`: Local study analytics

**Guest vs Authenticated Mode**:
- **Guest**: All data in localStorage only, no Supabase access
- **Authenticated**: Banks/questions fetched from Supabase, learning data stays in localStorage for device-specific tracking
- **Sync**: On login, `syncLocalToCloud()` merges local banks with cloud (adds/updates)

## Component Architecture Patterns

**Modal Pattern**: 
- Consistent open/close state management in modals: Settings, Share, Achievements, Challenge, RestBreak, Resume
- See [components/Settings.tsx](components/Settings.tsx), [components/AchievementsModal.tsx](components/AchievementsModal.tsx) for examples
- Controlled by parent app state or local modal state

**Animation Variants**:
- **Why Extracted**: Framer Motion variants extracted outside component to prevent re-renders on every update
- **Example**: `QUIZ_CARD_ANIM` constants in [components/QuizCard.tsx](components/QuizCard.tsx#L38-L43)
- **Pattern**: Define as module-level constant, import into component

**Dashboard Cards Family**:
- Consistent layout/spacing: AchievementsCard, StreakCard, RecentMistakesCard, StudyStatsCard
- Props: `data`, `onAction?` (callback for modal opens)
- Responsive grid layout via Tailwind

**Battle Animation System**:
- Separate components for each attack type:
  - [components/FireballAttack.tsx](components/FireballAttack.tsx): Fireball trajectory and explosion
  - [components/IceArrowAttack.tsx](components/IceArrowAttack.tsx): Projectile arrow animation
  - [components/AttackEffect.tsx](components/AttackEffect.tsx): Damage indicator overlay
  - [components/DamageNumber.tsx](components/DamageNumber.tsx): Floating damage text
  - [components/SkillAnimation.tsx](components/SkillAnimation.tsx): Stat change animations
- All use Framer Motion with precise timing for choreographed sequences

## Testing Patterns

**Unit Tests** (Vitest + jsdom):
- Files in [src/__tests__/](src/__tests__/) mirror source structure
- **Key test files**:
  - [src/__tests__/spacedRepetition.test.ts](src/__tests__/spacedRepetition.test.ts): SM-2 algorithm validation
  - [src/__tests__/useBattleSystem.test.ts](src/__tests__/useBattleSystem.test.ts): Damage, skill triggers, monster rotation
- Focus on: business logic, state transitions, edge cases

**E2E Tests** (Playwright):
- Location: [e2e/](e2e/) directory
- **Port**: Hardcoded to 5200 in [playwright.config.ts](playwright.config.ts#L9)
- **Coverage**:
  - [e2e/json-import.spec.ts](e2e/json-import.spec.ts): Question bank import flow
  - [e2e/quiz-flow.spec.ts](e2e/quiz-flow.spec.ts): Quiz start → answer → completion
  - [e2e/mindspark.spec.ts](e2e/mindspark.spec.ts): Full app flow with game mode

**Testing Guidelines**:
- Add tests for all new logic in `services/` and `hooks/`
- Run `npm test` before pushing
- E2E should cover critical user journeys
- Use React Testing Library for component assertions (preferred over snapshot tests)
## Keyboard Shortcuts

**Quiz Navigation** ([hooks/useKeyboardShortcuts.ts](hooks/useKeyboardShortcuts.ts)):
- **Enter**: Submit answer / advance to next question
- **Space**: Toggle hint visibility
- **Ctrl/Cmd + K**: Open command palette or quick settings
- **Escape**: Close modals

These are implemented for accessibility and power-user experience. Add new shortcuts to the hook, not scatter them across components.

## Error Handling & Security

**Service Layer Error Handling**:
- All storage/cloud functions wrap operations with try-catch
- Return sensible defaults on error (empty array, false, etc.)
- See [services/storage.ts](services/storage.ts#L26-L35) for pattern
- Never throw uncaught errors to UI—wrap in try-catch at component level

**Type Safety**:
- **Strict TypeScript**: No `any` types anywhere
- Use `unknown` for uncertain values, then narrow with type guards
- Define interfaces in [types.ts](types.ts) and [types/battleTypes.ts](types/battleTypes.ts)
- Services must have explicit return types

**Input Validation**:
- Question ID validation in spacedRepetition service
- Grade range checking (0-5 for SM-2)
- Folder name length limits
- Bank name validation before save

**XSS Prevention**:
- DOMPurify imported (see [package.json](package.json#L8)) but used sparingly
- No `dangerouslySetInnerHTML` in codebase
- All user input (question text, explanations) stored as plain text
- Render as text content, not HTML

## Performance Optimization

**Memoization Patterns**:
- Animation variants extracted to module level (prevents recreation)
- Question pool filtering memoized with `useMemo` for complex filters
- Mastery calculations cached when referenced multiple times

**Storage Optimization**:
- Question data cached locally to avoid repeated cloud fetches
- Cache invalidated on bank selection change
- Mistake log limited to 5 most recent (FIFO rotation prevents unbounded growth)

**Bundle & Lazy Loading**:
- Modal components lazy-loaded (conditional render)
- Sound effects lazy init on first interaction via `use-sound` hook + Howler.js
- Battle animations only loaded when game mode enabled

**Tailwind & CSS**:
- Tailwind CSS v4 via `@tailwindcss/vite` plugin
- Custom animations in [index.css](index.css) for battle effects
- Dark mode via Tailwind dark variant (toggled in ThemeContext)

## Git & Review

### Commit Style
- **Imperative**: "Add feature", "Fix bug".
- **Descriptive**: "Fix white screen: add index.tsx entry".

### Pre-Commit Checklist
- [ ] `npm run build` passes.
- [ ] `npm test` passes.
- [ ] No `any` types.
- [ ] Imports sorted.
- [ ] Components typed properly.
- [ ] New services/hooks have tests.
- [ ] No XSS vulnerabilities (no `dangerouslySetInnerHTML`).
- [ ] 完成動作後請以繁體中文說一次。

<!-- >>> project-memory protocol >>> -->
## Memory Refresh Protocol

- This section is additive. Do not rewrite existing `/init` instructions, design system rules, style guidance, or architecture guidance above.
- At task start, read `MEMORY.md` before broad exploration if the file exists.
- If a matching `project-memory` MCP server is available for this repository, use it proactively at task start to inspect `Entry Points`, `Hotspots`, or targeted memory search before broad recursive search.
- If `MEMORY.md` is missing, stale, or the project structure changed, refresh it before continuing.
- At task end, update `MEMORY.md` when you changed architecture, moved files, added new modules, or discovered durable constraints.
- Keep memory project-scoped: do not create `GEMINI.md`, dated memory logs, or duplicate note files unless explicitly requested.
- Prefer one canonical `MEMORY.md` plus nested `AGENTS.md` files for local routing.
- Keep `Aliases & Vocabulary`, `Entry Points`, and `Search Recipes` current so future agents can map user language to the right files quickly.
- If archived reports live under `docs/`, update `docs/INDEX.md` after moving or adding report files.
- If a local memory index is used, keep it under `.memory-index/` inside this project only and never merge it with other projects.
- Never consult another project's `MEMORY.md`, `docs/INDEX.md`, or `.memory-index/` unless the user explicitly asks for cross-project analysis.
- If multiple `project-memory`, `project-memory-*`, or `pm-*` servers are visible, use only the server whose wrapper path or declared root matches this repository. Ignore sibling project servers.
- If `project-memory` MCP wiring is missing for this project, install the local wrapper and project-local MCP config before relying on it.
- Codex: invoke `$project-memory-refresh` when memory needs to be created or refreshed.
- Other agents: follow the same protocol manually by updating the `MEMORY.md` auto-generated map, then curating `Aliases & Vocabulary`, `Entry Points`, `Stable Facts`, `Active Decisions`, `Hotspots`, `Search Recipes`, and `Open Risks`.
<!-- <<< project-memory protocol <<< -->
