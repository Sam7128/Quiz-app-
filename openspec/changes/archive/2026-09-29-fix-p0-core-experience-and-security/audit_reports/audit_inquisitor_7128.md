# 獨立審計報告：fix-p0-core-experience-and-security

- **審計日期**：2026-09-29
- **審計角色**：獨立第二位高階 AI 審計員（Project Inquisitor, ID: `inquisitor-7128`）
- **變更目標**：`openspec/changes/fix-p0-core-experience-and-security`
- **變更摘要**：修復 SM-2 待複習入口斷鏈、快捷鍵修飾鍵/IME 劫持、UTC 打卡倒流、登出敏感資料殘留、戰鬥舞台垂直溢出等 5 項 P0 核心體驗與安全缺陷
- **審計結論**：🟢 **PASS（完全合格，建議直接提交並進行 OpenSpec 歸檔）**

---

## 1. 執行摘要 (Executive Summary)

本審計員作為獨立第二位高階 AI，依據專案規範、`openspec-verify-change`、`ponytail-audit`、`ponytail-debt` 及「偽綠燈（False Green）」深度防禦標準，對變更範圍內的全部規格檔案、源代碼變更、單元測試、建置產物及運行時邊界進行了全量交叉審計。

### 關鍵指標
| 檢查維度 | 預期標準 | 審計實測結果 | 狀態 |
|:---|:---|:---|:---:|
| **TypeScript 編譯** | `npx tsc --noEmit` 零錯誤 | 退出碼 0，無任何型別錯誤 | 🟢 PASS |
| **單元測試套件** | 100% 通過且無 regression | 57 測試檔案、392 個測試全數 PASS (7.30s) | 🟢 PASS |
| **規格對齊率** | 5 大新增/修改規格全覆蓋 | 5 / 5 規格 100% 實現，無未落地的 Scenario | 🟢 PASS |
| **任務勾選核實** | `tasks.md` 任務標記與實作一致 | 25 / 25 任務項全數完成並標記 `[x]` | 🟢 PASS |
| **阻塞級邏輯缺陷** | 0 CRITICAL | 0 項 | 🟢 PASS |
| **偽綠燈漏洞** | 0 表面斷言/未覆蓋極端分支 | 經極端邊界推演，邏輯具備完備防禦 | 🟢 PASS |

---

## 2. OpenSpec 規格與實作對齊審查 (openspec-verify-change)

本審計員對比了 `proposal.md`、`design.md`、`specs/` 下 5 個領域規格以及 `tasks.md`：

