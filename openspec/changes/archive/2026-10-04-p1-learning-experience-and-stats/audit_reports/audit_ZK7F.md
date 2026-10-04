# P1 Learning Experience & Stats 獨立最終審計報告（第三位覆核）

- **審計代號**：`audit_ZK7F`（角色：獨立第二位高階 AI / 最終覆核審計）
- **審計日期**：2026-09-30
- **審計標的**：`openspec/changes/p1-learning-experience-and-stats`（runtime 代碼、6 個 capability specs、tasks、既有兩份審計報告 `audit_final_4K7M` / `audit_INQ8` 之整改覆核）
- **審計方法**：openspec-verify-change 規格對齊 + 極端分支逐行閱讀 + 偽綠燈測試斷言剖析 + 品質閘門重跑（tsc / 432 tests / lint / knip / build）+ ponytail-audit（YAGNI）+ ponytail-debt（技術債帳簿）
- **最終判定**：🛑 **BLOCKED / 條件性退回（Conditional Reject）— 維持前兩輪裁決**

> **核心結論**：本變更自稱「已完成且經自檢」，且 `tasks.md` 1.1–8.6 全數勾選 `[x]`；但前兩輪審計列出的 **C-01、C-02 兩項阻塞級邏輯缺陷在當前工作樹代碼中依然存在**（本次逐行複驗確認），整改清單並未落地。自動化閘門全綠的事實，恰恰驗證了「偽綠燈」診斷：**測試通過 ≠ 規格達成**。

---

## 1. 阻塞級邏輯缺陷（CRITICAL — 未修復，逐行複驗確認）

### 🔴 C-01：持久化失敗後仍無條件標記「已結算」，重試契約依舊断裂

