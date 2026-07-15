# Delta Spec: graph-layout-modes

## ADDED Requirements

### Requirement: Multiple layout mode switching
系統 SHALL 提供自由與放射狀佈局模式讓使用者選擇，並在工具列上提供切換按鈕。

#### Scenario: 預設為自由拖曳模式
- **WHEN** 使用者開啟一張知識圖
- **THEN** `layoutMode` SHALL 為 `'free'`（除非該圖表之前保存了不同的模式）
- **AND** 節點位置 SHALL 保持使用者上次手動排列的位置

#### Scenario: 切換為放射狀佈局
- **GIVEN** 知識圖中至少有 2 個節點
- **WHEN** 使用者在工具列選擇「放射狀」佈局模式
- **THEN** 系統 SHALL 使用既有的放射狀排版演算法 `applyRadialLayout` 重新計算所有概念節點的位置
- **AND** 便利貼節點的位置 SHALL 保持不變
- **AND** `GraphDocument.layoutMode` SHALL 更新為 `'radial'`
- **AND** 此操作 SHALL 被記錄到 undo 歷史中

#### Scenario: 切回自由拖曳模式
- **GIVEN** 知識圖目前為放射狀佈局
- **WHEN** 使用者選擇「自由」佈局模式
- **THEN** 節點 SHALL 保留最後一次放射狀佈局的位置
- **AND** 使用者 SHALL 能夠自由拖曳任何節點
- **AND** `GraphDocument.layoutMode` SHALL 更新為 `'free'`

#### Scenario: 佈局切換覆蓋手動位置
- **GIVEN** 使用者在自由模式下手動排列了節點位置
- **WHEN** 使用者切換為放射狀佈局
- **THEN** 系統 SHALL 重新計算並覆蓋所有節點位置
- **AND** 使用者可透過 undo 還原到切換前的位置

## Verification
- 單元測試：驗證 `applyRadialLayout` 的輸出正確性
- 單元測試：驗證佈局切換後 `layoutMode` 更新正確
- `npm run build` 通過
- `npm test` 通過
