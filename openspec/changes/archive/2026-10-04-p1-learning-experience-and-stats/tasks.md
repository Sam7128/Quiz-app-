## 1. 型別定義與儲存基礎設施（Type-First & Storage Guards）

- [x] 1.1 在 `types/battleTypes.ts` 的 `UserSettings` 介面新增 `autoAdvanceOnCorrect?: boolean` 欄位，並於 `DEFAULT_SETTINGS` 中設為 `false`
- [x] 1.2 在 `services/storage.ts` 的 `getUserSettings` 函式中加入 schema normalize 防禦，確保舊版設定在缺少該欄位或非布林值時安全補齊 `false`
- [x] 1.3 在 `types.ts` 的 `QuizState` 介面新增 `userAnswerMap: Record<string, string | string[]>` 欄位
- [x] 1.4 在 `constants/achievements.ts` 新增導出 `IMPLEMENTED_ACHIEVEMENT_IDS = new Set<string>(['perfect_score', 'first_question', 'night_owl', 'early_bird'])`，並保持原始 `ACHIEVEMENTS` 22 個項目不變
- [x] 1.5 在 `hooks/useAchievementTracker.ts` 顯式導出 `TRACKED_ACHIEVEMENT_IDS = new Set<string>(['perfect_score', 'first_question', 'night_owl', 'early_bird'])` 集合供測試比對
- [x] 1.6 執行 `npx tsc --noEmit` 驗證所有型別與常數導出零錯誤

## 2. 錯題選項對比與無障礙反饋（Wrong Answer Comparison & Accessibility）

- [x] 2.1 在 `hooks/useQuizEngine.ts` 的 `startQuiz` 中初始化 `userAnswerMap: {}`；在 `handleAnswer` 時同步將 `questionId → selectedAnswer` 寫入 `userAnswerMap`
- [x] 2.2 在 `hooks/useQuizEngine.ts` 的回傳物件中暴露 `quizState.userAnswerMap`
- [x] 2.3 修改 `components/QuizCard.tsx`：答題判定後選項即時套用視覺對比樣式，使作答當下與結算體驗一致
- [x] 2.4 修改 `components/QuizResult.tsx`：擴充 `QuizResultProps` 新增 `userAnswerMap?: Record<string, string | string[]>`；支援單選三態與多選四態集合運算（選對/錯選/漏選/中立），加入文字標籤「❌ 你的選擇」/「✅ 正確答案」與 ARIA 屬性（`aria-invalid="true"`、`aria-label`），並實作 `userAnswerMap` 缺失時的優雅降級
- [x] 2.5 修改 `components/AppContent.tsx`：組裝 `<QuizResult>` 時，傳入 `userAnswerMap={quizEngine.quizState.userAnswerMap}`
- [x] 2.6 新增 `src/__tests__/wrongAnswerComparison.test.tsx`：測試單選三態、多選四態集合運算、缺省降級、文字標籤、ARIA 屬性的渲染正確性
- [x] 2.7 新增 `src/__tests__/useQuizEngine.userAnswerMap.test.ts`：測試 `handleAnswer` 作答寫入、`startQuiz` 重置為空

## 3. 答對自動切題與邊界防護（Auto-Advance on Correct & Conflict Elimination）

- [x] 3.1 修改 `components/Settings.tsx`：在「遊戲設定」區塊新增「答對自動切題」toggle，綁定 `autoAdvanceOnCorrect`，並加入輔助提示文字
- [x] 3.2 修改 `components/QuizCard.tsx`：在答對且 `autoAdvanceOnCorrect` 為 true 時啟動推進計時器（普通模式 800ms / 戰鬥模式演出後 400ms，加設 2000ms safety deadline 兜底防死鎖）
- [x] 3.3 修改 `components/QuizCard.tsx`：最後一題（或單題 $N=1$）答對時自動前進至結算狀態（呼叫測驗完成處理），嚴禁調用越界的 `onNext()`
- [x] 3.4 修改 `components/QuizCard.tsx`：在手動點擊「下一題」或按 Enter 鍵時，立即 `clearTimeout` 清除排程計時器，杜絕雙重推進；答錯時保持停留
- [x] 3.5 在 `components/QuizCard.tsx` 的 `useEffect` cleanup 中清除計時器，防範 unmount 內存洩漏
- [x] 3.6 新增 `src/__tests__/autoAdvance.test.tsx`：測試普通延遲、戰鬥演出同步與 2000ms 兜底、手動點擊打斷、最後一題與單題自動轉完成、答錯不前進、unmount 清理

## 4. 成就系統清理與雙向對齊（Achievement Pruning & Bidirectional Alignment）

- [x] 4.1 修改 `components/AchievementsCard.tsx`：使用 `IMPLEMENTED_ACHIEVEMENT_IDS` 過濾，總數與進度條分母基於 4 個已實作成就計算，並過濾 localStorage 中的歷史未知成就 ID
- [x] 4.2 修改 `components/AchievementsModal.tsx`：僅渲染白名單成就，過濾歷史未知 ID，避免顯示空白卡片或引發渲染錯誤
- [x] 4.3 新增 `src/__tests__/achievementPruning.test.tsx`：測試卡片與彈窗僅展示 4 個已實作成就，歷史未知舊 ID 被安全過濾，進度條計算準確
- [x] 4.4 新增 `src/__tests__/achievementTrackerAlignment.test.ts`：雙向校驗測試，直接比對 `IMPLEMENTED_ACHIEVEMENT_IDS` 與 `TRACKED_ACHIEVEMENT_IDS` 集合等價性（100% 雙向對齊，嚴禁正則解析源碼）

