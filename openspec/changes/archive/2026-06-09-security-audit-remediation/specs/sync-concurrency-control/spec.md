## MODIFIED Requirements

### Requirement: Sync lock uses typed Window interface extension
`syncLocalPracticeSessions` 的全域同步鎖 SHALL 使用 TypeScript 宣告合併（`global.d.ts`）擴充 `Window` 介面，而非使用 `(window as any)` 強制轉型。

#### Scenario: Sync lock access with typed interface
- **WHEN** `syncLocalPracticeSessions` 讀寫 `window.__MINDSPARK_SYNC_LOCK__`
- **THEN** 存取 SHALL 通過 `window.__MINDSPARK_SYNC_LOCK__`（無需 `as any` 轉型）
- **AND** TypeScript 編譯 SHALL 通過 `npx tsc --noEmit` 無型別錯誤

#### Scenario: global.d.ts declares Window extension
- **WHEN** TypeScript 編譯器處理 `cloudStorage.ts`
- **THEN** `global.d.ts` SHALL 包含以下宣告：
  ```typescript
  declare global {
    interface Window {
      __MINDSPARK_SYNC_LOCK__?: boolean;
    }
  }
  ```
- **AND** 專案中 SHALL 不存在任何 `(window as any)` 表達式
