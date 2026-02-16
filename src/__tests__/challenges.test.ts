import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('../../services/supabase', () => ({
  supabase: {
    from: mocks.from,
    auth: {
      getUser: mocks.getUser,
    },
  },
}));

import { submitChallengeScore } from '../../services/challenges';

describe('submitChallengeScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  const buildFromMock = (challenge: {
    id: string;
    challenger_id: string;
    opponent_id: string;
    challenger_score: number | null;
    opponent_score: number | null;
  }) => {
    const selectSingleMock = vi.fn().mockResolvedValue({
      data: challenge,
      error: null,
    });
    const selectEqMock = vi.fn().mockReturnValue({
      single: selectSingleMock,
    });
    const selectMock = vi.fn().mockReturnValue({
      eq: selectEqMock,
    });

    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({
      eq: updateEqMock,
    });

    mocks.from.mockReturnValue({
      select: selectMock,
      update: updateMock,
    });

    return { updateMock };
  };

  it('treats 0 as a submitted score and completes challenge', async () => {
    const { updateMock } = buildFromMock({
      id: 'challenge-1',
      challenger_id: 'user-1',
      opponent_id: 'user-2',
      challenger_score: null,
      opponent_score: 0,
    });

    const ok = await submitChallengeScore('challenge-1', 3);

    expect(ok).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        challenger_score: 3,
        current_turn: 'user-2',
        status: 'completed',
        winner_id: 'user-1',
      })
    );
  });

  it('keeps challenge active when other side score is null', async () => {
    const { updateMock } = buildFromMock({
      id: 'challenge-2',
      challenger_id: 'user-1',
      opponent_id: 'user-2',
      challenger_score: null,
      opponent_score: null,
    });

    const ok = await submitChallengeScore('challenge-2', 1);

    expect(ok).toBe(true);
    const updatePayload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(updatePayload).toMatchObject({
      challenger_score: 1,
      current_turn: 'user-2',
    });
    expect(updatePayload).not.toHaveProperty('status');
    expect(updatePayload).not.toHaveProperty('winner_id');
  });
});