## 5. 統計結算全路徑閉環與冪等防禦（Study Session Settlement & Idempotency）

- [x] 5.1 在 `hooks/useQuizEngine.ts` 統一收斂 `settleCurrentSession(reason: string): Promise<boolean>`：僅在持久化成功後標記已結算以保留失敗重試能力（C-01），清理 `AppContent.tsx` 冗餘 fallback 與只寫死 token（P-01/P-02），引入兩階段 CAS 門戶標記及時長下限與 5 秒 0 題過濾；`handleExitQuiz` 改為 async/await 並在結算失敗時保留 `sessionStartTime` 與 Toast 提示（W-06）
- [x] 5.2 修改 `onRetry` 回呼：在啟動錯題測驗前先呼叫 `settleCurrentSession('retry')`
- [x] 5.3 修改 `onRestart` 回呼：在重啟測驗前先呼叫 `settleCurrentSession('restart')`
- [x] 5.4 修改 `onHome` 回呼：確認調用 `settleCurrentSession('home')`，並與其他路徑保持統一
- [x] 5.5 修改 `hooks/useQuizEngine.ts` 的 `handleExitQuiz`：在中途退出（按 ESC 或點擊退出彈窗）前結算已答題數與時長
- [x] 5.6 串接 `components/RestBreakModal.tsx` 與 Chunked Practice 的全路徑結算：在 `onChunkComplete` 與 `ChunkCompleteSummary` 結算失敗時阻斷推進並重設重試指標（C-02）
- [x] 5.7 在 `components/AppContent.tsx` 實作 Header 與行動導航退出結算攔截 `handleHeaderNavigate`，徹底閉環中途切頁盲點（W-04）
- [x] 5.8 新增 `src/__tests__/studySessionSettlement.test.ts` 與 `src/__tests__/useQuizEngine.chunked.test.ts`：測試 onRetry/onRestart/handleExitQuiz 失敗保留與重試、Header 導航結算、Chunk 完成失敗阻斷與重試、快速連擊冪等攔截、時長下限、誤觸過濾與儲存異常隔離

## 6. FocusTimer 統計接入與生命週期安全（FocusTimer Stats & Zero-Question Guard）

- [x] 6.1 修改 `components/Dashboard.tsx`：渲染 `<FocusTimer onSessionComplete={handleFocusComplete} />`，呼叫 `recordStudySession(0, 0, durationSeconds)`
- [x] 6.2 修改 `components/FocusTimer.tsx`：僅在專注倒數歸零時觸發回呼（休息模式、中途重置/取消、unmount 嚴格禁止觸發）；加入 rerender 去重標記
- [x] 6.3 修改 `services/analytics.ts`：在 `getStudyStats` 與 `getDailyStats` 中，平均勝率/正確率計算時過濾 `questionsAnswered === 0` 的純專注記錄，時長正常累計；確保底層儲存服務允許 `questionsAnswered: 0` 且 `durationSeconds > 0`
- [x] 6.4 驗證訪客端 localStorage 與 Supabase `study_sessions` 表結構對 `questionsAnswered: 0` 的相容性，確保雲端同步不被阻斷
- [x] 6.5 新增 `src/__tests__/focusTimerStats.test.tsx`：測試專注完成時長記錄、休息與取消及 unmount 負向不誤記、統計查詢勝率不被 0 題時段拉低

## 7. E2E 端到端流程測試（Playwright E2E Suite）

- [x] 7.1 新增 `e2e/p1-learning-experience.spec.ts` 涵蓋以下端到端場景：
  - E2E-1：設定開啟「答對自動切題」→ 做題答對後自動流暢切題 → 最後一題自動轉入結果頁
  - E2E-2：答錯題目停留顯示解析 → QuizResult 結算頁對比顯示「你的選擇」與「正確答案」
  - E2E-3：成就儀表板與查看全部成就 Modal 僅展示 4 個已實作成就
  - E2E-4：測驗中途按 ESC 退出後，Dashboard 統計正確累加已做題數與作答時長

## 8. 品質閘門與閉環審計（Quality Gate & Audit）

- [x] 8.1 執行 `npx tsc --noEmit` 全專案 TypeScript 編譯檢查零錯誤
- [x] 8.2 執行 `npm test` 通過全部既有與新增單元/整合測試
- [x] 8.3 執行 `npx knip` 檢查無新增死代碼與未使用導出
- [x] 8.4 執行 `npm run build` 確認 Vite + Tailwind 生產打包正常完成
- [x] 8.5 查驗 `design.md` 與 `tasks.md` 雙向 100% 覆蓋
- [x] 8.6 更新 `docs/DEVELOPMENT_LOG.md` 記錄本次 P1 計畫升級
