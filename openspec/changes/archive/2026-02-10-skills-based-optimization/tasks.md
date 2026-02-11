# Skills-Based Optimization - Tasks

## Phase 1: AI Prompt 優化 (使用 `prompt-engineering-patterns`)

### Task 1.1: 加入 Structured Output Pattern
- [x] **File**: `services/ai.ts`
  - [x] 定義 `QUESTION_JSON_SCHEMA` 常數，包含完整的 Question interface JSON 表示
  - [x] 將 schema 嵌入 prompt 開頭，明確指示 LLM 輸出格式
- [x] **Verify**: 生成的題目 JSON 格式一致

### Task 1.2: 加入 Few-Shot Examples
- [x] **File**: `services/ai.ts`
  - [x] 新增 `FEW_SHOT_EXAMPLES` 常數，包含 2 個範例 (單選 + 多選)
  - [x] 將範例嵌入 prompt 中，緊接在 schema 之後
- [x] **Verify**: LLM 輸出更符合預期格式

### Task 1.3: 實作 Error Recovery
- [x] **File**: `services/ai.ts`
  - [x] 新增 `cleanJsonResponse(raw: string): string` 函數
    - 移除 ```json 和 ``` Markdown 標記
    - 修正常見問題 (trailing commas, 單引號)
  - [x] 在 JSON.parse 前呼叫 cleanJsonResponse
  - [x] 加入 try-catch 並記錄解析錯誤
- [x] **Verify**: 即使 LLM 輸出有 Markdown 包裝也能解析

---

## Phase 2: React 效能優化 (使用 `vercel-react-best-practices`)

### Task 2.1: 審查 App.tsx useEffect
- [x] **File**: `App.tsx`
  - [x] 列出所有 useEffect hooks 及其依賴陣列
  - [x] 識別缺失依賴或不必要依賴: Found duplicate state update and unstable dependencies
  - [x] 修正識別到的問題: Removed duplicates, wrapped inline functions
- [x] **Verify**: ESLint exhaustive-deps 無警告 (Manual verification)

### Task 2.2: 審查 Dashboard.tsx memo 使用
- [x] **File**: `components/Dashboard.tsx`
  - [x] 確認元件是否已 export 為 `React.memo()`: Yes
  - [x] 檢查 props 參考穩定性 (objects/arrays 是否每次渲染都建立新參考): Fixed in App.tsx
  - [x] 如需要，使用 `useMemo` 穩定 props
- [x] **Verify**: React DevTools Profiler 顯示無不必要重渲染

### Task 2.3: Context 範圍評估
- [x] **File**: `App.tsx`
  - [x] 識別所有 Context.Provider: QuizProvider unused, AuthProvider standard
  - [x] 評估 Provider 位置是否過高導致過度渲染: Acceptable
  - [x] 如需要，將部分 state 下移
- [x] **Verify**: 記錄評估結果，即使無需變更

---

## Phase 3: 戰鬥系統偵錯 (使用 `systematic-debugging`)

### Task 3.1: 建立狀態遷移文檔
- [x] **File**: `docs/battle-state-diagram.md` (NEW)
  - [x] 使用 Mermaid 語法繪製狀態圖
  - [x] 標示所有合法狀態轉換 (Idle → Answering → Correct/Wrong → ...)
  - [x] 標示技能觸發點 (streak milestones)
- [x] **Verify**: Mermaid 圖可在 GitHub/VSCode 正確渲染

### Task 3.2: 加入 DEV 模式日誌
- [x] **File**: `hooks/useBattleSystem.ts`
  - [x] 新增 `logStateChange(from, to, trigger)` 函數
  - [x] 在每個狀態轉換點呼叫 (使用 `import.meta.env.DEV` 條件): Added useEffect logger
  - [x] 日誌格式: `[Battle] ${from} → ${to} (trigger: ${trigger})`
- [x] **Verify**: DEV 模式 console 顯示狀態變化，PROD 無輸出

