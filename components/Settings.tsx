import React, { useState, useEffect } from 'react';
import { X, Save, Key, ExternalLink, Info, Server, Cpu, Sun, Moon, Monitor, Swords, Music, Volume2, AlertTriangle, Trash2, Coffee } from 'lucide-react';
import { getAIConfig, saveAIConfig } from '../services/ai';
import { AIConfig } from '../types';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { getUserSettings, saveUserSettings } from '../services/storage';
import { UserSettings } from '../types/battleTypes';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  gameMode?: boolean; // Optional to prevent breaking if not passed immediately, though typically will be
  onToggleGameMode?: () => void;
  onSystemNuke?: () => void;
}

import { useTheme } from '../contexts/ThemeContext';

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, gameMode, onToggleGameMode, onSystemNuke }) => {
  const { theme, setTheme } = useTheme();
  const { isBgmEnabled, isSfxEnabled, toggleBgm, toggleSfx } = useSoundEffects();
  const [config, setConfig] = useState<AIConfig>({
    provider: 'google',
    apiKey: '',
    model: 'gemini-1.5-flash',
    baseUrl: ''
  });
  const [userSettings, setUserSettings] = useState<UserSettings>({
    restBreakInterval: 20
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const existing = getAIConfig();
      if (existing) setConfig(existing);

      const settings = getUserSettings();
      setUserSettings(settings);
    }
  }, [isOpen]);

  const handleSave = () => {
    saveAIConfig(config);
    saveUserSettings(userSettings);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Key className="text-brand-600" size={20} />
            <h2 className="text-xl font-bold">系統設定</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors" aria-label="關閉設定">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Game Mode Toggle */}
          <section className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-purple-200 dark:shadow-none">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Swords size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">戰鬥模式 (Gamification)</h3>
                  <p className="text-[10px] text-purple-100 opacity-90">開啟 RPG 打怪體驗，增加學習樂趣</p>
                </div>
              </div>

              <button
                onClick={onToggleGameMode}
                aria-label={gameMode ? "關閉遊戲模式" : "開啟遊戲模式"}
                className={`w-12 h-7 rounded-full transition-colors relative ${gameMode ? 'bg-white/90' : 'bg-black/20'}`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full shadow-sm transition-all duration-300 ${gameMode ? 'left-6 bg-purple-600' : 'left-1 bg-white/80'}`} />
              </button>
            </div>
          </section>

          {/* Audio Settings mode */}
          <section className="space-y-3">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Swords size={16} className="text-slate-400" /> 音效設定
            </label>
            <div className="flex items-center gap-4">
              {/* BGM Toggle */}
              <button
                onClick={toggleBgm}
                className={`flex-1 p-3 rounded-xl border flex items-center justify-between transition-all ${isBgmEnabled
                  ? 'border-purple-500 bg-purple-50 text-purple-700 ring-1 ring-purple-500 dark:bg-purple-900/20 dark:text-purple-300'
                  : 'border-slate-200 dark:border-slate-600 text-slate-500'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">背景音樂</span>
                </div>
                <div className={`w-8 h-5 rounded-full relative transition-colors ${isBgmEnabled ? 'bg-purple-500' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isBgmEnabled ? 'left-4' : 'left-1'}`} />
                </div>
              </button>

              {/* SFX Toggle */}
              <button
                onClick={toggleSfx}
                className={`flex-1 p-3 rounded-xl border flex items-center justify-between transition-all ${isSfxEnabled
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500 dark:bg-indigo-900/20 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-600 text-slate-500'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">音效</span>
                </div>
                <div className={`w-8 h-5 rounded-full relative transition-colors ${isSfxEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isSfxEnabled ? 'left-4' : 'left-1'}`} />
                </div>
              </button>
            </div>
          </section>

          {/* Theme Toggle */}
          <section className="space-y-3">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              {theme === 'dark' ? <Moon size={16} className="text-indigo-500" /> : <Sun size={16} className="text-amber-500" />}
              主題模式
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${theme === 'light'
                  ? 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500'
                  : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
              >
                <Sun size={20} />
                <span className="font-bold text-xs">亮色</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${theme === 'dark'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                  : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
              >
                <Moon size={20} />
                <span className="font-bold text-xs">暗色</span>
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${theme === 'system'
                  ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                  : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
              >
                <Monitor size={20} />
                <span className="font-bold text-xs">系統</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {theme === 'system' ? '跟隨系統設定自動切換' : theme === 'dark' ? '深色模式已啟用' : '亮色模式已啟用'}
            </p>
          </section>

          {/* Rest Break Interval */}
          <section className="space-y-3">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Coffee size={16} className="text-amber-600" /> 休息站間隔
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[20, 30, 0].map((interval) => (
                <button
                  key={interval}
                  onClick={() => setUserSettings({ ...userSettings, restBreakInterval: interval })}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${userSettings.restBreakInterval === interval
                    ? 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500'
                    : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                >
                  <span className="font-bold text-sm">
                    {interval === 0 ? '關閉' : `${interval} 題`}
                  </span>
                </button>
              ))}
              <button
                onClick={() => {
                  // If not already custom (i.e. is one of the presets), default to 10 or keep current
                  const isPreset = [20, 30, 0].includes(userSettings.restBreakInterval);
                  if (isPreset) setUserSettings({ ...userSettings, restBreakInterval: 10 });
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${![20, 30, 0].includes(userSettings.restBreakInterval)
                  ? 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500'
                  : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
              >
                <span className="font-bold text-sm">自訂</span>
              </button>
            </div>

            {/* Custom Input */}
            {![20, 30, 0].includes(userSettings.restBreakInterval) && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="999"
                    aria-label="自訂休息間隔"
                    value={userSettings.restBreakInterval}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        setUserSettings({ ...userSettings, restBreakInterval: val });
                      }
                    }}
                    className="flex-1 p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-center"
                  />
                  <span className="text-sm font-bold text-slate-500">題後休息</span>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              每完成指定題數後，系統會提示您休息一下。
            </p>
          </section>
          {/* Provider Selection */}
          <section className="space-y-3">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Server size={16} className="text-slate-400" /> AI 提供商
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfig({ ...config, provider: 'google', model: 'gemini-1.5-flash' })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${config.provider === 'google'
                  ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                  : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
              >
                <span className="font-bold text-sm">Google Gemini</span>
              </button>
              <button
                onClick={() => setConfig({ ...config, provider: 'nvidia', model: 'deepseek-ai/deepseek-v3.2', baseUrl: 'https://integrate.api.nvidia.com/v1' })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${config.provider === 'nvidia'
                  ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                  : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
              >
                <span className="font-bold text-sm">NVIDIA / OpenAI</span>
              </button>
            </div>
          </section>

          {/* API Key Input */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
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
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-mono text-sm text-slate-900 dark:text-slate-100"
            />
          </section>

          {/* Base URL (NVIDIA Only) */}
          {config.provider === 'nvidia' && (
            <section className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                Base URL
              </label>
              <input
                type="text"
                value={config.baseUrl || ''}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                placeholder="https://integrate.api.nvidia.com/v1"
                className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-mono text-sm text-slate-900 dark:text-slate-100"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                預設：https://integrate.api.nvidia.com/v1
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg flex gap-2">
                <Info className="text-blue-500 shrink-0" size={12} />
                <p className="text-[9px] text-blue-700 dark:text-blue-300 leading-tight">
                  提示：整合 NVIDIA API 可能受 CORS 限制。建議填寫自定義 Proxy URL 或本地兼容的 OpenAI 端點 (如 LM Studio)。
                </p>
              </div>
            </section>
          )}

          {/* Model Selection */}
          <section className="space-y-3">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Cpu size={16} className="text-slate-400" /> 模型名稱
            </label>
            {config.provider === 'google' ? (
              <div className="space-y-2">
                <input
                  list="google-models"
                  type="text"
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  placeholder="輸入或選擇模型 (例如: gemini-1.5-flash)"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-mono text-sm text-slate-900 dark:text-slate-100"
                />
                <datalist id="google-models">
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemma-3-27b-it">Gemma 3 27B IT</option>
                </datalist>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setConfig({ ...config, model: 'gemini-1.5-flash' })}
                    className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md text-slate-600 dark:text-slate-400 font-medium transition-colors"
                  >
                    1.5 Flash
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, model: 'gemini-1.5-pro' })}
                    className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md text-slate-600 dark:text-slate-400 font-medium transition-colors"
                  >
                    1.5 Pro
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, model: 'gemini-2.0-flash' })}
                    className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md text-slate-600 dark:text-slate-400 font-medium transition-colors"
                  >
                    2.0 Flash
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  placeholder="例如: deepseek-ai/deepseek-v3.2"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-mono text-sm text-slate-900 dark:text-slate-100"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setConfig({ ...config, model: 'deepseek-ai/deepseek-r1' })}
                    className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md text-slate-600 dark:text-slate-400 font-medium transition-colors"
                  >
                    DeepSeek R1
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, model: 'deepseek-ai/deepseek-v3' })}
                    className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md text-slate-600 dark:text-slate-400 font-medium transition-colors"
                  >
                    DeepSeek V3
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, model: 'meta/llama-3.1-405b-instruct' })}
                    className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md text-slate-600 dark:text-slate-400 font-medium transition-colors"
                  >
                    Llama 3.1 405B
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, model: 'qwen/qwen3-next-80b-a3b-thinking' })}
                    className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md text-slate-600 dark:text-slate-400 font-medium transition-colors"
                  >
                    Qwen 3 Next
                  </button>
                </div>
              </div>
            )}
          </section>

          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl flex gap-3">
            <Info className="text-amber-500 shrink-0" size={16} />
            <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
              您的金鑰將僅儲存在此瀏覽器的 LocalStorage 中。我們不會將您的金鑰上傳至任何伺服器。
            </p>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-700" />

          {/* Danger Zone - The "Root Out" functionality */}
          <section className="space-y-4">
            <label className="text-sm font-bold text-red-500 flex items-center gap-2">
              <AlertTriangle size={16} /> 危險區域 (剷除數據)
            </label>
            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 space-y-3">
              <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                這裏的動作是不可逆的，執行前請三思。
              </p>

              <button
                onClick={onSystemNuke}
                className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group"
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-xs font-bold">徹底剷除所有本地數據</span>
                  <span className="text-[9px] opacity-70">包括題庫、資料夾與測驗紀錄</span>
                </div>
                <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </section>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <button
            onClick={handleSave}
            disabled={saved}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all shadow-md ${saved
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

export default React.memo(Settings);
