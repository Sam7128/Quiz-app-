# MindSpark Quiz App 全面升級計劃

## TL;DR

> **Quick Summary**: 全面升級 MindSpark Quiz App，包含性能優化、UI/UX 美化、以及多項溫習功能（間隔重複學習、學習統計、成就系統、好友挑戰賽）。同時進行性能優化和功能開發，採用 TDD 開發模式。
> 
> **Deliverables**:
> - 性能優化：減少重新渲染、並行加載
> - UI 美化：頁面過渡動畫、深色模式、骨架屏
> - 學習功能：SM-2 間隔重複、學習統計、Streak、專注計時器
> - 社交功能：成就系統、好友挑戰賽
> - 測試覆蓋：Vitest 單元測試
> 
> **Estimated Effort**: XL (5-6 weeks)
> **Parallel Execution**: YES - 4 phases with internal parallelization
> **Critical Path**: Phase 0 → Phase 1 (perf) → Phase 2 (UI) → Phase 3 (features) → Phase 4 (social)

---

## Context

### Original Request
用戶希望升級 MindSpark Quiz App，解決卡頓問題，讓程式更加流暢美麗，並添加溫習功能。

### Interview Summary
**Key Discussions**:
- 優先級：同時進行性能優化和功能開發
- 間隔重複：使用標準 SM-2 算法
- 成就系統：10-15 個成就
- 好友挑戰：同題對戰（輪流制）
- 專注計時器：自定義時間
- 測試策略：Vitest + TDD

**Technical Decisions**:
| 功能 | 決策 |
|------|------|
| App.tsx 狀態管理 | useReducer 重構 |
| 深色模式存儲 | Supabase 同步 |
| SM-2 數據存儲 | Supabase 同步 |
| 成就數據存儲 | Supabase 同步 |
| 好友挑戰模式 | 輪流制（非實時） |
| PWA 離線 | 不需要 |

### Metis Review
**Identified Risks** (addressed):
- React 19 + 依賴兼容性：Phase 0 驗證
- Supabase Migration 順序：明確定義順序
- App.tsx 重構風險：先設置測試覆蓋

---

## Work Objectives

### Core Objective
全面升級 MindSpark Quiz App 的性能、視覺體驗和功能，打造流暢、美觀、功能豐富的學習應用。

### Concrete Deliverables
- 重構後的 App.tsx (useReducer)
- 深色模式支援
- SM-2 間隔重複學習系統
- 學習統計頁面
- 專注計時器組件
- 成就系統 (10-15 個)
- 好友挑戰賽功能
- Vitest 測試套件

### Definition of Done
- [ ] `npm run build` 成功
- [ ] `npm test` 所有測試通過
- [ ] 頁面切換流暢（無明顯卡頓）
- [ ] 深色模式正常切換
- [ ] SM-2 複習提醒正常工作

### Must Have
- 性能優化（React.memo, useCallback, 並行加載）
- 深色模式
- SM-2 間隔重複學習
- 學習統計
- 成就系統
- 好友挑戰賽
- 鍵盤快捷鍵

### Must NOT Have (Guardrails)
- PWA 離線支援
- 多主題自定義顏色
- 超過 15 個成就
- 實時 WebSocket 對戰
- 複雜的番茄鐘模式
- 完整鍵盤導航
- 排行榜/社交比較功能
- 新 AI 功能
- 多語言支援

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO
- **User wants tests**: TDD
- **Framework**: Vitest

### Test Setup Task

每個 TODO 遵循 RED-GREEN-REFACTOR：

**Task Structure:**
1. **RED**: 先寫失敗測試
   - Test file: `src/__tests__/*.test.ts`
   - Test command: `npm test`
   - Expected: FAIL
2. **GREEN**: 實現最小代碼通過測試
3. **REFACTOR**: 清理代碼保持綠燈

---

## Execution Strategy

### Parallel Execution Waves

