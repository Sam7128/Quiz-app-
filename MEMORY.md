# MEMORY.md

## Purpose Snapshot
- [FACT-001] `Quiz-app--main/`: MindSpark 是一個以 React + TypeScript + Vite 建構的測驗學習應用，核心包含題庫管理、測驗流程、AI 輔助、雲端同步與遊戲化學習。
- [FACT-002] 主要 runtime 是前端單頁應用；持久化同時依賴 `localStorage` 與 Supabase，並以 service layer + domain hooks 分離 I/O 與業務邏輯。

## Source of Truth
- [PATH-001] `AGENTS.md`: project rules and routing.
- [PATH-002] `types.ts`: 核心題目、題庫、設定與應用狀態型別。
- [PATH-003] `App.tsx`: app shell 與主流程掛載入口。
- [PATH-004] `services/`: storage、cloud、AI、analytics 與 graph 相關 I/O 邏輯。
- [PATH-005] `hooks/`: battle、study、challenge 等領域 hook。
- [PATH-006] `docs/DEVELOPMENT_LOG.md`: 重大變更歷史。
- [PATH-007] `openspec/`: 規格、變更提案與 archived change 歷史。
- [PATH-008] `start-dev.bat`: 快速啟動 Vite 開發伺服器、自動處理 Port 衝突與開啟瀏覽器的 Windows 批次腳本。
- [PATH-009] `package.json`: npm scripts、Vercel build entry 與前端依賴版本來源。

## Aliases & Vocabulary
- [ALIAS-001] 「題庫管理」「bank manager」-> `components/BankManager.tsx`, `services/storage.ts`, `services/cloudStorage.ts`
- [ALIAS-002] 「測驗引擎」「quiz flow」-> `components/QuizCard.tsx`, `hooks/useQuizEngine.ts`, `reducers/appReducer.ts`
- [ALIAS-003] 「遊戲模式」「battle」-> `hooks/useBattleSystem.ts`, `components/BattleArena.tsx`, `types/battleTypes.ts`
- [ALIAS-004] 「知識圖」「knowledge graph」-> `components/KnowledgeGraph/`, `services/graphStorage.ts`, `types/graphTypes.ts`
- [ALIAS-005] 「雲端同步」「Supabase」-> `contexts/AuthContext.tsx`, `services/cloudStorage.ts`, `services/supabase.ts`
- [ALIAS-006] 「專案記憶」「project memory」-> `MEMORY.md`, `.project-memory/project_memory_mcp_entry.py`, `.memory-index/index.json`
- [ALIAS-007] 「題目身份」「question identity」-> `utils/questionIdentity.ts`, `components/BankManager.tsx`, `services/cloudStorage.ts`
- [ALIAS-008] 「分階段練習」「chunked practice」-> `hooks/useChunkedPractice.ts`, `components/ChunkedPracticePanel.tsx`, `services/cloudStorage.ts`
- [ALIAS-009] 「practice_sessions」-> `docs/migrations/PRACTICE_SESSIONS_MIGRATION.sql`, `services/cloudStorage.ts`, `services/repository.ts`

## Entry Points
- [ENTRY-001] `AGENTS.md`: 先讀鐵規、模組索引、資料安全與文件維護要求。
- [ENTRY-002] `App.tsx`: 確認 view flow、provider 組裝與 reducer 接線。
- [ENTRY-003] `types.ts`: 先鎖定資料模型，符合 TYPE_FIRST 規則。
- [ENTRY-004] `services/storage.ts`: 檢查 `mindspark_*` key、guest mode 持久化與資料安全界線。
- [ENTRY-005] `services/cloudStorage.ts`: 檢查登入後同步與 Supabase 邊界。
- [ENTRY-006] `hooks/useBattleSystem.ts`: 遊戲化互動與持久化的主要熱區。

<!-- BEGIN AUTO-GENERATED: MEMORY MAP -->
## Auto-Generated Memory Map
- Refreshed: `2026-06-12 16:17`
- Project root: `C:\Users\user\Desktop\Quiz-app--main`

