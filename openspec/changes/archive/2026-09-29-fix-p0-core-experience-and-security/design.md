## Context

MindSpark 是以 React + Vite + TypeScript 構建的互動式測驗學習工具，核心賣點為 SM-2 間隔重複演算法與 RPG 遊戲化戰鬥。經第三方代碼審計（`docs/CODEBASE_REPORT_REVIEW.md`）確認 5 項 P0 級缺陷影響核心體驗與安全。

### 現狀代碼引用

| 問題 | 檔案 | 行號 | 證據 |
|:---|:---|:---:|:---|
| SM-2 入口斷鏈 | `Dashboard.tsx` | L172-178 | `dueCount` 渲染為純 `<div>`，不可點擊，無啟動 spaced review 的按鈕或回調 |
| 快捷鍵劫持 | `useKeyboardShortcuts.ts` | L29-32 | 直接 `preventDefault()` 所有匹配鍵，無 `ctrlKey/altKey/metaKey/isComposing` 檢查 |
| UTC 日期倒流 | `analytics.ts` | L25, L168 | `new Date().toISOString().split('T')[0]` 在 UTC+8 00:00~07:59 歸入前一天 |
| UTC 日期倒流 | `streak.ts` | L82, L93 | 同上；`yesterday` 也用 `toISOString()` 計算 |
| 登出未清資料 | `AuthContext.tsx` | L42-44 | `signOut` 僅 `supabase.auth.signOut()`，零 localStorage 清理 |
| 戰鬥溢出 | `BattleArena.tsx` | L278, L603 | 角色精靈 `w-24 h-32 md:w-32 md:h-40` + `min-h-[160px] md:min-h-[200px]` 舞台固定高度 |

### 架構約束
- **Service Layer + Domain Hooks 模式**：元件不直接存取 storage；I/O 由 `services/` 處理
- **雙重持久化**：訪客 = localStorage (`mindspark_*`)；登入 = Supabase + localStorage
- **型別優先**：`types.ts` 中 `QuizState.mode` 為 `'random' | 'mistake' | 'retry_session' | 'challenge' | 'chunked'`
- **STORAGE_KEYS 註冊表**：`services/storage.ts` L3-33 定義所有 `mindspark_*` 鍵

## Goals / Non-Goals

**Goals:**
1. 打通 SM-2 待複習入口至測驗的端到端流程（Dashboard → startQuiz → spaced_due 模式）
2. 消除快捷鍵對瀏覽器原生組合鍵與 IME 選字的劫持
3. 統一日期計算為本地時區，修復 UTC+8 用戶的打卡/統計歸日問題
4. 確保登出時敏感 localStorage 資料完全清理，防止跨帳號殘留
5. 優化戰鬥舞台在筆電螢幕的垂直佈局，防止選項溢出

**Non-Goals:**
- SM-2 評分梯度優化（P2，保持現有 grade=4/1 二元評分）
- 成就系統補全（P1，本次不涉及）
- 音效雙軌統一（P1，本次不涉及）
- 雲端同步 ID 映射機制（P1 架構風險，本次不涉及）
- FocusTimer 統計接入（P1，本次不涉及）

## Decisions

### D1: SM-2 spaced_due 模式 — 擴展 QuizState.mode 聯合型別 + 全題庫載入 + 急迫度排序保護

**選擇**：在 `QuizState.mode` 新增 `'spaced_due'` 字面量。在 `useQuizEngine.startQuiz` 中實現全題庫到期題載入、按 `nextReviewDate` 遞增排序（`a.nextReviewDate - b.nextReviewDate`），並**在切片邏輯中豁免 `shuffleArray` 洗牌**以 100% 保障出題題序。Dashboard 回調採用無參介面 `onStartSpacedReview: () => void`。

**理由**：
- `spaced_due` 模式的題目來源為 `getDueQuestions()` 篩選後的到期題目，與 `random` 的全量隨機洗牌不同
- **急迫度排序保護（防洗牌）**：既有 `useQuizEngine.ts:202-205` 的 `shuffleArray(pool)` 會打亂題目，必須將 `spaced_due` 納入豁免清單：
  ```typescript
  const finalQuestions = (mode === 'retry_session' || mode === 'chunked' || mode === 'spaced_due')
    ? (count ? pool.slice(0, count) : pool)
    : shuffleArray(pool).slice(0, count);
  ```
