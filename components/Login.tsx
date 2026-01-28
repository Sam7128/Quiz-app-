import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { BrainCircuit, Mail, Lock, User, ArrowRight, Loader2, LogIn } from 'lucide-react';

interface LoginProps {
  onGuestMode: () => void;
}

export const Login: React.FC<LoginProps> = ({ onGuestMode }) => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: username,
            }
          }
        });
        if (error) throw error;
        alert('註冊成功！請檢查電子郵件確認信（若有開啟驗證）或直接嘗試登入。');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || '認證過程中發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full">
        {/* Logo Area */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-brand-600 text-white rounded-2xl shadow-xl mb-4">
            <BrainCircuit size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">MindSpark</h1>
          <p className="text-slate-500 mt-2">您的 AI 學習個人雲端庫</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8">
            <div className="flex gap-4 mb-8">
              <button 
                onClick={() => setIsSignUp(false)}
                className={`flex-1 pb-2 font-bold transition-all border-b-2 ${!isSignUp ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400'}`}
              >
                登入
              </button>
              <button 
                onClick={() => setIsSignUp(true)}
                className={`flex-1 pb-2 font-bold transition-all border-b-2 ${isSignUp ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400'}`}
              >
                註冊
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">用戶名稱</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="如何稱呼您？"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">電子郵件</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    placeholder="email@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">密碼</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-200 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    <span>{isSignUp ? '建立帳號' : '立即登入'}</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
            <button 
              onClick={onGuestMode}
              className="text-slate-500 hover:text-brand-600 text-sm font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <LogIn size={16} /> 暫不登入，使用訪客模式
            </button>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-8">
          登入後您的題庫將會跨裝置同步並永久保存。
        </p>
      </div>
    </div>
  );
};
