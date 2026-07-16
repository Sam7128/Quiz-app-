import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  BattlePresentationEvent,
  BattlePresentationPhase,
  PresentationCompletionCause,
} from '../types/battleTypes';

type PresentationCancelReason = 'hidden' | 'unmount' | 'mode-off' | 'chunk-change' | 'manual';

export interface BattlePresentationState {
  activeEvent: BattlePresentationEvent | null;
  queue: BattlePresentationEvent[];
  phase: BattlePresentationPhase;
  completedEventIds: string[];
  lastCompletion: { eventId: string; cause: PresentationCompletionCause } | null;
  cancelReason: PresentationCancelReason | null;
}

export type BattlePresentationAction =
  | { type: 'enqueue'; events: BattlePresentationEvent[] }
  | { type: 'advance'; eventId: string; phase: BattlePresentationPhase }
  | { type: 'complete'; eventId: string; cause: PresentationCompletionCause }
  | { type: 'cancel'; reason: PresentationCancelReason };

export interface UseBattlePresentationOptions {
  enabled?: boolean;
  reducedMotion?: boolean;
  onSettled?: () => void;
  onEventComplete?: (event: BattlePresentationEvent, cause: PresentationCompletionCause) => void;
  onCancelled?: (reason: PresentationCancelReason) => void;
}

export interface UseBattlePresentationReturn {
  state: BattlePresentationState;
  activeEvent: BattlePresentationEvent | null;
  phase: BattlePresentationPhase;
  queue: BattlePresentationEvent[];
  enqueue: (event: BattlePresentationEvent) => void;
  enqueueMany: (events: BattlePresentationEvent[]) => void;
  completeActiveEvent: (eventId: string, cause: PresentationCompletionCause) => boolean;
  cancelAll: (reason: PresentationCancelReason) => void;
}

export const INITIAL_BATTLE_PRESENTATION_STATE: BattlePresentationState = {
  activeEvent: null,
  queue: [],
  phase: 'idle',
  completedEventIds: [],
  lastCompletion: null,
  cancelReason: null,
};

const getPhases = (event: BattlePresentationEvent): BattlePresentationPhase[] => {
  switch (event.kind) {
    case 'hero_attack':
    case 'monster_attack':
    case 'skill_cast':
      return ['anticipation', 'travel', 'impact', 'hurt', 'settle'];
    case 'monster_defeat':
    case 'hero_defeat':
      return ['impact', 'defeat', 'settle'];
    case 'boss_entrance':
      return ['entrance', 'settle'];
    case 'monster_spawn':
      return ['spawn', 'settle'];
    case 'settle':
      return ['settle'];
  }
};

const activateNext = (
  queue: BattlePresentationEvent[],
): Pick<BattlePresentationState, 'activeEvent' | 'queue' | 'phase'> => {
  const [next, ...rest] = queue;
  if (!next) return { activeEvent: null, queue: rest, phase: 'idle' };
  const phase = getPhases(next)[0] ?? 'settle';
  return {
    activeEvent: { ...next, phase },
    queue: rest,
    phase,
  };
};

const getPhaseDuration = (
  event: BattlePresentationEvent,
  phase: BattlePresentationPhase,
  phaseIndex: number,
  phases: readonly BattlePresentationPhase[],
  reducedMotion: boolean,
): number => {
  if (reducedMotion) {
    const base = Math.floor(event.durationProfile.reducedMotionMs / phases.length);
    const remainder = event.durationProfile.reducedMotionMs % phases.length;
    return Math.max(1, base + (phaseIndex < remainder ? 1 : 0));
  }
  if (phase === 'anticipation') return Math.max(1, event.durationProfile.anticipationMs);
  if (phase === 'travel') return Math.max(1, event.durationProfile.travelMs);
  if (phase === 'impact') return Math.max(1, event.durationProfile.impactMs);
  const terminalCount = phases.filter(item => (
    item !== 'anticipation' && item !== 'travel' && item !== 'impact'
  )).length;
  return Math.max(1, Math.floor(event.durationProfile.settleMs / Math.max(1, terminalCount)));
};

export function battlePresentationReducer(
  state: BattlePresentationState,
  action: BattlePresentationAction,
): BattlePresentationState {
  switch (action.type) {
    case 'enqueue': {
      const existingIds = new Set([
        ...state.completedEventIds,
        ...(state.activeEvent ? [state.activeEvent.eventId] : []),
        ...state.queue.map(event => event.eventId),
      ]);
      const freshEvents = [...action.events]
        .sort((left, right) => left.sequence - right.sequence)
        .filter(event => {
          if (existingIds.has(event.eventId)) return false;
          existingIds.add(event.eventId);
          return true;
        });
      if (freshEvents.length === 0) return state;
      const pending = state.activeEvent ? [...state.queue, ...freshEvents] : freshEvents;
      const activated = state.activeEvent
        ? { activeEvent: state.activeEvent, queue: pending, phase: state.phase }
        : activateNext(pending);
      return { ...state, ...activated, cancelReason: null };
    }
    case 'advance':
      if (!state.activeEvent || state.activeEvent.eventId !== action.eventId) return state;
      return {
        ...state,
        activeEvent: { ...state.activeEvent, phase: action.phase },
        phase: action.phase,
      };
    case 'complete': {
      if (!state.activeEvent || state.activeEvent.eventId !== action.eventId) return state;
      const next = activateNext(state.queue);
      return {
        ...state,
        ...next,
        completedEventIds: [...state.completedEventIds, action.eventId].slice(-100),
        lastCompletion: { eventId: action.eventId, cause: action.cause },
      };
    }
    case 'cancel':
      return {
        ...state,
        activeEvent: null,
        queue: [],
        phase: 'settle',
        completedEventIds: [],
        lastCompletion: null,
        cancelReason: action.reason,
      };
  }
}

