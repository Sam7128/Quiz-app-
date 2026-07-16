import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BattleEngineDependencies,
  BattleFailure,
  BattleProgressState,
  BattleState,
  INITIAL_BATTLE_STATE,
  Monster,
  UseBattleSystemReturn,
} from '../types/battleTypes';
import {
  applyBattleAnswer,
  createInitialBattleProgress,
  DEFAULT_BATTLE_ENGINE_DEPENDENCIES,
} from '../services/battle/battleEngine';
import {
  BattlePersistence,
  createBattlePersistence,
} from '../services/battle/battlePersistence';
import { useBattlePresentation } from './useBattlePresentation';

const getMonster = (
  progress: BattleProgressState,
  monsters: readonly Monster[],
): Monster | null => {
  if (!progress.currentMonsterId) return null;
  return monsters.find(monster => monster.id === progress.currentMonsterId) ?? null;
};

const unavailableFailure = (): BattleFailure => ({
  code: 'MONSTER_UNAVAILABLE',
  message: 'No valid monster is available for the current battle.',
  recoverable: true,
});

const toBattleState = (
  progress: BattleProgressState,
  dependencies: BattleEngineDependencies,
  failure?: BattleFailure,
): BattleState => {
  const currentMonster = getMonster(progress, dependencies.registry.monsters);
  const resolvedFailure = failure ?? (!currentMonster
    ? unavailableFailure()
    : undefined);

  return {
    ...INITIAL_BATTLE_STATE,
    streak: progress.streak,
    maxStreak: progress.maxStreak,
    heroHp: progress.heroHp,
    heroMaxHp: progress.heroMaxHp,
    monsterHp: progress.currentMonsterHp,
    monsterMaxHp: progress.currentMonsterMaxHp > 0
      ? progress.currentMonsterMaxHp
      : INITIAL_BATTLE_STATE.monsterMaxHp,
    currentMonster,
    monstersDefeated: progress.monstersDefeated,
    questionsAnswered: progress.questionsAnswered,
    seenMonsters: [...progress.seenMonsters],
    isActive: progress.isActive,
    progress,
    ...(resolvedFailure ? { failure: resolvedFailure } : {}),
  };
};

const isKnownProgress = (
  progress: BattleProgressState,
  monsters: readonly Monster[],
): boolean => (
  (progress.currentMonsterId === null
    || monsters.some(monster => monster.id === progress.currentMonsterId))
  && (!progress.isActive || progress.currentMonsterId !== null)
);

export function useBattleSystem(): UseBattleSystemReturn {
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const dependenciesRef = useRef<BattleEngineDependencies>({
    ...DEFAULT_BATTLE_ENGINE_DEPENDENCIES,
    processedEventIds: processedEventIdsRef.current,
  });
  const persistenceRef = useRef<BattlePersistence | null>(null);
  const progressRef = useRef<BattleProgressState | null>(null);
  const [battleState, setBattleState] = useState<BattleState>(INITIAL_BATTLE_STATE);
  const [isInitialized, setIsInitialized] = useState(false);

  if (persistenceRef.current === null) {
    let storage: Storage | null = null;
    try {
      storage = typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      storage = null;
    }
    persistenceRef.current = createBattlePersistence(storage);
  }

  const dependencies = dependenciesRef.current;
  const persistence = persistenceRef.current;
  const presentation = useBattlePresentation({ enabled: isInitialized });
  const {
    activeEvent: activePresentationEvent,
    enqueueMany,
    completeActiveEvent,
    cancelAll,
  } = presentation;

  useEffect(() => {
    let cancelled = false;
    void persistence.load().then(loaded => {
      if (cancelled) return;
      const usable = loaded && isKnownProgress(loaded, dependencies.registry.monsters)
        ? loaded
        : null;
      progressRef.current = usable;
      setBattleState(usable ? toBattleState(usable, dependencies) : INITIAL_BATTLE_STATE);
      setIsInitialized(true);
    });
    return () => {
      cancelled = true;
    };
  }, [dependencies, persistence]);

  useEffect(() => {
    if (!isInitialized || !battleState.progress) return;
    void persistence.write(battleState.progress);
  }, [battleState.progress, isInitialized, persistence]);

  const commitNewBattle = useCallback((): void => {
    processedEventIdsRef.current.clear();
    const nextProgress = createInitialBattleProgress(dependencies.registry, dependencies);
    progressRef.current = nextProgress;
    setBattleState(toBattleState(nextProgress, dependencies));
  }, [dependencies]);

  const startBattle = useCallback((): void => {
    if (!isInitialized) return;
    cancelAll('manual');
    commitNewBattle();
  }, [cancelAll, commitNewBattle, isInitialized]);

  const endBattle = useCallback((): void => {
    if (!isInitialized) return;
    cancelAll('mode-off');
    processedEventIdsRef.current.clear();
    const current = progressRef.current;
    if (!current) return;
    const nextProgress: BattleProgressState = { ...current, isActive: false };
    progressRef.current = nextProgress;
    setBattleState(toBattleState(nextProgress, dependencies));
  }, [cancelAll, dependencies, isInitialized]);

  const triggerAnswer = useCallback((
    isCorrect: boolean,
    answerEventId?: string,
  ): void => {
    const current = progressRef.current;
    if (!isInitialized || !current?.isActive) return;

    const eventId = answerEventId?.trim() || dependencies.idFactory.create('answer');
    if (processedEventIdsRef.current.has(eventId)) return;

    const result = applyBattleAnswer(
      current,
      {
        eventId,
        correlationId: eventId,
        isCorrect,
        createdAt: dependencies.clock.now(),
      },
      dependencies,
    );
    processedEventIdsRef.current.add(eventId);
    progressRef.current = result.nextState;
    const failure = result.diagnostics.at(-1);
    setBattleState(toBattleState(result.nextState, dependencies, failure));
    enqueueMany(result.presentationEvents);
  }, [dependencies, enqueueMany, isInitialized]);

  const resetForNewChunk = useCallback((): void => {
    if (!isInitialized) return;
    cancelAll('chunk-change');
    commitNewBattle();
  }, [cancelAll, commitNewBattle, isInitialized]);

  return {
    battleState,
    isInitialized,
    triggerAnswer,
    startBattle,
    endBattle,
    resetForNewChunk,
    activePresentationEvent,
    completePresentationEvent: completeActiveEvent,
  };
}
