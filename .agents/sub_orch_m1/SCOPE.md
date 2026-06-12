# Scope: M1 - 型別與介面清理

## Architecture
- 清理未使用的型別定義，並取消不必要的 export，降低外部模組依賴。
- 邊界：僅限於修改型別定義與 export，不得涉及任何函式與業務邏輯的修改。

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Types and Exports Cleanup | 執行 types.ts, types/battleTypes.ts, services/analytics.ts, hooks/useChunkedPractice.ts, contexts/ToastContext.tsx 的清理 | None | DONE |

## Interface Contracts
- 本次任務為型別與 export 調整，不涉及新介面設計或跨模組合約修改。但需要確保原先有 import 這些被取消 export 或刪除的型別的檔案，在取消 export 或刪除後不會發生編譯錯誤。
- 具體變更清單：
  1. `types.ts`: `export interface MistakeLogEntry` -> `interface MistakeLogEntry`
  2. `types/battleTypes.ts`:
     - `export type SkillAnimationType` -> `type SkillAnimationType`
     - `export interface SkillThreshold` -> `interface SkillThreshold`
     - 刪除 `Hero` 介面定義（含上方 JSDoc）
     - 刪除 `BattleEvent` 型別定義（含上方 JSDoc）
     - `export type PracticeChunkStatus` -> `type PracticeChunkStatus`
     - `export const SKILL_THRESHOLDS` -> `const SKILL_THRESHOLDS`
  3. `services/analytics.ts`: 刪除 `StudySession` 介面定義
  4. `hooks/useChunkedPractice.ts`: 刪除 `export type UseChunkedPracticeReturn = ReturnType<typeof useChunkedPractice>;`
  5. `contexts/ToastContext.tsx`: `export interface Toast` -> `interface Toast`

## Code Layout
- `types.ts`
- `types/battleTypes.ts`
- `services/analytics.ts`
- `hooks/useChunkedPractice.ts`
- `contexts/ToastContext.tsx`
