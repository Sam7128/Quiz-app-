import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { FocusTimer } from '../../components/FocusTimer';
import { getLocalStudyStats, recordLocalStudySession } from '../../services/analytics';
import { STORAGE_KEYS } from '../../services/storage';

describe('FocusTimer Stats & Zero-Question Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('focus completion records duration when timer reaches 0', () => {
    const onSessionCompleteMock = vi.fn();

    render(<FocusTimer onSessionComplete={onSessionCompleteMock} />);

    // Start timer (focus mode 25 mins by default)
    const startButton = screen.getByRole('button', { name: '' });
    fireEvent.click(startButton);

    // Fast-forward 25 minutes (1500 seconds)
    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000);
    });

    expect(onSessionCompleteMock).toHaveBeenCalledTimes(1);
    expect(onSessionCompleteMock).toHaveBeenCalledWith(25 * 60);
  });

  it('rest completion does NOT trigger onSessionComplete', () => {
    const onSessionCompleteMock = vi.fn();

    render(<FocusTimer onSessionComplete={onSessionCompleteMock} />);

    // Start focus timer
    const startButton = screen.getByRole('button', { name: '' });
    fireEvent.click(startButton);

    // Fast-forward 25 minutes -> focus completed
    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000);
    });

    expect(onSessionCompleteMock).toHaveBeenCalledTimes(1);
    onSessionCompleteMock.mockClear();

    // Now in Rest Mode (5 mins), start rest countdown
    fireEvent.click(startButton);

    // Fast-forward 5 minutes (300 seconds) -> rest completed
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });

    // Rest completion MUST NOT record session
    expect(onSessionCompleteMock).not.toHaveBeenCalled();
  });

  it('manual reset does NOT trigger onSessionComplete', () => {
    const onSessionCompleteMock = vi.fn();

    render(<FocusTimer onSessionComplete={onSessionCompleteMock} />);

    // Start timer
    const startButton = screen.getByRole('button', { name: '' });
    fireEvent.click(startButton);

    // Advance halfway (10 minutes)
    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });

    // Click reset button
    const resetButton = screen.getByRole('button', { name: /重置/i });
    fireEvent.click(resetButton);

    expect(onSessionCompleteMock).not.toHaveBeenCalled();
  });

  it('unmount does NOT trigger onSessionComplete', () => {
    const onSessionCompleteMock = vi.fn();

    const { unmount } = render(<FocusTimer onSessionComplete={onSessionCompleteMock} />);

    // Start timer
    const startButton = screen.getByRole('button', { name: '' });
    fireEvent.click(startButton);

    // Advance 5 minutes
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });

    // Unmount component
    unmount();

    // Advance more time
    act(() => {
      vi.advanceTimersByTime(30 * 60 * 1000);
    });

    expect(onSessionCompleteMock).not.toHaveBeenCalled();
  });

  it('accuracy rate is NOT diluted/dragged down by 0-question focus sessions', () => {
    // 1. Record a 10-question quiz session with 10 correct (100% accuracy, 300s duration)
    recordLocalStudySession(10, 10, 300, 'quiz');

    let stats = getLocalStudyStats();
    expect(stats.totalQuestions).toBe(10);
    expect(stats.totalCorrect).toBe(10);
    expect(stats.accuracyRate).toBe(100);
    expect(stats.totalDurationSeconds).toBe(300);

    // 2. Record a 25-minute focus session (0 questions, 1500s duration)
    recordLocalStudySession(0, 0, 1500, 'focus');

    stats = getLocalStudyStats();
    // Accuracy must remain 100% (not diluted by 0 questions)
    expect(stats.totalQuestions).toBe(10);
    expect(stats.totalCorrect).toBe(10);
    expect(stats.accuracyRate).toBe(100);
    // Duration must accumulate
    expect(stats.totalDurationSeconds).toBe(1800);
  });

  it('pure focus session alone does not cause divide-by-zero or NaN in accuracyRate', () => {
    recordLocalStudySession(0, 0, 1500, 'focus');

    const stats = getLocalStudyStats();
    expect(stats.totalQuestions).toBe(0);
    expect(stats.totalCorrect).toBe(0);
    expect(stats.accuracyRate).toBe(0);
    expect(stats.totalDurationSeconds).toBe(1500);
  });
});
