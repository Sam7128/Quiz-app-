# Handoff Report — 類型與導出清理分析

## 1. Observation (觀察結果)

經由 `grep_search` 及 `view_file` 工具進行唯讀分析，確認以下型別及常數在專案中的引用與定義情況：

1. **`MistakeLogEntry`**
   - **定義位置**: `types.ts` 第 17-21 行
     ```typescript
     export interface MistakeLogEntry {
       count: number;
       lastWrongAnswer: string;
       timestamp: number;
     }
     ```
   - **引用情況**: 僅在 `types.ts` 第 24 行被 `MistakeLog` 介面引用。
     ```typescript
     [questionId: string]: MistakeLogEntry;
     ```
     專案中沒有任何外部程式碼檔案對 `MistakeLogEntry` 進行直接導入或使用。

2. **`types/battleTypes.ts` 相關型別與常數**
   - **`SkillAnimationType`**
     - **定義位置**: `types/battleTypes.ts` 第 12 行
       ```typescript
       export type SkillAnimationType = 'css' | 'lottie' | 'sequence' | 'video';
       ```
     - **引用情況**: 僅在 `types/battleTypes.ts` 第 23 行被 `Skill` 的成員引用。外部無引用。
   - **`SkillThreshold`**
     - **定義位置**: `types/battleTypes.ts` 第 30-33 行
       ```typescript
       export interface SkillThreshold {
         tier: SkillTier;
         requiredStreak: number;
       }
       ```
     - **引用情況**: 僅在 `types/battleTypes.ts` 第 36 行作為 `SKILL_THRESHOLDS` 常數的型別定義使用。外部無引用。
   - **`SKILL_THRESHOLDS`**
     - **定義位置**: `types/battleTypes.ts` 第 36-43 行
       ```typescript
       export const SKILL_THRESHOLDS: SkillThreshold[] = [...];
       ```
     - **引用情況**: 僅在該檔案內部定義，外部程式碼檔案無任何引用。
   - **`Hero`**
     - **定義位置**: `types/battleTypes.ts` 第 69-80 行
       ```typescript
       export interface Hero { ... }
       ```
     - **引用情況**: 專案中無任何 TypeScript 程式碼檔案導入或使用此型別。
   - **`BattleEvent`**
     - **定義位置**: `types/battleTypes.ts` 第 207-216 行
       ```typescript
       export type BattleEvent = ...;
       ```
     - **引用情況**: 專案中無任何 TypeScript 程式碼檔案導入或使用此型別。
   - **`PracticeChunkStatus`**
     - **定義位置**: `types/battleTypes.ts` 第 253 行
       ```typescript
       export type PracticeChunkStatus = 'pending' | 'in_progress' | 'completed';
       ```
     - **引用情況**: 僅在 `types/battleTypes.ts` 第 258 行被 `PracticeChunk` 的成員 `status` 引用。外部無引用。

3. **`StudySession`**
   - **定義位置**: `services/analytics.ts` 第 4-11 行
     ```typescript
     export interface StudySession { ... }
     ```
   - **引用情況**: 專案中無任何 TypeScript 程式碼檔案導入或使用此型別（目前本地分析改為使用 `LocalStudySession` 介面，此為冗餘代碼）。

4. **`UseChunkedPracticeReturn`**
   - **定義位置**: `hooks/useChunkedPractice.ts` 第 473 行
     ```typescript
     export type UseChunkedPracticeReturn = ReturnType<typeof useChunkedPractice>;
     ```
   - **引用情況**: 專案中無任何 TypeScript 程式碼檔案導入或使用此型別。

5. **`Toast`**
   - **定義位置**: `contexts/ToastContext.tsx` 第 5-10 行
     ```typescript
     export interface Toast { ... }
     ```
   - **引用情況**: 僅在 `contexts/ToastContext.tsx` 內部第 13、26 行被 `ToastContextType` 與 `useState` 引用。雖然外部組件（如 `components/ToastContainer.tsx`）會使用 `useToast()` 來解構出 `toasts` 變數，但其型別由 TypeScript 自動推導，外部無直接導入 `Toast` 型別。

---

## 2. Logic Chain (邏輯鏈)

- **取消導出之型別（僅保留內部定義）**:
  - `MistakeLogEntry`（用於 `types.ts` 中的 `MistakeLog`）
  - `SkillAnimationType`（用於 `types/battleTypes.ts` 中的 `Skill`）
  - `SkillThreshold`（用於 `types/battleTypes.ts` 中的 `SKILL_THRESHOLDS`）
  - `SKILL_THRESHOLDS`（僅做檔案內常數，無外部使用）
  - `PracticeChunkStatus`（用於 `types/battleTypes.ts` 中的 `PracticeChunk`）
  - `Toast`（用於 `contexts/ToastContext.tsx` 內 `toasts` 狀態，外部使用型別推導）
  - **結論**: 上述型別由於外部程式碼完全沒有 `import`，將其從 `export xxx` 改為 `xxx` 不會破壞專案內部的依賴，也不會引起任何編譯錯誤。