- **全題庫題源載入**：Dashboard 的 `dueCount` 統計全域題庫，若僅載入 `selectedQuizBankIds` 會造成未勾選題庫的到期題目遺漏。當 `mode === 'spaced_due'` 時，`startQuiz` 應載入所有已存在題庫：
  ```typescript
  const effectiveBankIds = mode === 'spaced_due'
    ? (await repository.getBanks()).map(b => b.id)
    : selectedQuizBankIds;
  ```
- **極簡無參介面**：`DashboardProps` 定義為 `onStartSpacedReview: () => void`，由引擎端自身向 repository 查詢到期題目並自定數量，避免跨層傳遞易失效的 `dueCount` 狀態。

**替代方案（否決）**：
- 複用 `'random'` + 額外 flag → 汙染既有模式語義，condition branching 散布更廣
- 在 Dashboard 中預篩選題目再傳入 `startQuiz(count, 'random', dueQuestionIds)` → 破壞模組分工，Dashboard 需承擔出題責任
- 隨機打亂到期題目（不排序）→ 違反認知科學間隔重複原則，逾期最久題目無法優先強化

**Blast Radius**：
- `types.ts:83` — mode union 新增 `'spaced_due'`
- `hooks/useQuizEngine.ts` — `startQuiz` 新增 `spaced_due` 模式跨題庫載入、排序與豁免 `shuffleArray`
- `components/Dashboard.tsx` — 新增無參 `onStartSpacedReview: () => void` 回調
- `components/AppContent.tsx` — inline 呼叫 `quizEngine.startQuiz(undefined, 'spaced_due')`

### D2: 快捷鍵修飾鍵守衛 — 前置守衛模式

**選擇**：在 `handleKeyDown` 函式開頭新增統一前置守衛，在 `isEditableTarget` 檢查之後、具體按鍵匹配之前。

```typescript
// Modifier key guard — do not interfere with browser/OS shortcuts
if (event.ctrlKey || event.altKey || event.metaKey) return;
// IME composition guard — do not interfere with CJK input
if (event.isComposing || event.keyCode === 229) return;
```

**理由**：
- 最小修改量（2 行 + 1 行 keyCode 229 兼容），零 regression 風險
- `keyCode === 229` 是 CJK 輸入法在某些瀏覽器的特殊回報碼，需額外兼容
- 統一前置攔截比在每個 `case` 中判斷更簡潔且不易遺漏

**替代方案（否決）**：
- 僅在 `preventDefault()` 行加條件 → 仍會進入 handler 執行邏輯，只是不阻擋預設行為
- 使用 `event.getModifierState()` → 過於冗長，不如直接檢查布林屬性

**Blast Radius**：
- `hooks/useKeyboardShortcuts.ts:L28-32` — 僅此一處

### D3: UTC 日期修正 — 集中式 `getLocalDateString` 工具函式

**選擇**：新增 `utils/dateUtils.ts` 模組，導出 `getLocalDateString(date?: Date): string`，使用原生 `(date ?? new Date()).toLocaleDateString('sv-SE')` 產生 `YYYY-MM-DD` 格式本地日期。內部加入 `isNaN(targetDate.getTime())` 容錯守衛。

**理由**：
- `toLocaleDateString('sv-SE')` 會依使用者的系統時區產出 `YYYY-MM-DD`，而非 UTC
- 集中式工具函式避免散布修復，未來新增日期比較場景直接引用
- `'sv-SE'` locale 是 IANA 標準的 ISO 8601 日期格式 locale，無需手動 `padStart`

**替代方案（否決）**：
- 手動 `getFullYear()/getMonth()/getDate()` 拼接 → 可行但冗長，容易遺漏 0-padding
- 使用 `date-fns` 或 `dayjs` → 引入外部依賴，專案已無此類依賴，overkill
- `Intl.DateTimeFormat` → 格式控制不如 `toLocaleDateString('sv-SE')` 直接

