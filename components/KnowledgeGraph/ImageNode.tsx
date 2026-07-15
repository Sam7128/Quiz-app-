import React, { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from '@/types/graphTypes';
import { isSafeGraphImageDataUrl } from '@/services/graphImage';
import { NodeQuickMenu, type NodeQuickActions } from './NodeQuickMenu';

interface ImageNodeData extends GraphNodeData {
  quickActions?: NodeQuickActions;
}

const ImageNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const nodeData = data as unknown as ImageNodeData;
  return (
    <div className={`relative w-56 overflow-hidden rounded-2xl border-2 bg-white shadow-lg transition-shadow dark:bg-slate-900 ${selected ? 'border-cyan-400 ring-2 ring-cyan-300/50' : 'border-white/80 dark:border-slate-700'}`}>
      <NodeQuickMenu selected={selected} actions={nodeData.quickActions} />
      {isSafeGraphImageDataUrl(nodeData.imageDataUrl) ? (
        <img src={nodeData.imageDataUrl} alt={nodeData.imageAlt || nodeData.title || '參考圖片'} className="block max-h-72 w-full object-contain" draggable={false} />
      ) : (
        <div className="flex h-32 items-center justify-center text-xs text-slate-400">圖片無法顯示</div>
      )}
      <div className="truncate border-t border-slate-100 px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300" title={nodeData.title}>{nodeData.title || '參考圖片'}</div>
    </div>
  );
});

ImageNode.displayName = 'ImageNode';
export default ImageNode;
