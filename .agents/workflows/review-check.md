---
description: 審查 OpenSpec 變更計畫（提案、規格、設計、任務）的關鍵問題與風險。使用 2 位獨立審查子代理並進行最多 5 輪迭代收斂。
---

# Review Check 審查流程

此流程由 **Orchestrator（主代理）** 統籌，派發 **2 位獨立審查子代理** 進行多輪迭代式深度審查，確保 OpenSpec 變更計畫在進入實作階段前達到可執行品質。

> [!IMPORTANT]
> - 審查子代理使用其**自身預設模型**（不指定特定模型），以 `xhigh` 等級運行。
> - 審查子代理**不得**呼叫任何工具、CLI、Codex 或檔案系統操作；只能根據 Orchestrator 提供的 review packet 直接推理並產出報告。

---

## Inputs（輸入）

### 1. 目標變更選擇

- 若使用者指定 change 名稱：直接使用。
- 否則：選擇最近更新的 change（以檔案最後修改時間或變更清單為準）。

### 2. Artifact 蒐集

必須讀取該 change 下的所有核心 artifacts：

| Artifact | 說明 | 必要性 |
|----------|------|--------|
| `proposal.md` | 提案：目標、動機、範圍定義 | 必要 |
| `specs/` | 規格：需求定義、邊界條件、驗收標準 | 必要 |
| `design.md` | 設計：架構決策、元件互動、資料流 | 必要 |
| `tasks.md` | 任務：實作步驟、依賴關係、驗證計畫 | 必要 |

需將**路徑 + 完整內容**打包進 review packet（避免審查員自行讀檔/找檔造成偏差）。

### 3. 可選壓測 Artifacts 偵測

檢查以下檔案是否存在，存在就納入 packet：
- `openspec\\changes\\<name>\\stress-test-report.md`
- `openspec\\changes\\<name>\\benchmark-harness.md`

---

## Step 1 — 組裝 Review Packet

Orchestrator 建立單一 review packet（Markdown 格式），內容結構如下：

### 1.1 Header / Context

```
- change_name: <變更名稱>
- round: <1..5>
- cycle: <cycle 編號>
- datetime: <ISO 8601>
- round_objective: <本輪目標：初審 / 驗證修復 / 回應反駁>
```

### 1.2 審查標準（Review Rubric）

**嚴重度分級**（用於判定問題的阻塞程度）：

| 等級 | 定義 | 處理方式 |
|------|------|---------|
| `CRITICAL` | 阻塞性問題：不修復則無法正確實作，或會導致嚴重的功能/資料錯誤 | 必須在下一輪前修復 |
| `WARNING` | 重要問題：不修復可能導致品質問題、返工或技術債 | 應修復，或提供充分的反駁理由 |
| `SUGGESTION` | 改進建議：可提升品質但非阻塞性 | 可選擇性採納 |

**補充分類**（非嚴重度）：

| 分類 | 定義 |
|------|------|
| `NOTE` | 小瑕疵/措辭/風格問題，不影響實作 |
| `QUESTION` | 需要使用者或計畫作者補充資訊才能判定的問題 |

### 1.3 Artifacts（完整內容）

逐檔提供，格式：

```
- Artifact-ID: <A1, A2, A3...>
- Path: <原始路徑>
- Content: <完整內文>
```

### 1.4 壓測 Artifacts（若存在）

同樣以 ID/Path/Content 方式附上，並加上**壓測交叉驗證指令**：

> 審查員需額外檢查：specs/design/tasks 是否已涵蓋壓測報告揭露的風險點與修復計畫。若壓測報告指出某個風險但 specs/design/tasks 未提及，應標記為 CRITICAL 或 WARNING。

### 1.5 Open Issues Backlog（跨輪次問題清單）

由 Orchestrator 維護，格式：

```
| Issue-ID | Severity | Status | Summary |
|----------|----------|--------|---------|
| R1-A-01  | CRITICAL | open   | ...     |
```

狀態值：`open` / `fixed` / `refuted` / `needs-info`

### 1.6 Refutations（反駁/澄清，跨輪次累積）

若上一輪有判定為誤判的 issue，Orchestrator 需提供：

```
- refuted_issue_id: <被反駁的 Issue-ID>
- refutation_reason: <反駁理由，必須引用 artifacts 片段或明確定位>
- reviewer_action_required: <希望審查員重新判定的方向：接受反駁 / 仍有風險 / 需要補充>
```

---

## Step 2 — 派發 2 位審查員（並行）

Orchestrator 以同一份 review packet 同步派發給兩位審查子代理。每位子代理使用其自身預設模型（不指定特定模型），以 `xhigh` 等級運行。

---

### 審查員 A —「結構與邏輯一致性審查員」

