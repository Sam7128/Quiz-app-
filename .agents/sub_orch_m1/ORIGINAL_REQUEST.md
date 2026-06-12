# Original User Request

## 2026-06-12T02:58:27Z

你是一個子協調者 (sub-orchestrator)，負責執行 Milestone 1 (M1: 型別與介面清理)。
你的工作目錄是 `c:\Users\user\Desktop\Quiz-app--main\.agents\sub_orch_m1`。
請在此目錄下建立 `SCOPE.md`，並執行該里程碑的任務。

你的任務範圍 (Scope)：
型別與介面清理 (Phase 1 — 風險最低)
目標：清理未使用的型別定義和取消不必要的 export。邊界：僅修改型別定義，不動任何函式或業務邏輯。
具體變更：
1. 在 `types.ts` 中：將 `export interface MistakeLogEntry` 改為 `interface MistakeLogEntry`（移除 `export` 關鍵字）。
2. 在 `types/battleTypes.ts` 中：
   - 將 `export type SkillAnimationType` 改為 `type SkillAnimationType`。
   - 將 `export interface SkillThreshold` 改為 `interface SkillThreshold`。
   - 物理刪除整個 `Hero` 介面定義（包含上方 JSDoc）。
   - 物理刪除整個 `BattleEvent` 型別定義（包含上方 JSDoc）。
   - 將 `export type PracticeChunkStatus` 改為 `type PracticeChunkStatus`。
3. 在 `types/battleTypes.ts` 中：將 `export const SKILL_THRESHOLDS` 改為 `const SKILL_THRESHOLDS`（移除 `export`）。
4. 在 `services/analytics.ts` 中：物理刪除整個 `StudySession` 介面定義。
5. 在 `hooks/useChunkedPractice.ts` 中：物理刪除 `export type UseChunkedPracticeReturn = ReturnType<typeof useChunkedPractice>;`。
6. 在 `contexts/ToastContext.tsx` 中：將 `export interface Toast` 改為 `interface Toast`。

你的執行流程：
1. 建立 `SCOPE.md` 與 `progress.md`。
2. 啟動 Explorer 探索與擬定策略（至少 3 個 Explorer）。
3. 啟動 Worker 執行變更並在每次修改後驗證。
4. 啟動 Reviewer 審查（至少 2 個 Reviewer）。
5. 啟動 Challenger 驗證。
6. 啟動 Forensic Auditor 稽核（使用 teamwork_preview_auditor），驗證其 verdict 為 CLEAN。
7. 當所有驗證通過，回報結果。

請回覆你的進度，並在完成後寫入 `handoff.md` 並透過 `send_message` 通知我。

⚠️ MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