### Key Files
- [PATH-001] `AGENTS.md`
- [PATH-002] `MEMORY.md`
- [PATH-003] `README.md`
- [PATH-004] `CHECKLIST.md`
- [PATH-005] `package.json`
- [PATH-006] `tsconfig.json`
- [PATH-007] `docs/INDEX.md`
- [PATH-008] `App.tsx`
- [PATH-009] `dashboard.png`
- [PATH-010] `eslint.config.js`

### Module Index
| ID | Path | Local AGENTS | Purpose | Tags |
|---|---|---|---|---|
| MOD-001 | `components/` | yes | ui components | components |
| MOD-002 | `constants/` | yes | static definitions and domain data | constants |
| MOD-003 | `contexts/` | yes | shared context and state boundaries | contexts |
| MOD-004 | `docs/` | no | project documentation | docs |
| MOD-005 | `e2e/` | yes | end-to-end tests | e2e |
| MOD-006 | `hooks/` | yes | feature hooks and orchestration | hooks |
| MOD-007 | `openspec/` | yes | change planning and specs | openspec |
| MOD-008 | `public/` | no | static assets | public |
| MOD-009 | `reducers/` | no | important project module | reducers |
| MOD-010 | `services/` | yes | service and integration logic | services |
| MOD-011 | `src/` | no | primary source implementation | src |
| MOD-012 | `types/` | no | shared type definitions | types |

### OpenSpec Snapshot
- Main specs: `openspec/specs/`
- Active changes: none detected.
- Archived changes: `20`
- [OS-ARC-001] `openspec/changes/archive/2026-06-09-security-audit-remediation/` (proposal, design, tasks, specs:7)
- [OS-ARC-002] `openspec/changes/archive/2026-06-12-dead-code-cleanup/` (proposal, design, tasks, specs:1)
- [OS-ARC-003] `openspec/changes/archive/enhance-quiz-experience/` (proposal, design, tasks, specs:2)
- [OS-ARC-004] `openspec/changes/archive/quiz-ux-enhancement/` (proposal, tasks)
- [OS-ARC-005] `openspec/changes/archive/supabase-cloud-sync/` (proposal, tasks)

### Nested AGENTS
- [AG-001] `components/AGENTS.md`
- [AG-002] `constants/AGENTS.md`
- [AG-003] `contexts/AGENTS.md`
- [AG-004] `e2e/AGENTS.md`
- [AG-005] `hooks/AGENTS.md`
- [AG-006] `openspec/AGENTS.md`
- [AG-007] `services/AGENTS.md`
- [AG-008] `src/__tests__/AGENTS.md`
<!-- END AUTO-GENERATED: MEMORY MAP -->

