## ADDED Requirements

### Requirement: Production deployment exposes server-side security headers
系統 SHALL 透過 `vercel.json` 的 `headers` 區塊對所有路徑 `/(.*)` 注入 5 個伺服器端 HTTP 安全標頭：`Content-Security-Policy`、`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`、`Permissions-Policy`。這些標頭 SHALL 由伺服器（Vercel Edge）於回應 HTTP 請求時附加，而不是仰賴前端 `<meta http-equiv>` 標籤。

`<meta http-equiv="Content-Security-Policy">` 標籤得以保留於 `index.html` 作為 dev 環境 fallback，但上方 SHALL 註記「優先由 vercel.json 提供；此 meta 僅為 dev fallback」。Production 部署的 CSP 來源 SHALL 為 `vercel.json`，且 SHALL 完整覆蓋 dev meta CSP 的所有指令。

#### Scenario: Server attaches all 5 security headers
- **WHEN** 任意 HTTP 請求抵達部署後的 Vercel 預覽或 production 環境
- **THEN** 回應標頭 SHALL 包含全部 5 個標頭（`Content-Security-Policy`、`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`）
- **AND** `X-Frame-Options` SHALL 為 `DENY`
- **AND** `X-Content-Type-Options` SHALL 為 `nosniff`
- **AND** `Referrer-Policy` SHALL 為 `strict-origin-when-cross-origin`
- **AND** `Permissions-Policy` SHALL 至少包含 `camera=(), microphone=(), geolocation=()` 三項鎖定

#### Scenario: vercel.json retains existing rewrites
- **WHEN** 讀取修改後的 `vercel.json`
- **THEN** 既有 `rewrites` 區塊（`/api/nvidia/:path*` → NVIDIA proxy，`/(.*)` → `/index.html`）SHALL 完整保留
- **AND** 新增的 `headers` 區塊 SHALL 不影響 `rewrites` 行為

### Requirement: Content-Security-Policy connect-src fully whitelists production backends
`Content-Security-Policy` 的 `connect-src` 指令 SHALL 完整白名單所有 production 環境會發送網路請求的端點：本機同源 (`'self'`)、Supabase (`https://*.supabase.co`)、Google Gemini API (`https://generativelanguage.googleapis.com`)、OpenAI API (`https://api.openai.com`)、NVIDIA Integrate API (`https://integrate.api.nvidia.com`)。

當用戶需要配置自訂 AI Proxy 或 Local API 端點時，由於靜態 CSP 白名單之安全性限制，其 Proxy 域名需要在部署 `vercel.json` 前手動加入 `connect-src`。此設計邊界限制 SHALL 記錄於 `docs/SECURITY_LIMITATIONS.md`。

#### Scenario: connect-src includes OpenAI endpoint
- **WHEN** 解析 production `vercel.json` 中的 CSP 字串
- **THEN** `connect-src` SHALL 明確包含 `https://api.openai.com`
- **AND** SHALL 包含 `https://*.supabase.co`、`https://generativelanguage.googleapis.com`、`https://integrate.api.nvidia.com`
- **AND** SHALL 包含 `'self'`

#### Scenario: script-src forbids unsafe-eval
- **WHEN** 解析 production CSP 字串
- **THEN** `script-src` SHALL 為 `'self' 'unsafe-inline'`
- **AND** SHALL NOT 包含 `'unsafe-eval'`

#### Scenario: Dev meta CSP annotated as fallback
- **WHEN** 讀取 `index.html`
- **THEN** `<meta http-equiv="Content-Security-Policy">` 標籤上方 SHALL 註記「優先由 vercel.json 提供；此 meta 僅為 dev fallback；若有自訂 AI Proxy 需手動加白名單」
- **AND** 該 meta CSP 的 `connect-src` 亦 SHALL 包含 `https://api.openai.com`

#### Scenario: Custom AI proxy limitation documented
- **WHEN** 讀取 `docs/SECURITY_LIMITATIONS.md`
- **THEN** 必須包含「靜態 CSP 限制自訂 API 域名，需要部署前手動修改 vercel.json connect-src」的安全性邊界說明。
