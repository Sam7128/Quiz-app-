import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNodeData, NodeShapeType, ReadingMode } from '@/types/graphTypes';

const FONT_SIZE_MAP = { sm: '0.75rem', md: '0.875rem', lg: '1rem' } as const;

interface ConceptNodeExtraData extends GraphNodeData {
  readingMode?: ReadingMode;
  expandLevel?: number; // 0=L1, 1=L2, 2=L3
  shapeType?: NodeShapeType;
}

const ConceptNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const nodeData = data as unknown as ConceptNodeExtraData;
  const fontSize = FONT_SIZE_MAP[nodeData.fontSize ?? 'md'];
  const readingMode = nodeData.readingMode ?? 'expand-all';
  const expandLevel = nodeData.expandLevel ?? 0;
  const shapeType = nodeData.shapeType ?? 'concept';

  const shapeClassName = {
    concept: 'rounded-lg',
    rounded: 'rounded-full',
    diamond: 'rotate-45 rounded-[1.25rem]',
  } satisfies Record<NodeShapeType, string>;

  const contentClassName = shapeType === 'diamond' ? '-rotate-45' : '';

  // In expand-all mode: show everything. In progressive: show based on expandLevel
  const showDefinition = readingMode === 'expand-all' || expandLevel >= 1;
  const showDetails = readingMode === 'expand-all' || expandLevel >= 2;

  return (
    <div
      className={`px-4 py-2 border-2 shadow-sm min-w-[80px] transition-shadow ${shapeClassName[shapeType]} ${
        readingMode === 'expand-all' ? 'max-w-[320px]' : 'max-w-[200px]'
      } ${selected ? 'ring-2 ring-blue-400 shadow-lg' : ''}`}
      style={{
        borderColor: nodeData.color || '#3B82F6',
        backgroundColor: `${nodeData.color || '#3B82F6'}15`,
      }}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2" />
      <div className={`text-center ${contentClassName}`} style={{ fontSize }}>
        <p className="font-semibold text-slate-800 dark:text-slate-200 break-words">
          {nodeData.title || '未命名'}
        </p>
        {showDefinition && nodeData.definition && (
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 break-words">
            {nodeData.definition}
          </p>
        )}
        {showDetails && nodeData.details && (
          <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-1 break-words border-t border-slate-200 dark:border-slate-700 pt-1">
            {nodeData.details}
          </p>
        )}
        {readingMode === 'progressive' && (
          <p className="text-[9px] text-blue-400 mt-1 select-none">
            {expandLevel === 0 && nodeData.definition ? '點擊展開 ▸' : ''}
            {expandLevel === 1 && nodeData.details ? '點擊展開更多 ▸' : ''}
            {expandLevel >= 2 ? '點擊收合 ▾' : ''}
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2" />
    </div>
  );
});

ConceptNode.displayName = 'ConceptNode';
export default ConceptNode;