**角色定位**：作為一位嚴謹的**系統架構師**，從計畫的內部邏輯結構出發，確保從 proposal → specs → design → tasks 的完整追溯鏈不存在斷裂、矛盾或遺漏。

**審查維度與具體檢查項**：

#### A-1. 需求完整性（Requirement Completeness）
- proposal 中聲明的**每個目標/功能**，是否在 specs 中有**對應的需求定義**？
- 每個需求是否有**明確、可測試的驗收標準**（非模糊描述如「應表現良好」）？
- 是否存在 proposal 提及但 specs 完全遺漏的功能或場景？
- specs 中是否有**未被 proposal 支持的需求**（scope creep）？

#### A-2. 設計覆蓋度（Design Coverage）
- specs 中的**每個需求**，是否在 design 中有**對應的架構元件或實作方案**？
- design 是否遺漏了任何需求的實作路徑？
- design 中的元件/模組劃分是否與 specs 的需求邊界一致？

#### A-3. 任務追溯性（Task Traceability）
- design 中的**每個架構決策**，是否在 tasks 中有**對應的實作步驟**？
- tasks 中的每個任務是否能**向上追溯**到具體的 design 決策或 spec 需求？
- 是否有**孤兒任務**（無法追溯到任何需求的任務）或**孤兒需求**（無任務覆蓋的需求）？

#### A-4. 跨 Artifact 邏輯一致性（Cross-Artifact Consistency）
- artifacts 之間是否存在**直接矛盾**？（例如：proposal 說「支援離線模式」但 design 假設「永遠在線」）
- **術語**使用是否一致？同一概念在不同 artifacts 中是否用了不同名稱？
- **數值/參數**是否一致？（例如：specs 說「最多 100 條」但 design 寫「上限 50」）
- **假設**是否一致？（例如：specs 假設有資料庫，design 假設純檔案系統）

#### A-5. 依賴與順序合理性（Dependency & Ordering）
- tasks 的**執行順序**是否合理？是否存在**循環依賴**？
- **先決條件**是否已明確列出？是否有任務依賴了尚未定義的元件？
- 跨任務的**介面契約**是否已在 design 中定義清楚？

#### A-6. 邊界條件與異常處理（Edge Cases & Error Handling）
- specs 是否定義了**錯誤處理行為**、**邊界情況**、**極端輸入**的預期行為？
- design 是否涵蓋了這些邊界條件的**具體處理方案**（而非僅說「需處理」）？
- tasks 中是否有**對應的測試步驟**來驗證邊界條件？

---

### 審查員 B —「可行性與風險評估審查員」

**角色定位**：作為一位經驗豐富的**技術主管（Tech Lead）**，從實際工程落地的角度審查計畫，確保計畫不僅邏輯自洽，而且在真實開發環境中可行、可維護、風險可控。

**審查維度與具體檢查項**：

#### B-1. 技術可行性（Technical Feasibility）
- 設計方案在目標**技術棧/語言/框架**中是否可行？
- 是否依賴了**不存在、已棄用、不穩定或有已知重大 Bug**的 API/工具/函式庫？
- **效能假設**是否合理？（例如：「即時處理 100 萬筆紀錄」是否在單執行緒下可實現？）
- 是否有**平台限制**被忽略？（例如：瀏覽器安全策略、作業系統權限、網路限制）

#### B-2. 實作充分性（Implementation Sufficiency）
- tasks 的**粒度**是否足夠讓開發者直接開始編碼？還是存在過於籠統的步驟？
- 是否存在**模糊步驟**？（例如：「處理錯誤情況」但未說明具體策略；「優化效能」但未指定目標指標）
- 每個任務的**輸入/輸出**是否明確定義？
- **估計的工作量**（若有）是否合理？

#### B-3. 風險識別與緩解（Risk Identification & Mitigation）
- 是否存在**單點故障**？（例如：整個系統依賴一個外部服務，該服務掛了怎麼辦？）
- 是否有**未被計畫涵蓋的已知風險類別**？（安全性、效能瓶頸、資料一致性、併發問題）
- 是否存在**樂觀假設**？（假設一切順利但未規劃備案/降級策略）
- 計畫是否考慮了**失敗恢復機制**？

#### B-4. 向後相容性與影響範圍（Backward Compatibility & Impact Scope）
- 變更是否會**破壞現有功能**或現有使用者的工作流程？
- 是否需要**資料遷移**？若需要，遷移策略是否在 tasks 中定義？
- 是否影響其他模組的**公開介面（API contract）**？
- 是否需要**版本控制策略**或過渡期？

#### B-5. 冗餘與過度設計（Redundancy & Over-Engineering）
- 是否有**重複的任務**或**重疊的設計元件**？
- 是否有可以**合併或簡化**的步驟？
- 是否存在**過度設計**（例如：為目前不需要的擴展性增加大量抽象層）？
- YAGNI（You Ain't Gonna Need It）原則是否被遵守？

