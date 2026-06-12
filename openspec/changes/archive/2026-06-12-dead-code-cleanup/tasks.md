# Dead Code Cleanup — 任務清單

> **前置條件**：執行任何修改前，必須先確認 Git 工作區乾淨（`git status` 無未提交變更），以便在 any 階段出錯時可用 `git checkout -- .` 快速回滾。
>
> **驗證命令參考**：
> - 型別檢查：`npx tsc --noEmit`
> - 構建驗證：`npm run build`
> - 測試驗證：`npm test -- --run`
> - 完整驗證（三連）：`npx tsc --noEmit && npm run build && npm test -- --run`

---

## Refactor Plan: Affected Files

| File | Change Type | Dependencies |
|------|-------------|--------------|
| `types.ts` | modify (取消 export) | 無 |
| `types/battleTypes.ts` | modify (取消 5 個 export + 1 個常數 export) | 無 |
| `services/analytics.ts` | modify (刪除 `StudySession` 型別、取消 `getLocalStudySessions` export) | 無 |
| `hooks/useChunkedPractice.ts` | modify (刪除 `UseChunkedPracticeReturn`) | 無 |
| `contexts/ToastContext.tsx` | modify (取消 `Toast` export) | 無 |
| `constants/monstersData.ts` | modify (取消 5 個 export、刪除 `getMonsterByProgress`) | 須先完成型別階段 |
| `constants/skillsData.ts` | modify (取消 8 個 export) | 須先完成型別階段 |
| `services/ai.ts` | modify (取消 `cleanJsonResponse` export、刪除 `clearAIConfig`) | 無 |
| `services/supabase.ts` | modify (取消 `isCloudEnabled` export) | 無 |
| `services/challenges.ts` | modify (刪除 `getPendingChallengesCount`) | 無 |
| `services/storage.ts` | modify (取消 3 個函式 export) | 無 |
| `utils/questionIdentity.ts` | modify (刪除 `isQuestionIdUuid`) | 無 |
| `utils/typeGuards.ts` | modify (刪除 `isSingleAnswer`) | 無 |
| `components/AIPromptGuide.tsx` | modify (移除 `export default`，將 named export 改為 React.memo 封裝) | 無 |
| `components/BankManager.tsx` | modify (移除 `export default`，將 named export 改為 React.memo 封裝) | 無 |
| `components/BattleArena.tsx` | modify (移除 `export default`) | 無 |
| `components/Dashboard.tsx` | modify (移除 `export default`) | 無 |
| `components/DialogueBubble.tsx` | modify (移除 `export default`) | 無 |
| `components/QuizCard.tsx` | modify (移除 `export default`，將 named export 改為 React.memo 封裝) | 無 |
| `components/Settings.tsx` | modify (移除 `export default`，將 named export 改為 React.memo 封裝) | 無 |
| `components/SkillAnimation.tsx` | modify (移除 `export default`) | 無 |
| `components/SkeletonLoader.tsx` | modify (移除 `export default`) | 無 |
| `hooks/useBattleSystem.ts` | modify (移除 `export default`) | 無 |
| `components/AppContent.tsx` | modify (將 SkeletonLoader 的 default import 改為 named import) | 無 |
| `src/__tests__/useBattleSystem.test.ts` | modify (將 useBattleSystem 的 default import 改為 named import) | 無 |
| `package.json` | modify (移除 5 個依賴，保留 postcss overrides) | 所有代碼變更完成後 |
| `.agents/skills/systematic-debugging/condition-based-waiting-example.ts` | delete | 無 |
| `.claude/skills/systematic-debugging/condition-based-waiting-example.ts` | delete | 無 |
| `.continue/skills/systematic-debugging/condition-based-waiting-example.ts` | delete | 無 |

---

## 0. 基線建立

- [x] 0.1 確認 Git 工作區乾淨：執行 `git status`，確認無未提交變更
- [x] 0.2 記錄基線測試結果：執行 `npm test -- --run` 並記錄通過的測試數量和結果
- [x] 0.3 記錄基線構建結果：執行 `npm run build`，確認成功並記錄 `dist/` 大小
- [x] 0.4 記錄基線型別檢查：執行 `npx tsc --noEmit`，確認零錯誤

