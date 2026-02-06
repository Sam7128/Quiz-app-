# Development Log

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
