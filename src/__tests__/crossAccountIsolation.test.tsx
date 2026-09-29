import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

// Hoisted mocks for Supabase auth
const mocks = vi.hoisted(() => {
  let authStateCallback: ((event: string, session: unknown) => void) | null = null;
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn().mockImplementation((cb: (event: string, session: unknown) => void) => {
      authStateCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getAuthStateCallback: () => authStateCallback,
  };
});

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
  },
}));

const mockCloudStorage = vi.hoisted(() => ({
  getCloudBanks: vi.fn().mockResolvedValue([]),
  getCloudQuestions: vi.fn().mockResolvedValue([]),
  getCloudBankMeta: vi.fn().mockResolvedValue([]),
  getCloudPracticeSessions: vi.fn().mockResolvedValue([]),
  syncLocalPracticeSessions: vi.fn().mockResolvedValue({ uploaded: 0, dirty: 0 }),
}));

vi.mock('../../services/cloudStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/cloudStorage')>();
  return {
    ...actual,
    getCloudBanks: mockCloudStorage.getCloudBanks,
    getCloudQuestions: mockCloudStorage.getCloudQuestions,
    getCloudBankMeta: mockCloudStorage.getCloudBankMeta,
    getCloudPracticeSessions: mockCloudStorage.getCloudPracticeSessions,
    syncLocalPracticeSessions: mockCloudStorage.syncLocalPracticeSessions,
  };
});

import App from '../../App';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { ConfirmProvider } from '../../components/ConfirmDialog';
import { RepositoryProvider } from '../../contexts/RepositoryContext';

describe('Cross-Account Memory Isolation (C1 Fix)', () => {
  const secretQuestionA = 'CONFIDENTIAL_QUESTION_OF_USER_A_XYZ123';
  const userA = { id: 'user-a-123', email: 'userA@test.com', user_metadata: { full_name: 'User A' } };
  const userB = { id: 'user-b-456', email: 'userB@test.com', user_metadata: { full_name: 'User B' } };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();

    mockCloudStorage.getCloudBanks.mockImplementation(async () => [
      { id: 'bank-user-a', name: 'User A Private Bank', questionCount: 1, createdAt: Date.now() }
    ]);
    mockCloudStorage.getCloudQuestions.mockImplementation(async (bankId: string) => {
      if (bankId === 'bank-user-a') {
        return [{ id: 'q-secret-a', question: secretQuestionA, options: ['Option 1', 'Option 2'], answer: 'Option 1' }];
      }
      return [];
    });
    mockCloudStorage.getCloudPracticeSessions.mockResolvedValue([]);
    mockCloudStorage.syncLocalPracticeSessions.mockResolvedValue({ uploaded: 0, dirty: 0 });
  });

  const renderApp = () => {
    return render(
      <AuthProvider>
        <ThemeProvider>
          <RepositoryProvider>
            <ToastProvider>
              <ConfirmProvider>
                <App />
              </ConfirmProvider>
            </ToastProvider>
          </RepositoryProvider>
        </ThemeProvider>
      </AuthProvider>
    );
  };

  it('hard-asserts that User A confidential question stems never leak to User B after sign-out', async () => {
    // 1. Initial state: User A is logged in
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { user: userA } }
    });

    renderApp();

    const authCb = mocks.getAuthStateCallback();
    expect(authCb).toBeDefined();

    await act(async () => {
      authCb?.('SIGNED_IN', { user: userA });
    });

    // Verify User A Dashboard loaded
    expect(await screen.findByText('歡迎回來，學習者！')).toBeDefined();

    // User A starts quiz containing the secret question
    const startQuizBtn = await screen.findByRole('button', { name: '開始測驗' });
    await act(async () => {
      fireEvent.click(startQuizBtn);
    });

    // Verify User A is actively in Quiz and seeing the confidential question
    expect(await screen.findByText(secretQuestionA)).toBeDefined();

    // 2. User A signs out while in the middle of active quiz
    await act(async () => {
      authCb?.('SIGNED_OUT', null);
    });

    // Verify Login page is rendered and confidential question is already gone from DOM
    const loginButtons = await screen.findAllByText(/登入/i);
    expect(loginButtons.length).toBeGreaterThan(0);
    expect(screen.queryByText(secretQuestionA)).toBeNull();

    // 3. User B logs in (User B has a different bank)
    mockCloudStorage.getCloudBanks.mockResolvedValue([
      { id: 'bank-user-b', name: 'User B Public Bank', questionCount: 1, createdAt: Date.now() }
    ]);
    mockCloudStorage.getCloudQuestions.mockImplementation(async (bankId: string) => {
      if (bankId === 'bank-user-b') {
        return [{ id: 'q-public-b', question: 'USER_B_BENIGN_QUESTION', options: ['A', 'B'], answer: 'A' }];
      }
      return [];
    });

    await act(async () => {
      authCb?.('SIGNED_IN', { user: userB });
    });

    // Verify User B is mounted fresh on Dashboard
    expect(await screen.findByText('歡迎回來，學習者！')).toBeDefined();

    // HARD ASSERTION: User A's question stem MUST NOT exist anywhere in DOM or memory
    expect(screen.queryByText(secretQuestionA)).toBeNull();
  });
});
