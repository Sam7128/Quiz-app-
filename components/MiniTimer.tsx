import React from 'react';
import { Timer, Play, Pause } from 'lucide-react';

interface MiniTimerProps {
    isActive: boolean;
    timeLeft: number;
    onToggle: () => void;
}

export const MiniTimer: React.FC<MiniTimerProps> = ({ isActive, timeLeft, onToggle }) => {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-700 shadow-sm">
            <Timer className="w-4 h-4 text-red-400" />
            <span className={`font-mono text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                {formatTime(timeLeft)}
            </span>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className="ml-1 p-1 hover:bg-gray-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
                aria-label={isActive ? "Pause Timer" : "Start Timer"}
            >
                {isActive ? (
                    <Pause className="w-3 h-3 text-yellow-400" />
                ) : (
                    <Play className="w-3 h-3 text-green-400" />
                )}
            </button>
        </div>
    );
};
