## MODIFIED Requirements

### Requirement: useKeyboardShortcuts binds listener once via handlers ref
`useKeyboardShortcuts` hook SHALL 採用 `useRef` 包裹回調集合以解耦監聽器生命週期與回調參考變化。`handlersRef = useRef({ onSelectOption, onSubmitOrNext, onToggleHint, onExit })` SHALL 在每次渲染被更新（透過獨立的 `useEffect` 無依賴陣列或於 render body 中直接賦值）。註冊 `window.addEventListener('keydown', handleKeyDown)` 的 `useEffect` SHALL 依賴陣列為空 `[]`，全生命週期只綁定一次監聽器，回調透過 `handlersRef.current` 呼叫。

isEditableTarget 防護（偵測 `INPUT` / `TEXTAREA` / `SELECT` / `contentEditable` / `role='textbox'`）SHALL 完整保留，以避免在 AI helper 輸入框等可編輯欄位劫持按鍵。外部呼叫介面（`useKeyboardShortcuts({ ...callbacks })` 的 props shape）SHALL 不變。

**新增守衛規則**：`handleKeyDown` SHALL 在 `isEditableTarget` 檢查之後、具體按鍵匹配之前，新增以下前置守衛：
1. **修飾鍵守衛**：當 `event.ctrlKey`、`event.altKey` 或 `event.metaKey` 為 `true` 時，SHALL 立即 return 不處理
2. **IME 組字守衛**：當 `event.isComposing` 為 `true` 或 `event.keyCode === 229` 時，SHALL 立即 return 不處理

#### Scenario: Listener binds once across re-renders
- **WHEN** `QuizCard` 因 quiz state 變更多次重新渲染
- **AND** 每次渲染傳入新的 `onSelectOption` / `onSubmitOrNext` 函式參考
- **THEN** `window.addEventListener('keydown', ...)` SHALL 只被呼叫一次（mount 時）
- **AND** `window.removeEventListener` SHALL 只在 unmount 時被呼叫一次
- **AND** 新的回調 SHALL 透過 `handlersRef.current` 即時被新事件觸發呼叫

#### Scenario: Number key triggers handler through ref
- **WHEN** 使用者按下數字鍵 `1`
- **AND** `handlersRef.current.onSelectOption` 指向最新的 `onSelectOption` 回調
- **THEN** `handlersRef.current.onSelectOption(0)` SHALL 被呼叫
- **AND** 行為 SHALL 與原 hook 等價

#### Scenario: Editable target guard preserved
- **WHEN** 焦點位於 `<input>` / `<textarea>` / `<select>` 元素
- **AND** 使用者按下 `1`
- **THEN** 監聽器 SHALL 提前 return（不呼叫任何 handler）
- **AND** 鍵盤事件 SHALL NOT 被 `preventDefault`
- **AND** 既有 textarea 輸入行為 SHALL 不被劫持

#### Scenario: Enter/H/Esc keys route through ref
- **WHEN** 使用者按下 `Enter` / `h` / `H` / `Escape`
- **THEN** 對應的 `handlersRef.current.onSubmitOrNext` / `onToggleHint` / `onExit` SHALL 被呼叫
- **AND** 行為 SHALL 與原 hook 等價

#### Scenario: Modifier key combination does not trigger shortcuts
- **WHEN** 使用者按下 `Ctrl+1`、`Ctrl+H`、`Alt+Enter` 或 `Meta+Escape`
- **THEN** `handleKeyDown` SHALL 立即 return
- **AND** 瀏覽器原生行為（切換分頁、開啟歷史紀錄等）SHALL NOT 被 `preventDefault`
- **AND** 無任何 handler SHALL 被呼叫

#### Scenario: IME composition does not trigger shortcuts
- **WHEN** 使用者正在使用中文/日文輸入法組字
- **AND** `event.isComposing` 為 `true` 或 `event.keyCode` 為 `229`
- **THEN** `handleKeyDown` SHALL 立即 return
- **AND** 輸入法候選字選擇 SHALL NOT 被干擾
