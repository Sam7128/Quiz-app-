## Context

MindSpark 在完成 P0（核心體驗與安全隔離）及 P1 第一階段（學習體驗與統計結算全路徑閉環）後，系統已具備健全的測驗主迴圈。然而在底層架構、資源生命週期與資料邊界上，仍存在 4 項顯著的技術債與防禦漏洞：
1. `BankManager.tsx` 匯入缺少 UTF-8 BOM（`\uFEFF`）前導清洗，且匯出仍依賴 Data URI + `encodeURIComponent`，存在 URL 長度溢出與 OOM 風險；
2. 做題卡 `QuizCard.tsx` 仍依賴額外的 `use-sound` 套件，且其靜音狀態孤立於本機 `useState(true)`，與戰鬥系統已統一的 Howler.js 單例及全域 `STORAGE_KEYS.SFX_ENABLED` 完全脫節；
3. `services/storage.ts` 反序列化（特別是 `getQuestions`）盲目信任 `JSON.parse` 轉型，缺乏結構守衛，遇 `options: null` 等損毀資料即引發未捕獲之 `null.map()` 白屏崩潰；
4. `index.html` 首頁缺少阻斷式主題識別腳本，夜間深色模式使用者在 1.3MB JS bundle 解析前必直視數百毫秒白屏 (FOUC)。

## Goals / Non-Goals

**Goals:**
- **檔案處理耐久性**：在 `BankManager.tsx` 匯入時過濾 `\uFEFF`，匯出轉向 `Blob` + `URL.createObjectURL`，並在 1000ms 延遲後調用 `URL.revokeObjectURL` 釋放記憶體。
- **音效架構單一化**：從專案依賴徹底拔除 `use-sound`，擴充 `useSoundEffects` 提供答對/答錯音效，全面受控於 `STORAGE_KEYS.SFX_ENABLED`。
- **防禦性執行期驗證**：建立零額外依賴的 `isValidQuestion` 型別守衛，在 `getQuestions` 讀取時過濾隔離畸形題目，避免白屏並維持存量資料容錯。
- **首屏零白閃 (Zero-FOUC)**：在 `index.html` `<head>` 注入防禦型 inline `<script>`，相容 CSP 與無痕模式，保證深色模式於 DOM 渲染前即刻生效。

**Non-Goals:**
- 不重構 `BankManager.tsx` 的整體 UI 或資料夾管理邏輯（僅專注於匯入清洗、匯出 Blob 與結構守衛）。
- 不引入重型外部驗證庫（如 Zod、Yup、Valibot），維持既有 TypeScript Type Guard 輕量零負擔模式。
- 不更動伺服器端 Supabase 資料結構或進行後端架構重寫。
- 不新增非必要之自訂音效或音訊控制介面。

## Decisions

### 1. UTF-8 BOM 清洗與 Blob Object URL 生命週期
- **決策**：在 `BankManager.tsx` 的 `processJson(jsonString)` 入口，首先執行 `const cleaned = jsonString.replace(/^\uFEFF/, '');`；匯出時建立 `new Blob([JSON.stringify(currentQuestions, null, 2)], { type: 'application/json;charset=utf-8' })`，生成 Object URL 後在微任務或 `setTimeout(..., 1000)` 調用 `URL.revokeObjectURL`。
- **替代方案與取捨**：
  - *Data URI 匯出*：代碼極簡，但現代瀏覽器對 Data URI URL 長度有 2MB~32MB 上限，千題匯出極易截斷或引發記憶體 OOM。
  - *立即同步 revokeObjectURL*：在觸發 `click()` 後立即 revoke，部分瀏覽器（Firefox / 舊版 WebKit）在非同步準備下載時會因 URL 已失效而下載失敗。1000ms 延遲釋放是工業界標準做法。

### 2. 徹底割除 `use-sound`，將答題音效收斂至 `useSoundEffects`
- **決策**：
  - 在 `package.json` 中移除 `use-sound` 依賴。
  - 擴充 `hooks/useSoundEffects.ts` 的 `UseSoundEffectsReturn` 介面，新增 `playCorrect: () => void` 與 `playWrong: () => void`。
  - 在 `useSoundEffects.ts` 內以 Howler 單例模式維護 `/sounds/correct.mp3`（音量 0.5）與 `/sounds/wrong.mp3`（音量 0.3），並在播放前直接檢查 `isSfxEnabled`；若為 false 則立即返回（no-op）。
  - `components/QuizCard.tsx` 移除 `useSound` 導入與孤立的 `const [soundEnabled, setSoundEnabled] = useState(true)`，改為解構 `useSoundEffects()` 之 `playCorrect` 與 `playWrong`。
  - 同步更新既有單元測試（`autoAdvance.test.tsx`、`remediateBypass.challenger.test.ts`），全面替換原先對 `use-sound` 的 mock。
