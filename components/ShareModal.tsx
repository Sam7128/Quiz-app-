import React, { useState, useEffect } from 'react';
import { X, Send, Users, Search, Check, Loader2, BookOpen, Share2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BankMetadata, Friendship, Question } from '../types';
import { getQuestions } from '../services/storage';
import { getCloudQuestions } from '../services/cloudStorage';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  bank: BankMetadata | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, bank }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchFriends();
    }
  }, [isOpen, user]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      // 1. Fetch Friendships
      const { data: friendships, error: fError } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user?.id},friend_id.eq.${user?.id}`)
        .eq('status', 'accepted');

      if (fError) throw fError;

      // 2. Fetch Profiles manually
      const friendIds = friendships.map(f => f.user_id === user?.id ? f.friend_id : f.user_id);
      
      let profilesMap: Record<string, any> = {};
      if (friendIds.length > 0) {
        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', friendIds);

        if (pError) throw pError;
        profiles?.forEach(p => profilesMap[p.id] = p);
      }

      // 3. Combine
      const processed = friendships.map(f => {
        const friendId = f.user_id === user?.id ? f.friend_id : f.user_id;
        return { ...f, friend_profile: profilesMap[friendId] };
      });
      setFriends(processed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (friendId: string) => {
    if (!bank || !user) return;
    setSharingId(friendId);

    try {
      // 1. Get questions (Priority: Cloud > Local)
      // Since user is logged in (checked above), we should try cloud first as that's where current data lives for logged-in users.
      let questions: Question[] = [];
      try {
          questions = await getCloudQuestions(bank.id);
      } catch (cloudErr) {
          console.warn("Cloud fetch failed, falling back to local for sharing", cloudErr);
          questions = getQuestions(bank.id);
      }
      
      // Fallback: If cloud returned empty but we have local data (edge case), try local
      if (questions.length === 0) {
          const localQ = getQuestions(bank.id);
          if (localQ.length > 0) questions = localQ;
      }

      if (questions.length === 0) {
          if (!confirm("此題庫似乎沒有題目 (0 題)。確定要傳送空題庫嗎？")) {
              setSharingId(null);
              return;
          }
      }

      const { error } = await supabase
        .from('shared_banks')
        .insert({
          sender_id: user.id,
          receiver_id: friendId,
          bank_snapshot: {
            meta: bank,
            questions: questions
          },
          status: 'pending'
        });

      if (error) throw error;
      
      alert(`已傳送題庫「${bank.name}」！`);
    } catch (err: any) {
      alert("分享失敗: " + err.message);
    } finally {
      setSharingId(null);
    }
  };

  if (!isOpen || !bank) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-800">
            <Share2 className="text-brand-600" size={20} />
            <h2 className="text-lg font-bold">分享題庫</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
             <div className="p-2 bg-white rounded-lg shadow-sm">
               <BookOpen className="text-brand-500" size={20} />
             </div>
             <div>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">正在分享</p>
               <p className="text-sm font-bold text-slate-800">{bank.name}</p>
             </div>
          </div>

          <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest">選擇好友</h3>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand-600" /></div>
            ) : friends.length === 0 ? (
              <p className="text-center py-8 text-sm text-slate-400 italic">尚未加入好友</p>
            ) : (
              friends.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm">
                      {f.friend_profile?.username?.[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-slate-700">{f.friend_profile?.username}</span>
                  </div>
                  <button 
                    onClick={() => handleShare(f.friend_id)}
                    disabled={sharingId !== null}
                    className="p-2 bg-brand-50 text-brand-600 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-brand-600 hover:text-white transition-all shadow-sm"
                  >
                    {sharingId === f.friend_id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
