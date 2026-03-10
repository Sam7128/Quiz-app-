# Spec: Knowledge Graph Reading Modes

## Purpose
Optimize the consumption of knowledge diagrams on various devices and learning contexts by providing different ways to visualize and explore node content.

## ADDED Requirements

### Requirement: Reading mode toggle
系統 SHALL 提供兩種閱讀模式：「全部展開」和「逐步探索」，作為頁面層級狀態（非全域設定、非使用者偏好）。

#### Scenario: 切換至全部展開模式
- **WHEN** 使用者點擊閱讀模式切換按鈕選擇「全部展開」
- **THEN** 所有節點 SHALL 同時顯示完整內容（Level 1 標題 + Level 2 定義 + Level 3 補充）

#### Scenario: 切換至逐步探索模式
- **WHEN** 使用者點擊閱讀模式切換按鈕選擇「逐步探索」
- **THEN** 所有節點 SHALL 僅顯示 Level 1 標題，Level 2 和 Level 3 內容收合隱藏

#### Scenario: 預設閱讀模式
- **WHEN** 使用者首次進入知識圖工作區
- **THEN** 閱讀模式 SHALL 預設為「逐步探索」

### Requirement: Progressive content disclosure
在「逐步探索」模式下，節點內容 SHALL 支援逐層展開，遵循三層資訊架構。

#### Scenario: 點擊展開 Level 2
- **WHEN** 使用者在逐步探索模式下點擊一個僅顯示標題的節點
- **THEN** 該節點 SHALL 展開顯示 Level 2 定義內容（若存在）

#### Scenario: 再次點擊展開 Level 3
- **WHEN** 使用者在逐步探索模式下點擊一個已展開 Level 2 的節點
- **THEN** 該節點 SHALL 進一步展開顯示 Level 3 補充說明（若存在）

#### Scenario: 收合節點
- **WHEN** 使用者在逐步探索模式下再次點擊一個已完全展開的節點
- **THEN** 該節點 SHALL 收合回僅顯示 Level 1 標題

#### Scenario: 節點無更多層級
- **WHEN** 使用者點擊一個沒有 Level 2 / Level 3 內容的節點
- **THEN** 系統 SHALL 不做任何展開動作（無視覺跳動）

### Requirement: Reading mode persists per document
閱讀模式 SHALL 作為 GraphDocument 的 viewState 的一部分儲存，每份文件獨立記憶。

#### Scenario: 閱讀模式隨文件儲存
- **WHEN** 使用者切換閱讀模式後離開工作區
- **THEN** 下次回到同一份圖表時 SHALL 恢復上次的閱讀模式設定

#### Scenario: 不同文件獨立模式
- **WHEN** 使用者將文件 A 設為全部展開、文件 B 設為逐步探索
- **THEN** 切換文件時 SHALL 各自恢復對應的閱讀模式

### Requirement: Reading mode available on all devices
閱讀模式切換 SHALL 在桌面端和手機端均可使用。

#### Scenario: 手機端閱讀模式
- **WHEN** 使用者在手機端（螢幕寬度 ≤ 768px）瀏覽知識圖
- **THEN** 閱讀模式切換按鈕 SHALL 可見且可操作

### Requirement: Expand-all shows complete node information
在「全部展開」模式下，所有節點 SHALL 自動調整大小以容納完整內容。

#### Scenario: 節點自動調整大小
- **WHEN** 閱讀模式切換為「全部展開」
- **THEN** 每個節點的高度 SHALL 自動擴展以完整顯示所有層級的文字內容，不出現截斷或滾動條

### Requirement: Edge labels in reading mode
連線標籤 SHALL 在所有閱讀模式下保持可見。

#### Scenario: 全部展開模式中的連線標籤
- **WHEN** 閱讀模式為「全部展開」
- **THEN** 所有連線標籤 SHALL 完整顯示

#### Scenario: 逐步探索模式中的連線標籤
- **WHEN** 閱讀模式為「逐步探索」
- **THEN** 所有連線標籤 SHALL 完整顯示（不隨節點展開狀態變化）
