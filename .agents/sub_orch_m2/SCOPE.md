# Scope: M2 - Export 作用域收窄

## Architecture
- **目標範圍**：專案中的 constants、services 模組。
- **變更類型**：移除非外部引用的 `export` 關鍵字（僅收窄作用域，不變更程式邏輯與函式主體）。
- **影響模組**：
  - `constants/monstersData.ts`
  - `constants/skillsData.ts`
  - `services/ai.ts`
  - `services/analytics.ts`
  - `services/supabase.ts`
  - `services/storage.ts`

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | 建立 SCOPE.md & progress.md | 初始化專案與進度追蹤 | None | DONE |
| 2 | Explorer 探索 | 啟動 3 個 Explorer 調查指定檔案的 export 項目，確認是否在其他檔案被引用，並規劃變更策略。 | M1 | DONE |
| 3 | Worker 執行變更 | 啟動 Worker 移除指定的 export 關鍵字，確保無編譯錯誤並通過現有測試。 | M2 | DONE |
| 4 | Reviewer 審查 | 啟動 2 個 Reviewer 審查修改內容並確認編譯及測試通過。 | M3 | IN_PROGRESS (IDs: c50576ae, 7fbdbaa1) |
| 5 | Challenger 驗證 | 啟動 Challenger 進行衝突與正確性驗證。 | M4 | PLANNED |
| 6 | Forensic Auditor 稽核 | 啟動 Forensic Auditor 審計，確保沒有 cheating/hardcode 行為。 | M5 | PLANNED |
| 7 | Handoff | 將結果寫入 handoff.md，更新 DEVELOPMENT_LOG.md，回報 parent 代理。 | M6 | PLANNED |

## Interface Contracts
### 檔案作用域變更
- 移除的 `export` 關鍵字只會影響檔案內部的變數/函式。若有外部引用，Explorer 應回報並指出需要如何處理（或者如果原本有外部引用，移除 export 會破壞編譯，此時應審慎評估或維持 export/修正引用，但依任務說明，這些項目應為「僅在檔案內部使用的常數/函式」，故移除 export 後，不應影響外部功能）。

## Code Layout
- `constants/monstersData.ts`
- `constants/skillsData.ts`
- `services/ai.ts`
- `services/analytics.ts`
- `services/supabase.ts`
- `services/storage.ts`
