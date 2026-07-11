import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock howler before import
const howlConstructorMock = vi.fn();
const howlPlayMock = vi.fn();
const howlUnloadMock = vi.fn();

vi.mock('howler', () => {
  return {
    Howl: class {
      constructor(...args: any[]) {
        howlConstructorMock(...args);
      }
      play = howlPlayMock;
      stop = vi.fn();
      playing = vi.fn(() => false);
      unload = howlUnloadMock;
    }
  };
});

import { useSoundEffects } from '../../hooks/useSoundEffects';

describe('useSoundEffects Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('scenario 1 & 2 & 3: howler integration lifecycle', () => {
    const { result } = renderHook(() => useSoundEffects());

    // Scenario 1: initSounds after mount should construct Howl instances
    expect(howlConstructorMock).toHaveBeenCalled();

    // Scenario 2: playAttackSfx should call Howl.play
    act(() => {
      result.current.playAttackSfx();
    });
    expect(howlPlayMock).toHaveBeenCalled();

    // Scenario 3: unloadSfx should call Howl.unload
    act(() => {
      result.current.unloadSfx();
    });
    expect(howlUnloadMock).toHaveBeenCalled();

    // Re-init calls Howl again
    vi.clearAllMocks();
    renderHook(() => useSoundEffects());
    expect(howlConstructorMock).toHaveBeenCalled();
  });
});