## Stable Facts
- [FACT-010] `services/storage.ts`: 所有本地持久化 key 皆以 `mindspark_` 為前綴，清理或遷移時要遵守資料安全規則。
- [FACT-011] `contexts/AuthContext.tsx` + `services/cloudStorage.ts`: 題庫可上雲，但學習行為資料仍大量保留在 localStorage 作裝置級追蹤。
- [FACT-012] `components/KnowledgeGraph/` + `services/graphStorage.ts`: 知識圖工作區已存在且有測試覆蓋，不是草稿目錄。
- [FACT-013] `.project-memory/project_memory_mcp_entry.py`: 此 repo 已有 project-local MCP wrapper，可直接提供 `search_memory`、`get_aliases` 等工具。
- [FACT-014] `Question.id` 現在視為內部穩定 ID；外部匯入來源以 `sourceQuestionKey` / `sourceFingerprint` 協助合併與去重。
- [FACT-015] `components/BankManager.tsx` 已具備單題編輯/刪除 UI，刪題會清理錯題、SM-2、最近錯題與 quiz session 殘留資料。
- [FACT-016] `components/BankManager.tsx` 在 JSON / AI 匯入前會顯示匯入摘要，明確列出原始題數、重複合併數與實際可匯入題數。
- [FACT-017] `components/BankManager.tsx` 現在支援三種匯入模式：`append` 只新增全新題目、`merge` 更新同來源題目並新增新題、`replace` 以匯入內容覆蓋整個題庫；預設為 `append`。
- [FACT-018] 分階段練習 session 使用 `mindspark_practice_sessions`；進行中恢復使用 `mindspark_chunk_draft:<sessionId>:<chunkIndex>`，且 chunked 模式不寫入 `mindspark_quiz_session`。
- [FACT-019] `syncLocalPracticeSessions` 採 `updated_at` LWW，同步失敗會保留 dirty local fallback 以供後續重試。
- [FACT-020] `App.tsx` + `useQuizEngine.ts`: 回調函數（如 `onChunkDraftUpdate`、`onChunkComplete`）必須使用 `useCallback` 封裝，避免在 React 渲染時因為引用變更引發與 `useQuizEngine` 異步載入題庫之間的競態條件，此規則已被 hotfix 完美證實。
- [FACT-021] `CloudStorageRepository.savePracticeSession` 雲端保存成功後只能移除本地 session cache，不能清除 `mindspark_chunk_draft:*`；使用 `removePracticeSessionCache()`，避免登入狀態下刷新後續答回到第一題。
- [FACT-022] Vercel build 的真正風險是遠端 Git 若追蹤 `node_modules/` 或 Windows 保留檔名（如 `nul`），會造成 Linux 部署依賴樹殘缺或 shim 權限錯誤；`package.json` 應維持標準 `vite build`，並確保依賴由 Vercel fresh install 產生。
- [FACT-023] `services/storage.ts`: 引入了防禦性 AI Config 驗證與 Zustand 狀態防禦，確保從 `localStorage` 載入設定時，通過 Type Guards 與 schema 檢查防止惡意 payload 注入。
- [FACT-024] `services/cloudStorage.ts`: 練習階段 (Practice Sessions) 同步中，修正了 Cloud-only sessions 寫回邏輯。登入後當本地無資料但雲端有紀錄時，會安全地將雲端 session 寫回本地，避免被空資料覆蓋。
- [FACT-025] `utils/integrityCheck.ts`: HMAC-SHA256 簽名改為無狀態動態派生，不依賴 localStorage 中的明文 salt，杜絕金鑰洩露威脅。
- [FACT-026] `hooks/useBattleSystem.ts`: 載入存檔時已整合 `isBattleState` 安全與範圍守衛，若格式或數值不符即重置，防範注入惡意數據或作弊。
- [FACT-027] `docs/sql/submit_challenge_score.sql`: 聯賽分數提交 SQL RPC 強制於資料庫端結算完賽狀態，且雙方皆有分數時自動判定並記錄 `winner_id`。
- [FACT-028] `dead-code` 分析在本 repo 可直接改用 `npx -y knip --reporter compact --no-progress`；目前環境沒有 `tldr` 指令可用。
- [FACT-029] `openspec/specs/code-hygiene/spec.md`: 定義了專案的代碼潔淨度 (Code Hygiene) 規範，包含死碼物理刪除、導出作用域收窄、依賴清理與重複導出 (export default) 的清理標準。

## Active Decisions
- [DEC-001] `AGENTS.md`: 採用 `AGENTS.md` 承載規則、`MEMORY.md` 承載動態事實，repo-local `GEMINI.md` 不再維護。
- [DEC-002] `services/` + `hooks/`: 元件不直接碰 storage / Supabase，I/O 維持集中於 service layer。
- [DEC-003] `.codex/config.toml` + `.project-memory/project_memory_mcp_entry.py`: 本專案改用 project-local MCP wrapper，避免只依賴全域 `project-memory-auto`。
- [DEC-004] `vite.config.ts`: 將 React 核心與 Recharts/Framer-motion 強制打包在同一 `vendor-ui-core` chunk，解決生產環境下因拆分導致的 `forwardRef` undefined 錯誤。
- [DEC-005] `package.json`: 部署 build 入口維持標準 `vite build`；跨平台 shim 權限問題應從 Git 依賴衛生修正，不能提交 `node_modules/`。
- [DEC-006] Storage 與 Config 安全：全面禁止在 Storage 讀取與 JSON 解析中使用 `any`，必須使用 `unknown` 加上特定的 Type Guard 進行防禦式屬性驗證與合併。
- [DEC-007] E2E 測試對齊：由於自製 React `ConfirmDialog` 取代了原生對話框，所有 E2E 測試皆改用點擊 Confirm 鈕而非 `page.on('dialog')`，以防範黑紗遮罩阻擋所致的超時死鎖。

