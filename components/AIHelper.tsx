import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Send, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { askAI } from '../services/ai';
import { Question } from '../types';

interface AIHelperProps {
  question: Question;
  userAnswer?: string | string[];
}

interface Message {
  role: 'user' | 'ai';
  content: string;
}

export const AIHelper: React.FC<AIHelperProps> = ({ question, userAnswer }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await askAI(question, userMsg, userAnswer);
      setMessages(prev => [...prev, { role: 'ai', content: response }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Ask Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-indigo-600 text-white rounded-full text-sm font-bold shadow-lg shadow-brand-200 hover:scale-105 transition-transform"
      >
        <Sparkles size={16} className="animate-pulse" />
        詢問解題小助手
      </button>

      {/* Chat Panel */}
      {isOpen && createPortal(
        <div className="fixed inset-x-4 bottom-24 md:inset-auto md:bottom-8 md:right-8 md:w-96 md:h-[600px] max-h-[60vh] md:max-h-[80vh] bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden z-[100] animate-in slide-in-from-bottom-4 duration-300 font-sans">
          <div className="p-4 bg-gradient-to-r from-brand-600 to-indigo-600 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 font-bold">
              <Bot size={20} />
              <span>Gemma 3 助教</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="關閉對話框"
              title="關閉對話框"
            >
              <X size={20} />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 min-h-[200px]"
          >
            {messages.length === 0 && (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Bot size={24} />
                </div>
                <p className="text-sm text-slate-500 font-medium px-4">
                  你好！我是你的解題小助手。對這題有什麼不清楚的地方嗎？隨時問我！
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-none shadow-md'
                    : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none shadow-sm'
                  }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-600 flex items-center gap-2 shadow-sm">
                  <Loader2 size={16} className="animate-spin text-brand-600" />
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">正在思考中...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex gap-2 text-red-600 dark:text-red-300 items-start">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="text-xs font-medium">{error}</span>
              </div>
            )}
          </div>

          <div className="p-4 bg-white dark:bg-slate-700 border-t border-slate-100 dark:border-slate-700">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="輸入您的問題..."
                className="flex-1 bg-slate-100 dark:bg-slate-600 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-500 disabled:opacity-50 disabled:hover:bg-brand-600 transition-colors shadow-md shadow-brand-100"
                aria-label="發送訊息"
                title="發送訊息"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