export function useBattlePresentation(
  options: UseBattlePresentationOptions = {},
): UseBattlePresentationReturn {
  const {
    enabled = true,
    reducedMotion = false,
    onSettled,
    onEventComplete,
    onCancelled,
  } = options;
  const [state, dispatch] = useReducer(
    battlePresentationReducer,
    INITIAL_BATTLE_PRESENTATION_STATE,
  );
  const stateRef = useRef(state);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef<Set<string>>(new Set());
  stateRef.current = state;

  const clearPhaseTimer = useCallback(() => {
    if (!phaseTimerRef.current) return;
    clearTimeout(phaseTimerRef.current);
    phaseTimerRef.current = null;
  }, []);

  const clearSafetyTimer = useCallback(() => {
    if (!safetyTimerRef.current) return;
    clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = null;
  }, []);

  const completeActiveEvent = useCallback((
    eventId: string,
    cause: PresentationCompletionCause,
  ): boolean => {
    const active = stateRef.current.activeEvent;
    if (!active || active.eventId !== eventId || completedRef.current.has(eventId)) return false;
    completedRef.current.add(eventId);
    clearPhaseTimer();
    clearSafetyTimer();
    dispatch({ type: 'complete', eventId, cause });
    onEventComplete?.(active, cause);
    if (stateRef.current.queue.length === 0) onSettled?.();
    return true;
  }, [clearPhaseTimer, clearSafetyTimer, onEventComplete, onSettled]);

  const enqueueMany = useCallback((events: BattlePresentationEvent[]) => {
    if (!enabled || events.length === 0) return;
    dispatch({ type: 'enqueue', events });
  }, [enabled]);

  const enqueue = useCallback((event: BattlePresentationEvent) => {
    enqueueMany([event]);
  }, [enqueueMany]);

  const cancelAll = useCallback((reason: PresentationCancelReason) => {
    clearPhaseTimer();
    clearSafetyTimer();
    completedRef.current.clear();
    dispatch({ type: 'cancel', reason });
    onCancelled?.(reason);
    onSettled?.();
  }, [clearPhaseTimer, clearSafetyTimer, onCancelled, onSettled]);

  const activeEventId = state.activeEvent?.eventId ?? null;

  useEffect(() => {
    clearSafetyTimer();
    const active = stateRef.current.activeEvent;
    if (!enabled || !active || active.eventId !== activeEventId) return undefined;
    const deadline = reducedMotion
      ? Math.max(active.durationProfile.reducedMotionMs + 50, active.durationProfile.reducedMotionMs * 2)
      : active.durationProfile.safetyDeadlineMs;
    safetyTimerRef.current = setTimeout(() => {
      completeActiveEvent(active.eventId, 'timeout');
    }, Math.max(1, deadline));
    return clearSafetyTimer;
  }, [activeEventId, clearSafetyTimer, completeActiveEvent, enabled, reducedMotion]);

  useEffect(() => {
    clearPhaseTimer();
    const active = stateRef.current.activeEvent;
    if (!enabled || !active || active.eventId !== activeEventId) return undefined;
    const phases = getPhases(active);
    const phaseIndex = phases.indexOf(state.phase);
    if (phaseIndex < 0) return undefined;
    const duration = getPhaseDuration(active, state.phase, phaseIndex, phases, reducedMotion);
    phaseTimerRef.current = setTimeout(() => {
      const nextPhase = phases[phaseIndex + 1];
      if (nextPhase) {
        dispatch({ type: 'advance', eventId: active.eventId, phase: nextPhase });
      } else {
        completeActiveEvent(active.eventId, 'ended');
      }
    }, duration);
    return clearPhaseTimer;
  }, [activeEventId, clearPhaseTimer, completeActiveEvent, enabled, reducedMotion, state.phase]);

  useEffect(() => {
    if (!enabled) cancelAll('mode-off');
  }, [cancelAll, enabled]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') cancelAll('hidden');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (document.visibilityState === 'hidden') cancelAll('hidden');
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [cancelAll]);

  useEffect(() => () => {
    clearPhaseTimer();
    clearSafetyTimer();
    completedRef.current.clear();
    onCancelled?.('unmount');
  }, [clearPhaseTimer, clearSafetyTimer, onCancelled]);

  return {
    state,
    activeEvent: state.activeEvent,
    phase: state.phase,
    queue: state.queue,
    enqueue,
    enqueueMany,
    completeActiveEvent,
    cancelAll,
  };
}
