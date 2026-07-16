import { describe, expect, it } from 'vitest';
import {
  applyBattleAnswer,
  calculateBattleDamage,
  createInitialBattleProgress,
  resolveNextMonster,
  scheduleEncounter,
} from '../../services/battle/battleEngine';
import { getSkillTierByStreak, shouldTriggerSkill } from '../../constants/skillsData';
import { BattleProgressState, BattleRegistry, Monster } from '../../types/battleTypes';
import {
  createSequenceRng,
  createTestDependencies,
} from './battleTestUtils';

const testMonster = (overrides: Partial<Monster> = {}): Monster => ({
  id: 'test_monster',
  name: '測試怪物',
  difficulty: 'normal',
  maxHp: 10000,
  attackPower: 17,
  attackDialogues: [],
  hurtDialogues: [],
  defeatDialogues: [],
  ...overrides,
});

const registry: BattleRegistry = {
  monsters: [
    testMonster(),
    testMonster({ id: 'test_elite', difficulty: 'elite', maxHp: 1000 }),
    testMonster({ id: 'test_boss', difficulty: 'boss', maxHp: 2000 }),
  ],
  skills: [],
};

const answer = (id: string, isCorrect = true) => ({
  eventId: id,
  correlationId: `correlation-${id}`,
  isCorrect,
  createdAt: 1,
});

