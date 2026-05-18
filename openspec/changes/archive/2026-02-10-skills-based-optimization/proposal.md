# Skills-Based Optimization

## Problem Statement
MindSpark Quiz App 目前缺乏系統性的程式碼品質與效能優化。主要問題包括：

1. **AI 題目生成不穩定** - LLM 輸出的 JSON 格式不一致，容易導致匯入失敗
2. **React 渲染效能不佳** - 大型元件 (`App.tsx` 888 行) 可能存在過度渲染問題
3. **戰鬥系統缺乏可追蹤性** - 複雜的狀態機邏輯難以偵錯，缺乏測試覆蓋
4. **缺乏端對端測試** - 核心功能無自動化測試保障
5. **安全性未全面審計** - 尚未針對 OWASP Top 10 進行系統性檢查

## Proposed Solution
利用現有的 7 個 Agent Skills 對應用進行 5 階段系統性優化：

| 階段 | 優化目標 | 使用 Skill |
|------|---------|-----------|
| Phase 1 | AI Prompt 優化 | `prompt-engineering-patterns` |
| Phase 2 | React 效能優化 | `vercel-react-best-practices` |
| Phase 3 | 戰鬥系統偵錯 | `systematic-debugging` |
| Phase 4 | E2E 測試 | `webapp-testing` |
| Phase 5 | 安全審計 | `security-audit`, `frontend-security-coder`, `security-scanning-security-sast` |

## Impacted Capabilities
- **AI 題目生成** (`services/ai.ts`) - Prompt 結構與錯誤處理
- **應用核心** (`App.tsx`) - 效能與渲染邏輯
- **Dashboard** (`components/Dashboard.tsx`) - memo 與 props 穩定性
- **戰鬥系統** (`hooks/useBattleSystem.ts`) - 狀態遷移與日誌
- **技能系統** (`constants/skillsData.ts`) - 觸發邏輯驗證
- **安全配置** (`index.html`, `vite.config.ts`) - CSP 與依賴

## Success Criteria
- [ ] AI 生成的 JSON 格式穩定性達 95% 以上
- [ ] React DevTools 無顯示過度渲染警告
- [ ] 戰鬥系統具備開發模式日誌與狀態圖文檔
- [ ] 核心流程有 E2E 測試覆蓋 (可選)
- [ ] `npm audit` 無 high/critical 漏洞
- [ ] 通過 OWASP Top 10 審查清單
