# MindSpark 安全邊界與限制指南 (Security Limitations Guide)

本文件說明了 MindSpark 作為純前端應用程式（React + Vite + Supabase）的設計安全限制與技術邊界，以作為未來系統維護、部署與架構演進的正式依據。

---

## 1. API Key 前端加密與 XSS 邊界

### 1.1 前端加密機制
- 當用戶在設定中配置 OpenAI 或 Google Gemini API 金鑰並啟用「記住金鑰」時，金鑰會經由 Web Crypto API (AES-GCM-256) 進行加密，並以密文形式儲存於 `localStorage` 中。

### 1.2 技術限制與 XSS 風險
- **密鑰暴露**：雖然金鑰在 localStorage 中是加密的，但用於加密/解密金鑰的動態密鑰（derived key）是於執行期在瀏覽器記憶體中動態產生的。
- **XSS 邊界**：若應用程式遭受跨網站指令碼（XSS）攻擊，或用戶安裝了惡意瀏覽器擴充功能，攻擊者可以劫持執行期記憶體，進而取得已解密的 API 金鑰或解密所需的衍生金鑰。
- **安全建議**：前端加密僅能防範物理上對硬碟 localStorage 內容的直接讀取。若對安全性有極高要求，**強烈建議關閉「記住金鑰」**（這會改用 `sessionStorage` 儲存金鑰，且在分頁關閉後自動清除），或在伺服器端佈署專屬的反向代理伺服器。

---

## 2. Supabase 同步極限中斷風險

### 2.1 題庫與問題同步流程
- 同步流程採用**本地預寫保護（Write-Ahead Guard）**機制。在將題庫資料上傳至雲端（Supabase）前，會先在本地 `localStorage` 的 `mindspark_dirty_banks` 註冊該題庫。只有當雲端寫入（insert banks）與子資料表（save questions）皆順利成功且沒有拋出錯誤時，才會將其從 dirty 列表中移除。

### 2.2 極限中斷與資料一致性
- **斷網/瀏覽器突然關閉**：若在 upsert 進行的途中遭遇網路中斷或用戶直接關閉瀏覽器分頁，該題庫會以 `dirty = true` 保留在本地列表中。
- **重試機制**：下一次 App 初始化或手動刷新題庫時，系統會自動重試清理這些 dirty entries，防止產生半完成的「雲端幽靈題目」。
- **極限邊界**：本預寫機制之防護區間收縮在非同步 API 調用前（< 1ms）。但在極端硬體故障（如寫入 localStorage 的同時斷電）下，仍存在 metadata 不同步之極小機率。

---

## 3. 跨分頁與同步併發鎖的限制

### 3.1 鎖實作機制
- 系統同時提供基於 Web Locks API (`navigator.locks`) 的獨占鎖防護，在執行同步操作時會鎖定 `'mindspark_practice_sync'` (練習紀錄鎖) 與 `'mindspark_banks_sync'` (題庫鎖)。
- 對於不支援 Web Locks API 的瀏覽器，會自動回退為使用 localStorage timestamp-based 鎖（30 秒過期機制）。

### 3.2 支援度與超時風險
- **瀏覽器相容性**：大多數主流現代瀏覽器皆完整支援 Web Locks。若在隱私分頁、特定過時 WebView 或極度受限的 sandbox iframe 中運行，系統會自動降級至 localStorage 備用鎖。
- **逾時風險**：為防堵死鎖，備用鎖設計有 30 秒的硬性失效時間。若在極度低速網路下單次同步超過 30 秒，鎖可能會被其他分頁搶佔，因而引起資料覆蓋。

---

## 4. CSP `connect-src` 限制與自訂端點指引

### 4.1 靜態 CSP 限制
- Production 環境中由 `vercel.json` 注入的 `Content-Security-Policy` 標頭包含嚴格的 `connect-src` 白名單：
  ```
  connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.openai.com https://integrate.api.nvidia.com;
  ```
- 這是保護用戶免受惡意腳本將金鑰外洩至第三方域名（Data Exfiltration）的最核心防線。

### 4.2 自訂 AI Proxy 與 Local 端點指引
- **連線阻擋**：若用戶在設定頁面配置了自訂的 AI 轉接 Proxy（例如自建中繼伺服器或 `http://localhost:11434` 本地 Ollama），瀏覽器會因為違反 CSP 規則而**直接拒絕發送請求**。
- **解決方案**：自訂端點的用戶在部署此應用程式時，**必須手動修改 `vercel.json` 內的 `connect-src`**，將自訂的網域或 `http://localhost:*` 加入白名單中，然後重新部署。
- **開發環境**：本地開發時，`index.html` 的 CSP metaFallback 會允許這些連接以供調試。
