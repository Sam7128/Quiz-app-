# Handoff Report - explorer_m2_1

## 1. Observation (觀察結果)

我們對專案中指定的常數與函式進行了全域 grep 搜尋與代碼分析，觀察到以下具體事實：

### MonstersData 相關常數
* `NORMAL_MONSTERS` (定義於 `constants/monstersData.ts:15`)、`ELITE_MONSTERS` (定義於 `constants/monstersData.ts:101`)、`BOSS_MONSTERS` (定義於 `constants/monstersData.ts:164`)、`ALL_MONSTERS` (定義於 `constants/monstersData.ts:230`) 皆無外部代碼引用的紀錄。
* `NORMAL_MONSTER_IDS` (定義於 `constants/monstersData.ts:270`)、`ELITE_MONSTER_IDS` (定義於 `constants/monstersData.ts:271`)、`BOSS_MONSTER_IDS` (定義於 `constants/monstersData.ts:272`) 正在被外部檔案引用：
  * 引用的檔案：`hooks/useBattleSystem.ts`
  * 導入聲明 (`hooks/useBattleSystem.ts:28-30`)：
    ```typescript
    NORMAL_MONSTER_IDS,
    ELITE_MONSTER_IDS,
    BOSS_MONSTER_IDS
    ```
  * 使用邏輯 (`hooks/useBattleSystem.ts:250-252`)：
    ```typescript
            if (isBoss) targetList = BOSS_MONSTER_IDS;
            else if (isElite) targetList = ELITE_MONSTER_IDS;
            else targetList = NORMAL_MONSTER_IDS;
    ```

### SkillsData 相關常數與函式
* `BASIC_SKILLS` (定義於 `constants/skillsData.ts:10`)、`INTERMEDIATE_SKILLS` (定義於 `constants/skillsData.ts:45`)、`ADVANCED_SKILLS` (定義於 `constants/skillsData.ts:80`)、`ULTIMATE_SKILLS` (定義於 `constants/skillsData.ts:115`)、`EPIC_SKILLS` (定義於 `constants/skillsData.ts:130`)、`LEGENDARY_SKILLS` (定義於 `constants/skillsData.ts:145`)、`ALL_SKILLS` (定義於 `constants/skillsData.ts:161`)、`getSkillsByTier` (定義於 `constants/skillsData.ts:171`) 均無外部代碼引用的紀錄。
* `getSkillsByTier` 僅在 `constants/skillsData.ts` 內部的 `getRandomSkill` (第 192 行) 被調用。

### 其他背景觀察
* 在 `openspec/changes/dead-code-cleanup/tasks.md:94` 中，任務規劃了要對 `NORMAL_MONSTER_IDS`、`ELITE_MONSTER_IDS`、`BOSS_MONSTER_IDS` 進行 `export` 關鍵字的移除。

---

## 2. Logic Chain (推理邏輯)
1. **編譯依存關係**：如果一個模組定義並導出（`export`）常數，且另一個模組透過 `import { ... }` 導入並在代碼中使用它，則這兩個模組具有直接的編譯期依存關係。
2. **移除 Export 的後果**：當我們移除被導入常數的 `export` 關鍵字，TypeScript 編譯器在編譯導入端模組（`hooks/useBattleSystem.ts`）時，會因為找不到對應的具名導出（Named Export）而拋出 TS2305 錯誤（`Module '...' has no exported member '...'`）。
3. **推論一**：因此，因為 `NORMAL_MONSTER_IDS`, `ELITE_MONSTER_IDS`, `BOSS_MONSTER_IDS` 正被 `hooks/useBattleSystem.ts` 引入並使用，移除其 `export` 關鍵字是不安全的。
4. **推論二**：其餘項目（包含 `NORMAL_MONSTERS` 等怪物常數，以及 `skillsData.ts` 中的所有指定項目）皆無任何外部引用。因此移除其 `export` 關鍵字不會造成任何編譯與運行時影響，是安全的。

---

## 3. Caveats (限制與假設)
* 本次調查假設全域搜尋工具 ripgrep (`grep_search`) 已完全覆蓋所有工作目錄下的原始碼檔案。
* 假設未來的重構計畫沒有在其他分支引入對這些常數的新依賴。

---

## 4. Conclusion (結論)
1. **可安全取消導出 (移除 export)**：
   * `NORMAL_MONSTERS`
   * `ELITE_MONSTERS`
   * `BOSS_MONSTERS`
   * `ALL_MONSTERS`
   * `BASIC_SKILLS`
   * `INTERMEDIATE_SKILLS`
   * `ADVANCED_SKILLS`
   * `ULTIMATE_SKILLS`
   * `EPIC_SKILLS`
   * `LEGENDARY_SKILLS`
   * `ALL_SKILLS`
   * `getSkillsByTier`
2. **必須保持導出 (保留 export)**：
   * `NORMAL_MONSTER_IDS`
   * `ELITE_MONSTER_IDS`
   * `BOSS_MONSTER_IDS`
   * 移除此三者的導出將會破壞 `hooks/useBattleSystem.ts` 的編譯，必須將其從 `dead-code-cleanup/tasks.md` 的 Phase 2 清理清單中排除。

---

## 5. Verification Method (驗證方法)
1. 進入專案根目錄，執行 `npx tsc --noEmit`。
2. 基準狀態（未修改前）編譯應能順利通過。
3. 若嘗試將 `NORMAL_MONSTER_IDS` 等常數的 `export` 取消，執行 `npx tsc --noEmit` 應立即在 `hooks/useBattleSystem.ts` 報錯。
