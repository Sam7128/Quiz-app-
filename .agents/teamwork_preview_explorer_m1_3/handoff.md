# Handoff Report — M1_3 Cleanup Analysis

## 1. Observation (觀察結果)

透過 `grep_search` 工具在專案所有 TypeScript 檔案中檢索目標型別及常量的引用情況，結果如下：

*   **`MistakeLogEntry`**
    *   定義位置：`types.ts` 第 17 行
        ```typescript
        export interface MistakeLogEntry {
          count: number;
          lastWrongAnswer: string;
          timestamp: number;
        }
        ```
    *   引用情況：僅在 `types.ts` 第 24 行作為 `MistakeLog` 屬性的型別：
        ```typescript
        export interface MistakeLog {
          [questionId: string]: MistakeLogEntry;
        }
        ```
    *   其他檔案無任何引用。

*   **`SkillAnimationType`**
    *   定義位置：`types/battleTypes.ts` 第 12 行
        ```typescript
        export type SkillAnimationType = 'css' | 'lottie' | 'sequence' | 'video';
        ```
    *   引用情況：僅在 `types/battleTypes.ts` 第 23 行被 `Skill` 介面引用：
        ```typescript
        animationType: SkillAnimationType;
        ```
    *   其他檔案無任何引用。

*   **`SkillThreshold`**
    *   定義位置：`types/battleTypes.ts` 第 30 行
        ```typescript
        export interface SkillThreshold {
          tier: SkillTier;
          requiredStreak: number;
        }
        ```
    *   引用情況：僅在 `types/battleTypes.ts` 第 36 行被 `SKILL_THRESHOLDS` 常量陣列作為型別註解使用：
        ```typescript
        export const SKILL_THRESHOLDS: SkillThreshold[] = [
        ```
    *   其他檔案無任何引用。

*   **`Hero`**
    *   定義位置：`types/battleTypes.ts` 第 69-80 行
        ```typescript
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
    *   引用情況：除了定義處外，專案中沒有任何地方使用 `Hero` 作為 TypeScript 型別（其他檔案中僅有變數名為 `isHero` 的布林值，與此型別無關）。

*   **`BattleEvent`**
    *   定義位置：`types/battleTypes.ts` 第 207-216 行
        ```typescript
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
    *   引用情況：除定義處外，專案中沒有任何檔案引用或使用此型別。

*   **`PracticeChunkStatus`**
    *   定義位置：`types/battleTypes.ts` 第 253 行
        ```typescript
        export type PracticeChunkStatus = 'pending' | 'in_progress' | 'completed';
        ```
    *   引用情況：僅在 `types/battleTypes.ts` 第 258 行被 `PracticeChunk` 介面引用：
        ```typescript
        status: PracticeChunkStatus;
        ```
    *   其他檔案無任何引用。

*   **`SKILL_THRESHOLDS`**
    *   定義位置：`types/battleTypes.ts` 第 36-43 行
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
    *   引用情況：僅在定義處宣告，專案中沒有其他檔案引用該常量。

*   **`StudySession`**
    *   定義位置：`services/analytics.ts` 第 4-11 行
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
    *   引用情況：除定義處外，`services/analytics.ts` 內部的讀寫函數直接使用基礎參數（例如 `questionsAnswered: number`），無任何地方引用或使用 `StudySession` 作為型別宣告。

*   **`UseChunkedPracticeReturn`**
    *   定義位置：`hooks/useChunkedPractice.ts` 第 473 行
        ```typescript
        export type UseChunkedPracticeReturn = ReturnType<typeof useChunkedPractice>;
        ```
    *   引用情況：僅在該行定義，專案中沒有其他檔案引用或使用此型別。

*   **`Toast`**
    *   定義位置：`contexts/ToastContext.tsx` 第 5-10 行
        ```typescript
        export interface Toast {
          id: string;
          type: ToastType;
          message: string;
          duration: number;
        }
        ```
    *   引用情況：在 `contexts/ToastContext.tsx` 內部的 `ToastContextType`（第 13 行 `toasts: Toast[];`）與 `ToastProvider`（第 26 行 `useState<Toast[]>`）中引用。
    *   外部檔案如 `components/ToastContainer.tsx` 透過 `useToast()` 取得 `toasts` 陣列，其型別會經由 TypeScript 的 context 型別自動推導，外部檔案並未直接 `import { Toast }`。

---

## 2. Logic Chain (邏輯推導鏈)

1.  **取消導出與刪除的安全性條件**：
    若一個型別、介面或常量僅在定義檔案內部被引用，或完全無任何地方引用，則將其 `export` 關鍵字移除（限制在該檔案範圍內）或物理刪除，將不會影響任何外部檔案，且不會產生任何 TypeScript 編譯錯誤。
2.  **關於 `Toast` 的型別推導**：
    `components/ToastContainer.tsx` 呼叫了 `const { toasts, dismiss } = useToast();`。這裡的 `toasts` 型別是由 `useToast()` 的回傳型別 `ToastContextType` 決定的。由於 `ToastContextType` 依然保持 `export`，因此即使 `Toast` 本身被改為 `interface Toast`（不導出），TypeScript 依然能夠在 `ToastContext.tsx` 內部解析並正確推導出 `toasts` 陣列中每個元素的結構。這意味著外部檔案不需要手動 `import { Toast }`，將 `export interface Toast` 改為 `interface Toast` 是完全安全的。
