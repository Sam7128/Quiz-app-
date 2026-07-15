<!-- 知識圖 v2 升級 — 最終審計缺陷報告 -->
# 審計缺陷報告：knowledge-graph-v2-upgrade

日期：2026-07-13

摘要：本報告彙整對 `knowledge-graph-v2-upgrade` 變更的最終審計結果（Completeness / Correctness / Coherence），依嚴重性分類列出 CRITICAL、WARNING 與 SUGGESTION，並給出優先處理建議。

## CRITICAL（必須立即處理）

- Schema 未升級 / 欄位遺漏：
  - 問題：`types/graphTypes.ts` 仍使用 SCHEMA_VERSION = 2，`GraphDocument` 未包含 OpenSpec 要求的 `backgroundOpacity`、`layoutMode`、`theme` 等 v3 欄位，造成 migration 與向前相容流程不一致。
  - 影響檔案：[types/graphTypes.ts](types/graphTypes.ts)
  - 建議：同步更新型別、把 `GRAPH_LIMITS.SCHEMA_VERSION` 設為 `3`，並在 `graphStorage` 加入 v2→v3 自動遷移測試，立即執行 `npx tsc --noEmit` 與相關單元測試。

- 未完成的任務（檔案拆分 / 行數目標未達）：
  - 問題：OpenSpec 要求將 `GraphEditor` 精簡並建立獨立 `DropNodeMenu.tsx`，但目前 `components/KnowledgeGraph/GraphEditor.tsx` 仍包含 inline DropNodeMenu 與大量邏輯，未見 `DropNodeMenu.tsx` 檔案，且 Editor 未縮至 ≤300 行。
  - 影響檔案：[components/KnowledgeGraph/GraphEditor.tsx](components/KnowledgeGraph/GraphEditor.tsx)
  - 建議：提取 `DropNodeMenu` 為獨立元件並將邏輯委派給 Hook，或在 spec 中記錄有意保留之設計例外。

- Tasks 與實作不一致：
  - 問題：多處 `tasks.md` 被標示為已完成，但檔案內容顯示仍有規格不一致（如 schema version、特定檔案拆分）。
  - 建議：在 CI 重新執行 `npx tsc --noEmit`、`npm run build`、`npm test`，以未通過項目回退 tasks 標記為未完成並修正。

## WARNING（設計偏差 / 需評估）

- 保留 dagre 使用（設計矛盾）：
  - 問題：`components/KnowledgeGraph/graphUtils.ts` 引入 `@dagrejs/dagre`（`applyDagreLayout`），但 OpenSpec D8 明確不引入 dagre。此為設計與實作的偏差。
  - 建議：決定是否移除 dagre；若移除，改用 `radialLayout`；若保留，更新設計文檔說明例外理由。

- 錯誤碼 enum 與 Spec 差異：
  - 問題：`GraphErrorCode` 在程式碼與 OpenSpec tasks 列表之命名/項目略有差異，可能造成 `translateGraphError` 與測試不一致。
  - 建議：統一 enum 名稱（spec ↔ types ↔ tests），並補測試。

- Image URL 驗證時機：
  - 問題：`NodeEditPanel` 在使用者貼上 URL 時即寫入 state，但更嚴格的協議檢查（僅允許 http/https）是在 `saveGraph` 時檢核，會產生 UI 上的暫存無效值行為，與 spec 要求「貼入時即檢核且不寫入無效值」不符。
  - 影響檔案：[components/KnowledgeGraph/NodeEditPanel.tsx](components/KnowledgeGraph/NodeEditPanel.tsx)
  - 建議：在面板層即時驗證 URL 協議並給予使用者錯誤提示，僅在驗證通過時寫入 `imageUrl`。

## SUGGESTIONS（可提升或改善）

- 擴充 Heuristic 測試：`runHeuristicNodeMatching` 與 Levenshtein 相似匹配邏輯複雜，建議新增更多單元測試覆蓋重命名級聯、重複路徑與極端情形，並評估其效能與邊界行為。

- 在 `NodeEditPanel` 增加即時 UX 錯誤提示，避免使用者把無效 URL 儲存到 local state。

- 在 CI 中加入 `npx -y knip --reporter compact`（dead-code 掃描）並把結果納入 PR gate（OpenSpec tasks 要求）。

## ponytail-debt 結果

- repo 中未發現 `ponytail:` 註記。結果：`No ponytail: debt. Clean ledger.`

## 優先處理建議（行動清單）

1. 更新 `types/graphTypes.ts` 為 schema v3，新增欄位並同步 `GRAPH_LIMITS.SCHEMA_VERSION`。
2. 提取 `DropNodeMenu` 為 `components/KnowledgeGraph/DropNodeMenu.tsx`，或在變更文檔記錄保留 inline 的設計理由。
3. 在 `NodeEditPanel` 加入即時 image URL 協議驗證，避免寫入無效 URL。
4. 決定是否移除 `dagre`，若移除則刪除 `applyDagreLayout` 的使用點並以 radial 作為唯一自動佈局。
5. 在 CI 執行完整驗證流程：`npx tsc --noEmit`、`npm run build`、`npm test`、`npx -y knip --reporter compact`。

---
報告由審計 AI 於 2026-07-13 產出；若需我直接套用其中某項修正（例如升級 schema 或提取 DropNodeMenu），請回覆要我先執行的具體項目。
