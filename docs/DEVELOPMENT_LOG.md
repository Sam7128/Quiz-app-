# Development Log

## 2026-03-10 [v0.4.2] "Question Identity & Bank Editing Safety"
### 🛡️ Data Integrity
- **穩定題目身份**：新增 `sourceQuestionKey` / `sourceFingerprint` 題目識別欄位，將內部題目 ID 與外部來源識別分離，避免 AI / JSON 匯入重複覆寫不同題庫。
- **匯入合併策略**：`BankManager` 匯入流程改為先以來源鍵/指紋比對現有題目並保留原 ID，再整包覆蓋題庫內容，避免「修改舊題卻被當新題」。
- **雲端去重保護**：`saveCloudQuestions()` 送出 Supabase 前先去除同 payload 重複 ID，避免 `ON CONFLICT DO UPDATE command cannot affect row a second time`。
- **資料清理鏈**：刪除題目時同步清理錯題紀錄、SM-2 複習資料、最近錯題 session 與未完成測驗 session 殘留。

### ✨ UX
- **題庫人工修正**：`BankManager.tsx` 新增單題列表、單題編輯與單題刪除介面，讓使用者能在匯入後手動修正少數異常題目。
- **匯入前檢查提示**：JSON / AI 匯入前會先顯示原始題數、重複來源 ID 合併數、相同內容合併數，以及實際匯入題數，避免使用者誤判「題目被系統吃掉」。
- **匯入模式切換**：題庫管理新增 `追加新題 / 更新同來源題目 / 覆蓋整個題庫` 三種模式，預設使用追加新題，解決既有題庫想新增題目時被整包覆蓋的問題。
- **貼上內容保留**：成功匯入後不再自動清空貼上的 JSON，方便使用者修正後再次匯入。
- **題庫管理捲動修正**：移除題庫管理頁右側固定高度造成的裁切，貼上 JSON 區改為頁面自然捲動並允許手動拉高文字框，避免匯入介面被遮擋。
- **社交分享一致性**：接受好友分享題庫時改為保留來源識別並重新分配內部 UUID，讓跨題庫副本彼此獨立。

### 🧪 Tests & Migrations
- **單元測試**：新增 `questionIdentity.test.ts`、`storage.questionArtifacts.test.ts`，並擴充 `cloudStorage.test.ts` 覆蓋去重與穩定 ID 行為。
- **Migration**：新增 `docs/migrations/supabase_question_identity_migration.sql`，為 `questions` 表加入來源識別欄位與索引。
+
+## 2026-03-08 [v0.4.0] "Unified Memory Architecture"
+### 🛠️ Infrastructure & Memory
+- **Unified Agent Entrance**: Created `.gemini/settings.json` to unify context on `AGENTS.md`. Removed redundant `GEMINI.md`.
+- **Nested Memory System**: Implemented directory-level `AGENTS.md` for `components/`, `services/`, `hooks/`, `contexts/`, `constants/`, `src/__tests__/`, `e2e/`, and `openspec/`.
+- **Protocol Migration**: Moved 9 critical development protocols from global memory to project-level `AGENTS.md` "Absolute Rules" (鐵規).
+- **Root Directory Sanitization**:
+    - **Reports**: Moved all security/audit/diagnostic reports to `docs/reports/`.
+    - **Migrations**: Moved all SQL scripts to `docs/migrations/`.
+    - **Logs**: Moved all error/TSC/system logs to `docs/logs/`.
+    - **Archive**: Moved old verification prompts and design docs to `docs/archive/`.
+    - Reduced root contamination from 80+ files to a clean developer-centric list.
+
+### 🛡️ Type Safety
+- Verified `npx tsc --noEmit` compatibility (preserved KG legacy errors without adding new ones).


## 2026-02-04 [v0.3.0]
### ✨ New Features
- **Game Mode (RPG Battle Arena)**:
  - Implemented global `gameMode` toggle in `Settings.tsx` with persistence.
  - Developed `BattleArena` component with "Underground" theme (Dark mode optimized).
  - Added "Stage Transition" full-screen animation when clearing levels.
  - Integrated battle logic into `QuizCard` with global state management.