> **成功標準**：三項命令全部通過，數字記錄下來作為後續對比基準。

---

## 1. 型別與介面清理 (Phase 1 — 風險最低)

> **目標**：清理未使用的型別定義和取消不必要的 export。
> **邊界**：僅修改型別定義，不動任何函式或業務邏輯。

- [x] 1.1 在 `types.ts` 中：將第 17 行 `export interface MistakeLogEntry` 改為 `interface MistakeLogEntry`（移除 `export` 關鍵字）。**注意**：保留整個 interface 定義，只移除 `export` 一詞。第 24 行的 `[questionId: string]: MistakeLogEntry` 會繼續正常運作。
- [x] 1.2 在 `types/battleTypes.ts` 中：
  - [x] 將 `export type SkillAnimationType` 改為 `type SkillAnimationType`（只移除 `export` 關鍵字）
  - [x] 將 `export interface SkillThreshold` 改為 `interface SkillThreshold`（只移除 `export` 關鍵字）
  - [x] 物理刪除整個 `Hero` 介面定義（包含上方 JSDoc `/** 主角狀態 */`）
  - [x] 物理刪除整個 `BattleEvent` 型別定義（包含上方 JSDoc `/** 戰鬥事件類型 */`）
  - [x] 將 `export type PracticeChunkStatus` 改為 `type PracticeChunkStatus`（只移除 `export` 關鍵字）
- [x] 1.3 在 `types/battleTypes.ts` 中：第 36 行 `export const SKILL_THRESHOLDS` → `const SKILL_THRESHOLDS`（移除 `export`）
- [x] 1.4 在 `services/analytics.ts` 中：刪除整個 `StudySession` 介面定義。包含 `export interface StudySession { ... }` 整個區塊。
- [x] 1.5 在 `hooks/useChunkedPractice.ts` 中：刪除 `export type UseChunkedPracticeReturn = ReturnType<typeof useChunkedPractice>;`（整行刪除）
- [x] 1.6 在 `contexts/ToastContext.tsx` 中：第 5 行 `export interface Toast` → `interface Toast`（移除 `export`）
- [x] 1.7 **Phase 1 驗證**：執行 `npx tsc --noEmit`，必須零錯誤

> **回滾**：如果 1.7 失敗，執行 `git checkout -- types.ts types/battleTypes.ts services/analytics.ts hooks/useChunkedPractice.ts contexts/ToastContext.tsx`

---

## 2. Export 作用域收窄 (Phase 2 — 中低風險)

> **目標**：對僅在檔案內部使用的函式/常數取消 `export`。
> **邊界**：只移除 `export` 關鍵字，不修改函式體、不刪除函式。

### 2A. Constants 模組

- [x] 2.1 在 `constants/monstersData.ts` 中移除以下 5 個常數的 `export` 關鍵字：
  - [x] `export const NORMAL_MONSTERS` → `const NORMAL_MONSTERS`
  - [x] `export const ELITE_MONSTERS` → `const ELITE_MONSTERS`
  - [x] `export const BOSS_MONSTERS` → `const BOSS_MONSTERS`
  - [x] `export const ALL_MONSTERS` → `const ALL_MONSTERS`
  - [x] 移除 `NORMAL_MONSTER_IDS`、`ELITE_MONSTER_IDS`、`BOSS_MONSTER_IDS` 三個常數的 `export`
  
  > **注意**：`getMonstersByDifficulty` 和 `getRandomMonster` 保持 `export` 不動，因為可能被外部引用。先用 `npx tsc --noEmit` 確認沒有外部引用後再考慮是否也取消。

- [x] 2.2 在 `constants/skillsData.ts` 中移除以下 8 個常數/函式的 `export` 關鍵字：
  - [x] `export const BASIC_SKILLS` → `const BASIC_SKILLS`
  - [x] `export const INTERMEDIATE_SKILLS` → `const INTERMEDIATE_SKILLS`
  - [x] `export const ADVANCED_SKILLS` → `const ADVANCED_SKILLS`
  - [x] `export const ULTIMATE_SKILLS` → `const ULTIMATE_SKILLS`
  - [x] `export const EPIC_SKILLS` → `const EPIC_SKILLS`
  - [x] `export const LEGENDARY_SKILLS` → `const LEGENDARY_SKILLS`
  - [x] `export const ALL_SKILLS` → `const ALL_SKILLS`
  - [x] `export function getSkillsByTier` → `function getSkillsByTier`
 
  > **注意**：`getRandomSkill`、`getSkillTierByStreak`、`shouldTriggerSkill` 保持 `export`，它們可能被外部引用。

