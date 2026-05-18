import React from 'react';

interface ChunkCompleteSummaryProps {
  isOpen: boolean;
  chunkIndex: number;
  totalChunks: number;
  score: number;
  totalQuestions: number;
  hasNextChunk: boolean;
  wrongQuestionIds?: string[];
  onContinueNext: () => void;
  onRest: () => void;
  onReviewMistakes?: (wrongQuestionIds: string[]) => void;
}

export const ChunkCompleteSummary: React.FC<ChunkCompleteSummaryProps> = ({
  isOpen,
  chunkIndex,
  totalChunks,
  score,
  totalQuestions,
  hasNextChunk,
  wrongQuestionIds = [],
  onContinueNext,
  onRest,
  onReviewMistakes,
}) => {
  if (!isOpen) return null;

  const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const mistakeCount = wrongQuestionIds.length;

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-7 shadow-2xl transition-all transform animate-in fade-in zoom-in duration-300">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            🏆
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">
              第 {chunkIndex + 1} 階段完成
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              進度已保存（{Math.min(chunkIndex + 1, totalChunks)}/{totalChunks}）
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800/60">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">得分</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{score} <span className="text-sm font-semibold text-slate-400">/ {totalQuestions}</span></p>
          </div>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800/60">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">正確率</p>
            <p className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">{accuracy}%</p>
          </div>
        </div>

        {mistakeCount > 0 && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-500 dark:text-amber-400">💡</span>
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                本階段答錯了 {mistakeCount} 題，建議立即複習！
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-6">
          {mistakeCount > 0 && onReviewMistakes && (
            <button
              onClick={() => onReviewMistakes(wrongQuestionIds)}
              className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              📖 立即複習本段錯題 ({mistakeCount})
            </button>
          )}

          <div className="flex gap-2 w-full">
            <button
              onClick={onRest}
              className="flex-1 py-3.5 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all active:scale-95"
            >
              休息一下
            </button>
            {hasNextChunk ? (
              <button
                onClick={onContinueNext}
                className="flex-1 py-3.5 rounded-2xl text-sm font-extrabold text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-600/10 hover:-translate-y-0.5 active:scale-95 transition-all"
              >
                繼續下一階段
              </button>
            ) : (
              <button
                onClick={onRest}
                className="flex-1 py-3.5 rounded-2xl text-sm font-extrabold text-white bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/10 hover:-translate-y-0.5 active:scale-95 transition-all"
              >
                完成練習
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
