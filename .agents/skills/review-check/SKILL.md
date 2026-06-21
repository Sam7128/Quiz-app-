---
name: review-check
description: Iteratively review OpenSpec change plans for feasibility, logical conflicts, and risk. Use when a plan needs an expert audit before implementation.
---

# Review Check — OpenSpec 計畫審查技能

使用**兩位獨立審查子代理**對 OpenSpec 變更計畫進行多輪迭代式深度審查，直到計畫達到可實作品質。

> [!IMPORTANT]
> 本技能的目標是**在實作之前**發現計畫中的邏輯缺陷、遺漏、矛盾和風險，避免在編碼階段才發現設計問題導致返工。

---

## 觸發條件

當以下任一情況出現時，應使用本技能：

- 使用者明確要求審查/review 一個 OpenSpec 變更計畫
- 變更計畫已產出 proposal/specs/design/tasks 等 artifacts，準備進入實作階段前的品質把關
- 使用者對計畫的可行性、完整性或風險存疑

---

## 完整工作流程

### Phase 0 — 蒐集 Artifacts

1. **定位目標變更**：若使用者指定 change 名稱則直接使用，否則選擇最近更新的 change。
2. **讀取所有核心 artifacts**：
   - `proposal.md`（提案：目標、動機、範圍）
   - `specs/`（規格：需求定義、邊界條件、驗收標準）
   - `design.md`（設計：架構決策、元件互動、資料流）
   - `tasks.md`（任務：實作步驟、依賴關係、驗證計畫）
3. **偵測可選的壓測 artifacts**（若存在則一併納入）：
   - `stress-test-report.md`
   - `benchmark-harness.md`
4. **將所有 artifact 的完整內容打包為 review packet**，附上路徑與內容，確保審查員無需自行讀檔。

### Phase 1 — 派發兩位獨立審查子代理

以同一份 review packet **並行派發**給兩位審查子代理。每位子代理使用其自身預設模型（不指定特定模型），以 `xhigh` 等級運行。

#### 審查員 A — 「結構與邏輯一致性審查員」

**核心職責**：從**計畫的內部邏輯與結構完整性**角度進行審查。

**審查維度與具體檢查項**：

| 維度 | 具體檢查項 |
|------|-----------|
| **需求完整性** | 每個 proposal 中聲明的目標，是否在 specs 中有對應的需求定義？每個需求是否有明確的驗收標準？是否存在 proposal 提及但 specs 遺漏的功能？ |
| **設計覆蓋度** | 每個 spec 需求，是否在 design 中有對應的架構/元件設計？設計是否遺漏了任何需求的實作方案？ |
| **任務追溯性** | 每個 design 決策，是否在 tasks 中有對應的實作步驟？tasks 中的每個任務是否能追溯回具體的 design 決策或 spec 需求？是否有「孤兒任務」（無法追溯到任何需求的任務）？ |
| **邏輯一致性** | artifacts 之間是否存在矛盾？（例如：proposal 說「支援離線」但 design 假設「永遠在線」）。術語使用是否一致？同一概念在不同 artifacts 中是否用了不同名稱？ |
| **依賴與順序** | tasks 的執行順序是否合理？是否存在循環依賴？先決條件是否已明確列出？ |
| **邊界條件** | specs 是否定義了錯誤處理、邊界情況、極端輸入的行為？design 是否涵蓋了這些邊界條件的處理方案？ |

#### 審查員 B — 「可行性與風險評估審查員」

**核心職責**：從**實際可行性、技術風險與實作品質**角度進行審查。

**審查維度與具體檢查項**：

| 維度 | 具體檢查項 |
|------|-----------|
| **技術可行性** | 設計方案在目標技術棧中是否可行？是否依賴了不存在、已棄用或不穩定的 API/工具/函式庫？效能假設是否合理？ |
| **實作充分性** | tasks 的粒度是否足夠讓開發者直接開始編碼？是否存在「模糊步驟」（例如「處理錯誤情況」但未說明具體策略）？估計的工作量是否合理？ |
| **風險識別** | 是否存在單點故障？是否有未被計畫涵蓋的已知風險？是否存在「樂觀假設」（假設一切順利但未規劃備案）？ |
| **向後相容性** | 變更是否會破壞現有功能？是否需要資料遷移？是否影響其他模組的介面？ |
| **冗餘與效率** | 是否有重複的任務或設計？是否有可以合併或簡化的步驟？是否過度設計（over-engineering）？ |
| **驗證計畫品質** | tasks 中的驗證步驟是否具體可執行？是否涵蓋了 specs 中定義的驗收標準？是否有遺漏的測試場景？ |

#### 子代理共通規則

> [!CAUTION]
> 以下規則為**鐵律**，子代理必須嚴格遵守：

