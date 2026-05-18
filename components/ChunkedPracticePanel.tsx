import React, { useMemo, useState } from 'react';

interface ChunkedPracticePanelProps {
  selectedBankCount: number;
  totalQuestions: number;
  chunkSizeOptions: readonly number[];
  defaultChunkSize?: number;
  isCreating?: boolean;
  onCreate: (chunkSize: number) => void;
  onClose: () => void;
}

export const ChunkedPracticePanel: React.FC<ChunkedPracticePanelProps> = ({
  selectedBankCount,
  totalQuestions,
  chunkSizeOptions,
  defaultChunkSize = 20,
  isCreating = false,
  onCreate,
  onClose,
}) => {
  const initial = chunkSizeOptions.includes(defaultChunkSize) ? defaultChunkSize : chunkSizeOptions[0];
  const [chunkSize, setChunkSize] = useState<number>(initial);

  const chunkCount = useMemo(() => {
    if (totalQuestions <= 0 || chunkSize <= 0) return 0;
    return Math.ceil(totalQuestions / chunkSize);
  }, [chunkSize, totalQuestions]);

  return (
    <div className="rounded-2xl border border-brand-200 dark:border-brand-700 bg-brand-50/60 dark:bg-brand-900/20 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-black text-brand-700 dark:text-brand-300">新建分階段練習</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            已選 {selectedBankCount} 個題庫，共 {totalQuestions} 題
          </p>
        </div>
        <button onClick={onClose} className="text-xs font-bold text-slate-500 dark:text-slate-400">
          收合
        </button>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
          每階段題數
          <select
            value={chunkSize}
            onChange={(event) => setChunkSize(Number(event.target.value))}
            className="block mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-2 text-sm"
          >
            {chunkSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} 題
              </option>
            ))}
          </select>
        </label>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          預估分成 <span className="font-black text-brand-600 dark:text-brand-400">{chunkCount}</span> 個階段
        </div>

        <button
          onClick={() => onCreate(chunkSize)}
          disabled={totalQuestions === 0 || isCreating}
          className="sm:ml-auto px-4 py-2 rounded-lg text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50"
        >
          {isCreating ? '建立中...' : '開始分階段練習'}
        </button>
      </div>
    </div>
  );
};
