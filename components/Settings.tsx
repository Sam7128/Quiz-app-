import React, { useState, useEffect } from 'react';
import { X, Save, Key, ExternalLink, Info, Server, Cpu } from 'lucide-react';
import { getAIConfig, saveAIConfig } from '../services/ai';
import { AIConfig } from '../types';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<AIConfig>({ 
    provider: 'google',
    apiKey: '', 
    model: 'gemini-1.5-flash',
    baseUrl: ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const existing = getAIConfig();
      if (existing) setConfig(existing);
    }
  }, [isOpen]);

  const handleSave = () => {
    saveAIConfig(config);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2 text-slate-800">
            <Key className="text-brand-600" size={20} />
            <h2 className="text-xl font-bold">系統設定</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Provider Selection */}
          <section className="space-y-3">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Server size={16} className="text-slate-400" /> AI 提供商
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfig({ ...config, provider: 'google', model: 'gemini-1.5-flash' })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  config.provider === 'google'
                    ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span className="font-bold text-sm">Google Gemini</span>
              </button>
              <button
                onClick={() => setConfig({ ...config, provider: 'nvidia', model: 'deepseek-ai/deepseek-v3.2', baseUrl: 'https://integrate.api.nvidia.com/v1' })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  config.provider === 'nvidia'
                    ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span className="font-bold text-sm">NVIDIA / OpenAI</span>
              </button>
            </div>
          </section>

          {/* API Key Input */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                API 金鑰
              </label>
              {config.provider === 'google' && (
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 uppercase tracking-wider"
                >
                  獲取 Google 金鑰 <ExternalLink size={10} />
                </a>
              )}
              {config.provider === 'nvidia' && (
                <a 
                  href="https://build.nvidia.com/explore/discover" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] text-green-600 hover:text-green-700 font-bold flex items-center gap-1 uppercase tracking-wider"
                >
                  獲取 NVIDIA 金鑰 <ExternalLink size={10} />
                </a>
              )}
            </div>
            <input 
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder={config.provider === 'google' ? "AIza..." : "nvapi-..."}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-mono text-sm"
            />
          </section>

          {/* Base URL (NVIDIA Only) */}
          {config.provider === 'nvidia' && (
            <section className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                Base URL
              </label>
              <input 
                type="text"
                value={config.baseUrl || ''}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                placeholder="https://integrate.api.nvidia.com/v1"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-mono text-sm"
              />
              <p className="text-[10px] text-slate-400">
                預設：https://integrate.api.nvidia.com/v1
              </p>
            </section>
          )}

          {/* Model Selection */}
          <section className="space-y-3">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Cpu size={16} className="text-slate-400" /> 模型名稱
            </label>
            {config.provider === 'google' ? (
              <select 
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-medium appearance-none"
              >
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (最新預覽)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (快速)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (精確但慢)</option>
                <option value="gemma-2-27b-it">Gemma 2 27B IT</option>
                <option value="gemma-3-27b-it">Gemma 3 27B IT (最新)</option>
              </select>
            ) : (
              <div className="space-y-2">
                 <input 
                  type="text"
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  placeholder="例如: deepseek-ai/deepseek-v3.2"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-mono text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setConfig({ ...config, model: 'deepseek-ai/deepseek-r1' })}
                    className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 font-medium transition-colors"
                  >
                    DeepSeek R1
                  </button>
                  <button 
                    onClick={() => setConfig({ ...config, model: 'deepseek-ai/deepseek-v3' })}
                    className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 font-medium transition-colors"
                  >
                    DeepSeek V3
                  </button>
                   <button 
                    onClick={() => setConfig({ ...config, model: 'meta/llama-3.1-405b-instruct' })}
                    className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 font-medium transition-colors"
                  >
                    Llama 3.1 405B
                  </button>
                   <button 
                    onClick={() => setConfig({ ...config, model: 'qwen/qwen3-next-80b-a3b-thinking' })}
                    className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 font-medium transition-colors"
                  >
                    Qwen 3 Next
                  </button>
                </div>
              </div>
            )}
          </section>

           <div className="bg-amber-50 p-3 rounded-xl flex gap-3">
              <Info className="text-amber-500 shrink-0" size={16} />
              <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                您的金鑰將僅儲存在此瀏覽器的 LocalStorage 中。我們不會將您的金鑰上傳至任何伺服器。
              </p>
            </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
          <button 
            onClick={handleSave}
            disabled={saved}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all shadow-md ${
              saved 
                ? 'bg-green-500 text-white shadow-green-200' 
                : 'bg-brand-600 text-white hover:bg-brand-500 shadow-brand-200 hover:-translate-y-0.5'
            }`}
          >
            {saved ? <><Save size={18} /> 已儲存！</> : <><Save size={18} /> 儲存變更</>}
          </button>
        </div>
      </div>
    </div>
  );
};
