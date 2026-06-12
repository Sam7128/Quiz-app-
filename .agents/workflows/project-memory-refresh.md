---
description: >
  重新整理與刷新專案記憶 MCP。支援三種場景：
  (A) 全新專案一鍵安裝記憶 MCP；
  (B) 既有舊專案升級至最新版（移除硬編碼路徑、修復搜尋品質）；
  (C) 日常刷新——MEMORY.md 或專案結構變更後重建索引。
---

# Project-Memory-Refresh 專案記憶安裝與刷新指令

此工作流程透過執行 Python 腳本，在目標專案中安裝、升級或日常刷新記憶 MCP 服務，
確保 AI 助手在後續開發中有最新、可靠的專案脈絡。

---

## 步驟 1 — 判斷使用場景

根據目標專案的現況，選擇對應分支：

| 情況 | 場景 |
|------|------|
| 專案從未有過記憶 MCP（無 `.project-memory/` 目錄） | **→ 場景 A：全新安裝** |
| 專案有舊版 MCP，但 wrapper 含硬編碼路徑 / 搜尋有問題 | **→ 場景 B：升級舊專案** |
| 技能已安裝且正常，僅需更新索引 | **→ 場景 C：日常刷新** |

---

## 場景 A — 全新專案：一鍵安裝

### 前提
- Python 3.8+ 且已安裝 `mcp` / `fastmcp`：`pip install mcp fastmcp`
- 技能已部署至 `.agents/skills/project-memory-refresh/`（或全域 `~/.agents/...`）
- 專案根目錄已有 `MEMORY.md` 或 `AGENTS.md`（有內容可建索引）

### 執行

```powershell
# 在專案根目錄執行
python .agents\skills\project-memory-refresh\scripts\refresh_project_memory_bundle.py --root "."
```

若 skill 在全域位置（`~/.agents/...`），指定完整路徑：
```powershell
python "$env:USERPROFILE\.agents\skills\project-memory-refresh\scripts\refresh_project_memory_bundle.py" --root "."
```

### 這個指令會依序做什麼

1. 整理根目錄散落的報告檔案至 `docs/reports/`、`docs/checkpoints/`
2. 建立或更新 `MEMORY.md` 的 `## Auto-Generated Memory Map` 區塊
3. 在 `AGENTS.md` 注入 Memory Refresh Protocol（區塊式，可重跑）
4. **建立 `.project-memory/project_memory_mcp_entry.py`**（wrapper，不含硬編碼路徑）
5. **寫入各 IDE 的 MCP 設定**：
   - `.gemini/settings.json`（Gemini/Antigravity CLI）
   - `.cursor/mcp.json`（Cursor）
   - `.mcp.json`（通用）
   - `.codex/config.toml`（Codex）
   - `~/.gemini/antigravity-ide/mcp_config.json`（Antigravity IDE 全域）
6. 建立 `.memory-index/index.json`（含 `file_hashes` 與 UTC `built_at`）
7. 執行 verify 查詢確認 MCP 正常

### 成功確認

執行結束後應看到：
```
=== Refreshing . ===
Updated AGENTS.md
Wrapper ready: ...\.project-memory\project_memory_mcp_entry.py
Gemini MCP/context already present: ... (或 Installed Gemini ...)
Installed Antigravity MCP: ... (pm-<slug>-<hash8>)
Index built: N entries
Verify OK
```

**重啟 IDE / Agent 工具後**，即可使用 `search_memory`、`get_entry_points` 等 MCP 工具。

---

## 場景 B — 舊專案升級

### 適用情況
- Wrapper（`.project-memory/project_memory_mcp_entry.py`）含有類似 `C:\Users\user\skill manager` 的硬編碼路徑
- 搜尋結果有評分污染（隨機無關查詢回傳假結果）
- 不支援中文（CJK）搜尋
- `get_memory_health` 沒有 `quality_checks` 欄位

### 執行（指定舊專案路徑）

```powershell
# 從 skill manager 執行，指向要升級的舊專案
python ".agents\skills\project-memory-refresh\scripts\refresh_project_memory_bundle.py" --root "C:\path\to\old-project"
```

或只升級 wrapper 與 MCP 設定（不重建記憶地圖）：
```powershell
python ".agents\skills\project-memory-refresh\scripts\ensure_project_mcp_configs.py" --root "C:\path\to\old-project"
```

### 升級效果

| 問題 | 升級後 |
|------|--------|
| Wrapper 含硬編碼路徑 | ✅ 自動覆寫為新版（動態路徑解析） |
| 搜尋評分污染 | ✅ 重建索引即修復 |
| 中文搜尋無結果 | ✅ 重建索引即修復 |
| `quality_checks` 欄位缺失 | ✅ 新版 `get_memory_health` 即包含 |
| `file_hashes` / UTC `built_at` 缺失 | ✅ 重建索引即修復 |

> **注意**：`ensure_project_mcp_configs.py` 是冪等的。若設定已是最新版，會印出
> `Wrapper ready` 與 `already present` 而非重新安裝，安全重跑。

### 多個舊專案批次升級

```powershell
python ".agents\skills\project-memory-refresh\scripts\ensure_project_mcp_configs.py" `
  --root "C:\path\to\project-A" `
  --root "C:\path\to\project-B" `
  --root "C:\path\to\project-C"
```

---

## 場景 C — 日常刷新

當 `MEMORY.md` 或被索引的 Markdown 檔案有變更時：

- **自動模式**：MCP 伺服器在下次任何工具呼叫前，會透過 `file_hashes` 比對自動偵測變更並觸發重建，無需手動干預。

- **手動強制重建索引**（在目標專案根目錄執行）：
  ```powershell
  python .agents\skills\project-memory-refresh\scripts\build_project_memory_index.py --root . --write
  ```

- **完整刷新**（整理報告 + 更新 Memory Map + 重建索引）：
  ```powershell
  python .agents\skills\project-memory-refresh\scripts\refresh_project_memory_bundle.py --root .
  ```

---

## 步驟 2 — 確認執行結果

無論哪個場景，完成後請確認：

1. **`.project-memory/project_memory_mcp_entry.py`** 存在，且內容不含任何 `C:\Users\...` 硬編碼路徑
2. **`.memory-index/index.json`** 存在，且含有 `"file_hashes"` 與帶時區的 `"built_at"` 欄位
3. **MCP 設定**已寫入（`.gemini/settings.json` 含 `"project-memory"` 區塊）
4. 執行健康檢查：`get_memory_health` 回傳 `quality_checks` 全部為 `true`、`warnings` 為空

---

## 步驟 3 — 回報與總結

向使用者回報：
- 場景（新安裝 / 升級 / 刷新）
- 目標專案路徑
- 索引建立的 entry 數量（從輸出的 `Index built: N entries` 讀取）
- MCP 伺服器名稱（Antigravity 格式：`pm-<slug>-<hash8>`）
- 是否需要重啟 IDE 才能生效
