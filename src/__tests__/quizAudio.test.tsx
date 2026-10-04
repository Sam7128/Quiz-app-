import React from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuizCard } from '../../components/QuizCard';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import * as storageModule from '../../services/storage';
import { Question } from '../../types';

const howlPlayMock = vi.fn(() => 201);
const howlStopMock = vi.fn();
const howlUnloadMock = vi.fn();
const howlConstructorMock = vi.fn();

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
      unload = howlUnloadMock;
      playing = vi.fn(() => false);
    },
  };
});

vi.mock('../../hooks/useAchievements', () => ({
  useAchievements: () => ({
    unlockedIds: [],
    loading: false,
    unlockAchievement: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('../../hooks/useBattleSystem', () => ({
  useBattleSystem: () => ({
    battleState: {
      isActive: false,
      streak: 0,
      maxStreak: 0,
      heroHp: 100,
      heroMaxHp: 100,
      monsterHp: 100,
      monsterMaxHp: 100,
      currentMonster: null,
      monstersDefeated: 0,
      questionsAnswered: 0,
      seenMonsters: [],
      error: undefined,
    },
    isInitialized: true,
    triggerAnswer: vi.fn(),
    startBattle: vi.fn(),
    endBattle: vi.fn(),
    resetForNewChunk: vi.fn(),
    activePresentationEvent: null,
    completePresentationEvent: vi.fn(),
  }),
}));

const mockQuestion: Question = {
  id: 'q-audio-1',
  question: '測試音效問題',
  options: ['選項 A (正確)', '選項 B (錯誤)'],
  answer: '選項 A (正確)',
  explanation: '選項 A 是正確答案',
};

describe('Quiz Audio Through Howler (quizAudio)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('useSoundEffects Hook playQuizFeedback', () => {
    it('plays correct and wrong feedback cues when SFX is enabled', () => {
      const { result } = renderHook(() => useSoundEffects());

      act(() => {
        result.current.playQuizFeedback('correct');
      });
      expect(howlPlayMock).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.playQuizFeedback('wrong');
      });
      expect(howlPlayMock).toHaveBeenCalledTimes(2);
    });

    it('suppresses quiz feedback audio when isSfxEnabled is false', () => {
      localStorage.setItem('mindspark_sfx_enabled', 'false');
      const { result } = renderHook(() => useSoundEffects());

      expect(result.current.isSfxEnabled).toBe(false);

      act(() => {
        result.current.playQuizFeedback('correct');
        result.current.playQuizFeedback('wrong');
      });

      expect(howlPlayMock).not.toHaveBeenCalled();
    });

    it('stops previous active feedback before playing new feedback (latest-wins)', () => {
      const { result } = renderHook(() => useSoundEffects());

      act(() => {
        result.current.playQuizFeedback('correct');
      });
      expect(howlPlayMock).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.playQuizFeedback('wrong');
      });
      expect(howlStopMock).toHaveBeenCalledWith(201);
      expect(howlPlayMock).toHaveBeenCalledTimes(2);
    });

    it('calls stop() on active playback upon unmount without calling unload() to preserve decoded buffer singleton', () => {
      const { result, unmount } = renderHook(() => useSoundEffects());

      act(() => {
        result.current.playQuizFeedback('correct');
      });
      expect(howlPlayMock).toHaveBeenCalledTimes(1);

      unmount();

      expect(howlStopMock).toHaveBeenCalledWith(201);
      // Strictly verify unload is NEVER called to avoid audio latency on question transition
      expect(howlUnloadMock).not.toHaveBeenCalled();
    });

    it('gracefully tolerates Howler throw during playQuizFeedback without breaking or throwing into caller', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      howlPlayMock.mockImplementationOnce(() => {
        throw new Error('WebAudio Playback Blocked / Not Allowed');
      });

      const { result } = renderHook(() => useSoundEffects());

      expect(() => {
        act(() => {
          result.current.playQuizFeedback('correct');
        });
      }).not.toThrow();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SoundEffects] Quiz feedback correct play failed'),
        expect.any(Error)
      );

      warnSpy.mockRestore();
    });
  });

  describe('QuizCard Component Audio Integration', () => {
    it('triggers playQuizFeedback("correct") on correct answer submission', () => {
      const handleAnswer = vi.fn();
      render(
        <QuizCard
          question={mockQuestion}
          currentIndex={0}
          totalQuestions={1}
          onAnswer={handleAnswer}
          onNext={vi.fn()}
          isLastQuestion={true}
          onExit={vi.fn()}
          gameMode={false}
        />
      );

      const correctOption = screen.getByText('選項 A (正確)');
      act(() => {
        fireEvent.click(correctOption);
      });

      expect(handleAnswer).toHaveBeenCalledWith(true, '選項 A (正確)');
      expect(howlPlayMock).toHaveBeenCalledTimes(1);
    });

    it('triggers playQuizFeedback("wrong") on wrong answer submission', () => {
      const handleAnswer = vi.fn();
      render(
        <QuizCard
          question={mockQuestion}
          currentIndex={0}
          totalQuestions={1}
          onAnswer={handleAnswer}
          onNext={vi.fn()}
          isLastQuestion={true}
          onExit={vi.fn()}
          gameMode={false}
        />
      );

      const wrongOption = screen.getByText('選項 B (錯誤)');
      act(() => {
        fireEvent.click(wrongOption);
      });

      expect(handleAnswer).toHaveBeenCalledWith(false, '選項 B (錯誤)');
      expect(howlPlayMock).toHaveBeenCalledTimes(1);
    });

    it('toggling global audio button updates isSfxEnabled and suppresses subsequent answer audio', () => {
      const handleAnswer = vi.fn();
      render(
        <QuizCard
          question={mockQuestion}
          currentIndex={0}
          totalQuestions={1}
          onAnswer={handleAnswer}
          onNext={vi.fn()}
          isLastQuestion={true}
          onExit={vi.fn()}
          gameMode={false}
        />
      );

      // Find audio toggle button in header
      const toggleButton = screen.getByRole('button', { name: /音效/ });
      expect(toggleButton).not.toBeNull();

      // Click to mute
      act(() => {
        fireEvent.click(toggleButton);
      });

      expect(localStorage.getItem('mindspark_sfx_enabled')).toBe('false');

      // Answer question while muted
      const correctOption = screen.getByText('選項 A (正確)');
      act(() => {
        fireEvent.click(correctOption);
      });

      expect(handleAnswer).toHaveBeenCalledWith(true, '選項 A (正確)');
      // howlPlayMock should not have been called for feedback
      expect(howlPlayMock).not.toHaveBeenCalled();
    });

    it('even if audio play throws, submitAnswer completes successfully without blocking quiz progress', () => {
      vi.useFakeTimers();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      howlPlayMock.mockImplementationOnce(() => {
        throw new Error('AudioContext was not allowed to start');
      });

      vi.spyOn(storageModule, 'getUserSettings').mockReturnValue({
        restBreakInterval: 20,
        autoAdvanceOnCorrect: true,
      });

      const handleAnswer = vi.fn();
      render(
        <QuizCard
          question={mockQuestion}
          currentIndex={0}
          totalQuestions={1}
          onAnswer={handleAnswer}
          onNext={vi.fn()}
          isLastQuestion={true}
          onExit={vi.fn()}
          gameMode={false}
        />
      );

      const correctOption = screen.getByText('選項 A (正確)');
      expect(() => {
        act(() => {
          fireEvent.click(correctOption);
        });
      }).not.toThrow();

      expect(handleAnswer).toHaveBeenCalledWith(true, '選項 A (正確)');

      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(screen.getByText('🎉 太棒了！回答正確')).not.toBeNull();

      warnSpy.mockRestore();
      vi.useRealTimers();
    });
  });
});