- **替代方案與取捨**：
  - *保留 `use-sound` 並將 `isSfxEnabled` 傳入*：雖然改動小，但維持雙軌音效引擎使打包維持多餘依賴，且無法解決行動端 Web Audio 實例重複建立問題。

### 3. 基於 Type Guard 的防禦性反序列化與隔離降級
- **決策**：
  - 於 `utils/typeGuards.ts` 實作 `isValidQuestion(value: unknown): value is Question`：
    - 檢查是否為非 null 物件；
    - 檢查 `id` 為 string 或 number；
    - 檢查 `question` 為非空字串；
    - 檢查 `options` 必須為 `Array.isArray` 且每個元素均為 `string`；
    - 檢查 `answer` 必須為 string 或非空 string 陣列。
  - 在 `services/storage.ts` 的 `getQuestions(bankId)` 中：
    ```ts
    const parsed: unknown = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    const validQuestions: Question[] = [];
    for (const item of parsed) {
      if (isValidQuestion(item)) {
        validQuestions.push(item);
      } else {
        console.warn(`[Storage] Quarantined corrupted question in bank: ${bankId}`, item);
      }
    }
    return validQuestions;
    ```
- **替代方案與取捨**：
  - *引入 Zod*：宣告力強，但 Zod 引入會增加 50KB+ gzip bundle，且專案已有 `utils/typeGuards.ts` 與防禦設計規範，原生 Type Guard 效能最高且 0 依賴。
  - *損毀時整庫拋錯/清空*：會造成單一題目欄位損毀導致用戶全部題庫消失（Blast Radius 過大）。過濾隔離並警示可最大程度保全使用者有效題目。

### 4. `<head>` 阻斷式主題初始化消除 FOUC
- **決策**：
  - 在 `index.html` 的 `<head>` 結尾（`</head>` 前）注入：
    ```html
    <script>
      (function() {
        try {
          var stored = localStorage.getItem('mindspark_theme');
          var theme = stored || 'light';
          var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
          if (isDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } catch (e) {
          // Fallback gracefully on storage access denial
        }
      })();
    </script>
    ```
  - 符合 `index.html` 既有 CSP：`script-src 'self' 'unsafe-inline'`。
  - 完全相容 `ThemeContext.tsx`：React 元件載入後接管切換與監聽，維持無縫過渡。
- **替代方案與取捨**：
  - *CSS media query 優先*：純 CSS 無法得知使用者在 localStorage 中自訂的 `mindspark_theme: 'dark'`（若系統為淺色），仍會閃爍。
  - *外連獨立 script*：多一次 HTTP 請求延遲，不如 inline script 真正阻斷渲染零閃爍。

## Risks / Trade-offs

- **[Risk] Howl 初始化在部分瀏覽器或測試環境的 mock 相容性** → 在 `useSoundEffects.ts` 中保持現有的 `try-catch` 包裹與 `onloaderror`/`onplayerror` no-op 兜底，並在測試套件中提供健全的 Howler mock。
- **[Risk] 舊題庫存有稍微缺欄位（如缺少 tags 或 explanation）的題目被誤殺** → `isValidQuestion` 僅將核心必要欄位（`id`、`question`、`options`、`answer`）列為必要，非核心欄位（`hint`、`explanation`、`tags`、`type`）列為可選容錯。
- **[Risk] Blob 匯出在舊型或內嵌 WebView 中的行為** → 保留標準 HTML5 `<a>` 標籤點擊觸發下載模式，符合所有現代主流瀏覽器標準。

## Migration Plan

1. 擴充 `utils/typeGuards.ts` 並於 `services/storage.ts` 接入驗證與過濾。
2. 擴充 `hooks/useSoundEffects.ts` 導出 `playCorrect` 與 `playWrong`，並修改 `QuizCard.tsx`。
3. 移除 `package.json` 中的 `use-sound` 依賴並更新測試 mock。
4. 更新 `components/BankManager.tsx` 的 BOM 清洗與 Blob 匯出。
5. 注入 `index.html` 的 FOUC 阻斷腳本。
6. 執行全量測試驗證（Vitest、TSC、Knip、Build）。

## Open Questions

- 無重大未決事項；實作範圍精確對齊四大目標。
