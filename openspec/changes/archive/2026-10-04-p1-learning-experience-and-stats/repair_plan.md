# P1 學習體驗與統計模組 — 手術式精準修復計畫 (Surgical Remediation Plan)

> **基準審計報告**：[`audit_OPUS_X7R2.md`](./audit_reports/audit_OPUS_X7R2.md)  
> **目標**：以最小化動作、手術刀級精確度，徹底根除 4 位獨立 AI 審計員一致判定的所有阻斷性缺陷（CRITICAL C-01/C-02）、非阻塞警告（WARNING W-01/W-02/W-03/W-05/W-06）以及冗餘技術債（YAGNI P-01/P-02）。修復完成後解除 BLOCKED 狀態。  
> **制定日期**：2026-10-04  
> **規範遵從**：100% 繁體中文、零截斷完整代碼、資料安全第一、防禦式設計。

---

## 1. 執行目標與手術原則 (Objectives & Surgical Principles)

1. **最小化變更半徑 (Minimal Mutation Radius)**：
   - 僅觸及缺陷發生的精確行與函式邊界，嚴禁對無關邏輯進行附帶重構。
   - 代碼增刪淨值預期：淨減少約 25~35 行（刪除 AppContent fallback 與死 Token 佔約 50 行，新增核心防禦與測試約 20 行）。
2. **零截斷與型別優先 (Type-First & Perfectionist Code)**：
   - 所有 TypeScript 型別修訂嚴格禁止 `any`，全面通過 `npx tsc --noEmit` 零錯誤檢驗。
3. **資料安全與重試閉環 (Data Safety & Retry Contract)**：
   - 確保用戶每一次答題、每一個 Chunk、每一次提前退出均有持久化保障。
   - 持久化失敗時絕不鎖死「已結算」，保留狀態以供後續重試。
4. **杜絕偽綠燈 (Anti-False-Green Strict Assertions)**：
   - 每個修復點必須伴隨嚴格校驗規格契約的單元測試，嚴禁測試代碼適配縮水實作。

---

## 2. 缺陷全景與精準定位表 (Defect Panorama & Pinpointed Locations)

