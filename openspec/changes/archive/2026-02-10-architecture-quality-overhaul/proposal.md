# Architecture Quality Overhaul

## Problem Statement
MindSpark 經過多次功能迭代後，累積了顯著的技術債務。深度審計發現以下核心問題：

1. **God Component** — `App.tsx` 膨脹至 894 行，集中了路由、狀態管理、業務邏輯、成就系統等所有職責
2. **無統一狀態管理** — `useReducer` + 散落的 `useState` 混用，Local/Cloud 雙軌制造成大量 if/else 分支
3. **類型安全破口** — 5 處 `as any`、1 處 `@ts-ignore`，`Question.answer` 的 `string | string[]` 定義與運行時行為不匹配
4. **錯誤處理原始** — 使用原生 `alert()`/`confirm()`，service 層僅 `console.error` 無 user-facing 通知
5. **localStorage 無防護** — API Key 明文存儲、無容量偵測、部分路徑繞過封裝層
6. **雲端存儲風險** — `saveCloudQuestions` 使用 Delete-All-Then-Insert，中斷時資料遺失
7. **測試覆蓋極低** — 僅 4 個 unit test、0 個組件測試
8. **無路由系統** — 無法書籤/分享 URL、無瀏覽器返回鍵、無 lazy loading
9. **缺少基礎設施** — 無 Error Boundary、無 Toast 系統、無 i18n

## Proposed Solution
分 3 個階段進行修復，每階段獨立可交付：

### Phase 1: 基礎設施與錯誤處理 (優先)
- 建立全域 Toast/Notification 系統取代 `alert()`/`confirm()`
- 加入 React Error Boundary
- 建立統一 Storage 抽象層 (Repository Pattern)，消除 Local/Cloud 雙軌邏輯
- 修復所有 `as any` 類型斷言

### Phase 2: App.tsx 拆分與架構重組
- 抽取 Quiz 邏輯為獨立 Hook (`useQuizEngine`)
- 抽取成就系統邏輯 (`useAchievementTracker`)
- 抽取 Navigation/Header 為獨立組件
- 引入 `react-router` 實現真正的 SPA 路由 + code splitting

### Phase 3: 安全加固與測試補強
- 收緊 CSP (`unsafe-eval` → 移除，`connect-src` → 白名單)
- 加密 localStorage 中的敏感資料 (API Keys)
- 補充核心組件的 unit test
- 改善 `saveCloudQuestions` 為 upsert 策略防止資料遺失

## Impacted Capabilities
- **核心應用** (`App.tsx`) — 重構拆分
- **存儲層** (`services/storage.ts`, `services/cloudStorage.ts`) — Repository Pattern 統一
- **所有 Service** (`analytics.ts`, `streak.ts`, `achievements.ts`) — 移除 Local/Cloud 雙軌
- **錯誤處理** (全域) — Toast + Error Boundary
- **類型定義** (`types.ts`, `types/battleTypes.ts`) — 類型修正
- **安全配置** (`index.html`) — CSP 加固
- **導航** (`App.tsx` Header/Nav) — 組件化 + 路由

## Success Criteria
- [ ] `App.tsx` 行數降至 300 行以下
- [ ] 全局 0 處 `as any` 類型斷言
- [ ] 全局 0 處 `alert()` / `confirm()` 調用
- [ ] 統一 Storage Repository，消除 `if(user)` 雙軌分支
- [ ] React Error Boundary 保護所有路由
- [ ] Toast 通知系統取代原生對話框
- [ ] `npx tsc --noEmit` 零報錯
- [ ] CSP 移除 `unsafe-eval`，`connect-src` 限定白名單