## Hotspots
- [HOT-001] `App.tsx` & `vite.config.ts`: 全域流程、Provider 接線與生產環境打包配置，任何大型 UI 功能更新都需注意 Chunk 拆分相容性。
- [HOT-002] `services/storage.ts` / `services/cloudStorage.ts`: 任何資料模型變更都可能影響相容性與使用者資料完整性。
- [HOT-003] `hooks/useBattleSystem.ts`: 遊戲化狀態複雜且與 UI、持久化、測驗結果交錯。
- [HOT-004] `services/graphStorage.ts` + `components/KnowledgeGraph/`: 新近功能區，仍在演化，改動容易打到測試與資料結構。
- [HOT-005] `utils/questionIdentity.ts` + `components/BankManager.tsx`: 題目匯入、覆蓋與手動修正流程的核心熱區，影響題目穩定識別與學習紀錄是否斷鏈。
- [HOT-006] `hooks/useChunkedPractice.ts` + `hooks/useQuizEngine.ts`: chunked session 與 quiz flow 的交界，容易出現 restore/完成回調與持久化時序問題。
- [HOT-007] `services/cloudStorage.ts` + `services/storage.ts`: practice session 的 LWW/dirty/retry 與 guest retention 都在此，任何變更都要驗證資料完整性。
- [HOT-008] `.gitignore` + Git index hygiene: Vercel 曾因遠端追蹤 `node_modules/` 造成 `.bin/vite` 權限失敗與 `vite/dist/node/cli.js` 缺檔；部署修復時先查 `git ls-tree -r origin/main node_modules`。
- [HOT-009] `services/storage.ts` + `services/cloudStorage.ts`: 安全與同步強化引入了嚴格的資料驗證。修改此處的儲存格式需特別注意升級時的資料還原相容性。


## Search Recipes
- [RG-001] `rg -n "mindspark_" services hooks components`: 找所有持久化 key 與資料流入口。
- [RG-002] `rg -n "useBattleSystem|battle" hooks components types`: 找遊戲模式狀態與 UI 接線。
- [RG-003] `rg -n "graph|KnowledgeGraph|mermaid" components services src/__tests__ types`: 找知識圖功能與測試。
- [RG-004] `rg -n "Supabase|cloudStorage|syncLocalToCloud" contexts services`: 找登入同步與雲端行為。
- [RG-005] `rg -n "sourceQuestionKey|sourceFingerprint|mergeImportedQuestions" components services utils src/__tests__`: 找題目身份與匯入合併實作。
- [RG-006] `rg -n "planQuestionImport|importMode|匯入前檢查" components utils src/__tests__`: 找匯入模式、摘要提示與測試。
- [RG-007] `rg -n "useChunkedPractice|chunkMeta|mindspark_practice_sessions|syncLocalPracticeSessions" App.tsx hooks services components src/__tests__`: 找分階段練習主流程與同步點。
- [RG-008] `rg -n "\"build\"|vite|Vercel|Permission denied" package.json vercel.json docs CHECKLIST.md MEMORY.md`: 找部署 build 腳本與 Vercel 權限問題紀錄。
- [RG-009] `npx -y knip --reporter compact --no-progress`: 重跑 dead-code / unused export / unused dependency 掃描。

## Archive Index
- [DOC-001] `docs/INDEX.md`: 已整理 reports、archive、migrations 與 root docs 索引，查歷史輸出先看這裡。

## Open Risks
- [RISK-001] `docs/DEVELOPMENT_LOG.md`: 現有檔案曾被半自動 patch，格式有殘留 `+` 字元，後續需再做一次整體清理。
- [RISK-002] `vite.config.ts` 的 `manualChunks` 若過於破碎會引發 Recharts 載入失敗；雖然已修復，但後續新增大型依賴時需再次驗證 Production Build。
- [RISK-003] `ensure_project_mcp_configs.py` 預設會碰 `%USERPROFILE%\\.gemini\\antigravity\\mcp_config.json`，在受限環境下可能因權限失敗，但不影響 repo-local Codex/Gemini/Cursor 設定。

## Next Refresh Triggers
- Rename or move a major directory.
- Add or remove nested `AGENTS.md` files.
- Change architecture, persistence, or integration boundaries.