| Issue ID | 嚴重級別 | 問題本質 | 受影響檔案與精確行號 | 觸發條件與缺陷機理 |
|---|---|---|---|---|
| **C-01** | 🔴 CRITICAL | 持久化失敗後無條件鎖死已結算，重試契約斷裂 | [`hooks/useQuizEngine.ts:324-337`](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useQuizEngine.ts#L324-L337) | `recordStudySession` 拋出例外時，外層無條件執行 `isSettledRef.current = true`，導致後續重試永久被攔截。 |
| **C-02** | 🔴 CRITICAL | Chunked Practice 完成主路徑未結算學習統計 | [`hooks/useQuizEngine.ts:106-117`](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useQuizEngine.ts#L106-L117)<br>[`components/AppContent.tsx:333-348`](file:///c:/Users/user/Desktop/Quiz-app-/components/AppContent.tsx#L333-L348) | Chunk 做完時觸發 `onChunkComplete`，但完全未呼叫 `settleCurrentSession`；點擊「繼續下一階段」或「複習錯題」出口時統計永久漏計。 |
| **W-01** | ⚠️ WARNING | 正確答案 ARIA label 偏離規格精確契約 | [`components/QuizResult.tsx:121, 212`](file:///c:/Users/user/Desktop/Quiz-app-/components/QuizResult.tsx#L121) | 硬編碼 `aria-label="正確答案"`，缺少規格要求的選項文字 `${opt}`。 |
| **W-02** | ⚠️ WARNING | 戰鬥模式演出結束後 400ms 核心切題路徑無測試 | [`src/__tests__/autoAdvance.test.tsx:277-313`](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/autoAdvance.test.tsx#L277-L313) | 既有測試僅涵蓋 2000ms 兜底分支，完全缺失演出非 null→null 後 400ms 推進之單元測試。 |
| **W-03** | ⚠️ WARNING | 測試生命週期與 `act()` 邊界未對齊 | [`src/__tests__/studySessionSettlement.test.ts`](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/studySessionSettlement.test.ts)<br>[`src/__tests__/useQuizEngineRace.test.ts`](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/useQuizEngineRace.test.ts) | 非同步結算 Promise 與 Timer 未在單一 `await act(async () => ...)` 邊界內完全等待。 |
| **W-05** | ⚠️ WARNING | 換題 effect 與 hander 未清除解析/休息計時器 | [`components/QuizCard.tsx:188-212`](file:///c:/Users/user/Desktop/Quiz-app-/components/QuizCard.tsx#L188-L212) | 切換題目時只清理 `timerRef`，未清理 `explanationTimerRef` 與 `restModalTimerRef`，可能引發幽靈彈窗。 |
| **W-06** | ⚠️ WARNING | `handleExitQuiz` 結算與 session 清空存在競態條件 | [`hooks/useQuizEngine.ts:340-358`](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useQuizEngine.ts#L340-L358) | `void settleCurrentSession('exit')` 未被 await，同步清空 `sessionStartTime(null)` 造成未決 Promise 捕獲 null。 |
| **P-01** | 💡 YAGNI | `AppContent.tsx` 不可達之 fallback 結算邏輯 | [`components/AppContent.tsx:126-179`](file:///c:/Users/user/Desktop/Quiz-app-/components/AppContent.tsx#L126-L179) | 呼叫端永遠傳入 hook 版函式，內部 fallback 與 duplicate refs 屬純冗餘代碼（-40 行）。 |
| **P-02** | 💡 YAGNI | `useQuizEngine.ts` 裝飾性只寫不讀 token | [`hooks/useQuizEngine.ts:70, 145, 266, 300, 388`](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useQuizEngine.ts#L70) | `activeSessionTokenRef` 僅被寫入毫秒時間戳，無任何地方讀取校驗（-5 行）。 |
| **W-04** | 📋 BACKLOG | Header 導航中途離開測驗未結算 | [`components/AppHeader.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/components/AppHeader.tsx) | 既有行為，列入下一階段 Backlog 追蹤。 |
| **Debt** | 📋 BACKLOG | `NodeEditPanel.tsx:266` ponytail ceiling 超期 | [`components/KnowledgeGraph/NodeEditPanel.tsx:266`](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/NodeEditPanel.tsx#L266) | 既有架構技術債，排程於圖譜專項進行退役。 |

---

## 3. 手術式分步修復方案 (Surgical Remediation Blueprint)

### 🏥 Step 1: 核心邏輯手術 — 修復結算重試契約與消除競態 (C-01 + W-06)

#### 1.1 精準修改檔案：[`hooks/useQuizEngine.ts`](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useQuizEngine.ts)
- **位置**：`settleCurrentSession`（L306-L338）與 `handleExitQuiz`（L340-L358）。
- **手術方案**：
  1. 將 `isSettledRef.current = true` 移動到內層 `try` 區塊中 `await repository.recordStudySession(...)` 成功的語句之後。
  2. 在 `catch (storageErr)` 區塊中：明確保持 `isSettledRef.current = false`，不吞沒重試狀態；`finally` 區塊中維持釋放 `isSettlingRef.current = false`。
  3. 將 `handleExitQuiz` 改為 `async () => Promise<void>`，將 `void settleCurrentSession('exit')` 改為 `await settleCurrentSession('exit')`，並在 `finally` 區塊中安全清理 `sessionStartTime(null)` 與相關狀態。

```typescript
// hooks/useQuizEngine.ts 手術切片：
  const settleCurrentSession = useCallback(async (reason: string = 'finish'): Promise<void> => {
    if (!sessionStartTime) return;
    if (isSettlingRef.current || isSettledRef.current) return;

    isSettlingRef.current = true;
    try {
      const durationSeconds = Math.max(1, Math.round((Date.now() - sessionStartTime) / 1000));
      const answeredCount = quizState.isFinished
        ? quizState.totalQuestions
        : (quizState.score + quizState.wrongQuestionIds.length);
      const correctCount = quizState.score;

      // Quiz touch filter: If 0 questions answered and duration < 5 seconds, skip recording safely
      if (answeredCount === 0 && durationSeconds < 5) {
        isSettledRef.current = true;
        return;
      }

      // Record study session and track quiz completion with fault isolation
      try {
        await repository.recordStudySession(answeredCount, correctCount, durationSeconds, 'quiz');
        if (answeredCount > 0 && trackQuizCompletion) {
          await trackQuizCompletion({ score: correctCount, totalQuestions: answeredCount });
        }
        // ✅ C-01: 僅在持久化真正成功後標記為已結算
        isSettledRef.current = true;
      } catch (storageErr) {
        console.warn(`[QuizEngine] settleCurrentSession (${reason}) storage error (fault-isolated):`, storageErr);
        // ✅ C-01: 失敗時保持 isSettledRef.current = false，保留重試能力
      }
    } finally {
      isSettlingRef.current = false;
    }
  }, [quizState.isFinished, quizState.score, quizState.totalQuestions, quizState.wrongQuestionIds.length, repository, sessionStartTime, trackQuizCompletion]);

  const handleExitQuiz = useCallback(async (): Promise<void> => {
    if (currentSessionMistakes.length > 0) {
      const session: RecentMistakeSession = {
        sessionId: crypto.randomUUID(),
        timestamp: Date.now(),
        bankNames: banks.filter(b => sessionBankIds.includes(b.id)).map(b => b.name),
        mistakes: currentSessionMistakes
      };
      repository.addRecentMistakeSession(session);
    }

    try {
      // ✅ W-06: 真正等待非同步結算完成，消除與狀態清理的競態條件
      await settleCurrentSession('exit');
    } finally {
      setSessionStartTime(null);
      lastAnsweredQuestionIndexRef.current = null;
      isProcessingRef.current = false;
      onViewChange('dashboard');
      setCurrentSessionMistakes([]);
    }
  }, [banks, currentSessionMistakes, onViewChange, repository, sessionBankIds, settleCurrentSession]);
```

---

### 🏥 Step 2: 核心邏輯手術 — Chunked Practice 主路徑結算閉環 (C-02)

#### 2.1 精準修改檔案：[`hooks/useQuizEngine.ts`](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useQuizEngine.ts)
- **位置**：`onChunkComplete` 觸發的 `useEffect`（L106-L117）。
- **手術方案**：在調用 `onChunkComplete` 前，先調用並等待 `await settleCurrentSession('chunk_complete')`。這確保了 Chunk 答完的單一擁有點立即將題數與時長固化至 `study_sessions`，隨後啟動的任何出口均已有資料保障。

```typescript
// hooks/useQuizEngine.ts 手術切片：
  useEffect(() => {
    if (!onChunkComplete) return;
    if (quizState.mode !== 'chunked' || !quizState.chunkMeta || !quizState.isFinished) return;
    const completionId = `${quizState.chunkMeta.sessionId}:${quizState.chunkMeta.chunkIndex}`;
    if (lastChunkCompletionRef.current === completionId) return;
    lastChunkCompletionRef.current = completionId;

    void (async () => {
      // ✅ C-02: Chunk 答完單一擁有點，先結算學習統計，再觸發 Chunk 完成狀態更新
      await settleCurrentSession('chunk_complete');
      await onChunkComplete({
        chunkMeta: quizState.chunkMeta,
        score: quizState.score,
        wrongQuestionIds: quizState.wrongQuestionIds,
      });
    })();
  }, [onChunkComplete, quizState, settleCurrentSession]);
```

#### 2.2 精準修改檔案：[`components/AppContent.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/components/AppContent.tsx)
- **位置**：`<ChunkCompleteSummary>` 三個 CTA 出口（L333-L348）。
- **手術方案**：在 `onContinueNext`、`onReviewMistakes`、`onRest` 出口中，補上防禦性 `await quizEngine.settleCurrentSession(...)` 調用。由於 `settleCurrentSession` 具備冪等性，若 Step 2.1 成功，此處立即 return；若先前儲存遇到瞬態失敗，此處將作為重試點補救持久化。

```typescript
// components/AppContent.tsx 手術切片：
            <ChunkCompleteSummary
                isOpen={Boolean(chunkedPractice.summary)}
                chunkIndex={chunkedPractice.summary?.chunkIndex ?? 0}
                totalChunks={chunkedPractice.summary?.totalChunks ?? 1}
                score={chunkedPractice.summary?.score ?? 0}
                totalQuestions={chunkedPractice.summary?.totalQuestions ?? 0}
                hasNextChunk={chunkedPractice.summary?.hasNextChunk ?? false}
                wrongQuestionIds={chunkedPractice.summary?.wrongQuestionIds ?? []}
                onContinueNext={async () => {
                  // ✅ C-02 重試保險：若 chunk_complete 瞬態失敗，此處再次嘗試結算
                  await quizEngine.settleCurrentSession('chunk_continue');
                  void chunkedPractice.continueFromSummary();
                }}
                onRest={async () => {
                  chunkedPractice.dismissSummary();
                  await quizEngine.handleExitQuiz();
                }}
                onReviewMistakes={async (wrongIds) => {
                  chunkedPractice.dismissSummary();
                  await quizEngine.settleCurrentSession('chunk_review');
                  void quizEngine.startQuiz(
                    wrongIds.length,
                    'retry_session',
                    wrongIds,
                    quizEngine.sessionBankIds
                  );
                }}
            />
```

---

### 🏥 Step 3: 無障礙契約與切題生命週期防護 (W-01 + W-05)

#### 3.1 精準修改檔案：[`components/QuizResult.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/components/QuizResult.tsx)
- **位置**：L121（Fallback 模式）與 L212（單選正常模式）。
- **手術方案**：將 `aria-label="正確答案"` 調整為動態值 `aria-label={`正確答案: ${opt}`}`，嚴格對齊 `wrong-answer-comparison/spec.md:11` 契約。

```typescript
// components/QuizResult.tsx 手術切片：
// L121 (Fallback 模式):
aria-label={`正確答案: ${opt}`}

// L212 (單選模式):
aria-label={`正確答案: ${opt}`}
```

#### 3.2 精準修改檔案：[`components/QuizCard.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/components/QuizCard.tsx)
- **位置**：`useEffect(..., [question])`（L188-L202）與 `handleNext`（L204-L212）。
- **手術方案**：在換題與手動觸發下一題時，同步清除 `explanationTimerRef` 與 `restModalTimerRef`，杜絕跨題幽靈解析與干擾彈窗。

```typescript
// components/QuizCard.tsx 手術切片：
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // ✅ W-05: 換題時重置解析與休息計時器
    if (explanationTimerRef.current) {
      clearTimeout(explanationTimerRef.current);
      explanationTimerRef.current = null;
    }
    if (restModalTimerRef.current) {
      clearTimeout(restModalTimerRef.current);
      restModalTimerRef.current = null;
    }
    isWaitingForBattlePresentationRef.current = false;
    hasSeenPresentationEventRef.current = false;
    setSelectedOptions([]);
    setShowHint(false);
    setIsAnswered(false);
    isAnsweredRef.current = false;
    isSubmittingRef.current = false;
    setShowExplanation(false);
    setFeedback('none');
  }, [question]);

  const handleNext = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // ✅ W-05: 手動切題時立即清除
    if (explanationTimerRef.current) {
      clearTimeout(explanationTimerRef.current);
      explanationTimerRef.current = null;
    }
    if (restModalTimerRef.current) {
      clearTimeout(restModalTimerRef.current);
      restModalTimerRef.current = null;
    }
    isWaitingForBattlePresentationRef.current = false;
    hasSeenPresentationEventRef.current = false;
    onNext();
  };
```

---

### 🏥 Step 4: YAGNI 清理與死代碼移除 (P-01 + P-02)

#### 4.1 精準修改檔案：[`components/AppContent.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/components/AppContent.tsx)
- **位置**：`AppContentProps`（L85）與組件主體（L126-L179）。
- **手術方案**：
  1. 將 `AppContentProps.quizEngine.settleCurrentSession` 改為必選欄位：`settleCurrentSession: (reason?: string) => Promise<void>;`（呼叫端 `AppSessionContainer` 永遠提供）。
  2. 刪除 L126-L179 所有的 `isSettlingRef`、`isSettledRef`、`activeSessionTokenRef`、token 同步 `useEffect` 以及 fallback `settleCurrentSession` 實作（淨減約 **45 行**）。
  3. L209, L218, L227 中的調用直接改為 `await quizEngine.settleCurrentSession(...)`。

#### 4.2 精準修改檔案：[`hooks/useQuizEngine.ts`](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useQuizEngine.ts)
- **位置**：L70, L145, L266, L300, L388。
- **手術方案**：刪除完全沒有讀取端的 `activeSessionTokenRef` 定義與賦值語句（淨減 **5 行**）。

---

### 🏥 Step 5: 單元測試補齊與防偽綠燈驗證 (W-01, W-02, W-03, C-01, C-02)

#### 5.1 修訂檔案：[`src/__tests__/wrongAnswerComparison.test.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/wrongAnswerComparison.test.tsx)
- **手術方案**：
  - L58：更新斷言為 `expect(correctChoiceContainer?.getAttribute('aria-label')).toBe('正確答案: Meta');`。
  - 優雅降級測試：補上 `expect(fallbackCorrectContainer?.getAttribute('aria-label')).toBe('正確答案: Meta');` 斷言。

#### 5.2 修訂檔案：[`src/__tests__/studySessionSettlement.test.ts`](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/studySessionSettlement.test.ts)
- **手術方案**：
  - 新增測試案例：*「storage exception allows subsequent retry to succeed (preserves retry capability)」*。
  - 驗證：第 1 次 `recordStudySessionMock` 拋出例外，捕獲後狀態不被鎖死；第 2 次 mock 成功，呼叫 `settleCurrentSession` 斷言 `recordStudySessionMock` 呼叫次數累積為 2 且最終成功持久化。

#### 5.3 修訂檔案：[`src/__tests__/useQuizEngine.chunked.test.ts`](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/useQuizEngine.chunked.test.ts)
- **手術方案**：
  - 新增 3 個單元測試：
    1. *「Chunk 答完時自動觸發 recordStudySession 記錄該 chunk 題數與時間」*。
    2. *「點擊繼續下一 chunk 時前 chunk 已結算，新 chunk 重新計時且不重複結算」*。
    3. *「完成最後一個 chunk 時仍正確寫入學習統計」*。

#### 5.4 修訂檔案：[`src/__tests__/autoAdvance.test.tsx`](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/autoAdvance.test.tsx)
- **手術方案**：
  - 新增單元測試：*「戰鬥模式：演出事件依序播放結束（activePresentationEvent 非 null -> null）後，於 400ms 觸發切題」*。
  - Mock `useBattleSystem` 返回狀態，驗證答題後 `activePresentationEvent` 從事件轉換為 `null`，400ms 推進計時器準確觸發 `onNext`，且原先的 2000ms 兜底計時器被成功取消。

#### 5.5 收斂 `act()` 邊界警告 (W-03)
- 確保所有測試案例中，包含 Timer 快轉與非同步結算的動作均被包裹於 `await act(async () => ...)` 內，徹底消除測試執行過程中的 stderr 警告。

---

## 4. 驗收矩陣與品質閘門 (Verification Matrix & Quality Gates)

按照本計畫執行完畢後，必須依序通過以下 5 大硬性驗證閘門：

| 閘門 | 指令 | 預期合格指標 | 驗證項目 |
|---|---|---|---|
| **1. TypeScript** | `npx tsc --noEmit` | **0 errors** | 型別定義完整、無 `any`、Props 與 Hook 介面對齊 |
| **2. 單元測試** | `npm test -- --run` | **436+ passed / 0 failed** | 既有 432 測試全數維持通過 + 新增 5 個測試全綠且無偽綠燈 |
| **3. 死代碼檢查** | `npx knip` | **0 issues** | 無殘留未使用的導出或變數（包含清理後的 token 與 fallback） |
| **4. 生產編譯** | `npm run build` | **Build Success** | Vite + Tailwind CSS 打包順暢 |
| **5. 規格追蹤** | `tasks.md` 核對 | **100% 同步** | Task 5.1 與 5.6 標記與實作零落差 |

---

## 5. 回滾與數據安全策略 (Rollback & Data Safety Plan)

1. **工作樹安全邊界**：
   - 本次手術僅限於代碼邏輯層面與單元測試。
   - 嚴禁修改真實使用者數據檔案（`localStorage` 的 `mindspark_*` 鍵值）。
2. **單步原子化驗證**：
   - 每完成一個 Phase 即刻執行 `npx tsc --noEmit`，若有編譯錯誤立即修正。
3. **快速回滾方案**：
   - 若發生非預期副作用，可透過 `git checkout -- <file>` 還原至本修復計畫執行前的工作樹狀態。
