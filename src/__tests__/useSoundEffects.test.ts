import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock howler before import
const howlConstructorMock = vi.fn();
const howlPlayMock = vi.fn();

vi.mock('howler', () => {
  return {
    Howl: class {
      constructor(...args: unknown[]) {
        howlConstructorMock(...args);
      }
      play = howlPlayMock;
      stop = vi.fn();
      playing = vi.fn(() => false);
    }
  };
});

import { useSoundEffects } from '../../hooks/useSoundEffects';

describe('useSoundEffects Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes shared Howl instances and plays the mapped event cue', () => {
    const { result } = renderHook(() => useSoundEffects());

    expect(howlConstructorMock).toHaveBeenCalled();

    act(() => {
      result.current.playBattleCue('hero_attack', 'lifecycle-event');
    });
    expect(howlPlayMock).toHaveBeenCalled();

    vi.clearAllMocks();
    renderHook(() => useSoundEffects());
    expect(howlConstructorMock).not.toHaveBeenCalled();
  });

  it('dedupes a cue per event and respects sound-off', () => {
    const { result } = renderHook(() => useSoundEffects());

    act(() => {
      result.current.playBattleCue('hero_attack', 'event-1');
      result.current.playBattleCue('hero_attack', 'event-1');
      result.current.playBattleCue('hero_attack', 'event-2');
    });
    expect(howlPlayMock).toHaveBeenCalledTimes(2);

    localStorage.setItem('mindspark_sfx_enabled', 'false');
    const muted = renderHook(() => useSoundEffects());
    act(() => muted.result.current.playBattleCue('hero_attack', 'event-muted'));
    expect(howlPlayMock).toHaveBeenCalledTimes(2);
  });

  it('maps the approved fire skill cue and leaves unapproved elements silent', () => {
    const { result } = renderHook(() => useSoundEffects());

    act(() => {
      result.current.playBattleCue('skill_cast', 'fire-event', 'fire');
      result.current.playBattleCue('skill_cast', 'ice-event', 'ice');
    });

    expect(howlPlayMock).toHaveBeenCalledOnce();
  });
});
