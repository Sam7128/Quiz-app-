import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Send, Inbox, Check, X, Clock, Search, BookOpen, Share2, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Friendship, SharedBank, UserProfile, BankMetadata, Question } from '../types';
import { getQuestions, createBank, saveQuestions } from '../services/storage';

export const Social: React.FC = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [inbox, setInbox] = useState<SharedBank[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchSocialData();
    }
  }, [user]);

  const fetchSocialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Friendships
      const { data: friendships, error: fError } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user?.id},friend_id.eq.${user?.id}`);

      if (fError) throw fError;

      // 2. Fetch Profiles for these friendships
      // Extract all involved user IDs except me
      const friendIds = friendships.map(f => f.user_id === user?.id ? f.friend_id : f.user_id);
      
      let profilesMap: Record<string, UserProfile> = {};
      if (friendIds.length > 0) {
        const { data: profiles, error: pError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', friendIds);
          
        if (pError) throw pError;
        
        profiles?.forEach(p => {
          profilesMap[p.id] = p;
        });
      }

      // 3. Combine Data
      const processedFriends = friendships.map(f => {
        const friendId = f.user_id === user?.id ? f.friend_id : f.user_id;
        return { ...f, friend_profile: profilesMap[friendId] };
      });
      setFriends(processedFriends);

      // 4. Fetch Inbox
      const { data: shares, error: sError } = await supabase
        .from('shared_banks')
        .select('*')
        .eq('receiver_id', user?.id)
        .eq('status', 'pending');

      if (sError) throw sError;
      
      // 5. Fetch Senders for Inbox
      const senderIds = shares.map(s => s.sender_id);
      if (senderIds.length > 0) {
          const { data: senders } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', senderIds);
            
          const senderMap: Record<string, UserProfile> = {};
          senders?.forEach(s => senderMap[s.id] = s);
          
          setInbox(shares.map(s => ({ ...s, sender_profile: senderMap[s.sender_id] })));
      } else {
          setInbox([]);
      }

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
      // 1. Find user by email (using auth.users is restricted, usually we'd have a public profiles table indexed by email or use a function)
      // For this prototype, we'll assume we can search profiles if we had an email field there. 
      // Since our schema only has username, let's search by username.
      const { data: targetUser, error: uError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', searchEmail.trim())
        .single();

      if (uError || !targetUser) throw new Error("找不到該用戶");
      if (targetUser.id === user?.id) throw new Error("不能加自己為好友");

      const { error: fError } = await supabase
        .from('friendships')
        .insert({
          user_id: user?.id,
          friend_id: targetUser.id,
          status: 'pending'
        });

      if (fError) {
        if (fError.code === '23505') throw new Error("好友請求已存在");
        throw fError;
      }

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
      await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);
      fetchSocialData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFriend = async (friendshipId: string, friendName: string) => {
    if (!confirm(`確定要刪除好友 ${friendName} 嗎？`)) return;
    try {
      await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);
      fetchSocialData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptBank = async (share: SharedBank) => {
    try {
      const { meta, questions } = share.bank_snapshot;
      // Create local bank
      const newBank = createBank(`${meta.name} (來自 ${share.sender_profile?.username})`);
      saveQuestions(newBank.id, questions);

      // Update status on cloud
      await supabase
        .from('shared_banks')
        .update({ status: 'accepted' })
        .eq('id', share.id);

      alert(`已接受題庫：${meta.name}`);
      fetchSocialData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectBank = async (shareId: string) => {
    try {
      await supabase
        .from('shared_banks')
        .update({ status: 'rejected' })
        .eq('id', shareId);
      fetchSocialData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left: Friends List */}
        <div className="flex-1 space-y-6">
          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="text-brand-600" size={20} />
                <h2 className="text-lg font-bold text-slate-800">我的好友</h2>
              </div>
              <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
                {friends.filter(f => f.status === 'accepted').length}
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>
                <button 
                  onClick={handleAddFriend}
                  disabled={loading}
                  className="bg-brand-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-brand-500 transition-all shadow-md shadow-brand-100 flex items-center gap-2"
                >
                  <UserPlus size={18} />
                  <span className="hidden sm:inline">新增</span>
                </button>
              </div>

              {message && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
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
                    <div key={f.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100">
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

        {/* Right: Inbox */}
        <div className="w-full md:w-80 space-y-6">
          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-indigo-50/30">
              <div className="flex items-center gap-2">
                <Inbox className="text-indigo-600" size={20} />
                <h2 className="text-lg font-bold text-slate-800">題庫收件匣</h2>
              </div>
              {inbox.length > 0 && (
                <span className="w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full animate-bounce">
                  {inbox.length}
                </span>
              )}
            </div>

            <div className="p-6 space-y-4">
              {inbox.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                    <Clock size={24} />
                  </div>
                  <p className="text-slate-400 text-sm italic">目前沒有收到任何題庫</p>
                </div>
              ) : (
                inbox.map(share => (
                  <div key={share.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-bold">
                        {share.sender_profile?.username?.[0].toUpperCase()}
                      </div>
                      <p className="text-xs font-bold text-slate-600">
                        <span className="text-brand-600">{share.sender_profile?.username}</span> 傳送了
                      </p>
                    </div>
                    <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-200">
                      <BookOpen className="text-slate-400 shrink-0" size={18} />
                      <div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{share.bank_snapshot.meta.name}</p>
                        <p className="text-[10px] text-slate-500">{share.bank_snapshot.questions.length} 題</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAcceptBank(share)}
                        className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-brand-500 transition-all shadow-md shadow-brand-100"
                      >
                        接受
                      </button>
                      <button 
                        onClick={() => handleRejectBank(share.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
    </div>
  );
};
