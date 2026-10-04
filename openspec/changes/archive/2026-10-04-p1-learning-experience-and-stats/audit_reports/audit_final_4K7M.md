# P1 Learning Experience & Stats 最終獨立審計

- 審計角色：第二位高階 AI／獨立最終審計
- 審計日期：2026-09-30
- 審計範圍：`p1-learning-experience-and-stats` 的 proposal、design、5 個 capability specs、tasks、runtime 變更、單元測試、E2E、品質門禁、Ponytail YAGNI/dead-code 與 ponytail debt
- 審計方法：OpenSpec verify 對照、極端分支閱讀、測試基線重跑、TypeScript/build/lint/Knip、程式碼註解 debt scan
- 最終判定：**BLOCKED / Conditional Reject**

## 1. 阻塞級邏輯缺陷

### C-01：持久化失敗後錯誤標記為已結算，違反可重試契約

- 證據：[hooks/useQuizEngine.ts](../../../../hooks/useQuizEngine.ts#L306-L338)
- `repository.recordStudySession()` 或 `trackQuizCompletion()` 失敗時，內層 `catch` 只記錄 warning；外層仍無條件執行 `isSettledRef.current = true`。
- `handleExitQuiz()` 隨後立即執行 `setSessionStartTime(null)`，因此失敗後既不能由 settlement lock 重試，也失去了計算原始 session 時長所需的起點。
- 規格 `study-session-settlement` 明定儲存失敗不得永久標記已結算，必須保留後續重試能力。這不是流程標記問題，而是會造成學習統計永久遺失的核心資料完整性缺陷。
- 偽綠燈來源：[src/__tests__/studySessionSettlement.test.ts](../../../../src/__tests__/studySessionSettlement.test.ts#L285-L320) 只驗證「不拋例外」與導航成功，沒有在第一次寫入失敗後再次觸發結算並斷言第二次寫入成功/被允許。
- 建議：只有所有必要持久化操作成功時才設 `isSettledRef.current = true`；失敗時清除 settling lock、保留 session token/start time，並新增「首次 reject、第二次 retry」測試。

### C-02：Chunked Practice 完成路徑未寫入 study session 統計

- 證據：[hooks/useChunkedPractice.ts](../../../../hooks/useChunkedPractice.ts#L315-L360)、[components/AppSessionContainer.tsx](../../../../components/AppSessionContainer.tsx#L73-L96)
- `useQuizEngine` 完成 chunk 後只呼叫 `onChunkComplete`；`AppSessionContainer` 只轉發到 `completeChunk`；`completeChunk` 只更新 chunk practice session、清草稿並顯示 summary，沒有呼叫 `settleCurrentSession` 或 `recordStudySession`。
- 因此規格宣告的「Chunked Practice 完成路徑先結算，再進入下一 chunk/summary」沒有實作。使用者完成一個 chunk 時，該 chunk 的題數與時長會漏計；點擊 summary 的「繼續下一階段」也直接開始下一 chunk。
- 偽綠燈來源：[src/__tests__/useQuizEngine.chunked.test.ts](../../../../src/__tests__/useQuizEngine.chunked.test.ts#L93-L132) 只驗證 `onChunkComplete` payload；[src/__tests__/useChunkedPractice.test.ts](../../../../src/__tests__/useChunkedPractice.test.ts#L100-L160) 只驗證 practice session 狀態，兩者都沒有 spy `recordStudySession`。
- 建議：讓 chunk completion 的單一擁有者在更新 chunk 狀態前完成當前 quiz session settlement，並補測「完成 chunk 寫入一次」「繼續下一 chunk 不重複」「完成最後 chunk 仍寫入」三個案例。不要以既有 practice session 持久化取代 study statistics，兩者是不同資料域。

## 2. 非阻塞規格／正確性警告

### W-01：正確答案的 ARIA label 不符合 spec 的精確契約

- 證據：[components/QuizResult.tsx](../../../../components/QuizResult.tsx#L207-L222)
- 單選題規格要求 `aria-label="正確答案: B. 呼吸作用"`，實作卻固定為 `aria-label="正確答案"`。畫面文字有答案，但螢幕閱讀器語義層缺少答案內容。
- 現有測試只斷言 `aria-label` 等於簡化字串「正確答案」，因此將規格偏差驗成綠燈。
- 建議：將實際選項值放入 label，並以 exact assertion 鎖定單選與 fallback 路徑。

### W-02：宣告的 session token 沒有真正參與結算判定

- 證據：[hooks/useQuizEngine.ts](../../../../hooks/useQuizEngine.ts#L50-L67)、[hooks/useQuizEngine.ts](../../../../hooks/useQuizEngine.ts#L306-L338)
- `activeSessionTokenRef` 只被賦值，結算時沒有以 token 比對當前 session；實際防重依賴的是 boolean refs。另以 `String(Date.now())` 作 token，在同一毫秒啟動兩輪時並非唯一。
- 目前 lock 可涵蓋一般快速連擊，但與 design/tasks 宣告的 token-based guard 不一致，也沒有測試同毫秒重新啟動或 session 交錯。
- 建議：使用真正唯一的 session token（如 `crypto.randomUUID()` fallback），並讓 settle API 接收/核對該 token；或刪除 token 名稱與未使用的偽抽象，改以明確的 session generation 設計。

### W-03：測試品質有可見的 lifecycle 訊號污染

- 相關輸出：`autoAdvance.test.tsx` 出現多次「state update not wrapped in act」；`studySessionSettlement.test.ts` 出現 overlapping `act()`。
- 全量測試雖然通過，但這些警告代表非同步 timer 與結算流程的測試邊界沒有被正確等待，可能掩蓋卸載後更新或競態問題。
- 建議：所有 timer callback 及 `handleExitQuiz` 的 Promise 都在單一 `act(async () => ...)` 內等待，並增加 unmount 後 callback 不執行的 assertion。

## 3. OpenSpec 對齊結果

- `proposal.md`、`design.md`、5 個新增 capability specs 與 `tasks.md` 均存在。
- `tasks.md` 目前 1.1 至 8.6 全數為 `[x]`；未發現未勾選的核心實作任務。
- 對齊狀態：錯題對比、設定 normalize、成就白名單、一般測驗 settlement、FocusTimer guest 統計大致對齊；但 C-01 與 C-02 使 study-session-settlement 不能判定為完整實作。
- `battle-mode` 的自動切題測試只驗證 2000ms fallback，未驗證演出事件真正完成後的 400ms 路徑，仍有覆蓋缺口。

## 4. 驗證證據

- `npm test -- --run <本次相關 5 檔>`：**25 tests passed**。
- `npm test -- --run`：**66 test files / 432 tests passed**。
- `npx tsc --noEmit`：**通過**。
- `npm run build`：**通過**；Vite 仍輸出既有大 chunk warning（`vendor-ui-core` minified > 500 kB）。
- `npx -y knip --reporter compact`：**無死代碼問題**。
- `npm run lint`：**0 errors / 7 warnings**。其中本次相關測試有未使用 import/變數警告，`AppContent.tsx` 有 security rule warning。
- `git diff --check`：未見本次核心 runtime 的 whitespace error；工作樹仍有既有測試檔 EOF blank-line warning。

## 5. Ponytail YAGNI / 不可達代碼審查

1. `yagni:` [components/AppContent.tsx](../../../../components/AppContent.tsx#L145-L181) 保留了一套 fallback settlement implementation，但實際唯一呼叫端 [components/AppSessionContainer.tsx](../../../../components/AppSessionContainer.tsx#L224-L270) 一律傳入 `quizEngine.settleCurrentSession`；因此 fallback、對應的 AppContent lock refs 與 optional API 是重複且不可達的結算邏輯。替代方案：將 settlement contract 設為必填，刪除 fallback 與重複 refs，保留唯一的 hook implementation。
2. `delete:` [hooks/useQuizEngine.ts](../../../../hooks/useQuizEngine.ts#L50-L67) 的 `activeSessionTokenRef` 在本次變更中只有寫入、沒有被結算流程讀取；它目前是 token 防護的外觀而非功能。替代方案：真正用 generation/token 做核對，或移除整個欄位，不要保留不可達狀態。

Ponytail 結論：本次變更範圍可直接收斂上述重複邏輯；沒有發現需要新增第三方依賴或手寫標準庫替代品。估計可刪除約 30 至 45 行重複 fallback/guard code，實際行數以修復時 diff 為準。

## 6. Ponytail Debt 帳簿

依 `ponytail-debt` 規範掃描程式碼註解（排除 `node_modules`、`.git`、`dist`、docs/與 OpenSpec 文字）：

| 位置 | 內容 | Ceiling / Trigger | 是否屬本次變更 |
|---|---|---|---|
| [components/KnowledgeGraph/NodeEditPanel.tsx](../../../../components/KnowledgeGraph/NodeEditPanel.tsx#L266) | 保留 legacy `fontWeight` 相容寫入 | schema-v2 migration window closes 2026-10-01 | 否 |
| [services/storage.ts](../../../../services/storage.ts#L35) | localStorage 暫存機制 | v2.0 遷移至 user-scoped IndexedDB 後退役 | 否 |

統計：**2 markers，0 筆 no-trigger；本次變更新增 0 筆 marker。**

## 7. 流程標記與交付狀態（不等同 CRITICAL）

- `tasks.md` 沒有未勾選的實作任務。
- 本次審計未執行 `git commit`，且工作樹仍有 P1 runtime、tests 與 artifacts 的未提交變更；依審計角色不代替負責人提交。
- 分類：**待提交確認**，不可與 C-01/C-02 的阻塞級邏輯缺陷混列。

## 建議裁決

在修復 C-01、C-02 並補上對應的失敗重試／Chunk settlement 測試前，不建議 archive 或宣告本變更完成。W-01 與 W-03 應在同一輪修復，以避免無障礙契約與非同步測試再次出現偽綠燈。

本報告完成後依要求停止操作，等待負責人評估；未修改產品代碼、未提交 commit、未回滾任何既有變更。
