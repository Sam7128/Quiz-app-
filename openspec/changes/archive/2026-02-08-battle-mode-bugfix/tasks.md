# Battle Mode Bugfix - Tasks

## Task 1: Fix Meteor Skill Animation Type
- [x] **File**: `constants/skillsData.ts`
  - [x] Change `animationType: 'sequence'` to `animationType: 'css'`
- [x] **Verify**: Start quiz, reach 20 streak, observe meteor skill animation shows image

## Task 2: Fix Skill Trigger Milestones
- [x] **File**: `constants/skillsData.ts`
  - [x] Modify `shouldTriggerSkill()` to only trigger at [5, 10, 20, 30, 40, 50]
- [x] **Verify**: Skills trigger only at milestone streaks, not at 15, 25, 35, 45

## Task 3: Expand Damage Shield Mechanism
- [x] **File**: `hooks/useBattleSystem.ts`
  - [x] Modify `calculateDamage()` to apply shields to all monster types
- [x] **Verify**: High streak attacks don't one-shot normal/elite monsters

## Task 4: Adjust Skeleton Wizard Scale
- [x] **File**: `constants/monstersData.ts`
  - [x] Line ~223, change `visualScale: 1.5` to `visualScale: 1.8`
- [x] **Verify**: Skeleton wizard appears significantly taller than hero