- **物理刪除之型別**:
  - `Hero`（未被任何程式碼使用）
  - `BattleEvent`（未被任何程式碼使用）
  - `StudySession`（未被任何程式碼使用）
  - `UseChunkedPracticeReturn`（未被任何程式碼使用）
  - **結論**: 上述型別皆屬冗餘死代碼，物理刪除後不會對現存程式碼產生任何影響。

---

## 3. Caveats (注意事項)

- 本次分析完全基於目前專案中的程式碼靜態檢索。
- 專案中的單元測試（例如 `src/__tests__/`）已一同進行搜尋，未發現上述型別在測試檔案中的直接導入與依賴。
- 清理 `Toast` 導出後，若日後有外部元件需要顯式標註單個 `Toast` 對象的型別，則需重新導出或使用 `ToastContextType['toasts'][number]` 進行提取，但就目前程式碼結構而言，無需導出。

---

## 4. Conclusion (結論與具體變更策略)

建議進行以下修改策略（完全是安全的且無破壞性）：

### 修改策略 1：`types.ts`
- **操作**: 將第 17 行的 `export interface MistakeLogEntry` 改為 `interface MistakeLogEntry`。
- **具體變更**:
  ```typescript
  // Before (第 17 行)
  export interface MistakeLogEntry {
  
  // After
  interface MistakeLogEntry {
  ```

### 修改策略 2：`types/battleTypes.ts`
- **操作**: 
  1. 將第 12 行的 `export type SkillAnimationType` 改為 `type SkillAnimationType`。
  2. 將第 30 行的 `export interface SkillThreshold` 改為 `interface SkillThreshold`。
  3. 將第 36 行的 `export const SKILL_THRESHOLDS` 改為 `const SKILL_THRESHOLDS`。
  4. 物理刪除第 66-80 行的整個 `Hero` 介面定義（共 15 行，包含上方 JSDoc `/** 主角狀態 */`）。
  5. 物理刪除第 204-216 行的整個 `BattleEvent` 型別定義（共 13 行，包含上方 JSDoc `/** 戰鬥事件類型 */` 與事件清單）。
  6. 將第 253 行的 `export type PracticeChunkStatus` 改為 `type PracticeChunkStatus`。
- **具體變更**:
  - **第 12 行**:
    ```typescript
    // Before
    export type SkillAnimationType = 'css' | 'lottie' | 'sequence' | 'video';
    // After
    type SkillAnimationType = 'css' | 'lottie' | 'sequence' | 'video';
    ```
  - **第 30 行**:
    ```typescript
    // Before
    export interface SkillThreshold {
    // After
    interface SkillThreshold {
    ```
  - **第 36 行**:
    ```typescript
    // Before
    export const SKILL_THRESHOLDS: SkillThreshold[] = [
    // After
    const SKILL_THRESHOLDS: SkillThreshold[] = [
    ```
  - **第 66-80 行 (刪除)**:
    ```typescript
    // 刪除以下區塊：
    // ==================== 主角系統 ====================
    
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
  - **第 204-216 行 (刪除)**:
    ```typescript
    // 刪除以下區塊：
    // ==================== 戰鬥事件 ====================
    
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
  - **第 253 行**:
    ```typescript
    // Before
    export type PracticeChunkStatus = 'pending' | 'in_progress' | 'completed';
    // After
    type PracticeChunkStatus = 'pending' | 'in_progress' | 'completed';
    ```

### 修改策略 3：`services/analytics.ts`
- **操作**: 物理刪除第 4-11 行的整個 `StudySession` 介面定義（共 8 行）。
- **具體變更**:
  ```typescript
  // 刪除以下區塊：
  export interface StudySession {
    id?: string;
    userId: string;
    sessionDate: string;
    questionsAnswered: number;
    correctCount: number;
    sessionDuration: number; // in seconds
  }
  ```

### 修改策略 4：`hooks/useChunkedPractice.ts`
- **操作**: 物理刪除第 473 行的整行 `UseChunkedPracticeReturn`。
- **具體變更**:
  ```typescript
  // 刪除以下行：
  export type UseChunkedPracticeReturn = ReturnType<typeof useChunkedPractice>;
  ```

### 修改策略 5：`contexts/ToastContext.tsx`
- **操作**: 將第 5 行的 `export interface Toast` 改為 `interface Toast`。
- **具體變更**:
  ```typescript
  // Before (第 5 行)
  export interface Toast {
  
  // After
  interface Toast {
  ```

---

## 5. Verification Method (驗證方法)

1. **靜態類型檢查**:
   在終端機中執行專案編譯檢查命令，確認無任何因型別導出變更引起的 TypeScript 錯誤：
   ```bash
   npx tsc --noEmit
   ```
2. **建置測試**:
   執行 Vite 建置命令，確保打包正常完成：
   ```bash
   npm run build
   ```
3. **單元測試**:
   執行專案中現有的單元測試，驗證邏輯與測試依然通過：
   ```bash
   npm test
   ```