describe('battleEngine', () => {
  it('creates active progress with valid normal monster', () => {
    const dependencies = createTestDependencies(registry, createSequenceRng([0]));
    const state = createInitialBattleProgress(registry, dependencies);

    expect(state.schemaVersion).toBe(2);
    expect(state.currentMonsterId).toBe('test_monster');
    expect(state.currentMonsterHp).toBe(10000);
    expect(state.seenMonsters).toEqual(['test_monster']);
  });

  it('returns typed unavailable result for empty registry', () => {
    const dependencies = createTestDependencies({ monsters: [], skills: [] });
    const state = createInitialBattleProgress(dependencies.registry, dependencies);
    const resolved = resolveNextMonster(state, dependencies.registry, dependencies.rng);

    expect(state.isActive).toBe(false);
    expect(resolved.monster).toBeNull();
    expect(resolved.failure?.code).toBe('MONSTER_UNAVAILABLE');
  });

  it('uses deterministic crit and damage cap', () => {
    const damage = calculateBattleDamage(
      { monster: testMonster({ maxHp: 100, difficulty: 'boss' }), streak: 50 },
      createSequenceRng([0]),
    );

    expect(damage.critResult.isCrit).toBe(true);
    expect(damage.critResult.multiplier).toBe(1.5);
    expect(damage.finalDamage).toBeLessThanOrEqual(40);
    expect(Number.isFinite(damage.finalDamage)).toBe(true);
  });

  it('schedules elite at 5 and boss at 10, with boss superseding elite', () => {
    const dependencies = createTestDependencies(registry);
    const initial = createInitialBattleProgress(registry, dependencies);
    const elite = scheduleEncounter(initial, 5);
    expect(elite.nextEncounterKind).toBe('elite');
    expect(elite.lastEliteMilestone).toBe(5);

    const boss = scheduleEncounter({ ...initial, encounterSchedule: elite }, 10);
    expect(boss.nextEncounterKind).toBe('boss');
    expect(boss.lastBossMilestone).toBe(10);

    const unchanged = scheduleEncounter({ ...initial, encounterSchedule: boss }, 10);
    expect(unchanged).toEqual(boss);
  });

  it('does not trigger skills at non-milestones and keeps correlation IDs', () => {
    const skillRegistry: BattleRegistry = {
      monsters: [testMonster()],
      skills: [{
        id: 'test_skill',
        name: '測試技能',
        tier: 'basic',
        element: 'fire',
        description: 'test',
      }],
    };
    const dependencies = createTestDependencies(skillRegistry, createSequenceRng([0, 0, ...Array(20).fill(0)]));
    let state = createInitialBattleProgress(skillRegistry, dependencies);
    for (let index = 1; index <= 6; index += 1) {
      const result = applyBattleAnswer(state, answer(`event-${index}`), dependencies);
      state = result.nextState;
      if (index === 5) {
        expect(result.presentationEvents.some(event => event.kind === 'skill_cast')).toBe(true);
      }
      if (index === 6) {
        expect(result.presentationEvents.some(event => event.kind === 'skill_cast')).toBe(false);
      }
      expect(result.presentationEvents.every(event => event.correlationId === `correlation-event-${index}`)).toBe(true);
    }
  });

  it('locks skill milestones from streak 1 through 60', () => {
    const milestones = new Set([5, 10, 20, 30, 40, 50, 60]);
    for (let streak = 1; streak <= 60; streak += 1) {
      expect(shouldTriggerSkill(streak)).toBe(milestones.has(streak));
    }
    expect(getSkillTierByStreak(5)).toBe('basic');
    expect(getSkillTierByStreak(10)).toBe('intermediate');
    expect(getSkillTierByStreak(20)).toBe('advanced');
    expect(getSkillTierByStreak(30)).toBe('ultimate');
    expect(getSkillTierByStreak(40)).toBe('epic');
    expect(getSkillTierByStreak(50)).toBe('legendary');
    expect(getSkillTierByStreak(60)).toBe('ultimate');
  });

  it('keeps one living monster while q5/q10/q15 schedule and consumes boss once', () => {
    const stableRegistry: BattleRegistry = {
      monsters: [
        testMonster({ maxHp: 1000, attackPower: 0 }),
        testMonster({ id: 'stable_elite', difficulty: 'elite', attackPower: 0 }),
        testMonster({ id: 'stable_boss', difficulty: 'boss', attackPower: 0 }),
      ],
      skills: [],
    };
    const dependencies = createTestDependencies(stableRegistry);
    let state = createInitialBattleProgress(stableRegistry, dependencies);
    const firstMonsterId = state.currentMonsterId;

    for (let question = 1; question <= 15; question += 1) {
      state = applyBattleAnswer(state, answer(`wrong-${question}`, false), dependencies).nextState;
      expect(state.currentMonsterId).toBe(firstMonsterId);
      if (question === 5) expect(state.encounterSchedule.nextEncounterKind).toBe('elite');
      if (question === 10) expect(state.encounterSchedule.nextEncounterKind).toBe('boss');
    }

    const pendingBoss = {
      ...state,
      currentMonsterHp: 0,
      encounterSchedule: {
        ...state.encounterSchedule,
        nextEncounterKind: 'boss' as const,
      },
    };
    const spawned = applyBattleAnswer(pendingBoss, answer('spawn-boss', false), dependencies);
    expect(spawned.presentationEvents[0]?.kind).toBe('boss_entrance');
    expect(spawned.nextState.currentMonsterId).toBe('stable_boss');
    expect(spawned.nextState.encounterSchedule.nextEncounterKind).toBeNull();
  });

  it('queues defeat before the next spawn and never exposes the new monster early', () => {
    const dependencies = createTestDependencies(registry, createSequenceRng(Array(20).fill(0)));
    const initial = createInitialBattleProgress(registry, dependencies);
    const pendingBoss: BattleProgressState = {
      ...initial,
      currentMonsterHp: 1,
      encounterSchedule: {
        ...initial.encounterSchedule,
        nextEncounterKind: 'boss',
      },
    };

    const result = applyBattleAnswer(pendingBoss, answer('defeat-and-spawn'), dependencies);

    expect(result.presentationEvents.map(item => item.kind)).toEqual([
      'hero_attack',
      'monster_defeat',
      'boss_entrance',
    ]);
    expect(result.presentationEvents[0]?.payload.monsterId).toBe(initial.currentMonsterId);
    expect(result.presentationEvents[1]?.payload.monsterId).toBe(initial.currentMonsterId);
    expect(result.presentationEvents[2]?.payload.monsterId).toBe('test_boss');
    expect(result.nextState.currentMonsterId).toBe('test_boss');
    expect(result.nextState.encounterSchedule.nextEncounterKind).toBeNull();
  });

  it('uses monster attackPower and shield before hero HP', () => {
    const dependencies = createTestDependencies(registry);
    const initial: BattleProgressState = {
      ...createInitialBattleProgress(registry, dependencies),
      shield: 5,
    };
    const result = applyBattleAnswer(initial, answer('wrong', false), dependencies);

    expect(result.nextState.heroHp).toBe(88);
    expect(result.nextState.shield).toBe(0);
    expect(result.presentationEvents[0]?.payload.baseDamage).toBe(17);
  });

  it('ignores duplicate IDs supplied by hook memory without new events', () => {
    const dependencies = createTestDependencies(registry);
    const state = createInitialBattleProgress(registry, dependencies);
    const duplicateDependencies = {
      ...dependencies,
      processedEventIds: new Set(['duplicate']),
    };
    const result = applyBattleAnswer(state, answer('duplicate'), duplicateDependencies);

    expect(result.nextState).toBe(state);
    expect(result.presentationEvents).toEqual([]);
  });

  it('supports rapid latest-state transitions without stale closure math', () => {
    const dependencies = createTestDependencies(registry, createSequenceRng(Array(50).fill(0)));
    let state = createInitialBattleProgress(registry, dependencies);
    const first = applyBattleAnswer(state, answer('first'), dependencies);
    state = first.nextState;
    const second = applyBattleAnswer(state, answer('second'), dependencies);

    expect(second.nextState.questionsAnswered).toBe(2);
    expect(second.nextState.streak).toBe(2);
    expect(second.nextState.currentMonsterHp).toBeLessThan(first.nextState.currentMonsterHp);
  });
});
