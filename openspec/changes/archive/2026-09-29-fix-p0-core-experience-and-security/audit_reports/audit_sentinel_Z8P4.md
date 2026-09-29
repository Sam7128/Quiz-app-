# 最終獨立審計：fix-p0-core-experience-and-security

- 審計角色：獨立安全與可靠性審計員（Sentinel，ID：`Z8P4`）
- 日期：2026-09-29
- 範圍：OpenSpec artifacts、未提交實作差異、相關單元／E2E 測試、既有三份審計報告。
- 方法：`openspec-verify-change`（完整性／正確性／一致性）、偽綠燈攻擊推演、`ponytail-audit`、`ponytail-debt`。

## 裁決

**BLOCKED（不得以「P0 資料隔離已完成」結案）。**

- 阻塞級邏輯／安全缺陷：**2**
- WARNING：5
- 流程標記：2（均非 CRITICAL）

原有的五項主要實作大致符合規格，且品質閘門為綠；但是兩個登出極端分支仍會讓前一位使用者的敏感資料存活。這正是「測試綠燈、真實狀態隔離不完整」的偽綠燈，不能以測試全數通過覆蓋。

## 獨立驗證證據

| 閘門 | 本次結果 |
|---|---|
| `npx tsc --noEmit` | 通過，退出碼 0 |
| 變更相關 Vitest | 6 檔／42 tests 通過 |
| `npm test -- --run` | 57 檔／392 tests 通過 |
| `npm run build` | 通過；僅既有 `vendor-ui-core` 1.30 MB chunk 警告 |
| 定向 Playwright（battle-flow + quiz-flow） | 已執行既有 7 條流程，未產生失敗 artifact；它們不是本次 CSS 幾何或登出專項測試 |
| `npx -y knip --reporter compact` | 無輸出（0 issues） |

## OpenSpec 對齊

以下主體需求已有可追溯實作：

- `spaced_due` 會取得全題庫、依 `nextReviewDate` 升冪排序且不洗牌：`hooks/useQuizEngine.ts:176-232`。
- Dashboard 已在 `dueCount > 0` 時顯示可操作按鈕：`components/Dashboard.tsx:174-186`。
- 修飾鍵與 IME 守衛位於 editable-target guard 後、按鍵路由前：`hooks/useKeyboardShortcuts.ts:27-32`。
- 本地日期 helper 與 analytics/streak 寫入端替換已存在：`utils/dateUtils.ts:5-10`、`services/analytics.ts:26,169`、`services/streak.ts:83,94`。
- 登出呼叫有 `try/finally` 和 `SIGNED_OUT` 防線：`contexts/AuthContext.tsx:34-51`。
- BattleArena class 已有 `max-h-[35vh]`、窄螢幕精靈尺寸、overflow-hidden：`components/BattleArena.tsx:278,541,603`。
- `tasks.md` 的 26 個任務皆為 `[x]`。

## 阻塞級邏輯／安全缺陷

### C1：登出只清 Storage，未清 React 記憶體狀態；下一帳號可看見前一帳號的題目

**證據鏈**：`AuthContext.signOut()` 只清 Storage（`contexts/AuthContext.tsx:46-51`）；`App.tsx` 將 `useQuizEngine` 與 reducer state 維持在 AuthProvider 之下的同一個 App 實例（`App.tsx:24,73-83`）；登入／登出時沒有重設 `quizEngine.quizState`、`appState.view`、`appState.banks` 或 `mistakeLog`。`AppContent` 只在 user 為 null 時暫時渲染 Login（`components/AppContent.tsx:126-135`）；新帳號登入後會繼續既有的 `view === 'quiz'` 路徑，並以原 `quizEngine.quizState.activeQuestions` 渲染 QuizCard（`components/AppContent.tsx:136-170`）。

**可重現路徑**：帳號 A 在 quiz view 中登出 → Login → 帳號 B 登入；在 repository 新資料完成載入前（甚至無須載入），舊的 `activeQuestions` 仍存在而可被重新渲染。這是跨帳號記憶體資料洩漏，與本變更的「共用裝置資料隔離」P0 目標衝突。

**為何現有測試偽綠**：`authLogout.test.ts` 只斷言 local/sessionStorage，沒有保留 App 實例並模擬 A → SIGNED_OUT → B 的畫面與 state。所有 5 個 auth tests 因而可以全綠，卻完全看不到這條資料生命週期。

**修復方向**：在 auth identity 改變／SIGNED_OUT 時，原子性地取消或重設 quiz、banks、selection、mistake state 與 view；或讓 authenticated app subtree 以 user ID 為 key 重掛載。補 A→登出→B 的整合測試，斷言 A 的題幹永不出現。

### C2：localStorage 存取受限時，sessionStorage（含 AI key）完全不會被清理

**證據鏈**：`clearUserDataOnSignOut()` 用一個外層 `try` 包住 localStorage 與 sessionStorage 兩段（`services/storage.ts:723-760`）。若 `localStorage.length` 或 `localStorage.key(i)` 在無痕／storage-access-restricted 環境丟出 `SecurityError`，控制流程直接進入外層 catch（L758），因此永遠到不了 L741 的 sessionStorage 清理。sessionStorage 中的 `mindspark_ai_config` 便可能保留 API key。

