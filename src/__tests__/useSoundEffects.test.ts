import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BattlePresentationEvent } from '../../types/battleTypes';
import { mapEventToCue, useSoundEffects } from '../../hooks/useSoundEffects';

const howlConstructorMock = vi.fn();
const howlPlayMock = vi.fn(() => 101);
const howlStopMock = vi.fn();

vi.mock('howler', () => {
  return {
    Howl: class {
      options: Record<string, unknown>;
      constructor(options: Record<string, unknown>) {
        this.options = options;
        howlConstructorMock(options);
      }
      play = howlPlayMock;
      stop = howlStopMock;
      playing = vi.fn(() => false);
    },
  };
});

const createTestEvent = (
  kind: BattlePresentationEvent['kind'],
  phase: BattlePresentationEvent['phase'],
  payloadPartial: Partial<BattlePresentationEvent['payload']> = {},
  eventId = 'evt-1',
): BattlePresentationEvent => ({
  eventId,
  correlationId: 'corr-1',
  sequence: 1,
  kind,
  actorId: 'actor-1',
  targetId: 'target-1',
  phase,
  durationProfile: {
    anticipationMs: 100,
    travelMs: 100,
    impactMs: 100,
    settleMs: 100,
    safetyDeadlineMs: 1000,
    reducedMotionMs: 0,
  },
  payload: {
    damage: 10,
    baseDamage: 10,
    isCrit: false,
    multiplier: 1,
    shieldAbsorbed: 0,
    ...payloadPartial,
  },
});

describe('mapEventToCue', () => {
  it('maps hero_attack impact to hit_basic or hit_critical', () => {
    expect(mapEventToCue(createTestEvent('hero_attack', 'impact', { isCrit: false }))).toBe('hit_basic');
    expect(mapEventToCue(createTestEvent('hero_attack', 'impact', { isCrit: true }))).toBe('hit_critical');
    expect(mapEventToCue(createTestEvent('hero_attack', 'travel', { isCrit: false }))).toBeNull();
  });

  it('maps monster_attack impact to shield_absorb or hit_basic', () => {
    expect(mapEventToCue(createTestEvent('monster_attack', 'impact', { shieldAbsorbed: 5 }))).toBe('shield_absorb');
    expect(mapEventToCue(createTestEvent('monster_attack', 'impact', { shieldAbsorbed: 0 }))).toBe('hit_basic');
  });

  it('maps skill_cast anticipation and impact for fire, ice, lightning', () => {
    expect(mapEventToCue(createTestEvent('skill_cast', 'anticipation', { element: 'fire' }))).toBe('skill_fire_cast');
    expect(mapEventToCue(createTestEvent('skill_cast', 'impact', { element: 'fire' }))).toBe('skill_fire_impact');
    expect(mapEventToCue(createTestEvent('skill_cast', 'anticipation', { element: 'ice' }))).toBe('skill_ice_cast');
    expect(mapEventToCue(createTestEvent('skill_cast', 'impact', { element: 'ice' }))).toBe('skill_ice_impact');
    expect(mapEventToCue(createTestEvent('skill_cast', 'anticipation', { element: 'lightning' }))).toBe('skill_lightning_cast');
    expect(mapEventToCue(createTestEvent('skill_cast', 'impact', { element: 'lightning' }))).toBe('skill_lightning_impact');
    expect(mapEventToCue(createTestEvent('skill_cast', 'anticipation', { element: 'void' }))).toBeNull();
  });

  it('maps monster_defeat, monster_spawn, boss_entrance', () => {
    expect(mapEventToCue(createTestEvent('monster_defeat', 'defeat'))).toBe('monster_defeat');
    expect(mapEventToCue(createTestEvent('monster_spawn', 'spawn'))).toBe('monster_spawn');
    expect(mapEventToCue(createTestEvent('boss_entrance', 'entrance'))).toBe('boss_entrance');
  });
});

describe('useSoundEffects Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes Howl instances for all 12 registered cues and handles loaderror/playerror without throwing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderHook(() => useSoundEffects());
    // 1 BGM + 12 cues = 13 Howl instances
    expect(howlConstructorMock).toHaveBeenCalledTimes(13);
    expect(howlConstructorMock).toHaveBeenCalledWith(expect.objectContaining({
      src: ['/sounds/bgm_dungeon.mp3'],
    }));

    const options = howlConstructorMock.mock.calls.find(call => {
      const src = (call[0] as { src?: string[] })?.src;
      return Array.isArray(src) && src.some(s => typeof s === 'string' && s.includes('hit_basic'));
    })?.[0] as { onloaderror?: (id: number, err: string) => void; onplayerror?: (id: number, err: string) => void } | undefined;
    expect(options).toBeDefined();

    options?.onloaderror?.(1, 'load error');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[SoundEffects] Cue hit_basic load error'), 'load error');

    options?.onplayerror?.(1, 'play error');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[SoundEffects] Cue hit_basic play error'), 'play error');

    warnSpy.mockRestore();
  });

  it('plays mapped event cue, dedupes per event:phase:cue, and respects sfx setting', () => {
    const { result } = renderHook(() => useSoundEffects());

    const event1Anticipation = createTestEvent('skill_cast', 'anticipation', { element: 'fire' }, 'evt-1');
    const event1Impact = createTestEvent('skill_cast', 'impact', { element: 'fire' }, 'evt-1');

    act(() => {
      result.current.playBattleCue(event1Anticipation);
      result.current.playBattleCue(event1Anticipation); // duplicate call -> deduped
    });
    expect(howlPlayMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.playBattleCue(event1Impact); // different phase -> allowed
    });
    expect(howlPlayMock).toHaveBeenCalledTimes(2);

    localStorage.setItem('mindspark_sfx_enabled', 'false');
    const muted = renderHook(() => useSoundEffects());
    act(() => muted.result.current.playBattleCue(createTestEvent('hero_attack', 'impact', {}, 'evt-2')));
    expect(howlPlayMock).toHaveBeenCalledTimes(2);
  });

  it('enforces latest-wins policy by stopping previous active short cue before playing new cue', () => {
    const { result } = renderHook(() => useSoundEffects());

    const eventHit = createTestEvent('hero_attack', 'impact', {}, 'evt-1');
    const eventBoss = createTestEvent('boss_entrance', 'entrance', {}, 'evt-2');

    act(() => {
      result.current.playBattleCue(eventHit);
    });
    expect(howlPlayMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.playBattleCue(eventBoss);
    });
    expect(howlStopMock).toHaveBeenCalledWith(101);
    expect(howlPlayMock).toHaveBeenCalledTimes(2);
  });

  it('supports explicit stopBattleCue and unmount cleanup', () => {
    const { result } = renderHook(() => useSoundEffects());

    act(() => {
      result.current.playBattleCue(createTestEvent('hero_attack', 'impact', {}, 'evt-1'));
    });

    act(() => {
      result.current.stopBattleCue();
    });
    expect(howlStopMock).toHaveBeenCalledWith(101);

    vi.clearAllMocks();
    const activeHook = renderHook(() => useSoundEffects());
    act(() => {
      activeHook.result.current.playBattleCue(createTestEvent('hero_attack', 'impact', {}, 'evt-2'));
    });
    activeHook.unmount();
    expect(howlStopMock).toHaveBeenCalledWith(101);
  });
});
