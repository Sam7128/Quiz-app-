# 最終獨立審計報告：fix-p0-core-experience-and-security

- **審計角色**：第三位獨立仲裁審計員（Arbiter，ID: `arbiter-R7QK`）
- **審計日期**：2026-09-29
- **審計對象**：`openspec/changes/fix-p0-core-experience-and-security`（5 項 P0 修復：SM-2 到期入口、快捷鍵修飾鍵/IME、本地時區日期、登出雙 Storage 清理、BattleArena 緊湊佈局）
- **審計方法**：openspec-verify-change 規格對齊 + 偽綠燈極端分支攻擊推演 + ponytail-audit（YAGNI/不可達代碼）+ ponytail-debt 帳簿 + 全部品質閘門獨立復跑
- **最終判決**：🟡 **CONDITIONAL PASS（有條件通過）**
  - **阻塞級邏輯缺陷（CRITICAL）：0 項**
  - WARNING：8 項（其中 3 項為前兩份審計未發現的新發現）
  - 交付型流程事項（待提交確認）：1 項（git commit 未執行，**非**代碼缺陷）
  - 證據缺口（已勾選任務但無可重播證據）：3 項

> **與前兩份審計的分歧裁定**：`audit_inquisitor_7128.md` 判定「PASS、零偽綠燈、規格 100% 落地且無違背」——**該結論過度樂觀，本審計不予背書**（反證見 W1、W4）。`audit_K7M4.md` 判定 Conditional Pass——本審計同意其框架，但補充其遺漏的 4 項新發現（W1/W4/W6/W7）。

---

## 0. 獨立復跑之品質閘門（非引用自檢聲明，全部由本審計員親自執行）

| 閘門 | 指令 | 結果 |
|:---|:---|:---|
| 型別檢查 | `npx tsc --noEmit` | ✅ 退出碼 0 |
| 單元測試 | `npm test` | ✅ 57 files / **392 tests** 全綠（7.61s） |
| 生產建置 | `npm run build` | ✅ built in 5.30s（既有 `vendor-ui-core` 1.29MB chunk 警告仍在，屬 RISK-002 既有債，非本次引入） |
| E2E 定向抽查 | `npx playwright test battle-flow quiz-flow` | ✅ **7 passed**（46.8s）——battle-flow 為本次 CSS 修改之直接迴歸面 |
| 死代碼掃描 | `npx -y knip --reporter compact` | ✅ 無輸出（0 issues） |

---

## 1. OpenSpec 規格與實作對齊（openspec-verify-change）

### 1.1 完成度
- artifacts 齊全：`proposal.md`、`design.md`、`tasks.md`、`benchmark-harness.md`、5 個 delta spec。
- `tasks.md` **26/26** 全部 `[x]`，逐項核對與代碼相符（見 §1.2）。
- `types.ts:83`、`types/battleTypes.ts:370` mode 聯合型別均擴展 `'spaced_due'`。

### 1.2 正確性核對（抽樣列舉關鍵項）

| Spec Requirement | 實作證據 | 判定 |
|:---|:---|:---:|
| spaced_due 全題庫載入 | `hooks/useQuizEngine.ts:176-183`（`repository.getBanks()` → 全部題庫） | ✅ |
| 急迫度排序 ASC | `useQuizEngine.ts:190`（`a.nextReviewDate - b.nextReviewDate`） | ✅ |
| 豁免洗牌 | `useQuizEngine.ts:230-232`（spaced_due 納入不洗牌三元分支） | ✅ |
| 無到期題 toast + 不切頁 | `useQuizEngine.ts:197-200` + 測試 (d) 斷言 `onViewChange` 未被呼叫 | ✅ |
| Dashboard `<div>`→`<button>` + aria-label + hover | `components/Dashboard.tsx:174-186`（`aria-label="複習到期題目"`、hover:scale、cursor-pointer） | ✅ |
| dueCount=0 不渲染 | `Dashboard.tsx:174`（`dueCount > 0 &&` 條件渲染） | ✅ |
| 修飾鍵 + IME 前置守衛 | `hooks/useKeyboardShortcuts.ts:29-32`，位置符合 spec（isEditableTarget 之後、鍵匹配之前） | ✅ |
| `getLocalDateString` sv-SE + Invalid Date 守衛 | `utils/dateUtils.ts:5-11` | ✅ |
| analytics/streak 4 處替換 | `analytics.ts:26,169`、`streak.ts:83,94` | ✅（但見 W1） |
| signOut try...finally + SIGNED_OUT 防守底線 | `contexts/AuthContext.tsx:34-52`；雙重執行（finally + 事件）具冪等性 | ✅ |
| 雙 Storage 前綴迭代清理 + 白名單 | `services/storage.ts:36-40, 723-761`；兩階段快照式收集，無索引跳動 | ✅ |
| BattleArena `max-h-[35vh]`/`min-h-[120px]`/精靈縮小/overflow-hidden | `components/BattleArena.tsx:541, 603, 278`（git diff 親自核對，恰好 3 處 class 變更，無夾帶） | ✅ |

