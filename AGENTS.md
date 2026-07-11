# AGENTS.md - MindSpark Development Guide

## 🔒 鐵規 (Absolute Rules)

> **所有 Agent（Codex、Gemini CLI、Claude 等）進入本專案時，必須遵守以下不可違反的規則。**

1. **LANGUAGE_ZH_TW**: 所有互動與回應必須使用**繁體中文**。
2. **CHECKLIST_FIRST**: 每個重大任務必須維護並更新 `CHECKLIST.md`。
3. **NO_ANY**: 嚴禁使用 `any` 型別。使用 `unknown` + 型別守衛。
4. **DATA_SAFETY**: 絕對禁止對正式數據檔案（`user_data.json`、`localStorage` 中的 `mindspark_*`）執行破壞性測試。測試必須使用獨立路徑。進行任何可能影響用戶數據的操作前，必須先備份。
5. **TYPE_FIRST**: 先在 `types.ts` 定義型別 → `npx tsc --noEmit` 編譯檢查 → 再實作邏輯。
6. **REACT_18_SAFETY**: 使用 `useTranslation` 或 async 初始化的元件必須包在 `<Suspense>` 中。關鍵資料使用 Skeleton loader。
7. **PERSISTENCE_INTEGRITY**: Zustand `persist` 必須在 `partialize` 中顯式列出所有欄位。實作自訂 `merge` 函式防止空資料覆蓋。
8. **DEPENDENCY_VERIFY**: 匯入外部套件前先驗證其匯出。注意大版本升級的 breaking changes。
9. **PERFECTIONIST_MODE**: 禁止截斷程式碼，必須輸出完整檔案內容。優先防禦式程式設計和資料安全。
10. **DOCS_MAINTENANCE**: 在每次任務結束或有重大變更時，必須自動檢查並更新 [docs/DEVELOPMENT_LOG.md](file:///c:/Users/user/Desktop/Quiz-app-/docs/DEVELOPMENT_LOG.md)，內容必須保持與最新代碼狀態同步。GEMINI.md 已廢除，不再維護。


## 📍 模組快速索引

> Agent 可直接跳轉至對應模組的巢狀 `AGENTS.md` 取得精準上下文，無需搜尋整個專案。

| 模組 | 路徑 | 局部記憶 | 職責 |
|------|------|----------|------|
| Components | `components/` | `components/AGENTS.md` | UI 元件、動畫、頁面 |
| Services | `services/` | `services/AGENTS.md` | 業務邏輯、資料存取、AI |
| Hooks | `hooks/` | `hooks/AGENTS.md` | 領域 Hooks（Battle, Quiz 等） |
| Constants | `constants/` | `constants/AGENTS.md` | 靜態資料定義（怪物、技能、成就） |
| Contexts | `contexts/` | `contexts/AGENTS.md` | React Context（Auth, Theme 等） |
| OpenSpec | `openspec/` | `openspec/AGENTS.md` | 規格管理、變更追蹤 |
| Tests | `src/__tests__/` | `src/__tests__/AGENTS.md` | 單元測試 |
| E2E | `e2e/` | `e2e/AGENTS.md` | 端對端測試 |

## 🛠️ Quick Start & Build

```bash
npm install                  # 安裝專案依賴
npm run dev                  # 啟動開發伺服器 (Port 5173)
npm run build                # 生產環境編譯 (Vite + Tailwind CSS v4, 輸出至 dist/)
npm run preview              # 本地預覽生產環境編譯結果 (Port 5173)
npm test                     # 執行單元測試 (Vitest with jsdom)
```
- **開發伺服器**: 預設 Vite 運行於 Port 5173。`vite.config.ts` 已將 React 核心與 Recharts/Framer-motion 強制打包在同一 `vendor-ui-core` chunk，防止 `forwardRef` undefined 錯誤。
- **E2E 測試**: Playwright 設定於 Port 5200 (執行 `npx playwright test`)，涵蓋匯入、測驗與完整 RPG 戰鬥流程。
- **測試規範**: 修改 `services/` 或 `hooks/` 後，推送前必須通過單元測試，新邏輯須補上對應測試。

## 🏗️ 專案架構與設計模式

- **核心目錄結構**:
  - `components/`: UI 元件與動畫（Framer Motion）
  - `services/`: 業務邏輯、Supabase、AI、儲存與分析記錄
  - `contexts/`: React Contexts (Auth, Theme)
  - `hooks/`: 8大領域獨立 Hooks (Battle, ChunkedPractice, Achievements, Challenges, Streak, StudyStats, Sound, Keyboard)
  - `types/` & `constants/`: 型別定義與靜態資料（怪物、技能、成就等）
- **Service Layer + Domain Hooks 模式**:
  - 元件嚴禁直接存取儲存或 Supabase。所有 I/O 由 `services/` 處理，狀態與領域邏輯由自訂 `hooks/` 管理。
- **雙重數據持久化與並發**:
  - 訪客模式：資料存於 localStorage (以 `mindspark_` 為前綴)。從 localStorage 載入設定需透過 Type Guards/Schema 檢查防範惡意注入。
  - 登入模式：Question banks 由 Supabase 託管，答題紀錄與間隔重複（SM-2）留於本地。登入自動執行 `syncLocalToCloud()`。
  - 同步機制：導入 `runWithSyncLock` (Web Locks 併發鎖) 保護同步安全；雲端 upsert 引入「預寫 dirty-bank」與成功後 `removeDirtyBank` 機制防止中斷丟失。
  - 分階段練習：session 使用 `mindspark_practice_sessions`，進行中恢復使用 `mindspark_chunk_draft:<sessionId>:<chunkIndex>`，同步使用 LWW (Last-Write-Wins) 策略。
- **RPG 戰鬥與遊戲化機制**:
  - 依答題 streak (5, 10, 20...) 觸發技能與傷害計算。戰鬥狀態保存於 `mindspark_battle_state` (有載入安全範圍守衛，異常即重置)。
- **AI 整合**:
  - [services/ai.ts](file:///c:/Users/user/Desktop/Quiz-app-/services/ai.ts) 提供 PDF 解析與題目生成。支援 strict JSON schema 與出錯自動修復。
- **路徑別名**: `@/*` 對應專案根目錄 `./*`，請優先使用。

## 📝 程式碼規範與安全

- **TypeScript & Import**:
  - 嚴格禁用 `any`，一律使用具體型別或 `unknown` + 型別守衛。
  - 依 Core → Types → Services/Utils → Constants → Components → Hooks/Contexts 順序整理導入。
- **元件結構**:
  - 使用具名導出的函式元件 `React.FC<Props>`。Props 接口定義於元件上方。
- **命名規則**: 元件/檔案使用 PascalCase；變數/函式使用 camelCase；常數使用 SCREAMING_SNAKE_CASE。
- **鍵盤快捷鍵**:
  - [useKeyboardShortcuts.ts](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useKeyboardShortcuts.ts) 統一處理 Enter (送出/下一題)、Space (提示)、Esc (關閉 Modal) 等，以 `handlersRef` 模式將 callbacks 與監聽器解耦，監聽器 dependency 設為空，避免重複綁定。
- **錯誤處理與防禦**:
  - 儲存/雲端呼叫均需用 try-catch 包裹並返回安全預設值。
  - 禁用 `dangerouslySetInnerHTML` 以防止 XSS，所有使用者輸入皆渲染為純文字。
- **效能與記憶體優化**:
  - Framer Motion 的 animation variants 必須提取到元件外部定義，防止重複渲染。
  - 音效播放元件引入 `activeAudioContextsRef` 在 unmount 時強制 close() 釋放，防範記憶體洩漏。
  - 重度過濾與計算使用 `useMemo`/`useCallback`。`App.tsx` + `useQuizEngine.ts` 回調必須使用 `useCallback` 封裝，防止競態條件。

## 📈 Git 提交與記憶協議 (Memory Protocol)

- **Commit 規範**: 使用祈使句開頭（例如 `"Add feature"`, `"Fix bug"`）。
- **Pre-commit 檢查清單**:
  - [ ] `npm run build` 通過
  - [ ] `npm test` 通過
  - [ ] 無 `any` 類型且導入已排序
  - [ ] 無 XSS 漏洞
- **E2E 測試規範**: 因使用自製 `ConfirmDialog` 取代原生對話框，E2E 測試必須改為點擊 Confirm 按鈕，不得使用 `page.on('dialog')` 監聽。
- **專案記憶維護與 MCP 輔助**:
  - 優先使用 `codebase-memory-mcp` (如 `search_graph`, `trace_path` 等) 與專案記憶 MCP (如 `search_memory`, `get_aliases` 等) 快速且精準地獲取檔案與程式碼資訊，防範大範圍 recursive grep 造成 Token 耗費。
  - 任務開始前先閱讀根目錄的 `MEMORY.md`。
  - 重大變更或架構重構後，必須同步更新 `MEMORY.md` 以及 [docs/DEVELOPMENT_LOG.md](file:///c:/Users/user/Desktop/Quiz-app-/docs/DEVELOPMENT_LOG.md)。
  - 完成動作後請以繁體中文向使用者說明，若使用原始人說話風格，只需在最後對話總結時說一次

<!-- >>> project-memory protocol >>> -->
## Memory Refresh Protocol

- This section is additive. Do not rewrite existing `/init` instructions, design system rules, style guidance, or architecture guidance above.
- At task start, read `MEMORY.md` before broad exploration if the file exists.
- If a matching `project-memory` MCP server is available for this repository, use it proactively at task start to inspect `Entry Points`, `Hotspots`, or targeted memory search before broad recursive search.
- If `MEMORY.md` is missing, stale, or the project structure changed, refresh it before continuing.
- At task end, update `MEMORY.md` when you changed architecture, moved files, added new modules, or discovered durable constraints.
- Keep memory project-scoped: do not create `GEMINI.md`, dated memory logs, or duplicate note files unless explicitly requested.
- Prefer one canonical `MEMORY.md` plus nested `AGENTS.md` files for local routing.
- Keep `Aliases & Vocabulary`, `Entry Points`, and `Search Recipes` current so future agents can map user language to the right files quickly.
- If archived reports live under `docs/`, update `docs/INDEX.md` after moving or adding report files.
- If a local memory index is used, keep it under `.memory-index/` inside this project only and never merge it with other projects.
- Never consult another project's `MEMORY.md`, `docs/INDEX.md`, or `.memory-index/` unless the user explicitly asks for cross-project analysis.
- If multiple `project-memory`, `project-memory-*`, or `pm-*` servers are visible, use only the server whose wrapper path or declared root matches this repository. Ignore sibling project servers.
- If `project-memory` MCP wiring is missing for this project, install the local wrapper and project-local MCP config before relying on it.
- Codex: invoke `$project-memory-refresh` when memory needs to be created or refreshed.
- Other agents: follow the same protocol manually by updating the `MEMORY.md` auto-generated map, then curating `Aliases & Vocabulary`, `Entry Points`, `Stable Facts`, `Active Decisions`, `Hotspots`, `Search Recipes`, and `Open Risks`.
<!-- <<< project-memory protocol <<< -->
