import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge as RFEdge,
  type Node as RFNode,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { ArrowLeft, Copy, X, Eye } from 'lucide-react';

import type { GraphDocument, GraphNode, GraphEdge, GraphNodeData, ReadingMode, ArrowType, NodeShapeType } from '@/types/graphTypes';
import { GRAPH_LIMITS, DEFAULT_VIEW_STATE, DEFAULT_NODE_COLORS } from '@/types/graphTypes';
import { saveGraph } from '@/services/graphStorage';
import { graphToMermaid, mermaidToGraph } from '@/services/mermaidBridge';
import { parseMarkdownToGraph, graphToMarkdown } from '@/services/markdownGraphBridge';
import { applyRadialLayout } from '@/services/radialLayout';
import { useToast } from '@/contexts/ToastContext';

import ConceptNode from './ConceptNode';
import StickyNoteNode from './StickyNoteNode';
import { NodeEditPanel } from './NodeEditPanel';
import { GraphToolbar } from './GraphToolbar';
import { GraphNotesPanel, renameNoteKey } from './GraphNotesPanel';
import { NotesSearch } from './NotesSearch';
import { GraphCodeEditor } from './GraphCodeEditor';

// Convert our GraphNode → React Flow node
function toRFNode(node: GraphNode): RFNode {
  return {
    id: node.id,
    position: node.position,
    data: { ...node.data },
    type: node.type,
  };
}

// Convert our GraphEdge → React Flow edge
function toRFEdge(edge: GraphEdge): RFEdge {
  const rfEdge: RFEdge = {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: edge.animated,
  };

  switch (edge.arrowType) {
    case 'none':
      break;
    case 'both':
      rfEdge.markerStart = { type: MarkerType.ArrowClosed };
      rfEdge.markerEnd = { type: MarkerType.ArrowClosed };
      break;
    case 'arrow':
    default:
      rfEdge.markerEnd = { type: MarkerType.ArrowClosed };
      break;
  }

  return rfEdge;
}

// Convert back from React Flow nodes/edges to our types
function fromRFNodes(rfNodes: RFNode[]): GraphNode[] {
  return rfNodes.map((n) => {
    const data = n.data as unknown as GraphNodeData & { expandLevel?: number; readingMode?: ReadingMode; shapeType?: NodeShapeType };

    return {
      id: n.id,
      position: n.position,
      data: {
        title: data.title,
        definition: data.definition,
        details: data.details,
        color: data.color,
        fontSize: data.fontSize,
      },
      type: (n.type as GraphNode['type']) || 'concept',
    };
  });
}

function fromRFEdges(rfEdges: RFEdge[]): GraphEdge[] {
  return rfEdges.map((e) => {
    let arrowType: ArrowType = 'arrow';
    if (e.markerStart && e.markerEnd) arrowType = 'both';
    else if (!e.markerEnd && !e.markerStart) arrowType = 'none';

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === 'string' ? e.label : undefined,
      animated: e.animated,
      arrowType,
    };
  });
}

// ── Dagre auto-layout ──────────────────────────────────────────────

function applyDagreLayout(nodes: RFNode[], edges: RFEdge[], direction: 'TB' | 'LR' = 'TB'): RFNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80 });

  nodes.forEach((n) => g.setNode(n.id, { width: 160, height: 60 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - 80, y: pos.y - 30 } };
  });
}

// ── Undo/Redo ──────────────────────────────────────────────────────

interface HistoryState {
  nodes: RFNode[];
  edges: RFEdge[];
}

function useUndoRedo(initialNodes: RFNode[], initialEdges: RFEdge[]) {
  const [past, setPast] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);

  const pushState = useCallback((nodes: RFNode[], edges: RFEdge[]) => {
    setPast((p) => [...p.slice(-19), { nodes, edges }]);
    setFuture([]);
  }, []);

  return { past, future, setPast, setFuture, pushState };
}

// ── Node types ─────────────────────────────────────────────────────

const nodeTypes = {
  concept: ConceptNode,
  rounded: ConceptNode,
  diamond: ConceptNode,
  sticky: StickyNoteNode,
};

// ── Inner Editor (must be inside ReactFlowProvider) ────────────────

interface GraphEditorInnerProps {
  graph: GraphDocument;
  onBack: () => void;
  isMobile: boolean;
}

