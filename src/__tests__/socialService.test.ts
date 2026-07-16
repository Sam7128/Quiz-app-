import { beforeEach, describe, expect, it, vi } from 'vitest';

// 1. Mock Supabase
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    from: mocks.from,
  },
}));

import {
  sendFriendRequest,
  acceptFriendRequest,
  shareBank
} from '../../services/socialService';

describe('SocialService Friendships & Sharing System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-alice-uuid' } } });
  });

  describe('sendFriendRequest 好友請求防禦', () => {
    it('當用戶名稱為空白字元時，應拋出錯誤', async () => {
      await expect(sendFriendRequest('   ')).rejects.toThrow('請輸入用戶名稱');
    });

    it('當嘗試加自己為好友時，必須阻斷並拋出「不能加自己為好友」', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'user-alice-uuid', username: 'alice' },
            error: null,
          }),
        }),
      });
      mocks.from.mockImplementation((table) => {
        if (table === 'profiles') return { select: selectMock };
        return {};
      });

      await expect(sendFriendRequest('alice')).rejects.toThrow('不能加自己為好友');
    });

    it('當好友請求已存在時 (資料庫唯一約束衝突，錯誤碼 23505)，應拋出「好友請求已存在」', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'user-bob-uuid', username: 'bob' },
            error: null,
          }),
        }),
      });
      const insertMock = vi.fn().mockResolvedValue({
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      });

      mocks.from.mockImplementation((table) => {
        if (table === 'profiles') return { select: selectMock };
        if (table === 'friendships') return { insert: insertMock };
        return {};
      });

      await expect(sendFriendRequest('bob')).rejects.toThrow('好友請求已存在');
    });
  });

  describe('acceptFriendRequest & shareBank 授權與 BOLA 防禦', () => {
    it('接受好友請求時，應有 Receiver 驗證 (即 friend_id === userId)', async () => {
      const eqFriendIdMock = vi.fn().mockResolvedValue({ error: null });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqFriendIdMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });

      mocks.from.mockImplementation((table) => {
        if (table === 'friendships') return { update: updateMock };
        return {};
      });

      await acceptFriendRequest('request-123');
      expect(updateMock).toHaveBeenCalledWith({ status: 'accepted' });
      expect(eqIdMock).toHaveBeenCalledWith('id', 'request-123');
      expect(eqFriendIdMock).toHaveBeenCalledWith('friend_id', 'user-alice-uuid'); // 強制接收者校驗
    });

    it('分享題庫時，應寫入正確的 sender_id (即 userId) 與 pending 狀態', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mocks.from.mockImplementation((table) => {
        if (table === 'shared_banks') return { insert: insertMock };
        return {};
      });

      const bankMeta = { id: 'bank-a', name: 'TS Bank', createdAt: 0, questionCount: 1 };
      const questions = [{ id: 'q1', question: 'Q', options: [], answer: '', type: 'single' as const }];
      
      await shareBank('receiver-uuid', bankMeta, questions);
      expect(insertMock).toHaveBeenCalledWith({
        sender_id: 'user-alice-uuid',
        receiver_id: 'receiver-uuid',
        bank_snapshot: {
          meta: bankMeta,
          questions
        },
        status: 'pending'
      });
    });
  });
});
