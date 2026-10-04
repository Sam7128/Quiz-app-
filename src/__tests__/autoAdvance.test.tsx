import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QuizCard } from '../../components/QuizCard';
import { Question } from '../../types';
import * as storageModule from '../../services/storage';

vi.mock('../../hooks/useAchievements', () => ({
  useAchievements: () => ({
    unlockedIds: [],
    loading: false,
    unlockAchievement: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import { BattlePresentationEvent } from '../../types/battleTypes';

let mockActivePresentationEvent: BattlePresentationEvent | null = null;
const mockTriggerAnswer = vi.fn();
const mockStartBattle = vi.fn();
const mockEndBattle = vi.fn();
const mockResetForNewChunk = vi.fn();
const mockCompletePresentationEvent = vi.fn();

vi.mock('../../hooks/useBattleSystem', () => ({
  useBattleSystem: () => ({
    battleState: {
      isActive: true,
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
    triggerAnswer: mockTriggerAnswer,
    startBattle: mockStartBattle,
    endBattle: mockEndBattle,
    resetForNewChunk: mockResetForNewChunk,
    activePresentationEvent: mockActivePresentationEvent,
    completePresentationEvent: mockCompletePresentationEvent,
  }),
}));

const mockQuestion: Question = {
  id: 'q-test-1',
  question: '測試問題 1',
  options: ['選項 A', '選項 B', '選項 C'],
  answer: '選項 A',
  explanation: '選項 A 是正確答案',
};

const mockLastQuestion: Question = {
  id: 'q-test-last',
  question: '最後一題',
  options: ['選項 1', '選項 2'],
  answer: '選項 1',
  explanation: '解析',
};

describe('Auto Advance on Correct & Conflict Elimination (QuizCard)', () => {
  beforeEach(() => {
    mockActivePresentationEvent = null;
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('標準模式：答對且 autoAdvanceOnCorrect=true 時，於 800ms 後自動呼叫 onNext', () => {
    vi.spyOn(storageModule, 'getUserSettings').mockReturnValue({
      restBreakInterval: 20,
      autoAdvanceOnCorrect: true,
    });

    const handleAnswer = vi.fn();
    const handleNext = vi.fn();

    render(
      <QuizCard
        question={mockQuestion}
        currentIndex={0}
        totalQuestions={5}
        onAnswer={handleAnswer}
        onNext={handleNext}
        isLastQuestion={false}
        onExit={vi.fn()}
        gameMode={false}
      />
    );

    // 點擊正確答案「選項 A」
    const optionA = screen.getByText('選項 A');
    act(() => {
      fireEvent.click(optionA);
    });

    expect(handleAnswer).toHaveBeenCalledWith(true, '選項 A');
    expect(handleNext).not.toHaveBeenCalled();

    // 快轉 799ms
    act(() => {
      vi.advanceTimersByTime(799);
    });
    expect(handleNext).not.toHaveBeenCalled();

    // 快轉到 800ms
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  it('答錯防護：即使開啟 autoAdvanceOnCorrect，答錯時絕不自動切題', () => {
    vi.spyOn(storageModule, 'getUserSettings').mockReturnValue({
      restBreakInterval: 20,
      autoAdvanceOnCorrect: true,
    });

    const handleAnswer = vi.fn();
    const handleNext = vi.fn();

    render(
      <QuizCard
        question={mockQuestion}
        currentIndex={0}
        totalQuestions={5}
        onAnswer={handleAnswer}
        onNext={handleNext}
        isLastQuestion={false}
        onExit={vi.fn()}
        gameMode={false}
      />
    );

    // 點擊錯誤答案「選項 B」
    const optionB = screen.getByText('選項 B');
    act(() => {
      fireEvent.click(optionB);
    });

    expect(handleAnswer).toHaveBeenCalledWith(false, '選項 B');

    // 快轉 3000ms
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(handleNext).not.toHaveBeenCalled();
  });

  it('關閉設定防護：autoAdvanceOnCorrect=false 時答對不自動切題', () => {
    vi.spyOn(storageModule, 'getUserSettings').mockReturnValue({
      restBreakInterval: 20,
      autoAdvanceOnCorrect: false,
    });

    const handleAnswer = vi.fn();
    const handleNext = vi.fn();

    render(
      <QuizCard
        question={mockQuestion}
        currentIndex={0}
        totalQuestions={5}
        onAnswer={handleAnswer}
        onNext={handleNext}
        isLastQuestion={false}
        onExit={vi.fn()}
        gameMode={false}
      />
    );

    act(() => {
      fireEvent.click(screen.getByText('選項 A'));
    });
    expect(handleAnswer).toHaveBeenCalledWith(true, '選項 A');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(handleNext).not.toHaveBeenCalled();
  });

  it('衝突消解：手動點擊「下一題」立即中斷計時器，杜絕雙重前進', () => {
    vi.spyOn(storageModule, 'getUserSettings').mockReturnValue({
      restBreakInterval: 20,
      autoAdvanceOnCorrect: true,
    });

    const handleNext = vi.fn();

    render(
      <QuizCard
        question={mockQuestion}
        currentIndex={0}
        totalQuestions={5}
        onAnswer={vi.fn()}
        onNext={handleNext}
        isLastQuestion={false}
        onExit={vi.fn()}
        gameMode={false}
      />
    );

    // 答對觸發定時排程
    act(() => {
      fireEvent.click(screen.getByText('選項 A'));
    });

    // 推進 400ms 顯示解析後手動點擊下一題按鈕
    act(() => {
      vi.advanceTimersByTime(400);
    });

    const nextBtn = screen.getByRole('button', { name: /下一題/i });
    act(() => {
      fireEvent.click(nextBtn);
    });

    expect(handleNext).toHaveBeenCalledTimes(1);

    // 再次快轉 1000ms，確認自動計時器已被銷毀，不重複執行
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  it('生命週期安全：元件 unmount 時清除排程計時器，防範記憶體洩漏', () => {
    vi.spyOn(storageModule, 'getUserSettings').mockReturnValue({
      restBreakInterval: 20,
      autoAdvanceOnCorrect: true,
    });

    const handleNext = vi.fn();

    const { unmount } = render(
      <QuizCard
        question={mockQuestion}
        currentIndex={0}
        totalQuestions={5}
        onAnswer={vi.fn()}
        onNext={handleNext}
        isLastQuestion={false}
        onExit={vi.fn()}
        gameMode={false}
      />
    );

    act(() => {
      fireEvent.click(screen.getByText('選項 A'));
    });

    // 300ms 時 unmount
    act(() => {
      vi.advanceTimersByTime(300);
    });
    unmount();

    // 快轉超過 800ms
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(handleNext).not.toHaveBeenCalled();
  });

  it('最後一題邊界防護：在最後一題答對時自動呼叫 onNext (進入結算)', () => {
    vi.spyOn(storageModule, 'getUserSettings').mockReturnValue({
      restBreakInterval: 20,
      autoAdvanceOnCorrect: true,
    });

    const handleNext = vi.fn();

    render(
      <QuizCard
        question={mockLastQuestion}
        currentIndex={4}
        totalQuestions={5}
        onAnswer={vi.fn()}
        onNext={handleNext}
        isLastQuestion={true}
        onExit={vi.fn()}
        gameMode={false}
      />
    );

    act(() => {
      fireEvent.click(screen.getByText('選項 1'));
    });

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  it('戰鬥模式：2000ms 兜底安全計時器防止死鎖', () => {
    vi.spyOn(storageModule, 'getUserSettings').mockReturnValue({
      restBreakInterval: 20,
      autoAdvanceOnCorrect: true,
    });

    const handleNext = vi.fn();

    render(
      <QuizCard
        question={mockQuestion}
        currentIndex={0}
        totalQuestions={5}
        onAnswer={vi.fn()}
        onNext={handleNext}
        isLastQuestion={false}
        onExit={vi.fn()}
        gameMode={true}
      />
    );

    act(() => {
      fireEvent.click(screen.getByText('選項 A'));
    });

    // 快轉 1999ms 尚未觸發兜底
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(handleNext).not.toHaveBeenCalled();

    // 達到 2000ms 兜底觸發
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  it('戰鬥模式：演出事件結束 (activePresentationEvent 非 null -> null) 後 400ms 觸發切題', () => {
    vi.spyOn(storageModule, 'getUserSettings').mockReturnValue({
      restBreakInterval: 20,
      autoAdvanceOnCorrect: true,
    });

    const handleNext = vi.fn();

    const sampleEvent: BattlePresentationEvent = {
      eventId: 'evt-1',
      correlationId: 'ans-1',
      sequence: 1,
      kind: 'hero_attack',
      actorId: 'hero',
      targetId: 'monster-1',
      phase: 'impact',
      durationProfile: {
        anticipationMs: 50,
        travelMs: 100,
        impactMs: 150,
        settleMs: 100,
        safetyDeadlineMs: 1000,
        reducedMotionMs: 50,
      },
      payload: {
        damage: 50,
        baseDamage: 50,
        isCrit: false,
        multiplier: 1,
        shieldAbsorbed: 0,
      },
    };

    const { rerender } = render(
      <QuizCard
        question={mockQuestion}
        currentIndex={0}
        totalQuestions={5}
        onAnswer={vi.fn()}
        onNext={handleNext}
        isLastQuestion={false}
        onExit={vi.fn()}
        gameMode={true}
      />
    );

    // 1. 點擊正確答案，答對並進入等待戰鬥演出狀態
    act(() => {
      fireEvent.click(screen.getByText('選項 A'));
    });

    expect(handleNext).not.toHaveBeenCalled();

    // 2. 戰鬥系統推進，activePresentationEvent 變為非 null（播放演出）
    mockActivePresentationEvent = sampleEvent;
    rerender(
      <QuizCard
        question={mockQuestion}
        currentIndex={0}
        totalQuestions={5}
        onAnswer={vi.fn()}
        onNext={handleNext}
        isLastQuestion={false}
        onExit={vi.fn()}
        gameMode={true}
      />
    );

    // 3. 演出播放結束，activePresentationEvent 變回 null
    mockActivePresentationEvent = null;
    rerender(
      <QuizCard
        question={mockQuestion}
        currentIndex={0}
        totalQuestions={5}
        onAnswer={vi.fn()}
        onNext={handleNext}
        isLastQuestion={false}
        onExit={vi.fn()}
        gameMode={true}
      />
    );

    // 推進 399ms：尚未到達 400ms，不應觸發切題
    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(handleNext).not.toHaveBeenCalled();

    // 推進 1ms（累計 400ms）：觸發切題
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(handleNext).toHaveBeenCalledTimes(1);

    // 繼續快轉超過原本的 2000ms 兜底時間，驗證原先的 2000ms 計時器已正確被取消，不重複前進
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(handleNext).toHaveBeenCalledTimes(1);
  });
});
