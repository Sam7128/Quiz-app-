## ADDED Requirements

### Requirement: Beta feature toggle in Settings
系統 SHALL 在設定 Modal 中新增「🧪 實驗室功能 (Beta)」區塊，包含一個「知識圖工作區」開關。

#### Scenario: 顯示 Beta 區塊
- **WHEN** 使用者開啟設定 Modal
- **THEN** 設定中 SHALL 包含一個「🧪 實驗室功能 (Beta)」區塊，內含「知識圖工作區」開關

#### Scenario: Beta 開關預設關閉
- **WHEN** 使用者首次使用應用程式
- **THEN** 知識圖工作區開關 SHALL 預設為關閉狀態

#### Scenario: 開關切換持久化
- **WHEN** 使用者切換知識圖工作區開關
- **THEN** 開關狀態 SHALL 持久化至 `mindspark_settings` localStorage key

### Requirement: Conditional navigation entry
知識圖工作區的導覽入口 SHALL 僅在 Beta 開關啟用時顯示。

#### Scenario: Beta 開啟時顯示導覽項目
- **WHEN** 知識圖工作區 Beta 開關為開啟狀態
- **THEN** 桌面端 AppHeader 和手機端 MobileNav SHALL 同時顯示「🧠 知識圖」導覽按鈕

#### Scenario: Beta 關閉時隱藏導覽項目
- **WHEN** 知識圖工作區 Beta 開關為關閉狀態
- **THEN** 桌面端和手機端導覽 SHALL 均不顯示知識圖入口

#### Scenario: 關閉 Beta 時自動返回首頁
- **WHEN** 使用者正在知識圖頁面且關閉 Beta 開關
- **THEN** 系統 SHALL 自動將 view 切換至 `dashboard`

### Requirement: AppView extension
AppView 型別 SHALL 新增 `'graph'` 值以支援知識圖視圖路由。

#### Scenario: 導覽至知識圖
- **WHEN** 使用者點擊「知識圖」導覽按鈕
- **THEN** AppView SHALL 切換至 `'graph'`，並渲染知識圖工作區元件

#### Scenario: AppView 向後相容
- **WHEN** 現有功能（dashboard, quiz, mistakes, manager, guide, social）被存取
- **THEN** 所有現有行為 SHALL 完全不受影響

### Requirement: Lazy loading for graph workspace
知識圖工作區元件 SHALL 使用 React.lazy + Suspense 進行動態載入。

#### Scenario: 首次進入時動態載入
- **WHEN** 使用者首次導覽至知識圖工作區
- **THEN** 系統 SHALL 動態載入知識圖相關的 JS chunk，載入期間顯示 loading 指示器

#### Scenario: 主 bundle 不受影響
- **WHEN** 應用程式在知識圖 Beta 關閉的情況下載入
- **THEN** @xyflow/react 和相關依賴 SHALL 不被包含在主 bundle 中

### Requirement: Feature flag storage
Beta 功能開關 SHALL 儲存在 `mindspark_settings` localStorage key 中，與現有 UserSettings 合併。

#### Scenario: 讀取 Beta 開關狀態
- **WHEN** 應用程式啟動
- **THEN** 系統 SHALL 從 `mindspark_settings` 中讀取 `betaFeatures.knowledgeGraph` 欄位判斷開關狀態

#### Scenario: 設定不存在時的預設值
- **WHEN** `mindspark_settings` 中不存在 `betaFeatures` 欄位
- **THEN** 系統 SHALL 預設所有 Beta 功能為關閉
