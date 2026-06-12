# 專案計畫：死碼清理與重構任務 (Dead Code Cleanup Plan)

## 目標與範圍
執行 `openspec/changes/dead-code-cleanup/` 中的死碼清理與重構任務，包括：
1. 建立基線測試、構建與型別檢查狀態。
2. 進行型別與介面清理 (Phase 1)。
3. 收窄 Export 作用域 (Phase 2)。
4. 刪除 5 個無引用之廢棄函式 (Phase 3)。
5. 元件 Export 重構與 React.memo 封裝優化 (Phase 4)。
6. 清理 package.json 中 5 個未使用的依賴 (Phase 5)。
7. 刪除 3 個 debugging 範例檔案 (Phase 6)。
8. 進行最終三連驗證 (npx tsc, npm run build, npm test) 並更新相關報告與日誌 (Phase 7)。

## 執行流程與角色分工
由於我們是 `teamwork_preview_orchestrator`，我們將只負責協調與任務指派。我們絕不直接編寫或修改原始碼檔案，亦不直接執行建置/測試命令，而是將這些工作指派給專用子代理（Worker, Reviewer, Challenger, Auditor）。

### 分工配置
- **Explorer (teamwork_preview_explorer)**: 負責探索代碼，分析影響範圍與清理策略，並提供詳細的實體變更建議。
- **Worker (teamwork_preview_worker)**: 負責實際修改程式碼檔案、修改 package.json、執行刪除檔案操作，並在每次修改後執行型別檢查、構建及單元測試。
- **Reviewer (teamwork_preview_reviewer)**: 負責獨立進行程式碼審查，確認無 any 型別或 default export 殘留，並重新驗證建置與測試。
- **Challenger (teamwork_preview_challenger)**: 進行對抗性/壓力測試與驗證（如需要）。
- **Auditor (teamwork_preview_auditor)**: 執行最終完整性審計，防止自證幻覺與欺騙行為（如硬編碼測試結果）。

---

## 里程碑計畫 (Milestones)

### M0: 基線建立與環境檢查
- **步驟 0.1**: 檢查 Git 工作區是否乾淨。
- **步驟 0.2**: 執行 `npm test -- --run` 記錄基線測試。
- **步驟 0.3**: 執行 `npm run build` 記錄產物大小。
- **步驟 0.4**: 執行 `npx tsc --noEmit` 確認型別檢查無誤。
- **驗證條件**: Worker 提供完整基線日誌。

### M1: 型別與介面清理 (Phase 1)
- **步驟 1.1**: 取消 `types.ts` 中的 `MistakeLogEntry` export。
- **步驟 1.2**: 取消 `types/battleTypes.ts` 中的 `SkillAnimationType`, `SkillThreshold`, `PracticeChunkStatus` export，刪除 `Hero` 和 `BattleEvent` 定義。
- **步驟 1.3**: 取消 `types/battleTypes.ts` 中的 `SKILL_THRESHOLDS` export。
- **步驟 1.4**: 刪除 `services/analytics.ts` 中的 `StudySession` 介面。
- **步驟 1.5**: 刪除 `hooks/useChunkedPractice.ts` 中的 `UseChunkedPracticeReturn`。
- **步驟 1.6**: 取消 `contexts/ToastContext.tsx` 中的 `Toast` export。
- **驗證條件**: `npx tsc --noEmit` 通過。

### M2: Export 作用域收窄 (Phase 2)
- **步驟 2.1**: 取消 `constants/monstersData.ts` 中 5 個常數的 export。
- **步驟 2.2**: 取消 `constants/skillsData.ts` 中 8 個常數/函式的 export。
- **步驟 2.3**: 取消 `services/ai.ts` 中 `cleanJsonResponse` 的 export。
- **步驟 2.4**: 取消 `services/analytics.ts` 中 `getLocalStudySessions` 的 export。
- **步驟 2.5**: 取消 `services/supabase.ts` 中 `isCloudEnabled` 的 export。
- **步驟 2.6**: 取消 `services/storage.ts` 中 3 個函式的 export。
- **驗證條件**: `npx tsc --noEmit` 通過。

### M3: 物理刪除廢棄函式 (Phase 3)
- **物理刪除**:
  - `constants/monstersData.ts` 中的 `getMonsterByProgress`
  - `services/ai.ts` 中的 `clearAIConfig`
  - `services/challenges.ts` 中的 `getPendingChallengesCount`
  - `utils/questionIdentity.ts` 中的 `isQuestionIdUuid`
  - `utils/typeGuards.ts` 中的 `isSingleAnswer`
- **驗證條件**: `npx tsc --noEmit && npm run build && npm test -- --run` 通過。

### M4: 元件 Export 重構與 Memoization 移轉 (Phase 4)
- **步驟 4.1**: 修改 `components/AppContent.tsx` 和 `src/__tests__/useBattleSystem.test.ts` 為 named import。
- **步驟 4.2**: 重構 `AIPromptGuide`, `BankManager`, `QuizCard`, `Settings` 改為具備 `React.memo` 優化的 named exports，移除其 `export default`。
- **步驟 4.3**: 移除 `BattleArena`, `Dashboard`, `DialogueBubble`, `SkillAnimation`, `SkeletonLoader`, `useBattleSystem` 的 `export default`。
- **驗證條件**: `npx tsc --noEmit && npm run build` 通過。

### M5: 依賴與範例檔案清理 (Phase 5 & 6)
- **步驟 5.1**: 移除 `classnames`, `@tailwindcss/postcss`, `autoprefixer`, `postcss`, `@testing-library/jest-dom` 等 5 個未使用依賴（保留 overrides）。
- **步驟 5.2**: 執行 `npm install`。
- **步驟 5.3**: 刪除 `.agents/`, `.claude/`, `.continue/` 目錄下的 `condition-based-waiting-example.ts` 範例檔案。
- **驗證條件**: `npx tsc --noEmit && npm run build && npm test -- --run` 全部成功。

### M6: 最終驗證與文檔更新 (Phase 7)
- **步驟 6.1**: 完整三連驗證。
- **步驟 6.2**: 對比基線測試數與產物大小。
- **步驟 6.3**: 執行 `npx knip` 檢視清理結果。
- **步驟 6.4**: 更新 `docs/reports/DEAD_CODE_REPORT_2026_06_10.md` 與 `docs/DEVELOPMENT_LOG.md`。
- **驗證條件**: 稽核代理 (Auditor) 執行完整性審計並回報 CLEAN。
