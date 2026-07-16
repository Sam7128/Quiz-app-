import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { FocusTimer } from '../../components/FocusTimer';

interface AudioContextProbe {
  state: AudioContextState;
}

describe('FocusTimer AudioContext lifecycle', () => {
  let closeMock: Mock<() => Promise<void>>;
  let audioContextInstance: AudioContextProbe | null;

  beforeEach(() => {
    vi.useFakeTimers();
    closeMock = vi.fn(async () => {
      if (audioContextInstance) audioContextInstance.state = 'closed';
    });

    // Mock AudioContext
    window.AudioContext = class {
      state = 'running';
      close = closeMock;
      createOscillator() {
        return {
          connect: vi.fn(),
          frequency: { value: 0 },
          start: vi.fn(),
          stop: vi.fn(),
        };
      }
      createGain() {
        return {
          connect: vi.fn(),
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
        };
      }
      get currentTime() { return 0; }
      get destination() { return {}; }
    } as unknown as typeof AudioContext;

    audioContextInstance = null;
    const OriginalAudioContext = window.AudioContext;
    window.AudioContext = class extends OriginalAudioContext {
      constructor() {
        super();
        // The test double needs the constructed instance for assertions.
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        audioContextInstance = this;
      }
    } as unknown as typeof AudioContext;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('scenario 1: playNotificationSound then unmount immediately -> AudioContext.close is called', async () => {
    const { container, unmount } = render(<FocusTimer />);
    
    // 點擊開始
    const playBtn = container.querySelector('button svg.ml-1')?.closest('button');
    expect(playBtn).toBeTruthy();
    fireEvent.click(playBtn!);

    // 推進時間直到 25 分鐘結束 (1500 秒)
    await act(async () => {
      vi.advanceTimersByTime(1500 * 1000);
    });

    // 此時 playNotificationSound 應該已被調用，audioContextInstance 被創建
    expect(audioContextInstance).toBeTruthy();
    expect(closeMock).not.toHaveBeenCalled();

    // 立即 unmount 組件
    unmount();

    // 斷言 close 被調用（因為 unmount cleanup 強制關閉）
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('scenario 2: playNotificationSound, wait 600ms then unmount -> close is called only once', async () => {
    const { container, unmount } = render(<FocusTimer />);
    
    // 點擊開始
    const playBtn = container.querySelector('button svg.ml-1')?.closest('button');
    expect(playBtn).toBeTruthy();
    fireEvent.click(playBtn!);

    // 推進時間直到 25 分鐘結束 (1500 秒)
    await act(async () => {
      vi.advanceTimersByTime(1500 * 1000);
    });

    expect(audioContextInstance).toBeTruthy();
    expect(closeMock).not.toHaveBeenCalled();

    // 推進時間 600ms（等待音效計時器 close）
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    // 正常計時器已經關閉了它
    expect(closeMock).toHaveBeenCalledTimes(1);

    // 再 unmount，不應該重複調用 close (因為 state 已經是 'closed')
    unmount();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
