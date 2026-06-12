# Handoff Report - teamwork_preview_explorer_m1_1

本報告針對專案中特定型別與常數的 export 清理與刪除策略進行分析，以確保清理動作的安全性並提供確切變更建議。

## 1. 觀察 (Observation)

經由全域搜尋與靜態程式碼分析，以下為目標型別與常數的定義與使用狀況：

### 目標 1：`types.ts`
*   **型別**：`MistakeLogEntry` (第 17 行)
*   **定義內容**：
    ```typescript
    export interface MistakeLogEntry {
      count: number;
      lastWrongAnswer: string;
      timestamp: number;
    }
    ```
*   **檔案內引用**：
    *   `types.ts` 第 24 行：`[questionId: string]: MistakeLogEntry;`
*   **全域引用**：無任何外部檔案 import 或引用 `MistakeLogEntry`。

---

### 目標 2：`types/battleTypes.ts`
*   **型別/常數 1**：`SkillAnimationType` (第 12 行)
    *   **定義**：`export type SkillAnimationType = 'css' | 'lottie' | 'sequence' | 'video';`
    *   **內部引用**：`types/battleTypes.ts` 第 23 行：`animationType: SkillAnimationType;`
    *   **全域引用**：無。
*   **型別/常數 2**：`SkillThreshold` (第 30 行)
    *   **定義**：
        ```typescript
        export interface SkillThreshold {
          tier: SkillTier;
          requiredStreak: number;
        }
        ```
    *   **內部引用**：`types/battleTypes.ts` 第 36 行：`export const SKILL_THRESHOLDS: SkillThreshold[] = [`
    *   **全域引用**：無。
*   **型別/常數 3**：`Hero` 介面定義 (第 68-80 行)
    *   **定義**：
        ```typescript
        /** 主角狀態 */
        export interface Hero {
          name: string;
          imagePath: string;
          attackImagePath: string;
          hurtImagePath: string;
          maxHp: number;
          currentHp: number;
          attackDialogues: string[];
          hurtDialogues: string[];
          victoryDialogues: string[];
          skillDialogues: Record<SkillTier, string[]>;
        }
        ```
    *   **全域/內部引用**：無。該型別完全未被任何程式碼引用。
*   **型別/常數 4**：`BattleEvent` 型別定義 (第 206-216 行)
    *   **定義**：
        ```typescript
        /** 戰鬥事件類型 */
        export type BattleEvent =
          | { type: 'START_BATTLE'; monster: Monster }
          | { type: 'ANSWER_CORRECT' }
          | { type: 'ANSWER_WRONG' }
          | { type: 'TRIGGER_SKILL'; skill: Skill }
          | { type: 'ANIMATION_COMPLETE' }
          | { type: 'MONSTER_DEFEATED' }
          | { type: 'HERO_DEFEATED' }
          | { type: 'SPAWN_NEW_MONSTER' }
          | { type: 'END_BATTLE' };
        ```
    *   **全域/內部引用**：無。該型別完全未被任何程式碼引用。
*   **型別/常數 5**：`PracticeChunkStatus` (第 253 行)
    *   **定義**：`export type PracticeChunkStatus = 'pending' | 'in_progress' | 'completed';`
    *   **內部引用**：`types/battleTypes.ts` 第 258 行：`status: PracticeChunkStatus;`
    *   **全域引用**：無。
*   **型別/常數 6**：`SKILL_THRESHOLDS` 常數 (第 36-43 行)
    *   **定義**：
        ```typescript
        export const SKILL_THRESHOLDS: SkillThreshold[] = [
          { tier: 'basic', requiredStreak: 5 },
          { tier: 'intermediate', requiredStreak: 10 },
          { tier: 'advanced', requiredStreak: 20 },
          { tier: 'ultimate', requiredStreak: 30 },
          { tier: 'epic', requiredStreak: 40 },
          { tier: 'legendary', requiredStreak: 50 },
        ];
        ```
    *   **內部引用**：無。
    *   **全域引用**：無。外部技能判定由 `constants/skillsData.ts` 中的 `getSkillTierByStreak` 進行，並無導入本常數。

