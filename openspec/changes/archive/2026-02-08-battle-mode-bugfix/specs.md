# Battle Mode Bugfix - Specifications

## Spec: skillsData.ts

### shouldTriggerSkill Function
```typescript
// BEFORE
export function shouldTriggerSkill(streak: number): boolean {
    return streak > 0 && streak % 5 === 0;
}

// AFTER
export function shouldTriggerSkill(streak: number): boolean {
    const milestones = [5, 10, 20, 30, 40, 50];
    return milestones.includes(streak);
}
```

### meteor_strike Skill Definition
```typescript
// BEFORE
animationType: 'sequence',

// AFTER
animationType: 'css',
```

---

## Spec: useBattleSystem.ts

### calculateDamage Shield Mechanism
```typescript
// BEFORE: 只對 Boss 有效
if (!skillTier && final > monster.maxHp * 0.5 && monster.difficulty === 'boss') {
    const capped = Math.floor(monster.maxHp * 0.4);
    shieldAbsorbed = final - capped;
    final = capped;
}

// AFTER: 對所有怪物生效
if (final > monster.maxHp * 0.5) {
    let maxDamagePercent = 0.7; // 普通怪物
    if (monster.difficulty === 'elite') {
        maxDamagePercent = 0.5;
    } else if (monster.difficulty === 'boss') {
        maxDamagePercent = 0.4;
    }
    const capped = Math.floor(monster.maxHp * maxDamagePercent);
    shieldAbsorbed = final - capped;
    final = capped;
}
```

---

## Spec: monstersData.ts

### skeleton_wizard Monster
```typescript
// BEFORE
visualScale: 1.5,

// AFTER
visualScale: 1.8,
```
