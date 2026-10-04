# P1 Learning Experience & Stats 最終獨立審計報告 (Independent Audit Report)

- **審計代號**：`audit_INQ8`
- **審計角色**：第二位高階 AI（Project Inquisitor 獨立代碼審計者）
- **審計日期**：2026-09-30
- **審計標的**：`openspec/changes/p1-learning-experience-and-stats`
- **審計標準**：OpenSpec 規格與實作對齊、極端分支與偽綠燈 (False Green)、Ponytail Audit (YAGNI/過度工程)、Ponytail Debt (技術債帳簿)、TypeScript/Lint/Knip/Build 品質門禁
- **最終判定**：🛑 **BLOCKED / 條件性退回 (Conditional Reject)**

---

## 1. 阻塞級邏輯缺陷 (Critical Blockers)

### 🔴 C-01: 持久化失敗時將 Session 永久標記為 Settled，徹底阻斷重試能力，違反 Spec 契約

- **關聯規格**：[`specs/study-session-settlement/spec.md`](file:///c:/Users/user/Desktop/Quiz-app-/openspec/changes/p1-learning-experience-and-stats/specs/study-session-settlement/spec.md#L48-L52) — `Scenario: Storage failure does not break navigation and preserves retry capability`
- **問題源碼**：[`hooks/useQuizEngine.ts`](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useQuizEngine.ts#L306-L338)
```typescript
try {
  await repository.recordStudySession(answeredCount, correctCount, durationSeconds, 'quiz');
  if (answeredCount > 0 && trackQuizCompletion) {
    await trackQuizCompletion({ score: correctCount, totalQuestions: answeredCount });
  }
} catch (storageErr) {
  console.warn(`[QuizEngine] settleCurrentSession (${reason}) storage error (fault-isolated):`, storageErr);
}

isSettledRef.current = true; // ⚠️ 致命缺陷：不管持久化成功或失敗，無條件標記為已結算！
```
- **缺陷機理**：
  1. 當 `recordStudySession` 或 `trackQuizCompletion` 遭遇 LocalStorage 配額超限或網路中斷而拋出異常時，內層 `catch` 僅輸出 `console.warn`，而外層卻無條件將 `isSettledRef.current` 標記為 `true`。
  2. 隨後 `handleExitQuiz()` 立即執行 `setSessionStartTime(null)` 清空 session 起點。
  3. 這導致當次學習時長與已答題數在失敗後**永久丟失**，且後續任何重試（Retry）呼叫均因 `isSettledRef.current === true` 而被門禁直接攔截跳過。
- **偽綠燈 (False Green) 成因**：
  - [`src/__tests__/studySessionSettlement.test.ts`](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/studySessionSettlement.test.ts#L273-L312) 僅斷言了「拋出異常時不會 crash 且正常導航」，但**完全未測試**「持久化失敗後，再次呼叫結算是否能成功重試」。表面綠燈掩蓋了底層資料遺失漏洞。
- **整改措施**：
  - 僅在持久化操作均成功完成後才將 `isSettledRef.current` 設為 `true`。
  - 若持久化失敗，應釋放門鎖（`isSettlingRef.current = false`），保持 `isSettledRef.current = false`，並保留 `sessionStartTime`，以允許後續重試嘗試。

---

### 🔴 C-02: Chunked Practice（分階段練習）完成路徑完全未結算 Study Sessions 學習統計

- **關聯規格**：[`specs/study-session-settlement/spec.md`](file:///c:/Users/user/Desktop/Quiz-app-/openspec/changes/p1-learning-experience-and-stats/specs/study-session-settlement/spec.md#L25-L29) — `Scenario: Chunked practice completion and abandonment settlement`
- **問題源碼**：[`hooks/useChunkedPractice.ts`](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useChunkedPractice.ts#L319-L362)、[`components/AppSessionContainer.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/components/AppSessionContainer.tsx#L75-L98)
- **缺陷機理**：
  1. 在 Chunked Practice 模式下，當使用者完成一個 Chunk（如第 1 階段 10 題）時，`useQuizEngine` 觸發 `onChunkComplete`，轉發至 `chunkedPractice.completeChunk`。
  2. `completeChunk` 僅將進度更新到 `practice_sessions` 資料表並清除草稿，**完全沒有調用 `settleCurrentSession` 或 `repository.recordStudySession`**。
  3. 使用者在結算彈窗點擊「繼續下一階段」時，`startQuiz` 立即重置 `sessionStartTime` 展開新 Chunk。前一階段所花費的作答時長與做題數在 `study_sessions` 與儀表板學習統計（今日學習時長/總題數）中**完全漏計**。
- **偽綠燈 (False Green) 成因**：
  - [`src/__tests__/useQuizEngine.chunked.test.ts`](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/useQuizEngine.chunked.test.ts) 只斷言了 `onChunkComplete` 傳遞的 payload 結構；[`src/__tests__/useChunkedPractice.test.ts`](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/useChunkedPractice.test.ts) 只斷言了 practice session 的內部狀態。兩者均未對 `recordStudySession` 進行 spy 斷言，造成任務 5.6 在無統計持久化的情況下被打勾為 `[x]`。
- **整改措施**：
  - 在 `useQuizEngine` 觸發 `onChunkComplete` 或 `completeChunk` 的入口處，先執行當前 chunk session 的結算（`recordStudySession`），並補齊對應的單元測試。

---

## 2. 偽綠燈 (False Green) 與非阻塞規格警告

### ⚠️ W-01: QuizResult 正確答案的 ARIA Label 偏離 Spec 精確契約

- **問題源碼**：[`components/QuizResult.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/components/QuizResult.tsx#L212)
- **關聯規格**：[`specs/wrong-answer-comparison/spec.md`](file:///c:/Users/user/Desktop/Quiz-app-/openspec/changes/p1-learning-experience-and-stats/specs/wrong-answer-comparison/spec.md#L11) 要求 `aria-label="正確答案: B. 呼吸作用"`（包含選項具體文字內容）。
- **實作現狀**：程式碼硬編碼為 `aria-label="正確答案"`（缺少選項文字）；Fallback 模式（Line 133）亦為固定字串。
- **偽綠燈成因**：[`src/__tests__/wrongAnswerComparison.test.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/wrongAnswerComparison.test.tsx#L58) 測試直接將斷言寫為 `.toBe('正確答案')`，測試適應了縮水的實作而非校驗規格。
- **整改措施**：將標籤改為 `aria-label={`正確答案: ${opt}`}`，並同步更新測試斷言。

---

### ⚠️ W-02: Battle Mode 自動切題未覆蓋正常演出事件完成路徑之單元測試

- **問題源碼**：[`components/QuizCard.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/components/QuizCard.tsx#L118-L132)
- **關聯規格**：[`specs/battle-mode/spec.md`](file:///c:/Users/user/Desktop/Quiz-app-/openspec/changes/p1-learning-experience-and-stats/specs/battle-mode/spec.md#L16-L19)
- **覆蓋缺口**：[`src/__tests__/autoAdvance.test.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/autoAdvance.test.tsx#L277-L313) 僅測試了「2000ms 兜底安全計時器超時強制推進」的降級分支，對於「戰鬥演出正常觸發 (`activePresentationEvent !== null`) 並結束後延遲 400ms 推進」的核心正常路徑，完全沒有單元測試驗證。
- **整改措施**：在 `autoAdvance.test.tsx` 補充 mock `useBattleSystem` 發出並完成 presentation event 的 400ms 切題測試。

---

### ⚠️ W-03: 測試執行期間存在 React `act()` 邊界未對齊之訊號警告

- **問題源碼**：[`src/__tests__/autoAdvance.test.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/autoAdvance.test.tsx)、[`src/__tests__/studySessionSettlement.test.ts`](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/studySessionSettlement.test.ts)
- **現狀**：測試執行時輸出大量 `An update to QuizCardComponent inside a test was not wrapped in act(...)` 與 `overlapping act() calls` 警告。
- **風險**：非同步 Timer 與結算 Promise 的邊界未妥善等待，容易在 CI 環境因排程微小延遲造成非確定性失敗（Flaky Tests），或掩蓋元件卸載後更新狀態的記憶體洩漏。

---

## 3. Ponytail Audit（YAGNI 與過度工程審查）

依 `ponytail-audit` 規範對本次變更範圍進行檢視：

1. `yagni:` [`components/AppContent.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/components/AppContent.tsx#L145-L180) 中保留了一套完整的 fallback `settleCurrentSession` 實作及其專屬的 `isSettlingRef`、`isSettledRef`、`activeSessionTokenRef`。然而實際架構中唯一父層 [`components/AppSessionContainer.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/components/AppSessionContainer.tsx#L261-L265) 始終將 `useQuizEngine` 及其導出的 `settleCurrentSession` 傳入。`AppContent` 內部的 fallback 屬於無 caller 的重複冗餘邏輯（Dead Fallback）。
   - **替代方案**：將 `settleCurrentSession` 作為 `quizEngine` 的確定屬性，直接調用 `quizEngine.settleCurrentSession(reason)`，刪除 `AppContent` 內的 fallback 實作與重複 refs（預計精簡 ~35 行代碼）。

2. `delete:` [`hooks/useQuizEngine.ts`](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useQuizEngine.ts#L67) 與 [`components/AppContent.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/components/AppContent.tsx#L128) 中的 `activeSessionTokenRef` 雖然在每次啟動測驗時被賦值 `String(Date.now())`，但在 `settleCurrentSession` 中**完全沒有任何代碼讀取或校驗此 Token**（防重全依賴 boolean flags）。該 Token 屬於未實際生效的外觀裝飾代碼。
   - **替代方案**：若不實作多世代 Session Token 比對，應直接移除該 ref 宣告與賦值；若需支援交錯世代防護，應在 `settleCurrentSession` 顯式比對 generation ID。

- **Ponytail 收益**：預計可淨刪除約 **45 行** 冗餘與無效防禦代碼，無新增第三方依賴。

---

## 4. Ponytail Debt（技術債帳簿檢閱）

依 `ponytail-debt` 規範掃描專案內所有註解標記（排除歷史歸檔 specs 與文件）：

| 檔案路徑與行號 | 註解內容與技術債簡述 | Ceiling（承載上限）/ Upgrade Path（退場條件） | 是否屬本次變更 |
|---|---|---|---|
| [`components/KnowledgeGraph/NodeEditPanel.tsx:266`](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/NodeEditPanel.tsx#L266) | 保留 legacy `fontWeight` 欄位相容 schema-v2 讀取器 | **Ceiling**: schema-v2 migration window closes 2026-10-01<br>**Upgrade**: 2026-10-01 後徹底移除該欄位 | 否（既有圖譜債） |
| [`services/storage.ts:35`](file:///c:/Users/user/Desktop/Quiz-app-/services/storage.ts#L35) | localStorage 暫存機制標記 | **Ceiling**: v2.0 全面遷移至 user-scoped IndexedDB<br>**Upgrade**: IndexedDB 遷移完成後正式退役 | 否（既有儲存債） |

- **帳簿統計**：全專案共 **2 筆** marker，**0 筆** `no-trigger`（無靜默腐化風險）。本次變更新增 **0 筆** 技術債 marker。

---

## 5. 流程標記與交付狀態審查

- **任務勾選現狀**：`tasks.md` 中 1.1 至 8.6 任務在文檔層面均已勾選為 `[x]`。
- **狀態分類**：
  - **待提交確認**：工作樹存在尚未執行 `git commit` 的修改檔案（屬交付流程待確認事項，非代碼 CRITICAL 漏洞）。
  - **實作與標記不一致 (CRITICAL)**：Task 5.6 與 Task 5.1 在代碼邏輯上仍存在 C-01 與 C-02 缺陷，雖然文檔已標記 `[x]`，但實際功能未達 Spec 驗收標準。

---

## 6. 品質閘門執行結果 (Quality Gate Verification)

| 檢驗項目 | 指令 | 結果 | 備註 |
|---|---|---|---|
| **TypeScript 編譯** | `npx tsc --noEmit` | ✅ **0 Errors** | 型別完全通過 |
| **全量單元測試** | `npm test` | ✅ **66 files / 432 passed** | 全數通過（但存在 C-01/C-02/W-01 偽綠燈） |
| **P1 專屬測試** | `npm test -- <7 files>` | ✅ **7 files / 30 passed** | 本次新增測試全數通過 |
| **生產環境打包** | `npm run build` | ✅ **Build Success** | Vite + Tailwind CSS v4 打包正常 |
| **代碼無死導出** | `npx knip --reporter compact` | ✅ **0 Issues** | 無未使用導出或死檔案 |
| **靜態代碼檢查** | `npm run lint` | ⚠️ **0 errors / 7 warnings** | 測試檔中存在少量未使用的 import 變數 |

---

## 7. 最終裁決與整改清單 (Remediation Checklist)

### 🛑 裁決：BLOCKED (退回修改，修復完成後方可 Archive)

在完成以下 4 項關鍵整改前，**強烈建議不得進行 OpenSpec Archive 或發布上線**：

1. [ ] **修復 C-01（結算重試契約）**：
   - 在 [`hooks/useQuizEngine.ts`](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useQuizEngine.ts) 的 `settleCurrentSession` 中，將 `isSettledRef.current = true` 移至持久化成功區塊內。
   - 在 [`src/__tests__/studySessionSettlement.test.ts`](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/studySessionSettlement.test.ts) 新增測試：「首次持久化 reject，再次呼叫結算時成功重試並完成寫入」。
2. [ ] **修復 C-02（Chunked Practice 統計結算）**：
   - 在 Chunk 完成與中途放棄路徑中，顯式調用 `recordStudySession` 結算該階段之做題數與時長。
   - 在 [`src/__tests__/useChunkedPractice.test.ts`](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/useChunkedPractice.test.ts) 新增對 `recordStudySession` 被正確調用的斷言。
3. [ ] **修復 W-01（ARIA Label 精確契約）**：
   - 將 [`components/QuizResult.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/components/QuizResult.tsx) 中的 `aria-label` 更新為 `aria-label={`正確答案: ${opt}`}`，並同步更新測試。
4. [ ] **消除 YAGNI 冗餘**：
   - 清理 [`components/AppContent.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/components/AppContent.tsx) 中的重複 fallback 與死 `activeSessionTokenRef` 狀態。

---
*審計報告完成，立即停止一切進一步操作，等待負責人評估。*