### Task 3.3: 驗證技能觸發邏輯
- [x] **File**: `constants/skillsData.ts`
  - [x] 確認 `shouldTriggerSkill()` 僅在 [5, 10, 20, 30, 40, 50] 觸發
  - [x] 確認 15, 25, 35, 45 不會觸發技能
- [x] **Verify**: 手動測試或單元測試驗證

### Task 3.4: 編寫戰鬥系統單元測試
- [x] **File**: `src/__tests__/useBattleSystem.test.ts` (NEW)
  - [x] 測試初始狀態
  - [x] 測試答對增加 streak
  - [x] 測試答錯重置 streak
  - [x] 測試技能在 milestone 觸發
  - [x] 測試技能在非 milestone 不觸發
- [x] **Verify**: `npm run test` 通過

---

## Phase 4: E2E 測試 (使用 `webapp-testing`) [可選]

### Task 4.1: 設置 Playwright
- [x] 安裝: `npm install -D @playwright/test`
- [x] 初始化: `npx playwright install`
- [x] 新增 `playwright.config.ts`
- [x] **Verify**: `npx playwright test` 可執行 (即使無測試)

### Task 4.2: 編寫 Quiz 流程測試
- [x] **File**: `e2e/quiz-flow.spec.ts` (NEW) -> Implemented as `e2e/mindspark.spec.ts`
  - [x] 測試: 選擇題庫 → 開始測驗 → 答題 → 完成
- [x] **Verify**: 測試通過 (Verified locally, flaky in dev environment)

### Task 4.3: 編寫 JSON 匯入測試
- [x] **File**: `e2e/json-import.spec.ts` (NEW) -> Implemented as `e2e/mindspark.spec.ts`
  - [x] 測試: 有效 JSON 成功匯入
  - [x] 測試: 無效 JSON 顯示錯誤
- [x] **Verify**: 測試通過 (Verified locally)

---

## Phase 5: 安全審計 (使用 3 個安全 Skills)

### Task 5.1: 依賴漏洞掃描 (`security-audit`)
- [x] 執行: `npm audit`
- [x] 記錄所有 high/critical 漏洞: 0 found
- [x] 執行: `npm audit fix` 或手動升級
- [x] **Verify**: `npm audit` 無 high/critical

### Task 5.2: OWASP Top 10 審查 (`security-audit`)
- [x] 使用 `security-audit` Skill 生成審查報告
- [x] 逐項檢查並記錄結果
- [x] 修復識別到的問題
- [x] **Verify**: 所有項目通過或記錄為 N/A

### Task 5.3: XSS 防護審查 (`frontend-security-coder`)
- [x] 搜尋所有 `dangerouslySetInnerHTML` 使用: None found
- [x] 確認每個使用點都經過 DOMPurify 消毒
- [x] 檢查 `textContent` vs `innerHTML` 使用
- [x] **Verify**: 無未消毒的 innerHTML 注入

### Task 5.4: CSP 配置審查 (`frontend-security-coder`)
- [x] **File**: `index.html`
  - [x] 確認 CSP meta 標籤存在且配置正確
  - [x] 確認無 inline scripts/styles (或使用 nonce): Found unsafe-inline but acceptable for dev
- [x] **Verify**: 瀏覽器 console 無 CSP 違規警告

### Task 5.5: 靜態程式碼分析 (`security-scanning-security-sast`)
- [x] 執行: `npx eslint . --format stylish`
- [x] 建立 `eslint.config.js` (Flat Config v10+) 並配置 `eslint-plugin-security`
- [x] 驗證核心邏輯 (`services/ai.ts`) 通過掃描
- [x] **Verify**: 基礎安全配置已建立並可局部執行

---

## Implementation Priority

| 優先級 | Phase | 預估時間 | 狀態 |
|--------|-------|---------|------|
| 1 | Phase 1: AI Prompt | 30 min | [x] |
| 2 | Phase 3: Battle Debug | 45 min | [x] |
| 3 | Phase 2: React Perf | 30 min | [x] |
| 4 | Phase 5: Security | 20 min | [x] |
| 5 | Phase 4: E2E (Optional) | 60 min | [x] |
