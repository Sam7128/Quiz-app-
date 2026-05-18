---
description: 智慧分流自動驗證器。分析變更複雜度後自動路由至最適當的驗證引擎：小型變更使用 Gemini CLI，複雜變更使用 Codex。嚴格禁止 Agent 自行驗證，必須強制調用外部指令。最大疊代5輪。支援多重語法備援與自動降級。
---

# Tree-Verity 智慧分流驗證指令 v2.1

**⚠️ 絕對嚴格指令 (CRITICAL DIRECTIVE) ⚠️**
做為 Agent（你身為 AI 助手），**絕對嚴格禁止**你自己閱讀程式碼並自行發明/產生驗證結果！你在此工作流中的角色定位是「**流程編排者 (Orchestrator)**」，你的職責僅限於「收集資料」、「進行複雜度評分分流」、「寫出 prompt 檔案」，然後**必須強制透過 `run_command` 工具調用外部的 `gemini` 或 `npx codex exec` 命令行指令**來進行實際的代碼審查。

所有的缺漏與錯誤報告都必須 **100% 來自於 stdout 或外部工具產生的輸出結果文件**。如果你跳過指令不執行，而選擇自己「假裝」驗證並給出「我看過沒有問題」的結論，便是**最嚴重的違規**。

---

## ⚙️ 已知技術限制與正確語法

> **執行環境**: Windows PowerShell (`pwsh`)。以下限制是已確認的問題，必須嚴格遵守正確語法。

### Gemini CLI 正確語法

```powershell
# ✅ 優先嘗試：-f 傳檔案 + stdout 重導向（避開 stdin 管道和 -o 參數問題）
gemini -s -f "$env:TEMP\verify_prompt.md" > "$env:TEMP\verify_report.md" 2>&1

# ✅ 備用：非互動旗標
gemini --no-interactive -f "$env:TEMP\verify_prompt.md" > "$env:TEMP\verify_report.md" 2>&1
```

> **禁止** 使用 `-o <file>` 參數（`-o` 在 Gemini CLI 代表 `--output-format`，會報錯）。
> **禁止** 使用 `Get-Content ... | gemini ...` stdin 管道（可能觸發安全政策攔截）。

### Codex CLI 正確語法

> ⚠️ **已驗證版本行為** (codex v0.107.0)：
> - `-f <file>` 旗標**不存在**，只接受 `[PROMPT]` 位置參數或 stdin `-`
> - `-q` / `--quiet` 旗標**不存在**於此版本，不可使用
> - 在非 Git 或非信任目錄必須加 `--skip-git-repo-check`

```powershell
# ❌ 禁止（stdin 管道被 PowerShell 執行政策攔截）
Get-Content ... | npx codex exec -s read-only - > $env:TEMP\verify_report.md

# ❌ 禁止（-q 和 -f 旗標不存在於此版本）
npx codex exec -q -s read-only -f "$env:TEMP\verify_prompt.md"

# ✅ 唯一已驗證正確語法：cmd.exe 包裝 + stdin 重導向
cmd.exe /c "npx codex exec --skip-git-repo-check -s read-only - < "%TEMP%\verify_prompt.md" > "%TEMP%\verify_report.md" 2>&1"
```

---

## 執行步驟

1. **確定目標變更 (Target Change)**
   - 尋找要驗證的 OpenSpec 變更。若未指定，執行 `openspec list --json` 取得最新變更。

2. **收集 Artifacts + 壓力測試偵測 + 複雜度評估 (Triage)**
   - 讀取目標變更的 `proposal.md`, `design.md`, `specs/*/spec.md`, 以及最重要的 `tasks.md`。
   - **[壓力測試偵測 — 可選步驟]**:
     - 檢查 `openspec\changes\<name>\stress-test-report.md` 和 `openspec\changes\<name>\benchmark-harness.md` 是否存在。
     - **如果任一檔案存在**:
       - 讀取完整內容。
       - 宣告: `🧪 偵測到壓力測試 artifacts。驗證將包含壓力測試覆蓋檢查。`
       - 壓力測試內容將追加到後續的 verify_prompt.md 中。
     - **如果都不存在**:
       - 宣告: `📋 未偵測到壓力測試 artifacts。僅執行標準驗證。`
       - 跳過所有壓力測試步驟，後續流程與原版完全一致。
   - 進行分流評分 (1~10分)：評估「檔案與任務數量」、「變更深度」、「邏輯與風險」。
   - **強制輸出** 評分表與決策：
     - 總分 ≤ 5 分 ➡️ **LIGHT 模式 (使用 Gemini CLI)**
     - 總分 > 5 分 ➡️ **HEAVY 模式 (使用 Codex)**

