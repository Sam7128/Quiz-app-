import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { BrainCircuit, Mail, Lock, User, ArrowRight, Loader2, LogIn, Sparkles } from 'lucide-react';

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
      // Basic Email Validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('請輸入有效的電子郵件格式');
      }

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
    <div className="min-h-screen flex bg-slate-50 dark:bg-brand-950 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-500/20 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
      </div>

      <div className="flex-1 flex flex-col md:flex-row max-w-[1920px] mx-auto w-full z-10">

        {/* Left Side - Brand Visuals */}
        <div className="md:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 text-center md:text-left relative">
          <div className="relative animate-float">
            <div className="absolute inset-0 bg-brand-500 blur-2xl opacity-30 rounded-full" />
            <div className="relative bg-gradient-to-br from-brand-600 to-accent-500 p-6 rounded-3xl shadow-2xl border border-white/10">
              <BrainCircuit size={64} className="text-white" />
            </div>
          </div>

          <h1 className="mt-8 text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Mind<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-accent-500">Spark</span>
          </h1>
          <p className="mt-4 text-xl md:text-2xl text-slate-600 dark:text-brand-100/60 font-medium max-w-md">
            您的 AI 學習個人雲端庫
          </p>

          <div className="mt-8 flex gap-3 flex-wrap justify-center md:justify-start opacity-75">
            {['智能題庫', '記憶曲線', '成就系統'].map((tag) => (
              <span key={tag} className="px-4 py-1.5 rounded-full bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-semibold backdrop-blur-sm dark:text-brand-100">
                <Sparkles size={14} className="inline mr-1 text-accent-500" />
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="md:w-1/2 flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-md bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden relative group">

            {/* Form Header */}
            <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100/50 dark:border-white/5">
              <div className="flex gap-2 p-1 bg-slate-100/50 dark:bg-black/20 rounded-xl mb-6 mx-auto w-fit">
                <button
                  onClick={() => setIsSignUp(false)}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${!isSignUp ? 'bg-white dark:bg-brand-600 shadow-md text-brand-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  登入
                </button>
                <button
                  onClick={() => setIsSignUp(true)}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${isSignUp ? 'bg-white dark:bg-brand-600 shadow-md text-brand-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  註冊
                </button>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {isSignUp ? '開始您的學習之旅' : '歡迎回來'}
              </h2>
            </div>

            {/* Form Body */}
            <div className="p-8 pt-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50/80 dark:bg-red-900/30 border border-red-100 dark:border-red-500/30 text-red-600 dark:text-red-200 text-sm rounded-2xl font-medium backdrop-blur-sm animate-pulse-slow">
                  {error}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-5">
                {isSignUp && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-brand-200 uppercase tracking-wider ml-1">用戶名稱</label>
                    <div className="relative group/input">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-brand-300/50 transition-colors group-focus-within/input:text-brand-500" size={20} />
                      <input
                        type="text"
                        placeholder="如何稱呼您？"
                        className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-brand-200/20"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required={isSignUp}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-brand-200 uppercase tracking-wider ml-1">電子郵件</label>
                  <div className="relative group/input">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-brand-300/50 transition-colors group-focus-within/input:text-brand-500" size={20} />
                    <input
                      type="email"
                      placeholder="email@example.com"
                      className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-brand-200/20"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-brand-200 uppercase tracking-wider ml-1">密碼</label>
                  <div className="relative group/input">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-brand-300/50 transition-colors group-focus-within/input:text-brand-500" size={20} />
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-brand-200/20"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                      <>
                        <span>{isSignUp ? '建立帳號' : '立即登入'}</span>
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="p-6 text-center border-t border-slate-100/50 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
              <button
                onClick={onGuestMode}
                className="text-slate-500 dark:text-brand-200/60 hover:text-brand-600 dark:hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                <LogIn size={16} /> 暫不登入，使用訪客模式
              </button>
            </div>

            {/* Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-500/10 to-transparent rounded-bl-full pointer-events-none" />
          </div>

          <p className="absolute bottom-6 text-center text-slate-400 dark:text-brand-200/30 text-xs mt-8">
            &copy; 2026 MindSpark. Designed for excellence.
          </p>
        </div>
      </div>
    </div>
  );
};