### 1.3 規格對齊偏離（WARNING 清單）

**W1（新發現）：實作違反 delta spec 的明文「SHALL NOT」，且變更超出任務清單範圍。**
`specs/timezone-aware-analytics/spec.md:22` 明文：`analytics.ts:L138` 的 `toISOString().split('T')[0]` 用於 Supabase `.gte()` 查詢參數，「此處 UTC 為正確語義，**SHALL NOT 被替換**」；`design.md` D3 亦將其列入「不修改的 toISOString 場景」。但 `git diff` 證實 `analytics.ts:139` 已被替換為 `getLocalDateString(sevenDaysAgo)`，且 `tasks.md` 沒有任何任務涵蓋此行。
**技術裁定**：該替換在工程上是**必要且正確的**——同一 spec 已將 `session_date` 的寫入端改為本地日期字串，若讀取端查詢下界仍用 UTC 日期，7 天視窗邊界會錯位一天。即 spec 該句自相矛盾（前提「session_date 為 UTC 語義」已被本變更推翻），實作者的取捨是對的。
**處置**：代碼**不需回滾**；但**歸檔前必須同步修訂** `timezone-aware-analytics/spec.md` L22 與 `design.md` D3 的「不修改場景」表述，否則歸檔後主規格將永久攜帶與代碼矛盾的 SHALL NOT 條款。前兩份審計均未發現此矛盾（K7M4 甚至將其誤述為「未誤改」的正面證據）。

**W2（新發現）：streak.ts 夾帶未申報的行為變更（silent bugfix）。**
`git diff services/streak.ts` 顯示 `longestStreak` 更新邏輯被移出「連續天數遞增」分支：舊代碼在 streak 重置路徑（else 分支）永不更新 longest，導致**首次學習 longest 恆為 0** 的潛在 bug；新代碼在重置路徑也會更新（首次 → longest=1）。此變更 beneficial 且已被新增測試鎖定（`streak.test.ts`「initializes streak to 1 on first study」斷言 longest=1），但 `tasks.md`/`design.md` 完全未申報。**處置**：接受代碼，於 DEVELOPMENT_LOG 補記，或於 tasks.md 加註即可，勿靜默通過。

**W3（新發現）：design/proposal 宣稱的 `App.tsx startSpacedReview` 落點不存在。**
`proposal.md:42`（「App.tsx: 新增 startSpacedReview 回調」）與 `design.md:70`（「App.tsx — 實作 startSpacedReview」）均宣告該回調在 `App.tsx` 實作；實際 `grep startSpacedReview` 全庫顯示**運行時代碼零匹配**——接線實際在 `AppContent.tsx:205` 以 inline lambda 完成（`onStartSpacedReview={() => void quizEngine.startQuiz(undefined, 'spaced_due')}`）。功能等價（spec 資料流「Dashboard → startQuiz(undefined, 'spaced_due')」成立）且更精簡，但規格文件與代碼落點不符。**處置**：歸檔前修訂 proposal/design 文字，或明示接受分歧。

**W4（確認 K7M4-W3，駁回 inquisitor「零偽綠燈」結論）：時區場景測試為同義反覆（tautology），spec 核心情境未被證明。**
`src/__tests__/dateUtils.test.ts:56-65` (e) 的斷言為 `expect(dateStr).toBe(new Date().toLocaleDateString('sv-SE'))`——與實作內部**完全相同的表達式**，在任何時區、任何實作下皆恆真，不具鑑別力。Task 1.2 承諾的「設定為 UTC+8 凌晨 01:00 驗證不歸入前一天」與 spec Scenario「UTC+8 user studies at 01:00」實際上**沒有任何測試鎖定**（無 `TZ=Asia/Taipei` 釘扎、無硬編碼期望值）。實作本身正確（`'sv-SE'` locale 語義有 W3C 保證），但「原始 P0 缺陷已修復」這一命題在測試證據層面是**偽綠燈**。**處置**：補一個硬斷言（`vi.setSystemTime` + `process.env.TZ` 或以 `Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' })` 交叉驗證，斷言字面值如 `'2026-09-29'`）。

