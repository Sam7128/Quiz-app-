import React, { useState, useEffect } from 'react';
import { X, Trophy, UserPlus, Search, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Friendship, BankMetadata } from '../types';
import { getCloudBanks } from '../services/cloudStorage';
import { supabase } from '../services/supabase';
import { sendChallenge } from '../services/challenges';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChallengeSent: () => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  isOpen,
  onClose,
  onChallengeSent
}) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [banks, setBanks] = useState<BankMetadata[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load friends
      const { data: friendships, error: fError } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user?.id},friend_id.eq.${user?.id}`)
        .eq('status', 'accepted');

      if (fError) throw fError;

      // Get friend profiles
      const friendIds = friendships?.map(f => 
        f.user_id === user?.id ? f.friend_id : f.user_id
      ) || [];

      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', friendIds);

        const enrichedFriends = friendships?.map(f => {
          const friendId = f.user_id === user?.id ? f.friend_id : f.user_id;
          const profile = profiles?.find(p => p.id === friendId);
          return {
            ...f,
            friendProfile: profile
          };
        });

        setFriends(enrichedFriends || []);
      }

      // Load my banks
      const myBanks = await getCloudBanks();
      setBanks(myBanks);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendChallenge = async () => {
    if (!selectedFriend || !selectedBank) return;

    setLoading(true);
    const challengeId = await sendChallenge(selectedFriend, selectedBank);
    setLoading(false);

    if (challengeId) {
      onChallengeSent();
      onClose();
      // Reset state
      setStep(1);
      setSelectedFriend(null);
      setSelectedBank(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-700/50 shrink-0">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Trophy className="text-brand-600" size={20} />
            <h2 className="text-xl font-bold">發起挑戰</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-700 dark:text-slate-200">選擇好友</h3>
              
              {friends.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                  <UserPlus size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">你還沒有好友</p>
                  <p className="text-xs mt-1">先去添加一些好友吧！</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {friends.map((friend) => {
                    const friendId = friend.user_id === user?.id ? friend.friend_id : friend.user_id;
                    const profile = friend.friendProfile;
                    const isSelected = selectedFriend === friendId;

                    return (
                      <button
                        key={friend.id}
                        onClick={() => setSelectedFriend(friendId)}
                        className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 dark:border-brand-700'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-300 font-bold">
                          {profile?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-slate-700 dark:text-slate-200">{profile?.username || '未知用户'}</div>
                        </div>
                        {isSelected && <Check size={20} className="text-brand-600" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {friends.length > 0 && (
                <button
                  onClick={() => selectedFriend && setStep(2)}
                  disabled={!selectedFriend}
                  className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一步
                </button>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  ← 返回
                </button>
              </div>
              
              <h3 className="font-bold text-slate-700 dark:text-slate-200">選擇題庫</h3>
              
              {banks.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                  <Search size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">你還沒有題庫</p>
                  <p className="text-xs mt-1">先建立一些題庫吧！</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {banks.map((bank) => {
                    const isSelected = selectedBank === bank.id;

                    return (
                      <button
                        key={bank.id}
                        onClick={() => setSelectedBank(bank.id)}
                        className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 dark:border-brand-700'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex-1 text-left">
                          <div className="font-medium text-slate-700 dark:text-slate-200">{bank.name}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">{bank.questionCount} 題</div>
                        </div>
                        {isSelected && <Check size={20} className="text-brand-600" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {banks.length > 0 && (
                <button
                  onClick={handleSendChallenge}
                  disabled={!selectedBank || loading}
                  className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      發送中...
                    </>
                  ) : (
                    <>
                      <Trophy size={20} />
                      發起挑戰
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
