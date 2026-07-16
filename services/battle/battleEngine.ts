import {
  BattleAnswerEvent,
  BattleClock,
  BattleDamageInput,
  BattleEngineDependencies,
  BattleFailure,
  BattleIdFactory,
  BattlePresentationEvent,
  BattlePresentationEventKind,
  BattlePresentationPayload,
  BattleProgressState,
  BattleRandomSource,
  BattleRegistry,
  BattleTransitionResult,
  DamageResult,
  EncounterSchedule,
  Monster,
  MonsterResolution,
  MotionProfile,
  Skill,
} from '../../types/battleTypes';
import { ALL_MONSTERS } from '../../constants/monstersData';
import { ALL_SKILLS, getSkillTierByStreak, getSkillsByTier, shouldTriggerSkill } from '../../constants/skillsData';

const HERO_MAX_HP = 100;
const DEFAULT_CRIT_CHANCE = 0.15;
const DEFAULT_CRIT_MULTIPLIER = 1.5;

const SKILL_DAMAGE_MULTIPLIER: Readonly<Record<Skill['tier'], number>> = {
  basic: 1.5,
  intermediate: 2,
  advanced: 3,
  ultimate: 4,
  epic: 5,
  legendary: 10,
};

export const BATTLE_MOTION_PROFILES: Readonly<Record<BattlePresentationEventKind, MotionProfile>> = {
  hero_attack: {
    anticipationMs: 120,
    travelMs: 300,
    impactMs: 180,
    settleMs: 220,
    safetyDeadlineMs: 1100,
    reducedMotionMs: 120,
  },
  monster_attack: {
    anticipationMs: 160,
    travelMs: 360,
    impactMs: 180,
    settleMs: 240,
    safetyDeadlineMs: 1200,
    reducedMotionMs: 150,
  },
  skill_cast: {
    anticipationMs: 220,
    travelMs: 520,
    impactMs: 360,
    settleMs: 420,
    safetyDeadlineMs: 1800,
    reducedMotionMs: 180,
  },
  monster_defeat: {
    anticipationMs: 0,
    travelMs: 0,
    impactMs: 220,
    settleMs: 520,
    safetyDeadlineMs: 900,
    reducedMotionMs: 160,
  },
  hero_defeat: {
    anticipationMs: 0,
    travelMs: 0,
    impactMs: 260,
    settleMs: 500,
    safetyDeadlineMs: 1000,
    reducedMotionMs: 180,
  },
  monster_spawn: {
    anticipationMs: 0,
    travelMs: 0,
    impactMs: 220,
    settleMs: 520,
    safetyDeadlineMs: 1000,
    reducedMotionMs: 160,
  },
  boss_entrance: {
    anticipationMs: 180,
    travelMs: 520,
    impactMs: 320,
    settleMs: 620,
    safetyDeadlineMs: 2200,
    reducedMotionMs: 220,
  },
  settle: {
    anticipationMs: 0,
    travelMs: 0,
    impactMs: 0,
    settleMs: 180,
    safetyDeadlineMs: 400,
    reducedMotionMs: 100,
  },
};

export const DEFAULT_BATTLE_REGISTRY: BattleRegistry = {
  monsters: ALL_MONSTERS,
  skills: ALL_SKILLS,
};

