---
name: tree-verity
description: 智慧分流自動驗證器。分析變更複雜度後自動路由至最適當的驗證引擎：小型變更使用 Gemini CLI（節省 Codex quota），重構或複雜變更則使用 Codex 進行審查。當實作完成後，可使用此工具強制觸發完全自動化的代碼核實與修正循環。若 5 輪驗證未能收斂，會中斷並詢問使用者。觸發時機：(1) 想以較省 quota 的方式驗證任務、(2) 輸入 /tree-verity 指令。
---

# Tree-Verity (智慧分流驗證器) — v2.1

透過「複雜度分流 (Triage)」機制，將驗證任務路由到最適當的外部 AI 引擎，在保證驗證品質的前提下最大限度節省 Codex quota。當發現缺漏的程式碼時，直接親自補齊。

---

## ⚠️ 絕對嚴格指令 (CRITICAL DIRECTIVE)

身為 Agent（AI 助手），**絕對嚴格禁止**自己閱讀程式碼並自行發明/產生驗證結果！本工作流中的角色定位是「**流程編排者 (Orchestrator)**」，職責僅限於「收集資料」、「複雜度評分」、「寫出 prompt 檔案」，然後**必須強制透過 `run_command` 工具呼叫外部的 `gemini` 或 `npx codex` 命令**，再從其輸出結果文件取得審查意見。

**禁止跳過外部指令、禁止假裝驗證、禁止自行得出「沒有問題」的結論。**

---

## 🔧 底層技術規格（使用前必讀）

本技能在 **Windows PowerShell (pwsh)** 環境執行。由於 CLI 工具間存在以下已知限制，必須嚴格遵守以下指令規格：

### Gemini CLI 正確呼叫語法

```
# ❌ 錯誤（-o 代表 --output-format，不是輸出檔案）
Get-Content $env:TEMP\verify_prompt.md -Raw | gemini -s -o $env:TEMP\verify_report.md

# ✅ 正確方式 A：使用 --output-file 明確長參數（如果版本支援）
gemini -s --output-file "$env:TEMP\verify_report.md" -f "$env:TEMP\verify_prompt.md"

# ✅ 正確方式 B：直接重導向 stdout（最相容，不依賴任何長參數）
gemini -s -f "$env:TEMP\verify_prompt.md" > "$env:TEMP\verify_report.md" 2>&1

# ✅ 正確方式 C：非交互旗標 + stdout 重導向（最保守）
gemini --no-interactive -f "$env:TEMP\verify_prompt.md" > "$env:TEMP\verify_report.md" 2>&1
```

> **執行策略**：先嘗試方式 B，若失敗（看 exit code 或報錯），立即改試方式 C，再失敗則切換至 Gemini 降級方案（見下方）。

### Codex CLI 正確呼叫語法

> ⚠️ **已驗證版本行為** (codex v0.107.0)：
> - `-f <file>` 旗標**不存在**，只接受 `[PROMPT]` 位置參數或 stdin `-`
> - `-q` / `--quiet` 旗標**不存在**於此版本，不可使用
> - 在非 Git 或非信任目錄必須加 `--skip-git-repo-check`，否則直接失敗

```powershell
# ❌ 錯誤（stdin 管道被 PowerShell 執行政策攔截）
Get-Content $env:TEMP\verify_prompt.md -Raw | npx codex exec -s read-only - > $env:TEMP\verify_report.md

# ❌ 錯誤（-f 旗標不存在，-q 旗標不存在）
npx codex exec -q -s read-only -f "$env:TEMP\verify_prompt.md"

# ✅ 正確方式（唯一已驗證有效）：cmd.exe 包裝 + stdin 重導向
cmd.exe /c "npx codex exec --skip-git-repo-check -s read-only - < "%TEMP%\verify_prompt.md" > "%TEMP%\verify_report.md" 2>&1"
```

> **執行策略**：統一使用 `cmd.exe /c "..."` 包裝，以 `< file` 方式注入 prompt，以 `> file 2>&1` 捕捉輸出。這是在 Windows 上唯一同時繞過 PowerShell 執行政策和正確傳遞 stdin 的已驗證方法。

### 關鍵旗標說明

| 旗標 | 工具 | 說明 |
|---|---|---|
| `-s` | Gemini | `--sandbox` 或 `--safe` 模式（僅探索，不可修改） |
| `-f <file>` | Gemini | 從檔案讀取 prompt（**僅 Gemini CLI 支援**，Codex 不支援） |
| `--skip-git-repo-check` | Codex | **必填**，在非 Git/非信任目錄執行時必須加，否則直接報錯拒絕執行 |
| `-s read-only` | Codex | 鎖定為唯讀審查模式，禁止寫入任何檔案 |
| `< file` | cmd.exe | 以 stdin 重導向注入 prompt，**只能在 cmd.exe 包裝內正常工作** |
| `> file 2>&1` | cmd.exe | 同時捕捉 stdout + stderr 到檔案 |

