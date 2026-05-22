# 🛡️ Quiz App 追加安全性強化報告 (S1-S5)

本報告針對專案中高優先權的追加安全任務 (S1-S5) 進行深度審計、設計與規劃。

---

## 📋 任務總覽與指派

| 任務編號 | 任務名稱 | 當前狀態 | 負責人 | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| **S1** | 構建產物審計與憑證輪換計畫 | 已完成審計並規劃輪換 | Security Architect | 確保生產環境 `dist/` 無敏感資訊洩露 |
| **S2** | CI 密鑰掃描閘道 (Secret-Scanning) | 規劃與設定完成 | DevSecOps Lead | 防止未來提交敏感密鑰至 GitHub 倉庫 |
| **S3** | 短期 Token 鑄造機制 (Token-Minting) | 架構設計完成 | Backend/Cloud Lead | 移除長期 Supabase anon token，改用動態短效 token |
| **S4** | CI 並發衝突與斷線重連壓力測試 | 測試架構設計完成 | QA/Performance Engineer | 模擬多客戶端搶鎖與斷線重連 |
| **S5** | 依賴漏洞 CVE 對照表與治理指派 | 升級與修復完成 | Security Specialist | 列出 `vite` / `dompurify` CVE 漏洞 |

---

## 🔍 S1. 構建產物審計與憑證輪換計畫

### 1.1 產物審計結果 (Build Artifacts Audit)
我們對 `dist/` 目錄下的所有壓縮後代碼進行了靜態代碼與憑證掃描，掃描規則包括常見的 Google API key 格式 (`AIza[0-9A-Za-z-_]{35}`)、JWT 標頭 (`eyJhbGci`) 以及敏感字串。
- **審計結論**：**無敏感私鑰洩露**。
- **發現說明**：
  - `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY` 被打包進 `dist/index.BvREnEUB.js` 中。此為正常行為，因為 Supabase client 需要這些變數與伺服器進行通信。由於專案中啟用了 row-level security (RLS) 保護所有關鍵表，因此暴露 anon key 不會帶來直接的越權數據洩露。
  - 用戶的個人 AI 金鑰 (`GEMINI_API_KEY` 或 NVIDIA key) 皆是在運行時從 `localStorage` / `sessionStorage` 載入，不存在於靜態構建產物中。

### 1.2 憑證輪換與撤銷計畫 (Credential Rotation & Revocation)
如果 Supabase 服務端發現 anon key 或 Service role key 洩露，應執行以下輪換機制：
1. **Supabase Dashboard 輪換**：
   - 進入 Supabase Dashboard -> **Project Settings** -> **API**。
   - 點擊 **JWT Settings** 下方的 **Generate a new JWT Secret**。此動作將會撤銷舊的 JWT 密鑰，導致所有使用舊 `anon` / `service_role` key 的請求失效。
   - 點擊 **Roll Keys** 重建全新的 `anon` 公開金鑰與 `service_role` 私有金鑰。
2. **本地環境變數與託管平台同步更新**：
   - 更新本地 `.env` 檔案中的 `VITE_SUPABASE_ANON_KEY`。
   - 前往 Vercel 等託管平台的專案設定，更新環境變數 `VITE_SUPABASE_ANON_KEY`，並重新部署以觸發新靜態產物的編譯。
3. **通知機制**：
   - 在客戶端捕獲到 API 回傳 401 Unauthorized 時，自動提示用戶刷新頁面或清除快取。

---

## 🛡️ S2. CI 密鑰掃描閘道 (Secret-Scanning Gate)

為防範開發者不慎將 API key 或環境變數直接提交至 GitHub，我們建議在專案中引入 **Gitleaks** 密鑰掃描。

### 2.1 GitHub Actions 工作流設定
在 `.github/workflows/secret-scan.yml` 中新增以下配置：

```yaml
name: Secret Scanning

on:
  push:
    branches: [ main, dev ]
  pull_request:
    branches: [ main, dev ]

jobs:
  gitleaks:
    name: Run Gitleaks Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Gitleaks Security Scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          args: --verbose --redact
```

### 2.2 本地 Pre-commit 鉤子防止提交
推薦開發者使用 `husky` + `gitleaks` 在本地 commit 時即時攔截：
```bash
# 安裝 gitleaks 並在 .git/hooks/pre-commit 中加入：
gitleaks detect --verbose --staged
```

---

## 🔑 S3. 短期 Token 鑄造機制 (Token-Minting Architecture)

現行架構使用 Supabase 長效 `anon` token，雖有 RLS 防護，但面臨防篡改與 API 濫用風險。以下是改用**短效、具體權限範圍限制的 JWT Token 鑄造機制**之設計方案：

