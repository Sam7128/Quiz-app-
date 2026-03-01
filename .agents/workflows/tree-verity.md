---
description: 智慧分流自動驗證器。分析變更複雜度後自動路由至最適當的驗證引擎：小型變更使用 Gemini CLI，複雜變更使用 Codex。嚴格禁止 Agent 自行驗證，必須強制調用外部指令。最大疊代5輪。
---

# Tree-Verity 智慧分流驗證指令

**⚠️ 絕對嚴格指令 (CRITICAL DIRECTIVE) ⚠️**
做為 Agent (也就是你身為 AI 助手)，**絕對嚴格禁止**你自己閱讀程式碼並自行發明/產生驗證結果！你在此工作流中的角色定位是「**流程編排者 (Orchestrator)**」，你的職責僅限於「收集資料」、「進行複雜度評分分流」，然後**必須強制透過 `run_command` 工具調用外部的 `gemini` 或 `npx codex exec` 命令行指令**來進行實際的代碼審查。

所有的缺漏與錯誤報告都必須 **100% 來自於 stdout 或外部工具產生的輸出結果文件**。如果你跳過指令不執行，而選擇自己「假裝」驗證並給出「我看過沒有問題」的結論，便是**最嚴重的違規**。

**執行環境說明**: 
本工作流執行於 Windows 的 PowerShell (`pwsh`) 環境中。你需要透過 `run_command` 正確調用指令，並確保利用 PowerShell 的管線 (pipeline) 與重新導向將暫存檔讀取給 CLI 工具。

## 執行步驟

1. **確定目標變更 (Target Change)**
   - 尋找要驗證的 OpenSpec 變更。若未指定，執行 `openspec list --json` 取得最新變更。

2. **收集 Artifacts + 複雜度評估 (Triage)**
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
   - **前置準備**: 將所有收集到的文件合併寫入到 `$env:TEMP\verify_prompt.md` 作為 Prompt。
     - **如果偵測到壓力測試 artifacts**: 在 prompt 末尾追加以下內容：
       ```
       === 壓力測試補充驗證 ===
       以下是此變更的壓力測試報告，請一併驗證：
       1. HIGH 風險 issues 是否在實作中被處理？
       2. Test Matrix 中 P0 測試案例是否有對應覆蓋？
       <stress-test-report.md 內容>
       <benchmark-harness.md 內容（如存在）>
       ```
   - **Phase A (強制執行外部驗證)**:
     - 💡 **嚴格要求**: 下列指令**必須**交由 `run_command` 實際在 PowerShell 中跑起來，等它跑完再往下走！
     - **LIGHT 模式 指令**:
       ```powershell
       Get-Content $env:TEMP\verify_prompt.md -Raw | gemini -s -o $env:TEMP\verify_report.md
       ```
     - **HEAVY 模式 指令**:
       ```powershell
       Get-Content $env:TEMP\verify_prompt.md -Raw | npx codex exec -s read-only -o $env:TEMP\verify_report.md -
       ```
     - 等待完全執行完畢後，使用 `view_file` 讀取 `$env:TEMP\verify_report.md` 的內容。這才是真正的「驗證報告」。
   - **Phase B (根據報告修復程式碼)**:
     - **完全且只**依據剛剛讀取到的 `verify_report.md` 來行動。絕不可自行無中生有。
     - 若外部報告指出 **真實缺漏 (REAL)**：你立即使用檔案編輯工具修改程式碼來修復 bugs 或補齊功能。
     - 若外部報告發生 **誤判 (NOT REAL)**：有些程式碼已寫但被沒看到，將你的主張寫成「反駁 (Refutation)」並加入下一輪的 Prompt 中。
     - **壓力測試相關問題** (僅當偵測到 artifacts):
       - HIGH 風險 issue 未處理 → 評估是否補齊防禦代碼。
       - P0 測試未覆蓋 → 標記 WARNING。
       - 效能門檻風險 → 標記 SUGGESTION。
   - **Phase C (重新驗證)**: 若報告中仍有未解決項目，更新 Prompt (包含你在 Phase B 的修復說明) 後，回到 Phase A，再次**真實發送**給外部審查官。
   - **結束條件**: `verify_report.md` 中外部工具明確指出 **無任何缺漏與警告 (Zero Errors/Warnings)** 为止。
   - **中斷條件**: 若達 **5 次循環** 仍未收斂、修復過程卡死或指令不斷報錯，**立即強制停止**，並向使用者報告「已達最高重試上限」，並詢問是否接手處理。

4. **清理臨時文件**
   - 任務結束時，刪除 `$env:TEMP` 中的 `verify_prompt.md` 與 `verify_report.md` 以保環境整潔。
   - **如果偵測到壓力測試**: 在最終報告中加入「壓力測試覆蓋摘要」區段。

---

> [!TIP]
> 如果您想針對特定變更啟動此嚴格隔離的自動驗證循環，請輸入：`/tree-verity <change-name>`。