#### B-6. 驗證計畫品質（Verification Plan Quality）
- tasks 中的**驗證步驟**是否具體、可執行？（而非「測試所有功能」這類模糊描述）
- 驗證步驟是否**涵蓋了 specs 中定義的所有驗收標準**？
- 是否有**遺漏的測試場景**？（正常路徑、錯誤路徑、邊界條件、併發、效能）
- 驗證方法是否**適合自動化**？是否需要手動驗證的部分已被標記？

---

### 子代理共通鐵律

> [!CAUTION]
> 以下規則為**絕對鐵律**，違反任一條即視為審查無效：

1. **禁止工具呼叫**：審查子代理**不得**呼叫任何工具、CLI、Codex 或檔案系統操作。只能根據 review packet 中提供的內容進行推理。
2. **必須提供證據**：每個發現**必須**引用 artifact 中的具體段落、章節標題或原文摘錄作為證據。禁止無根據的主張。
3. **禁止憑空指控**：不得聲稱「某功能遺漏」但無法指出應在哪個 artifact 的哪個位置出現。
4. **嚴格依照審查維度**：必須按照上述定義的維度進行審查，不得跳過任何維度。
5. **獨立審查**：不得假設或引用另一位審查員的結論。

---

## Step 3 — 子代理輸出格式（Structured Report Template）

每位審查員**必須嚴格**輸出以下格式（Markdown）：

```markdown
## Reviewer Metadata
- reviewer_role: <結構與邏輯一致性審查員 | 可行性與風險評估審查員>
- round: <1..5>
- change: <change name>

## Executive Summary
- verdict: PASS | PASS_WITH_WARNINGS | BLOCKED
- top_risks: (最多 5 點，每點一句話概述)

## Dimension Coverage
（列出所有 6 個審查維度，標示每個維度的審查結果：✅ 無問題 / ⚠️ 有 WARNING / ❌ 有 CRITICAL）

## Actionable Issues
（每個 issue 必含以下全部欄位，缺少任何欄位視為格式不合規）

- issue_id: <R{round}-{reviewer_letter}-{seq}>（例如 R1-A-01, R2-B-03）
- severity: CRITICAL | WARNING | SUGGESTION
- dimension: <對應的審查維度編號，例如 A-1, B-3>
- location:
  - artifact: <artifact 檔名>
  - section: <章節標題或具體行號範圍>
- claim: <問題的精確敘述，一句話說明什麼地方有什麼問題>
- evidence: <從 artifact 中逐字引用的原文摘錄，或精確的段落摘要>
- impact: <若不修復，具體會導致什麼後果，用場景描述>
- recommendation: <具體、可操作的修復建議，應明確到可以直接執行>
- confidence: <0.0 - 1.0，反映證據充分程度和判斷把握度>
- related_to: <如與壓測 issue 或 backlog issue 關聯，填其 ID，否則省略>

## Refutation Check（若 packet 中包含 Refutations）
- accepted_refutations: [Issue-ID...]（接受反駁，問題關閉）
- rejected_refutations: [Issue-ID...]（拒絕反駁，需說明反駁不足的具體原因）
- needs_more_info: [Issue-ID...]（反駁方向正確但證據不足，需要補充什麼）

## Non-actionable Notes
（可選：純觀察或風格建議，明確標示為不阻塞審查進程）
```

---

## Step 4 — Orchestrator 彙總與裁決

Orchestrator 將兩份報告彙總成「總審查報告」，並執行以下操作：

### 4.1 去重（Deduplication）

- 以「同一 artifact + 同一章節 + 同一主張」為基準合併為單一 **canonical issue**
- 保留兩位 reviewer 的不同證據/角度作為補充視角
- 合併後的 canonical issue 取**更嚴重的嚴重度**

### 4.2 嚴重度裁決（Severity Triage）

- **預設原則**：任一 reviewer 判定為 `CRITICAL` → canonical issue 先視為 `CRITICAL`，直到被反駁或修復驗證通過
- **分歧處理**：若兩位 reviewer 對同一問題的嚴重度分歧顯著（例如一人 CRITICAL、一人 SUGGESTION）：
  1. Orchestrator **必須**回到 artifact 原文找證據裁決
  2. 若證據明確支持某一方 → 採該方判定
  3. 若無法裁決 → 先視為 `WARNING`（needs-info），下一輪要求補強 specs/design/tasks 的文字證據以消除歧義

### 4.3 分流處理（Action Routing）

對每個 canonical issue，Orchestrator 決定處理方式：