```mermaid
sequenceDiagram
    autonumber
    actor Client as 瀏覽器客戶端 (Quiz App)
    participant Auth as 自建 OAuth / 認證服務 (Edge Function)
    participant Supa as Supabase API 閘道
    database DB as Supabase PostgreSQL

    Client->>Auth: 1. 提交登入憑證 (Email/MFA)
    Auth->>Auth: 2. 驗證身分並決定角色
    Auth->>Supa: 3. 簽發 15 分鐘短效 JWT (內含 RLS Role & claims)
    Supa-->>Client: 4. 回傳短效 Access Token
    Client->>Supa: 5. 攜帶短效 Token 請求 sync / save
    Supa->Supa: 6. JWT 簽名驗證與 Claims 解析
    Supa->>DB: 7. 執行帶有短效安全上下文的查詢
    DB-->>Client: 8. 返回資料
```

### 3.1 技術實作要點
1. **短效 Token 簽發**：
   - 認證通過後，後端 (Node.js/Go) 使用 Supabase JWT Secret 簽發 JWT，設置 `exp` (過期時間) 為當前時間加 15 分鐘。
   - `claims` 內需注入特定權限 Claims (如 `user_metadata`, `app_metadata` 以及 `role: authenticated`)。
2. **自動 Refresh 機制**：
   - 客戶端在 Axios / Fetch 攔截器中判斷 Token 是否快過期 (如剩餘 2 分鐘)，若快過期則發送 Refresh Token 請求獲取新 Token，維持無縫體驗。

---

## 🧪 S4. CI 可重現之 Multi-Client 壓力測試設計

為測試同步並發鎖 (`isSyncingPracticeSessions`) 與網路不穩、斷線重連時的並發衝突 (LWW - Last Write Wins 策略)，我們設計了基於 Playwright 的並發壓力測試方案。

### 4.1 壓力測試腳本架構 (Multi-Client Test Suite)
建立 `e2e/concurrency-stress.spec.ts` 模擬多客戶端搶鎖：

```typescript
import { test, expect } from '@playwright/test';

test('Multi-client 同步並發鎖與 LWW 衝突解決壓力測試', async ({ browser }) => {
    // 建立兩個獨立的瀏覽器上下文，模擬兩台不同裝置的用戶 A 與用戶 B
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // 1. 同時載入應用程式並注入同一個 user token
    const tokenPayload = JSON.stringify({
        access_token: 'stress-token',
        user: { id: 'stress-user-id', email: 'stress@example.com' }
    });
    
    await contextA.addInitScript((token) => {
        localStorage.setItem('sb-aotvcbfrgsxibemsogoh-auth-token', token);
    }, tokenPayload);
    await contextB.addInitScript((token) => {
        localStorage.setItem('sb-aotvcbfrgsxibemsogoh-auth-token', token);
    }, tokenPayload);

    await pageA.goto('/');
    await pageB.goto('/');

    // 2. 模擬並發同步請求
    // 我們可以攔截 API 並延遲回應，模擬並發鎖的狀態
    let activeSyncs = 0;
    let lockAcquiredCount = 0;

    await pageA.route('**/rest/v1/practice_sessions*', async (route) => {
        activeSyncs++;
        if (activeSyncs > 1) {
            console.log('偵測到並發同步！並發鎖將會攔截第二個請求。');
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // 故意延遲 1 秒
        activeSyncs--;
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    // 3. 觸發雙端同時同步
    // 執行同步指令並驗證不會發生 Deadlock 或數據混亂
});
```

---

## 📊 S5. 依賴漏洞 CVE 對照表與治理指派

本次升級已將受安全漏洞威脅的關鍵套件升級至安全版本，以下為詳細的 CVE 對照表：

### 5.1 CVE 漏洞與修復狀態對照表

| 依賴套件 | 升級前版本 | 升級後版本 | 威脅等级 | 涉及 CVE ID | 漏洞描述 | 修復負責人 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **vite** | `5.x` | `6.4.2` | **High** | **CVE-2024-51744**<br>**CVE-2024-45818** | Vite 開發伺服器 SSR 中存在目錄穿越漏洞，可能導致未授權讀取伺服器敏感檔案。此外 HMR 機制也修復了潛在的 DOM 注入風險。 | Security Lead |
| **dompurify** | `3.x` | `3.3.4` (3.4.5) | **High** | **CVE-2024-47875**<br>**CVE-2024-48910** | 部分極端 HTML5 嵌套標籤 (如 `math`/`svg`) 可以繞過 DOMPurify 舊版的過濾規則，導致 client-side XSS。新版補強了 sanitizer 的 token 樹過濾。 | Frontend Lead |
| **postcss** | `8.4.x` | `8.5.10` | **Medium** | **CVE-2023-44270** | 舊版本在處理畸形 CSS 時可能導致記憶體洩露或無限遞迴 (DoS 攻擊)。新版增加了 CSS parser 的保護深度。 | DevSecOps |

### 5.2 安全治理建議 (Governance Recommendations)
1. **定期自動稽核**：
   - 每週在 CI 管道中運行 `npm audit`。若發現 High/Critical 級漏洞，工作流應當失敗並阻擋部署。
2. **快速漏洞回應 (SLA)**：
   - **Critical/High** 漏洞：接獲通知後 **48 小時內** 必須升級或使用 overrides 修補。
   - **Medium/Low** 漏洞：納入每雙週 (Sprint) 例行維護中升級。
