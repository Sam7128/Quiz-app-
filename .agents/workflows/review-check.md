---
description: 審查 OpenSpec 變更計畫（提案、規格、設計、任務）的關鍵問題與風險。當您想要對某個變更進行深度審計時使用。
---

# Review Check 審查指令 (Codex CLI 版)

此指令會透過終端機召喚 `codex exec` 工具（非互動模式），對目前的 OpenSpec 變更進行**迭代式**深度審計。

## 執行步驟

1. **確定目標變更 (Target Change)**
   - 如果您有指定變更名稱，我會直接使用它。
   - 如果沒有指定，我會執行 `openspec list --json` 並選擇最近修改的變更。

2. **收集 Artifacts + 讀取審查標準**
   - 執行 Python 收集腳本收集所有 artifact 路徑。
   - 讀取 `.agent/skills/review-check/SKILL.md` 完整流程指引。
   - 讀取 `.agent/skills/review-check/references/review-rubric.md` 五大審查維度。

3. **[壓力測試偵測 — 可選步驟]**
   - 檢查 `openspec\changes\<name>\stress-test-report.md` 是否存在。
   - 檢查 `openspec\changes\<name>\benchmark-harness.md` 是否存在。
   - **如果任一檔案存在**:
     - 讀取其完整內容。
     - 宣告: `🧪 偵測到壓力測試 artifacts。審查將包含壓力測試問題驗證。`
     - 在後續的 Codex Prompt 中加入壓力測試 issues，要求 Codex 也一併驗證。
   - **如果都不存在**:
     - 宣告: `📋 未偵測到壓力測試 artifacts。僅執行標準審查。`
     - 跳過所有壓力測試相關步驟。流程與原版完全一致。

4. **構建 Review Prompt + 發送給 Codex**
   - 構建臨時 prompt 文件（在 TEMP 目錄），包含 rubric + artifacts 全文 + 審查指令。
   - **如果偵測到壓力測試 artifacts**: 在 prompt 中追加壓力測試 issues 和驗證要求。
   - 使用 `codex exec`（不是 `codex review`！）：
     ```powershell
     Get-Content "$env:TEMP\review_prompt.md" -Raw | npx codex exec -s read-only -o "$env:TEMP\codex_review_report.md" -
     ```

5. **迭代式修復循環（最多 5 輪）**
   - **強制使用 CODEX**: 您**必須**使用 `codex exec` 的結果為準。如果執行失敗，**絕對不可**跳過並自行進行手動審查，必須重試或直接回報給使用者。
   - **Phase A**: 讀取 codex 報告。
   - **Phase B (驗證與修復)**:
     - 如果您確認某些問題是**真實存在的**，請「立即修改」對應的 artifact。
     - 如果您確認某些問題是**不存在的 / 誤判**，請在下一輪的 Prompt 中加入「反駁 (Refutation)」來告訴 codex。
     - **如果包含壓力測試**：也驗證 Codex 對壓力測試 issues 的判斷，更新評估。
   - **Phase C (重新驗證)**: 帶入「更新後的 artifacts」與「反駁」，並再次發送給 Codex 進行新一輪審查。
   - **結束條件**:
     - 成功：不斷重複此動作，直到 codex 的審查報告顯示「沒有任何問題警告、立即修改的事情或建議的事情」為止。
     - 失敗：如果達到最高限制 5 輪後，Codex 仍回報許多問題，請**立即停止**並將結尾報告回送給使用者。使用者會視情況決定是否重新啟動技能。

6. **清理臨時文件**
   - 刪除所有 TEMP 目錄中的臨時 prompt 和 report 文件。

7. **產出最終報告**
   - 彙整所有輪次結果，給出 `PASS` / `PASS_WITH_WARNINGS` / `BLOCKED` 結論。
   - **如果包含壓力測試**: 在報告中加入「壓力測試交叉驗證」區段。

---

> [!CAUTION]
> **不要使用 `codex review`**！那是 git diff 審查子命令。正確命令是 `codex exec`。

> [!TIP]
> 如果您想針對特定變更，可以使用 `/review-check <change-name>`。
