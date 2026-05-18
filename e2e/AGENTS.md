# E2E Tests 模組

## 框架
- **Playwright** — 設定在 `playwright.config.ts`
- **Port**: 硬編碼 5200（非 dev server 的 5173）

## 測試覆蓋

| 測試檔案 | 使用者旅程 |
|----------|-----------|
| `json-import.spec.ts` | 題庫 JSON 匯入流程 |
| `quiz-flow.spec.ts` | 測驗開始 → 答題 → 完成 |
| `mindspark.spec.ts` | 完整 App 流程（含遊戲模式） |

## 慣例
- E2E 只覆蓋關鍵使用者旅程
- 執行前需啟動 preview server (`npm run preview -- --port 5200`)