3. **迭代式實作驗證循環（最多限制 5 輪）**

   - **前置準備**：將所有收集到的文件合併寫入 `$env:TEMP\verify_prompt.md` 作為 Prompt。
     內容格式：
     ```
     你是獨立驗證官 (Independent Verifier)。以下是 OpenSpec 變更計畫的文件。
     使用 search/view_file 工具探索 codebase，驗證 tasks.md 的每個任務是否落實在程式碼中。
     輸出 [CRITICAL] 未完成/偏離規格, [WARNING] 場景未覆蓋, [SUGGESTION] 建議。
     全部正常時，明確輸出「✅ VERIFICATION PASSED: 0 issues found.」

     === proposal.md ===
     <內容>
     === design.md ===
     <內容>
     === tasks.md ===
     <內容>
     ```
     若**偵測到壓力測試 artifacts**，在末尾追加：
     ```
     === 壓力測試補充驗證 ===
     1. HIGH 風險 issues 是否在實作中被處理？
     2. Test Matrix 中 P0 測試案例是否有對應覆蓋？
     <stress-test-report.md 完整內容>
     <benchmark-harness.md 完整內容（如存在）>
     ```

   - **Phase A — 強制執行外部驗證**（執行一次，然後跳至 Phase B）:
     - 💡 **嚴格要求**: 下列指令**必須**交由 `run_command` 實際在終端機中跑起來，等它跑完再往下走！

     - **LIGHT 模式 (Gemini CLI)** — 依序嘗試（第一個成功即停止）:
       ```powershell
       # 嘗試 1（優先）
       gemini -s -f "$env:TEMP\verify_prompt.md" > "$env:TEMP\verify_report.md" 2>&1
       ```
       若失敗（exit code 非 0 或出現錯誤訊息），執行：
       ```powershell
       # 嘗試 2（備用）
       gemini --no-interactive -f "$env:TEMP\verify_prompt.md" > "$env:TEMP\verify_report.md" 2>&1
       ```
       若仍失敗 → **跳至 GEMINI 降級方案**（見步驟 3 末尾）。

     - **HEAVY 模式 (Codex)** — 使用唯一已驗證正確語法：
       ```powershell
       # ✅ 唯一已驗證語法：cmd.exe 包裝 + stdin 重導向
       cmd.exe /c "npx codex exec --skip-git-repo-check -s read-only - < "%TEMP%\verify_prompt.md" > "%TEMP%\verify_report.md" 2>&1"
       ```
       若出現 `Not inside a trusted directory` → 確認 `--skip-git-repo-check` 旗標已加入。
       若仍失敗 → **跳至 CODEX 降級方案**（見步驟 3 末尾）。

     - 等待完全執行完畢後，使用 `view_file` 讀取 `$env:TEMP\verify_report.md`。這才是真正的「驗證報告」。

   - **Phase B — 根據報告修復程式碼**:
     - **完全且只**依據剛剛讀取到的 `verify_report.md` 來行動。**絕不可自行無中生有**。
     - 若外部報告指出**真實缺漏 (REAL)**：立即使用檔案編輯工具修改程式碼來修復 bugs 或補齊功能。
     - 若外部報告發生**誤判 (NOT REAL)**：有些程式碼已寫但被沒看到，將主張寫成「反駁 (Refutation)」並加入下一輪的 Prompt 中。
     - **壓力測試相關問題**（僅當偵測到 artifacts）:
       - HIGH 風險 issue 未處理 → 評估是否補齊防禦代碼。
       - P0 測試未覆蓋 → 標記 WARNING。
       - 效能門檻風險 → 標記 SUGGESTION。

   - **Phase C — 重新驗證**: 若報告中仍有未解決項目，更新 Prompt（包含 Phase B 的修復說明）後，回到 Phase A，再次**真實發送**給外部審查官。

   - **結束條件**: `verify_report.md` 中外部工具明確指出 **「✅ VERIFICATION PASSED: 0 issues」** 为止。
   - **中斷條件**: 若達 **5 次循環** 仍未收斂，**立即強制停止**，並向使用者報告「已達最高重試上限」，並詢問是否接手處理。

   ---

   #### 🔴 降級方案 (Fallback) — 外部工具均失敗時

   **禁止靜默失敗或假裝驗證**。當所有語法均失敗時，必須：

   1. **立即宣告降級**：向使用者報告「外部驗證工具均無法執行（已嘗試全部語法），啟動人工協助審查模式。」
   2. **提供完整手動驗證 checklist**：將 `tasks.md` 的每個任務列成表格，每項標示「**待人工確認**」。
   3. **提供可直接在終端複製貼上的指令**，讓使用者可自行執行驗證。
   4. **不得關閉任務**：在使用者確認前，工作流保持「未完成」狀態。

4. **清理臨時文件**
   - 任務結束時，刪除 `$env:TEMP` 中的 `verify_prompt.md` 與 `verify_report.md` 以保環境整潔。
   - **如果偵測到壓力測試**: 在最終報告中加入「壓力測試覆蓋摘要」區段，列出哪些 HIGH issues 被處理、哪些被推遲。

---

> [!TIP]
> 如果您想針對特定變更啟動此嚴格隔離的自動驗證循環，請輸入：`/tree-verity <change-name>`。

> [!NOTE]
> **除錯速查**: 若遇到 `-o` 參數錯誤 → 改用 `> file 2>&1`；遇到 `blocked by policy` → 改用 `cmd.exe /c "..."` 包裝；遇到 stdin 管道問題 → 改用 `-f <file>` 傳 prompt 檔。