### 🐛 Bug Fixes & Refactoring
- **Accessibility (A11y)**:
  - Added `aria-label` to all icon-only buttons in `Settings.tsx` and `App.tsx` [Fixes "Buttons must have discernible text"].
  - Added `aria-label` to select elements [Fixes "Select element must have an accessible name"].
- **Code Quality**:
  - Removed duplicate `onAnswer` and `onNext` props in `App.tsx` [Fixes "JSX duplicate properties"].
  - Refactored `QuizCard.tsx` to remove redundant local state (`battleMode`) in favor of global props.
  - Fixed lint errors for redeclared variables in `BattleArena.tsx`.

### 📝 Documentation
- Updated `CHECKLIST.md` marking Game Mode as complete.
- Updated `GEMINI.md` with recent changes.

## 2026-02-05 [v0.3.1]
### 🐛 Bug Fixes
- **Accessibility (A11y)**:
  - Fixed "Buttons must have discernible text" in `AIHelper.tsx` by adding `aria-label` and `title` to close and send buttons.
  - Fixed "Form elements must have labels" in `BankManager.tsx` by associating inputs with labels.

### ✨ New Features
- **AI PDF Question Generation**:
  - Added PDF upload support in `BankManager` (AI Tab).
  - Integrated Google Gemini 1.5 for analyzing PDF content and generating questions.
  - Added options for **Question Language**, **Question Type** (Single/Multiple/Mixed), and **Explanation Language**.
- **Battle Mode Enhancements**:
  - Added `FireballAttack` animation with `framer-motion` (GPU accelerated).
  - Integrated Sound Effects System (`useSoundEffects`) for BGM and SFX.
- **Settings**:
  - Added Custom Model Name support for Google provider.
  - Added Audio Settings (BGM/SFX toggles).

## 2026-02-05 [v0.3.2]
### ✨ New Features
- **Data Management (Root Out)**:
  - **Batch Delete**: Implemented multi-bank deletion in `Dashboard.tsx` via checkbox selection.
  - **System Nuke**: Added "Danger Zone" in `Settings.tsx` to wipe all local data and configurations.
  - **Enhanced Reset Protocol**: Modified nuke logic to forcefully sign out from Supabase and clear all `localStorage` keys with prefix `mindspark_` to ensure total cleanup.
  - **Sample Data**: Created `multiple_choice_sample.json` for testing multiple-choice imports.

### 🐛 Bug Fixes
- **Console Optimization**:
  - Replaced Supabase `.single()` with `.limit(1)` in analytics and streak services. This eliminates noisy "406 Not Acceptable" log errors when no rows are found, improving developer experience and console purity.
- **Naming Alignment**:
  - Renamed `lich_king.png` to `skeleton_wizard.png` to match updated monster data and prevent asset potential 404s.

## 2026-02-05 [v0.3.3] "Battle Mode Overhaul"
### ✨ New Features
- **Battle System 2.0**:
  - Refactored `useBattleSystem` with dynamic damage, critical hits, and shielding mechanics.
  - Implemented Monster rotation (Normal -> Elite -> Boss) with difficulty scaling based on questions answered.
  - Unified `AttackEffect` system supporting random animations (Fireball/Ice Arrow) and visual feedback.
- **Quiz Experience**:
  - **Result Dashboard**: New `QuizResult` component with detailed stats, mistake review mode, and achievement summary.
  - **Focus Tools**: Added `MiniTimer` (Pomodoro style) and `RestBreakModal` (Study fatigue check).
  - **Keyboard Hints**: Added visual shortcut keys (1-4) to option buttons for better usability.
- **Persistence**:
  - Implemented auto-save/restore for active quiz sessions (survives refresh).
  - Battle state is now persistent (HP/Streak/Monster maintained across reloads).

### 🐛 Bug Fixes
- **Accessibility**: Fixed missing aria-labels in `AchievementsModal` and `QuizCard` header buttons.
- **Visuals**: Standardized damage number rendering with `DamageNumber` component.

## 2026-02-05 [v0.3.4] "Dashboard & UX Polish"
### ✨ New Features
- **Dashboard UX**:
  - **Recent Mistakes**: Added a dedicated card to track and review the last 5 incorrect answer sessions (FIFO).
  - **Achievements**: Made the achievements card interactive with a full-view modal.
  - **Default Quiz Size**: Changed default from 20 to "All questions" for continuous study flow.