### 2.1 `spaced-due-review` (SM-2 待複習入口與測驗模式)
- [x] **Dashboard 入口轉換**：[Dashboard.tsx](file:///c:/Users/user/Desktop/Quiz-app-/components/Dashboard.tsx#L174-L186) 成功將 `dueCount` 渲染由純文字 `<div>` 改為可點擊 `<button>`，包含 `aria-label="複習到期題目"`、`title="點擊開始複習到期題目"`、hover 縮放動效與 `cursor-pointer`。
- [x] **型別擴充**：[types.ts](file:///c:/Users/user/Desktop/Quiz-app-/types.ts#L83) 與 [types/battleTypes.ts](file:///c:/Users/user/Desktop/Quiz-app-/types/battleTypes.ts#L370) 的 `mode` 聯合型別成功擴展包含 `'spaced_due'`。
- [x] **全題庫題源與急迫度排序**：[useQuizEngine.ts](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useQuizEngine.ts#L176-L200) 在 `spaced_due` 模式下調用 `repository.getBanks()` 載入全部題庫，取得所有題目構建 pool，並按 `a.nextReviewDate - b.nextReviewDate` 進行遞增排序（逾期最久優先出題）。
- [x] **防洗牌保護**：[useQuizEngine.ts](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useQuizEngine.ts#L230-L232) 將 `spaced_due` 納入豁免洗牌清單，100% 保障急迫度排序不被打亂。
- [x] **空題目防護**：無到期題目時觸發 `toast.warning('目前沒有到期的複習題目！')` 並阻止畫面跳轉。

### 2.2 `keyboard-shortcuts-stability` (快捷鍵穩定性與修飾鍵守衛)
- [x] **前置修飾鍵守衛**：[useKeyboardShortcuts.ts](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useKeyboardShortcuts.ts#L29) 新增 `if (event.ctrlKey || event.altKey || event.metaKey) return;`，防止 `Ctrl+1`、`Ctrl+H`、`Alt+Enter`、`Meta+Escape` 被攔截。
- [x] **IME 輸入法守衛**：[useKeyboardShortcuts.ts](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useKeyboardShortcuts.ts#L30) 新增 `if (event.isComposing || event.keyCode === 229) return;`，防止中文/日文選字時誤觸快捷鍵。
- [x] **既有能力保留**：數字鍵 `1-4`、`Enter`、`h/H` 提示、`Escape` 退出以及 `isEditableTarget` 守衛均正常工作。

### 2.3 `timezone-aware-analytics` (時區感知學習統計與打卡)
- [x] **集中式日期工具**：建立 [utils/dateUtils.ts](file:///c:/Users/user/Desktop/Quiz-app-/utils/dateUtils.ts)，使用 `(date ?? new Date()).toLocaleDateString('sv-SE')` 取得本地時區 `YYYY-MM-DD`，並內建 `isNaN(targetDate.getTime())` 容錯。
- [x] **統計與連勝替換**：[analytics.ts](file:///c:/Users/user/Desktop/Quiz-app-/services/analytics.ts#L25)（L25, L139, L169）與 [streak.ts](file:///c:/Users/user/Desktop/Quiz-app-/services/streak.ts#L83)（L83, L94）全面替換 `toISOString().split('T')[0]` 為 `getLocalDateString()`。東八區清晨打卡不再判定為昨日，Streak 斷鏈缺陷徹底解決。

### 2.4 `client-data-integrity` (登出資料隔離與敏感金鑰銷毀)
- [x] **雙 Storage 清理函式**：[storage.ts](file:///c:/Users/user/Desktop/Quiz-app-/services/storage.ts#L723-L761) 實作 `clearUserDataOnSignOut()`，迭代清除所有非白名單 `mindspark_*` localStorage 項目，並清除 sessionStorage 中包含 `mindspark_ai_config` 在內的所有項目。
- [x] **白名單保留**：定義 `SIGNOUT_WHITELIST = new Set(['mindspark_theme', 'mindspark_bgm_enabled', 'mindspark_sfx_enabled'])`，裝置偏好登出後不丟失。
- [x] **容錯與防守底線**：[AuthContext.tsx](file:///c:/Users/user/Desktop/Quiz-app-/contexts/AuthContext.tsx#L47-L51) 的 `signOut` 使用 `try...finally` 結構確保網路失敗時 100% 執行本地清理，並在 `onAuthStateChange` 的 `SIGNED_OUT` 分支設置防守底線。

### 2.5 `battle-mode` (戰鬥舞台筆電視窗響應式佈局)
- [x] **高度約束**：[BattleArena.tsx](file:///c:/Users/user/Desktop/Quiz-app-/components/BattleArena.tsx#L541) 舞台容器新增 `max-h-[35vh]`，L603 改為 `min-h-[120px] md:min-h-[200px]`。
- [x] **角色精靈壓縮**：L278 精靈尺寸改為 `w-20 h-24 md:w-32 md:h-40`，在 1366×768 筆電螢幕下確保題幹與 4 個選項按鈕首屏完整露出。

---

## 3. 『偽綠燈（False Green）』深度剖析

本審計員針對現有單元測試與實作代碼進行了「攻擊性邊界推演」，特別檢查是否存在「測試雖過但代碼在極端分支會崩潰或產生錯誤數據」的偽綠燈現象：

### 3.1 陣列順序錯位與洗牌污染審查 (Spaced Due Urgency Order)
- **攻擊場景**：若到期題目具有相同 `nextReviewDate`，或者在非同步載入題庫後題序被隨機洗牌。
- **審計驗證**：
  - [useQuizEngine.spacedDue.test.ts](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/useQuizEngine.spacedDue.test.ts#L144-L177) 包含 `Challenger Gate` 測試，執行 10 次重複啟動，100% 驗證順序完全一致且與急迫度時間戳嚴格單調遞增（qa-2 60s ago → qa-3 40s ago → qb-1 30s ago → qb-2 20s ago → qa-1 10s ago）。
  - `useQuizEngine.ts` L230 豁免了 `shuffleArray`。
  - **結論**：真實綠燈，無排序錯位漏洞。

### 3.2 孤兒題目（Orphan Items）與空題庫極端分支審查
- **攻擊場景**：用戶刪除了某題庫中的題目，但 `mindspark_spaced_repetition` 中仍殘留該題目的複習排程。
- **審計驗證**：
  - [useQuizEngine.ts](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useQuizEngine.ts#L192-L195)：
    ```typescript
    const questionMap = new Map(allSelectedQuestions.map((question) => [String(question.id), question]));
    pool = dueItems
      .map((item) => questionMap.get(item.questionId))
      .filter((question): question is Question => Boolean(question));
    ```
  - 找不到題目物件的孤兒 item 會在 `questionMap.get()` 返回 `undefined`，並被 `.filter(Boolean)` 安全過濾。
  - 若所有到期項目皆為孤兒題目导致 `pool.length === 0`，系統正確進入 `toast.warning` 並 return。
  - **結論**：真實綠燈，防禦式設計完善。

### 3.3 儲存迭代中的「索引跳動（Index Shifting）」漏洞審查
- **攻擊場景**：在遍歷 `localStorage` 時如果直接在迴圈內執行 `removeItem(i)`，會導致 `localStorage.length` 動態減小且後續 key 索引前移，造成跳過某些 key 漏刪。
- **審計驗證**：
  - [storage.ts](file:///c:/Users/user/Desktop/Quiz-app-/services/storage.ts#L724-L740) 採用兩階段安全清理：第一階段先用 `for` 迴圈將所有待刪除的 key 快照至 `localKeysToRemove` 陣列；第二階段再迭代該陣列執行 `removeItem`。
  - [clearUserDataOnSignOut.test.ts](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/clearUserDataOnSignOut.test.ts#L63-L71) 覆蓋了連續多個動態 key 與前綴 key 的批次移除。
  - **結論**：真實綠燈，杜絕了索引跳動缺陷。

### 3.4 日期工具跨月/跨年/閏年/無效日期邊界審查
- **攻擊場景**：傳入 `new Date(NaN)`、`Invalid Date`、閏年 2 月 29 日、12 月 31 日跨年。
- **審計驗證**：
  - [dateUtils.ts](file:///c:/Users/user/Desktop/Quiz-app-/utils/dateUtils.ts#L7-L9) 具有 `isNaN(targetDate.getTime())` 守衛，遇到無效日期時自動回退至 `new Date()`。
  - [dateUtils.test.ts](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/dateUtils.test.ts) 覆蓋了閏年、年初、年末與 `Invalid Date` 回退測試。
  - **結論**：真實綠燈，健壯無崩潰風險。

---

## 4. 過度工程與複雜度審查 (ponytail-audit)

依據 `ponytail-audit` 規範，對變更範圍內的代碼進行極簡化與 YAGNI 審查：

- `native:` [utils/dateUtils.ts](file:///c:/Users/user/Desktop/Quiz-app-/utils/dateUtils.ts) 使用原生 `Intl` / `toLocaleDateString('sv-SE')` 實作，避免引入 `date-fns` 或 `dayjs` 外部依賴。
- `native:` [components/BattleArena.tsx](file:///c:/Users/user/Desktop/Quiz-app-/components/BattleArena.tsx) 採用純 Tailwind CSS `max-h-[35vh]` 與精靈尺寸響應式，無多餘的 `ResizeObserver` 或 JS 動態計算。
- `yagni:` [components/Dashboard.tsx](file:///c:/Users/user/Desktop/Quiz-app-/components/Dashboard.tsx) 的 `onStartSpacedReview` 採用極簡無參介面，直接由引擎端向 repository 查詢，避免跨層傳遞無用 state。
- `shrink:` [services/storage.ts](file:///c:/Users/user/Desktop/Quiz-app-/services/storage.ts) 的 `clearUserDataOnSignOut` 直接使用 `Set.has` 判斷白名單，邏輯緊湊清晰。

**審計結論**：變更範圍無冗餘抽象、無死代碼，符合 YAGNI 原則。

---

## 5. 技術債帳簿檢閱 (ponytail-debt)

全庫 `(#|//) ?ponytail:` 標記掃描結果（排除 `node_modules`、`.git`、`dist` 與 docs/openspec 規格）：

| 檔案位置 | 標記內容 | 上限 (Ceiling) | 升級觸發條件 (Upgrade Trigger) | 狀態 |
|:---|:---|:---|:---|:---:|
| `components/KnowledgeGraph/NodeEditPanel.tsx:266` | retain fontWeight beside canonical bold | 相容舊版 schema-v2 | 2026-10-01 遷移窗口關閉時移除 | 🟡 監控中（尚餘 2 天） |
| `services/storage.ts:35` | localStorage 暫存機制 | 訪客/登入本地快取 | v2.0 全面遷移至 user-scoped IndexedDB 後退役 | 🟢 有效 |

**統計**：`2 markers, 0 with no trigger.` 帳簿健全，無遺忘技術債。

---

## 6. 問題清單與分級 (Defect & Task Ledger)

### 🔴 阻塞級邏輯缺陷 (CRITICAL)
- **無 (0 項)**

### 🟡 次要優化建議 (SUGGESTION - 非阻塞)
1. **[SUGGESTION] `startQuiz` 連續連點防抖**：
   - *位置*：`hooks/useQuizEngine.ts:162`
   - *說明*：在慢速或離線網路下，使用者若極速雙擊「複習到期題目」，理論上會發起兩次 `repository.getQuestions`。目前在一般本地操作下無感，未來可考慮在 hook 入口加入 `isStartingQuizRef` 鎖定以達極致防禦。
2. **[SUGGESTION] `types.ts` 與 `battleTypes.ts` 的 Mode Union 收斂**：
   - *位置*：`types.ts:83` vs `types/battleTypes.ts:370`
   - *說明*：兩處均定義了 `'random' | 'mistake' | 'retry_session' | 'challenge' | 'chunked' | 'spaced_due'`，未來可將其提取為共用 `type QuizEngineMode` 統一引用。

### 📋 流程標記 (待提交確認)
1. **[待提交確認] 本地 Git 工作目錄尚有未提交變更**：
   - *說明*：當前分支包含本次 5 項 P0 修復之修改檔案，待審計評估通過後由主流程執行 `git commit`。此項為交付型流程確認，非代碼缺陷。

---

## 7. 最終審計判決 (Final Sign-Off)

```
================================================================================
                    FINAL AUDIT VERDICT: APPROVED (PASS)
================================================================================
  [✓] OpenSpec 規格 100% 落地且無違背
  [✓] 57 個測試套件 (392 個單元測試) 全部通過
  [✓] TypeScript 零型別錯誤 (Strict Zero Errors)
  [✓] 零「偽綠燈」現象，極端分支皆具備防禦性守衛
  [✓] 無過度工程，技術債標記清晰
================================================================================
```

變更品質卓越，邏輯嚴密，可放心推進至 Commit 與 Archive 階段。