```
Phase 0 (Foundation):
└── Task 1: Vitest setup + dependency verification

Phase 1 (Performance) - After Phase 0:
├── Task 2: App.tsx useReducer 重構
├── Task 3: React.memo + useCallback
└── Task 4: 並行加載優化

Phase 2 (UI/UX) - After Phase 1:
├── Task 5: 深色模式
├── Task 6: 頁面過渡動畫
├── Task 7: 骨架屏 + 載入狀態
└── Task 8: 鍵盤快捷鍵

Phase 3 (Learning Features) - After Phase 2:
├── Task 9: SM-2 間隔重複學習
├── Task 10: 學習統計
├── Task 11: Streak 系統
└── Task 12: 專注計時器

Phase 4 (Social Features) - After Phase 3:
├── Task 13: 成就系統
└── Task 14: 好友挑戰賽

Critical Path: Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2-14 | None |
| 2 | 1 | 5, 9 | 3, 4 |
| 3 | 1 | 6, 7 | 2, 4 |
| 4 | 1 | 9, 10 | 2, 3 |
| 5 | 2 | None | 6, 7, 8 |
| 6 | 3 | None | 5, 7, 8 |
| 7 | 3 | None | 5, 6, 8 |
| 8 | 1 | None | 5, 6, 7 |
| 9 | 2, 4 | 13 | 10, 11, 12 |
| 10 | 4 | 13 | 9, 11, 12 |
| 11 | 1 | 13 | 9, 10, 12 |
| 12 | 1 | None | 9, 10, 11 |
| 13 | 9, 10, 11 | None | 14 |
| 14 | 9 | None | 13 |

---

## TODOs

---

### Phase 0: Foundation

- [ ] 1. Vitest 測試框架設置 + 依賴驗證

  **What to do**:
  - 安裝 Vitest 和測試相關依賴
  - 配置 vitest.config.ts
  - 創建第一個測試驗證設置
  - 驗證 React 19 與現有依賴兼容性

  **Must NOT do**:
  - 不要安裝不必要的測試工具
  - 不要修改現有代碼邏輯

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - 簡單的依賴安裝和配置任務

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Phase 0)
  - **Blocks**: Tasks 2-14
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `vite.config.ts:1-26` - Vite 配置模式
  - `tsconfig.json:1-29` - TypeScript 配置

  **Documentation References**:
  - Vitest docs: https://vitest.dev/guide/

  **Acceptance Criteria**:

  ```bash
  # 安裝依賴
  npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/jest

  # 驗證配置文件存在
  test -f vitest.config.ts && echo "Config exists"

  # 運行測試
  npm test
  # Assert: 至少 1 個測試通過

  # 驗證依賴兼容性
  npm run dev
  # Assert: 開發服務器正常啟動，無錯誤
  ```

  **Commit**: YES
  - Message: `chore: setup Vitest testing framework`
  - Files: `vitest.config.ts`, `package.json`, `src/__tests__/setup.test.ts`
  - Pre-commit: `npm test`

---

### Phase 1: Performance Optimization

- [ ] 2. App.tsx 狀態管理重構 (useReducer)

  **What to do**:
  - 將 8 個 useState 整合為 useReducer
  - 分離 activeQuestions 為獨立狀態（避免大物件更新）
  - 定義 AppState 和 AppAction 類型
  - 創建 appReducer 函數
  - 更新所有狀態更新邏輯

  **Must NOT do**:
  - 不要改變現有功能行為
  - 不要引入新的 UI 變化

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: []
    - 複雜的狀態管理重構需要深度理解

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 3, 4)
  - **Blocks**: Tasks 5, 9
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `App.tsx:47-73` - 現有 8 個 useState 定義
  - `App.tsx:66-73` - quizState 物件結構
  - `types.ts:39-47` - QuizState interface

  **Type References**:
  - `types.ts:1-82` - 所有類型定義

  **Acceptance Criteria**:

  ```bash
  # TDD: 先寫測試
  # src/__tests__/appReducer.test.ts
  npm test -- --grep "appReducer"
  # Assert: 測試 SET_VIEW, START_QUIZ, HANDLE_ANSWER, NEXT_QUESTION actions

  # 驗證重構後功能
  npm run build
  # Assert: 無 TypeScript 錯誤

  npm run dev
  # Assert: 開發服務器正常啟動
  # 使用 playwright 驗證基本流程
  ```

  **Commit**: YES
  - Message: `refactor: migrate App.tsx state to useReducer`
  - Files: `App.tsx`, `types.ts`, `src/__tests__/appReducer.test.ts`
  - Pre-commit: `npm test`

---

- [ ] 3. React.memo + useCallback 優化

  **What to do**:
  - 用 React.memo() 包裝所有主要子組件
  - 用 useCallback 包裝傳遞給子組件的 handlers
  - 提取 framer-motion variants 為常量

  **Must NOT do**:
  - 不要過度優化簡單組件
  - 不要改變組件 API

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: []
    - 標準的 React 優化模式

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 4)
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `components/QuizCard.tsx:37-55` - useMemo 使用模式
  - `components/Dashboard.tsx:21-33` - 需要包裝的組件

  **API/Type References**:
  - React.memo, useCallback, useMemo from 'react'

  **Acceptance Criteria**:

  ```bash
  # 驗證 memo 應用
  grep -r "React.memo" components/
  # Assert: 至少 5 個組件使用 React.memo

  # 驗證 useCallback 應用
  grep -r "useCallback" App.tsx
  # Assert: 至少 5 個 handler 使用 useCallback

  # 性能驗證
  npm run build
  # Assert: 無錯誤
  ```

  **Commit**: YES
  - Message: `perf: add React.memo and useCallback optimizations`
  - Files: `App.tsx`, `components/*.tsx`
  - Pre-commit: `npm test`

---

- [ ] 4. 並行加載優化

  **What to do**:
  - 將 App.tsx:170-174 的串行加載改為 Promise.all
  - 將 cloudStorage.ts:105-115 的串行同步改為並行
  - 優化 BankManager 的雙重 refresh 調用

  **Must NOT do**:
  - 不要改變加載結果
  - 不要移除錯誤處理

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - 簡單的異步優化

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 9, 10
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `App.tsx:170-174` - 串行題庫加載循環
  - `services/cloudStorage.ts:105-115` - 串行同步邏輯
  - `components/BankManager.tsx:43-48` - 雙重 refresh

  **Acceptance Criteria**:

  ```bash
  # TDD
  npm test -- --grep "parallel loading"
  # Assert: 測試並行加載邏輯

  # 驗證 Promise.all 使用
  grep -n "Promise.all" App.tsx services/cloudStorage.ts
  # Assert: 至少 2 處使用 Promise.all

  npm run build
  # Assert: 無錯誤
  ```

  **Commit**: YES
  - Message: `perf: optimize data loading with Promise.all`
  - Files: `App.tsx`, `services/cloudStorage.ts`, `components/BankManager.tsx`
  - Pre-commit: `npm test`

---

### Phase 2: UI/UX Improvements

- [ ] 5. 深色模式實現

  **What to do**:
  - 配置 Tailwind darkMode: 'class'
  - 創建 ThemeContext 和 useTheme hook
  - 添加主題切換按鈕到 Settings
  - 為所有組件添加 dark: 類別
  - 將主題偏好同步到 Supabase profiles 表
  - 支援系統主題跟隨選項

  **Must NOT do**:
  - 不要添加多主題/自定義顏色
  - 不要破壞現有樣式

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - UI 樣式工作需要視覺設計技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8)
  - **Blocks**: None
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `components/Settings.tsx:38-214` - 設置面板樣式
  - `App.tsx:320-367` - 主佈局樣式
  - `tailwind.config.js` (如存在) - Tailwind 配置

  **Database References**:
  - `services/supabase.ts:10` - Supabase client
  - 需要擴展 profiles 表添加 theme 欄位

  **Acceptance Criteria**:

  ```bash
  # 驗證 Tailwind 配置
  grep -n "darkMode" tailwind.config.js
  # Assert: darkMode: 'class'

  # 驗證 ThemeContext 存在
  test -f contexts/ThemeContext.tsx && echo "ThemeContext exists"

  # Playwright 驗證
  # 1. 打開設置
  # 2. 切換深色模式
  # 3. 截圖對比
  # Assert: 背景變為深色

  npm run build
  # Assert: 無錯誤
  ```

  **Commit**: YES
  - Message: `feat: implement dark mode with Supabase sync`
  - Files: `tailwind.config.js`, `contexts/ThemeContext.tsx`, `components/Settings.tsx`, `components/*.tsx`
  - Pre-commit: `npm test`

---

- [ ] 6. 頁面過渡動畫

  **What to do**:
  - 為 view 切換添加 AnimatePresence
  - 創建統一的頁面過渡 variants
  - 優化現有 QuizCard 動畫

  **Must NOT do**:
  - 不要為每個元素都加動畫
  - 不要使用過長的動畫時間

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - 動畫設計需要視覺技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7, 8)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `components/QuizCard.tsx:156-307` - 現有 framer-motion 使用
  - `App.tsx:241-318` - renderContent 函數

  **External References**:
  - framer-motion docs: https://www.framer.com/motion/

  **Acceptance Criteria**:

  ```bash
  # 驗證 AnimatePresence 使用
  grep -n "AnimatePresence" App.tsx
  # Assert: 存在頁面級別的 AnimatePresence

  # 驗證 variants 提取
  grep -n "const.*variants" App.tsx components/*.tsx
  # Assert: 有統一的 variants 常量

  # Playwright 驗證
  # 1. 切換頁面
  # 2. 錄製動畫
  # Assert: 有明顯的過渡效果
  ```

  **Commit**: YES
  - Message: `feat: add page transition animations`
  - Files: `App.tsx`, `components/*.tsx`
  - Pre-commit: `npm test`

---

- [ ] 7. 骨架屏 + 載入狀態優化

  **What to do**:
  - 創建 SkeletonLoader 組件
  - 替換現有的 loading spinner
  - 為列表項目添加進入動畫

  **Must NOT do**:
  - 不要過度設計骨架屏

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 8)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `App.tsx:228-237` - 現有 loading 狀態
  - `components/BankManager.tsx:156-165` - 現有 loading overlay

  **Acceptance Criteria**:

  ```bash
  # 驗證 SkeletonLoader 組件存在
  test -f components/SkeletonLoader.tsx && echo "SkeletonLoader exists"

  # 驗證使用
  grep -rn "SkeletonLoader" components/
  # Assert: 至少 2 處使用

  npm run build
  # Assert: 無錯誤
  ```

  **Commit**: YES
  - Message: `feat: add skeleton loading states`
  - Files: `components/SkeletonLoader.tsx`, `components/Dashboard.tsx`, `components/BankManager.tsx`
  - Pre-commit: `npm test`

---

- [ ] 8. 鍵盤快捷鍵實現

  **What to do**:
  - 創建 useKeyboardShortcuts hook
  - 實現快捷鍵：1-4 選擇選項、Enter 確認/下一題、H 顯示提示、Esc 退出
  - 添加快捷鍵說明面板

  **Must NOT do**:
  - 不要實現完整鍵盤導航
  - 不要與瀏覽器快捷鍵衝突

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `components/QuizCard.tsx:65-95` - 選項點擊處理
  - `components/QuizCard.tsx:256-266` - 送出答案按鈕

  **Acceptance Criteria**:

  ```bash
  # TDD
  npm test -- --grep "keyboard shortcuts"
  # Assert: 測試 1-4, Enter, H, Esc 快捷鍵

  # 驗證 hook 存在
  test -f hooks/useKeyboardShortcuts.ts && echo "Hook exists"

  # Playwright 驗證
  # 1. 開始測驗
  # 2. 按 "1" 鍵
  # Assert: 第一個選項被選中
  ```

  **Commit**: YES
  - Message: `feat: implement keyboard shortcuts for quiz`
  - Files: `hooks/useKeyboardShortcuts.ts`, `components/QuizCard.tsx`
  - Pre-commit: `npm test`

---

### Phase 3: Learning Features

- [ ] 9. SM-2 間隔重複學習系統

  **What to do**:
  - 創建 SpacedRepetitionItem 類型
  - 實現 SM-2 算法 (services/spacedRepetition.ts)
  - 創建 Supabase 表 question_progress
  - 添加「今日複習」功能到 Dashboard
  - 顯示複習進度

  **SM-2 實現細節**:
  ```typescript
  interface SpacedRepetitionItem {
    questionId: string;
    easinessFactor: number;      // default 2.5, min 1.3
    interval: number;            // days
    repetitions: number;         // default 0
    nextReviewDate: number;      // timestamp
  }

  // Grade 0-5, < 3 = fail
  // Use OLD EF for interval calculation, then update EF
  // Reset repetitions to 0 on grade < 3
  // Cap interval at 365 days
  ```

  **Must NOT do**:
  - 不要添加自定義間隔設定 UI
  - 不要修改現有 MistakeLog 結構

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: []
    - 複雜算法實現

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11, 12)
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Tasks 2, 4

  **References**:

  **Pattern References**:
  - `services/storage.ts:189-222` - MistakeLog 模式
  - `services/cloudStorage.ts:58-78` - Supabase 查詢模式

  **Type References**:
  - `types.ts:12-16` - MistakeLogEntry 結構

  **External References**:
  - SM-2 算法: https://en.wikipedia.org/wiki/SuperMemo#SM-2_algorithm

  **Acceptance Criteria**:

  ```bash
  # TDD: SM-2 核心算法
  npm test -- --grep "SM-2"
  # Assert: 測試 EF 計算、間隔計算、重置邏輯

  # 驗證服務存在
  test -f services/spacedRepetition.ts && echo "Service exists"

  # 驗證類型
  grep -n "SpacedRepetitionItem" types.ts
  # Assert: 類型定義存在

  # Playwright 驗證
  # 1. 完成一題
  # 2. 檢查 Dashboard "今日複習" 區域
  # Assert: 複習計數正確更新
  ```

  **Commit**: YES
  - Message: `feat: implement SM-2 spaced repetition system`
  - Files: `services/spacedRepetition.ts`, `types.ts`, `components/Dashboard.tsx`, `supabase_migration.sql`
  - Pre-commit: `npm test`

---

- [ ] 10. 學習統計系統

  **What to do**:
  - 創建 study_sessions Supabase 表
  - 實現 services/analytics.ts
  - 創建 useStudyStats hook
  - 添加統計頁面/區域到 Dashboard
  - 使用 recharts 繪製正確率趨勢圖

  **Must NOT do**:
  - 不要添加排行榜/社交比較
  - 統計只保留 30 天數據

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - 數據可視化需要視覺技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 11, 12)
  - **Blocks**: Task 13
  - **Blocked By**: Task 4

  **References**:

  **Pattern References**:
  - `components/Dashboard.tsx:52-56` - recharts 使用模式 (PieChart)
  - `services/cloudStorage.ts:9-27` - Supabase 查詢模式

  **External References**:
  - recharts docs: https://recharts.org/

  **Acceptance Criteria**:

  ```bash
  # 驗證服務存在
  test -f services/analytics.ts && echo "Analytics service exists"

  # 驗證 hook 存在
  test -f hooks/useStudyStats.ts && echo "Hook exists"

  # 驗證圖表渲染
  grep -n "LineChart\|AreaChart" components/Dashboard.tsx
  # Assert: 有趨勢圖組件

  # Playwright 驗證
  # 1. 完成幾道題
  # 2. 回到 Dashboard
  # Assert: 統計數據更新，圖表顯示
  ```

  **Commit**: YES
  - Message: `feat: add learning statistics with charts`
  - Files: `services/analytics.ts`, `hooks/useStudyStats.ts`, `components/Dashboard.tsx`, `supabase_migration.sql`
  - Pre-commit: `npm test`

---

- [ ] 11. Streak 連續學習天數系統

  **What to do**:
  - 創建 user_streaks Supabase 表
  - 實現 Streak 計算邏輯
  - 在 Dashboard 顯示火焰圖標 + 天數
  - 記錄歷史最高紀錄
  - Streak 斷了時顯示提醒

  **Must NOT do**:
  - 不要複雜化計算邏輯

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 12)
  - **Blocks**: Task 13
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `components/Dashboard.tsx:1-4` - Dashboard 結構
  - `lucide-react` - Flame 圖標

  **Acceptance Criteria**:

  ```bash
  # TDD: Streak 計算
  npm test -- --grep "streak"
  # Assert: 測試連續天數計算、重置邏輯

  # Playwright 驗證
  # 1. 完成學習
  # 2. 檢查 Dashboard
  # Assert: Streak 火焰顯示，天數 ≥ 1
  ```

  **Commit**: YES
  - Message: `feat: add learning streak system`
  - Files: `services/streak.ts`, `components/Dashboard.tsx`, `supabase_migration.sql`
  - Pre-commit: `npm test`

---

- [ ] 12. 專注計時器

  **What to do**:
  - 創建 FocusTimer 組件
  - 支援自定義專注時間和休息時間
  - 實現循環模式
  - 添加完成提示音
  - 與學習統計整合（記錄專注時間）

  **Must NOT do**:
  - 不要實現複雜的番茄鐘模式

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 11)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `components/QuizCard.tsx:32-34` - use-sound 使用模式
  - `public/sounds/` - 音效文件位置

  **Acceptance Criteria**:

  ```bash
  # 驗證組件存在
  test -f components/FocusTimer.tsx && echo "FocusTimer exists"

  # TDD
  npm test -- --grep "FocusTimer"
  # Assert: 測試計時邏輯、暫停/繼續

  # Playwright 驗證
  # 1. 開啟計時器
  # 2. 設定 1 分鐘
  # 3. 等待結束
  # Assert: 提示音播放，休息模式開始
  ```

  **Commit**: YES
  - Message: `feat: add focus timer with customizable durations`
  - Files: `components/FocusTimer.tsx`, `App.tsx`
  - Pre-commit: `npm test`

---

### Phase 4: Social Features

- [ ] 13. 成就系統

  **What to do**:
  - 創建 user_achievements Supabase 表
  - 實現 services/achievements.ts
  - 定義 10-15 個成就（見下方列表）
  - 創建成就徽章 UI
  - 成就解鎖時顯示慶祝動畫
  - 同步到 Supabase

  **成就列表**:
  ```
  入門類:
  1. 新手上路 - 完成第一次測驗
  2. 求知若渴 - 累計答題 100 題
  3. 堅持不懈 - 連續學習 7 天

  精通類:
  4. 題庫大師 - 單題庫 100% 正確率
  5. 完美一局 - 單次測驗全對
  6. 知識淵博 - 完成 500 題

  時間類:
  7. 早鳥學習 - 早上 8 點前完成學習
  8. 夜貓子 - 晚上 11 點後完成學習
  9. 專注大師 - 完成 10 個番茄鐘

  社交類:
  10. 知識分享者 - 分享第一個題庫
  11. 挑戰者 - 發起第一次挑戰
  12. 常勝將軍 - 連續贏得 5 場挑戰
  ```

  **Must NOT do**:
  - 不要超過 15 個成就
  - 成就觸發只檢查相關類別

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`frontend-ui-ux`]
    - 成就系統複雜度中等，需要 UI 設計

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 14)
  - **Blocks**: None
  - **Blocked By**: Tasks 9, 10, 11

  **References**:

  **Pattern References**:
  - `components/Dashboard.tsx` - Dashboard 佈局
  - `types.ts:56-60` - UserProfile 結構

  **Acceptance Criteria**:

  ```bash
  # TDD: 成就觸發邏輯
  npm test -- --grep "achievements"
  # Assert: 測試每個成就的觸發條件

  # 驗證服務存在
  test -f services/achievements.ts && echo "Service exists"

  # 驗證成就數量
  grep -c "id:" services/achievements.ts
  # Assert: 10-15 個成就

  # Playwright 驗證
  # 1. 完成第一次測驗
  # Assert: 「新手上路」成就解鎖動畫顯示
  ```

  **Commit**: YES
  - Message: `feat: add gamification achievement system`
  - Files: `services/achievements.ts`, `components/AchievementBadge.tsx`, `components/Dashboard.tsx`, `supabase_migration.sql`
  - Pre-commit: `npm test`

---

- [ ] 14. 好友挑戰賽

  **What to do**:
  - 創建 challenges Supabase 表
  - 實現挑戰邀請發送
  - 實現同題目隨機抽選
  - 實現分數提交與對比
  - 添加挑戰結果通知
  - 歷史挑戰記錄頁面
  - 好友排行榜

  **挑戰流程**:
  1. A 選擇題庫，開始挑戰，完成答題，記錄分數
  2. A 發送挑戰給 B（包含題目快照）
  3. B 收到通知，接受挑戰
  4. B 完成相同題目，記錄分數
  5. 雙方查看對比結果

  **Must NOT do**:
  - 不要實現實時 WebSocket 對戰
  - 不要實現複雜的匹配系統

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
    - 複雜的多步驟功能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 13)
  - **Blocks**: None
  - **Blocked By**: Task 9

  **References**:

  **Pattern References**:
  - `components/Social.tsx:8` - 現有社交組件
  - `components/ShareModal.tsx:15` - 分享模態框模式
  - `types.ts:71-82` - SharedBank 結構

  **Database References**:
  - `supabase_social_migration.sql` - 現有社交表結構

  **Acceptance Criteria**:

  ```bash
  # TDD: 挑戰邏輯
  npm test -- --grep "challenge"
  # Assert: 測試創建、接受、完成挑戰

  # Playwright 驗證
  # 1. 用戶 A 發起挑戰
  # 2. 用戶 B 接受挑戰
  # 3. 用戶 B 完成題目
  # Assert: 雙方可查看對比結果
  ```

  **Commit**: YES
  - Message: `feat: add friend challenge system`
  - Files: `services/challenges.ts`, `components/ChallengeModal.tsx`, `components/Social.tsx`, `supabase_migration.sql`
  - Pre-commit: `npm test`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `chore: setup Vitest testing framework` | vitest.config.ts, package.json | npm test |
| 2 | `refactor: migrate App.tsx state to useReducer` | App.tsx, types.ts | npm test |
| 3 | `perf: add React.memo and useCallback optimizations` | App.tsx, components/*.tsx | npm test |
| 4 | `perf: optimize data loading with Promise.all` | App.tsx, services/*.ts | npm test |
| 5 | `feat: implement dark mode with Supabase sync` | tailwind.config.js, contexts/*.tsx | npm test |
| 6 | `feat: add page transition animations` | App.tsx, components/*.tsx | npm test |
| 7 | `feat: add skeleton loading states` | components/SkeletonLoader.tsx | npm test |
| 8 | `feat: implement keyboard shortcuts for quiz` | hooks/*.ts, components/*.tsx | npm test |
| 9 | `feat: implement SM-2 spaced repetition system` | services/spacedRepetition.ts | npm test |
| 10 | `feat: add learning statistics with charts` | services/analytics.ts | npm test |
| 11 | `feat: add learning streak system` | services/streak.ts | npm test |
| 12 | `feat: add focus timer with customizable durations` | components/FocusTimer.tsx | npm test |
| 13 | `feat: add gamification achievement system` | services/achievements.ts | npm test |
| 14 | `feat: add friend challenge system` | services/challenges.ts | npm test |

---

## Supabase Migration Summary

需要創建的表：
1. `question_progress` - SM-2 學習進度
2. `study_sessions` - 學習會話記錄
3. `user_streaks` - 連續學習天數
4. `user_achievements` - 成就解鎖記錄
5. `challenges` - 挑戰賽記錄

需要擴展的表：
- `profiles` - 添加 theme 欄位

---

## Success Criteria

### Verification Commands
```bash
npm run build          # Expected: 無錯誤
npm test               # Expected: 所有測試通過
npm run dev            # Expected: 開發服務器正常啟動
```

### Final Checklist
- [ ] 所有 14 個任務完成
- [ ] npm run build 成功
- [ ] npm test 所有測試通過
- [ ] 深色模式正常工作
- [ ] SM-2 複習系統正常工作
- [ ] 成就系統正常工作
- [ ] 好友挑戰賽正常工作
- [ ] 頁面切換流暢無卡頓
