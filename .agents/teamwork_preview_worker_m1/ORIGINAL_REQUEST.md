## 2026-06-12T03:00:22Z

你的工作目錄是 `c:\Users\user\Desktop\Quiz-app--main\.agents\teamwork_preview_worker_m1`。
請在此目錄下建立你的 `progress.md` 紀錄心跳。

你的任務是執行型別與介面清理（M1: 型別與介面清理）。
請詳細閱讀並參考此 Synthesis 報告以獲取具體變更策略與行號：
`c:\Users\user\Desktop\Quiz-app--main\.agents\sub_orch_m1\synthesis.md`
亦可參考 `c:\Users\user\Desktop\Quiz-app--main\.agents\teamwork_preview_explorer_m1_3\handoff.md`。

具體變更要求：
1. 在 `types.ts` 中：將 `export interface MistakeLogEntry` 改為 `interface MistakeLogEntry`（移除 `export` 關鍵字）。
2. 在 `types/battleTypes.ts` 中：
   - 將 `export type SkillAnimationType` 改為 `type SkillAnimationType`。
   - 將 `export interface SkillThreshold` 改為 `interface SkillThreshold`。
   - 物理刪除整個 `Hero` 介面定義（包含上方 JSDoc）。
   - 物理刪除整個 `BattleEvent` 型別定義（包含上方 JSDoc）。
   - 將 `export type PracticeChunkStatus` 改為 `type PracticeChunkStatus`。
   - 將 `export const SKILL_THRESHOLDS` 改為 `const SKILL_THRESHOLDS`。
3. 在 `services/analytics.ts` 中：物理刪除整個 `StudySession` 介面定義。
4. 在 `hooks/useChunkedPractice.ts` 中：物理刪除 `export type UseChunkedPracticeReturn = ReturnType<typeof useChunkedPractice>;`。
5. 在 `contexts/ToastContext.tsx` 中：將 `export interface Toast` 改為 `interface Toast`。

你的工作守則：
- 僅修改上述型別定義與 export，絕對不要動任何函式或業務邏輯。
- 所有程式碼變更必須使用 replace_file_content 進行，且應避免截斷程式碼。
- 每次變更或全部變更完成後，必須執行以下驗證並记录結果：
  1. `npx tsc --noEmit`（TypeScript 編譯檢查）
  2. `npm test`（執行單元測試）
  3. `npm run build`（驗證打包建置）
- 所有說明與 handoff.md 必須使用繁體中文。

⚠️ MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

在執行完成且所有驗證（tsc、test、build）均通過後，在你的工作目錄 `c:\Users\user\Desktop\Quiz-app--main\.agents\teamwork_preview_worker_m1` 中建立 `handoff.md` 報告（說明修改內容、檔案路徑與驗證命令的執行結果），並透過 `send_message` 通知我。
