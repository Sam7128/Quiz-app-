import { useState, useCallback, useEffect, useRef } from 'react';
import { useNodesState, useEdgesState, addEdge, type Connection, type Edge as RFEdge, type Node as RFNode, MarkerType, useReactFlow, type OnConnectStartParams } from '@xyflow/react';
import type { GraphDocument, ReadingMode } from '@/types/graphTypes';
import { GRAPH_LIMITS, DEFAULT_NODE_COLORS } from '@/types/graphTypes';
import { toRFNode, toRFEdge } from '@/components/KnowledgeGraph/graphUtils';
import type { DropNodeType } from '@/components/KnowledgeGraph/DropNodeMenu';
import { useToast } from '@/contexts/ToastContext';
import {
  createDropConnection,
  cycleExpandLevel,
  getDropMenuPoint,
  toggleEdgeMarkers,
  toggleProgressiveBranch,
  type DropMenuState,
} from './graphStateUtils';
import { compressGraphImage, type GraphImageError } from '@/services/graphImage';

interface HistoryState { nodes: RFNode[]; edges: RFEdge[]; }

export function useGraphState(graph: GraphDocument, readOnly: boolean) {
  const { screenToFlowPosition } = useReactFlow();
  const toast = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>(graph.nodes.map(toRFNode));
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>(graph.edges.filter((edge) => edge.source !== edge.target).map(toRFEdge));
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [past, setPast] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);
  const [dropMenu, setDropMenu] = useState<DropMenuState | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<ReadonlySet<string>>(() => new Set());
  const connectionStartRef = useRef<OnConnectStartParams | null>(null);
  const connectionCompletedRef = useRef(false);
  const resetProgressiveBranches = useCallback(() => setExpandedNodeIds(new Set()), []);
  const pushState = useCallback((nds: RFNode[], eds: RFEdge[]) => { setPast((p) => [...p.slice(-19), { nodes: nds, edges: eds }]); setFuture([]); }, []);
  const handleAddNode = useCallback(() => {
    if (readOnly || nodes.length >= GRAPH_LIMITS.MAX_NODES) { if (!readOnly) toast.warning(`每張圖表最多只能有 ${GRAPH_LIMITS.MAX_NODES} 個節點`); return; }
    pushState(nodes, edges);
    const id = `node-${crypto.randomUUID().slice(0, 8)}`;
    const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    setNodes((nds) => [...nds, { id, position: { x: center.x + (Math.random() - 0.5) * 40, y: center.y + (Math.random() - 0.5) * 40 }, data: { title: '新概念', color: DEFAULT_NODE_COLORS[nds.length % DEFAULT_NODE_COLORS.length], fontSize: 'md' }, type: 'concept' }]);
  }, [readOnly, nodes, edges, pushState, setNodes, screenToFlowPosition, toast]);
  const handleAddSticky = useCallback(() => {
    if (readOnly) return;
    if (nodes.filter((n) => n.type === 'sticky').length >= GRAPH_LIMITS.MAX_STICKY_NOTES || nodes.length >= GRAPH_LIMITS.MAX_NODES) { toast.warning(nodes.length >= GRAPH_LIMITS.MAX_NODES ? `每張圖表最多只能有 ${GRAPH_LIMITS.MAX_NODES} 個節點` : `每張圖表最多只能有 ${GRAPH_LIMITS.MAX_STICKY_NOTES} 個便利貼`); return; }
    pushState(nodes, edges);
    const id = `node-${crypto.randomUUID().slice(0, 8)}`;
    const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    setNodes((nds) => [...nds, { id, position: { x: center.x + (Math.random() - 0.5) * 40, y: center.y + (Math.random() - 0.5) * 40 }, data: { title: '備忘', label: '備忘', color: '#fef08a', fontSize: 'md', bold: false }, type: 'sticky' }]);
  }, [readOnly, nodes, edges, pushState, setNodes, screenToFlowPosition, toast]);
  const handleAddImage = useCallback(async (file: File) => {
    if (readOnly) return;
    if (nodes.filter((node) => node.type === 'image').length >= GRAPH_LIMITS.MAX_IMAGE_NODES) { toast.warning(`每張圖表最多只能有 ${GRAPH_LIMITS.MAX_IMAGE_NODES} 張圖片`); return; }
    if (nodes.length >= GRAPH_LIMITS.MAX_NODES) { toast.warning(`每張圖表最多只能有 ${GRAPH_LIMITS.MAX_NODES} 個節點`); return; }
    const result = await compressGraphImage(file);
    if (!result.success) {
      const messages: Record<GraphImageError, string> = {
        'unsupported-type': '只支援 PNG、JPEG 或 WebP 圖片',
        'file-too-large': '原始圖片不可超過 6 MB',
        'compression-failed': '圖片讀取或壓縮失敗',
        'compressed-too-large': '圖片內容過大，請先裁切後再上傳',
      };
      toast.warning(messages[result.error]);
      return;
    }
    pushState(nodes, edges);
    const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const title = file.name.replace(/\.[^.]+$/, '').slice(0, GRAPH_LIMITS.TITLE_MAX) || '參考圖片';
    setNodes((current) => [...current, {
      id: `image-${crypto.randomUUID().slice(0, 8)}`,
      position: center,
      type: 'image',
      data: { title, imageAlt: title, imageDataUrl: result.dataUrl, color: '#64748B', fontSize: 'md' },
    }]);
  }, [readOnly, nodes, edges, pushState, screenToFlowPosition, setNodes, toast]);
  const handleDeleteSelected = useCallback(() => {
    if (readOnly) return;
    pushState(nodes, edges);
    const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected && !selectedIds.has(e.source) && !selectedIds.has(e.target)));
  }, [readOnly, nodes, edges, pushState, setNodes, setEdges]);
  const handleDeleteNode = useCallback((nodeId: string) => {
    if (readOnly) return;
    pushState(nodes, edges);
    setNodes((current) => current.filter((node) => node.id !== nodeId));
    setEdges((current) => current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setEditingNodeId((current) => current === nodeId ? null : current);
  }, [readOnly, nodes, edges, pushState, setNodes, setEdges]);
  const handleSelectNode = useCallback((nodeId: string) => {
    setNodes((current) => current.map((node) => ({ ...node, selected: node.id === nodeId })));
  }, [setNodes]);
  const handleAddChild = useCallback((parentId: string) => {
    if (readOnly || nodes.length >= GRAPH_LIMITS.MAX_NODES || edges.length >= GRAPH_LIMITS.MAX_EDGES) {
      if (!readOnly) toast.warning(nodes.length >= GRAPH_LIMITS.MAX_NODES ? `每張圖表最多只能有 ${GRAPH_LIMITS.MAX_NODES} 個節點` : `每張圖表最多只能有 ${GRAPH_LIMITS.MAX_EDGES} 條連線`);
      return;
    }
    const parent = nodes.find((node) => node.id === parentId);
    if (!parent) return;
    const childId = `node-${crypto.randomUUID().slice(0, 8)}`;
    const baseRadius = 220;
    const candidates = Array.from({ length: 12 }, (_, index) => {
      const theta = (index * Math.PI) / 6;
      return { x: parent.position.x + Math.cos(theta) * baseRadius, y: parent.position.y + Math.sin(theta) * baseRadius };
    });
    const position = candidates.reduce((best, candidate) => {
      const nearest = Math.min(...nodes.map((node) => Math.hypot(node.position.x - candidate.x, node.position.y - candidate.y)));
      return nearest > best.distance ? { position: candidate, distance: nearest } : best;
    }, { position: candidates[0], distance: -1 }).position;
    pushState(nodes, edges);
    setNodes((current) => [...current, { id: childId, position, type: 'concept', data: { title: '新概念', color: DEFAULT_NODE_COLORS[current.length % DEFAULT_NODE_COLORS.length], fontSize: 'md' } }]);
    setEdges((current) => [...current, { id: `edge-${crypto.randomUUID().slice(0, 8)}`, source: parentId, target: childId, sourceHandle: 'b', targetHandle: 't', markerEnd: { type: MarkerType.ArrowClosed } }]);
    setEditingNodeId(childId);
  }, [readOnly, nodes, edges, pushState, setNodes, setEdges, toast]);
  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setFuture((f) => [...f, { nodes, edges }]); setPast((p) => p.slice(0, -1)); setNodes(prev.nodes); setEdges(prev.edges);
  }, [past, nodes, edges, setNodes, setEdges]);
  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[future.length - 1];
    setPast((p) => [...p, { nodes, edges }]); setFuture((f) => f.slice(0, -1)); setNodes(next.nodes); setEdges(next.edges);
  }, [future, nodes, edges, setNodes, setEdges]);
  const onConnect = useCallback((params: Connection) => {
    if (readOnly || params.source === params.target) return;
    if (edges.length >= GRAPH_LIMITS.MAX_EDGES) { toast.warning(`每張圖表最多只能有 ${GRAPH_LIMITS.MAX_EDGES} 條連線`); return; }
    connectionCompletedRef.current = true;
    pushState(nodes, edges); setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds));
  }, [readOnly, nodes, edges, pushState, setEdges, toast]);
  const onConnectStart = useCallback((_: unknown, params: OnConnectStartParams) => { connectionStartRef.current = params; connectionCompletedRef.current = false; }, []);
  const clearDropMenu = useCallback(() => { setDropMenu(null); connectionStartRef.current = null; }, []);
  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    if (!connectionStartRef.current) return;
    if (connectionCompletedRef.current) { clearDropMenu(); connectionCompletedRef.current = false; return; }
    const point = getDropMenuPoint(event);
    if (!point) { clearDropMenu(); return; }
    const flowPosition = screenToFlowPosition({ x: point.clientX, y: point.clientY }); setDropMenu({ ...flowPosition, ...point });
  }, [clearDropMenu, screenToFlowPosition]);
  const handleCreateNodeAndConnect = useCallback((type: DropNodeType) => {
    const start = connectionStartRef.current;
    if (!start || !dropMenu || !start.nodeId) return;
    if (readOnly) { clearDropMenu(); return; }
    if (nodes.length >= GRAPH_LIMITS.MAX_NODES) { toast.warning(`每張圖表最多只能有 ${GRAPH_LIMITS.MAX_NODES} 個節點`); clearDropMenu(); return; }
    if (edges.length >= GRAPH_LIMITS.MAX_EDGES) { toast.warning(`每張圖表最多只能有 ${GRAPH_LIMITS.MAX_EDGES} 條連線`); clearDropMenu(); return; }
    const { node: newNode, edge: newEdge } = createDropConnection(type, { x: dropMenu.x, y: dropMenu.y }, start, nodes.length, DEFAULT_NODE_COLORS);
    pushState(nodes, edges); setNodes((current) => [...current, newNode]); setEdges((current) => [...current, newEdge]); clearDropMenu();
  }, [clearDropMenu, dropMenu, edges, nodes, pushState, readOnly, setEdges, setNodes, toast]);
  const handleNodeClick = useCallback((_: React.MouseEvent, node: RFNode, readingMode: ReadingMode) => {
    if (readingMode === 'progressive') {
      const currentLevel = typeof node.data.expandLevel === 'number' ? node.data.expandLevel : 0;
      const nextLevel = cycleExpandLevel(currentLevel, Boolean(node.data.definition), Boolean(node.data.details));
      if (nextLevel !== currentLevel) {
        setNodes((nds) => nds.map((n) => n.id === node.id ? { ...n, data: { ...n.data, expandLevel: nextLevel } } : n));
      }
      setExpandedNodeIds((current) => toggleProgressiveBranch(current, node.id, nodes, edges));
    }
    if (!readOnly) setEditingNodeId(node.id);
  }, [edges, nodes, readOnly, setNodes]);
  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: RFEdge) => { if (readOnly) return; pushState(nodes, edges); setEdges((eds) => eds.map((current) => current.id === edge.id ? toggleEdgeMarkers(current) : current)); }, [readOnly, nodes, edges, pushState, setEdges]);
  useEffect(() => {
    resetProgressiveBranches();
  }, [graph.id, resetProgressiveBranches]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Delete' && !readOnly) { const tag = (document.activeElement as HTMLElement)?.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA') e.stopPropagation(); } };
    document.addEventListener('keydown', handler, true); return () => document.removeEventListener('keydown', handler, true);
  }, [readOnly]);
  return { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, onConnect, editingNodeId, setEditingNodeId, connectMode, setConnectMode, past, future, expandedNodeIds, resetProgressiveBranches, handleAddNode, handleAddSticky, handleAddImage, handleAddChild, handleDeleteNode, handleSelectNode, handleDeleteSelected, handleUndo, handleRedo, handleNodeClick, handleEdgeClick, pushState, onConnectStart, onConnectEnd, dropMenu, clearDropMenu, handleCreateNodeAndConnect };
}
