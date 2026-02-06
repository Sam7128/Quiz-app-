# 實作任務清單 - Battle Mode Overhaul

## Phase 1: 基礎設施 (Types & Data)

- [x] **1.1** 更新 `types/battleTypes.ts`
  - 新增 `questionsAnswered`, `monsterPool`, `seenMonsters` 到 `BattleState`
  - 新增 `CritResult`, `DamageResult` 介面
  - 更新 `INITIAL_BATTLE_STATE`

- [x] **1.2** 更新 `constants/monstersData.ts`
  - 匯出 `NORMAL_MONSTER_IDS`, `ELITE_MONSTER_IDS`

- [x] **1.3** 更新 `constants/achievements.ts`
  - 新增 13 個成就定義

- [x] **1.4** 更新 `constants/battleDialogues.ts`
  - 新增護盾相關對話

---

## Phase 2: 核心戰鬥邏輯

- [x] **2.1** 重構 `hooks/useBattleSystem.ts`
  - 實作 `calculateDamage()` 動態傷害計算
  - 實作 `rollCrit()` 暴擊判定 (15% 機率，1.5-3x 倍率)
  - 實作 `getNextMonster()` 輪流選怪邏輯
  - 修改 Boss 出場邏輯 (基於 questionsAnswered)

---

## Phase 3: 新增 UI 元件

- [x] **3.1** 建立 `components/MiniTimer.tsx`
  - 迷你蕃茄時鐘顯示

- [x] **3.2** 建立 `components/IceArrowAttack.tsx`
  - 使用 ice_arrow.png 的冰箭動畫

- [x] **3.3** 建立 `components/AttackEffect.tsx`
  - 統一攻擊特效入口
  - 隨機選擇火球/冰箭

- [x] **3.4** 建立 `components/DamageNumber.tsx`
  - 浮動傷害數字
  - 暴擊特殊樣式

- [x] **3.5** 建立 `components/AchievementsModal.tsx`
  - 完整成就列表 Modal

- [x] **3.6** 建立 `components/QuizResult.tsx`
  - 測驗結果頁面
  - 錯題回顧功能

- [x] **3.7** 建立 `components/RestBreakModal.tsx`
  - 休息站提示 Modal
  - 「繼續答題」/「回到首頁」按鈕

- [x] **3.8** 建立 `components/ResumePrompt.tsx`
  - 恢復進度提示元件
  - 「繼續」/「重新開始」按鈕

---

## Phase 4: 整合現有元件

- [x] **4.1** 更新 `components/QuizCard.tsx`
  - 整合 MiniTimer 到頂部
  - 結束時回傳 wrongQuestionIds

- [x] **4.2** 更新 `components/BattleArena.tsx`
  - 使用 AttackEffect 取代硬編碼 FireballAttack
  - 整合 DamageNumber
  - 新增暴擊螢幕閃光

- [x] **4.3** 更新 `components/SkillAnimation.tsx`
  - 使用實際圖片資源
  - 保留 lucide 圖標 fallback

- [x] **4.4** 更新 `components/AchievementsCard.tsx`
  - 點擊開啟 AchievementsModal

- [x] **4.5** 更新 `components/Dashboard.tsx`
  - 題庫選擇預設全選

- [x] **4.6** 更新 `services/storage.ts`
  - 新增 `saveQuizProgress`, `loadQuizProgress`, `clearQuizProgress`

- [x] **4.7** 更新 `components/Settings.tsx`
  - 新增「休息站間隔」選項

- [x] **4.8** 更新 `components/QuizCard.tsx` (數字鍵提示)
  - 選項旁顯示 1-4 數字提示

---

## Phase 5: App 層整合

- [x] **5.1** 更新 `App.tsx`
  - 新增 sessionMistakes 狀態
  - 整合 QuizResult 顯示邏輯

---

## Phase 6: 驗證與修正

- [x] **6.1** 功能驗證
  - 蕃茄時鐘顯示正常
  - 攻擊特效隨機播放
  - 成就 Modal 可開關
  - Boss 每 10 題出現
  - 怪物輪流出現
  - 暴擊正常觸發
  - 錯題可回顧
  - 預設全選生效
  - 休息站提示正常彈出
  - 進度持久化生效
  - 數字鍵提示顯示

- [x] **6.2** TypeScript 編譯確認
  - 運行 `npx tsc --noEmit`

- [x] **6.3** 文件更新
  - 更新 `DEVELOPMENT_LOG.md`
  - 更新 `GEMINI.md`
  - 確保所有新功能皆已記錄明細

- [ ] **6.4** 歸檔 (Archive) 此變更