- [x] 2.3 **驗證 2A**：執行 `npx tsc --noEmit`，必須零錯誤

### 2B. Services 模組

- [x] 2.4 在 `services/ai.ts` 中：找到 `cleanJsonResponse` 的定義行，將 `export const cleanJsonResponse` → `const cleanJsonResponse`（移除 `export`）。**關鍵**：不刪除函式本體！它仍被調用。
- [x] 2.5 在 `services/analytics.ts` 中：找到 `getLocalStudySessions` 的定義行，將 `export const getLocalStudySessions` → `const getLocalStudySessions`（移除 `export`）。**關鍵**：不刪除函式本體！它仍被調用。
- [x] 2.6 在 `services/supabase.ts` 中：找到 `isCloudEnabled` 的定義行，將 `export const isCloudEnabled` → `const isCloudEnabled`（移除 `export`）。**關鍵**：不刪除函式本體！它仍被調用。
- [x] 2.7 在 `services/storage.ts` 中：移除以下 3 個函式的 `export` 關鍵字：
  - [x] `export const removeQuestionFromQuizSession` → `const removeQuestionFromQuizSession`
  - [x] `export const removeQuestionFromRecentMistakeSessions` → `const removeQuestionFromRecentMistakeSessions`
  - [x] `export const deleteSpacedRepetitionItem` → `const deleteSpacedRepetitionItem`
  
  > **關鍵**：這 3 個函式在 `deleteQuestionArtifacts` 中仍被調用，絕不能刪除函式本體。
  
- [x] 2.8 **驗證 2B**：執行 `npx tsc --noEmit`，必須零錯誤

> **回滾**：如果 2.3 或 2.8 失敗，說明有外部引用遺漏。使用 `npx tsc --noEmit 2>&1` 查看錯誤訊息定位問題，恢復被錯誤取消的 `export`。

---

## 3. 死碼函式刪除 (Phase 3 — 中風險)

> **目標**：物理刪除已確認完全無引用的廢棄函式。
> **邊界**：只刪除函式定義本體及其上方的 JSDoc 註釋（如有），不修改同檔案的其他代碼。

- [x] 3.1 在 `constants/monstersData.ts` 中：刪除 `getMonsterByProgress` 函式（含上方 JSDoc 註釋 `/** 根據已擊敗數量選擇適當難度的怪物 */`）。
- [x] 3.2 在 `services/ai.ts` 中：刪除 `clearAIConfig` 函式。找到 `export const clearAIConfig` 的位置，刪除整個函式體直到閉合的 `};`。
- [x] 3.3 在 `services/challenges.ts` 中：刪除 `getPendingChallengesCount` 函式。找到 `export const getPendingChallengesCount`，刪除整個函式體直到閉合的 `};`。
- [x] 3.4 在 `utils/questionIdentity.ts` 中：刪除 `isQuestionIdUuid` 函式。找到 `export const isQuestionIdUuid`，刪除整個函式體直到閉合的 `};`。
- [x] 3.5 在 `utils/typeGuards.ts` 中：刪除 `isSingleAnswer` 函式。找到 `export const isSingleAnswer`，刪除整個函式體直到閉合的 `};`。
- [x] 3.6 **Phase 3 驗證**：執行 `npx tsc --noEmit`，必須零錯誤
- [x] 3.7 **Phase 3 測試驗證**：執行 `npm test -- --run`，所有測試必須通過

> **回滾**：如果 3.6 或 3.7 失敗，使用 `git diff` 查看剛才的刪除，確認是否刪錯了範圍（例如刪到了下一個函式的開頭）。用 `git checkout -- <file>` 恢復特定檔案。

---

## 4. 重複匯出清理與 Memoization 移轉 (Phase 4 — 中風險)