| 處理方式 | 條件 | 動作 |
|---------|------|------|
| **Fix** | 問題確實存在，且可直接修改 artifacts 解決 | 直接修改 proposal/specs/design/tasks |
| **Refute** | 判定為誤判（審查員誤解或忽略了某段內容） | 撰寫帶引用證據的反駁，加入下一輪 packet |
| **Needs-info** | 問題可能存在但資訊不足以判定 | 補寫 artifacts 以消除歧義，或標記需要使用者輸入 |

### 4.4 Backlog 更新

維護跨輪次的 canonical issue 狀態清單：

```
| Canonical-ID | Source Issues | Severity | Status    | Resolution |
|-------------|---------------|----------|-----------|------------|
| C-001       | R1-A-01       | CRITICAL | fixed     | 修改了 design.md 的 X 章節 |
| C-002       | R1-A-03, R1-B-02 | WARNING | refuted | 見反駁 REF-002 |
```

---

## Step 5 — 迭代收斂循環（最多 5 輪）

重複以下三階段循環，每個 cycle 最多 5 輪：

### Phase A: 審查（Review）
- 以當前版本的 review packet 派發兩位 reviewer
- 取得 structured reports

### Phase B: 修復或反駁（Fix or Refute）
- 對所有 `open` 的 actionable issues：
  - **Fix**：直接修改對應 artifacts（必須記錄修改內容）
  - **Refute**：加入 Refutations（必須引用 artifacts 原文作為證據）
  - **Needs-info**：補寫 artifacts 以消除歧義

### Phase C: 重新組裝與派發（Reassemble & Re-dispatch）
- 以更新後的 artifacts + backlog + refutations 重新組裝 packet
- 進入下一輪 Phase A

### 收斂條件（Convergence Criteria）

當以下**全部**條件同時滿足時，審查結束：

1. 兩位 reviewer 的彙總結果中，未解決的 `CRITICAL` 為 **0**
2. 未解決的 `WARNING` 為 **0**（只剩 `SUGGESTION`/`NOTE` 可接受）
3. Refutation Check 不再提出新的 `rejected_refutations`
4. 結論為 `PASS` 或 `PASS_WITH_WARNINGS`

### 未收斂處理（Non-convergence）

若達到第 5 輪仍存在未解決的 `CRITICAL`/`WARNING`：

1. Orchestrator 產出本 cycle 的**結尾報告**（列出仍未解決的 canonical issues + 已嘗試的修復/反駁 + 下一步計畫）
2. Orchestrator **自動開始下一個 cycle**（cycle+1，Round 從 1 重新計），沿用「更新後的 artifacts + backlog + refutations」繼續審查
3. **停止條件**：若跨 cycle 無實質進展（相同 CRITICAL/WARNING 在連續 2 個 cycle 中重複出現且無法解決），則標記為 `BLOCKED` 並明確列出需要的使用者決策/資訊後停止

### 停滯策略（Stagnation Strategy）

若連續 2 輪無進展（相同問題原封不動出現），Orchestrator 必須改變策略：

- 請求使用者提供**缺失的上下文或需求澄清**
- 提出**替代設計方案**供使用者選擇
- 重新界定問題的**範圍或優先級**
- 明確詢問審查員**什麼證據能改變其判定**

---

## Final Output（最終輸出）

Orchestrator 產出最終審查報告，包含以下完整結構：

### 1. 最終裁決

```
verdict: PASS | PASS_WITH_WARNINGS | BLOCKED
total_rounds: <總輪數>
total_cycles: <總 cycle 數>
```

### 2. Canonical Issues 清單

列出所有 canonical issues 的最終狀態與處理軌跡：

```
| ID    | Severity | Final Status | Resolution Summary |
|-------|----------|-------------|-------------------|
| C-001 | CRITICAL | fixed       | 修改了 design.md ... |
| C-002 | WARNING  | refuted     | 見 REF-002 ...     |
| C-003 | CRITICAL | open        | 需要使用者決策 ... |
```

### 3. 壓測交叉驗證（若有壓測 Artifacts）

指出每個壓測 issue 在 specs/design/tasks 中的覆蓋狀態：

```
| Stress-Test Issue | Covered in Specs? | Covered in Design? | Covered in Tasks? | Status |
|-------------------|-------------------|--------------------|--------------------|--------|
| ST-001            | ✅                | ✅                 | ❌                 | open   |
```

### 4. 修改摘要

列出本次審查中對哪些 artifacts 做了哪些修改：

```
| Artifact | Round | Modification Summary |
|----------|-------|---------------------|
| design.md | R2   | 新增錯誤處理章節 ... |
| tasks.md  | R3   | 補充任務 T-5 的驗證步驟 ... |
```

---

> [!TIP]
> **反駁（Refutation）機制**是降低誤判與模型分歧的關鍵：反駁必須帶引用證據，並在下一輪要求審查員明確標示 accepted/rejected。高品質的反駁能顯著加速收斂。
