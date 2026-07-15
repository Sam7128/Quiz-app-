# Delta Spec: graph-node-interactions

## ADDED Requirements

### Requirement: Drag-to-create node from connection handle
當使用者從一個節點的連接點拖出一條線並放在空白處（不是在另一個節點的 handle 上）時，系統 SHALL 在放開位置彈出一個浮動形狀選單（DropNodeMenu），讓使用者選擇新節點的形狀。

#### Scenario: 拖曳線至空白處彈出選單
- **GIVEN** 使用者正在視覺模式編輯知識圖
- **WHEN** 使用者從一個節點的 source handle 拖出連接線並在空白畫布處放開
- **THEN** 系統 SHALL 在放開位置顯示一個包含「方形」「圓角」「菱形」「便利貼」四個選項的浮動選單
- **AND** 選單 SHALL 使用 `screenToFlowPosition` 轉換後的座標定位

#### Scenario: 選擇形狀後建立節點並連線
- **GIVEN** DropNodeMenu 已顯示
- **WHEN** 使用者選擇一個形狀（例如「方形」）
- **THEN** 系統 SHALL 在選單位置建立一個該形狀的新節點（預設標題「新概念」）
- **AND** 系統 SHALL 自動建立一條從源節點到新節點的帶箭頭連線
- **AND** 選單 SHALL 自動關閉
- **AND** 此操作 SHALL 被記錄到 undo 歷史中

#### Scenario: 取消選擇
- **GIVEN** DropNodeMenu 已顯示
- **WHEN** 使用者點擊選單外任何位置或按 Escape 鍵
- **THEN** 選單 SHALL 關閉，不建立新節點

#### Scenario: 節點數量上限保護
- **GIVEN** 知識圖已有 200 個節點（達到 MAX_NODES 上限）
- **WHEN** 使用者嘗試拖曳建立新節點
- **THEN** 系統 SHALL 顯示 toast 警告訊息並阻止建立

### Requirement: Fix node-to-node drag connection
使用者 SHALL 能夠從一個節點的 source handle 拖曳連接線到另一個節點的 target handle 來建立連線。

#### Scenario: 正常拖曳連接兩個節點
- **GIVEN** 畫布上有至少兩個節點
- **WHEN** 使用者從節點 A 的 source handle 拖曳到節點 B 的 target handle
- **THEN** 系統 SHALL 建立一條從 A 到 B 的帶箭頭連線
- **AND** `onConnect` handler 中的 `addEdge` SHALL 正確執行

#### Scenario: 連線數量上限保護
- **GIVEN** 知識圖已有 500 條連線（達到 MAX_EDGES 上限）
- **WHEN** 使用者嘗試建立新連線
- **THEN** 系統 SHALL 顯示 toast 警告並阻止連線建立

## Verification
- 單元測試：驗證 `useGraphConnection` hook 的 `onConnectEnd` 邏輯
- E2E 測試：驗證拖曳操作的完整流程（需檢查 React Flow 元素是否正確掛載）
- `npm run build` 通過
- `npm test` 通過