**為何現有測試偽綠**：`clearUserDataOnSignOut.test.ts:77-89` 只模擬單一 `localStorage.removeItem` 失敗；該失敗已被 L733-739 的內層 catch 吞掉，測不到「列舉 localStorage 時即失敗」的分支，也未同時放入 session AI config 來斷言其仍被清除。

**修復方向**：localStorage 與 sessionStorage 的枚舉／刪除必須各自以獨立 try/catch 執行；前一個 storage 完全不可用時仍要嘗試另一個。補 `localStorage.length/key` 拋出但 sessionStorage 可用的測試，硬斷言 `mindspark_ai_config` 被移除。

## WARNING：規格／偽綠燈／一致性

1. **時區測試同義反覆**：`dateUtils.test.ts:56-65` 將結果比對為與實作相同的 `toLocaleDateString('sv-SE')`，沒有固定 `Asia/Taipei` 或硬斷言 UTC 01:00 對應本地日期；不能證明原 P0 時區情境。這確認 `audit_K7M4.md` 與 `audit_arbiter_R7QK.md` 的結論。
2. **跨全題庫複習後 retry 會靜默丟錯題**：spaced_due 建立全題庫 session（`useQuizEngine.ts:176-195`），但 QuizResult retry 未傳 `sessionBankIds`（`AppContent.tsx:152`），會退回目前 Dashboard 勾選題庫。錯題在未選題庫時會被過濾掉。這確認 Arbiter W6，屬功能正確性缺口、非本次 Storage blocker。
3. **Dashboard 到期數與實際 pool 對孤兒 SR 記錄不對稱**：Dashboard 數全部 due items（`Dashboard.tsx:83-86`），引擎只保留現存題目（`useQuizEngine.ts:192-195`）；歷史孤兒資料可顯示可複習數卻只跳 toast／較少題。確認 K7M4 W1。
4. **OpenSpec 文件與代碼落點不一致**：`timezone-aware-analytics/spec.md` 與 design 仍寫 `.gte()` 下界不可改為 local date，實作卻在 `analytics.ts:139` 改為 local date；而 proposal/design 宣稱 App.tsx 有 `startSpacedReview`，實際是 AppContent inline lambda。前者實作較符合 session_date 已改成本地日的資料模型，但歸檔前須修訂規格文字。
5. **已勾選、但無專項可重播證據**：不存在 signOut E2E；Battle E2E 沒有 1366×768 首屏選項／scroll 幾何斷言；Dashboard 亦沒有 dueCount 0/非 0 的 DOM click 測試。它們是證據缺口，不以此單獨升級為 CRITICAL。

## ponytail-audit

- `native:` 日期使用原生 Intl、Battle 使用純 CSS，沒有新增不必要依賴或 ResizeObserver。
- `yagni:` `DashboardProps.onStartSpacedReview?: () => void` 與 `onStartSpacedReview?.()`（`Dashboard.tsx:33,176`）不必要地容忍靜默 no-op；規格要求 callback，應設為 required。
- `shrink:` mode union 重複存在於 `types.ts:83`、`types/battleTypes.ts:370`、`useQuizEngine.ts:164`、`AppContent.tsx:73`；可收斂成共用型別，避免下次 mode 漏改。
- `delete:` 本次改動範圍沒有可確認的不可達程式或 dead event；Knip 亦為 0 issues。

## ponytail-debt

排除 docs／OpenSpec 文字與歷史報告後，runtime 有 2 筆 marker，皆具升級觸發條件：

| 位置 | ceiling／trigger | 狀態 |
|---|---|---|
| `services/storage.ts:35` | v2.0 遷移至 user-scoped IndexedDB 後退役 | 有 trigger |
| `components/KnowledgeGraph/NodeEditPanel.tsx:266` | schema-v2 migration window 於 2026-10-01 關閉 | 有 trigger，臨近到期 |

統計：**2 markers，0 no-trigger**。本次 C2 顯示 storage 退場標記不等於目前隔離安全已充分達成。

## 與既有三份報告的交叉結論

- `audit_inquisitor_7128.md` 的「PASS／零偽綠燈」不成立：至少時區同義反覆、C1、C2 三個直接反例。
- `audit_K7M4.md` 的 Conditional Pass 框架及孤兒／optional callback／證據缺口判定正確，但未覆蓋 C1/C2。
- `audit_arbiter_R7QK.md` 對規格偏離、retry 非對稱與時區測試的辨識正確，但其「CRITICAL 0」結論忽略 C1/C2 的登出失敗與跨身份生命週期。

## 流程標記（非核心 CRITICAL）

1. **待提交確認**：本 change 與實作仍在未提交 working tree；這是交付動作，不是程式邏輯漏洞。
2. **任務標記**：`tasks.md` 已全數 `[x]`。其中 4.3、6.2、7.4 的可重播證據不足已列於 WARNING 5，不應與 C1/C2 混為同一級別。

## 結案門檻

在修復並測試 C1、C2 前，不建議 commit-as-complete 或 archive。完成後再補三項低成本證據（固定時區、Dashboard click、1366×768 layout）及修正 OpenSpec 文件落點，即可重新進行最終審計。
