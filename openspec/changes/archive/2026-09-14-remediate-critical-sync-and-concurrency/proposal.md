## Why

2026-09-13 深度審計報告（[PONYTAIL_TECH_DEBT_AND_DEEP_AUDIT_2026_09_13.md](file:///c:/Users/user/Desktop/Quiz-app-/docs/reports/PONYTAIL_TECH_DEBT_AND_DEEP_AUDIT_2026_09_13.md)）揭露了 2 個 CRITICAL 級資料同步缺陷、3 個 HIGH 級並發競態漏洞，以及 1 個即將到期的 Ponytail 技術債與數項效能 / UX 防護缺口。這些問題在靜態編譯（`tsc --noEmit` 零錯誤、319 測試全綠）下完全隱匿，僅在運行期極端路徑（斷網重連、連按 Enter、快速切換節點、多分頁並行）觸發，直接威脅用戶資料完整性與測驗成績準確性。由於 Ponytail 別名 `applyDagreLayout` 到期窗口為 2026-10-01，必須在此之前完成清理。

經過「雙軌審查（減法 Ponytail + 加法 Leak-proof）」進一步補強，本計畫排除了無效的微任務解鎖假防禦、冗餘 Ref 與虛構抽象，建立全封閉且最小複雜度的修復方案。

## What Changes

### 🔴 CRITICAL — 資料持久化與同步
- **C1**: 提取 `mapQuestionToDbRow` 統一映射規格；`retryCleanupDirtyBanks` 補上 upsert 重傳邏輯，各 bankId 獨立 try-catch 隔離；增設本地快取缺失防護（若本地快取不存在則保護雲端不被盲刪，直接移出 dirty 標記）；所有 orphan 刪除操作強制鏈式附加 `.eq('bank_id', bankId)` 達成縱深防禦。
- **C2**: `syncLocalPracticeSessions` 升級為 **Chunk 級聯集合併 (Chunk-level Set Union Merge)**：多裝置或離線進度分歧時，聯集合併兩端已完成之 Chunk（非單向暴力覆寫），雙向保留用戶各裝置成果；僅清理合併後已完成 Chunk 之草稿，用戶本地進行中的 active draft 完整保留。

### 🟠 HIGH — 邏輯並發與狀態競態
- **H1**: `useQuizEngine.handleAnswer` 引入 `lastAnsweredQuestionIndexRef` 與 `isProcessingRef` 互斥鎖，廢棄易受反饋等待期穿透的 `queueMicrotask` 假解鎖，在切題（`nextQuestion`）前徹底阻斷對同一題的重複作答，防止連按 Enter 重複加分 / 錯題灌入 / SM-2 雙重評分。
- **H2**: `NodeEditPanel` debounce 善用 React `useEffect` cleanup 閉包天生捕獲的 `nodeId`，並增設 `beforeunload` 監聽，切換節點前、unmount 或關閉分頁時強制 flush pending 更新並清除定時器，不引入多餘的 `prevNodeIdRef`，防止跨節點資料覆寫與關閉遺失。
- **H3**: `runWithSyncLock` LocalStorage fallback 在寫入 token 後增加隨機延遲 (30~70ms) 二次讀取驗證 (Double-check lock)，防止多分頁 TOCTOU 競態。

### 📦 Ponytail 到期債務與即時贏面
- **P1**: 刪除 `applyDagreLayout` 到期相容別名導出，更新測試改測 `applyAutoLayout`。
- **IW-2**: AppContent 內聯 Framer Motion `animationVariants` 外提至 Module Scope。
- **M1**: `useGraphCodeMode` 在語法錯誤時於 Hook 底層（`handleToggleEditMode`）阻斷切換至 Visual 模式，並返回 `canSwitchToVisual: boolean` 標誌供 `GraphToolbar.tsx` 禁用按鈕；修正幽靈組件路徑為真實存在的 `GraphEditor.tsx` 與 `GraphToolbar.tsx`。

## Capabilities

### New Capabilities
_（無新增 Capability）_

### Modified Capabilities
- `cloud-data-integrity`: C1 — `retryCleanupDirtyBanks` 補齊 upsert 重傳、快取缺失防護與 `.eq('bank_id', bankId)` 縱深防禦。
- `client-data-integrity`: H1 — `useQuizEngine.handleAnswer` 引入 index 與處理鎖，切題前阻斷重複作答，確保測驗分數、錯題庫與 SM-2 演算法完整性。
- `sync-concurrency-control`: H3 — LocalStorage fallback 鎖必須加入 double-check 二次驗證防 TOCTOU。
- `practice-session-storage`: C2 — Session 同步採 Chunk 級聯集合併，避免分歧覆蓋資料遺失，精確清理草稿。
- `knowledge-graph-editor`: H2、M1 — NodeEditPanel debounce 閉包與 beforeunload 切換安全 + useGraphCodeMode 底層與 UI 雙重語法錯誤切換阻擋。

## Impact

### 直接修改檔案
| 層級 | 檔案 | 缺陷 ID |
|------|------|---------|
| Service | `services/cloudStorage.ts` | C1, C2, H3 |
| Hook | `hooks/useQuizEngine.ts` | H1 |
| Hook | `hooks/useGraphCodeMode.ts` | M1 |
| Component | `components/KnowledgeGraph/GraphEditor.tsx` | M1 |
| Component | `components/KnowledgeGraph/GraphToolbar.tsx` | M1 |
| Component | `components/KnowledgeGraph/NodeEditPanel.tsx` | H2 |
| Component | `components/AppContent.tsx` | IW-2 |
| Utility | `components/KnowledgeGraph/graphUtils.ts` | P1 |
| Test | `src/__tests__/radialLayout.test.ts` | P1 |

### 間接消費驗證
- `hooks/useChunkedPractice.ts` — 消費 C2 修改的 Session 同步結果
- `App.tsx` / `useKeyboardShortcuts.ts` — 消費 H1 的 `handleAnswer` 回調

### 無破壞性變更
- 不變更 localStorage key 格式（`mindspark_*`）
- 不變更 Supabase table schema
- 不引入新依賴
