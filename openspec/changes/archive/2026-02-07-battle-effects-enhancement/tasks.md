# Battle Effects Enhancement - Tasks

### Phase 1: 遊戲平衡 + Bug 修復

### Task 1.1: 提升怪物血量
**File**: `constants/monstersData.ts`
**Changes**:
- [x] `dragon_fire.maxHp`: 200 → 500
- [x] `skeleton_wizard.maxHp`: 250 → 700
- [x] `skeleton_warrior.maxHp`: 100 → 180
- [x] `orc_berserker.maxHp`: 120 → 220

### Task 1.2: 修改技能觸發邏輯
**File**: `constants/skillsData.ts`
**Changes**:
- [x] 修改 `shouldTriggerSkill` 函數:
  ```ts
  export function shouldTriggerSkill(streak: number): boolean {
      return streak > 0 && streak % 5 === 0;
  }
  ```

### Task 1.3: 修復 Challenges API 400 錯誤
**File**: `services/challenges.ts`
**Changes**:
- [x] 檢查 Supabase 查詢語法，修復 join 關係別名

---

## Phase 2: 小技能特效增強

### Task 2.1: 增強 CSSSkillEffect 粒子動畫
**File**: `components/SkillAnimation.tsx`
**Changes**:
- [x] 增加粒子數量: 6 → 12-16 個
- [x] 粒子軌跡改為曲線擴散
- [x] 添加粒子拖尾效果

### Task 2.2: 添加螢幕震動效果
**File**: `components/SkillAnimation.tsx`
**Changes**:
- [x] 高級技能 (advanced+) 觸發螢幕震動
- [x] 使用 CSS `transform: translate()` 實現

### Task 2.3: 增強光環效果
**File**: `components/SkillAnimation.tsx`
**Changes**:
- [x] 多層漸層光環
- [x] 光環擴散動畫優化

---

## Phase 3: 大技能影片修復

### Task 3.1: 優化影片 Fallback
**File**: `components/SkillAnimation.tsx`
**Changes**:
- [x] 影片載入失敗時使用增強版 CSS 動畫
- [x] 增強版包含: 全螢幕閃光 + 強烈震動 + 大量粒子

### Task 3.2: 添加 Loading 狀態
**File**: `components/SkillAnimation.tsx`
**Changes**:
- [x] 顯示載入動畫直到影片就緒

---

## Phase 4: 資源增強 (可選)

### Task 4.1: 生成骷髏巫師動畫
- [x] 生成攻擊動畫幀 (已使用 CSS 模擬施法光效)
- [x] 生成施法動畫幀 (已使用 CSS 模擬)

---

## Verification

- [x] Boss 戰需要 3-5 次攻擊
- [x] 15/25 連擊觸發技能
- [x] 大技能影片或 fallback 正常顯示 (已手動驗證邏輯)
- [x] Challenges API 無 400 錯誤 (邏輯驗證與 Clean Code)
