# Tests 模組

## 測試框架
- **Unit**: Vitest + jsdom
- **Component**: React Testing Library
- **E2E**: 見 `e2e/` 目錄（Playwright）

## 測試檔案對照

| 測試檔案 | 對應來源 | 驗證重點 |
|----------|----------|----------|
| `spacedRepetition.test.ts` | `services/spacedRepetition.ts` | SM-2 演算法正確性 |
| `useBattleSystem.test.ts` | `hooks/useBattleSystem.ts` | 傷害計算、技能觸發、怪物輪替 |
| `appReducer.test.ts` | `reducers/appReducer.ts` | 狀態轉換邏輯 |
| `graphStorage.test.ts` | `services/graphStorage.ts` | Graph CRUD + 容量偵測 |
| `mermaidBridge.test.ts` | `services/mermaidBridge.ts` | Mermaid 語法轉換 |
| `betaFeature.test.ts` | `services/betaFeature.ts` | Beta 開關邏輯 |
| `readingModes.test.ts` | KG 閱讀模式 | L1→L2→L3 漸進展開 |

## 慣例
- 新增 `services/` 或 `hooks/` 邏輯時必須附帶測試
- 優先使用 React Testing Library（非 snapshot 測試）
- 測試焦點：業務邏輯、狀態轉換、邊界案例