**W5（確認 K7M4-W1）：Dashboard dueCount 與引擎 pool 的孤兒不對稱。**
`Dashboard.tsx:83-86` 以全部 SM-2 到期項計數；`useQuizEngine.ts:192-195` 只保留能映射到現存題目的項目。孤兒 SM-2 項（題目已刪）會導致按鈕顯示「有 N 題需要複習」但實際啟動較少、甚至全孤兒時彈「目前沒有到期的複習題目！」。**緩解因素**（本審計補充）：`storage.ts:697-699` `deleteQuestionArtifacts` 已在刪題時同步清理 SM-2/mistakes/quiz session，孤兒僅可能來自歷史遺留或外部匯入，觸發機率低且降級路徑優雅（toast），故維持 WARNING 不升級。建議 Dashboard 計數時與現存題目取交集。

**W6（新發現，兩端進度不對稱類）：spaced_due 會話結束後 QuizResult 的 retry/restart 語意錯位。**
- `AppContent.tsx152`：`onRetry` 呼叫 `startQuiz(wrongCount, 'retry_session', wrongQuestionIds)` **未傳 `overrideBankIds`** → retry pool 以 Dashboard 當前勾選題庫重建。spaced_due 會話橫跨**全部**題庫，若答錯題目位於未勾選題庫，retry 會**靜默丟棄**這些錯題；全數位於未勾選題庫時誤導性地彈「目前選擇的範圍沒有題目！」。對照組證明此不對稱是真缺陷而非設計：同檔案 `AppContent.tsx:277-282`（ChunkCompleteSummary 的 `onReviewMistakes`）**有**傳 `quizEngine.sessionBankIds`。
- `AppContent.tsx153`：`onRestart` 以 `'random'` 模式、`count = spaced_due 會話總題數` 重啟，產生「以到期題數為上限的隨機全選集測驗」的奇特語意（無崩潰，僅體驗怪異）。
**處置**：`onRetry` 補傳 `quizEngine.sessionBankIds` 作為第四參數即可對齊；`onRestart` 至少加註或模式分流。此分支目前零測試覆蓋。

**W7（新發現，非同步生命週期類）：AppHeader 登出按鈕的離線未處理 rejection + 殘留 session 對稱性。**
`AppHeader.tsx:92` `onClick={onSignOut}`：`AuthContext.signOut` 為 async 且 `try...finally` **不含 catch**——離線點擊時 (a) `finally` 已靜默清除全部 `mindspark_*` 用戶資料，(b) rejection 無人接住（unhandled promise rejection，`() => void` prop 型別掩蓋了此風險），(c) UI 無任何回饋（`onAuthStateChange` 離線不觸發，畫面停留登入態），(d) Supabase 自有的 `sb-*-auth-token` session key 不在 `mindspark_` 清理範圍（白名單設計如此），若 supabase-js 離線失敗時未移除本地 session，重啟 App 將自動恢復舊 session 疊加已被清空的本機資料。安全目標（敏感金鑰銷毀）已達成且經 `authLogout.test.ts (d)` 鎖定；未達成的是離線分支的 UX 回饋與 session 殘留對稱。**處置**：`signOut` 內 catch 後 toast 再 rethrow，或 AppHeader 改 `onClick={() => { void onSignOut().catch(showToast) }}`；session key 殘留是否成立取決於 supabase-js 版本離線行為，建議補一條模擬 `sb-*-auth-token` 殘留的測試以釘死語義。

**W8（確認 K7M4-W2）：`onStartSpacedReview` 為 optional prop，容忍靜默 no-op。**
`Dashboard.tsx:33` `onStartSpacedReview?: () => void` + `L176 ?.()`，與 task 5.3 明文 `onStartSpacedReview: () => void`（required）不符。當前唯一呼叫端 `AppContent.tsx:205` 有傳入，故非現行 blocker。**處置**：改回 required（同時是 ponytail 可裁切項，見 §3）。

---

## 2. 偽綠燈（False Green）深度審計

### 2.1 已證實的偽綠燈（1 項）
| # | 位置 | 問題 | 嚴重度 |
|:---|:---|:---|:---:|
| FG-1 | `dateUtils.test.ts:56-65` (e) | 同義反覆斷言，時區語義零鑑別力（= W4） | 🟡 |

