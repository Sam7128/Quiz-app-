import React, { useState, useEffect, useRef, useMemo } from 'react';

interface GraphCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
}

export const GraphCodeEditor: React.FC<GraphCodeEditorProps> = ({
  value,
  onChange,
  errors = [],
}) => {
  const [localValue, setLocalValue] = useState<string>(value);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref tracking to bypass React closure traps during unmount flush
  const localValueRef = useRef(localValue);
  useEffect(() => {
    localValueRef.current = localValue;
  }, [localValue]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync with outer value when it changes externally (e.g. switching modes)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalValue(val);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      onChange(val);
    }, 500);
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Clean up debounce timer and flush pending change on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        onChangeRef.current(localValueRef.current);
      }
    };
  }, []);

  const lineCount = localValue.split('\n').length || 1;
  const lineNumbersText = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1).join('\n'),
    [lineCount]
  );

  return (
    <div className="flex flex-col h-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="w-12 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-600 py-3 pr-2 text-right select-none overflow-y-hidden border-r border-slate-100 dark:border-slate-800 font-mono text-sm leading-6 whitespace-pre"
        >
          {lineNumbersText}
        </div>

        {/* Textarea Editor */}
        <textarea
          value={localValue}
          onChange={handleChange}
          onScroll={handleScroll}
          className="flex-1 p-3 resize-none outline-none bg-transparent text-slate-900 dark:text-slate-100 font-mono text-sm leading-6 whitespace-pre overflow-x-auto overflow-y-auto"
          placeholder={"# 概念圖\n- 核心概念\n  - 子概念 1\n  - 子概念 2"}
          spellCheck={false}
        />
      </div>

      {/* 模式切換保留機制提示 */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border-t border-amber-100 dark:border-amber-900/50 p-2.5 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <svg
          className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1 leading-relaxed">
          <span className="font-bold">模式切換提示：</span>
           重命名父節點會重設其子分支樣式；建議在視覺編輯中重命名以保留樣式。切換回視覺模式時，系統仍會以祖先路徑與 Levenshtein 距離 ≤ 2 嘗試保留節點樣式。
        </div>
      </div>

      {/* Error & Warning Area */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border-t border-red-100 dark:border-red-900/50 p-3 max-h-32 overflow-y-auto">
          <div className="flex items-start gap-2">
            <svg
              className="w-4 h-4 text-red-500 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1 text-xs text-red-700 dark:text-red-400 font-mono">
              <div className="font-bold mb-1">語法解析錯誤：</div>
              <ul className="list-disc pl-4 space-y-1">
                {errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
