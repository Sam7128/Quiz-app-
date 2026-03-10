# OpenSpec 模組

## 結構
- `specs/`: 主規格文件（每個功能一個資料夾）
- `changes/`: 變更請求（提案 → 規格 → 設計 → 任務 → 實作 → 歸檔）
- `archive/`: 已歸檔的完成變更

## 工作流程
1. `/opsx-new` — 建立新變更
2. `/opsx-continue` — 繼續生成下一個 artifact
3. `/opsx-ff` — 一次生成所有 artifact
4. `/opsx-apply` — 實作任務
5. `/opsx-verify` — 驗證實作
6. `/opsx-archive` — 歸檔完成變更
7. `/opsx-sync` — 同步 delta specs 至 main specs

## 慣例
- 每個 change 資料夾包含：proposal.md → spec.md → design.md → tasks.md
- 歸檔後移至 `archive/` 目錄
- 壓力測試報告放在 change 資料夾內
