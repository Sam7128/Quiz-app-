# Final Independent Audit: fix-p0-core-experience-and-security

- 審計角色：第二位獨立高階 AI
- 審計日期：2026-09-29
- 審計範圍：OpenSpec artifacts、runtime diff、相關單元測試、既有 E2E 索引、YAGNI/dead-code、`ponytail:` debt
- 結論：**Conditional Pass；無阻塞級核心邏輯缺陷，但不建議把驗證證據描述為完整閉環。**

## 1. OpenSpec Verify

### 完成度

- `proposal.md`、`design.md`、5 個 delta `spec.md`、`tasks.md` 均存在。
- `tasks.md` 共 26 個 task marker，全部為 `[x]`。
- 實作已對應五項主題：`spaced_due`、快捷鍵守衛、本地日期、登出雙 Storage 清理、BattleArena 緊湊佈局。
- `types/battleTypes.ts` 新增可選 `SavedQuizProgress.mode`，並由 quiz session 保存/恢復路徑消費；此與設計要求一致。

### 正確性

- `hooks/useQuizEngine.ts:176-219` 在 `spaced_due` 取得所有題庫、讀取 spaced-repetition data、篩選到期題並按 `nextReviewDate` ASC 排序。
- `hooks/useQuizEngine.ts:230-232` 將 `spaced_due` 納入不洗牌分支。
- `contexts/AuthContext.tsx:32-48` 同時具備 `SIGNED_OUT` 防守清理與 `signOut` `try...finally`。
- `services/storage.ts:723-763` 批次收集後清除雙 Storage 的 `mindspark_*` key，localStorage 白名單符合 spec。
- `services/analytics.ts:26,169` 與 `services/streak.ts:83-94` 使用 `getLocalDateString()`；Supabase 週查詢仍保留本地日期 helper 呼叫，未誤改為 UTC。
- `components/BattleArena.tsx:275-276,541,603` 已套用精靈尺寸、`max-h-[35vh]`、`min-h-[120px] md:min-h-[200px]` 與 `overflow-hidden`。

### 規格偏離／可疑點

**WARNING W1：孤兒 spaced-repetition 記錄會造成 Dashboard 數字與實際可複習題目不一致。**

`components/Dashboard.tsx:77-84` 直接以全部到期記錄計算 `dueCount`；`hooks/useQuizEngine.ts:191-200` 則只把能在現有題庫找到的 question ID 放入 pool。刪除題庫或題目後，使用者可能看到「有 N 題需要複習」，點擊後只有較少題目，甚至出現「目前沒有到期」警告。這是可重現的資料一致性缺口，但不屬於本次已證明的 P0 核心崩壞。建議統一以現存題目交集計數，或清理孤兒 SR item。

**WARNING W2：Dashboard callback 被宣告為 optional，允許靜默 no-op。**

`components/Dashboard.tsx:33,176` 使用 `onStartSpacedReview?: () => void` 與 optional chaining；當未來任何呼叫端漏傳 prop 時，按鈕仍可見但點擊無動作。當前 `AppContent.tsx:205` 有正確傳入，所以是介面防禦缺口，不是目前流程的 blocker。若此功能是規格必要契約，應改為 required prop。

## 2. False Green Audit

### 實際通過的證據

- 相關聚焦測試：5 files / 33 tests passed。
- 全量 Vitest：57 files / 392 tests passed。
- `npx tsc --noEmit`：passed。
- `npm run lint`：passed。
- `npm run build`：passed；仍有既有 `vendor-ui-core` 約 1.3 MB minified chunk warning，非本次修補引入的 P0 failure。
- `npx -y knip --reporter compact`：no issues。

### 已識別的測試假綠燈／證據缺口

**WARNING W3：時區測試沒有真正固定 UTC+8。**

`src/__tests__/dateUtils.test.ts:50-63` 只把結果與同一執行環境的 `toLocaleDateString('sv-SE')` 比較，沒有設定 `TZ` 或使用 `timeZone: 'Asia/Taipei'`。測試在任何時區都會綠，無法反駁「UTC+8 凌晨被歸入前一天」的原始缺陷。`src/__tests__/streak.test.ts` 也以當前環境日期建構 expected。實作本身目前正確，但這是明確的 False Green。

