## Why

專案在多次重構後累積了大量冗餘代碼：未引用的範例檔案、不再使用的 npm 依賴、多餘的 `export` 關鍵字、廢棄的函式/型別定義、以及同時存在 named + default export 的重複匯出。這些技術債增加了維護負擔、降低了代碼可讀性、並增大了打包體積。根據 `knip v6.16.1` 掃描報告（2026-06-10）及人工深度審計，已識別出 7 大類共計 40+ 項可清理目標。

## What Changes

### 依賴清理
- 移除未使用的運行時依賴 `classnames`
- 移除未使用的開發依賴 `@tailwindcss/postcss`、`autoprefixer`、`postcss`
- 移除未使用的開發依賴 `@testing-library/jest-dom`
- 保留 `package.json` 中對應的 `overrides` 條目（`postcss`）以防堵安全漏洞 (CVE-2023-44270)

### 檔案清理
- 刪除 3 個未引用的 AI Agent 範例檔案 `condition-based-waiting-example.ts`

### Export 作用域收窄
- 移除 8 個元件的冗餘 `export default`（保留 named export）
- 取消 `constants/monstersData.ts` 中 5 個僅內部使用的常數的 `export`
- 取消 `constants/skillsData.ts` 中 8 個僅內部使用的常數/函式的 `export`
- 取消 `services/ai.ts` 中 `cleanJsonResponse` 的 `export`（仍在檔案內部使用）
- 取消 `services/analytics.ts` 中 `getLocalStudySessions` 的 `export`（仍在檔案內部使用）
- 取消 `services/supabase.ts` 中 `isCloudEnabled` 的 `export`（仍在檔案內部使用）
- 取消 `services/storage.ts` 中 3 個僅被 `deleteQuestionArtifacts` 內部調用的函式的 `export`
- 取消 `contexts/ToastContext.tsx` 中 `Toast` 介面的 `export`（仍在檔案內部使用）

### 死碼函式刪除
- 刪除 `constants/monstersData.ts` 中的 `getMonsterByProgress` 函式
- 刪除 `services/ai.ts` 中的 `clearAIConfig` 函式
- 刪除 `services/challenges.ts` 中的 `getPendingChallengesCount` 函式
- 刪除 `utils/questionIdentity.ts` 中的 `isQuestionIdUuid` 函式
- 刪除 `utils/typeGuards.ts` 中的 `isSingleAnswer` 函式

### 死碼型別刪除
- 刪除 `services/analytics.ts` 中未使用的 `StudySession` 介面
- 刪除 `hooks/useChunkedPractice.ts` 中未使用的 `UseChunkedPracticeReturn` 型別
- 取消 `types/battleTypes.ts` 中 3 個僅內部使用的型別的 `export`：`SkillAnimationType`、`SkillThreshold`、`PracticeChunkStatus`
- 物理刪除 `types/battleTypes.ts` 中 2 個完全未使用的型別：`Hero`、`BattleEvent`
- 刪除 `types/battleTypes.ts` 中 `SKILL_THRESHOLDS` 常數的 `export`（僅內部使用）

### 重複匯出清理
- 移除 6 個元件/hook 的冗餘 `export default`（保留 named export）

### 審慎保留
- **`package.json` 中的 `postcss` overrides** — 保留，以確保 Vite 等間接依賴維持使用安全版本 (>= 8.5.10)
- **`@types/dompurify`** — 保留（`DOMPurify` 在 `ai.ts` 和 `BankManager.tsx` 中廣泛使用）
- **`cloudStorage.ts` 中的 `retryCleanupDirtyBanks`、`retryDirtyPracticeSessions`、`batchSaveCloudSpacedRepetition`** — 保留（防禦性預備代碼，`retryCleanupDirtyBanks` 在 `syncLocalToCloud` 中有調用）

## Capabilities

### New Capabilities
_無新功能，此為純重構/清理變更_

### Modified Capabilities
_無規格層面的行為變更。所有修改僅涉及作用域收窄和死碼移除，不影響任何面向用戶的功能。_

## Impact

### 受影響的代碼範圍
| 層級 | 檔案數 | 變更類型 |
|------|--------|----------|
| components/ | 8 | 移除 `export default` |
| constants/ | 2 | 取消 export、刪除死碼函式 |
| services/ | 5 | 取消 export、刪除死碼函式/型別 |
| hooks/ | 2 | 移除 `export default`、刪除未用型別 |
| contexts/ | 1 | 取消 `Toast` 的 export |
| types/ | 1 | 取消 5 個型別 export |
| utils/ | 2 | 刪除死碼函式 |
| package.json | 1 | 移除 5 個未用依賴 |
| AI Agent 範例 | 3 | 物理刪除 |

### 風險與預防
- **隱性引用風險**：所有取消 export 的函式/型別已經過 `grep` 全域搜索確認無外部引用
- **打包影響**：依賴清理後需確認 Vite 構建正常
- **測試影響**：無測試引用被刪除的符號（已驗證）
- **動態載入**：已確認無動態 `import()` 引用相關符號

### 報告誤判修正
- `cleanJsonResponse` — 報告判定為「可安全清理」，實際上仍在 `ai.ts` 內部第 298 行使用，修正為「取消 export」
- `getLocalStudySessions` — 報告判定為「可安全清理」，實際上仍在 `analytics.ts` 內部多處使用，修正為「取消 export」
- `isCloudEnabled` — 報告判定為「可清理」，實際上仍在 `supabase.ts` 內部使用，修正為「取消 export」
- `MistakeLogEntry` — 報告判定為「可安全清理」，實際上在 `types.ts` 第 24 行被 `MistakeLog` 的 index signature 使用，修正為「取消 export」
- `storage.ts` 的 3 個函式 — 報告判定為「大部分可清理」，實際上被 `deleteQuestionArtifacts` 內部調用，修正為「取消 export」