---

### 目標 3：`services/analytics.ts`
*   **型別**：`StudySession` 介面 (第 4-11 行)
*   **定義內容**：
    ```typescript
    export interface StudySession {
      id?: string;
      userId: string;
      sessionDate: string;
      questionsAnswered: number;
      correctCount: number;
      sessionDuration: number; // in seconds
    }
    ```
*   **全域/內部引用**：無。專案中的本地分析使用 `LocalStudySession`，此介面完全未被使用。

---

### 目標 4：`hooks/useChunkedPractice.ts`
*   **型別**：`UseChunkedPracticeReturn` (第 473 行)
*   **定義內容**：`export type UseChunkedPracticeReturn = ReturnType<typeof useChunkedPractice>;`
*   **全域/內部引用**：無。

---

### 目標 5：`contexts/ToastContext.tsx`
*   **型別**：`Toast` (第 5-10 行)
*   **定義內容**：
    ```typescript
    export interface Toast {
      id: string;
      type: ToastType;
      message: string;
      duration: number;
    }
    ```
*   **內部引用**：
    *   `contexts/ToastContext.tsx` 第 13 行：`toasts: Toast[];`
    *   `contexts/ToastContext.tsx` 第 26 行：`const [toasts, setToasts] = useState<Toast[]>([]);`
*   **外部引用**：無直接作為型別 `Toast` 導入。
    *   `components/ToastContainer.tsx` 僅解構 `toasts` 陣列的成員傳遞給 `ToastItem`，且 `ToastItemProps` 獨立宣告了其屬性，並未直接 import `Toast` 型別。

---

## 2. 邏輯鏈 (Logic Chain)

1.  **取消 export (轉為 module-local) 的安全性**：
    *   如果一個型別或常數在定義的檔案外部**完全沒有任何 import 或使用記錄**，但其在檔案內部有被使用，則將 `export` 關鍵字移除是 100% 安全的。此變更僅將其暴露範圍限制在模組內部，對其他模組沒有影響，且不影響模組內部的正常編譯與運作。
    *   *套用對象*：`MistakeLogEntry` (types.ts)、`SkillAnimationType`、`SkillThreshold`、`PracticeChunkStatus`、`SKILL_THRESHOLDS` (types/battleTypes.ts)、`Toast` (contexts/ToastContext.tsx)。
2.  **物理刪除的安全性**：
    *   如果一個型別在整個專案（包括定義該型別的檔案內部）**完全沒有被任何程式碼、註解外的型別註記或邏輯引用**，則將其徹底刪除不會影響任何系統行為或型別檢查，且能減少冗餘的 dead code。
    *   *套用對象*：`Hero`、`BattleEvent` (types/battleTypes.ts)、`StudySession` (services/analytics.ts)、`UseChunkedPracticeReturn` (hooks/useChunkedPractice.ts)。

---

## 3. 限制與假設 (Caveats)

*   **全域檢查假設**：此分析假設沒有第三方套件透過動態模組載入或 eval 反射來讀取這些型別。由於本專案為標準 TypeScript SPA 且無此類反射邏輯，此假設成立。
*   **ESLint / TypeScript 規則限制**：
    *   在將 `SKILL_THRESHOLDS` 改為非 export 的模組區域常數後，因為它在 `types/battleTypes.ts` 內並無其他程式碼調用，所以它會成為一個 unused local constant。
    *   經檢查，專案的 `eslint.config.js` 配置了 `"@typescript-eslint/no-unused-vars": ["warn", ...]`，代表這只會產生 `warn`（警告），而不會導致編譯失敗或中斷 build。但若要完全避免警告，亦可在 `types/battleTypes.ts` 中將其改為 `const _SKILL_THRESHOLDS` 或配合刪除。然而，根據需求限制，僅需變更為 `const SKILL_THRESHOLDS`。

---

## 4. 結論 (Conclusion)

