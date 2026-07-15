---
name: project-memory-refresh
description: >
  為 Coding Agent 提供專案內部的局部記憶 MCP 服務。支援三種使用場景：
  (1) 在全新專案中一鍵建立記憶 MCP；
  (2) 在既有舊專案中升級至最新版（移除硬編碼路徑、修復搜尋評分、支援 CJK）；
  (3) 日常刷新——當 MEMORY.md 或專案結構變更後重建搜尋索引。
---

# Project Memory Refresh

此技能為 Coding Agent 提供專案內部的局部記憶檢索與同步功能，透過本地 MCP 伺服器暴露
`search_memory`、`get_entry_points`、`get_hotspots`、`get_aliases`、`get_memory_health`
等工具，讓 Agent 在任務開始時能快速定位專案脈絡，而不需要遞迴掃描整個目錄樹。

---

## 📋 使用場景

### 場景 A — 全新專案：一鍵安裝記憶 MCP

在一個**從未設定過**記憶 MCP 的專案根目錄執行：

```powershell
# 在專案根目錄
python .agents\skills\project-memory-refresh\scripts\refresh_project_memory_bundle.py --root .
```

這個指令會依序完成：
1. 整理根目錄散落的報告檔案至 `docs/`
2. 建立或更新 `MEMORY.md` 的 Auto-Generated Memory Map
3. 在 `AGENTS.md` 中注入記憶協定區塊（Memory Refresh Protocol）
4. **建立 `.project-memory/project_memory_mcp_entry.py` wrapper**（不含任何硬編碼路徑）
5. **寫入 MCP 設定**至 `.gemini/settings.json`、`.cursor/mcp.json`、`.mcp.json`、`.codex/config.toml`、全域 Antigravity `mcp_config.json`
6. 建立 `.memory-index/index.json` 搜尋索引（含 `file_hashes` 與 UTC `built_at`）
7. 驗證 MCP 查詢正常運作

> **新專案注意**：需先有 `MEMORY.md` 或至少一個 `AGENTS.md` 讓索引有內容可建。
> 若專案完全空白，可先手動建立一個最簡版 `MEMORY.md`，再執行上述指令。

---

### 場景 B — 舊專案升級：重建 Wrapper 並修復 MCP 品質

若您的專案已有舊版記憶 MCP，但：
- Wrapper（`.project-memory/project_memory_mcp_entry.py`）含有硬編碼的本機路徑
- 搜尋結果有評分污染（隨機查詢回傳假結果）
- 不支援中文搜尋
- `get_memory_health` 沒有 `quality_checks` 欄位

**只需在舊專案根目錄重跑相同指令**（冪等，安全重跑）：

```powershell
# 切換至目標舊專案的根目錄，或直接指定路徑
python <skill-scripts-path>\refresh_project_memory_bundle.py --root <舊專案路徑>
```

例如，若 skill 已安裝在 `C:\Users\user\skill manager`：
```powershell
python "C:\Users\user\skill manager\.agents\skills\project-memory-refresh\scripts\refresh_project_memory_bundle.py" --root "C:\Users\user\my-old-project"
```

`ensure_project_mcp_configs.py` 會自動：
- 偵測 wrapper 是否過時並寫入新版（不含硬編碼路徑）
- 更新所有 MCP 工具設定（若已是最新則跳過）
- 重建 `.memory-index/index.json`（修復評分與 CJK）

若只需升級 wrapper 與 MCP 設定，不需完整重建索引：
```powershell
python <skill-scripts-path>\ensure_project_mcp_configs.py --root <舊專案路徑>
```

---

### 場景 C — 日常刷新：MEMORY.md 變更後更新索引

當 `MEMORY.md` 或被索引的 Markdown 檔案內容變更時，MCP 伺服器會在下次搜尋前
**自動偵測並重建索引**（透過 SHA-256 file_hashes 比對）。

若需要**手動強制重建**：
```powershell
python .agents\skills\project-memory-refresh\scripts\build_project_memory_index.py --root . --write
```

若需要完整刷新（整理報告、更新 Memory Map、重建索引）：
```powershell
python .agents\skills\project-memory-refresh\scripts\refresh_project_memory_bundle.py --root .
```

---

## ✅ 本版技能保證（v3 — bounded MCP availability）

