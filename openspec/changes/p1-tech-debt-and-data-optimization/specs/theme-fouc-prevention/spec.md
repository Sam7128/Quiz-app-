## ADDED Requirements

### Requirement: Zero-FOUC Head Theme Pre-render Script
系統 SHALL 在 `index.html` 的 `<head>` 區塊（於任何頁面內容與主要 CSS/JS 渲染前）注入極簡 inline `<script>`，阻斷式同步判定主題並為 `document.documentElement` 加入或移除 `dark` class，杜絕首屏刺眼白閃 (FOUC)。

#### Scenario: Stored dark theme applied before paint
- **WHEN** 瀏覽器載入 HTML 且 `localStorage` 中的 `mindspark_theme` 鍵值為 `'dark'`
- **THEN** pre-render 腳本 SHALL 立即對 `document.documentElement.classList.add('dark')`
- **AND** 該 class 注入 SHALL 在 DOM body 渲染前完成

#### Scenario: Stored light theme applied without dark class
- **WHEN** 瀏覽器載入 HTML 且 `localStorage` 中的 `mindspark_theme` 鍵值為 `'light'`
- **THEN** pre-render 腳本 SHALL 確保 `document.documentElement.classList.remove('dark')`

#### Scenario: System theme resolves OS dark preference
- **WHEN** `localStorage` 中的 `mindspark_theme` 為 `'system'`（或未設置預設）
- **AND** 使用者作業系統偏好為深色模式（`window.matchMedia('(prefers-color-scheme: dark)').matches === true`）
- **THEN** pre-render 腳本 SHALL 為 `document.documentElement.classList.add('dark')`

#### Scenario: System theme resolves OS light preference
- **WHEN** `localStorage` 中的 `mindspark_theme` 為 `'system'`（或未設置預設）
- **AND** 使用者作業系統偏好為淺色模式（`window.matchMedia('(prefers-color-scheme: dark)').matches === false`）
- **THEN** pre-render 腳本 SHALL 確保 `document.documentElement.classList.remove('dark')`

#### Scenario: Incognito or SecurityError storage fallback
- **WHEN** 瀏覽器處於無痕模式或安全限制環境，存取 `localStorage` 拋出 `SecurityError`
- **THEN** pre-render 腳本 SHALL 以 `try-catch` 捕獲例外且 NOT 拋出錯誤中斷 HTML 解析
- **AND** 腳本 SHALL 優雅降級使用 `window.matchMedia` 或預設主題判定