**WARNING W4：spaced_due 測試驗證 hook state，沒有驗證真實 Dashboard 按鈕契約。**

`src/__tests__/useQuizEngine.spacedDue.test.ts` 覆蓋跨題庫、排序、無到期題、SM-2 更新，但沒有測 `Dashboard` 的 dueCount > 0 / = 0 DOM 分支、按鈕 click 或 `onStartSpacedReview` 傳遞。現有 E2E 搜尋也沒有 `spaced_due`／到期複習案例。因此「端到端入口打通」主要是由型別與 hook mock 推論，未被 UI 測試證明。

**WARNING W5：BattleArena 現有測試沒有鎖定本次 CSS。**

`src/__tests__/BattleArena.test.tsx` 測試資產、ARIA、動畫與 fallback，但沒有檢查 `max-h-[35vh]`、`min-h-[120px]`、窄螢幕精靈尺寸，亦沒有 1366×768 的實際 layout/overflow assertion。這不表示 CSS 修補錯誤，只表示 task 6.2 的核心驗證沒有可重播測試證據；現有 battle E2E 也不是本次佈局專項。

**WARNING W6：快捷鍵測試沒有明確驗證卸載後 listener 不再生效。**

`src/__tests__/useKeyboardShortcuts.test.tsx:88-112` 驗證 rerender 不重綁，但沒有對 `unmount()` 後 dispatch 事件，也沒有直接斷言 `removeEventListener` 恰好一次。`hooks/useKeyboardShortcuts.ts:18-53` 的 cleanup 實作存在，故目前屬生命週期證據缺口，不是已證實的 leak。

## 3. Ponytail Audit

本次變更範圍內未發現需要刪除的死碼、單一實作 factory、無消費者的新增 export 或可由標準庫直接取代的依賴；Knip 全庫亦為 no issues。

- `yagni:` `DashboardProps.onStartSpacedReview` 的 optional contract 與 `?.()` 可刪除；替換為 required callback，減少一個靜默 no-op 分支。`components/Dashboard.tsx:33,176`
- `shrink:` `SavedQuizProgress.mode` 與 `QuizState.mode` 重複維護同一 union；可改用共用 type alias，降低日後新增 mode 遺漏一處的風險。`types.ts:83`, `types/battleTypes.ts:367`

**net：可安全收斂約 2 個防禦分支／一個重複 union；無可確認的 dead event。**

## 4. Ponytail Debt Ledger

依 `ponytail-debt` 規則，排除 `node_modules`、build output、歷史報告與規格文字後，runtime source 有 1 個 marker：

- `services/storage.ts:35`：localStorage 暫存機制保留至 user-scoped IndexedDB 遷移完成；ceiling/upgrade trigger 為「系統全面遷移至 user-scoped IndexedDB」，有明確觸發條件。

結果：**1 marker，0 筆 no-trigger。** 本 marker 是本次變更明確要求的退場標記，不是遺漏。

## 5. 流程狀態與交付事項

- **核心代碼 CRITICAL：0。** 沒有把「未提交 Git」或「尚未補專項測試」誤分類為核心漏洞。
- **待提交確認：** 工作樹仍有變更，且本次依指示未執行 `git commit`。這是交付流程事項，不影響上述 runtime correctness 判定。
- `git diff --check` 僅回報 `docs/DEVELOPMENT_LOG.md` 與 `docs/INDEX.md` EOF 空白行警告；不屬本次 P0 邏輯缺陷，但歸檔前應清理。

## 6. 建議裁決

目前可視為 **Conditional Pass**：可由負責人評估後結案，但若要宣稱「完整驗證閉環」，應先補 W3 的固定時區測試、W4 的 Dashboard 入口測試，以及 W5 的實際 responsive layout/E2E 檢查。W1/W2 是低成本的資料/介面一致性改善；不需把流程 marker 或 commit 狀態升級為 CRITICAL。
