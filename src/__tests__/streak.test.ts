import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    rpc: mocks.rpc,
  },
}));

import { updateCloudStreak } from '../../services/streak';

describe('updateCloudStreak', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls update_streak RPC without legacy parameters', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mocks.rpc.mockResolvedValue({ error: null });

    const ok = await updateCloudStreak();

    expect(ok).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith('update_streak');
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});

