# MindSpark 專案安全性與邏輯風險稽核報告

**日期：** 2026-05-21  
**稽核對象：** MindSpark Quiz App 程式碼庫  
**狀態：** 審查完成

## 1. 摘要

本報告針對 MindSpark 專案進行了全面的安全性掃描、邏輯流審查及並發問題分析。雖然專案在大多數 React 最佳實踐上表現良好（如未使用 `dangerouslySetInnerHTML`），但在雲端同步、本機草稿保存及敏感資料管理方面仍存在顯著風險。

---

## 2. 核心風險分析

### 2.1 雲端同步競態條件 (Race Conditions)
- **位置：** `services/cloudStorage.ts` -> `syncLocalPracticeSessions()`
- **成因：** 同步邏輯採用迴圈內 `await` 順序執行，且缺乏並發鎖（Lock）或原子化操作。
- **原因：** 當用戶在多個分頁開啟應用，或在同步進行中再次觸發同步（例如快速切換路由導致 Effect 重跑），多個同步程序可能同時存取與寫入相同 ID 的 Session。
- **結果：** `isLocalNewer` 的檢查可能因非同步延遲而失效，導致舊資料覆蓋新資料。
- **影響：** 用戶在不同裝置或分頁間的練習進度出現衝突，甚至導致資料遺失。

### 2.2 本機草稿保存邏輯衝突
- **位置：** `hooks/useChunkedPractice.ts` -> `updateChunkDraft` 與 `beforeunload` 事件
- **成因：** 同時存在手動進度更新與瀏覽器關閉時的強制更新，兩者皆存取相同的 `localStorage` 鍵值。
- **原因：** `beforeunload` 會在組件卸載時觸發，若此時 `latestProgressRef` 尚未更新至最新狀態，或與組件內的 `useState` 更新發生微任務（Microtask）排序衝突。
- **結果：** 進度可能出現「回流」（Regression），即新進度被舊進度覆蓋。
- **影響：** 用戶在練習過程中意外關閉瀏覽器後，重新進入時發現進度停留在數題之前，造成負面體驗。

### 2.3 敏感憑證洩露風險 (Credential Exposure)
- **位置：** `services/ai.ts` -> `getAIConfig()` & `saveAIConfig()`
- **成因：** AI API 金鑰（API Key）直接存儲於 `localStorage` 或 `sessionStorage`。
- **原因：** 本專案為純前端架構（Client-side only），缺乏後端 Proxy 代理。
- **結果：** 任何發生在同網域下的 XSS (Cross-Site Scripting) 攻擊都能直接讀取這些儲存空間。
- **影響：** 用戶的 Google Gemini 或 OpenAI API Key 可能被惡意腳本盜取，造成經濟損失或帳號被停權。

### 2.4 雲端資料庫完整性風險 (Data Integrity)
- **位置：** `services/cloudStorage.ts` -> `saveCloudQuestions()`
- **成進：** 採取「先 Upsert 再 Delete」的兩階段策略，且這兩步並非原子交易（Atomic Transaction）。
- **原因：** 受限於 Supabase PostgREST 的 REST API 特性，多表操作或混合操作難以達成真正的 DB Transaction（除非使用 RPC）。
- **結果：** 若 Upsert 成功但後續的 Cleanup Delete 失敗（例如網路中斷），雲端資料庫將殘留已刪除的題目。
- **影響：** 用戶重新從雲端抓取題庫時，會出現「幽靈題目」，導致本地與雲端資料不一致。

---

## 3. 安全性弱點掃描

### 3.1 第三方套件漏洞
- **發現：** `npm audit` 回報了 10 個漏洞（5 個 Moderate, 5 個 High）。
- **重點：** `dompurify` (Moderate) 與 `vite` (High) 存在已知風險。
- **影響：** 雖然應用程式目前未使用 `dompurify` 處理核心邏輯，但 `vite` 的漏洞可能影響開發環境或預覽模式的安全。