const GraphEditorInner: React.FC<GraphEditorInnerProps> = ({ graph, onBack, isMobile }) => {
  const readOnly = isMobile;
  const { fitView, zoomIn, zoomOut, screenToFlowPosition } = useReactFlow();
  const toast = useToast();

  // Initialise RF state from graph document
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes.map(toRFNode));
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges.map(toRFEdge));
  const [notesDict, setNotesDict] = useState<Record<string, string>>(graph.notes || {});
  const [activeSidePanel, setActiveSidePanel] = useState<'edit' | 'notes' | 'search' | null>(null);

  const [readingMode, setReadingMode] = useState<ReadingMode>(graph.viewState.readingMode);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [mermaidModal, setMermaidModal] = useState<'import' | 'export' | null>(null);
  const [mermaidText, setMermaidText] = useState('');
  const [mermaidErrors, setMermaidErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [copiedConverter, setCopiedConverter] = useState(false);

  // Dual mode editMode states
  const [editMode, setEditMode] = useState<'visual' | 'code'>(graph.editMode || 'visual');
  const [codeText, setCodeText] = useState<string>('');
  const [codeErrors, setCodeErrors] = useState<string[]>([]);

  const isReadOnlyMode = readOnly || editMode === 'code';

  // Load initial markdown if default mode is code
  useEffect(() => {
    if (graph.editMode === 'code') {
      const md = graphToMarkdown(graph.nodes, graph.edges);
      setCodeText(md);
    }
  }, [graph]);

  // Undo / Redo
  const { past, future, setPast, setFuture, pushState } = useUndoRedo(nodes, edges);

  // Autosave debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const doc: GraphDocument = {
      ...graph,
      nodes: fromRFNodes(nodes),
      edges: fromRFEdges(edges),
      notes: notesDict,
      editMode,
      viewState: { ...graph.viewState, readingMode },
      updatedAt: new Date().toISOString(),
    };
    const result = saveGraph(doc);
    if (!result.success && result.error) {
      toast.warning(result.error);
    }
  }, [graph, nodes, edges, notesDict, readingMode, editMode, toast]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushSave, 2000);
  }, [flushSave]);

  // Save on unmount, beforeunload, visibilitychange
  useEffect(() => {
    const handleBeforeUnload = () => flushSave();
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      flushSave();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [flushSave]);

  // Trigger save on node/edge/notes changes
  useEffect(() => { scheduleSave(); }, [nodes, edges, notesDict, readingMode, editMode]);

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

  // Dual mode transition handlers
  const handleToggleEditMode = useCallback(() => {
    setEditMode((prev) => {
      const nextMode = prev === 'visual' ? 'code' : 'visual';
      if (nextMode === 'code') {
        const md = graphToMarkdown(fromRFNodes(nodes), fromRFEdges(edges));
        setCodeText(md);
        setCodeErrors([]);
      }
      return nextMode;
    });
  }, [nodes, edges]);

  const handleCodeChange = useCallback((text: string) => {
    setCodeText(text);
    const { nodes: parsedNodes, edges: parsedEdges, errors } = parseMarkdownToGraph(text);
    if (errors.length === 0) {
      setCodeErrors([]);
      const rfParsedNodes = parsedNodes.map(toRFNode);
      const rfParsedEdges = parsedEdges.map(toRFEdge);
      const layoutedNodes = applyRadialLayout(rfParsedNodes, rfParsedEdges);
      
      setNodes((prevNodes) => {
        const prevConceptMap = new Map<string, GraphNode>();
        prevNodes.forEach(n => {
          if (n.type !== 'sticky') {
            const data = n.data as Partial<GraphNodeData>;
            const title = data.title || '';
            if (title) {
              prevConceptMap.set(title, n as unknown as GraphNode);
            }
          }
        });

        const restoredNodes = layoutedNodes.map(node => {
          const prevNode = prevConceptMap.get(node.data.title as string);
          if (prevNode) {
            return {
              ...node,
              type: prevNode.type,
              data: {
                ...node.data,
                definition: prevNode.data.definition,
                details: prevNode.data.details,
                color: prevNode.data.color,
                fontSize: prevNode.data.fontSize,
              }
            };
          }
          return node;
        });

        const stickyNodes = prevNodes.filter(n => n.type === 'sticky');
        return [...restoredNodes, ...stickyNodes];
      });
      setEdges(rfParsedEdges);
    } else {
      setCodeErrors(errors);
    }
  }, [setNodes, setEdges]);

  // ── Handlers ──────────────────────────────────────────────────

  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return;
      // Prevent self-loop
      if (params.source === params.target) return;
      if (edges.length >= GRAPH_LIMITS.MAX_EDGES) {
        toast.warning(`每張圖表最多只能有 ${GRAPH_LIMITS.MAX_EDGES} 條連線`);
        return;
      }

      pushState(nodes, edges);
      setEdges((eds) =>
        addEdge(
          { ...params, markerEnd: { type: MarkerType.ArrowClosed } },
          eds
        )
      );
    },
    [readOnly, nodes, edges, pushState, setEdges, toast]
  );

  const handleAddNode = useCallback(() => {
    if (readOnly) return;
    if (nodes.length >= GRAPH_LIMITS.MAX_NODES) {
      toast.warning(`每張圖表最多只能有 ${GRAPH_LIMITS.MAX_NODES} 個節點`);
      return;
    }
    pushState(nodes, edges);

    const id = `node-${crypto.randomUUID().slice(0, 8)}`;
    const colorIdx = nodes.length % DEFAULT_NODE_COLORS.length;
    // Place at viewport center
    const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const newNode: RFNode = {
      id,
      position: { x: center.x + (Math.random() - 0.5) * 40, y: center.y + (Math.random() - 0.5) * 40 },
      data: {
        title: '新概念',
        color: DEFAULT_NODE_COLORS[colorIdx],
        fontSize: 'md',
      },
      type: 'concept',
    };
    setNodes((nds) => [...nds, newNode]);
  }, [readOnly, nodes, edges, pushState, setNodes, screenToFlowPosition, toast]);

  const handleAddSticky = useCallback(() => {
    if (readOnly) return;
    const currentStickyCount = nodes.filter((n) => n.type === 'sticky').length;
    if (currentStickyCount >= GRAPH_LIMITS.MAX_STICKY_NOTES) {
      toast.warning(`每張圖表最多只能有 ${GRAPH_LIMITS.MAX_STICKY_NOTES} 個便利貼`);
      return;
    }
    if (nodes.length >= GRAPH_LIMITS.MAX_NODES) {
      toast.warning(`每張圖表最多只能有 ${GRAPH_LIMITS.MAX_NODES} 個節點`);
      return;
    }
    pushState(nodes, edges);

    const id = `node-${crypto.randomUUID().slice(0, 8)}`;
    const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const newSticky: RFNode = {
      id,
      position: { x: center.x + (Math.random() - 0.5) * 40, y: center.y + (Math.random() - 0.5) * 40 },
      data: {
        title: '備忘',
        label: '備忘',
      },
      type: 'sticky',
    };
    setNodes((nds) => [...nds, newSticky]);
  }, [readOnly, nodes, edges, pushState, setNodes, screenToFlowPosition, toast]);

  const handleDeleteSelected = useCallback(() => {
    if (readOnly) return;
    pushState(nodes, edges);
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => {
      const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
      return eds.filter((e) => !e.selected && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target));
    });
  }, [readOnly, nodes, edges, pushState, setNodes, setEdges]);

  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setFuture((f) => [...f, { nodes, edges }]);
    setPast((p) => p.slice(0, -1));
    setNodes(prev.nodes);
    setEdges(prev.edges);
  }, [past, nodes, edges, setPast, setFuture, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[future.length - 1];
    setPast((p) => [...p, { nodes, edges }]);
    setFuture((f) => f.slice(0, -1));
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [future, nodes, edges, setPast, setFuture, setNodes, setEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: RFNode) => {
    if (readingMode === 'progressive') {
      // Progressive mode: L1→L2→L3→collapse cycle
      const currentLevel = (node.data.expandLevel as number) ?? 0;
      const hasDefinition = !!(node.data.definition);
      const hasDetails = !!(node.data.details);
      const maxLevel = hasDetails ? 2 : hasDefinition ? 1 : 0;
      const nextLevel = currentLevel >= maxLevel ? 0 : currentLevel + 1;

      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, expandLevel: nextLevel } }
            : n
        )
      );
    }
    // Show property panel on click (all modes, desktop only)
    if (!readOnly) {
      setEditingNodeId(node.id);
      if (node.type === 'sticky' && activeSidePanel === 'notes') {
        setActiveSidePanel('edit');
      }
    }
  }, [readingMode, readOnly, activeSidePanel, setNodes]);

  // Double-click node: open edit panel (or focus title) on desktop only
  const handleNodeDoubleClick = useCallback((_: React.MouseEvent, node: RFNode) => {
    if (readOnly) return;
    if (node.type !== 'sticky') {
      setEditingNodeId(node.id);
    }
  }, [readOnly]);

  // Click on blank canvas: hide edit panel
  const handlePaneClick = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  const handleUpdateNodeData = useCallback((nodeId: string, dataUpdate: Partial<GraphNodeData>) => {
    if (readOnly) return;
    pushState(nodes, edges);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...dataUpdate } } : n
      )
    );
  }, [readOnly, nodes, edges, pushState, setNodes]);

  const handleUpdateNodeType = useCallback((nodeId: string, nodeType: NodeShapeType) => {
    if (readOnly) return;
    pushState(nodes, edges);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              type: nodeType,
            }
          : n
      )
    );
  }, [readOnly, nodes, edges, pushState, setNodes]);

  const handleToggleReadingMode = useCallback(() => {
    setReadingMode((m) => (m === 'expand-all' ? 'progressive' : 'expand-all'));
  }, []);

  // Edge label editing via double-click
  const handleEdgeDoubleClick = useCallback((_: React.MouseEvent, edge: RFEdge) => {
    if (readOnly) return;
    const currentLabel = typeof edge.label === 'string' ? edge.label : '';
    const newLabel = prompt('輸入連線標籤（留空清除）：', currentLabel);
    if (newLabel === null) return; // cancelled
    pushState(nodes, edges);
    setEdges((eds) =>
      eds.map((e) =>
        e.id === edge.id
          ? { ...e, label: newLabel.trim().slice(0, GRAPH_LIMITS.EDGE_LABEL_MAX) || undefined }
          : e
      )
    );
  }, [readOnly, nodes, edges, pushState, setEdges]);

  // Edge arrow type cycling via click
  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: RFEdge) => {
    if (readOnly) return;
    // Cycle: arrow → both → none → arrow
    pushState(nodes, edges);
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id !== edge.id) return e;
        const hasEnd = !!e.markerEnd;
        const hasStart = !!e.markerStart;
        if (hasEnd && !hasStart) {
          // arrow → both
          return { ...e, markerStart: { type: MarkerType.ArrowClosed }, markerEnd: { type: MarkerType.ArrowClosed } };
        } else if (hasEnd && hasStart) {
          // both → none
          return { ...e, markerStart: undefined, markerEnd: undefined };
        } else {
          // none → arrow
          return { ...e, markerStart: undefined, markerEnd: { type: MarkerType.ArrowClosed } };
        }
      })
    );
  }, [readOnly, nodes, edges, pushState, setEdges]);

  // Delete key protection: ignore when INPUT/TEXTAREA is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && !readOnly) {
        const tag = (document.activeElement as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') {
          e.stopPropagation();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [readOnly]);

  // ── Mermaid export/import ─────────────────────────────────────

  const handleExportMermaid = useCallback(() => {
    const graphNodes = fromRFNodes(nodes);
    const graphEdges = fromRFEdges(edges);
    const text = graphToMermaid(graphNodes, graphEdges, 'TD');
    setMermaidText(text);
    setMermaidErrors([]);
    setMermaidModal('export');
  }, [nodes, edges]);

  const handleImportMermaid = useCallback(() => {
    setMermaidText('');
    setMermaidErrors([]);
    setImportMode('replace');
    setMermaidModal('import');
  }, []);

  const handleConfirmImport = useCallback(() => {
    const result = mermaidToGraph(mermaidText);
    if (!result.success) {
      setMermaidErrors(result.errors);
      return;
    }
    if (result.errors.length > 0) {
      setMermaidErrors(result.errors);
    }

    pushState(nodes, edges);

    const rfNodes = result.nodes.map(toRFNode);
    const rfEdges = result.edges.map(toRFEdge);
    const layouted = applyDagreLayout(rfNodes, rfEdges, result.direction);
    const nextNodeCount = importMode === 'append' ? nodes.length + layouted.length : layouted.length;
    const nextEdgeCount = importMode === 'append' ? edges.length + rfEdges.length : rfEdges.length;

    if (nextNodeCount > GRAPH_LIMITS.MAX_NODES) {
      setMermaidErrors([`[全域限制] 匯入後節點數量 (${nextNodeCount}) 超過 ${GRAPH_LIMITS.MAX_NODES} 個上限`]);
      return;
    }

    if (nextEdgeCount > GRAPH_LIMITS.MAX_EDGES) {
      setMermaidErrors([`[全域限制] 匯入後連線數量 (${nextEdgeCount}) 超過 ${GRAPH_LIMITS.MAX_EDGES} 條上限`]);
      return;
    }

    if (importMode === 'append') {
      setNodes((nds) => [...nds, ...layouted]);
      setEdges((eds) => [...eds, ...rfEdges]);
    } else {
      setNodes(layouted);
      setEdges(rfEdges);
    }
    setMermaidModal(null);
  }, [mermaidText, nodes, edges, pushState, setNodes, setEdges, importMode]);

  // Preview stats for import
  const importPreview = useMemo(() => {
    if (!mermaidText.trim()) return null;
    const result = mermaidToGraph(mermaidText);
    return { nodes: result.nodes.length, edges: result.edges.length, errors: result.errors, success: result.success };
  }, [mermaidText]);

  // ── Inject reading mode data into nodes ────────────────────────

  const visibleNodes = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        readingMode,
        expandLevel: n.data.expandLevel ?? 0,
        shapeType: (n.type as NodeShapeType) ?? 'concept',
      },
    }));
  }, [readingMode, nodes]);

  // ── Editing node data ──────────────────────────────────────────

  const editingNode = editingNodeId ? nodes.find((n) => n.id === editingNodeId) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="返回圖表列表"
        >
          <ArrowLeft size={18} className="text-slate-600 dark:text-slate-400" />
        </button>
        <h2 className="font-bold text-sm text-slate-800 dark:text-white truncate flex-1">
          {graph.name}
        </h2>
        {readOnly && (
          <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full font-medium">
            唯讀模式
          </span>
        )}
      </div>

      {/* Toolbar (hidden on mobile) */}
      {!isMobile && (
        <GraphToolbar
          readingMode={readingMode}
          editMode={editMode}
          onToggleEditMode={handleToggleEditMode}
          onAddNode={handleAddNode}
          onAddSticky={handleAddSticky}
          onDeleteSelected={handleDeleteSelected}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={past.length > 0}
          canRedo={future.length > 0}
          onZoomIn={() => zoomIn()}
          onZoomOut={() => zoomOut()}
          onFitView={() => fitView({ padding: 0.2 })}
          onToggleReadingMode={handleToggleReadingMode}
          onExportMermaid={handleExportMermaid}
          onImportMermaid={handleImportMermaid}
          readOnly={isReadOnlyMode}
          connectMode={connectMode}
          onToggleConnectMode={() => setConnectMode((c) => !c)}
          onToggleSidePanel={(panel) => {
            setActiveSidePanel((current) => (current === panel ? null : panel));
          }}
          activeSidePanel={activeSidePanel}
          hasSelectedConcept={!!(editingNode && editingNode.type !== 'sticky')}
        />
      )}

      {/* Mobile reading mode toggle */}
      {isMobile && (
        <div className="flex items-center justify-end p-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={handleToggleReadingMode}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              readingMode === 'expand-all'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}
          >
            <Eye size={14} />
            {readingMode === 'expand-all' ? '全展開' : '逐步探索'}
          </button>
        </div>
      )}

      {/* Editor canvas + side panel */}
      <div className="flex-1 flex overflow-hidden">
        {editMode === 'code' && (
          <div className="w-1/3 min-w-[300px] border-r border-slate-200 dark:border-slate-700 h-full p-2 bg-slate-50 dark:bg-slate-900">
            <GraphCodeEditor
              value={codeText}
              onChange={handleCodeChange}
              errors={codeErrors}
            />
          </div>
        )}

        <div className="flex-1 relative">
          <ReactFlow
            nodes={visibleNodes}
            edges={edges}
            onNodesChange={isReadOnlyMode ? undefined : onNodesChange}
            onEdgesChange={isReadOnlyMode ? undefined : onEdgesChange}
            onConnect={isReadOnlyMode ? undefined : onConnect}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={isReadOnlyMode ? undefined : handleNodeDoubleClick}
            onEdgeClick={isReadOnlyMode ? undefined : handleEdgeClick}
            onEdgeDoubleClick={isReadOnlyMode ? undefined : handleEdgeDoubleClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            nodesDraggable={!isReadOnlyMode}
            nodesConnectable={!isReadOnlyMode}
            connectOnClick={connectMode && !isReadOnlyMode}
            elementsSelectable={!isReadOnlyMode}
            fitView
            deleteKeyCode={isReadOnlyMode ? null : 'Delete'}
            className="bg-slate-50 dark:bg-slate-900"
          >
            <Controls showInteractive={!isReadOnlyMode} />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          </ReactFlow>
        </div>

        {/* Side panel */}
        {editMode === 'visual' && activeSidePanel === 'search' && (
          <NotesSearch
            nodes={fromRFNodes(nodes)}
            notes={notesDict}
            onChangeNotes={setNotesDict}
            onSelectNode={(nodeId) => {
              setEditingNodeId(nodeId);
              const node = nodes.find((n) => n.id === nodeId);
              if (node && node.type !== 'sticky') {
                setActiveSidePanel('notes');
              } else {
                setActiveSidePanel('edit');
              }
            }}
            selectedNodeId={editingNodeId}
            onClose={() => setActiveSidePanel(null)}
          />
        )}

        {editMode === 'visual' && activeSidePanel === 'notes' && editingNode && editingNode.type !== 'sticky' && (
          <GraphNotesPanel
            nodeTitle={((editingNode.data.title || '') as string).trim()}
            notes={notesDict}
            onChangeNotes={setNotesDict}
            onClose={() => setActiveSidePanel(null)}
          />
        )}

        {editMode === 'visual' && (activeSidePanel === 'edit' || (!activeSidePanel && editingNode)) && editingNode && editingNode.type !== 'sticky' && (
          <NodeEditPanel
            nodeId={editingNode.id}
            data={editingNode.data as unknown as GraphNodeData}
            nodeType={(editingNode.type as NodeShapeType) ?? 'concept'}
            onUpdate={handleUpdateNodeData}
            onUpdateType={handleUpdateNodeType}
            onClose={() => setEditingNodeId(null)}
            readOnly={readOnly}
          />
        )}
      </div>

      {/* Mermaid modal */}
      {mermaidModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setMermaidModal(null)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                {mermaidModal === 'export' ? '匯出 Mermaid' : '匯入 Mermaid'}
              </h3>
              <button onClick={() => setMermaidModal(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" aria-label="關閉">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {mermaidModal === 'import' && (
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
                onChange={mermaidModal === 'import' ? (e) => setMermaidText(e.target.value.slice(0, GRAPH_LIMITS.MERMAID_INPUT_MAX)) : undefined}
                readOnly={mermaidModal === 'export'}
                rows={10}
                className="w-full p-3 text-xs font-mono border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none"
                placeholder={mermaidModal === 'import' ? '貼上 Mermaid flowchart 語法...' : ''}
              />
              {mermaidErrors.length > 0 && (
                <div className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                  {mermaidErrors.map((err, i) => (
                    <p key={i}>⚠ {err}</p>
                  ))}
                </div>
              )}
              {mermaidModal === 'import' && importPreview && (
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
              {mermaidModal === 'import' && (
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
              {mermaidModal === 'export' && (
                <button
                  onClick={() => { navigator.clipboard.writeText(mermaidText); }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-500"
                >
                  <Copy size={14} /> 複製
                </button>
              )}
              {mermaidModal === 'import' && (
                <button
                  onClick={handleConfirmImport}
                  disabled={!mermaidText.trim()}
                  className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-500 disabled:opacity-50"
                >
                  確認匯入
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Outer wrapper with ReactFlowProvider ────────────────────────────

interface GraphEditorProps {
  graph: GraphDocument;
  onBack: () => void;
}

export const GraphEditor: React.FC<GraphEditorProps> = ({ graph, onBack }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <ReactFlowProvider>
      <GraphEditorInner graph={graph} onBack={onBack} isMobile={isMobile} />
    </ReactFlowProvider>
  );
};
