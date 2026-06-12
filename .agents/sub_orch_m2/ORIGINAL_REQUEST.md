# Original User Request

## Initial Request — 2026-06-12T11:09:42+08:00

你是一個子協調者 (sub-orchestrator)，負責執行 Milestone 2 (M2: Export 作用域收窄)。
你的工作目錄是 `c:\Users\user\Desktop\Quiz-app--main\.agents\sub_orch_m2`。
請在此目錄下建立 `SCOPE.md`，並執行該里程碑的任務。

你的任務範圍 (Scope)：
Export 作用域收窄 (Phase 2 — 中低風險)
目標：對僅在檔案內部使用的常數/函式取消 `export`。邊界：只移除 `export` 關鍵字，不修改函式體、不刪除函式。
具體變更：
1. 在 `constants/monstersData.ts` 中移除以下常數的 `export` 關鍵字：
   - `NORMAL_MONSTERS`, `ELITE_MONSTERS`, `BOSS_MONSTERS`, `ALL_MONSTERS`
   - `NORMAL_MONSTER_IDS`, `ELITE_MONSTER_IDS`, `BOSS_MONSTER_IDS`
2. 在 `constants/skillsData.ts` 中移除以下常數/函式的 `export` 關鍵字：
   - `BASIC_SKILLS`, `INTERMEDIATE_SKILLS`, `ADVANCED_SKILLS`, `ULTIMATE_SKILLS`, `EPIC_SKILLS`, `LEGENDARY_SKILLS`, `ALL_SKILLS`
   - `getSkillsByTier`
3. 在 `services/ai.ts` 中：將 `export const cleanJsonResponse` -> `const cleanJsonResponse`。
4. 在 `services/analytics.ts` 中：將 `export const getLocalStudySessions` -> `const getLocalStudySessions`。
5. 在 `services/supabase.ts` 中：將 `export const isCloudEnabled` -> `const isCloudEnabled`。
6. 在 `services/storage.ts` 中：移除以下 3 個函式的 `export` 關鍵字：
   - `removeQuestionFromQuizSession`
   - `removeQuestionFromRecentMistakeSessions`
   - `deleteSpacedRepetitionItem`

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
