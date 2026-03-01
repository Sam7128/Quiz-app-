---
name: tree-verity
description: 智慧分流自動驗證器。分析變更複雜度後自動路由至最適當的驗證引擎：小型變更使用 Gemini CLI（節省 Codex quota），重構或複雜變更則使用 Codex 進行審查。當實作完成後，可使用此工具強制觸發完全自動化的代碼核實與修正循環。若 5 輪驗證未能收斂，會中斷並詢問使用者。觸發時機：(1) 想以較省 quota 的方式驗證任務、(2) 輸入 /tree-verity 指令。
---

# Tree-Verity (智慧分流驗證器)

透過「複雜度分流 (Triage)」機制，將驗證任務路由到最適當的外部 AI 引擎，在保證驗證品質的前提下最大限度節省 Codex quota。這不只是一個審查器，當發現缺漏的程式碼時，我會直接將其親自補齊。

## 核心工作流 (Workflow)

### Phase 1：確認目標與收集 Artifacts

1. 確定目標變更（如果使用者未指定，執行 openspec list --json 取得最近變更）。
2. 提取 proposal.md, design.md, specs/*/spec.md 及最重要的 tasks.md 的所有內容。

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

在開始驗證前，我會進行一次 1~10 分的複雜度評估，並產生以下維度的分數表：

- **檔案與任務數量** (35%)：檔案/任務越少分數越低。
- **變更深度** (40%)：UI 微調、文案、樣式 (低分) vs 核心模組、架構重構 (高分)。
- **邏輯與風險** (25%)：純靜態展示 (低分) vs 資料流狀態遷移與高風險 (高分)。

**決策條件**：
- **總分 <= 5 分 (且無單項極端高分)** ➡️ **啟動 LIGHT 模式 (Gemini CLI)**
- **總分 > 5 分 (或有重構/邏輯深度大於 8 分的項目)** ➡️ **啟動 HEAVY 模式 (Codex)**

*注意：評分結果與決定分流的結果必須輸出給使用者檢閱。*

### Phase 3：迭代式驗證循環 (Iterative Verification)

**規則：** 不論走到哪一個模式，**最高疊代次數為 5 次**。如果經過 5 次驗證和修復後，審查官仍回報有尚未收斂的錯誤，或者工具執行失敗，我會立刻停止運作，並匯報：「已達 5 次最大重試次數，仍有未收斂的問題。是否繼續嘗試，還是您決定親自接手？」

#### 模式 A: LIGHT 模式 (Gemini CLI)

1. **Verification Pass (驗證)**: 
   - 準備 verify_prompt.md 包含所有規格與任務，並指示 Gemini 為獨立驗證官，並使用搜索工具去 codebase 進行深度探索。
   - **如果 `STRESS_TEST_MODE = true`**: 在 prompt 末尾追加壓力測試驗證指令：
     ```
     === 壓力測試補充驗證 ===
     以下是此變更的壓力測試報告，請一併驗證：
     1. HIGH 風險 issues 是否在實作中被處理（有防禦性程式碼）？
     2. Test Matrix 中 P0 測試案例是否有對應的測試程式碼？
     <stress-test-report.md 完整內容>
     ```
   - 執行命令（優先採用非交互模式）：
     Get-Content $env:TEMP\verify_prompt.md -Raw | gemini -s -o $env:TEMP\verify_report.md
     # (或使用其他能順利輸出的 gemini cli 參數)
2. **Validation & Fix Pass (修復)**:
   - 若為真實缺漏 (REAL)，我立即修改原始碼補齊。
   - 若為誤判 (NOT REAL)，我記下反駁 (Refutation)，加入下一輪 prompt。
   - **壓力測試相關問題** (僅當 `STRESS_TEST_MODE = true`):
     - HIGH 風險 issue 未處理 → 視嚴重程度決定是否立即補齊防禦代碼。
     - P0 測試未覆蓋 → 標記為 WARNING。
     - 效能門檻風險 → 標記為 SUGGESTION。
3. **Re-verify (重新驗證)**:
   - 重複步驟，直到 Gemini 報告 0 個缺漏，或達到 5 次疊代。

#### 模式 B: HEAVY 模式 (Codex)

1. **Verification Pass (驗證)**:
   - 準備 verify_prompt.md，內容同上。
   - **如果 `STRESS_TEST_MODE = true`**: 同樣追加壓力測試驗證指令（與 LIGHT 模式相同格式）。
   - 執行命令：
     Get-Content $env:TEMP\verify_prompt.md -Raw | npx codex exec -s read-only -o $env:TEMP\verify_report.md -
2. 修復與重新驗證的邏輯與模式 A 完全相同，但由 Codex 取代進行更精密的代碼耦合度審查。最大疊代次數依然為 5 次。

### Phase 4：清理與完結報告

- 當成功達到 **Zero Errors** 或達最大次數中斷後，務必刪除 $env:TEMP 中產生的 verify_prompt.md 與 verify_report.md。
- 如果被中斷了，將剩餘清單與未能修復的難點整理輸出給使用者，讓他決定下一步。
- **如果 `STRESS_TEST_MODE = true`**: 在完結報告中加入一個專門的「壓力測試覆蓋摘要」區段，列出哪些 HIGH issues 被處理、哪些被推遲。

## Verification Dimensions (審核面向)

在給驗證官的 Prompt 中，至少要求包含以下面向的審查：
- **Completeness (完整性)**: tasks.md 每個單項都有程式碼實作佐證。
- **Correctness (正確性)**: 實體邏輯不與規格衝突。
- **Coherence (一致性)**: 不破壞原有專案架構與風格設定。
- **Stress Test Coverage (壓力測試覆蓋)** *(僅當 STRESS_TEST_MODE = true)*: 壓力測試中的 HIGH 風險 issues 已被處理，P0 測試案例有對應實作。
