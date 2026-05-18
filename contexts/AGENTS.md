# Contexts 模組

## Context 清單

| Context | 檔案 | 職責 | 持久化 |
|---------|------|------|--------|
| AuthContext | `AuthContext.tsx` | 用戶認證狀態 + Supabase auth + 登入/登出 | Supabase session |
| ThemeContext | `ThemeContext.tsx` | 明/暗模式切換 | localStorage |
| QuizContext | `QuizContext.tsx` | 測驗模式回調（最小化，不是全域狀態容器） | — |
| RepositoryContext | `RepositoryContext.tsx` | 依 auth 狀態提供 Local 或 Cloud repository | — |
| ToastContext | `ToastContext.tsx` | 統一通知系統 | — |

## 架構設計

- **Guest vs Auth**: `RepositoryContext` 根據 `AuthContext` 的狀態自動切換
  - Guest → `LocalStorageRepository`
  - Authenticated → `CloudStorageRepository`
- **登入同步**: `syncLocalToCloud()` 在登入時合併本地題庫至雲端
- **學習資料保持本地**: mistakes、spaced repetition、streaks 永遠存在 localStorage（裝置特定）