- **禁止工具呼叫**：審查子代理**不得**呼叫任何工具、CLI、Codex 或檔案系統操作。只能根據 review packet 中提供的內容進行推理。
- **必須提供證據**：每個發現**必須**引用 artifact 中的具體段落、章節標題或原文摘錄作為證據。禁止無根據的主張。
- **禁止憑空指控**：不得聲稱「某功能遺漏」但無法指出應在哪個 artifact 的哪個位置出現。
- **嚴重度分級**：每個問題必須標註嚴重度：
  - `CRITICAL`：阻塞性問題，不修復則無法正確實作
  - `WARNING`：重要問題，不修復可能導致品質問題或返工
  - `SUGGESTION`：改進建議，非阻塞性
- **信心分數**：每個問題附上 0.0–1.0 的信心分數，反映證據的充分程度

#### 子代理輸出格式

每位審查員必須嚴格輸出以下格式：

```markdown
## Reviewer Metadata
- reviewer_role: <結構與邏輯一致性審查員 | 可行性與風險評估審查員>
- round: <1..5>
- change: <change name>

## Executive Summary
- verdict: PASS | PASS_WITH_WARNINGS | BLOCKED
- top_risks: (最多 5 點，每點一句話)

## Actionable Issues
（每個 issue 必含以下欄位）
- issue_id: <R{round}-{reviewer_letter}-{seq}>（例如 R1-A-01）
- severity: CRITICAL | WARNING | SUGGESTION
- location:
  - artifact: <artifact 檔名>
  - section: <章節標題或行號範圍>
- claim: <問題的精確敘述>
- evidence: <從 artifact 中引用的原文摘錄或段落摘要>
- impact: <若不修復，具體會導致什麼後果>
- recommendation: <具體、可操作的修復建議>
- confidence: <0.0 - 1.0>

## Refutation Check（若 packet 中包含反駁）
- accepted_refutations: [Issue-ID...]
- rejected_refutations: [Issue-ID...]（需說明反駁不足的原因）
- needs_more_info: [Issue-ID...]

## Non-actionable Notes
（可選：觀察或風格建議，不阻塞審查）
```

### Phase 2 — 主代理彙總與裁決

Orchestrator 收回兩份報告後執行：

1. **去重（Deduplication）**：
   - 將指向同一 artifact 同一問題的發現合併為單一 canonical issue
   - 保留不同審查員的證據與角度作為補充

2. **嚴重度裁決**：
   - 採「最嚴重優先」原則：任一審查員判定為 `CRITICAL` → canonical issue 先視為 `CRITICAL`
   - 若兩位審查員嚴重度分歧（例如一人 CRITICAL、一人 SUGGESTION）：
     - 回到 artifact 原文找證據裁決
     - 若無法裁決：視為 `WARNING`（needs-info），下一輪要求補強

3. **分流處理**：對每個 canonical issue 決定：
   - **Fix（修復）**：直接修改對應 artifacts
   - **Refute（反駁）**：若判定為誤判，撰寫帶引用證據的反駁
   - **Needs-info（需補充）**：補寫 artifacts 以消除歧義

4. **更新 Backlog**：維護跨輪次的 issue 狀態清單（open / fixed / refuted / needs-info）

### Phase 3 — 迭代收斂（最多 5 輪）

重複 Phase 1 → Phase 2 的循環，每輪以更新後的 artifacts + backlog + refutations 重新組裝 packet。

**收斂條件**：
- 兩位審查員的彙總結果中，未解決的 `CRITICAL` 和 `WARNING` 為 0
- 且 Refutation Check 不再提出新的反對
- 結論為 `PASS` 或 `PASS_WITH_WARNINGS`

**未收斂處理**：
- 若達到第 5 輪仍有未解決的 `CRITICAL`/`WARNING`：
  1. 產出本 cycle 的結尾報告
  2. **自動開始下一個 cycle**（Round 從 1 重新計），沿用更新後的 artifacts 繼續審查
  3. 若跨 cycle 無實質進展（相同問題重複出現），標記為 `BLOCKED` 並列出需要的使用者決策後停止

**停滯處理**：
- 若連續 2 輪無進展（相同問題原封不動），必須改變策略：
  - 請求使用者提供缺失的上下文
  - 提出替代方案供使用者選擇
  - 重新界定問題的範圍

### Phase 4 — 最終輸出

產出最終審查報告，包含：

1. **最終裁決**：`PASS` / `PASS_WITH_WARNINGS` / `BLOCKED`
2. **Canonical Issues 清單**：每個 issue 的最終狀態（fixed / refuted / open）及處理軌跡
3. **壓測交叉驗證**（若有壓測 artifacts）：指出每個壓測 issue 在 specs/design/tasks 中的覆蓋狀態
4. **修改摘要**：列出本次審查中對哪些 artifacts 做了哪些修改

---

## 護欄（Guardrails）

- 每個 cycle 最多 5 輪；未收斂則自動開始新 cycle
- 審查發現**必須**包含具體證據（引用原文或指向確切章節）
- 絕不在無證據的情況下聲稱重複或遺漏
- 反駁必須帶引用證據，且下一輪要求審查員明確標示 accepted/rejected
- 子代理**絕對禁止**呼叫任何工具或外部命令
