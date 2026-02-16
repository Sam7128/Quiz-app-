import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Send, Inbox, Check, X, Clock, Search, BookOpen, Share2, Trash2, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRepository } from '../contexts/RepositoryContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import { Friendship, SharedBank, UserProfile } from '../types';
import { ChallengeList } from './ChallengeList';
import { ChallengeModal } from './ChallengeModal';
import { useChallenges } from '../hooks/useChallenges';
import { useQuiz } from '../contexts/QuizContext';
import { normalizeToUuid } from '../utils/uuid';
import { acceptFriendRequest, getFriendsAndInbox, removeFriend, sendFriendRequest, setSharedBankStatus } from '../services/socialService';

export const Social: React.FC = () => {
  const { startChallengeQuiz } = useQuiz();
  const { user } = useAuth();
  const repository = useRepository();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [inbox, setInbox] = useState<SharedBank[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);

  // Challenges hook
  const {
    challenges,
    loading: challengesLoading,
    pendingCount,
    refresh: refreshChallenges,
    accept: acceptChallenge,
    decline: declineChallenge
  } = useChallenges(!!user);

  useEffect(() => {
    if (user) {
      fetchSocialData();
    }
  }, [user]);

  const fetchSocialData = async () => {
    setLoading(true);
    try {
      const { friends: loadedFriends, inbox: loadedInbox } = await getFriendsAndInbox();
      setFriends(loadedFriends);
      setInbox(loadedInbox);

    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!searchEmail.trim()) return;
    setLoading(true);
    setMessage(null);

    try {
      await sendFriendRequest(searchEmail.trim());
      setMessage({ type: 'success', text: "好友請求已送出！" });
      setSearchEmail('');
      fetchSocialData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptFriend = async (friendshipId: string) => {
    try {
      await acceptFriendRequest(friendshipId);
      fetchSocialData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFriend = async (friendshipId: string, friendName: string) => {
    if (!await confirmDialog({ title: '刪除好友', message: `確定要刪除好友 ${friendName} 嗎？` })) return;
    try {
      await removeFriend(friendshipId);
      fetchSocialData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptBank = async (share: SharedBank) => {
    try {
      const { meta, questions } = share.bank_snapshot;
      // Create local bank
      const newBank = await repository.createBank(`${meta.name} (來自 ${share.sender_profile?.username})`);
      const normalized = questions.map((q) => ({ ...q, id: normalizeToUuid(q.id) }));
      await repository.saveQuestions(newBank.id, normalized);

      // Update status on cloud
      await setSharedBankStatus(share.id, 'accepted');

      toast.success(`已接受題庫：${meta.name}`);
      fetchSocialData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectBank = async (shareId: string) => {
    try {
      await setSharedBankStatus(shareId, 'rejected');
      fetchSocialData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-8">

        {/* Left: Friends List */}
        <div className="flex-1 space-y-6">
          <section className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 dark:border-white/5 overflow-hidden">
            <div className="p-6 border-b border-slate-100/50 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-lg">
                  <Users size={20} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">我的好友</h2>
              </div>
              <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-full">
                {friends.filter(f => f.status === 'accepted').length} 位好友
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="輸入好友帳號 (Username)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-slate-900 dark:text-slate-100"
                  />
                </div>
                <button
                  onClick={handleAddFriend}
                  disabled={loading}
                  className="bg-brand-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-brand-500 transition-all shadow-md shadow-brand-900/20 flex items-center gap-2"
                >
                  <UserPlus size={18} />
                  <span className="hidden sm:inline">新增</span>
                </button>
              </div>

              {message && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                  }`}>
                  {message.type === 'success' ? <Check size={14} /> : <X size={14} />}
                  {message.text}
                </div>
              )}

              <div className="space-y-2">
                {friends.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-slate-400 text-sm italic">尚無好友，開始新增吧！</p>
                  </div>
                ) : (
                  friends.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-lg">
                          {f.friend_profile?.username?.[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{f.friend_profile?.username}</p>
                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                            {f.status === 'accepted' ? '已成為好友' : '等待確認中...'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {f.status === 'pending' && f.friend_id === user?.id && (
                          <button
                            onClick={() => handleAcceptFriend(f.id)}
                            className="bg-brand-100 text-brand-600 p-2 rounded-lg hover:bg-brand-600 hover:text-white transition-all"
                            title="接受邀請"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteFriend(f.id, f.friend_profile?.username || '')}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="刪除好友/取消邀請"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Right: Inbox & Challenges */}
        <div className="w-full md:w-80 space-y-6">
          {/* Challenges Section */}
          <section className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 dark:border-white/5 overflow-hidden">
            <div className="p-6 border-b border-slate-100/50 dark:border-white/5 flex items-center justify-between bg-amber-50/50 dark:bg-amber-900/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                  <Trophy size={20} />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">好友挑戰</h2>
              </div>
              <div className="flex items-center gap-3">
                {pendingCount > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full animate-bounce shadow-lg shadow-red-500/30">
                    {pendingCount}
                  </span>
                )}
                <button
                  onClick={() => setIsChallengeModalOpen(true)}
                  className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
                  title="發起挑戰"
                >
                  <Trophy size={16} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {challengesLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-brand-600/30 border-t-brand-600 rounded-full animate-spin mx-auto" />
                </div>
              ) : (
                <ChallengeList
                  challenges={challenges}
                  currentUserId={user?.id || ''}
                  onAccept={acceptChallenge}
                  onDecline={declineChallenge}
                  onStartChallenge={(challengeId, bankId) => {
                    startChallengeQuiz(challengeId, bankId);
                  }}
                />
              )}
            </div>
          </section>

          {/* Inbox Section */}
          <section className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 dark:border-white/5 overflow-hidden">
            <div className="p-6 border-b border-slate-100/50 dark:border-white/5 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-900/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
                  <Inbox size={20} />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">題庫收件匣</h2>
              </div>
              {inbox.length > 0 && (
                <span className="w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full animate-bounce shadow-lg shadow-red-500/30">
                  {inbox.length}
                </span>
              )}
            </div>

            <div className="p-6 space-y-4">
              {inbox.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 text-slate-300 dark:text-slate-500 rounded-full flex items-center justify-center mx-auto">
                    <Clock size={24} />
                  </div>
                  <p className="text-slate-400 text-sm italic">目前沒有收到任何題庫</p>
                </div>
              ) : (
                inbox.map(share => (
                  <div key={share.id} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-100 dark:border-slate-600 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-bold">
                        {share.sender_profile?.username?.[0].toUpperCase()}
                      </div>
                      <p className="text-xs font-bold text-slate-600">
                        <span className="text-brand-600">{share.sender_profile?.username}</span> 傳送了
                      </p>
                    </div>
                    <div className="flex items-start gap-3 bg-white dark:bg-slate-600 p-3 rounded-xl border border-slate-200 dark:border-slate-500">
                      <BookOpen className="text-slate-400 shrink-0" size={18} />
                      <div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{share.bank_snapshot.meta.name}</p>
                        <p className="text-[10px] text-slate-500">{share.bank_snapshot.questions.length} 題</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptBank(share)}
                        className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-brand-500 transition-all shadow-md shadow-brand-900/20"
                      >
                        接受
                      </button>
                      <button
                        onClick={() => handleRejectBank(share.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        aria-label="拒絕"
                        title="拒絕"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Challenge Modal */}
      <ChallengeModal
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
        onChallengeSent={() => {
          refreshChallenges();
          setMessage({ type: 'success', text: '挑戰已發送！' });
        }}
      />
    </div>
  );
};

// export default React.memo(Social);