| 能力 | 狀態 |
|------|------|
| 隨機查詢返回 0 筆結果（無評分污染） | ✅ 修復 |
| 中文（CJK）字元可搜尋 | ✅ 支援 |
| 英文單詞邊界匹配（`git` 不匹配 `digital`） | ✅ 修復 |
| Markdown code block 內的 `# comment` 不誤判為標題 | ✅ 修復 |
| Wrapper 不含硬編碼本機路徑（環境可攜） | ✅ 修復 |
| 索引寫入使用原子替換（防止中斷損壞） | ✅ 修復 |
| 索引含 `file_hashes` + UTC `built_at` | ✅ 新增 |
| 自動偵測檔案變更並重建索引 | ✅ 新增 |
| `get_memory_health` 含 5 項 `quality_checks` | ✅ 新增 |
| 雙 MCP 健康檢查與可用性報告 (codebase-memory-mcp 整合) | ✅ 支援 |
| Windows 非同步進程冷啟動 DOS 限流保護與 taskkill 清理 | ✅ 新增 |
| 外部 graph 使用 `cli <tool> <json>`，且不繼承 project-memory stdin | ✅ 修復 |
| 外部 graph 單次探測預設 5 秒 timeout，健康結果快取 30 秒 | ✅ 新增 |
| 健康檢查分列 wrapper、local index、external graph 狀態 | ✅ 新增 |
| 索引刷新失敗時自動 fallback 到最後一份 `.memory-index/index.json` | ✅ 新增 |
| Codex MCP 啟動/工具 timeout（10 秒/15 秒） | ✅ 新增 |

---

## 前提條件

- Python 3.8+
- 已安裝 `mcp` / `fastmcp` 套件：
  ```powershell
  pip install mcp fastmcp
  ```

---

## MCP 伺服器工具清單

| 工具 | 說明 |
|------|------|
| `search_memory` | 全文搜尋索引（支援中英文、評分排序） |
| `get_entry_points` | 取得專案入口模組列表 |
| `get_hotspots` | 取得高頻修改的熱點檔案 |
| `get_aliases` | 取得詞彙對照表（Aliases & Vocabulary） |
| `get_source_of_truth` | 取得關鍵資料來源說明 |
| `get_search_recipes` | 取得搜尋配方與常見查詢路徑 |
| `get_memory_health` | 健康檢查，含 codebase-memory-mcp 可用性與索引新鮮度、品質檢測及警告 |
| `summarize_index_health` | 回傳格式化後的健康狀態摘要字串 |
| `rebuild_project_memory_cache` | 強制重建索引 |

---

## 注意事項

- 在 **同一 Volume** 的 Windows 環境下，索引寫入使用 `os.replace()` 原子替換，防止中斷留下損壞的 `index.json`。
- 動態 UUID smoke test 防止技能文件本身被索引後造成健康檢查自我命中。
- `ensure_project_mcp_configs.py` 是**冪等**的：重跑不會破壞已正確設定的 MCP，只會更新過時的 wrapper 或缺少的工具設定。
- 多個專案可各自有獨立的記憶 MCP 伺服器，Antigravity 的命名規則為 `pm-<slug>-<hash8>`，確保 Agent 只使用對應專案的伺服器。

---

## 雙 MCP 工具路由與健康檢查

- **健康檢查 (`get_memory_health` / `summarize_index_health`)**：
  - 整合 `codebase-memory-mcp` (AST) 與 `project-memory-mcp` (High-Level)。
  - `codebase_graph_status` 欄位報告外部圖譜的可用性 (`available`) 及索引狀態 (`is_stale`)。
  - 新增 `bridge_consistent` 品質檢測，若外部可用但專案未索引，將自動警示。
  - 具備預設 30 秒健康結果快取，避免高頻調用壓垮 CPU；且在 Windows 下採用非同步 subprocess 執行，並提供超時殘留進程樹 taskkill 清理防護。
  - 回傳 `wrapper_status`、`local_index_status`、`codebase_graph_status` 與整體 `status`；外部 graph 不可用時回傳 `degraded`，不阻塞本地索引查詢。
  - 外部 CLI timeout 可用 `PROJECT_MEMORY_EXTERNAL_TIMEOUT_SECONDS` 調整（預設 5 秒），健康快取可用 `PROJECT_MEMORY_HEALTH_CACHE_SECONDS` 調整（預設 30 秒）。
- **降級搜尋 (`search_memory`)**：
  - 索引自動刷新失敗時讀取最後一份可解析的 `.memory-index/index.json`，並回傳 `fallback_used: true` 與 `status: degraded`。
  - 若最後一份索引也不可用，立即回傳 `status: server_unavailable` 與明確警告，不等待背景程序。
- **工具路由指引**：
  - 對於低階 AST 分析、調用鏈與影響範圍分析，應直接使用 `codebase-memory-mcp` 原生工具（如 `search_graph`、`trace_path`）。
  - 對於專案高階手則、入口與熱點分析，使用 `project-memory-mcp` 工具（如 `search_memory`、`get_entry_points`、`get_hotspots`）。
