import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('../../services/supabase', () => ({
  supabase: {
    from: mocks.from,
    auth: {
      getUser: mocks.getUser,
    },
    rpc: mocks.rpc,
  },
}));

import { submitChallengeScore } from '../../services/challenges';

describe('submitChallengeScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('應正確呼叫 Supabase RPC submit_challenge_score 並在成功時返回 true', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });

    const ok = await submitChallengeScore('challenge-123', 85);

    expect(ok).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith('submit_challenge_score', {
      p_challenge_id: 'challenge-123',
      p_score: 85,
    });
    // 斷言絕無 client-side update
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('當 RPC 返回錯誤時應拋出異常 (Fail-Fast) 且無 client-side fallback', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Database error simulated for RPC' },
    });

    await expect(submitChallengeScore('challenge-123', 85)).rejects.toThrow(
      /Score submission failed: RPC unavailable/
    );

    // 斷言絕無 client-side update
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('若無登入使用者，應直接返回 false', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    const ok = await submitChallengeScore('challenge-123', 85);

    expect(ok).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