- **Settings**:
  - **Custom Rest Interval**: Users can now set a custom numeric value for rest break intervals (e.g., every 15 questions).

## 2026-02-08 [v0.3.6] "Security & Tailwind v4 Migration"
### ✨ Security Hardening
- **Content Security Policy (CSP)**: Added strict meta tags in `index.html` to control resource sources.
- **CDN Elimination**: Removed unauthenticated Tailwind CDN and migrated to local build process to mitigate supply chain risks.
- **Security Audit**: Completed full audit using `security-audit` skill; achieved Security Score **A**.

### 🛠️ Technical Refactoring
- **Tailwind CSS v4 Migration**:
    - Upgraded to Tailwind v4 using `@tailwindcss/vite` and standard CSS variables in `index.css`.
    - Resolved PostCSS ESM module compatibility issues (`postcss.config.js` syntax).
    - Fixed UI contrast issues by defining full range of brand and accent colors (fixing "fade-to-white" bug).
- **VS Code Optimization**: Added `.vscode/settings.json` to suppress Tailwind-specific linting warnings in CSS files.

## 2026-02-09 [v0.3.7] "Skills-Based Optimization"
### 🚀 Performance & Reliability
- **AI Prompt Optimization (Phase 1)**:
  - Implemented strict JSON Schema enforcement in `services/ai.ts` for reliable question generation.
  - Added Few-Shot prompting and auto-recovery mechanisms to handle malformed LLM responses.
- **React Performance (Phase 2)**:
  - Analyzed and fixed unstable prop references in `App.tsx` preventing `Dashboard` memoization.
  - Removed duplicate state updates in `startQuiz` reducing render cycles.
- **Battle System Debugging (Phase 3)**:
  - Added DEV-only state transition logging in `useBattleSystem.ts` for easier debugging.
  - Standardized skill trigger logic (Milestones: 5, 10, 20, 30...) in `constants/skillsData.ts`.
  - Added comprehensive unit tests in `src/__tests__/useBattleSystem.test.ts` verifying state logic.
- **Security Audit (Phase 5)**:
  - Verified `npm audit` (0 vulnerabilities).
  - Confirmed XSS safety (no `dangerouslySetInnerHTML`).
  - Reviewed CSP configuration for development flexibility.

## 2026-02-10 [v0.3.8] "Infrastructure & Safety Refactor"
### ✨ 功能與重構
- **架構品質優化 (v0.3.9)**：
    - **App 組件重構**：將 `App.tsx` 的渲染邏輯抽離至 `AppContent.tsx`，成功將 `App.tsx` 行數從 309 行減少至 149 行。
    - **型別安全驗證**：解決了 `App.tsx` 與 `AppContent.tsx` 之間大規模 Props 傳遞的型別不匹配問題，達成 `npx tsc --noEmit` 零錯誤。
    - **命名衝突修復**：將 `confirm` 鉤子更名為 `confirmDialog` 以避免與原生 `window.confirm` 衝突。
    - **檔案組織優化**：將 `typeGuards.ts` 移至 `utils/` 目錄並修正其內部導入。
    - **系統穩定性**：通過全域 `build` 測試，確保重構未破壞現有功能。
- **Toast/Confirm 系統**：新增一致的通知與確認流程。
- **Repository 基礎架構**：導入 `IStorageRepository`、本地/雲端 repository 與 `RepositoryContext`。
- **導覽結構**：抽離 `AppHeader` 與 `MobileNav` 元件。

### 🛡️ 穩定性與安全
- **ErrorBoundary**：新增全域錯誤防護。
- **型別安全修正**：補強型別檢查與邊界處理。
- **CSP 強化**：收斂資源來源規則。

### 🧪 測試
- 因 shell/pwsh 不可用，未執行測試與建置。

