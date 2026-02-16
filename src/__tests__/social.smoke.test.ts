import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BankMetadata, Question } from '../../types';

type FriendshipRow = {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
};

type SharedBankRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  bank_snapshot: {
    meta: BankMetadata;
    questions: Question[];
  };
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
};

type ChallengeRow = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  bank_id: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  challenger_score: number | null;
  opponent_score: number | null;
  current_turn: string | null;
  winner_id: string | null;
  created_at: string;
  updated_at: string;
};

const mock = vi.hoisted(() => {
  const state = {
    currentUserId: 'u1',
    friendships: [] as FriendshipRow[],
    sharedBanks: [] as SharedBankRow[],
    challenges: [] as ChallengeRow[],
    profiles: [
      { id: 'u1', username: 'alice' },
      { id: 'u2', username: 'bob' },
    ],
    banks: [{ id: 'bank-1', title: 'Demo Bank' }],
  };

  const reset = () => {
    state.currentUserId = 'u1';
    state.friendships = [];
    state.sharedBanks = [];
    state.challenges = [];
  };

  const authGetUser = vi.fn(async () => ({
    data: { user: { id: state.currentUserId } },
    error: null,
  }));

  const rpc = vi.fn(async () => ({ error: null }));

  const from = vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: (field: string, value: string) => ({
            single: async () => {
              if (field !== 'username') return { data: null, error: null };
              const found = state.profiles.find((p) => p.username === value);
              return found
                ? { data: found, error: null }
                : { data: null, error: { message: 'not found' } };
            },
          }),
          in: async (field: string, ids: string[]) => {
            if (field !== 'id') return { data: [], error: null };
            return { data: state.profiles.filter((p) => ids.includes(p.id)), error: null };
          },
        }),
      };
    }

    if (table === 'banks') {
      return {
        select: () => ({
          in: async (field: string, ids: string[]) => {
            if (field !== 'id') return { data: [], error: null };
            return { data: state.banks.filter((b) => ids.includes(b.id)), error: null };
          },
        }),
      };
    }

    if (table === 'friendships') {
      return {
        select: () => ({
          or: async () => ({
            data: state.friendships.filter(
              (f) => f.user_id === state.currentUserId || f.friend_id === state.currentUserId
            ),
            error: null,
          }),
        }),
        insert: async (payload: { user_id: string; friend_id: string; status: 'pending' }) => {
          state.friendships.push({
            id: `friendship-${state.friendships.length + 1}`,
            user_id: payload.user_id,
            friend_id: payload.friend_id,
            status: payload.status,
            created_at: new Date().toISOString(),
          });
          return { error: null };
        },
        update: (values: Partial<FriendshipRow>) => {
          let idFilter = '';
          const builder = {
            eq: (field: string, value: string) => {
              if (field === 'id') idFilter = value;
              return builder;
            },
            or: async () => {
              const row = state.friendships.find((f) => f.id === idFilter);
              if (row && (row.user_id === state.currentUserId || row.friend_id === state.currentUserId)) {
                Object.assign(row, values);
              }
              return { error: null };
            },
          };
          return builder;
        },
        delete: () => {
          let idFilter = '';
          const builder = {
            eq: (field: string, value: string) => {
              if (field === 'id') idFilter = value;
              return builder;
            },
            or: async () => {
              const index = state.friendships.findIndex((f) => f.id === idFilter);
              if (index >= 0) {
                const row = state.friendships[index];
                if (row.user_id === state.currentUserId || row.friend_id === state.currentUserId) {
                  state.friendships.splice(index, 1);
                }
              }
              return { error: null };
            },
          };
          return builder;
        },
      };
    }

    if (table === 'shared_banks') {
      return {
        select: () => ({
          eq: (field: string, value: string) => ({
            eq: async (field2: string, value2: string) => {
              const data = state.sharedBanks.filter(
                (s) => (field === 'receiver_id' ? s.receiver_id === value : true) &&
                  (field2 === 'status' ? s.status === value2 : true)
              );
              return { data, error: null };
            },
          }),
        }),
        insert: async (payload: Omit<SharedBankRow, 'id' | 'created_at'>) => {
          state.sharedBanks.push({
            ...payload,
            id: `share-${state.sharedBanks.length + 1}`,
            created_at: new Date().toISOString(),
          });
          return { error: null };
        },
        update: (values: Partial<SharedBankRow>) => {
          const filters: Record<string, string> = {};
          const builder = {
            eq: (field: string, value: string) => {
              filters[field] = value;
              return builder;
            },
            then: (resolve: (value: { error: null }) => void) => {
              const row = state.sharedBanks.find(
                (s) => s.id === filters.id && s.receiver_id === filters.receiver_id
              );
              if (row) Object.assign(row, values);
              resolve({ error: null });
            },
          };
          return builder;
        },
      };
    }

    if (table === 'challenges') {
      return {
        insert: (payload: {
          challenger_id: string;
          opponent_id: string;
          bank_id: string;
          status: 'pending';
          current_turn: string;
        }) => {
          const row: ChallengeRow = {
            id: `challenge-${state.challenges.length + 1}`,
            challenger_id: payload.challenger_id,
            opponent_id: payload.opponent_id,
            bank_id: payload.bank_id,
            status: payload.status,
            challenger_score: null,
            opponent_score: null,
            current_turn: payload.current_turn,
            winner_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          state.challenges.push(row);
          return {
            select: () => ({
              single: async () => ({ data: row, error: null }),
            }),
          };
        },
        select: () => ({
          eq: (field: string, value: string) => ({
            single: async () => {
              if (field !== 'id') return { data: null, error: null };
              const row = state.challenges.find((c) => c.id === value) || null;
              return { data: row, error: row ? null : { message: 'not found' } };
            },
          }),
          or: () => ({
            order: async () => ({
              data: state.challenges.filter(
                (c) => c.challenger_id === state.currentUserId || c.opponent_id === state.currentUserId
              ),
              error: null,
            }),
          }),
        }),
        update: (values: Partial<ChallengeRow>) => {
          const filters: Record<string, string> = {};
          const builder = {
            eq: (field: string, value: string) => {
              filters[field] = value;
              return builder;
            },
            then: (resolve: (value: { error: null }) => void) => {
              const row = state.challenges.find((c) => c.id === filters.id);
              if (row) {
                const passesOpponent =
                  !filters.opponent_id || row.opponent_id === filters.opponent_id;
                const passesStatus = !filters.status || row.status === filters.status;
                if (passesOpponent && passesStatus) {
                  Object.assign(row, values);
                }
              }
              resolve({ error: null });
            },
          };
          return builder;
        },
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return { state, reset, authGetUser, rpc, from };
});

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: mock.authGetUser,
    },
    rpc: mock.rpc,
    from: mock.from,
  },
}));

