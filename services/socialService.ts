import { supabase } from './supabase';
import { BankMetadata, Friendship, Question, SharedBank, UserProfile } from '../types';

type FriendshipWithProfile = Friendship & { friend_profile?: UserProfile };
type SharedBankWithSender = SharedBank & { sender_profile?: UserProfile };

const requireUserId = async (): Promise<string> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('未登入');
  return user.id;
};

const loadProfilesMap = async (userIds: string[]): Promise<Record<string, UserProfile>> => {
  if (userIds.length === 0) return {};

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds);

  if (error) throw error;

  const map: Record<string, UserProfile> = {};
  (data || []).forEach((p) => {
    map[p.id] = p;
  });
  return map;
};

export const getFriendsAndInbox = async (): Promise<{
  friends: FriendshipWithProfile[];
  inbox: SharedBankWithSender[];
}> => {
  const userId = await requireUserId();

  // Friendships
  const { data: friendships, error: fError } = await supabase
    .from('friendships')
    .select('*')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  if (fError) throw fError;

  const friendIds = (friendships || []).map((f) => f.user_id === userId ? f.friend_id : f.user_id);
  const profilesMap = await loadProfilesMap(Array.from(new Set(friendIds)));

  const friends: FriendshipWithProfile[] = (friendships || []).map((f) => {
    const fid = f.user_id === userId ? f.friend_id : f.user_id;
    return { ...f, friend_profile: profilesMap[fid] };
  });

  // Inbox shares (pending by default)
  const inbox = await getSharedBanks('pending');

  return { friends, inbox };
};

const getSharedBanks = async (
  status: 'pending' | 'accepted' | 'rejected' = 'pending'
): Promise<SharedBankWithSender[]> => {
  const userId = await requireUserId();

  const { data: shares, error: sError } = await supabase
    .from('shared_banks')
    .select('*')
    .eq('receiver_id', userId)
    .eq('status', status);

  if (sError) throw sError;

  const senderIds = Array.from(new Set((shares || []).map((s) => s.sender_id)));
  const senderMap = await loadProfilesMap(senderIds);

  return (shares || []).map((s) => ({ ...s, sender_profile: senderMap[s.sender_id] }));
};

export const sendFriendRequest = async (username: string): Promise<void> => {
  const userId = await requireUserId();

  const targetUsername = username.trim();
  if (!targetUsername) throw new Error('請輸入用戶名稱');

  const { data: targetUser, error: uError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', targetUsername)
    .single();

  if (uError || !targetUser) throw new Error('找不到該用戶');
  if (targetUser.id === userId) throw new Error('不能加自己為好友');

  const { error: fError } = await supabase
    .from('friendships')
    .insert({
      user_id: userId,
      friend_id: targetUser.id,
      status: 'pending'
    });

  if (fError) {
    // Unique violation: request already exists
    if ((fError as { code?: string }).code === '23505') throw new Error('好友請求已存在');
    throw fError;
  }
};

export const acceptFriendRequest = async (friendshipId: string): Promise<void> => {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .eq('friend_id', userId);

  if (error) throw error;
};

export const removeFriend = async (friendshipId: string): Promise<void> => {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  if (error) throw error;
};

export const shareBank = async (receiverId: string, bank: BankMetadata, questions: Question[]): Promise<void> => {
  const userId = await requireUserId();

  const { error } = await supabase
    .from('shared_banks')
    .insert({
      sender_id: userId,
      receiver_id: receiverId,
      bank_snapshot: {
        meta: bank,
        questions
      },
      status: 'pending'
    });

  if (error) throw error;
};

export const setSharedBankStatus = async (
  shareId: string,
  status: 'accepted' | 'rejected'
): Promise<void> => {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('shared_banks')
    .update({ status })
    .eq('id', shareId)
    .eq('receiver_id', userId);

  if (error) throw error;
};
