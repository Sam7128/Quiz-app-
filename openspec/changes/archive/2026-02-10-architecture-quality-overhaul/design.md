# Design: Architecture Quality Overhaul

## Context

MindSpark 是一個 React + Vite + TypeScript 的前端 SPA，使用 localStorage 為本地資料庫，可選接 Supabase 雲端。經過多次快速功能迭代（戰鬥模式、社群、成就、Streak、AI PDF 生成等），核心架構未能同步演進，導致：

- `App.tsx`（894 行）承擔所有業務邏輯
- 每個 service 都維護 Local/Cloud 兩套實作
- 錯誤處理依賴原生 `alert()`/`confirm()`
- 無 Error Boundary、無 Toast、無路由框架

目前的 flat file structure（無 `src/` 分層）使得模組邊界模糊。

## Goals / Non-Goals

**Goals:**
- 將 `App.tsx` 從 894 行降至 ≤300 行，拆分為獨立模組
- 建立統一的 Storage Repository 抽象，消除 if(user)/else 雙軌分支
- 用 Toast 系統取代所有 `alert()`/`confirm()` 調用
- 加入 React Error Boundary 保護所有視圖層
- 修復所有 `as any` 類型斷言，達到零 `@ts-ignore`
- 收緊 CSP 安全策略

**Non-Goals:**
- 不引入 `react-router` 或 URL-based 路由（影響範圍太大，留待後續）
- 不重構完整的 i18n 系統
- 不重寫戰鬥系統 (`useBattleSystem.ts`)
- 不重構 UI 組件（Dashboard, Settings 等）的內部結構
- 不增加測試覆蓋率（本次聚焦架構，測試獨立處理）

## Decisions

### Decision 1: Toast/Notification 系統 — 自建輕量級
**選擇**: 自建基於 React Context + Portal 的 Toast 組件
**替代方案**: react-hot-toast / sonner / react-toastify
**理由**:
- 專案已有 Tailwind CSS + Framer Motion，自建可完全匹配現有視覺風格
- 避免新增依賴（package.json 已有 14 個 runtime deps）
- Toast 需求簡單（success/error/warning/info 四種類型即可）
- 同時提供 `useConfirm()` hook 替代 `window.confirm()`

**實作方式**:
```
contexts/ToastContext.tsx    — Provider + useToast hook
components/ToastContainer.tsx — Portal-based 渲染
components/ConfirmDialog.tsx  — 異步確認對話框（Promise-based）
```

### Decision 2: Storage Repository Pattern — 介面統一，策略切換
**選擇**: Repository 介面 + 工廠函數，根據 auth 狀態自動選擇 Local/Cloud 實作
**替代方案**: 繼續在呼叫端 if/else
**理由**:
- 目前 `analytics.ts`、`streak.ts`、`achievements.ts`、`storage.ts`、`cloudStorage.ts` 各自維護兩套邏輯
- Repository Pattern 將差異封裝在工廠內，呼叫者只需 `repo.saveSession()` 而非 `if(user) recordStudySession() else recordLocalStudySession()`

**實作方式**:
```
services/repository.ts     — IStorageRepository 介面定義
services/localRepo.ts      — localStorage 實作
services/cloudRepo.ts      — Supabase 實作
services/repoFactory.ts    — 根據 AuthContext 返回正確的 repo 實例
```

### Decision 3: App.tsx 拆分策略 — Hook 提取 + 組件化
**選擇**: 將業務邏輯提取為自定義 Hook，Header/Nav 提取為組件
**替代方案**: 完全重架構為 state machine (XState)
**理由**:
- Hook 提取是最低風險的重構，不改變 data flow
- 保持 `useReducer` + `appReducer` 不變，只搬移呼叫位置

**拆分計劃**:
```
hooks/useQuizEngine.ts       — startQuiz, handleAnswer, nextQuestion, restoreSession
hooks/useAchievementTracker.ts — handleExitQuiz 內的成就解鎖邏輯
hooks/useBankManager.ts      — refreshBanksData, handleMoveBank, handleBatchDelete
components/AppHeader.tsx     — Header + 桌面 NavBar
components/MobileNav.tsx     — 手機底部導航列
```

### Decision 4: Error Boundary — 分層防護
**選擇**: 雙層 Error Boundary（全局 + 路由級別）
**替代方案**: 僅全局 Error Boundary
**理由**:
- 全局 Boundary 防止白屏（提供「重新載入」按鈕）
- 路由級 Boundary 允許其他頁面正常運作，只有出錯的頁面顯示 fallback

### Decision 5: 類型修正策略
**選擇**: 修正 `Question.answer` 為更精確的類型 + 全面消除 `as any`
**理由**:
- `answer: string | string[]` 導致多處需要 `as any` 來繞過
- 保持 `string | string[]` 但在使用處加上 type guard 函數

## Risks / Trade-offs

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| Repository Pattern 過度設計 | 增加抽象層但 service 數量不多 | 先統一最常用的 3 個 service (analytics/streak/storage)，其餘漸進 |
| App.tsx 拆分可能破壞現有行為 | 狀態流和生命週期可能出問題 | 每步拆分後立即 `npx tsc --noEmit` + 瀏覽器手動驗證 |
| Toast 替代 confirm() | `confirm()` 是同步的，Toast 是異步的 | 使用 Promise-based ConfirmDialog 保持相同的呼叫者體驗 |
| 移除 `unsafe-eval` | 可能影響 Vite dev 模式 HMR | CSP 改為 production-only（通過 `vite.config.ts` 條件注入） |

## Migration Plan

1. **Phase 1 (基礎設施)**: Toast → Error Boundary → ConfirmDialog → 替換所有 alert/confirm
2. **Phase 2 (Storage)**: Repository 介面 → Local 實作 → Cloud 實作 → 工廠 → 逐步遷移 callers
3. **Phase 3 (App.tsx 拆分)**: useQuizEngine → useAchievementTracker → AppHeader → MobileNav
4. **Phase 4 (類型與安全)**: 消除 as any → 收緊 CSP

每個 Phase 結束後 `npx tsc --noEmit` 確認零錯誤。
