---
description: 自動驗證實作是否符合 OpenSpec 變更計畫（規格、設計、任務）。當實作完成後，可使用此工具強制觸發 Codex 進行完全自動化的代碼核實與修正循環，確保 100% 覆蓋。
---

# Auto-Verify 自動驗證指令

此指令會透過終端機召喚 `codex exec`，對目前的 OpenSpec 變更與 codebase 進行**迭代式**自動驗證，確保所有任務與設計都已真實落實在程式碼中。這是一個比單純審查更嚴謹的流程，當發現有實作遺漏時，我將會立刻補齊缺漏的程式碼。

## 執行步驟

1. **確定目標變更 (Target Change)**
   - 如果您有指定變更名稱，我會直接使用它。
   - 如果沒有指定，我會執行 `openspec list --json` 並選擇最近修改的變更。

2. **收集 Artifacts + 構建 Verify Prompt**
   - 讀取目標變更的 `proposal.md`, `design.md`, `specs/*/spec.md`, `tasks.md`。
   - 構建臨時 prompt 文件（在 `$env:TEMP\verify_prompt.md` 目錄），將上述文件內容全部放入。
   - 在 Prompt 中明確賦予獨立驗證官身份：「你是驗證官（Verifier）。請使用你的搜索工具（grep_search, view_file 等）去檢查專案 codebase，逐一驗證這些任務 (tasks.md) 與規格 (specs.md) 是否都已經被正確且完整地實作出來，並產出詳細的審查報告 (CRITICAL, WARNING, SUGGESTION)。」

3. **[壓力測試偵測 — 可選步驟]**
   - 檢查 `openspec\changes\<name>\stress-test-report.md` 和 `openspec\changes\<name>\benchmark-harness.md` 是否存在。
   - **如果任一檔案存在**:
     - 讀取其完整內容，並追加到 `verify_prompt.md` 中。
     - 宣告: `🧪 偵測到壓力測試 artifacts。驗證範圍將擴展至壓力測試覆蓋。`
     - 追加額外驗證指令：要求 Codex 檢查 HIGH 風險 issues 是否被處理、P0 測試案例是否有覆蓋。
   - **如果都不存在**:
     - 宣告: `📋 未偵測到壓力測試 artifacts。僅執行標準驗證。`
     - 完全不改變後續流程。

4. **迭代式實作驗證循環（最多 5 輪）**
   - **強制要求**: 必須使用 `codex exec`，並且**絕對不可**自行手動審查，必須等待外部審查報告的指引。如果執行報錯，不可跳過，必須重試或放棄回報。
   - **執行 Codex 審查指令**:
     ```powershell
     Get-Content "$env:TEMP\verify_prompt.md" -Raw | npx codex exec -s read-only -o "$env:TEMP\codex_verify_report.md" -
     ```
   - **Phase A**: 讀取報告 `$env:TEMP\codex_verify_report.md`。
   - **Phase B (驗證與修復程式碼)**:
     - 確認問題為**真實缺漏 (REAL)**：我將會「立即修改程式碼」並修正相應的 bugs，或者將已完成但尚未打勾的 `tasks.md` 更新為 `[x]`。
     - 確認問題為**誤判 (NOT REAL)**：有些程式碼已經完成但被誤判為沒寫，我將會在下一輪的 Prompt 加入「反駁 (Refutation)」去告訴分析器這段程式碼實際上寫在檔案的哪裡。
     - **壓力測試相關問題**（如偵測到）：HIGH 風險 issue 未處理 → 補齊防禦代碼。P0 測試未覆蓋 → 標記為 WARNING。效能門檻風險 → 標記為 SUGGESTION。
   - **Phase C (重新驗證)**: 帶入「修復後的 codebase 狀態」與「我的反駁說明」，並以相同方式發送給 Codex 進行新一輪驗證。
   - **結束條件**: 不斷重複，直到 Codex 產出的驗證報告中顯示**「沒有任何批評、警告、未寫出的實作與優化建議」**為止。
   - **失敗條件**: 如果循環次數超過 5 次，仍有大量問題存在或修復卡死，我會**強制停止**，並將最後的結果印出報備給使用者。

5. **清理臨時文件**
   - 刪除所有 `$env:TEMP` 目錄中產生的 `verify_prompt.md` 以及 `codex_verify_report.md` 文件。

---

> [!TIP]
> 如果您想針對特定變更進行這個嚴格的自動驗證循環，可以使用 `/auto-verify <change-name>`。此流程不僅負責「檢查」，當發現確實有漏做的功能時，主控端 AI (我) 會親自下場將其補齊。