---

## 核心工作流 (Workflow)

### Phase 1：確認目標與收集 Artifacts

1. 確定目標變更（如果使用者未指定，執行 `openspec list --json` 取得最近變更）。
2. 提取 `proposal.md`, `design.md`, `specs/*/spec.md` 及最重要的 `tasks.md` 的所有內容。

### Phase 1.5：壓力測試偵測（可選步驟）

在收集標準 artifacts 之後、進行複雜度評估之前：

1. 檢查以下檔案是否存在於 `openspec\changes\<name>\` 目錄中：
   - `stress-test-report.md` → 壓力測試問題報告 + 測試矩陣
   - `benchmark-harness.md` → 效能基準規格

2. **如果任一檔案存在**:
   - 讀取其完整內容。
   - 宣告: `🧪 偵測到壓力測試 artifacts。驗證範圍將擴展至壓力測試覆蓋。`
   - 設定內部旗標 `STRESS_TEST_MODE = true`。
   - 從 `stress-test-report.md` 中提取所有 `[ISSUE-XXX]` 條目（特別注意 HIGH 風險項目）。
   - **注意**: 壓力測試 artifacts 的存在也會影響複雜度評估（Phase 2），因為額外的驗證範圍可能使總分提高。

3. **如果都不存在**:
   - 宣告: `📋 未偵測到壓力測試 artifacts。僅執行標準驗證。`
   - 設定 `STRESS_TEST_MODE = false`。
   - 後續所有壓力測試相關步驟完全跳過。流程與原版行為一致。

### Phase 2：複雜度評估 (Triage Layer) - 分流決策

在開始驗證前，進行一次 1~10 分的複雜度評估，並產生以下維度的分數表：

- **檔案與任務數量** (35%)：檔案/任務越少分數越低。
- **變更深度** (40%)：UI 微調、文案、樣式 (低分) vs 核心模組、架構重構 (高分)。
- **邏輯與風險** (25%)：純靜態展示 (低分) vs 資料流狀態遷移與高風險 (高分)。

**決策條件**：
- **總分 <= 5 分 (且無單項極端高分)** ➡️ **啟動 LIGHT 模式 (Gemini CLI)**
- **總分 > 5 分 (或有重構/邏輯深度大於 8 分的項目)** ➡️ **啟動 HEAVY 模式 (Codex)**

*注意：評分結果與決定分流的結果必須輸出給使用者檢閱。*

### Phase 3：迭代式驗證循環（最多限制 5 輪）

**規則：** 不論走到哪一個模式，**最高疊代次數為 5 次**。如果經過 5 次驗證和修復後，審查官仍回報有尚未收斂的錯誤，或者工具執行失敗，立即停止運作，並匯報：「已達 5 次最大重試次數，仍有未收斂的問題。是否繼續嘗試，還是您決定親自接手？」

#### 前置準備（所有模式共用）

**必須**先將所有收集到的文件合併寫入 `$env:TEMP\verify_prompt.md`，格式如下：

```
你是獨立驗證官 (Independent Verifier)。以下是 OpenSpec 變更計畫的所有文件。
你的任務是：使用 search_files/view_file 等工具探索 codebase，
驗證 tasks.md 上的所有任務是否真正實作，並找出任何規格偏離。
輸出格式：列出 [CRITICAL] 未完成/規格偏離, [WARNING] 場景未覆蓋, [SUGGESTION] 建議改進。
若全部正常，明確輸出「✅ VERIFICATION PASSED: 0 issues found.」

=== proposal.md ===
<內容>

=== design.md ===
<內容>

=== tasks.md ===
<內容>

