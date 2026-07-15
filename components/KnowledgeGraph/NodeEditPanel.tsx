import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Palette } from 'lucide-react';
import type { GraphNodeData, FontSize, NodeShapeType } from '@/types/graphTypes';
import { GRAPH_LIMITS, DEFAULT_NODE_COLORS } from '@/types/graphTypes';
import { isValidImageUrl } from '@/services/graphStorage';

interface NodeEditPanelProps {
  nodeId: string;
  data: GraphNodeData;
  nodeType: NodeShapeType | 'sticky' | 'image';
  onUpdate: (nodeId: string, data: Partial<GraphNodeData>) => void;
  onUpdateType: (nodeId: string, nodeType: NodeShapeType) => void;
  onClose: () => void;
  readOnly?: boolean;
}

export const NodeEditPanel: React.FC<NodeEditPanelProps> = ({
  nodeId, data, nodeType, onUpdate, onUpdateType, onClose, readOnly = false,
}) => {
  const isConcept = nodeType !== 'sticky' && nodeType !== 'image';
  const [title, setTitle] = useState(data.title);
  const [definition, setDefinition] = useState(data.definition || '');
  const [details, setDetails] = useState(data.details || '');
  const [imageUrl, setImageUrl] = useState(data.imageUrl || '');
  const [imageUrlError, setImageUrlError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when switching nodes
  useEffect(() => {
    setTitle(data.title);
    setDefinition(data.definition || '');
    setDetails(data.details || '');
    setImageUrl(data.imageUrl || '');
    setImageUrlError(null);
  }, [nodeId, data.title, data.definition, data.details, data.imageUrl]);

  const pendingUpdateRef = useRef<Partial<GraphNodeData>>({});

  const debouncedUpdate = useCallback((partial: Partial<GraphNodeData>) => {
    pendingUpdateRef.current = { ...pendingUpdateRef.current, ...partial };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate(nodeId, pendingUpdateRef.current);
      pendingUpdateRef.current = {};
    }, 300);
  }, [onUpdate, nodeId]);

  // Flush pending debounce on unmount
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.slice(0, GRAPH_LIMITS.TITLE_MAX);
    setTitle(v);
    if (v.trim()) debouncedUpdate(nodeType === 'sticky' ? { title: v.trim(), label: v.trim() } : { title: v.trim() });
  };

  const handleDefinitionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value.slice(0, GRAPH_LIMITS.DEFINITION_MAX);
    setDefinition(v);
    debouncedUpdate({ definition: v });
  };

  const handleDetailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value.slice(0, GRAPH_LIMITS.DETAILS_MAX);
    setDetails(v);
    debouncedUpdate({ details: v });
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.slice(0, GRAPH_LIMITS.IMAGE_URL_MAX);
    setImageUrl(v);
    if (!v) {
      setImageUrlError(null);
      debouncedUpdate({ imageUrl: undefined });
      return;
    }
    if (!isValidImageUrl(v)) {
      setImageUrlError('圖片網址必須以 http:// 或 https:// 開頭（僅支援安全 http/https 圖片網址）');
      return;
    }
    setImageUrlError(null);
    debouncedUpdate({ imageUrl: v });
  };

  return (
    <div className="w-72 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">編輯節點</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" aria-label="關閉編輯面板">
          <X size={16} />
        </button>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
          標題 ({title.length}/{GRAPH_LIMITS.TITLE_MAX})
        </label>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          disabled={readOnly}
          className="w-full p-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
          placeholder="概念名稱"
        />
      </div>

      {isConcept && (
        <>
          {/* Definition */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
              定義 ({definition.length}/{GRAPH_LIMITS.DEFINITION_MAX})
            </label>
            <textarea
              value={definition}
              onChange={handleDefinitionChange}
              disabled={readOnly}
              rows={2}
              className="w-full p-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 resize-y"
              placeholder="概念的定義"
            />
          </div>

          {/* Details */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
              詳情 ({details.length}/{GRAPH_LIMITS.DETAILS_MAX})
            </label>
            <textarea
              value={details}
              onChange={handleDetailsChange}
              disabled={readOnly}
              rows={3}
              className="w-full p-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 resize-y"
              placeholder="概念的詳細描述"
            />
          </div>

          {/* Image URL */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
              圖片網址 ({imageUrl.length}/{GRAPH_LIMITS.IMAGE_URL_MAX})
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={handleImageUrlChange}
              disabled={readOnly}
              className="w-full p-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              placeholder="https://example.com/image.png"
            />
            {imageUrlError && (
              <p className="text-[11px] text-red-600 dark:text-red-400" role="alert">
                {imageUrlError}
              </p>
            )}
          </div>
        </>
      )}

      {/* Color picker */}
      {!readOnly && nodeType !== 'image' && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Palette size={12} /> 節點顏色
          </label>
          <div className="flex gap-2 flex-wrap">
            {DEFAULT_NODE_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onUpdate(nodeId, { color, customColor: true })}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  data.color === color ? 'border-slate-800 dark:border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                aria-label={`選擇顏色 ${color}`}
              />
            ))}
          </div>
        </div>
      )}

      {!readOnly && isConcept && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">節點形狀</label>
          <div className="grid grid-cols-4 gap-1">
            {([
              { value: 'concept', label: '矩形' },
              { value: 'square', label: '方形' },
              { value: 'rounded', label: '圓角' },
              { value: 'pill', label: '膠囊' },
              { value: 'circle', label: '圓形' },
              { value: 'diamond', label: '菱形' },
              { value: 'hexagon', label: '六角' },
              { value: 'cloud', label: '雲形' },
            ] as const).map((shape) => (
              <button
                key={shape.value}
                onClick={() => onUpdateType(nodeId, shape.value)}
                className={`p-1.5 rounded text-xs font-medium transition-colors ${
                  nodeType === shape.value
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {shape.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Font size */}
      {!readOnly && nodeType !== 'image' && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">字體大小</label>
          <div className="grid grid-cols-3 gap-1">
            {(['sm', 'md', 'lg'] as FontSize[]).map((size) => (
              <button
                key={size}
                onClick={() => onUpdate(nodeId, { fontSize: size })}
                className={`p-1.5 rounded text-xs font-medium transition-colors ${
                  data.fontSize === size
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {size === 'sm' ? '小' : size === 'md' ? '中' : '大'}
              </button>
            ))}
          </div>
        </div>
      )}

      {!readOnly && nodeType !== 'image' && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">粗體</label>
          <button
            type="button"
            onClick={() => {
              // ponytail: retain fontWeight beside canonical bold for schema-v2 readers until the 2026-10-01 migration window closes.
              const bold = !(data.bold ?? data.fontWeight === 'bold');
              onUpdate(nodeId, { bold, fontWeight: bold ? 'bold' : 'normal' });
            }}
            className={`w-full p-1.5 rounded text-xs font-medium transition-colors ${
              (data.bold ?? data.fontWeight === 'bold')
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            B
          </button>
        </div>
      )}

      {nodeType === 'image' && (
        <p className="rounded-lg bg-cyan-50 p-2 text-xs leading-relaxed text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">
          圖片已壓縮並保存在圖表中，可直接在畫布拖曳到對應節點旁邊；登入後會隨圖表同步到雲端。
        </p>
      )}
    </div>
  );
};
