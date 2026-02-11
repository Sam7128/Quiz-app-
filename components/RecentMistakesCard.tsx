import React, { useState, useEffect } from 'react';
import { ClipboardList, Trash2, ChevronDown, ChevronUp, Play, X, Clock } from 'lucide-react';
import { RecentMistakeSession, MistakeDetail } from '../types/battleTypes';
import { useRepository } from '../contexts/RepositoryContext';
import { useConfirm } from '../hooks/useConfirm';

interface RecentMistakesCardProps {
    onPracticeSession?: (mistakes: MistakeDetail[]) => void;
    lastSessionTimestamp?: number; // Used to trigger refresh
}

export const RecentMistakesCard: React.FC<RecentMistakesCardProps> = ({ onPracticeSession, lastSessionTimestamp }) => {
    const confirmDialog = useConfirm();
    const repository = useRepository();
    const [sessions, setSessions] = useState<RecentMistakeSession[]>([]);
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

    useEffect(() => {
        setSessions(repository.getRecentMistakeSessions());
    }, [lastSessionTimestamp, repository]);

    const handleClearSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (await confirmDialog({ title: '刪除紀錄', message: '確定要刪除這筆紀錄嗎？' })) {
            repository.clearRecentMistakeSession(sessionId);
            setSessions(repository.getRecentMistakeSessions());
        }
    };

    const handleClearAll = async () => {
        if (await confirmDialog({ title: '清空紀錄', message: '確定要清空所有最近錯題紀錄嗎？' })) {
            repository.clearAllRecentMistakes();
            setSessions([]);
        }
    };

    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleString('zh-TW', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (sessions.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 opacity-60">
                <div className="flex items-center gap-2 mb-3">
                    <ClipboardList size={20} className="text-slate-400" />
                    <h3 className="text-slate-500 dark:text-slate-400 font-bold">最近 5 輪錯題</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                    目前暫無紀錄。完成測驗後，系統會自動將該輪的錯題記錄在此，方便您快速複習。
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-700 dark:text-slate-200 font-bold flex items-center gap-2">
                    <ClipboardList size={20} className="text-red-500" /> 最近 5 輪錯題
                </h3>
                <button
                    onClick={handleClearAll}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                    <Trash2 size={12} /> 清空全部
                </button>
            </div>

            <div className="space-y-3">
                {sessions.map((session) => (
                    <div
                        key={session.sessionId}
                        className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden transition-all"
                    >
                        {/* Header */}
                        <div
                            onClick={() => setExpandedSessionId(expandedSessionId === session.sessionId ? null : session.sessionId)}
                            className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${expandedSessionId === session.sessionId
                                ? 'bg-slate-50 dark:bg-slate-700/50'
                                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                                }`}
                        >
                            <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Clock size={12} />
                                    <span>{formatDate(session.timestamp)}</span>
                                </div>
                                <div className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate pr-2">
                                    {session.bankNames.join(', ') || '未知題庫'}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs font-bold px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                                    {session.mistakes.length} 題
                                </span>
                                {expandedSessionId === session.sessionId ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedSessionId === session.sessionId && (
                            <div className="bg-slate-50 dark:bg-slate-800/80 p-3 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex gap-2 mb-3">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPracticeSession?.(session.mistakes);
                                        }}
                                        className="flex-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <Play size={12} /> 練習此輪錯題
                                    </button>
                                    <button
                                        onClick={(e) => handleClearSession(e, session.sessionId)}
                                        className="px-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                        title="刪除此紀錄"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {session.mistakes.map((mistake, idx) => (
                                        <div key={idx} className="bg-white dark:bg-slate-700 p-2 rounded border border-slate-100 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300">
                                            <div className="font-bold mb-1 line-clamp-2">{idx + 1}. {mistake.questionText}</div>
                                            <div className="flex flex-col gap-0.5 mt-1 opacity-80">
                                                <div className="flex gap-1">
                                                    <span className="text-red-500 shrink-0">您的答案:</span>
                                                    <span className="truncate">{Array.isArray(mistake.userAnswer) ? mistake.userAnswer.join(', ') : mistake.userAnswer}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <span className="text-green-600 dark:text-green-400 shrink-0">正確答案:</span>
                                                    <span className="truncate">{Array.isArray(mistake.correctAnswer) ? mistake.correctAnswer.join(', ') : mistake.correctAnswer}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
