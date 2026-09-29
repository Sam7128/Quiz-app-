import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from '../../components/Dashboard';
import { ToastProvider } from '../../contexts/ToastContext';
import { ConfirmProvider } from '../../components/ConfirmDialog';
import { QuizProvider } from '../../contexts/QuizContext';
import { IStorageRepository } from '../../services/repository';
import { BankMetadata, SpacedRepetitionItem } from '../../types';

const mockRepository: Partial<IStorageRepository> = {
  getBanks: vi.fn(),
  getQuestions: vi.fn(),
  getSpacedRepetition: vi.fn(),
  getMistakeLog: vi.fn().mockReturnValue({}),
  getRecentMistakeSessions: vi.fn().mockReturnValue([]),
  getStreak: vi.fn().mockReturnValue({ currentStreak: 0, maxStreak: 0, lastStudyDate: '' }),
  getStudyStats: vi.fn().mockReturnValue({ totalAnswered: 0, totalCorrect: 0, totalDurationSeconds: 0, sessionCount: 0 }),
  getAchievements: vi.fn().mockReturnValue([]),
};

vi.mock('../../contexts/RepositoryContext', () => ({
  useRepository: () => mockRepository as IStorageRepository,
}));

describe('Dashboard dueCount - Orphan SR Filtering (W3 Fix)', () => {
  const activeBank: BankMetadata = {
    id: 'bank-active',
    name: '現存題庫',
    description: '測試題庫',
    questionCount: 1,
    createdAt: Date.now(),
  };

  const dueItemActive: SpacedRepetitionItem = {
    questionId: 'q-active',
    nextReviewDate: Date.now() - 10000, // already due
    interval: 1,
    repetitions: 1,
    easinessFactor: 2.5,
  };

  const dueItemOrphan: SpacedRepetitionItem = {
    questionId: 'q-deleted-bank',
    nextReviewDate: Date.now() - 20000, // already due but bank was deleted
    interval: 1,
    repetitions: 1,
    easinessFactor: 2.5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository.getBanks = vi.fn().mockResolvedValue([activeBank]);
    mockRepository.getQuestions = vi.fn().mockImplementation(async (bankId: string) => {
      if (bankId === 'bank-active') {
        return [{ id: 'q-active', question: '題目1', options: ['A', 'B'], answer: 'A' }];
      }
      return [];
    });
    mockRepository.getSpacedRepetition = vi.fn().mockResolvedValue([dueItemActive, dueItemOrphan]);
    mockRepository.getMistakeLog = vi.fn().mockReturnValue({});
    mockRepository.getRecentMistakeSessions = vi.fn().mockReturnValue([]);
    mockRepository.getStreak = vi.fn().mockReturnValue({ currentStreak: 0, maxStreak: 0, lastStudyDate: '' });
    mockRepository.getStudyStats = vi.fn().mockReturnValue({ totalAnswered: 0, totalCorrect: 0, totalDurationSeconds: 0, sessionCount: 0 });
    mockRepository.getAchievements = vi.fn().mockReturnValue([]);
  });

  const renderDashboard = (onStartSpacedReview = vi.fn()) => {
    return render(
      <ToastProvider>
        <ConfirmProvider>
          <QuizProvider
            startQuizByBank={vi.fn().mockResolvedValue(undefined)}
            startChallengeQuiz={vi.fn().mockResolvedValue(undefined)}
          >
            <Dashboard
              mistakeLog={{}}
              banks={[activeBank]}
              folders={[]}
              selectedBankIds={['bank-active']}
              onToggleBank={vi.fn()}
              onStartQuiz={vi.fn()}
              onStartMistakes={vi.fn()}
              onShareBank={vi.fn()}
              onCreateFolder={vi.fn()}
              onDeleteFolder={vi.fn()}
              onMoveBank={vi.fn()}
              onBatchDelete={vi.fn()}
              onStartSpacedReview={onStartSpacedReview}
            />
          </QuizProvider>
        </ConfirmProvider>
      </ToastProvider>
    );
  };

  it('filters out orphan spaced repetition items and displays exact matching due count', async () => {
    const handleStartSpaced = vi.fn();
    renderDashboard(handleStartSpaced);

    // Wait for async loadDueCount to resolve
    const reviewBtn = await screen.findByRole('button', { name: /複習到期題目/i });
    expect(reviewBtn).toBeDefined();

    // Must show 1 (orphan q-deleted-bank filtered out), not 2
    expect(screen.getByText('有 1 題需要複習')).toBeDefined();

    // Clicking button triggers onStartSpacedReview
    fireEvent.click(reviewBtn);
    expect(handleStartSpaced).toHaveBeenCalledTimes(1);
  });
});
