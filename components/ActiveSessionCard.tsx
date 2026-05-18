import React from 'react';
import { ChunkedPracticeSession } from '../types/battleTypes';

interface ActiveSessionCardProps {
  session: ChunkedPracticeSession;
  onContinue: (sessionId: string) => void;
  onAbandon: (sessionId: string) => void;
}

const formatUpdatedAt = (value: number): string => {
  return new Date(value).toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatBankNames = (names: string[]): string => {
  if (names.length <= 2) return names.join('、');
  return `${names.slice(0, 2).join('、')} +${names.length - 2} 個`;
};

export const ActiveSessionCard: React.FC<ActiveSessionCardProps> = ({
  session,
  onContinue,
  onAbandon,
}) => {
  const completedChunks = session.chunks.filter((chunk) => chunk.status === 'completed').length;
  const totalChunks = session.chunks.length;
  const progress = totalChunks > 0 ? Math.round((completedChunks / totalChunks) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-100">
            {formatBankNames(session.bankNames)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {completedChunks}/{totalChunks} 階段完成
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            最後活動：{formatUpdatedAt(session.updatedAt)}
          </p>
        </div>
        <span className="text-xs font-black text-brand-600 dark:text-brand-400">{progress}%</span>
      </div>

      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-3">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-accent-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-end gap-2 mt-4">
        <button
          onClick={() => onAbandon(session.id)}
          className="px-3 py-2 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
        >
          放棄
        </button>
        <button
          onClick={() => onContinue(session.id)}
          className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-brand-600 hover:bg-brand-500"
        >
          繼續
        </button>
      </div>
    </div>
  );
};
