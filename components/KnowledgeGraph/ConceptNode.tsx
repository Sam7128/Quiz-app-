import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNodeData, NodeShapeType, ReadingMode, BackgroundOpacity } from '@/types/graphTypes';
import { isValidImageUrl } from '@/services/graphStorage';
import { NodeQuickMenu, type NodeQuickActions } from './NodeQuickMenu';

const FONT_SIZE_MAP = { sm: '0.75rem', md: '0.875rem', lg: '1rem' } as const;
const HEXAGON_POINTS = '0,60 42,0 158,0 200,60 158,120 42,120';
const CLOUD_PATH = 'M 20 76 C 8 65 13 47 28 43 C 29 26 47 16 63 23 C 74 8 100 9 110 25 C 128 11 153 20 154 38 C 175 34 190 47 185 63 C 199 75 190 96 171 98 C 160 113 138 112 125 101 C 112 115 89 116 78 102 C 63 112 41 106 39 91 C 26 93 17 86 20 76 Z';

function getSolidColor(color: string): string {
  return /^#[\da-f]{6}$/i.test(color) ? `${color}CC` : color;
}

interface ConceptNodeExtraData extends GraphNodeData {
  readingMode?: ReadingMode;
  expandLevel?: number; // 0=L1, 1=L2, 2=L3
  shapeType?: NodeShapeType;
  backgroundOpacity?: BackgroundOpacity;
  bgOpacity?: BackgroundOpacity | 'opaque';
  progressiveHasChildren?: boolean;
  progressiveBranchExpanded?: boolean;
  quickActions?: NodeQuickActions;
}

function isNodeShapeType(value: unknown): value is NodeShapeType {
  return value === 'concept'
    || value === 'square'
    || value === 'rounded'
    || value === 'pill'
    || value === 'circle'
    || value === 'diamond'
    || value === 'hexagon'
    || value === 'cloud';
}

const ConceptNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const nodeData = data as unknown as ConceptNodeExtraData;
  const fontSize = FONT_SIZE_MAP[nodeData.fontSize ?? 'md'];
  const readingMode = nodeData.readingMode ?? 'expand-all';
  const expandLevel = nodeData.expandLevel ?? 0;
  const shapeType = isNodeShapeType(nodeData.shapeType) ? nodeData.shapeType : 'concept';
  const isSolid = nodeData.backgroundOpacity === 'solid' || (nodeData.backgroundOpacity === undefined && nodeData.bgOpacity === 'opaque');
  const solidColor = getSolidColor(nodeData.color || '#3B82F6');
  const isDiamond = shapeType === 'diamond';
  const titleWeight = nodeData.bold === true || nodeData.fontWeight === 'bold' ? 'font-bold' : 'font-semibold';

  // In expand-all mode: show everything. In progressive: show based on expandLevel
  const showDefinition = readingMode === 'expand-all' || expandLevel >= 1;
  const showDetails = readingMode === 'expand-all' || expandLevel >= 2;

  // Contrast safe classes
  const textTitleClass = isSolid
    ? `${titleWeight} text-white break-words text-center`
    : `${titleWeight} text-slate-800 dark:text-slate-200 break-words text-center`;

  const textDefClass = isSolid
    ? 'text-white/80 text-xs mt-1 break-words text-center'
    : 'text-slate-500 dark:text-slate-400 text-xs mt-1 break-words text-center';

  const textDetailsClass = isSolid
    ? 'text-white/70 text-[10px] mt-1 break-words border-t border-white/20 pt-1 text-center'
    : 'text-slate-400 dark:text-slate-500 text-[10px] mt-1 break-words border-t border-slate-200 dark:border-slate-700 pt-1 text-center';

  const textPromptClass = isSolid
    ? 'text-white/60 text-[9px] mt-1 select-none text-center'
    : 'text-blue-500 dark:text-blue-400 text-[9px] mt-1 select-none text-center';
  const contentPrompt = expandLevel >= 2
    ? '點擊收合內容 ▾'
    : expandLevel === 1 && nodeData.details
      ? '點擊展開更多內容 ▸'
      : expandLevel === 0 && nodeData.definition
        ? '點擊展開內容 ▸'
        : '';
  const branchPrompt = nodeData.progressiveHasChildren
    ? nodeData.progressiveBranchExpanded ? '點擊收合分支 ▾' : '點擊展開下層 ▸'
    : '';
  const progressivePrompt = [contentPrompt, branchPrompt].filter(Boolean).join(' · ');

  if (isDiamond) {
    return (
      <div
        className={`relative w-[160px] h-[160px] flex items-center justify-center transition-all ${
          selected ? 'z-10' : ''
        }`}
        style={{
          filter: selected ? `drop-shadow(0 0 6px ${nodeData.color || '#3B82F6'})` : 'none',
        }}
      >
        <NodeQuickMenu selected={selected} shape={shapeType} actions={nodeData.quickActions} />
        {/* React Flow Handles - Bound to Top, Left, Bottom, Right of outer rectangle */}
        <Handle type="target" id="t" position={Position.Top} className="!w-2 !h-2" onClick={(event) => { event.stopPropagation(); nodeData.quickActions?.select(); }} />
        <Handle type="target" id="l" position={Position.Left} className="!w-2 !h-2" />
        <Handle type="source" id="b" position={Position.Bottom} className="!w-2 !h-2" onClick={(event) => { event.stopPropagation(); nodeData.quickActions?.select(); }} />
        <Handle type="source" id="r" position={Position.Right} className="!w-2 !h-2" />

        {/* Outer clip-path (border) */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            backgroundColor: nodeData.color || '#3B82F6',
          }}
        />

        {/* Inner clip-path (background and content container) */}
        <div
          className={`absolute inset-[2px] flex items-center justify-center p-6 ${
            isSolid ? '' : 'bg-slate-50/95 dark:bg-slate-900/95'
          }`}
          style={{
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
             backgroundColor: isSolid ? solidColor : `${nodeData.color || '#3B82F6'}15`,
          }}
        >
          <div className="w-[100px] text-center" style={{ fontSize }}>
            <p className={textTitleClass}>
              {nodeData.title || '未命名'}
            </p>
            {nodeData.imageUrl && isValidImageUrl(nodeData.imageUrl) && (
              <div className="max-w-[120px] mx-auto mt-1 overflow-hidden rounded border border-white/30">
                <img src={nodeData.imageUrl} alt={nodeData.title} className="w-full h-auto max-h-[120px] object-cover" />
              </div>
            )}
            {showDefinition && nodeData.definition && (
              <p className={textDefClass}>
                {nodeData.definition}
              </p>
            )}
            {showDetails && nodeData.details && (
              <p className={textDetailsClass}>
                {nodeData.details}
              </p>
            )}
            {readingMode === 'progressive' && progressivePrompt && (
              <p className={textPromptClass}>
                {progressivePrompt}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (shapeType === 'hexagon' || shapeType === 'cloud') {
    const isHexagon = shapeType === 'hexagon';
    const shapeColor = nodeData.color || '#3B82F6';
    const shapeBackground = isSolid ? solidColor : `${shapeColor}15`;

    return (
      <div
        className={`relative flex min-h-[120px] w-[190px] items-center justify-center transition-all ${
          selected ? 'z-10' : ''
        }`}
        style={{
          filter: selected ? `drop-shadow(0 0 6px ${shapeColor})` : 'none',
        }}
      >
        <NodeQuickMenu selected={selected} shape={shapeType} actions={nodeData.quickActions} />
        <Handle type="target" id="t" position={Position.Top} className="!z-20 !h-2 !w-2" onClick={(event) => { event.stopPropagation(); nodeData.quickActions?.select(); }} />
        <Handle type="source" id="b" position={Position.Bottom} className="!z-20 !h-2 !w-2" onClick={(event) => { event.stopPropagation(); nodeData.quickActions?.select(); }} />

        {isHexagon ? (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 200 120"
            preserveAspectRatio="none"
          >
            <polygon
              points={HEXAGON_POINTS}
              fill={shapeBackground}
              stroke={shapeColor}
              strokeLinejoin="round"
              strokeWidth="4"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 200 120"
            preserveAspectRatio="none"
          >
            <path
              d={CLOUD_PATH}
              fill={shapeBackground}
              stroke={shapeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}

        <div
          className={`relative z-10 px-1 text-center ${isHexagon ? 'w-[132px]' : 'w-[145px]'}`}
          style={{ fontSize }}
        >
          <p className={textTitleClass}>{nodeData.title || '未命名'}</p>
          {nodeData.imageUrl && isValidImageUrl(nodeData.imageUrl) && (
            <div className="mx-auto mt-1 max-w-[120px] overflow-hidden rounded border border-white/30">
              <img src={nodeData.imageUrl} alt={nodeData.title} className="h-auto max-h-[120px] w-full object-cover" />
            </div>
          )}
          {showDefinition && nodeData.definition && (
            <p className={textDefClass}>{nodeData.definition}</p>
          )}
          {showDetails && nodeData.details && (
            <p className={textDetailsClass}>{nodeData.details}</p>
          )}
          {readingMode === 'progressive' && progressivePrompt && (
            <p className={textPromptClass}>
              {progressivePrompt}
            </p>
          )}
        </div>
      </div>
    );
  }

  const shapeClassName = {
    concept: 'rounded-lg min-w-[120px]',
    square: 'rounded-lg w-36 min-h-32',
    rounded: 'rounded-2xl min-w-[140px]',
    pill: 'rounded-full min-w-[160px] min-h-16',
    circle: 'rounded-full w-40 min-h-40',
    hexagon: 'min-w-[170px] min-h-28',
    cloud: 'min-w-[170px] min-h-24',
    diamond: '',
  } satisfies Record<NodeShapeType, string>;

  return (
    <div className="relative">
      <NodeQuickMenu selected={selected} shape={shapeType} actions={nodeData.quickActions} />
      <div
      className={`relative flex flex-col justify-center px-4 py-2 border-2 shadow-sm transition-shadow ${shapeClassName[shapeType]} ${
        readingMode === 'expand-all' ? 'max-w-[320px]' : 'max-w-[200px]'
      } ${selected ? 'ring-2 ring-blue-400 shadow-lg' : ''} ${
        isSolid ? '' : 'bg-slate-50/90 dark:bg-slate-900/90'
      }`}
      style={{
        borderColor: nodeData.color || '#3B82F6',
         backgroundColor: isSolid ? solidColor : `${nodeData.color || '#3B82F6'}15`,
      }}
    >
      <Handle type="target" id="t" position={Position.Top} className="!w-2 !h-2" onClick={(event) => { event.stopPropagation(); nodeData.quickActions?.select(); }} />

      <div className="text-center" style={{ fontSize }}>
        <p className={textTitleClass}>
          {nodeData.title || '未命名'}
        </p>

        {nodeData.imageUrl && isValidImageUrl(nodeData.imageUrl) && (
          <div className="max-w-[120px] mx-auto mt-2 overflow-hidden rounded border border-slate-200/50 dark:border-slate-700/50">
            <img
              src={nodeData.imageUrl}
              alt={nodeData.title}
              className="w-full h-auto max-h-[120px] object-cover"
            />
          </div>
        )}

        {showDefinition && nodeData.definition && (
          <p className={textDefClass}>
            {nodeData.definition}
          </p>
        )}
        {showDetails && nodeData.details && (
          <p className={textDetailsClass}>
            {nodeData.details}
          </p>
        )}
        {readingMode === 'progressive' && progressivePrompt && (
          <p className={textPromptClass}>
            {progressivePrompt}
          </p>
        )}
      </div>
      <Handle type="source" id="b" position={Position.Bottom} className="!w-2 !h-2" onClick={(event) => { event.stopPropagation(); nodeData.quickActions?.select(); }} />
      </div>
    </div>
  );
});

ConceptNode.displayName = 'ConceptNode';
export default ConceptNode;
