# Project: MindSpark Dead Code Cleanup & Refactoring

本項目旨在對 MindSpark Quiz App 進行死碼清理與元件 Export 重構，優化系統結構並確保 100% 通過 TypeScript 型別檢查、Vite 生產建置與 Vitest 單元測試。

## Architecture

MindSpark 是一個基於 React + TypeScript + Vite + Tailwind CSS v4 的單頁應用程式 (SPA)。
本次重構著重於程式碼衛生 (Code Hygiene)、Export 作用域收窄、廢棄程式碼物理刪除、以及 React 元件 named export & React.memo 效能封裝。

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M0 | 基線建立與環境檢查 | 執行測試、型別檢查與構建並記錄基線結果 | None | DONE |
| M1 | 型別與介面清理 | 清理 `types.ts`, `types/battleTypes.ts`, `services/analytics.ts` 等未使用的型別與 export | M0 | DONE |
| M2 | Export 作用域收窄 | 對僅在檔案內部使用的常數/函式取消 `export` | M1 | IN_PROGRESS |
| M3 | 物理刪除廢棄函式 | 物理刪除 5 個已確認無引用的廢棄函式 | M2 | PLANNED |
| M4 | 元件 Export 重構與 Memoization | 移轉元件為 named exports 並用 React.memo 進行效能封裝，移除其 `export default` | M3 | PLANNED |
| M5 | 依賴與範例檔案清理 | 移除 `package.json` 中的 5 個未使用依賴，刪除 3 個範例檔案 | M4 | PLANNED |
| M6 | 最終驗證與文檔更新 | 執行完整三連驗證，確認對比基線，更新日誌與報告 | M5 | PLANNED |

## Interface Contracts & Code Layout

本次清理不新增或修改外部介面契約，僅優化內部模組的封裝邊界。

### 影響檔案清單
- `types.ts`
- `types/battleTypes.ts`
- `services/analytics.ts`
- `hooks/useChunkedPractice.ts`
- `contexts/ToastContext.tsx`
- `constants/monstersData.ts`
- `constants/skillsData.ts`
- `services/ai.ts`
- `services/supabase.ts`
- `services/challenges.ts`
- `services/storage.ts`
- `utils/questionIdentity.ts`
- `utils/typeGuards.ts`
- `components/AIPromptGuide.tsx`
- `components/BankManager.tsx`
- `components/BattleArena.tsx`
- `components/Dashboard.tsx`
- `components/DialogueBubble.tsx`
- `components/QuizCard.tsx`
- `components/Settings.tsx`
- `components/SkillAnimation.tsx`
- `components/SkeletonLoader.tsx`
- `hooks/useBattleSystem.ts`
- `components/AppContent.tsx`
- `src/__tests__/useBattleSystem.test.ts`
- `package.json`
- 3個範例檔案