**受影響代碼與資料流追溯**：
| 檔案 | 行號 | 場景 | 影響下游 |
|:---|:---:|:---|:---|
| `analytics.ts` | L25 | `recordStudySession` — 雲端 study_sessions 的 session_date 比對 | Supabase `study_sessions.session_date` 欄位寫入 |
| `analytics.ts` | L168 | `recordLocalStudySession` — 本地學習統計日期 | localStorage `mindspark_study_sessions` |
| `streak.ts` | L82 | `updateLocalStreak` — today 計算 | localStorage `mindspark_streak.lastStudyDate` |
| `streak.ts` | L93 | `updateLocalStreak` — yesterday 計算 | Streak 連續判定 |
| `analytics.ts` | L139 | `getWeeklyStats` — 7 天範圍查詢 | 使用 `getLocalDateString(sevenDaysAgo)` 作為 `.gte()` 查詢下界，與本地日期完全對齊 |

**不修改的 toISOString 場景**：
- `storage.ts:L276`、`cloudStorage.ts:L545/678/908-909`、`graphStorage.ts:L87/92/140`、`graphCloudStorage.ts:L170`、`challenges.ts:L64/89` — 這些用於雲端 timestamp 記錄或 LWW 比較，UTC 是正確語義
- 所有 `__tests__/` 中的 `toISOString` — 測試資料，不影響生產

### D4: 登出資料隔離 — 雙 Storage 白名單清理 + try...finally 保證 + SIGNED_OUT 防守底線

**選擇**：在 `signOut` 中採用 `try...finally` 結構呼叫 `clearUserDataOnSignOut()` 工具函式。該函式採用獨立 `try...catch` 區塊分別清理 `localStorage`（白名單保留 theme/bgm/sfx）與 `sessionStorage`（銷毀所有敏感項目含 `mindspark_ai_config` API 金鑰），確保單一存儲列舉異常時不阻斷另一存儲之清理。同時在 `onAuthStateChange('SIGNED_OUT')` 中加入防守底線調用。

