---
description: 審查 OpenSpec 變更計畫（提案、規格、設計、任務）的關鍵問題與風險。使用 3 個內部審查子代理並進行最多 5 輪迭代收斂。
---

# Review Check 審查流程（3-Sub-agent 版）

此流程保留原本「rubric + artifacts + 迭代式修復/反駁」的精神，但**不再呼叫任何外部 Codex CLI**。

- 由 **Orchestrator（主代理）** 統籌：蒐集 artifacts → 組裝 review packet → 併行派發 3 位審查員 → 彙總/去重/分級 → 迭代修復/反駁 → 直到收斂。
- 由 **3 位 Review Sub-agents（內部子代理）** 進行獨立審查，模型固定為：
  - `gpt-5.3-codex`（xhigh）
  - `gpt-5.2`（xhigh）
  - `gpt-5.2-codex`（xhigh）

> [!IMPORTANT]
> Review Sub-agents **不得**呼叫任何 Codex 工具或外部 CLI；只能根據 Orchestrator 提供的 review packet 直接推理並產出報告。

---

## Inputs（輸入）

1. **Target change selection（目標變更選擇）**
   - 若使用者指定 change 名稱：直接使用。
   - 否則：選擇最近更新的 change（以檔案最後修改時間或變更清單為準）。

2. **Artifact collection（artifact 蒐集）**
   - 必須包含：proposal/specs/design/tasks 等該 change 下的所有核心 artifacts（以 OpenSpec 變更資料夾為準）。
   - 需將「路徑 + 完整內容」打包進 review packet（避免審查員自行讀檔/找檔造成偏差）。

3. **Optional stress-test artifact detection（可選：壓測 artifacts 偵測）**
   - 檢查以下任一是否存在，存在就納入 packet：
     - `openspec\\changes\\<name>\\stress-test-report.md`
     - `openspec\\changes\\<name>\\benchmark-harness.md`

---

## Step 1 — Build Review Packet（組裝審查封包）

Orchestrator 建立單一「review packet」文字資料（可為 Markdown 區塊），內容包含：

1. **Header / context**
   - change 名稱、輪次（Round 1..5）、日期時間
   - 本輪目標（例如：初審 / 驗證修復 / 回應反駁）

2. **Review rubric（審查標準）**
   - 內嵌 rubric（例如 5 大維度）
   - 指定嚴重度分級（與 rubric 一致）：`CRITICAL` / `WARNING` / `SUGGESTION`
   - 其他分類（非嚴重度）：`NOTE`（小瑕疵/措辭）與 `QUESTION`（需要補充資訊）

3. **Artifacts（完整內容）**
   - 逐檔提供：
     - `Artifact-ID`: 簡短穩定的 ID（例如 `A1`, `A2`…）
     - `Path`: 原始路徑
     - `Content`: 完整內文

4. **Stress-test artifacts（若存在）**
   - 同樣以 ID/Path/Content 方式附上
   - 並加上「壓測交叉驗證要求」：
     - 審查員需檢查：規格/設計/任務是否已涵蓋壓測揭露的風險與修復計畫

5. **Open issues backlog（跨輪次問題清單）**
   - 由 Orchestrator 維護，格式為「Issue-ID → 狀態」
   - 狀態：`open` / `fixed` / `refuted` / `needs-info`

6. **Refutations（反駁/澄清，跨輪次累積）**
   - 若上一輪判定為誤判，Orchestrator 需提供：
     - 被反駁的 Issue-ID
     - 反駁理由（必須引用 artifacts 片段或明確定位）
     - 本輪希望審查員重新判定的點（接受反駁 / 仍有風險 / 需要補充）

---

## Step 2 — Dispatch 3 Reviewers in Parallel（併行派發 3 位審查員）

Orchestrator 以同一份 review packet 同步派發給三位審查子代理（模型見上），每位審查員需：

- 僅根據 packet 內容審查（不得讀 repo、不得跑工具、不得假設額外上下文）。
- 嚴格套用 rubric，列出「可執行（actionable）」問題。
- 對每個問題提供：定位（artifact/path/章節）、證據、修正建議、嚴重度、信心分數。

---

## Step 3 — Structured Report Format（子代理輸出格式模板）

每位審查員必須輸出下列格式（Markdown）：

### Reviewer Metadata
- reviewer_model: <model>
- round: <1..5>
- change: <name>

### Executive Summary
- verdict: PASS | PASS_WITH_WARNINGS | BLOCKED
- top_risks: (最多 5 點)