3.  **結論成立**：
    根據 Observation 的檢索結果，所有被要求調整的型別在外部檔案均無直接 `import` 或使用。因此，將其取消導出（移除 `export`）或直接物理刪除，是 100% 安全且不會影響專案正常運作與編譯的。

---

## 3. Caveats (注意事項)

*   **唯讀分析限制**：本分析為唯讀，未對原始碼進行實質修改，因此建議在後續實作變更時，仍須使用 TypeScript 編譯器進行最終驗證，以確保無隱蔽的動態型別推導問題。
*   **測試檔案宣告**：在單元測試或模擬測試（Mock）中，如未明確引用上述型別，則無影響。已檢查並確認 Vitest 的測試檔案（例如 `useChunkedPractice.test.ts`）沒有引用上述要刪除的型別。

---

## 4. Conclusion (結論與具體變更策略)

本案之清理策略完全可行且安全。以下為具體的變更策略（精確對應至檔案與行號）：

### 策略 1：修改 `types.ts`
*   **目標**：將 `export interface MistakeLogEntry` 改為 `interface MistakeLogEntry`。
*   **修改前內容** (第 17-21 行)：
    ```typescript
    export interface MistakeLogEntry {
      count: number;
      lastWrongAnswer: string;
      timestamp: number;
    }
    ```
*   **修改後內容**：
    ```typescript
    interface MistakeLogEntry {
      count: number;
      lastWrongAnswer: string;
      timestamp: number;
    }
    ```

### 策略 2：修改 `types/battleTypes.ts`
*   **目標 A**：將 `export type SkillAnimationType` 改為 `type SkillAnimationType`。
    *   **修改前內容** (第 12 行)：
        ```typescript
        export type SkillAnimationType = 'css' | 'lottie' | 'sequence' | 'video';
        ```
    *   **修改後內容**：
        ```typescript
        type SkillAnimationType = 'css' | 'lottie' | 'sequence' | 'video';
        ```
*   **目標 B**：將 `export interface SkillThreshold` 改為 `interface SkillThreshold`。
    *   **修改前內容** (第 30-33 行)：
        ```typescript
        export interface SkillThreshold {
          tier: SkillTier;
          requiredStreak: number;
        }
        ```
    *   **修改後內容**：
        ```typescript
        interface SkillThreshold {
          tier: SkillTier;
          requiredStreak: number;
        }
        ```
*   **目標 C**：物理刪除整個 `Hero` 介面定義（包含上方 JSDoc）。
    *   **刪除範圍** (第 68-80 行)：
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
*   **目標 D**：物理刪除整個 `BattleEvent` 型別定義（包含上方 JSDoc）。
    *   **刪除範圍** (第 206-216 行)：
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
*   **目標 E**：將 `export type PracticeChunkStatus` 改為 `type PracticeChunkStatus`。
    *   **修改前內容** (第 253 行)：
        ```typescript
        export type PracticeChunkStatus = 'pending' | 'in_progress' | 'completed';
        ```
    *   **修改後內容**：
        ```typescript
        type PracticeChunkStatus = 'pending' | 'in_progress' | 'completed';
        ```
*   **目標 F**：將 `export const SKILL_THRESHOLDS` 改為 `const SKILL_THRESHOLDS`。
    *   **修改前內容** (第 36-43 行)：
        ```typescript
        export const SKILL_THRESHOLDS: SkillThreshold[] = [
          ...
        ];
        ```
    *   **修改後內容**：
        ```typescript
        const SKILL_THRESHOLDS: SkillThreshold[] = [
          ...
        ];
        ```

### 策略 3：修改 `services/analytics.ts`
*   **目標**：物理刪除整個 `StudySession` 介面定義。
*   **刪除範圍** (第 4-11 行)：
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

### 策略 4：修改 `hooks/useChunkedPractice.ts`
*   **目標**：物理刪除 `export type UseChunkedPracticeReturn = ReturnType<typeof useChunkedPractice>;`。
*   **刪除範圍** (第 473 行)：
    ```typescript
    export type UseChunkedPracticeReturn = ReturnType<typeof useChunkedPractice>;
    ```

### 5. 修改 `contexts/ToastContext.tsx`
*   **目標**：將 `export interface Toast` 改為 `interface Toast`。
*   **修改前內容** (第 5-10 行)：
    ```typescript
    export interface Toast {
      id: string;
      type: ToastType;
      message: string;
      duration: number;
    }
    ```
*   **修改後內容**：
    ```typescript
    interface Toast {
      id: string;
      type: ToastType;
      message: string;
      duration: number;
    }
    ```

---

## 5. Verification Method (驗證方法)

實作變更後，可依序執行下列指令來驗證是否影響編譯或功能：

1.  **型別檢查**：
    在專案根目錄下執行 TypeScript 編譯檢查，確認無型別錯誤：
    ```powershell
    npx tsc --noEmit
    ```
2.  **單元測試**：
    執行單元測試，確保沒有受影響的邏輯或測試：
    ```powershell
    npm test
    ```
3.  **編譯建置**：
    執行生產環境建置，確保專案能順利打包：
    ```powershell
    npm run build
    ```
