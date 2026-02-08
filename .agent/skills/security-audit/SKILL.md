---
name: security-audit
description: 對 React/TypeScript 專案進行全面的安全弱點掃描和審計，包含依賴檢查、程式碼靜態分析、OWASP Top 10 審查。
---

# 🔐 Security Audit Skill

## Overview
此 Skill 提供全面的安全弱點審計能力，專為 React + TypeScript + Vite 專案設計。

## 使用時機
當用戶請求以下操作時啟用此 Skill：
- 安全審計 / Security Audit
- 弱點掃描 / Vulnerability Scan
- 依賴檢查 / Dependency Check
- OWASP 審查
- 程式碼安全檢查

---

## 🔧 前置準備

在開始審計前，確保已安裝必要工具：

```powershell
# 1. 安裝 npm-audit-html（可視化報告）
npm install -g npm-audit-html

# 2. 安裝 ESLint 安全插件（如尚未安裝）
npm install -D eslint-plugin-security

# 3. (可選) 安裝 Snyk CLI 進行更深入掃描
npm install -g snyk
```

---

## 📋 安全審計 Checklist

執行安全審計時，按順序完成以下檢查：

### Phase 1: 依賴漏洞掃描 (Dependency Scanning)

```powershell
# 1.1 基本 npm 審計
npm audit

# 1.2 生成 HTML 報告（可選）
npm audit --json | npm-audit-html --output ./security-reports/npm-audit-report.html

# 1.3 嘗試自動修復
npm audit fix

# 1.4 (可選) 使用 Snyk 進行更深入掃描
snyk test
```

**檢查重點：**
- [ ] 是否有 Critical 或 High 等級的漏洞？
- [ ] 這些漏洞是否有可用的修復版本？
- [ ] 是否有需要手動處理的 breaking changes？

---

### Phase 2: 靜態程式碼分析 (SAST)

#### 2.1 檢查 ESLint 安全規則

確保 `.eslintrc` 或 `eslint.config.js` 包含安全插件：

```javascript
// eslint.config.js 範例
import security from 'eslint-plugin-security';

export default [
  {
    plugins: {
      security
    },
    rules: {
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-possible-timing-attacks': 'warn',
    }
  }
];
```

#### 2.2 執行 ESLint 安全掃描

```powershell
npx eslint . --ext .ts,.tsx --format stylish
```

---

### Phase 3: OWASP Top 10 手動審查

對照 OWASP Top 10 (2021) 進行程式碼審查：

#### A01: Broken Access Control（權限控制失效）
- [ ] 檢查是否有未授權的路由訪問
- [ ] 確認敏感操作有適當的權限檢查

#### A02: Cryptographic Failures（密碼學失效）
- [ ] 檢查是否有硬編碼的密碼、API Key
- [ ] 確認敏感資料傳輸使用 HTTPS
- [ ] 檢查 localStorage 中是否存儲敏感資料

```powershell
# 搜尋硬編碼的密碼和 API Key
grep -r "password\|secret\|api_key\|apiKey\|token" --include="*.ts" --include="*.tsx" .
```

#### A03: Injection（注入攻擊）
- [ ] 檢查是否有 `dangerouslySetInnerHTML` 的使用
- [ ] 確認用戶輸入有適當的驗證和過濾

```powershell
# 搜尋危險的 HTML 注入
grep -r "dangerouslySetInnerHTML\|innerHTML\|eval(" --include="*.ts" --include="*.tsx" .
```

#### A04: Insecure Design（不安全的設計）
- [ ] 審查業務邏輯是否有安全漏洞
- [ ] 確認錯誤處理不會洩露敏感資訊

#### A05: Security Misconfiguration（安全配置錯誤）
- [ ] 檢查 `.env` 檔案是否被 git 追蹤
- [ ] 確認 CSP (Content Security Policy) 配置正確
- [ ] 檢查 CORS 配置

#### A06: Vulnerable Components（易受攻擊的元件）
- [ ] 回顧 Phase 1 的依賴掃描結果
- [ ] 檢查是否使用過時的元件

#### A07: Authentication Failures（身份驗證失效）
- [ ] 檢查登入/登出邏輯是否安全
- [ ] 確認 Session/Token 管理正確

#### A08: Software and Data Integrity Failures
- [ ] 檢查是否從不信任的 CDN 載入腳本
- [ ] 確認使用 SRI (Subresource Integrity) 驗證外部資源

#### A09: Security Logging Failures（安全日誌失效）
- [ ] 確認有適當的錯誤日誌機制
- [ ] 檢查日誌是否會洩露敏感資料

#### A10: SSRF（伺服器端請求偽造）
- [ ] 檢查 API 請求的 URL 是否可被用戶控制
- [ ] 確認有適當的 URL 驗證

---

### Phase 4: React 特定安全檢查

#### 4.1 XSS 防護
```powershell
# 搜尋潛在的 XSS 風險
grep -rn "dangerouslySetInnerHTML\|__html\|createTextNode\|document.write" --include="*.tsx" .
```

#### 4.2 敏感資料處理
```powershell
# 檢查 localStorage 使用
grep -rn "localStorage\|sessionStorage" --include="*.ts" --include="*.tsx" .
```

#### 4.3 第三方腳本
- [ ] 確認所有 `<script>` 標籤使用 `integrity` 屬性
- [ ] 檢查 iframe 的 `sandbox` 屬性

---

## 📊 報告輸出

審計完成後，生成報告：

```markdown
# Security Audit Report - [專案名稱]
日期：[YYYY-MM-DD]

## 摘要
- **Critical**: X 個
- **High**: X 個
- **Medium**: X 個
- **Low**: X 個

## 發現的問題

### [問題 #1: 標題]
- **嚴重程度**: Critical/High/Medium/Low
- **位置**: `path/to/file.tsx:line`
- **描述**: 問題描述
- **建議修復**: 修復建議

## 建議的下一步
1. 立即修復 Critical 和 High 問題
2. 排程修復 Medium 問題
3. 評估 Low 問題的修復優先級
```

---

## 🚀 快速命令

```powershell
# 一鍵依賴審計
npm audit

# 一鍵程式碼搜尋危險模式
grep -rn "dangerouslySetInnerHTML\|eval(\|innerHTML\|password\|secret\|apiKey" --include="*.ts" --include="*.tsx" src/

# 執行完整 TypeScript 類型檢查
npx tsc --noEmit
```

---

## 📚 參考資源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security Best Practices](https://reactjs.org/docs/introducing-jsx.html#jsx-prevents-injection-attacks)
- [npm audit documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [ESLint Security Plugin](https://github.com/eslint-community/eslint-plugin-security)
- [Snyk](https://snyk.io/)