```typescript
// ponytail: [Sunset: v2.0 - 待系統全面遷移至 user-scoped IndexedDB 後，localStorage 暫存機制將正式退役]
export const SIGNOUT_WHITELIST = new Set([
  'mindspark_theme',
  'mindspark_bgm_enabled',
  'mindspark_sfx_enabled',
]);

export const clearUserDataOnSignOut = (): void => {
  // 1. Clean localStorage (preserving device-level whitelist)
  try {
    if (typeof localStorage !== 'undefined') {
      const localKeysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEYS.PREFIX) && !SIGNOUT_WHITELIST.has(key)) {
          localKeysToRemove.push(key);
        }
      }
      localKeysToRemove.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove localStorage key: ${key}`, e);
        }
      });
    }
  } catch (error) {
    console.error('Failed to clear localStorage on sign out:', error);
  }

  // 2. Clean sessionStorage (remove all sensitive items including AI keys)
  try {
    if (typeof sessionStorage !== 'undefined') {
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(STORAGE_KEYS.PREFIX)) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach((key) => {
        try {
          sessionStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove sessionStorage key: ${key}`, e);
        }
      });
    }
  } catch (error) {
    console.error('Failed to clear sessionStorage on sign out:', error);
  }
};
```

**理由**：
- **安全完整性（Leak-proof）**：`sessionStorage` 中暫存有使用者的 AI API Key（Google/NVIDIA Key），登出時必須徹底銷毀，防止公用裝置被竊取盜刷
- **容錯保證（Fault-tolerant）**：`try...finally` 確保即便 Supabase 遠端網路請求失敗，本地敏感資料 100% 被清理
- **無痕模式容錯**：`try...catch` 防止在極端環境下拋出 `SecurityError`
- **白名單保留 theme/bgm/sfx**：裝置級偏好登出後保留，避免暗色主題閃退為亮色

**替代方案（否決）**：
- `localStorage.clear()` → 會清除非 MindSpark 的第三方資料（如其他同 domain 應用的設定）
- 僅在 `supabase.auth.signOut()` 成功後清理 → 斷網或 API 故障時造成敏感資料外洩
- 僅清理 `localStorage` → 遺漏 `sessionStorage` 中的 AI Key，存在重大安全漏洞

**Blast Radius**：
- `contexts/AuthContext.tsx:L42-44` — `signOut` 函式 `try...finally` 修改 + `onAuthStateChange` 新增 `SIGNED_OUT` 分支
- `services/storage.ts` — 新增 `clearUserDataOnSignOut` 導出（含 local+session storage 清理）+ `SIGNOUT_WHITELIST` 常數

### D5: 戰鬥舞台緊湊模式 — 純 CSS 響應式方案

**選擇**：使用 CSS `max-h-[25vh] md:max-h-[28vh]` 約束舞台最大高度，角色精靈在小螢幕使用 `w-16 h-20`，中大螢幕使用 `w-24 h-28`，舞台採用 `min-h-[80px] md:min-h-[110px]`。

```css
/* BattleArena 舞台區域 */
min-h-[80px] md:min-h-[110px]     /* 降低移動端與筆電端最小高度 */
max-h-[25vh] md:max-h-[28vh]      /* viewport 高度約束 */

/* 角色精靈 */
w-16 h-20 md:w-24 md:h-28         /* 緊湊精靈尺寸 */
```

**理由**：
- 純 CSS 方案無需 JS 動態計算，效能最佳
- `25vh~28vh` 確保戰鬥舞台不超過 viewport 28%，剩餘空間給 QuizCard（約 60vh）+ Header（10vh），保證 1366×768 筆電解析度下四個選項完全可視無需滾動
- `overflow-hidden` 防止極端情況下的溢出

**替代方案（否決）**：
- 雙欄並排佈局（BattleArena 左 + QuizCard 右）→ 重構成本高，移動端體驗差
- JavaScript `ResizeObserver` 動態計算 → 過度工程，Tailwind 斷點已足夠
- 完全隱藏戰鬥舞台 toggle → 破壞遊戲化體驗

**Blast Radius**：
- `components/BattleArena.tsx` — 舞台容器與精靈尺寸 CSS class 修改

## Risks / Trade-offs

| 風險 | 嚴重度 | 緩解措施 |
|:---|:---:|:---|
| `spaced_due` 模式新增可能未覆蓋所有分支（如 quiz resume、chunked practice 交互） | 中 | 限定 `spaced_due` 不支援 chunked practice 與 challenge mode；E2E 測試覆蓋完整啟動-答題-結束流程 |
| `clearUserDataOnSignOut` 白名單可能遺漏新增的無敏感性 key | 低 | 白名單使用 `Set` 集中管理，新增無敏感 key 時同步更新 `SIGNOUT_WHITELIST`；ponytail sunset 標記提醒 v2.0 退役 |
| `toLocaleDateString('sv-SE')` 的瀏覽器兼容性 | 低 | 所有現代瀏覽器（Chrome 24+, Firefox 29+, Safari 10+）均支援。回退方案：手動 `getFullYear/getMonth/getDate` 拼接 |
| 戰鬥舞台 `max-h-[25vh] md:max-h-[28vh]` 在超低解析度設備上可能壓縮過度 | 低 | `min-h-[80px] md:min-h-[110px]` 作為下限保護 |
| `isComposing` 在 Firefox 舊版本可能不觸發 | 低 | `keyCode === 229` 作為 fallback |

### 回滾策略

每項修復皆為獨立、局部修改，可逐一回滾：
1. **SM-2 入口**：移除新增的 `onStartSpacedReview` prop 與 `'spaced_due'` mode → 恢復純展示 `<div>`
2. **快捷鍵守衛**：移除 2 行前置守衛 → 恢復原始行為
3. **UTC 修正**：將 `getLocalDateString()` 調用改回 `new Date().toISOString().split('T')[0]`
4. **登出清理**：移除 `clearUserDataOnSignOut()` 調用與 `SIGNED_OUT` 分支 → 恢復僅 Supabase signOut
5. **戰鬥佈局**：恢復原始 CSS class → 恢復固定高度

## Open Questions

_本設計無未決問題。所有 5 項修復的技術方案已確定。_
