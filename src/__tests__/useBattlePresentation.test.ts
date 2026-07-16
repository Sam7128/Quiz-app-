import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BATTLE_MOTION_PROFILES } from '../../services/battle/battleEngine';
import {
  battlePresentationReducer,
  INITIAL_BATTLE_PRESENTATION_STATE,
  useBattlePresentation,
} from '../../hooks/useBattlePresentation';
import { BattlePresentationEvent } from '../../types/battleTypes';

const event = (id: string, sequence: number): BattlePresentationEvent => ({
  eventId: id,
  correlationId: 'test-correlation',
  sequence,
  kind: 'hero_attack',
  actorId: 'hero',
  targetId: 'monster',
  phase: 'anticipation',
  durationProfile: BATTLE_MOTION_PROFILES.hero_attack,
  payload: {
    damage: 10,
    baseDamage: 10,
    isCrit: false,
    multiplier: 1,
    shieldAbsorbed: 0,
  },
});

describe('useBattlePresentation', () => {
  it('reducer owns one active event and preserves queue order', () => {
    const first = event('first', 0);
    const second = event('second', 1);
    const queued = battlePresentationReducer(INITIAL_BATTLE_PRESENTATION_STATE, {
      type: 'enqueue',
      events: [second, first],
    });
    expect(queued.activeEvent?.eventId).toBe('first');
    expect(queued.queue.map(item => item.eventId)).toEqual(['second']);

    const completed = battlePresentationReducer(queued, {
      type: 'complete',
      eventId: 'first',
      cause: 'ended',
    });
    expect(completed.activeEvent?.eventId).toBe('second');
    expect(completed.completedEventIds).toEqual(['first']);
  });

  it('accepts completion only for active ID and only once', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBattlePresentation());
    act(() => result.current.enqueue(event('active', 0)));

    let completed = false;
    act(() => {
      completed = result.current.completeActiveEvent('wrong', 'ended');
    });
    expect(completed).toBe(false);
    expect(result.current.activeEvent?.eventId).toBe('active');

    act(() => {
      completed = result.current.completeActiveEvent('active', 'ended');
    });
    expect(completed).toBe(true);
    expect(result.current.activeEvent).toBeNull();
    act(() => {
      completed = result.current.completeActiveEvent('active', 'timeout');
    });
    expect(completed).toBe(false);
    vi.useRealTimers();
  });

  it('advances explicit combat phases before completing the event', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBattlePresentation());
    act(() => result.current.enqueue(event('phased-event', 0)));

    expect(result.current.phase).toBe('anticipation');
    act(() => vi.advanceTimersByTime(BATTLE_MOTION_PROFILES.hero_attack.anticipationMs));
    expect(result.current.phase).toBe('travel');
    act(() => vi.advanceTimersByTime(BATTLE_MOTION_PROFILES.hero_attack.travelMs));
    expect(result.current.phase).toBe('impact');
    act(() => vi.advanceTimersByTime(BATTLE_MOTION_PROFILES.hero_attack.impactMs));
    expect(result.current.phase).toBe('hurt');
    act(() => vi.advanceTimersByTime(BATTLE_MOTION_PROFILES.hero_attack.settleMs / 2));
    expect(result.current.phase).toBe('settle');
    act(() => vi.advanceTimersByTime(BATTLE_MOTION_PROFILES.hero_attack.settleMs / 2));
    expect(result.current.activeEvent).toBeNull();
    expect(result.current.state.lastCompletion).toEqual({ eventId: 'phased-event', cause: 'ended' });
    vi.useRealTimers();
  });

  it('safety timeout completes a stalled event and stale callback cannot complete again', () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const { result } = renderHook(() => useBattlePresentation({ onEventComplete: onComplete }));
    const stalled = {
      ...event('timeout-event', 0),
      durationProfile: {
        ...BATTLE_MOTION_PROFILES.hero_attack,
        anticipationMs: 5000,
        safetyDeadlineMs: 100,
      },
    };
    act(() => result.current.enqueue(stalled));
    act(() => vi.advanceTimersByTime(100));

    expect(result.current.state.lastCompletion).toEqual({ eventId: 'timeout-event', cause: 'timeout' });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.completeActiveEvent('timeout-event', 'ended')).toBe(false);
    vi.useRealTimers();
  });

  it('hidden cancels queue, cleans media, and settles without replay', () => {
    const onCancelled = vi.fn();
    const { result } = renderHook(() => useBattlePresentation({ onCancelled }));
    act(() => result.current.enqueueMany([event('hidden-active', 0), event('hidden-next', 1)]));

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));

    expect(result.current.phase).toBe('settle');
    expect(result.current.activeEvent).toBeNull();
    expect(result.current.queue).toEqual([]);
    expect(onCancelled).toHaveBeenCalledWith('hidden');

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });

  it('reduced motion uses short completion deadline', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBattlePresentation({ reducedMotion: true }));
    act(() => result.current.enqueue(event('reduced', 0)));
    const phaseDuration = BATTLE_MOTION_PROFILES.hero_attack.reducedMotionMs / 5;
    for (let index = 0; index < 5; index += 1) {
      act(() => vi.advanceTimersByTime(phaseDuration));
    }
    expect(result.current.state.lastCompletion?.eventId).toBe('reduced');
    vi.useRealTimers();
  });

  it('survives 30 enqueue/cancel cycles without retaining completed IDs', () => {
    const { result } = renderHook(() => useBattlePresentation());

    for (let index = 0; index < 30; index += 1) {
      const eventId = `stress-${index}`;
      act(() => result.current.enqueue(event(eventId, index)));
      act(() => result.current.cancelAll('manual'));
    }

    expect(result.current.activeEvent).toBeNull();
    expect(result.current.queue).toEqual([]);
    expect(result.current.phase).toBe('settle');
    expect(result.current.state.completedEventIds).toEqual([]);
  });
});