import {
  acceptFriendRequest,
  getFriendsAndInbox,
  removeFriend,
  sendFriendRequest,
  shareBank,
} from '../../services/socialService';
import { acceptChallenge, getMyChallenges, sendChallenge, submitChallengeScore } from '../../services/challenges';
import { updateCloudStreak } from '../../services/streak';

describe('social and challenge smoke flow', () => {
  beforeEach(() => {
    mock.reset();
    vi.clearAllMocks();
  });

  it('runs friend request -> share bank -> challenge end-to-end flow', async () => {
    mock.state.currentUserId = 'u1';
    await sendFriendRequest('bob');

    const friendshipId = mock.state.friendships[0]?.id;
    expect(friendshipId).toBeTruthy();

    mock.state.currentUserId = 'u2';
    await acceptFriendRequest(friendshipId);
    expect(mock.state.friendships[0]?.status).toBe('accepted');

    mock.state.currentUserId = 'u1';
    await shareBank(
      'u2',
      { id: 'bank-1', name: 'Demo Bank', createdAt: Date.now(), questionCount: 1 },
      [{ id: 'q1', question: 'Q1', options: ['A', 'B'], answer: 'A', type: 'single' }]
    );

    mock.state.currentUserId = 'u2';
    const { friends, inbox } = await getFriendsAndInbox();
    expect(friends.some((f) => f.status === 'accepted')).toBe(true);
    expect(inbox.length).toBe(1);

    mock.state.currentUserId = 'u1';
    const challengeId = await sendChallenge('u2', 'bank-1');
    expect(challengeId).toBeTruthy();

    mock.state.currentUserId = 'u2';
    await acceptChallenge(challengeId as string);
    const firstSubmit = await submitChallengeScore(challengeId as string, 0);
    expect(firstSubmit).toBe(true);

    mock.state.currentUserId = 'u1';
    const secondSubmit = await submitChallengeScore(challengeId as string, 3);
    expect(secondSubmit).toBe(true);

    const myChallenges = await getMyChallenges();
    expect(myChallenges[0]?.status).toBe('completed');
    expect(myChallenges[0]?.challengerScore).toBe(3);
    expect(myChallenges[0]?.opponentScore).toBe(0);
    expect(myChallenges[0]?.winnerId).toBe('u1');

    const streakOk = await updateCloudStreak();
    expect(streakOk).toBe(true);
    expect(mock.rpc).toHaveBeenCalledWith('update_streak');

    mock.state.currentUserId = 'u2';
    await removeFriend(friendshipId);
    expect(mock.state.friendships.length).toBe(0);
  });
});