所有 5 個目標的型別與 export 清理策略均**完全安全**，不會引發任何 TypeScript 編譯錯誤或單元測試失敗。

### 具體變更策略與代碼修改點 (唯讀提議)

#### 1. 在 `types.ts` 中變更 `MistakeLogEntry`
*   **修改行號**：第 17 行
*   **修改內容**：
    ```typescript
    // Before
    export interface MistakeLogEntry {
    
    // After
    interface MistakeLogEntry {
    ```

#### 2. 在 `types/battleTypes.ts` 中變更
*   **修改 1**：第 12 行
    ```typescript
    // Before
    export type SkillAnimationType = 'css' | 'lottie' | 'sequence' | 'video';
    
    // After
    type SkillAnimationType = 'css' | 'lottie' | 'sequence' | 'video';
    ```
*   **修改 2**：第 30 行
    ```typescript
    // Before
    export interface SkillThreshold {
    
    // After
    interface SkillThreshold {
    ```
*   **修改 3**：刪除第 68-80 行 (Hero 介面定義，含上方 JSDoc)
    *   **刪除範圍**：
        ```typescript
        /** 主角狀態 */
        export interface Hero {
          name: string;
          imagePath: string;
          attackImagePath: string;
          hurtImagePath: string;
          maxHp: number;
          currentHp: number;
          attackDialogues: string[];
          hurtDialogues: string[];
          victoryDialogues: string[];
          skillDialogues: Record<SkillTier, string[]>;
        }
        ```
*   **修改 4**：刪除第 206-216 行 (BattleEvent 型別定義，含上方 JSDoc)
    *   **刪除範圍**：
        ```typescript
        /** 戰鬥事件類型 */
        export type BattleEvent =
          | { type: 'START_BATTLE'; monster: Monster }
          | { type: 'ANSWER_CORRECT' }
          | { type: 'ANSWER_WRONG' }
          | { type: 'TRIGGER_SKILL'; skill: Skill }
          | { type: 'ANIMATION_COMPLETE' }
          | { type: 'MONSTER_DEFEATED' }
          | { type: 'HERO_DEFEATED' }
          | { type: 'SPAWN_NEW_MONSTER' }
          | { type: 'END_BATTLE' };
        ```
*   **修改 5**：第 253 行
    ```typescript
    // Before
    export type PracticeChunkStatus = 'pending' | 'in_progress' | 'completed';
    
    // After
    type PracticeChunkStatus = 'pending' | 'in_progress' | 'completed';
    ```
*   **修改 6**：第 36 行
    ```typescript
    // Before
    export const SKILL_THRESHOLDS: SkillThreshold[] = [
    
    // After
    const SKILL_THRESHOLDS: SkillThreshold[] = [
    ```

#### 3. 在 `services/analytics.ts` 中變更
*   **修改行號**：第 4-11 行 (物理刪除 StudySession)
    *   **刪除範圍**：
        ```typescript
        export interface StudySession {
          id?: string;
          userId: string;
          sessionDate: string;
          questionsAnswered: number;
          correctCount: number;
          sessionDuration: number; // in seconds
        }
        ```

#### 4. 在 `hooks/useChunkedPractice.ts` 中變更
*   **修改行號**：第 473 行 (物理刪除 UseChunkedPracticeReturn)
    *   **刪除範圍**：
        ```typescript
        export type UseChunkedPracticeReturn = ReturnType<typeof useChunkedPractice>;
        ```

#### 5. 在 `contexts/ToastContext.tsx` 中變更
*   **修改行號**：第 5 行
    ```typescript
    // Before
    export interface Toast {
    
    // After
    interface Toast {
    ```

---

## 5. 驗證方法 (Verification Method)

變更應用後，可執行以下步驟獨立驗證其正確性與安全性：
1.  **TypeScript 型別檢查**：
    執行 `npx tsc --noEmit`。如果輸出無任何錯誤，表示專案型別系統完整，無因匯出變更導致的引用失效。
2.  **單元測試執行**：
    執行 `npm test`，確保所有 170 個單元測試均能正常編譯並全數通過。