=== 相關 spec 文件 ===
<內容>
```

若 `STRESS_TEST_MODE = true`，在末尾追加：

```
=== 壓力測試補充驗證 ===
以下是此變更的壓力測試報告，請一併驗證：
1. HIGH 風險 issues 是否在實作中被處理（有防禦性程式碼）？
2. Test Matrix 中 P0 測試案例是否有對應的測試程式碼？
<stress-test-report.md 完整內容>
<benchmark-harness.md 完整內容（若存在）>
```

#### 模式 A: LIGHT 模式 (Gemini CLI)

**Step A1 — 驗證 (強制執行)**:

依照以下順序嘗試，直到有一個成功為止：

```powershell
# 嘗試 1：-f 檔案讀取 + stdout 重導向
gemini -s -f "$env:TEMP\verify_prompt.md" > "$env:TEMP\verify_report.md" 2>&1
```

若 exit code 非 0 或報錯（解析 stderr 確認），則嘗試：

```powershell
# 嘗試 2：--no-interactive 旗標模式
gemini --no-interactive -f "$env:TEMP\verify_prompt.md" > "$env:TEMP\verify_report.md" 2>&1
```

若仍失敗，**自動切換至 GEMINI 降級方案（見下方）**。

**Step A2 — 修復**:
- 讀取 `$env:TEMP\verify_report.md`。
- 若為真實缺漏 (REAL)，立即修改原始碼補齊。
- 若為誤判 (NOT REAL)，記下反駁 (Refutation)，加入下一輪 prompt。
- 壓力測試相關 (僅當 `STRESS_TEST_MODE = true`):
  - HIGH 風險 issue 未處理 → 評估是否補齊防禦代碼。
  - P0 測試未覆蓋 → 標記 WARNING。
  - 效能門檻風險 → 標記 SUGGESTION。

**Step A3 — 重新驗證**:
- 重複步驟，直到報告中明確出現 `VERIFICATION PASSED: 0 issues` 或達到 5 次疊代。

#### 模式 B: HEAVY 模式 (Codex)

**Step B1 — 驗證 (強制執行)**:

使用以下**唯一已驗證有效**的指令（必須透過 `run_command` 實際執行）：

```powershell
# ✅ 已驗證正確語法：cmd.exe 包裝 + stdin 重導向（無需 -f 或 -q，because they don't exist）
cmd.exe /c "npx codex exec --skip-git-repo-check -s read-only - < "%TEMP%\verify_prompt.md" > "%TEMP%\verify_report.md" 2>&1"
```

執行後使用 `view_file` 讀取 `$env:TEMP\verify_report.md`，確認內容是否包含正常的 codex 輸出標頭（例如 `OpenAI Codex v0.x.x`）。

若出現 `Not inside a trusted directory` 報錯 → 確認 `--skip-git-repo-check` 旗標已正確加入。
若仍失敗（例如 `blocked by policy`），**自動切換至 CODEX 降級方案（見下方）**。

**Step B2 & B3** — 修復與重新驗證邏輯與模式 A 完全相同。

---

#### 🔴 降級方案 (Fallback Modes) — 外部工具均失敗時

當 Gemini CLI 和 Codex 兩者均無法正常執行時，不可靜默失敗或假裝驗證。必須：

1. **立即宣告降級**：向使用者報告「外部驗證工具均無法執行（已嘗試所有語法），啟動人工協助審查模式。」
2. **提供完整的手動驗證 checklist**：
   - 將所有 `tasks.md` 的任務列成表格。
   - 對每個任務，標示「**待人工確認**」狀態。
   - 提供可直接複製並在終端機執行的 `gemini` 或 `codex` 指令供使用者自行執行。
3. **不得關閉任務**：在使用者確認結果前，本工作流保持「未完成」狀態。

---

### Phase 4：清理與完結報告

- 當成功達到 **Zero Errors** 或達最大次數中斷後，務必刪除 `$env:TEMP` 中產生的 `verify_prompt.md` 與 `verify_report.md`。
- 如果被中斷了，將剩餘清單與未能修復的難點整理輸出給使用者，讓他決定下一步。
- **如果 `STRESS_TEST_MODE = true`**: 在完結報告中加入一個專門的「壓力測試覆蓋摘要」區段，列出哪些 HIGH issues 被處理、哪些被推遲。

---

## Verification Dimensions (審核面向)

在給驗證官的 Prompt 中，至少要求包含以下面向的審查：
- **Completeness (完整性)**: tasks.md 每個單項都有程式碼實作佐證。
- **Correctness (正確性)**: 實體邏輯不與規格衝突。
- **Coherence (一致性)**: 不破壞原有專案架構與風格設定。
- **Stress Test Coverage (壓力測試覆蓋)** *(僅當 STRESS_TEST_MODE = true)*: 壓力測試中的 HIGH 風險 issues 已被處理，P0 測試案例有對應實作。

---

## 💡 除錯參考：常見錯誤訊息與解法

| 錯誤訊息 | 原因 | 解法 |
|---|---|---|
| `unknown option: -o` / `invalid output format` | Gemini CLI 的 `-o` 是 `--output-format` 不是輸出檔案 | 改用 `> file 2>&1` 重導向 |
| `Tool execution denied by policy` | Gemini CLI 安全政策攔截內部工具調用 | 改用 `-f` 傳 prompt 檔，不用 stdin 管道 |
| `blocked by policy` | Codex stdin 管道在 PowerShell 中被 Windows 攔截 | 改用 `cmd.exe /c "npx codex exec ... - < file > out 2>&1"` |
| `PowerShell exited -1` | PowerShell 執行政策（Execution Policy）阻止子進程執行 | 使用 `cmd.exe /c "..."` 包裝整個指令 |
| `Not inside a trusted directory` | Codex 拒絕在非 Git/非信任目錄執行 | 加上 `--skip-git-repo-check` 旗標 |
| `unknown option: -q` / `unknown option: -f` | 目前版本 Codex 不支援這些旗標 | 移除 `-q`，用 `- < file` 取代 `-f file` |
| `npx: command not found` | Node.js 環境未在 PATH 中 | 確認 `node --version` 可正常輸出，或使用完整路徑 |
