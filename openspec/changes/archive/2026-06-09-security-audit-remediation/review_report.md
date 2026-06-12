# OpenSpec Plan Review Report: security-audit-remediation

> **審查輪次**：Round 3 (收斂完成)
> **審查日期**：2026-06-09
> **審查結論 (Verdict)**：🟢 **PASS**

---

## 1. 審查摘要與結論

本變更計畫（`security-audit-remediation`）旨在系統性地修復 MindSpark 前後端應用的 13 個安全性與品質漏洞。
Orchestrator 派發了兩位獨立審查子代理進行了 3 輪的深度安全稽核與規格一致性交叉驗證：
- **SecurityAuditReviewerA** (安全防禦與邏輯健壯性)：🟢 **PASS**
- **SecurityAuditReviewerB** (規格一致性與壓測覆蓋度)：🟢 **PASS**

計畫中所有曾被揭露的 Critical、High 與 Medium 風險均已獲得妥善設計與修復，且實作步驟與自動化壓測基準完全對齊，無任何未決的 WARNING 或 CRITICAL 問題，正式達到發佈標準。

---

## 2. Canonical Issues 彙整與修復狀態

| Issue ID | 嚴重度 | 描述 | 影響範圍 | 修復狀態與對應位置 |
|:---|:---|:---|:---|:---|
| **R1-A-01 / R2-A-01** | 🟠 WARNING | `useBattleSystem` 與 `useAchievements` hook 異步初始化期間缺乏狀態保護，可能導致舊存檔被初始預設值覆蓋。 | 遊戲存檔、成就模組 | **fixed**<br>· 在 design D9 與 tasks 6.2、6.3 中加入 `isInitialized` 寫入防禦保護。<br>· 狀態變更函數首行強制 `if (!isInitialized) return;`。<br>· 載入期間 UI 顯示 Skeleton 以防用戶提前操作。 |
| **R1-A-02** | 🟠 WARNING | Supabase RPC 聯賽分數提交 `submit_challenge_score` 存在 IDOR 與分數偽造風險。 | 聯賽排行榜、安全機制 | **fixed**<br>· 於 specs 與 tasks 2.2 加入 SQL 身分校驗 `auth.uid() = user_id OR auth.uid() = friend_id` 防禦 IDOR。<br>· SQL 中對分數 `p_score` 進行合理範圍與上限限制（如限制在合理題庫總分範圍內）。 |
| **R1-A-03** | 🟠 WARNING | API Key 解密失敗時清除 storage 範圍過大，若實作錯誤可能清空所有本地資料。 | 用戶本機資料安全 | **fixed**<br>· 於 specs 與 tasks 5.3 中明確限定清除範圍為 `removeItem('mindspark_ai_config')`。<br>· 嚴禁呼叫 `localStorage.clear()` 損害其他本地數據。 |
| **R1-A-04** | 🟠 WARNING | Promise 寫入隊列缺乏異常防禦，單次寫入失敗可能導致後續存檔鎖死。 | 戰鬥存檔、持久化隊列 | **fixed**<br>· 於 design D10 與 tasks 6.2 中規定寫入任務必須包裹在 try/catch 與 `.catch()` 中。<br>· 不論寫入成功與否，皆釋放隊列鎖並 resolve，防止死鎖。 |
| **R1-A-05 / R1-B-04** | 🔵 SUGGESTION | HMAC 硬編碼鹽值防篡改能力有限，防禦邊界未明示，可能導致後續開發者過度信任。 | 程式碼可維護性 | **fixed**<br>· 於 specs 與 tasks 6.1 中要求在 `utils/integrityCheck.ts` 頂部加入註解。<br>· 明示本機 HMAC 為「防君子不防小人」之完整性校驗，不可用於高敏感數據。 |
| **R1-B-01** | 🔴 CRITICAL | 實作任務中完全遺漏了 `benchmark-harness.md` 中規畫的 Playwright 連點壓測、RPC 攔截與寫入競爭等全局驗證步驟。 | 自動化測試與壓測 | **fixed**<br>· 於 `tasks.md` 15.2.1 補齊連點防護、RPC 阻斷 fail-fast 拋錯、以及 100ms 內高頻攻擊寫入競爭的 Playwright 自動化 E2E 驗證任務。 |
| **R1-B-02** | 🔴 CRITICAL | `getAIConfig` 改為 `async` 後，`tasks.md` 遺漏了 React 元件（如 `AIConfigPanel.tsx`）的 `isLoading` / Skeleton 載入狀態管理任務，易導致白屏。 | UI 渲染與性能 | **fixed**<br>· 於 tasks 5.4 處新增 React 元件層級的 `isLoading` state 與 Skeleton UI 實作步驟。 |
| **R1-B-03** | 🟠 WARNING | `specs/battle-mode/spec.md` 遺漏了答題發生網絡或 API 異常時釋放 `isSubmittingRef` 鎖的 Scenario 規格定義。 | 答題提交防護 | **fixed**<br>· 於 `specs/battle-mode/spec.md` 補齊 `Scenario: Submit error lock release` 規格。 |
| **R1-B-05** | 🔵 SUGGESTION | 規格書（battle-mode spec）中的 fallback 方法名與 tasks.md 的實作代碼不一致。 | 規格與代碼一致性 | **fixed**<br>· 將規格書內 `getRandomMonster('normal')` 修改為 `getMonstersByDifficulty('normal')` 與 tasks.md 完全對齊。 |
| **R1-B-06** | 🟠 WARNING | 任務中漏掉為 `banks` 與 `friendships` 撰寫 Supabase RLS 安全政策配置 SQL 腳本的任務。 | 後端雲端安全 | **fixed**<br>· 於 `tasks.md` 2.3 新增建立 `supabase_rls_policies.sql` 指引文檔的任務，指導後端 RLS 政策的部署。 |

---

## 3. 壓力測試基準交叉驗證 (Stress Test Cross-Validation)

根據 `benchmark-harness.md` 規劃之效能指標與故障注入場景，變更計畫已達成完整覆蓋：

1. **答題連點防護壓測 (Scenario C: Peak Load)**
   - **防禦機制**：`isSubmittingRef` 同步鎖。
   - **覆蓋狀態**：`specs/battle-mode/spec.md` (Scenario: Rapid double-click & Scenario: Submit error lock release) 與 `tasks.md` Task 7.1 / Task 15.2.1 (Playwright 自動連點驗證)。
2. **挑戰分數提交 RPC 阻斷與 Fail-Fast (Scenario E: Chaos)**
   - **防禦機制**：強制 Supabase RPC 並拒絕前端 fallback。
   - **覆蓋狀態**：`specs/supabase-security-hardening/spec.md` (Scenario: RPC failure - fail-fast) 與 `tasks.md` Task 2.1 / Task 15.2.1 (Playwright 網路阻斷 `/rpc/...` 並驗證 fail-fast 錯誤拋出，不發送傳統 UPDATE 請求)。
3. **高頻狀態寫入競爭 (Scenario B: Steady-State)**
   - **防禦機制**：Zustand 與 WebCrypto 簽名 Promise Queue 序列化排隊。
   - **覆蓋狀態**：`design.md` D10、`tasks.md` Task 6.2 (Promise Queue) 與 Task 15.2.1 (Playwright 模擬 100ms 內觸發 5 次更新並於重整後通過驗證)。

---

## 4. 下一步計畫

變更計畫現已完全修復收斂並通過子代理安全稽核。此報告已存檔。
請用戶進行審查並核准此實作計畫。核准後，我們將進入實作執行階段 (Execution Phase) 開始修改代碼。
