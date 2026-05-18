# Battle System State Diagram

此文檔描述 `useBattleSystem` 的核心狀態流轉邏輯。

```mermaid
stateDiagram-v2
    state "Idle (isActive=false)" as Idle
    state "In Battle (isActive=true)" as InBattle
    
    [*] --> Idle: Init
    
    Idle --> InBattle: startBattle()
    
    state InBattle {
        state "Waiting for Input" as Waiting
        state "Processing Answer" as Processing
        state "Skill Animation" as SkillAnim
        state "Monster Turn" as MonsterTurn
        state "Victory/Defeat" as EndState
        
        [*] --> Waiting
        
        Waiting --> Processing: triggerAnswer()
        
        Processing --> SkillAnim: Correct + Skill Triggered (streak 5/10/20...)
        Processing --> Waiting: Correct + No Skill (Damage Calc)
        Processing --> MonsterTurn: Wrong Answer (Streak Reset)

        SkillAnim --> Waiting: Animation Complete (onAnimationComplete)
        
        MonsterTurn --> Waiting: Hero Survives
        MonsterTurn --> EndState: Hero HP <= 0
        
        Processing --> EndState: Monster HP <= 0 (Victory)
        
        EndState --> Waiting: Spawn New Monster (after delay)
        EndState --> Idle: Hero Defeated (restart delay)
    }
    
    InBattle --> Idle: endBattle()
```

## Key State Transitions

| Trigger | From | To | Side Effects |
|---------|------|----|--------------|
| `startBattle` | Idle | InBattle | Reset HP, Spawn Monster, Streak=0 |
| `triggerAnswer(correct)` | Waiting | Processing | Streak++, Damage Calc |
| `triggerAnswer(wrong)` | Waiting | MonsterTurn | Streak=0, Hero Damage |
| `shouldTriggerSkill` | Processing | SkillAnim | Set `pendingSkill`, `currentAnimation` |
| `monsterHp <= 0` | Processing | EndState | `monstersDefeated`++, Spawn Timer |