> **目標**：移除同時具有 named export 和 default export 檔案中的 `export default` 語句，並確保 React.memo 效能優化與匯入對應不被破壞。
> **邊界**：
> 1. 將被清理元件的 named export 包裝為 React.memo，避免效能退化。
> 2. 主動移轉 default import 語句為 named import。
> 3. 物理刪除 `export default`。

### 4A. 主動移轉呼叫端 (Default Import -> Named Import)

- [x] 4.1 修改 `components/AppContent.tsx` 中：將 `import SkeletonLoader from './SkeletonLoader';` 修改為 `import { SkeletonLoader } from './SkeletonLoader';`
- [x] 4.2 修改 `src/__tests__/useBattleSystem.test.ts` 中：將 `import useBattleSystem from '../../hooks/useBattleSystem';` 修改為 `import { useBattleSystem } from '../../hooks/useBattleSystem';`

### 4B. Named Export 改寫為 React.memo 封裝

- [x] 4.3 修改 `components/AIPromptGuide.tsx`：
  - [x] 將 `export const AIPromptGuide: React.FC = () => {` 修改為 `const AIPromptGuideComponent: React.FC = () => {`
  - [x] 在檔案末尾將 `export default React.memo(AIPromptGuide);` 修改為 `export const AIPromptGuide = React.memo(AIPromptGuideComponent);` 並移除 default export。
- [x] 4.4 修改 `components/BankManager.tsx`：
  - [x] 將 `export const BankManager: React.FC<BankManagerProps> = (` 修改為 `const BankManagerComponent: React.FC<BankManagerProps> = (`
  - [x] 在檔案末尾將 `export default React.memo(BankManager);` 修改為 `export const BankManager = React.memo(BankManagerComponent);` 並移除 default export。
- [x] 4.5 修改 `components/QuizCard.tsx`：
  - [x] 將 `export const QuizCard: React.FC<QuizCardProps> = (` 修改為 `const QuizCardComponent: React.FC<QuizCardProps> = (`
  - [x] 在檔案末尾將 `export default React.memo(QuizCard);` 修改為 `export const QuizCard = React.memo(QuizCardComponent);` 並移除 default export。
- [x] 4.6 修改 `components/Settings.tsx`：
  - [x] 將 `export const Settings: React.FC<SettingsProps> = (` 修改為 `const SettingsComponent: React.FC<SettingsProps> = (`
  - [x] 在檔案末尾將 `export default React.memo(Settings);` 修改為 `export const Settings = React.memo(SettingsComponent);` 並移除 default export。

### 4C. 移除其餘元件之 export default

- [x] 4.7 刪除 `components/BattleArena.tsx` 的 `export default BattleArena;`
- [x] 4.8 刪除 `components/Dashboard.tsx` 的 `export default Dashboard;`
- [x] 4.9 刪除 `components/DialogueBubble.tsx` 的 `export default DialogueBubble;`
- [x] 4.10 刪除 `components/SkillAnimation.tsx` 的 `export default SkillAnimation;`
- [x] 4.11 刪除 `components/SkeletonLoader.tsx` 的 `export default SkeletonLoader;`
- [x] 4.12 刪除 `hooks/useBattleSystem.ts` 的 `export default useBattleSystem;`

### 4D. 驗證

- [x] 4.13 **Phase 4 驗證**：執行 `npx tsc --noEmit`，必須零錯誤
- [x] 4.14 **Phase 4 構建驗證**：執行 `npm run build`，必須成功（確認 Vite 可以 resolve 所有元件）

> **回滾**：如果 4.13 或 4.14 失敗，表示有某個 `import XXX from './Component'`（default import）仍在使用。用 `npx tsc --noEmit 2>&1 | head -20` 找到錯誤所在，將對應的 default import 改為 named import `import { XXX } from './Component'`，或恢復該檔案的 `export default`。

---

## 5. 依賴清理 (Phase 5 — 中風險)

> **目標**：移除未使用的 npm 依賴，保留必要的 security overrides。
> **邊界**：只修改 `package.json` 中的 `dependencies` 與 `devDependencies`，以及 `package-lock.json`（由 npm 自動處理）。

