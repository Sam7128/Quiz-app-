import React, { useState, useEffect } from 'react';
import { X, Save, Key, ExternalLink, Info } from 'lucide-react';
import { getAIConfig, saveAIConfig, AIConfig } from '../services/ai';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<AIConfig>({ apiKey: '', model: 'gemini-1.5-flash' });
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
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-800">
            <Key className="text-brand-600" size={20} />
            <h2 className="text-xl font-bold">系統設定</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                Gemini API 金鑰
              </label>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 uppercase tracking-wider"
              >
                獲取金鑰 <ExternalLink size={10} />
              </a>
            </div>
            <input 
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="貼上您的 API 金鑰 (例如: AIza...)"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-mono text-sm"
            />
            <div className="bg-amber-50 p-3 rounded-xl flex gap-3">
              <Info className="text-amber-500 shrink-0" size={16} />
              <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                您的金鑰將僅儲存在此瀏覽器的 LocalStorage 中。我們不會將您的金鑰上傳至任何伺服器。
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <label className="text-sm font-bold text-slate-700">模型選擇</label>
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
          </section>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
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