- **關聯規格**：`specs/study-session-settlement/spec.md` — *Scenario: Storage failure does not break navigation and preserves retry capability*（明定「結算狀態 SHALL NOT 永久標記為已結算」）
- **當前代碼**：[hooks/useQuizEngine.ts](../../../hooks/useQuizEngine.ts#L325-L337)
  ```ts
  try {
    await repository.recordStudySession(answeredCount, correctCount, durationSeconds, 'quiz');
    if (answeredCount > 0 && trackQuizCompletion) {
      await trackQuizCompletion({ score: correctCount, totalQuestions: answeredCount });
    }
  } catch (storageErr) {
    console.warn(`[QuizEngine] settleCurrentSession (${reason}) storage error (fault-isolated):`, storageErr);
  }
  isSettledRef.current = true;   // ⚠️ 內層 catch 吞掉異常後，此行仍無條件執行
  ```
- **缺陷機理**：`recordStudySession` 拋出例外（LocalStorage 配額滿、Supabase 網路中斷）時，內層 catch 僅警告，外層 `isSettledRef.current = true` 照常執行。隨後 `handleExitQuiz()`（[useQuizEngine.ts:351-353](../../../hooks/useQuizEngine.ts#L351-L353)）以 `void` fire-and-forget 呼叫結算並立刻 `setSessionStartTime(null)` —— 失敗後**既被鎖死（isSettled）又失去時長起點（sessionStartTime=null）**，當輪學習數據永久丟失，且任何後續重試呼叫在入口即被 `isSettledRef` 閘門攔回。
- **偽綠燈證據**：[src/__tests__/studySessionSettlement.test.ts:273-312](../../../src/__tests__/studySessionSettlement.test.ts#L273-L312) 的「storage exception isolation」測試僅斷言 (a) 不拋例外、(b) `handleExitQuiz` 後仍導航 dashboard —— **完全沒有「首次寫入失敗 → 再次觸發結算 → 斷言第二次寫入成功/被允許」的重試路徑測試**。規格要求的重試契約在實作與測試兩側皆缺席。
- **整改要求**：僅在 `recordStudySession`（與 `trackQuizCompletion`）成功後才設 `isSettledRef.current = true`；失敗時保持 `isSettledRef=false`、保留 session token 與 `sessionStartTime`，並新增「首次 reject → 第二次 retry 成功」的負向測試。

### 🔴 C-02：Chunked Practice 完成主路徑仍未寫入學習統計（三個出口僅一個結算）

- **關聯規格**：`specs/study-session-settlement/spec.md` — *Scenario: Chunked practice completion and abandonment settlement*
- **當前代碼鏈路**（本次完整追蹤）：
  1. chunk 答完 → `useQuizEngine` 觸發 `onChunkComplete`（[useQuizEngine.ts:106-117](../../../hooks/useQuizEngine.ts#L106-L117)）
  2. → `AppSessionContainer.handleChunkComplete`（[AppSessionContainer.tsx:75-77](../../../components/AppSessionContainer.tsx#L75-L77)）僅轉發
  3. → `useChunkedPractice.completeChunk`（[useChunkedPractice.ts:319-362](../../../hooks/useChunkedPractice.ts#L319-L362)）僅更新 `practice_sessions`、清草稿、彈出 summary —— **全程無任何 `recordStudySession` / `settleCurrentSession` 呼叫**
  4. `ChunkCompleteSummary` 三個出口（[AppContent.tsx:333-348](../../../components/AppContent.tsx#L333-L348)）：
     - 「繼續下一階段」`onContinueNext` → `startNextChunk` → `startQuiz` **直接重置 `sessionStartTime`，前一 chunk 的題數與時長靜默丟失** ❌
     - 「立即複習本段錯題」`onReviewMistakes` → 直接 `startQuiz('retry_session')` **同樣不結算** ❌
     - 「休息一下 / 完成練習」`onRest` → `handleExitQuiz()` → 內部 `settleCurrentSession('exit')` ✔（唯一會結算的出口）
- **缺陷影響**：分段練習是本次變更明列的統計閉環路徑；使用者照主要 CTA（繼續下一階段 / 複習錯題）操作時，**每個中間 chunk 的做題數與時長全部漏計**（僅最後經由 onRest 離開才記錄最後一個 chunk）。`practice_sessions` 的進度保存不能替代 `study_sessions` 統計——兩者是不同資料域。
- **偽綠燈證據**：`useQuizEngine.chunked.test.ts`、`useChunkedPractice.test.ts`、`useChunkedPractice.draft.test.ts` 皆將 `recordStudySession` stub 為 `async () => {}`，**無一 spy 斷言 chunk 完成時被呼叫**（grep 全測試目錄確認）。Task 5.6 的 `[x]` 與實作不符。
- **整改要求**：在 chunk 完成的單一擁有點（`completeChunk` 入口或 `onChunkComplete` 綁定處）先結算當前 quiz session 再更新 chunk 狀態；補「完成 chunk 寫入一次 / 繼續下一 chunk 不重複寫入 / 最後 chunk 完成仍寫入」三案例。

---

## 2. 偽綠燈與非阻塞規格警告（WARNING）

### ⚠️ W-01：正確答案 ARIA label 仍為固定字串，違反 spec 精確契約（未修復）

- 規格要求 `aria-label="正確答案: B. 呼吸作用"`（含選項內容）；實作為固定 `"正確答案"`（[QuizResult.tsx:212](../../../components/QuizResult.tsx#L212)，fallback 路徑 [L121](../../../components/QuizResult.tsx#L121) 同）。螢幕閱讀器語義層缺少答案內容，WCAG 契約縮水。
- **偽綠燈**：測試斷言主動適配了縮水實作（[wrongAnswerComparison.test.tsx:58](../../../src/__tests__/wrongAnswerComparison.test.tsx#L58) `toBe('正確答案')`），而非鎖定規格字串。

### ⚠️ W-02：戰鬥模式「演出事件完成後 400ms」核心路徑仍無單元測試（未修復）

- 實作存在（[QuizCard.tsx:118-132](../../../components/QuizCard.tsx#L118-L132)：監聽 `activePresentationEvent` 非 null→null 轉換後延遲 400ms），但 [autoAdvance.test.tsx](../../../src/__tests__/autoAdvance.test.tsx) 僅測 2000ms 兜底降級分支，未 mock `useBattleSystem` 發出並完成真實演出事件驗證 400ms 路徑。`battle-mode` spec 該場景目前靠代碼審查背書而非測試鎖定。

### ⚠️ W-03：測試輸出仍有 React `act()` 邊界警告（未修復）

- 本審計重跑 `autoAdvance / studySessionSettlement / focusTimerStats` 三檔，stderr 仍出現多次 `An update to QuizCardComponent inside a test was not wrapped in act(...)` 與 `overlapping act() calls`。非同步 timer/結算 Promise 的測試邊界未妥善等待 → CI 排程抖動下有 flaky 風險，並可能掩蓋卸載後狀態更新。

### ⚠️ W-04（本次新發現，範圍外殘漏）：Header 導航中途離開測驗不結算

- [AppHeader.tsx:63-67](../../../components/AppHeader.tsx#L63-L67) 的導航列在 `view === 'quiz'` 期間仍可點擊，`onNavigate` 直接 `dispatch(set_view)` 繞過 `handleExitQuiz`，進行中 session 的統計丟失。**屬既有行為且未列入 spec 列舉路徑**，不計為本次阻塞，但與「統計結算全路徑閉環」的目標陳述矛盾，建議列入後續變更。

### ⚠️ W-05（本次新發現，既有缺陷非本次引入）：換題 effect 未清除 `explanationTimerRef` / `restModalTimerRef`

- [QuizCard.tsx:188-202](../../../components/QuizCard.tsx#L188-L202) 的 question-change effect 只清 `timerRef`；已比對 `git show HEAD:components/QuizCard.tsx` 確認 HEAD 亦未清——屬既有缺陷。觸發路徑：答題後 400ms 內快速按 Enter 手動推進 → 殘留的 `explanationTimerRef` 在**下一題**上 `setShowExplanation(true)`，渲染出帶「下一題」按鈕的幽靈解析區（回饋樣式錯亂），再按 Enter 會**靜默跳過未作答的題目**。本次新增的自動切題主路徑（800ms > 400ms）不受影響；但本變更的主題正是「衝突消除與生命週期清理」，建議在同一輪補一行 cleanup 並加負向測試。

---

## 3. Ponytail Audit — YAGNI / 不可達代碼（本次變更範圍）

依 ponytail-audit 規範輸出（ranked，最大裁切在前）：

1. `yagni:` [components/AppContent.tsx:126-179](../../../components/AppContent.tsx#L126-L179) 的整套 fallback `settleCurrentSession` + 專屬 `isSettlingRef/isSettledRef/activeSessionTokenRef` + token 同步 `useEffect`。唯一呼叫端 [AppSessionContainer.tsx:261-265](../../../components/AppSessionContainer.tsx#L261-L265) 以 `...quizEngine` 展開**永遠**傳入 hook 的 `settleCurrentSession` → fallback 與其 refs 為不可達重複邏輯，且與 hook 版本存在雙實作漂移風險。Replacement: 將 `settleCurrentSession` 設為必備 prop，刪除 fallback（約 -40 行）。
2. `delete:` [hooks/useQuizEngine.ts:70,145,266,300,388](../../../hooks/useQuizEngine.ts#L70) 的 `activeSessionTokenRef` — 僅寫入、從未在結算判定中讀取，屬裝飾性防護外觀。Replacement: 移除，或讓 settle API 真正比對 token（見 P-03）。
3. `yagni:` `String(Date.now())` 作為 session token — 同毫秒啟動兩輪不唯一，且目前無任何讀取端。Replacement: `crypto.randomUUID()` fallback 或直接刪除 token 概念，改以明確 session generation 表達。

`net: 約 -45 行、0 個依賴可刪。`（與前兩輪審計結論一致，未清理）

---

## 4. Ponytail Debt — 技術債帳簿檢閱

依 ponytail-debt 規範掃描（排除 node_modules/.git/dist/docs/openspec 文字）：

| 位置 | 內容 | Ceiling / Upgrade | 屬本次變更？ |
|---|---|---|---|
| [components/KnowledgeGraph/NodeEditPanel.tsx:266](../../../components/KnowledgeGraph/NodeEditPanel.tsx#L266) | 保留 legacy `fontWeight` 相容寫入 | schema-v2 migration window 2026-10-01 後移除 | 否 |
| [services/storage.ts:35](../../../services/storage.ts#L35) | localStorage 暫存機制 | v2.0 遷移 user-scoped IndexedDB 後退役 | 否 |

**2 markers，0 筆 no-trigger（皆具 upgrade path，無靜默腐化）；本次變更新增 0 筆。** 帳簿乾淨。

---

## 5. OpenSpec 規格 × 實作對齊總表

| Capability | 對齊狀態 | 備註 |
|---|---|---|
| wrong-answer-comparison | 🟡 大致對齊 | 單選三態/多選四態/降級/文字標籤 ✔；`aria-label` 契約縮水（W-01） |
| auto-advance-on-correct | 🟢 對齊 | 800ms/2000ms/手動消解/unmount 清理/最後一題（委派引擎 `nextQuestion` 轉 finished，無越界）✔；battle 400ms 路徑未測（W-02） |
| achievement-pruning | 🟢 對齊 | 白名單 4 項、雙向 Set 比對測試（非正則）、ACHIEVEMENTS 22 項未動 ✔ |
| study-session-settlement | 🔴 **不達標** | onRetry/onRestart/onHome/ESC/RestBreak/時長下限/誤觸過濾/冪等 ✔；但 C-01 重試契約、C-02 Chunk 完成結算缺失 |
| focus-timer-stats-binding | 🟢 對齊 | 專注歸零記錄、休息/重置/unmount 負向不觸發、rerender 去重、0 題不稀釋正確率、`'focus'` 不套 5 秒過濾 ✔（雲端 schema 相容性僅能靜態核驗，無法遠端驗證） |
| battle-mode | 🟡 大致對齊 | 即時回饋 + 結算對比 + 演出同步實作在位；400ms 正常路徑測試缺口（W-02） |

**Artifacts 完整性**：proposal / design / 6 specs / tasks / stress-test-report / benchmark-harness / 2 份前審計報告齊備；`docs/DEVELOPMENT_LOG.md` 與 `CHECKLIST.md` 已同步更新（rule 10 ✔）。

---

## 6. 品質閘門（本審計獨立重跑）

| 項目 | 指令 | 結果 |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ 0 errors |
| 單元測試 | `npm test -- --run` | ✅ 66 files / 432 passed |
| Lint | `npm run lint` | ⚠️ 0 errors / 7 warnings（皆測試檔未使用 import/變數） |
| 死代碼 | `npx -y knip --reporter compact` | ✅ 0 issues |
| 生產打包 | `npm run build` | ✅ 通過（既有 vendor-ui-core >500kB chunk 警告，非本次引入） |
| E2E | Playwright | ⏭️ 本輪未執行（Windows 環境 RISK-004 teardown 風險；檔案 `e2e/p1-learning-experience.spec.ts` 存在且涵蓋 E2E-1~4 場景文字） |

**閘門結論**：自動化證據全綠，但第 1 節兩項 CRITICAL 說明這些閘門**無法偵測規格級缺陷**——正是本變更「自檢通過卻仍 BLOCKED」的根因。

---

## 7. 流程標記與交付狀態（與 CRITICAL 嚴格區分）

- `tasks.md` 1.1–8.6 文檔面全數 `[x]`；其中 **Task 5.6（Chunked 退出結算串接）與 5.1（結算鎖語意）的 `[x]` 屬「標記與實作不一致」**——此為 C-01/C-02 的流程映射，非獨立缺陷。
- 工作樹存在大量未提交變更（runtime + tests + artifacts）→ 分類：**待提交確認**。屬交付流程事項，**不得**與 C-01/C-02 核心邏輯缺陷混列，亦不影響本判定之嚴重度。

---

## 8. 最終裁決與最小整改清單

### 🛑 裁決：BLOCKED（修復下列 1–3 並複驗前，不得 archive / 不得宣告完成）

1. **修復 C-01**：`isSettledRef.current = true` 移入持久化成功區塊；失敗釋放鎖並保留 session 起點；補「首敗次成」重試測試。
2. **修復 C-02**：chunk 完成單一擁有點先結算再推進（覆蓋 `onContinueNext` 與 `onReviewMistakes` 兩出口）；補 `recordStudySession` spy 斷言。
3. **同輪修復 W-01 / W-03**：ARIA label 補選項內容並以 exact assertion 鎖定（含 fallback 路徑）；act() 邊界以 `await act(async ...)` 收斂並補 unmount 後不執行之斷言。
4. **建議（非阻塞）**：清理 P-01/P-02 不可達 fallback 與死 token（約 -45 行）；W-05 補 `explanationTimerRef` 換題 cleanup；W-04 註冊為後續變更。

---

*審計報告完成。未修改任何產品代碼、未執行 commit、未更動前兩份審計報告。立即停止操作，等待負責人評估。*