- [x] 5.1 移除運行時依賴：`npm uninstall classnames`
- [x] 5.2 移除開發依賴：`npm uninstall @tailwindcss/postcss autoprefixer postcss @testing-library/jest-dom`
- [x] 5.3 確認並保留 `package.json` 中的 `"overrides"` 區段中的 `"postcss": "^8.5.10"` 條目（不予刪除，以防範間接依賴回退至帶漏洞的舊版本）。
- [x] 5.4 執行 `npm install` 確保 lockfile 與 `package.json` 同步
- [x] 5.5 比對 `package-lock.json` 的 Git Diff，確認無非預期的核心套件（如 `react` e.g. `vite`）被意外變更或升級。
- [x] 5.6 **Phase 5 構建驗證**：執行 `npm run build`，必須成功（驗證 Tailwind CSS 仍透過 `@tailwindcss/vite` 正常編譯）
- [x] 5.7 **Phase 5 測試驗證**：執行 `npm test -- --run`，所有測試必須通過

> **回滾**：如果 5.6 失敗，用 `git checkout -- package.json package-lock.json && npm install` 恢復所有依賴。然後逐個排查哪個依賴不能移除。

---

## 6. 檔案清理 (Phase 6 — 低風險)

> **目標**：刪除未引用的 AI Agent 範例檔案。
> **邊界**：僅刪除 3 個指定檔案，不動技能目錄中的其他檔案（如 `SKILL.md`）。

- [x] 6.1 刪除 `.agents/skills/systematic-debugging/condition-based-waiting-example.ts`
- [x] 6.2 刪除 `.claude/skills/systematic-debugging/condition-based-waiting-example.ts`
- [x] 6.3 刪除 `.continue/skills/systematic-debugging/condition-based-waiting-example.ts`
- [x] 6.4 **Phase 6 驗證**：執行 `npx tsc --noEmit && npm run build`，確認刪除不影響構建

---

## 7. 最終驗證與收尾 (Phase 7 — 必做)

> **目標**：全面驗證所有變更的正確性，確保零回歸。

- [x] 7.1 **完整三連驗證**：執行 `npx tsc --noEmit && npm run build && npm test -- --run`，三項全部通過
- [x] 7.2 **對比基線**：將測試通過數量與 Phase 0.2 記錄的基線對比，確認測試數量未減少
- [x] 7.3 **對比構建產物**：將 `dist/` 大小與 Phase 0.3 記錄的基線對比，確認體積減小或不變
- [x] 7.4 **knip 重掃**：執行 `npx knip`，確認本報告中所有目標已從掃描結果中消失
- [x] 7.5 更新 `docs/reports/DEAD_CODE_REPORT_2026_06_10.md`：在報告末尾添加清理完成狀態記錄
- [x] 7.6 更新 `docs/DEVELOPMENT_LOG.md`：記錄本次清理的摘要（影響範圍、刪除統計）
- [x] 7.7 更新 `CHECKLIST.md`（如存在）：標記死碼清理任務完成

---

## 審慎不動清單 (Do-NOT-Touch List)

| 項目 | 原因 |
|------|------|
| `@types/dompurify` (devDependency) | `dompurify` 在 `ai.ts` 和 `BankManager.tsx` 中廣泛使用 |
| `cloudStorage.ts` → `retryCleanupDirtyBanks` | 在 `syncLocalToCloud` 中被調用（第 328 行） |
| `cloudStorage.ts` → `retryDirtyPracticeSessions` | 防禦性預備代碼，保留 |
| `cloudStorage.ts` → `batchSaveCloudSpacedRepetition` | 防禦性預備代碼，保留 |
| `KnowledgeGraphWorkspace.tsx` → `export default` | 此元件只有 default export，無 named export |
| `ConceptNode.tsx` → `export default` | 此元件只有 default export，無 named export |

---

## 回滾計畫

如果在任何階段出現無法修復的問題：

1. **單檔案回滾**：`git checkout -- <file_path>`
2. **整個階段回滾**：`git stash` 保存當前進度，`git checkout -- .` 恢復到階段起點
3. **全面回滾**：`git checkout -- . && npm install` 恢復所有代碼 and 依賴到初始狀態
4. **部分提交策略**：建議每完成一個 Phase 並通過驗證後，進行一次 `git add -A && git commit -m "dead-code-cleanup: phase N"` 提交，以便精細回滾
