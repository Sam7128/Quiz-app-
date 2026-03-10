---
name: auto-verify
description: 自動驗證實作是否符合 OpenSpec 變更計畫（規格、設計、任務）。當實作完成後，可使用此工具強制觸發 Codex 進行完全自動化的代碼核實與修正循環，確保 100% 覆蓋。如偵測到壓力測試 artifacts（stress-test-report.md, benchmark-harness.md），會自動將其納入驗證範圍。
---

# Auto-Verify (Automated Implementation Verification)

透過呼叫外部 AI (Codex) 作為驗證官，並配合自動化迭代修正循環，審計系統中的任務是否真正落實在程式碼中，且符合提案、設計及規格的需求。

## Workflow 嚴格執行流程

1. **Identify target change (確認目標變更)**
   - 如果使用者有指定變更名稱，直接使用。
   - 如果未指定，執行 `openspec list --json` 取得最近的變更。

2. **Collect artifacts & codebase context (收集計畫文件與代碼上下文)**
   - 透過 `openspec status --change "<name>" --json` 了解狀態。
   - 提取 `proposal.md`, `design.md`, `specs/spec.md`, 還有最重要的 `tasks.md` 的所有內容。

3. **[壓力測試偵測 — 可選步驟]**
   - 檢查以下兩個檔案是否存在於 `openspec\changes\<name>\` 目錄中：
     - `stress-test-report.md` → 壓力測試問題報告 + 測試矩陣
     - `benchmark-harness.md` → 效能基準規格
   - **如果任一檔案存在**:
     - 讀取其完整內容。
     - 宣告: `🧪 偵測到壓力測試 artifacts。驗證範圍將擴展至壓力測試覆蓋。`
     - 設定 `STRESS_TEST_MODE = true`（內部標記，用於後續步驟）。
     - 從 `stress-test-report.md` 中提取所有 `[ISSUE-XXX]` 條目和 Test Matrix。
     - 從 `benchmark-harness.md` 中提取 Performance Baselines 和 Regression Gates。
   - **如果都不存在**:
     - 宣告: `📋 未偵測到壓力測試 artifacts。僅執行標準驗證。`
     - 設定 `STRESS_TEST_MODE = false`。
     - 跳過所有壓力測試相關步驟。後續流程與原版完全一致。

4. **Execute iterative VERIFICATION loop (迭代式自動驗證與修復循環 - 最多 5 輪)**
   - **MANDATORY (強制執行)**: 您必須使用 `codex exec` 當作獨立驗證官（Reviewer），如果命令失敗不可跳過、不可手動驗證，必須重試或直接回報錯誤！
   - 每一輪的架構：
     1. **Verification Pass (Codex 審查)**:
        - 準備一份 `verify_prompt.md`，內容必須包含剛剛收集的所有文件，並明確指示 Codex：「你是獨立驗證官，請使用 search/view_file 等工具探索 codebase，驗證所有 tasks.md 上的任務是否真正實作，以及規格需求是否正確。列出 CRITICAL(未完成/規格偏離), WARNING(場景未覆蓋/設計未遵守), SUGGESTION。」
        - **如果 `STRESS_TEST_MODE = true`**: 在 Prompt 的末尾追加以下指令：
          ```
          === 壓力測試補充驗證 ===
          以下是此變更的壓力測試報告和效能基準，請一併驗證：
          1. 壓力測試中標記為 HIGH 風險的 issues 是否在實作中被處理（有防禦性程式碼）？
          2. Test Matrix 中的 P0 測試案例是否有對應的測試程式碼？
          3. 效能基準中的 Regression Gate 門檻是否可能被違反？
          <stress-test-report.md 內容>
          <benchmark-harness.md 內容>
          ```
        - 執行命令（唯一已驗證有效語法）：
          ```powershell
          # ✅ 已驗證正確：cmd.exe 包裝 + stdin 重導向（-q 和 -f 旗標在此版本不存在）
          cmd.exe /c "npx codex exec --skip-git-repo-check -s read-only - < "%TEMP%\verify_prompt.md" > "%TEMP%\codex_verify_report.md" 2>&1"
          ```
          *(註：`-s read-only` 確保審查官不能亂改原始碼。`--skip-git-repo-check` 是必要旗標，在非 Git/非信任目錄執行缺少此旗標會直接失敗。禁止使用 `-f`、`-q`（此版本不支援）或 PowerShell 直接管道（被執行政策攔截）。)*
     2. **Validation & Fix Pass (由您進行實作修復)**:
        - 讀取 `$env:TEMP\codex_verify_report.md` 的意見。
        - **如果是真實存在的問題 (REAL)**：您必須立即親自去修改程式碼、建立缺失的模組，或把忘記打勾的 tasks.md 打勾補上。
        - **如果是不存在的問題/誤判 (NOT REAL)**：例如程式碼其實寫在別的地方但 Codex 沒找到，您必須記下**反駁 (Refutation)**（例如: "該規格實際已在 `src/hooks/X.ts:50` 實作"）。
        - **壓力測試相關問題處理**（僅當 `STRESS_TEST_MODE = true`）：
          - 如果 Codex 指出 HIGH 風險 issue 未被處理 → 評估是否需要補齊防禦性程式碼。
          - 如果 Codex 指出 P0 測試未覆蓋 → 標記為 WARNING（非 CRITICAL），因為壓力測試是實驗性功能。
          - 如果 Codex 指出效能門檻風險 → 標記為 SUGGESTION。
     3. **Re-verify Pass (重新發送驗證)**:
        - 如果還有未解決的缺漏：更新被您修改過的實作狀態，並將**反駁 (Refutations)** 寫入新的 Prompt 中，再次召喚 `codex exec` 進行複查。
   - **Completion Condition (完成條件)**: 當且僅當 Codex 產生的報告顯示 **「0 個警告、0 個問題、0 個缺漏實作、0 個建議事項」** 時，方可退出迴圈並回報大功告成。
   - **Limit Condition (終止條件)**: 若執行達到 5 次後仍有大量問題存在，**必須立刻停止**，不再試圖自行修復，並將最終報告輸出給使用者。

5. **Clean temp files (清理臨時檔案)**
   - 結束時，必定要刪除 TEMP 下的任何 prompt 與 report 文件。

## Verification Dimensions
在撰寫給 Codex 的 prompt 時，務必要求其審核以下面向 (如同 `openspec-verify-change` 的精神)：
- **Completeness (完整性)**: `tasks.md` 的所有細項都已完成（有程式碼佐證），規格的所有需求都對應到了實作。
- **Correctness (正確性)**: 實作的邏輯與規格/設計方案不相衝突。
- **Coherence (一致性)**: 程式碼風格與架構設計 (Design) 保持一致。
- **Stress Test Coverage (壓力測試覆蓋)** *(僅當 STRESS_TEST_MODE = true)*: 壓力測試中的 HIGH 風險 issues 已被處理，P0 測試案例有對應實作。