## 2026-02-10 [v0.3.9] "Architecture Quality Overhaul Complete"
### ✨ Major Refactoring
- **App.tsx Decomposition**:
    - Extracted `appReducer` and `initialAppState` to `reducers/appReducer.ts` (-50 lines).
    - Extracted data loading logic to `hooks/useAppDataLoader.ts` (-75 lines).
    - Extracted `GlobalModals` component to handle settings, resume, and share modals (-30 lines).
    - Reduced `App.tsx` complexity significantly, improving maintainability.

### 🛠️ Infrastructure
- **Unified Data Loading**: Centralized initial data fetching and quiz pool loading in `useAppDataLoader`.
- **Modal Management**: Centralized modal logic in `GlobalModals.tsx`.

### 🛡️ Type Safety & Tests
- **Broken Imports**: Fixed broken import paths in `src/__tests__/appReducer.test.ts` caused by the refactor.
- **Type Solidification**: Updated `QuizState` interface to support all quiz modes correctly.

### 📝 Notes
- **Verification Complete**: 
    - `App.tsx` line count: **297 lines** (Task verified ✓).
    - Production build: `npm run build` SUCCEEDED (Verified ✓).
    - Known issue: Local environment missing `@types/react` causes linting errors in `ErrorBoundary.tsx`, but logic is build-ready.

## 2026-02-11 [v0.3.10] "Console Purity & Stability"
### 🐛 Bug Fixes
- **Console Warnings Optimization**:
  - **Favicon 404**: Added `public/favicon.svg` and linked it in `index.html` to eliminate persistent browser 404 errors.
  - **Supabase 400 (Challenges)**: Refactored `getMyChallenges` in `services/challenges.ts` to use a **Manual Join** strategy (fetching raw challenges then fetching profiles/banks separately). This bypasses unreliable PostgREST embedded resource syntax and resolves the 400 Bad Request error.
- **Spec Integrity**:
  - Incremented OpenSpec documentation by syncing `fix-console-warnings` delta spec into the main `social-sharing` specification.
  - Successfully archived the `fix-console-warnings` change workflow.

### 🛠️ Infrastructure
- **Verification**: Confirmed fix via `browser_subagent` and successful production build (`npm run build`).



## 2026-02-11 [v0.3.11] "Deployment Stability & Optimization"
### 🐛 Build Fixes
- **Dependency Resolution**:
  - Downgraded `eslint` and `@eslint/js` to v9.x to resolve peer dependency conflict with `typescript-eslint` causing `npm install` failures.
  - Successfully verified fresh install and build process.

### 🚀 Optimization
- **Bundle Size**:
  - Implemented manual chunk splitting in `vite.config.ts` to separate vendor libraries (React, Framer Motion, Recharts, API Clients).
  - Reduced main entry bundle size and eliminated Vite "large chunk" warnings.

## 2026-03-10 [v0.4.1] "Project Memory MCP Repair"
### 🛠️ Infrastructure & Memory
- **MCP Runtime Fix**:
  - Repaired `C:\\Users\\user\\.codex\\skills\\project-memory-refresh\\scripts\\project_memory_mcp_server.py` by restoring module-level `score_entry()` scope, fixing `search_memory` runtime failure (`name 'score_entry' is not defined`).
- **Project-Local Memory Wiring**:
  - Generated `MEMORY.md`, `.project-memory/project_memory_mcp_entry.py`, `.codex/config.toml`, `.cursor/mcp.json`, and `.mcp.json` for repo-local project memory routing.
  - Rebuilt `docs/INDEX.md` and `.memory-index/` so project memory search no longer depends on the global auto-root server.
- **Skill Hardening**:
  - Added `verify_project_memory_mcp.py` so `project-memory-refresh` now validates the repo-local MCP server immediately after refresh.
  - Updated `refresh_project_memory_bundle.py` to execute post-refresh MCP verification automatically.
  - Updated `ensure_project_mcp_configs.py` so Antigravity remains enabled by default for frequent AntiGravity users, but global write failures now degrade to warnings unless `--require-antigravity` is explicitly requested.
- **Known Limitation**:
  - `refresh_project_memory_bundle.py` attempted to update `%USERPROFILE%\\.gemini\\antigravity\\mcp_config.json` and hit a permission boundary; local repo MCP config was already installed successfully, so Codex/Gemini/Cursor project-local usage is unaffected.