const defaultClock: BattleClock = { now: () => Date.now() };
const defaultRng: BattleRandomSource = { next: () => Math.random() };
const defaultIdFactory: BattleIdFactory = {
  create: (prefix: string) => {
    const uuid = typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}-${uuid}`;
  },
};

export const DEFAULT_BATTLE_ENGINE_DEPENDENCIES: BattleEngineDependencies = {
  rng: defaultRng,
  idFactory: defaultIdFactory,
  clock: defaultClock,
  registry: DEFAULT_BATTLE_REGISTRY,
};

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);

const safeInteger = (value: number, fallback = 0): number => {
  if (!isFiniteNumber(value)) return fallback;
  return Math.max(0, Math.floor(value));
};

const safeRandomIndex = (rng: BattleRandomSource, length: number): number => {
  if (length <= 0) return 0;
  const value = rng.next();
  const normalized = isFiniteNumber(value) ? Math.min(Math.max(value, 0), 0.999999) : 0;
  return Math.floor(normalized * length);
};

const isUsableMonster = (monster: Monster): boolean => (
  typeof monster.id === 'string' && monster.id.length > 0
  && typeof monster.name === 'string'
  && typeof monster.difficulty === 'string'
  && isFiniteNumber(monster.maxHp) && monster.maxHp > 0
  && isFiniteNumber(monster.attackPower) && monster.attackPower >= 0
);

const getUsableMonsters = (registry: BattleRegistry): Monster[] => (
  registry.monsters.filter(isUsableMonster)
);

const createSchedule = (): EncounterSchedule => ({
  nextEncounterKind: null,
  lastEliteMilestone: 0,
  lastBossMilestone: 0,
});

const isValidSchedule = (schedule: EncounterSchedule): boolean => (
  (schedule.nextEncounterKind === null
    || schedule.nextEncounterKind === 'normal'
    || schedule.nextEncounterKind === 'elite'
    || schedule.nextEncounterKind === 'boss')
  && Number.isInteger(schedule.lastEliteMilestone) && schedule.lastEliteMilestone >= 0
  && Number.isInteger(schedule.lastBossMilestone) && schedule.lastBossMilestone >= 0
);

const isValidProgress = (state: BattleProgressState): boolean => (
  state.schemaVersion === 2
  && typeof state.battleId === 'string' && state.battleId.length > 0
  && typeof state.sessionId === 'string' && state.sessionId.length > 0
  && isFiniteNumber(state.heroHp) && state.heroHp >= 0 && state.heroHp <= state.heroMaxHp
  && isFiniteNumber(state.heroMaxHp) && state.heroMaxHp > 0
  && isFiniteNumber(state.shield) && state.shield >= 0
  && (state.currentMonsterId === null || typeof state.currentMonsterId === 'string')
  && isFiniteNumber(state.currentMonsterHp) && state.currentMonsterHp >= 0
  && isFiniteNumber(state.currentMonsterMaxHp) && state.currentMonsterMaxHp >= 0
  && isFiniteNumber(state.streak) && state.streak >= 0
  && isFiniteNumber(state.maxStreak) && state.maxStreak >= 0
  && isFiniteNumber(state.questionsAnswered) && state.questionsAnswered >= 0
  && isFiniteNumber(state.monstersDefeated) && state.monstersDefeated >= 0
  && Array.isArray(state.seenMonsters) && state.seenMonsters.every(id => typeof id === 'string')
  && isValidSchedule(state.encounterSchedule)
  && typeof state.isActive === 'boolean'
);

const createUnavailableFailure = (message: string): MonsterResolution['failure'] => ({
  code: 'MONSTER_UNAVAILABLE',
  message,
  recoverable: true,
});

/**
 * 同一個 resolver 處理所有 encounter。只保存有效 ID，難度池耗盡時重置該池 rotation。
 */
export function resolveNextMonster(
  state: BattleProgressState,
  registry: BattleRegistry,
  rng: BattleRandomSource,
): MonsterResolution {
  const usableMonsters = getUsableMonsters(registry);
  const requestedDifficulty = state.encounterSchedule.nextEncounterKind ?? 'normal';
  const requested = usableMonsters.filter(monster => monster.difficulty === requestedDifficulty);
  const normalFallback = usableMonsters.filter(monster => monster.difficulty === 'normal');
  const candidates = requested.length > 0 ? requested : normalFallback;

  if (candidates.length === 0) {
    return {
      monster: null,
      seenMonsters: [],
      difficulty: null,
      failure: createUnavailableFailure('No valid monster is available for requested or normal difficulty.'),
    };
  }

  const validIds = new Set(usableMonsters.map(monster => monster.id));
  const candidateIds = new Set(candidates.map(monster => monster.id));
  let seenMonsters = state.seenMonsters.filter(id => validIds.has(id));
  let available = candidates.filter(monster => !seenMonsters.includes(monster.id));

  if (available.length === 0) {
    seenMonsters = seenMonsters.filter(id => !candidateIds.has(id));
    available = candidates;
  }

  const selected = available[safeRandomIndex(rng, available.length)];
  if (!selected) {
    return {
      monster: null,
      seenMonsters,
      difficulty: null,
      failure: createUnavailableFailure('Monster resolver produced no valid selection.'),
    };
  }

  return {
    monster: selected,
    seenMonsters: [...seenMonsters, selected.id],
    difficulty: selected.difficulty,
  };
}

/** 首次抵達里程碑才排程；Boss 永遠覆蓋未生成 Elite。 */
export function scheduleEncounter(
  state: BattleProgressState,
  questionsAnswered: number,
): EncounterSchedule {
  const questions = safeInteger(questionsAnswered, state.questionsAnswered);
  const schedule = isValidSchedule(state.encounterSchedule)
    ? { ...state.encounterSchedule }
    : createSchedule();

  if (questions > 0 && questions % 10 === 0 && questions > schedule.lastBossMilestone) {
    schedule.nextEncounterKind = 'boss';
    schedule.lastBossMilestone = questions;
    return schedule;
  }

  if (
    questions > 0
    && questions % 5 === 0
    && questions % 10 !== 0
    && questions > schedule.lastEliteMilestone
  ) {
    schedule.lastEliteMilestone = questions;
    if (schedule.nextEncounterKind !== 'boss') {
      schedule.nextEncounterKind = 'elite';
    }
  }

  return schedule;
}

/** registry-driven damage。所有輸出有限、非負、整數。 */
export function calculateBattleDamage(
  input: BattleDamageInput,
  rng: BattleRandomSource,
): DamageResult {
  const maxHp = isFiniteNumber(input.monster.maxHp) && input.monster.maxHp > 0
    ? input.monster.maxHp
    : 1;
  const cappedStreak = Math.min(safeInteger(input.streak), 50);
  const baseDamage = Math.max(0, Math.floor(maxHp * 0.15) + cappedStreak * 2);
  const skillMultiplier = input.skill ? SKILL_DAMAGE_MULTIPLIER[input.skill.tier] : 1;
  const critChance = input.critChance === undefined
    ? DEFAULT_CRIT_CHANCE
    : Math.min(Math.max(input.critChance, 0), 1);
  const critMultiplier = input.critMultiplier === undefined || input.critMultiplier < 1
    ? DEFAULT_CRIT_MULTIPLIER
    : input.critMultiplier;
  const critRoll = rng.next();
  const isCrit = isFiniteNumber(critRoll) && critRoll < critChance;
  const appliedCritMultiplier = isCrit ? critMultiplier : 1;
  const rawDamage = Math.floor(baseDamage * skillMultiplier * appliedCritMultiplier);

  const maxDamagePercent = input.monster.difficulty === 'boss'
    ? 0.4
    : input.monster.difficulty === 'elite'
      ? 0.5
      : 0.7;
  const damageCap = Math.max(0, Math.floor(maxHp * maxDamagePercent));
  const finalDamage = Math.min(Math.max(rawDamage, 0), damageCap);

  return {
    baseDamage,
    critResult: {
      isCrit,
      multiplier: appliedCritMultiplier,
    },
    finalDamage,
  };
}

const createProgress = (
  registry: BattleRegistry,
  runtime: Pick<BattleEngineDependencies, 'rng' | 'idFactory' | 'clock'>,
): BattleProgressState => {
  const emptyState: BattleProgressState = {
    schemaVersion: 2,
    battleId: runtime.idFactory.create('battle'),
    sessionId: runtime.idFactory.create('session'),
    heroHp: HERO_MAX_HP,
    heroMaxHp: HERO_MAX_HP,
    shield: 0,
    currentMonsterId: null,
    currentMonsterHp: 0,
    currentMonsterMaxHp: 0,
    streak: 0,
    maxStreak: 0,
    questionsAnswered: 0,
    monstersDefeated: 0,
    seenMonsters: [],
    encounterSchedule: createSchedule(),
    isActive: true,
  };
  const resolved = resolveNextMonster(emptyState, registry, runtime.rng);
  if (!resolved.monster) {
    return { ...emptyState, isActive: false };
  }
  return {
    ...emptyState,
    currentMonsterId: resolved.monster.id,
    currentMonsterHp: resolved.monster.maxHp,
    currentMonsterMaxHp: resolved.monster.maxHp,
    seenMonsters: resolved.seenMonsters,
  };
};

export function createInitialBattleProgress(
  registry: BattleRegistry = DEFAULT_BATTLE_REGISTRY,
  runtime: Pick<BattleEngineDependencies, 'rng' | 'idFactory' | 'clock'> = DEFAULT_BATTLE_ENGINE_DEPENDENCIES,
): BattleProgressState {
  return createProgress(registry, runtime);
}

const createEvent = (
  dependencies: BattleEngineDependencies,
  answerEvent: BattleAnswerEvent,
  sequence: number,
  kind: BattlePresentationEventKind,
  actorId: string,
  targetId: string | null,
  payload: BattlePresentationPayload,
): BattlePresentationEvent => ({
  eventId: dependencies.idFactory.create(`presentation-${answerEvent.eventId}`),
  correlationId: answerEvent.correlationId,
  sequence,
  kind,
  actorId,
  targetId,
  phase: kind === 'monster_spawn'
    ? 'spawn'
    : kind === 'boss_entrance'
      ? 'entrance'
      : 'anticipation',
  durationProfile: BATTLE_MOTION_PROFILES[kind],
  payload,
});

const emptyPayload = (): BattlePresentationPayload => ({
  damage: 0,
  baseDamage: 0,
  isCrit: false,
  multiplier: 1,
  shieldAbsorbed: 0,
});

const chooseSkill = (
  streak: number,
  registry: BattleRegistry,
  rng: BattleRandomSource,
): Skill | null => {
  if (!shouldTriggerSkill(streak)) return null;
  const tier = getSkillTierByStreak(streak);
  if (!tier) return null;
  const skills = registry.skills.filter(skill => skill.tier === tier);
  if (skills.length === 0) return null;
  return skills[safeRandomIndex(rng, skills.length)] ?? getSkillsByTier(tier)[0] ?? null;
};

const normalizeProgress = (
  state: BattleProgressState,
  registry: BattleRegistry,
  runtime: Pick<BattleEngineDependencies, 'rng' | 'idFactory' | 'clock'>,
): { state: BattleProgressState; wasReset: boolean } => {
  if (!isValidProgress(state)) {
    return { state: createProgress(registry, runtime), wasReset: true };
  }

  const usableIds = new Set(getUsableMonsters(registry).map(monster => monster.id));
  if (state.currentMonsterId !== null && !usableIds.has(state.currentMonsterId)) {
    const resolved = resolveNextMonster({ ...state, currentMonsterId: null }, registry, runtime.rng);
    if (!resolved.monster) {
      return { state: { ...state, currentMonsterId: null, currentMonsterHp: 0, currentMonsterMaxHp: 0, isActive: false }, wasReset: false };
    }
    return {
      state: {
        ...state,
        currentMonsterId: resolved.monster.id,
        currentMonsterHp: resolved.monster.maxHp,
        currentMonsterMaxHp: resolved.monster.maxHp,
        seenMonsters: resolved.seenMonsters,
      },
      wasReset: false,
    };
  }
  return { state: { ...state, seenMonsters: state.seenMonsters.filter(id => usableIds.has(id)) }, wasReset: false };
};

const maybeSpawnPendingMonster = (
  state: BattleProgressState,
  registry: BattleRegistry,
  dependencies: BattleEngineDependencies,
  answerEvent: BattleAnswerEvent,
  sequenceStart: number,
): { state: BattleProgressState; events: BattlePresentationEvent[]; nextSequence: number; failure?: BattleFailure } => {
  if (state.currentMonsterId !== null && state.currentMonsterHp > 0) {
    return { state, events: [], nextSequence: sequenceStart };
  }

  const resolution = resolveNextMonster(state, registry, dependencies.rng);
  if (!resolution.monster) {
    return {
      state: { ...state, currentMonsterId: null, currentMonsterHp: 0, currentMonsterMaxHp: 0, isActive: false },
      events: [],
      nextSequence: sequenceStart,
      failure: resolution.failure,
    };
  }

  const nextState: BattleProgressState = {
    ...state,
    currentMonsterId: resolution.monster.id,
    currentMonsterHp: resolution.monster.maxHp,
    currentMonsterMaxHp: resolution.monster.maxHp,
    seenMonsters: resolution.seenMonsters,
    encounterSchedule: {
      ...state.encounterSchedule,
      nextEncounterKind: null,
    },
  };
  const isBoss = resolution.monster.difficulty === 'boss';
  const spawnKind: BattlePresentationEventKind = isBoss ? 'boss_entrance' : 'monster_spawn';
  const payload = {
    ...emptyPayload(),
    monsterId: resolution.monster.id,
    monsterDifficulty: resolution.monster.difficulty,
  };
  return {
    state: nextState,
    events: [createEvent(dependencies, answerEvent, sequenceStart, spawnKind, 'monster', resolution.monster.id, payload)],
    nextSequence: sequenceStart + 1,
  };
};

/**
 * 單一純轉移。副作用只由 caller adapter 負責；processedEventIds 只存在 Hook memory。
 */
export function applyBattleAnswer(
  state: BattleProgressState,
  answerEvent: BattleAnswerEvent,
  dependencies: BattleEngineDependencies = DEFAULT_BATTLE_ENGINE_DEPENDENCIES,
): BattleTransitionResult {
  if (
    !answerEvent.eventId
    || !answerEvent.correlationId
    || !Number.isFinite(answerEvent.createdAt)
  ) {
    return {
      nextState: state,
      presentationEvents: [],
      diagnostics: [{ code: 'INVALID_ANSWER', message: 'Answer event is malformed.', recoverable: true }],
    };
  }

  if (dependencies.processedEventIds?.has(answerEvent.eventId)) {
    return { nextState: state, presentationEvents: [], diagnostics: [] };
  }

  const normalized = normalizeProgress(state, dependencies.registry, dependencies);
  const diagnostics = normalized.wasReset
    ? [{ code: 'INVALID_STATE' as const, message: 'Invalid battle state was reset to a safe initial state.', recoverable: true as const }]
    : [];
  const spawned = maybeSpawnPendingMonster(
    normalized.state,
    dependencies.registry,
    dependencies,
    answerEvent,
    0,
  );
  const currentMonster = spawned.state.currentMonsterId === null
    ? null
    : dependencies.registry.monsters.find(monster => monster.id === spawned.state.currentMonsterId) ?? null;

  if (!currentMonster) {
    return {
      nextState: { ...spawned.state, isActive: false },
      presentationEvents: spawned.events,
      diagnostics: spawned.failure ? [...diagnostics, spawned.failure] : diagnostics,
    };
  }

  const questionsAnswered = safeInteger(spawned.state.questionsAnswered) + 1;
  const sequenceStart = spawned.nextSequence;
  const events = [...spawned.events];
  let transitionFailure = spawned.failure;
  let nextState = { ...spawned.state, questionsAnswered };

  if (answerEvent.isCorrect) {
    const streak = safeInteger(spawned.state.streak) + 1;
    const skill = chooseSkill(streak, dependencies.registry, dependencies.rng);
    const damage = calculateBattleDamage(
      {
        monster: currentMonster,
        streak,
        skill,
        critChance: dependencies.critChance,
        critMultiplier: dependencies.critMultiplier,
      },
      dependencies.rng,
    );
    const monsterHp = Math.max(0, Math.min(currentMonster.maxHp, spawned.state.currentMonsterHp - damage.finalDamage));
    const schedule = scheduleEncounter(spawned.state, questionsAnswered);
    nextState = {
      ...spawned.state,
      currentMonsterHp: monsterHp,
      currentMonsterMaxHp: currentMonster.maxHp,
      streak,
      maxStreak: Math.max(safeInteger(spawned.state.maxStreak), streak),
      questionsAnswered,
      monstersDefeated: monsterHp === 0 ? safeInteger(spawned.state.monstersDefeated) + 1 : spawned.state.monstersDefeated,
      encounterSchedule: schedule,
      isActive: true,
    };
    const payload: BattlePresentationPayload = {
      damage: damage.finalDamage,
      baseDamage: damage.baseDamage,
      isCrit: damage.critResult.isCrit,
      multiplier: damage.critResult.multiplier,
      shieldAbsorbed: 0,
      ...(skill ? { element: skill.element, skillId: skill.id, skillName: skill.name } : {}),
      monsterId: currentMonster.id,
      monsterDifficulty: currentMonster.difficulty,
    };
    const attackKind: BattlePresentationEventKind = skill ? 'skill_cast' : 'hero_attack';
    events.push(createEvent(dependencies, answerEvent, sequenceStart, attackKind, 'hero', currentMonster.id, payload));
    if (monsterHp === 0) {
      events.push(createEvent(dependencies, answerEvent, sequenceStart + 1, 'monster_defeat', currentMonster.id, currentMonster.id, payload));
      const nextSpawn = maybeSpawnPendingMonster(
        nextState,
        dependencies.registry,
        dependencies,
        answerEvent,
        sequenceStart + 2,
      );
      nextState = nextSpawn.state;
      events.push(...nextSpawn.events);
      transitionFailure = nextSpawn.failure ?? transitionFailure;
    }
  } else {
    const rawDamage = Math.max(0, Math.floor(currentMonster.attackPower));
    const shieldAbsorbed = Math.min(spawned.state.shield, rawDamage);
    const finalDamage = Math.max(0, rawDamage - shieldAbsorbed);
    const heroHp = Math.max(0, Math.min(spawned.state.heroMaxHp, spawned.state.heroHp - finalDamage));
    const schedule = scheduleEncounter(spawned.state, questionsAnswered);
    nextState = {
      ...spawned.state,
      heroHp,
      shield: Math.max(0, spawned.state.shield - shieldAbsorbed),
      streak: 0,
      questionsAnswered,
      encounterSchedule: schedule,
      isActive: heroHp > 0,
    };
    const payload: BattlePresentationPayload = {
      damage: finalDamage,
      baseDamage: rawDamage,
      isCrit: false,
      multiplier: 1,
      shieldAbsorbed,
      monsterId: currentMonster.id,
      monsterDifficulty: currentMonster.difficulty,
    };
    events.push(createEvent(dependencies, answerEvent, sequenceStart, 'monster_attack', currentMonster.id, 'hero', payload));
    if (heroHp === 0) {
      events.push(createEvent(dependencies, answerEvent, sequenceStart + 1, 'hero_defeat', currentMonster.id, 'hero', payload));
    }
  }

  return {
    nextState,
    presentationEvents: events,
    diagnostics: transitionFailure ? [...diagnostics, transitionFailure] : diagnostics,
  };
}
