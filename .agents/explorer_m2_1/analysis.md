# 專案常數與函式引用分析及安全性評估報告

本報告針對專案中 `constants/monstersData.ts` 和 `constants/skillsData.ts` 所指定的特定常數與函式進行全域引用分析與安全性評估。

---

## 1. 核心摘要
- **高風險警訊**：`constants/monstersData.ts` 中的 `NORMAL_MONSTER_IDS`, `ELITE_MONSTER_IDS`, `BOSS_MONSTER_IDS` 在全域清理計畫（`dead-code-cleanup/tasks.md`）中被列為可移除 `export` 欄位。但**本調查證實它們正在被 `hooks/useBattleSystem.ts` 引用**。若移除其 `export`，將會導致 **TypeScript 編譯崩潰（Compile Error）**。
- **安全收窄項目**：
  - `monstersData.ts` 中的 `NORMAL_MONSTERS`, `ELITE_MONSTERS`, `BOSS_MONSTERS`, `ALL_MONSTERS` 確無外部代碼引用，可安全收窄作用域。
  - `skillsData.ts` 中的 `BASIC_SKILLS`, `INTERMEDIATE_SKILLS`, `ADVANCED_SKILLS`, `ULTIMATE_SKILLS`, `EPIC_SKILLS`, `LEGENDARY_SKILLS`, `ALL_SKILLS`, `getSkillsByTier` 確無外部代碼引用，可安全收窄作用域。

---

## 2. constants/monstersData.ts 詳細引用情況與評估

| 常數名稱 | 定義位置 (行數) | 外部代碼引用位置 (檔名:行數) | 安全性評估與說明 |
| :--- | :--- | :--- | :--- |
| `NORMAL_MONSTERS` | `monstersData.ts:15` | 無 | **安全**。僅在檔案內被 `ALL_MONSTERS`、`getMonstersByDifficulty` 及 `NORMAL_MONSTER_IDS` 引用。可移除 `export`。 |
| `ELITE_MONSTERS` | `monstersData.ts:101` | 無 | **安全**。僅在檔案內被 `ALL_MONSTERS`、`getMonstersByDifficulty` 及 `ELITE_MONSTER_IDS` 引用。可移除 `export`。 |
| `BOSS_MONSTERS` | `monstersData.ts:164` | 無 | **安全**。僅在檔案內被 `ALL_MONSTERS`、`getMonstersByDifficulty` 及 `BOSS_MONSTER_IDS` 引用。可移除 `export`。 |
| `ALL_MONSTERS` | `monstersData.ts:230` | 無 | **安全**。僅在檔案內被 `getRandomMonster` 引用。可移除 `export`。 |
| `NORMAL_MONSTER_IDS` | `monstersData.ts:270` | `hooks/useBattleSystem.ts:28`<br>`hooks/useBattleSystem.ts:252` | **不安全！不可移除 export**。<br>該常數在戰鬥系統 Hook 中被引入，作為非精英/非 Boss 怪物池（`targetList`）的 fallback 陣列，移除 export 會導致 TypeScript 編譯錯誤。 |
| `ELITE_MONSTER_IDS` | `monstersData.ts:271` | `hooks/useBattleSystem.ts:29`<br>`hooks/useBattleSystem.ts:251` | **不安全！不可移除 export**。<br>在戰鬥系統 Hook 中被引入，用於挑選精英怪，移除 export 會導致編譯錯誤。 |
| `BOSS_MONSTER_IDS` | `monstersData.ts:272` | `hooks/useBattleSystem.ts:30`<br>`hooks/useBattleSystem.ts:250` | **不安全！不可移除 export**。<br>在戰鬥系統 Hook 中被引入，用於挑選 Boss 怪，移除 export 會導致編譯錯誤。 |

---

## 3. constants/skillsData.ts 詳細引用情況與評估

| 常數/函式名稱 | 定義位置 (行數) | 外部代碼引用位置 (檔名:行數) | 安全性評估與說明 |
| :--- | :--- | :--- | :--- |
| `BASIC_SKILLS` | `skillsData.ts:10` | 無 | **安全**。僅內部用於組建 `ALL_SKILLS` 與 `getSkillsByTier`。可移除 `export`。 |
| `INTERMEDIATE_SKILLS`| `skillsData.ts:45` | 無 | **安全**。僅內部用於組建 `ALL_SKILLS` 與 `getSkillsByTier`。可移除 `export`。 |
| `ADVANCED_SKILLS` | `skillsData.ts:80` | 無 | **安全**。僅內部用於組建 `ALL_SKILLS` 與 `getSkillsByTier`。可移除 `export`。 |
| `ULTIMATE_SKILLS` | `skillsData.ts:115` | 無 | **安全**。僅內部用於組建 `ALL_SKILLS` 與 `getSkillsByTier`。可移除 `export`。 |
| `EPIC_SKILLS` | `skillsData.ts:130` | 無 | **安全**。僅內部用於組建 `ALL_SKILLS` 與 `getSkillsByTier`。可移除 `export`。 |
| `LEGENDARY_SKILLS` | `skillsData.ts:145` | 無 | **安全**。僅內部用於組建 `ALL_SKILLS` 與 `getSkillsByTier`。可移除 `export`。 |
| `ALL_SKILLS` | `skillsData.ts:161` | 無 | **安全**。雖然 `DEAD_CODE_REPORT_2026_06_10.md` 提到其他元件有直接引用此項目，但經全域搜尋證實，除了文檔與測試草稿外，無任何實體代碼檔案引用它。可移除 `export`。 |
| `getSkillsByTier` | `skillsData.ts:171` | 無 | **安全**。僅在檔案內部的 `getRandomSkill` (第 192 行) 被調用，無外部代碼引用。可移除 `export`。 |

---

## 4. 引用細節佐證與代碼片段

### `hooks/useBattleSystem.ts` 中的引用：
* **導入區塊** (`hooks/useBattleSystem.ts:25-31`):
  ```typescript
  import {
      getRandomMonster,
      getMonstersByDifficulty,
      NORMAL_MONSTER_IDS,
      ELITE_MONSTER_IDS,
      BOSS_MONSTER_IDS
  } from '../constants/monstersData';
  ```
* **使用區塊** (`hooks/useBattleSystem.ts:248-253`):
  ```typescript
          let targetList: string[] = [];
          if (isBoss) targetList = BOSS_MONSTER_IDS;
          else if (isElite) targetList = ELITE_MONSTER_IDS;
          else targetList = NORMAL_MONSTER_IDS;
  ```

---

## 5. 結論與重構建議
1. **停止執行 `dead-code-cleanup/tasks.md` 中第 94 行**的任務（移除 `NORMAL_MONSTER_IDS`、`ELITE_MONSTER_IDS`、`BOSS_MONSTER_IDS` 的 export）。
2. 對於其他項目（`NORMAL_MONSTERS`, `ELITE_MONSTERS`, `BOSS_MONSTERS`, `ALL_MONSTERS` 以及 `skillsData.ts` 中的所有指定的 8 個常數/函式），可以安全取消 `export` 關鍵字，實現 API 收窄。
