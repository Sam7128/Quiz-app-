# Severity Scoring Matrix

> Use this matrix to score every finding in the stress test report.
> Every finding MUST have an RPN score. Do NOT use subjective H/M/L labels without calculating the score first.

## Scoring Formula

```
RPN = Impact × Likelihood × Detectability
```

- **RPN** = Risk Priority Number (range: 1–125)
- Higher RPN = higher priority for mitigation

---

## Impact Scale (1–5)

| Score | Level | Definition | Examples |
|-------|-------|------------|----------|
| **5** | 🔴 Catastrophic | Data loss, security breach, complete system outage, regulatory violation | 用戶資料永久丟失；未授權存取所有帳戶；生產環境全面崩潰 |
| **4** | 🟠 Major | Significant feature failure, data corruption (recoverable), extended downtime (>1hr) | 核心功能完全失效但系統仍在運行；資料需要從備份恢復 |
| **3** | 🟡 Moderate | Feature degradation, partial data issues, brief downtime (<1hr) | 功能可用但效能嚴重退化；部分用戶受影響 |
| **2** | 🔵 Minor | Cosmetic issues, workaround available, minor UX degradation | 顯示錯誤但功能正常；有替代路徑可完成操作 |
| **1** | ⚪ Negligible | No user-visible impact, code quality concern only | 僅影響程式碼可讀性；日誌格式不一致 |

---

## Likelihood Scale (1–5)

| Score | Level | Definition | Trigger Conditions |
|-------|-------|------------|--------------------|
| **5** | 🔴 Almost Certain | Will occur in normal operation (>90% probability) | 正常使用流程中必然觸發；每次部署都會發生 |
| **4** | 🟠 Likely | Will occur frequently under typical conditions (60-90%) | 常見用戶行為會觸發；每週可能發生多次 |
| **3** | 🟡 Possible | May occur under specific conditions (30-60%) | 特定條件組合下會觸發；每月可能發生 |
| **2** | 🔵 Unlikely | Requires unusual circumstances (10-30%) | 需要罕見的操作序列或環境條件；每季可能發生 |
| **1** | ⚪ Rare | Requires extreme edge cases (<10%) | 僅在極端邊界條件下觸發；年度可能發生一次 |

---

## Detectability Scale (1–5, INVERTED — higher = harder to detect)

| Score | Level | Definition | Detection Method |
|-------|-------|------------|------------------|
| **5** | 🔴 Undetectable | No mechanism to detect before user impact | 無監控、無日誌、無告警；用戶投訴是唯一偵測管道 |
| **4** | 🟠 Low Detectability | Detection requires manual investigation or user report | 僅通過深入日誌分析或用戶回報才能發現 |
| **3** | 🟡 Moderate Detectability | Detected by existing monitoring but may be delayed | 現有告警可偵測但有延遲（>15min）；需要人工確認 |
| **2** | 🔵 High Detectability | Quickly detected by automated monitoring (<5min) | 自動告警在 5 分鐘內觸發；有清晰的錯誤日誌 |
| **1** | ⚪ Immediately Detectable | Caught by compile-time checks, linting, or CI/CD | 編譯錯誤、靜態分析、自動化測試即可捕獲 |

---

## RPN Classification Thresholds

| RPN Range | Classification | Color | Required Action |
|-----------|---------------|-------|-----------------|
| **75–125** | 🔴 **CRITICAL** | Red | 必須在實作前解決。需要計畫修訂或架構重新設計。不可接受的風險等級。 |
| **50–74** | 🟠 **HIGH** | Orange | 應在實作期間解決。需要明確的緩解策略和驗證測試。 |
| **25–49** | 🟡 **MEDIUM** | Yellow | 建議解決。應記錄為已知風險並安排後續處理。需要監控機制。 |
| **1–24** | 🔵 **LOW** | Blue | 可接受的風險。記錄並在未來迭代中考慮改善。 |

---

## Risk Register Table Format

Use this format in the stress test report:

| ID | Finding | Dimension | Impact | Likelihood | Detectability | RPN | Classification | Mitigation |
|----|---------|-----------|--------|------------|---------------|-----|----------------|------------|
| R-001 | [Description] | D1-D11 | 1-5 | 1-5 | 1-5 | [calc] | 🔴/🟠/🟡/🔵 | [Action] |

---

## Scoring Guidelines

### Do:
- Score each factor **independently** — do not let one factor bias another
- Use the **specific examples** in each scale as calibration anchors
- Consider the **production environment context** when scoring Likelihood
- Factor in **existing safeguards** when scoring Detectability (lower score if safeguards exist)
- Re-evaluate scores after **Cascading Failure Analysis** — cascading effects may increase Impact

### Do Not:
- Default to middle scores (3/3/3) to avoid making decisions — justify every score
- Score based on "how hard it is to fix" — that is separate from risk assessment
- Ignore low-RPN findings — they should still be documented in the risk register
- Use RPN as the sole prioritization — a finding with Impact=5, Likelihood=1, Detectability=1 (RPN=5) may still warrant urgent attention due to catastrophic potential

---

## Aggregate Health Score

After scoring all findings, calculate the **Plan Health Score**:

```
Health Score = 100 - (Sum of weighted deductions)

Deductions:
- Each CRITICAL finding:  -15 points
- Each HIGH finding:      -8 points
- Each MEDIUM finding:    -3 points
- Each LOW finding:       -1 point

Floor: 0 (minimum score)
```

| Score Range | Health Grade | Interpretation |
|-------------|-------------|----------------|
| 90–100 | 🟢 **A — Excellent** | 計畫穩健，可安全實作 |
| 75–89 | 🔵 **B — Good** | 計畫可行，需處理 HIGH 級發現 |
| 50–74 | 🟡 **C — Needs Work** | 計畫存在顯著風險，建議修訂後再實作 |
| 25–49 | 🟠 **D — Poor** | 計畫存在嚴重缺陷，必須大幅修訂 |
| 0–24 | 🔴 **F — Critical** | 計畫不可接受，需要從頭設計 |