### 2.2 未覆蓋的極端分支（本審計攻擊推演後之存活清單）
| # | 攻擊向量 | 代碼現況 | 測試覆蓋 | 判定 |
|:---|:---|:---|:---|:---|
| EB-1 | 兩端進度不對稱：dueCount(全部 SM-2 項) vs pool(僅現存題目交集) | 優雅降級（filter + toast） | ❌ 無測試 | W5，低機率 |
| EB-2 | 兩端進度不對稱：spaced_due 全題庫會話 → retry 以勾選題庫重建 | 靜默丟題，見 W6 | ❌ 無測試 | W6 |
| EB-3 | 非同步生命週期：離線 signOut 的 unhandled rejection + sb-token 殘留 | cleanup 保證成立、UX 回饋缺失 | 部分（authLogout (d) 僅驗 mindspark 清理） | W7 |
| EB-4 | 陣列順序錯位：孤兒項混入 dueItems 之排序穩定性 | `getDueQuestions` 返回新陣列，sort 不汙染儲存；`questionMap` 以 `String(q.id)` 正規化型別 | ✅ 10-run Challenger Gate 鎖定 | 真綠燈 |
| EB-5 | 迭代刪除索引跳動 | 兩階段快照式收集再刪 | ✅ clearUserData (e) 動態 key | 真綠燈 |
| EB-6 | spaced_due 中斷恢復（SavedQuizProgress.mode） | `battleTypes.ts:370` mode 可選欄位 + `restoreSession` 保留原序（questionIds 映射） | ⚠️ 型別已通過但 resume 流程零測試（stress-test D2-002 僅以型別收斂） | 證據缺口 |
| EB-7 | count 切片於 spaced_due（`startQuiz(2, 'spaced_due')`） | `pool.slice(0, count)` 取最逾期優先，語義正確 | ❌ 無測試 | 低風險 |
| EB-8 | IME 229 於真實瀏覽器（jsdom 無法完全擬真） | 2 行守衛 + keyCode 覆寫測試 | ✅ 單元層足夠；E2E 不含 IME | 接受 |

### 2.3 對前審計偽綠燈結論的裁定
- `audit_inquisitor_7128.md`「零偽綠燈」結論：**不成立**（FG-1 為直接反例；其 §3.4 聲稱 dateUtils 覆蓋時區場景屬誤讀——(b)(c)(d) 測的是格式與無效日期回退，唯時區歸日場景 (e) 恰是恆真斷言）。
- `audit_K7M4.md` W3/W4/W5/W6：本審計獨立重驗後**全部確認**，無需推翻。

---

## 3. Ponytail Audit（本次變更範圍 YAGNI / 不可達代碼審查）

依 ponytail-audit 規範掃描本次變更全部新增/修改面積（`utils/dateUtils.ts`、`clearUserDataOnSignOut`、spaced_due 分支、快捷鍵守衛、BattleArena CSS、Dashboard 按鈕、AppContent 接線）：

- `native:` `dateUtils` 用原生 `toLocaleDateString('sv-SE')`，零依賴；BattleArena 純 CSS 無 ResizeObserver；快捷鍵守衛 2 行。**Lean already。**
- `yagni:` `DashboardProps.onStartSpacedReview` optional 契約 + `?.()` 可裁切；替換為 required callback，消除一個靜默 no-op 分支。`components/Dashboard.tsx:33,176`
- `shrink:` mode 聯合型別重複維護 **4 處**（`types.ts:83`、`types/battleTypes.ts:370`、`useQuizEngine.ts:164`、`AppContent.tsx:73`——前兩審計只各點名 2 處，實際 inline 簽名處才是新增 mode 最易漏改的風險點）；提取 `type QuizEngineMode` 統一引用。
- `delete:` 本次範圍內無不可達代碼、無 dead event、無單一實作 factory。`spaced_due` 的 `count` 切片分支（EB-7）為引擎層可達 API，非死碼。
- 防禦性超額但**保留不裁**：`clearUserDataOnSignOut` 的 per-key try-catch（`storage.ts:733-739, 750-756`）超出 design 的單一 try-catch，但此為安全關鍵路徑——單一毒 key 不應中斷其餘清理，屬合理防禦而非過度工程。

**net：可收斂 1 個 optional 契約 + 4→1 個 union 定義；無可刪除之死代碼。Knip 全庫 0 issues 佐證。**