### Actionable Issues
以清單輸出，每個 issue 必含：
- issue_id: <R{round}-{reviewer}-{seq}>（例如 `R2-5.3-01`）
- severity: CRITICAL | WARNING | SUGGESTION
- kind: NOTE | QUESTION (optional)
- location:
  - artifact_id: <A#>
  - path: <path>
  - anchor: <章節/標題/段落摘要>
- claim: <問題敘述>
- evidence: <引用/摘錄（短）>
- impact: <若不修會怎樣>
- recommendation: <具體建議>
- confidence: 0.0 - 1.0
- related_to: <如與 stress-test issue 或 backlog issue 關聯，填其 ID，否則省略>

### Refutation Check（若 packet 有 Refutations）
- accepted_refutations: [Issue-ID...]
- rejected_refutations: [Issue-ID...]（需說明為何反駁不足）
- needs_more_info: [Issue-ID...]

### Non-actionable Notes
- (可選) 觀察、改善建議，但不可阻塞

---

## Step 4 — Orchestrator Aggregation（彙總、去重、分級、分流）

Orchestrator 將三份報告彙總成「總審查報告」，並執行：

1. **Deduplication（去重）**
   - 以「同一問題（同一 artifact + 同一主張）」合併為單一 canonical issue。
   - 保留多位 reviewer 的不同證據/角度作為補充。

2. **Severity triage（嚴重度分級）**
   - 預設採「最嚴重優先」：任一 reviewer 判定為 `CRITICAL` → canonical 先視為 `CRITICAL`，直到被 refute 或修復驗證通過。

3. **Disagreement handling（分歧處理）**
   - 若 reviewer 間嚴重分歧（例如一人 CRITICAL、兩人 SUGGESTION）：
     - Orchestrator 必須回到 artifacts 找證據裁決。
     - 若無法裁決：先視為 `WARNING`（needs-info），並在下一輪要求補強 spec/design/tasks 的文字證據以消除歧義。

4. **Output backlog（跨輪次 backlog 更新）**
   - canonical issue 狀態更新：open/fixed/refuted/needs-info。

---

## Step 5 — Iterative Loop（最多 5 輪迭代收斂）

重複以下循環最多 5 次：

- **Phase A: Review（審查）**
  - Dispatch 三位 reviewer 並取得 structured reports。

- **Phase B: Fix or Refute（修復或反駁）**
  - 對 `open` 的 actionable issues：
    - **Fix**：直接修改對應 artifacts（proposal/spec/design/tasks）。
    - **Refute**：若判定誤判，加入 Refutations（必須引用 artifacts 證據）。
    - **Needs-info**：若資訊不足，補寫 artifacts 以消除歧義。

- **Phase C: Re-run（重新審查）**
  - 以更新後的 artifacts + backlog + refutations 重新組裝 packet 並再派發。

### Convergence Criteria（收斂條件）
- 當三位 reviewer 的彙總結果達到：
  - 未解決的 `CRITICAL`/`WARNING` 為 0（只剩 `SUGGESTION`/`NOTE` 可視為 PASS_WITH_WARNINGS）
  - 且 `Refutation Check` 不再提出新的反對
- 則結論為 `PASS` 或 `PASS_WITH_WARNINGS`。

### Non-convergence（未收斂處理）
- 若達到第 5 輪仍存在未解決的 `CRITICAL`/`WARNING`：
  1. Orchestrator 產出本 cycle 的結尾報告（列出仍未解決的 canonical issues + 下一步）。
  2. Orchestrator **自動開始下一個 cycle**（cycle+1，Round 從 1 重新計），沿用「更新後的 artifacts + backlog + refutations」繼續審查。
  3. 若問題本質上需要使用者決策/需求補齊，或跨 cycles 無實質進展（相同 CRITICAL/WARNING 重複出現），則標記為 `BLOCKED` 並明確列出需要的決策/資訊後停止。

---

## Final Output（最終輸出）

Orchestrator 需輸出：
- 最終 verdict：`PASS` / `PASS_WITH_WARNINGS` / `BLOCKED`
- canonical issues 清單（含狀態 fixed/refuted/open）
- 若有壓測 artifacts：提供「壓測交叉驗證」區段（指出每個壓測 issue 的對應 spec/design/tasks 覆蓋狀態）

> [!TIP]
> 反駁（Refutation）機制是降低誤判與模型分歧的關鍵：反駁必須帶引用證據，並在下一輪要求審查員明確標示 accepted/rejected。