### 3.2 缺乏 CSRF 防護
- **成因：** 雲端操作依賴 Supabase Auth，雖然 Supabase 內建部分防護，但對於跨站請求的防禦仍依賴用戶端的存取權限控管。
- **影響：** 雖然風險較低（因主要為 JSON API），但仍需確保 Supabase 的 RLS (Row Level Security) 政策極度嚴謹。

---

## 4. 改善建議建議

| 類別 | 建議措施 | 優先級 |
|------|---------|--------|
| **同步** | 在 `syncLocalPracticeSessions` 引入並發控制，使用 `isSyncing` 旗標防止重複觸發。 | **高** |
| **資料** | 將 `saveCloudQuestions` 改為使用 Supabase RPC (Database Function) 以實現原子交易。 | **中** |
| **安全** | 升級 `vite` 與 `dompurify` 等受災套件至最新版本。 | **高** |
| **架構** | 建議建立一個中轉後端（Middleware），將 API Key 儲存在伺服器端而非前端。 | **中** |
| **體驗** | 在 `updateChunkDraft` 中加強時間戳檢查，確保只有較新的 `updatedAt` 能覆蓋現有資料。 | **中** |

## 5. 結論

MindSpark 專案目前的架構對於單機用戶非常穩定，但在雲端同步與多端操作的情境下存在潛在的資料完整性與競態風險。安全性方面，雖然 React 的預設防護減少了 XSS 的直接危害，但 API Key 的前端儲存仍是最大的安全隱憂。建議優先處理**同步鎖**與**套件升級**，以提升系統的穩定性與安全性。

---

## 6. 內容安全策略 (Content Security Policy, CSP) 實施建議

為防範潛在的 XSS 攻擊讀取 `localStorage` 或 `sessionStorage` 中的敏感 AI API 金鑰，本專案強烈建議實施內容安全策略 (CSP)。以下為建議的實施流程，採取「漸進式部署」以防中斷正常服務。

### 6.1 建議之 CSP 策略配置

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.openai.com https://integrate.api.nvidia.com;
```

**關鍵策略說明：**
- `default-src 'self'`: 預設只允許載入同源資源。
- `connect-src`: 限制只允許前端向 Supabase (`https://*.supabase.co`)、Google Gemini API (`https://generativelanguage.googleapis.com`)、OpenAI/NVIDIA API 發送網路請求，阻斷惡意腳本將竊取的 API 金鑰外傳至攻擊者伺服器。

### 6.2 漸進式實施流程 (Report-Only → Enforce)

為避免策略配置錯誤導致現有功能中斷（如阻斷合法的第三方 API 請求），建議採取以下兩階段流程：

#### 階段 1：啟用 Report-Only 模式 (收集違規報告)
在測試環境與初期生產環境中，先啟用 `Content-Security-Policy-Report-Only`。此模式下，瀏覽器不會封鎖違規資源的載入，但會將違規事件回報至指定端點。
- **實施方式：** 在 `index.html` 插入 `<meta>` 標記（僅適用於開發期本地調試）或在 HTTP 回應標頭中設定：
  ```html
  <meta http-equiv="Content-Security-Policy-Report-Only" content="default-src 'self'; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.openai.com https://integrate.api.nvidia.com; report-uri /api/csp-report;">
  ```
- **工作重點：** 監控 `/api/csp-report` 的回報，收集非預期的封鎖事件並修正 CSP 宣告。

#### 階段 2：切換至 Enforce 模式 (全面強制封鎖)
當運作 1~2 週後，確認無合法的服務請求被誤報後，將回應標頭切換為強制模式 `Content-Security-Policy`。
- **實施方式：** 在伺服器端 HTTP 標頭（如 Vercel, Netlify 或 Nginx 設定）中加入：
  ```http
  Content-Security-Policy: default-src 'self'; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.openai.com https://integrate.api.nvidia.com;
  ```
- **效果：** 此時一旦有惡意 XSS 注入並試圖將 API Key 送至外部未授權網域，瀏覽器將強制阻斷請求，確保資料安全。
