import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Settings, Volume2, VolumeX } from 'lucide-react';

interface FocusTimerProps {
  onSessionComplete?: (duration: number) => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ onSessionComplete }) => {
  const [focusTime, setFocusTime] = useState(25); // minutes
  const [breakTime, setBreakTime] = useState(5); // minutes
  const [timeLeft, setTimeLeft] = useState(focusTime * 60); // seconds
  const [isActive, setIsActive] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [completedSessions, setCompletedSessions] = useState(0);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      // Timer completed
      if (isFocusMode) {
        setCompletedSessions((prev) => prev + 1);
        if (onSessionComplete) {
          onSessionComplete(focusTime * 60);
        }
        if (soundEnabled) {
          playNotificationSound();
        }
      }
      
      // Switch modes
      setIsFocusMode(!isFocusMode);
      setTimeLeft(isFocusMode ? breakTime * 60 : focusTime * 60);
      setIsActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, isFocusMode, focusTime, breakTime, soundEnabled, onSessionComplete]);

  const playNotificationSound = () => {
    // Simple beep using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(isFocusMode ? focusTime * 60 : breakTime * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const saveSettings = () => {
    setTimeLeft(isFocusMode ? focusTime * 60 : breakTime * 60);
    setShowSettings(false);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-700 dark:text-slate-200 font-bold flex items-center gap-2">
          <span className="text-xl">🍅</span> 專注計時器
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title={soundEnabled ? '關閉聲音' : '開啟聲音'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="設定"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-300 mb-1 block">專注時間 (分鐘)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={focusTime}
                onChange={(e) => setFocusTime(Math.max(1, parseInt(e.target.value) || 25))}
                className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-300 mb-1 block">休息時間 (分鐘)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={breakTime}
                onChange={(e) => setBreakTime(Math.max(1, parseInt(e.target.value) || 5))}
                className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
          <button
            onClick={saveSettings}
            className="w-full py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 transition-colors"
          >
            儲存設定
          </button>
        </div>
      )}

      {/* Timer Display */}
      <div className="text-center py-6">
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mb-4 ${
          isFocusMode 
            ? 'bg-rose-100 text-rose-700' 
            : 'bg-emerald-100 text-emerald-700'
        }`}>
          <span className="text-lg">{isFocusMode ? '🎯' : '☕'}</span>
          {isFocusMode ? '專注模式' : '休息時間'}
        </div>
        
        <div className="text-6xl font-bold text-slate-800 dark:text-slate-100 font-mono tracking-tight mb-6">
          {formatTime(timeLeft)}
        </div>

        {/* Progress Ring */}
        <div className="relative w-48 h-48 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="#f1f5f9"
              strokeWidth="12"
              fill="none"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke={isFocusMode ? '#f43f5e' : '#10b981'}
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 88}
              strokeDashoffset={2 * Math.PI * 88 * (1 - timeLeft / (isFocusMode ? focusTime * 60 : breakTime * 60))}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={toggleTimer}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 ${
                isActive 
                  ? 'bg-slate-600 hover:bg-slate-700' 
                  : isFocusMode 
                    ? 'bg-rose-500 hover:bg-rose-600' 
                    : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              {isActive ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={resetTimer}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RotateCcw size={18} />
            <span className="text-sm font-medium">重置</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      {completedSessions > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            今日已完成 <span className="font-bold text-brand-600">{completedSessions}</span> 個專注時段
          </p>
        </div>
      )}
    </div>
  );
};