---

## 4. Ponytail Debt Ledger（技術債帳簿）

全庫 `(#|//|/\*) ponytail:` 掃描（排除 node_modules、build output、docs/openspec 內文）：

| 位置 | 簡化內容 | Ceiling | Upgrade Trigger | 狀態 |
|:---|:---|:---|:---|:---:|
| `services/storage.ts:35` | localStorage 暫存機制保留（本次新增之退場標記） | v2.0 | 系統全面遷移至 user-scoped IndexedDB 後退役 | 🟢 有觸發條件 |
| `components/KnowledgeGraph/NodeEditPanel.tsx:266` | 保留 `fontWeight` 相容寫入供 schema-v2 舊讀取端 | 2026-10-01 遷移窗口 | schema-v2 遷移完成後移除 | 🔴 **2 天後到期**（今日 2026-09-29） |

**統計：2 markers，0 with no-trigger。** 帳簿本身健全；但 NodeEditPanel marker 將於 **2026-10-01（後天）到期**，rot 風險升高——歸檔本變更時應順帶排定該債的清償或明示展期，避免「later means never」。

---

## 5. 嚴格分級：阻塞級邏輯缺陷 vs 流程事項

### 🔴 阻塞級邏輯缺陷（CRITICAL）
**0 項。** 五項 P0 修復之運行時邏輯經獨立攻擊推演（排序汙染、孤兒過濾、迭代跳動、離線清理保證、冪等雙清理、陣列順序保持、Invalid Date 回退）均無核心崩壞；全部品質閘門由本審計員親自復跑通過。

### 🟡 WARNING（代碼/規格層，結案前應處置）
W1 spec SHALL NOT 矛盾（代碼正確、文檔需修）、W2 streak 未申報行為變更、W3 App.tsx 落點文檔不符、W4 時區偽綠燈、W5 dueCount 孤兒不對稱、W6 retry 跨題庫錯題丟失、W7 離線登出 UX/session 殘留、W8 optional prop 契約。

### 📋 流程標記（與代碼品質無關，勿混淆為 CRITICAL）
1. **待提交確認**：working tree 尚有全部本次變更未 `git commit`（含 `openspec/changes/fix-p0-core-experience-and-security/` 未追蹤）。依慣例此為負責人評估後之交付動作，**不影響**上述 runtime 正確性判定。
2. **已勾選任務之證據缺口**（任務標記 `[x]` 但無法從產物複驗 DoD，屬流程稽核而非代碼缺陷）：
   - Task 4.3「登出 E2E 驗證」：`e2e/` 全目錄 grep `signOut|logout|登出` **零匹配**——不存在任何登出 E2E 測試，「相關測試通過」無對應標的。單元層（authLogout 5 tests）已覆蓋其風險面，故降為證據缺口而非缺陷。
   - Task 6.2「1366×768 DevTools 目視驗證」：change 資料夾內無截圖/量測證據檔；本次 CSS 變更由 battle-flow E2E 間接迴歸通過。
   - Task 7.4「E2E 全量」：本審計僅定向復跑 battle-flow + quiz-flow（7 passed）；全量 Playwright 通過之聲明未由本審計獨立重現（Windows 環境 RISK-004 拆除風險，未強行執行）。

---

## 6. 最終裁定與建議處置順序

**Conditional Pass。** 可由負責人評估後結案；結案（archive）前建議依序完成：

1. **（歸檔前必做）** 修訂 `timezone-aware-analytics/spec.md:22` 與 `design.md` D3 的「不修改場景」文字，消除與代碼的 SHALL NOT 矛盾（W1）。
2. **（歸檔前必做）** 修訂 `proposal.md:42`/`design.md:70` 的 `App.tsx startSpacedReview` 落點描述為 AppContent inline（W3）。
3. **（低成本高價值）** 補 FG-1 的硬斷言時區測試（W4）；`onRetry` 補傳 `sessionBankIds`（W6）。
4. **（擇期）** W5 孤兒交集計數、W7 離線登出回饋、W8 required prop、mode union 收斂、DEVELOPMENT_LOG 補記 W2。
5. **（順帶排程）** NodeEditPanel ponytail 債 2026-10-01 到期處置。
6. **（負責人裁決）** 執行 git commit 結案。

---
*本報告為獨立審計產物，未修改任何運行時代碼。審計員 ID: arbiter-R7QK。*
