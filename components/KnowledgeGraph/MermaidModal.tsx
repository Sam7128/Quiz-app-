import React, { useState, useMemo, useCallback } from 'react';
import { X, Copy } from 'lucide-react';
import { GRAPH_LIMITS } from '@/types/graphTypes';
import { mermaidToGraph } from '@/services/mermaidBridge';

export interface MermaidModalProps {
  mode: 'import' | 'export';
  onClose: () => void;
  onConfirmImport: (text: string, importMode: 'replace' | 'append') => void;
  initialText?: string;
}

export const MermaidModal: React.FC<MermaidModalProps> = ({
  mode,
  onClose,
  onConfirmImport,
  initialText = '',
}) => {
  const [mermaidText, setMermaidText] = useState(initialText);
  const [mermaidErrors, setMermaidErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [copiedConverter, setCopiedConverter] = useState(false);

  const handleCopyConverter = useCallback(() => {
    const mindmapContent = mermaidText.trim() ? mermaidText.trim() : '[在此貼上您的 mindmap 代碼]';
    const prompt = `請扮演資料結構與 Mermaid.js 專家。我有一段 Mermaid \`mindmap\` 格式的代碼，但我們的系統只支援標準的 flowchart 格式 (\`graph TD\` 或 \`graph LR\`)。
請幫我將這段 \`mindmap\` 代碼完全轉換為標準 flowchart 格式。

⚠️ 轉換與語法規則：
1. 必須以 \`graph TD\` 作為標頭。
2. 將心智圖的樹狀層級結構轉換為一對多的父子節點連線。例如：
   - 根節點連接到第一層節點。
   - 第一層節點分別連接到第二層子節點。
3. 語法要求：
   * 節點定義：必須使用「英文或數字的唯一 ID」搭配「括號包覆標題」，例如：\`root((中央核心主題))\`、\`node1[子主題A]\`、\`node2[子主題B]\`。
   * 連線：必須使用標準的單向箭頭連線，例如：\`root --> node1\`、\`node1 --> node1_1\`。
   * ID 命名：所有節點 ID 必須是英文或數字（如 A, B, node1, node2 等），不可包含特殊字元，不可直接使用中文作為 ID（中文應放在括號或方括號中，例如：A[中文名稱]）。
4. 嚴禁保留 \`mindmap\` 關鍵字、樹狀縮排、引號單獨成行等 mindmap 特有語法。所有節點必須有明確的 ID，並用 \`-->\` 進行連接。
5. 嚴禁使用 \`subgraph\`、\`style\`、\`classDef\`、\`click\` 等系統不支援的進階語法。

待轉換的 mindmap 代碼如下：
${mindmapContent}`;

    navigator.clipboard.writeText(prompt);
    setCopiedConverter(true);
    setTimeout(() => setCopiedConverter(false), 2000);
  }, [mermaidText]);

  const handleConfirm = useCallback(() => {
    const result = mermaidToGraph(mermaidText);
    if (!result.success) {
      setMermaidErrors(result.errors);
      return;
    }
    onConfirmImport(mermaidText, importMode);
  }, [mermaidText, importMode, onConfirmImport]);

  const importPreview = useMemo(() => {
    if (mode !== 'import' || !mermaidText.trim()) return null;
    const result = mermaidToGraph(mermaidText);
    return {
      nodes: result.nodes.length,
      edges: result.edges.length,
      errors: result.errors,
      success: result.success,
    };
  }, [mermaidText, mode]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white">
            {mode === 'export' ? '匯出 Mermaid' : '匯入 Mermaid'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" aria-label="關閉">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {mode === 'import' && (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-700 font-mono leading-relaxed space-y-1">
              <p className="font-semibold text-slate-600 dark:text-slate-300">語法範例：</p>
              <p>graph TD</p>
              <p>&nbsp;&nbsp;A[概念A] --&gt; B(概念B)</p>
              <p>&nbsp;&nbsp;B --&gt;|關聯| C&#123;決策&#125;</p>
              <p>&nbsp;&nbsp;A &lt;--&gt; C</p>
              <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2 text-slate-600 dark:text-slate-400 font-sans">
                <p className="text-amber-600 dark:text-amber-400 font-medium">⚠️ 系統不支援 mindmap 或其他非 flowchart 語法。</p>
                <p className="mt-1">若手邊為心智圖格式，可點選下方按鈕複製專用 AI 轉換提示詞：</p>
                <button
                  onClick={handleCopyConverter}
                  className="mt-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded font-semibold text-[10px] flex items-center gap-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                >
                  <Copy size={10} />
                  {copiedConverter ? '已複製轉換提示詞！' : '複製心智圖轉換提示詞'}
                </button>
              </div>
            </div>
          )}
          <textarea
            value={mermaidText}
            onChange={mode === 'import' ? (e) => setMermaidText(e.target.value.slice(0, GRAPH_LIMITS.MERMAID_INPUT_MAX)) : undefined}
            readOnly={mode === 'export'}
            rows={10}
            className="w-full p-3 text-xs font-mono border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none"
            placeholder={mode === 'import' ? '貼上 Mermaid flowchart 語法...' : ''}
          />
          {mermaidErrors.length > 0 && (
            <div className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
              {mermaidErrors.map((err, i) => (
                <p key={i}>⚠ {err}</p>
              ))}
            </div>
          )}
          {mode === 'import' && importPreview && (
            <div className="text-xs p-2 bg-slate-100 dark:bg-slate-700 rounded-lg space-y-1">
              <p className="font-medium text-slate-700 dark:text-slate-300">
                預覽：{importPreview.nodes} 個節點、{importPreview.edges} 條連線
              </p>
              {importPreview.errors.length > 0 && (
                <p className="text-amber-600 dark:text-amber-400">
                  ⚠ {importPreview.errors.length} 個警告
                </p>
              )}
              {!importPreview.success && (
                <p className="text-red-500">❌ 解析失敗，請檢查語法</p>
              )}
            </div>
          )}
          {mode === 'import' && (
            <div className="flex gap-3 text-xs">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="importMode" value="replace" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} className="accent-blue-500" />
                <span className="text-slate-600 dark:text-slate-300">取代目前圖表</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="importMode" value="append" checked={importMode === 'append'} onChange={() => setImportMode('append')} className="accent-blue-500" />
                <span className="text-slate-600 dark:text-slate-300">追加到目前圖表</span>
              </label>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2 justify-end">
          {mode === 'export' && (
            <button
              onClick={() => { navigator.clipboard.writeText(mermaidText); }}
              className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-500"
            >
              <Copy size={14} /> 複製
            </button>
          )}
          {mode === 'import' && (
            <button
              onClick={handleConfirm}
              disabled={!mermaidText.trim()}
              className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-500 disabled:opacity-50"
            >
              確認匯入
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
