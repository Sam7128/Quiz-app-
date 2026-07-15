import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  type Edge as RFEdge,
  ReactFlowProvider,
  BackgroundVariant,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Eye } from 'lucide-react';
import type { GraphDocument, GraphNodeData, ReadingMode, NodeShapeType, BackgroundOpacity, LayoutMode, GraphThemePresetId } from '@/types/graphTypes';
import { GRAPH_LIMITS } from '@/types/graphTypes';
import { useToast } from '@/contexts/ToastContext';
import { useGraphState } from '@/hooks/useGraphState';
import { useGraphCodeMode } from '@/hooks/useGraphCodeMode';
import { useGraphStorage } from '@/hooks/useGraphStorage';
import { fromRFNodes, fromRFEdges, applyAutoLayout, toRFNode, toRFEdge } from './graphUtils';
import { graphToMermaid, mermaidToGraph } from '@/services/mermaidBridge';
import { applyRadialLayoutPreservingSticky } from '@/services/radialLayout';
import { applyGraphThemePreset } from '@/utils/graphColorHelper';
import { getProgressiveVisibleNodeIds, resetProgressiveExpandLevels } from '@/hooks/graphStateUtils';
import ConceptNode from './ConceptNode';
import StickyNoteNode from './StickyNoteNode';
import { NodeEditPanel } from './NodeEditPanel';
import { GraphToolbar } from './GraphToolbar';
import { GraphNotesPanel } from './GraphNotesPanel';
import { NotesSearch } from './NotesSearch';
import { GraphCodeEditor } from './GraphCodeEditor';
import { MermaidModal } from './MermaidModal';
import { DropNodeMenu } from './DropNodeMenu';
import ImageNode from './ImageNode';
const nodeTypes = {
  concept: ConceptNode,
  square: ConceptNode,
  rounded: ConceptNode,
  pill: ConceptNode,
  circle: ConceptNode,
  diamond: ConceptNode,
  hexagon: ConceptNode,
  cloud: ConceptNode,
  sticky: StickyNoteNode,
  image: ImageNode,
};
interface GraphEditorInnerProps {
  graph: GraphDocument;
  onBack: () => void;
  isMobile: boolean;
}
const GraphEditorInner: React.FC<GraphEditorInnerProps> = ({ graph, onBack, isMobile }) => {
  const readOnly = isMobile;
  const toast = useToast();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const {
    nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, onConnect,
    editingNodeId, setEditingNodeId, connectMode, setConnectMode, past, future,
    handleAddNode, handleAddSticky, handleAddImage, handleAddChild, handleDeleteNode, handleSelectNode,
    handleDeleteSelected, handleUndo, handleRedo, handleNodeClick, handleEdgeClick, pushState,
    onConnectStart, onConnectEnd, dropMenu, clearDropMenu, handleCreateNodeAndConnect,
    expandedNodeIds, resetProgressiveBranches,
  } = useGraphState(graph, readOnly);
  const [notesDict, setNotesDict] = useState<Record<string, string>>(graph.notes || {});
  const [activeSidePanel, setActiveSidePanel] = useState<'edit' | 'notes' | 'search' | null>(null);
  const [readingMode, setReadingMode] = useState<ReadingMode>(graph.viewState.readingMode);
  const [bgOpacity, setBgOpacity] = useState<BackgroundOpacity>(graph.backgroundOpacity);
  const [layoutMode, setLayoutMode] = useState(graph.layoutMode);
  const [theme, setTheme] = useState<GraphThemePresetId>(graph.theme);
  const [mermaidModal, setMermaidModal] = useState<'import' | 'export' | null>(null);
  const {
    editMode, codeText, codeErrors, handleToggleEditMode, handleCodeChange
  } = useGraphCodeMode(graph, nodes, edges, notesDict, setNodes, setEdges, setNotesDict);
  useGraphStorage(graph, nodes, edges, notesDict, readingMode, editMode, bgOpacity, layoutMode, theme);
  const isReadOnlyMode = readOnly || editMode === 'code';
  const handleUpdateNodeData = useCallback((nodeId: string, dataUpdate: Partial<GraphNodeData>) => {
    if (readOnly) return;
    if (dataUpdate.title !== undefined) {
      const oldNode = nodes.find((n) => n.id === nodeId);
      const oldNodeData = oldNode?.data as Record<string, unknown> | undefined;
      const oldTitle = typeof oldNodeData?.title === 'string' ? oldNodeData.title : undefined;
      const newTitle = dataUpdate.title;
      if (oldTitle && newTitle && oldTitle !== newTitle) {
        setNotesDict((prev) => {
          const updated = { ...prev };
          if (updated[oldTitle] !== undefined) {
            updated[newTitle] = updated[oldTitle];
            delete updated[oldTitle];
          }
          return updated;
        });
      }
    }
    pushState(nodes, edges);
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...dataUpdate } } : n));
  }, [readOnly, nodes, edges, pushState, setNodes]);
  const handleUpdateNodeType = useCallback((nodeId: string, nodeType: NodeShapeType) => {
    if (readOnly) return;
    pushState(nodes, edges);
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, type: nodeType } : n));
  }, [readOnly, nodes, edges, pushState, setNodes]);
  const handleEdgeDoubleClick = useCallback((_: React.MouseEvent, edge: RFEdge) => {
    if (readOnly) return;
    const currentLabel = typeof edge.label === 'string' ? edge.label : '';
    const newLabel = prompt('輸入連線標籤（留空清除）：', currentLabel);
    if (newLabel === null) return;
    pushState(nodes, edges);
    setEdges((eds) => eds.map((e) => e.id === edge.id ? { ...e, label: newLabel.trim().slice(0, GRAPH_LIMITS.EDGE_LABEL_MAX) || undefined } : e));
  }, [readOnly, nodes, edges, pushState, setEdges]);
  const handleConfirmImport = useCallback((mermaidText: string, importMode: 'replace' | 'append') => {
    const result = mermaidToGraph(mermaidText);
    if (!result.success) return;
    pushState(nodes, edges);
    const rfNodes = result.nodes.map(toRFNode);
    const rfEdges = result.edges.map(toRFEdge);
    const layouted = applyAutoLayout(rfNodes, rfEdges);
    const nextNodeCount = importMode === 'append' ? nodes.length + layouted.length : layouted.length;
    const nextEdgeCount = importMode === 'append' ? edges.length + rfEdges.length : rfEdges.length;
    if (nextNodeCount > GRAPH_LIMITS.MAX_NODES) {
      toast.warning(`[全域限制] 匯入後節點數量 (${nextNodeCount}) 超過 ${GRAPH_LIMITS.MAX_NODES} 個上限`);
      return;
    }
    if (nextEdgeCount > GRAPH_LIMITS.MAX_EDGES) {
      toast.warning(`[全域限制] 匯入後連線數量 (${nextEdgeCount}) 超過 ${GRAPH_LIMITS.MAX_EDGES} 條上限`);
      return;
    }
    if (importMode === 'append') {
      setNodes((nds) => [...nds, ...layouted]);
      setEdges((eds) => [...eds, ...rfEdges]);
    } else {
      setNodes(layouted);
      setEdges(rfEdges);
    }
    resetProgressiveBranches();
    setMermaidModal(null);
  }, [nodes, edges, pushState, resetProgressiveBranches, setNodes, setEdges, toast]);
  const exportText = useMemo(() => {
    if (mermaidModal !== 'export') return '';
    return graphToMermaid(fromRFNodes(nodes), fromRFEdges(edges), 'TD');
  }, [mermaidModal, nodes, edges]);
  const visibleNodeIds = useMemo(() => (
    readingMode === 'expand-all'
      ? new Set(nodes.map((node) => node.id))
      : getProgressiveVisibleNodeIds(nodes, edges, expandedNodeIds)
  ), [edges, expandedNodeIds, nodes, readingMode]);
  const progressiveConceptNodeIds = useMemo(
    () => new Set(nodes.filter((node) => node.type !== 'sticky' && node.type !== 'image').map((node) => node.id)),
    [nodes],
  );
  const progressiveExpandableNodeIds = useMemo(
    () => {
      const conceptEdges = edges.filter((edge) => progressiveConceptNodeIds.has(edge.source) && progressiveConceptNodeIds.has(edge.target));
      const incomingConceptNodeIds = new Set(conceptEdges.map((edge) => edge.target));
      return new Set(conceptEdges
        .filter((edge) => incomingConceptNodeIds.has(edge.source))
        .map((edge) => edge.source));
    },
    [edges, progressiveConceptNodeIds],
  );
  const visibleNodes = useMemo(() => {
    return nodes.filter((node) => visibleNodeIds.has(node.id)).map((n) => ({
      ...n,
      draggable: !isReadOnlyMode && (layoutMode === 'free' || n.type === 'sticky' || n.type === 'image'),
      data: {
        ...n.data,
        readingMode,
        expandLevel: n.data.expandLevel ?? 0,
        progressiveHasChildren: progressiveExpandableNodeIds.has(n.id),
        progressiveBranchExpanded: expandedNodeIds.has(n.id),
        shapeType: (n.type as NodeShapeType) ?? 'concept',
        bgOpacity,
        backgroundOpacity: bgOpacity,
        quickActions: n.type === 'sticky' ? undefined : {
          select: () => handleSelectNode(n.id),
          edit: () => { setEditingNodeId(n.id); setActiveSidePanel('edit'); },
          delete: () => handleDeleteNode(n.id),
          addChild: n.type === 'image' ? undefined : () => handleAddChild(n.id),
          changeShape: n.type === 'image' ? undefined : (shape: NodeShapeType) => handleUpdateNodeType(n.id, shape),
        },
      },
    }));
  }, [bgOpacity, expandedNodeIds, handleAddChild, handleDeleteNode, handleSelectNode, handleUpdateNodeType, isReadOnlyMode, layoutMode, nodes, progressiveExpandableNodeIds, readingMode, setEditingNodeId, visibleNodeIds]);
  const visibleEdges = useMemo(
    () => edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)),
    [edges, visibleNodeIds],
  );
  const editingNode = editingNodeId ? nodes.find((n) => n.id === editingNodeId) : null;
  const selectedNode = nodes.find((node) => node.selected);
  // M2: Toggle Reading Mode reset expandLevel
  const handleToggleReadingMode = useCallback(() => {
    const nextMode = readingMode === 'expand-all' ? 'progressive' : 'expand-all';
    resetProgressiveBranches();
    if (nextMode === 'progressive') setNodes(resetProgressiveExpandLevels);
    setReadingMode(nextMode);
  }, [readingMode, resetProgressiveBranches, setNodes]);
  // M2: Radial Layout & Classic coloring callbacks
  const handleSelectLayoutMode = useCallback((mode: LayoutMode) => {
    if (readOnly) return;
    if (mode === 'radial') {
      pushState(nodes, edges);
      setNodes(applyRadialLayoutPreservingSticky(nodes, edges));
      requestAnimationFrame(() => fitView({ padding: 0.16, duration: 350 }));
    }
    setLayoutMode(mode);
  }, [readOnly, nodes, edges, pushState, setNodes, fitView]);

  const handleApplyTheme = useCallback((preset: GraphThemePresetId) => {
    if (readOnly) return;
    pushState(nodes, edges);
    setNodes(applyGraphThemePreset(nodes, edges, preset));
    setTheme(preset);
  }, [readOnly, nodes, edges, pushState, setNodes]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <button onClick={onBack} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" aria-label="返回圖表列表">
          <ArrowLeft size={18} className="text-slate-600 dark:text-slate-400" />
        </button>
        <h2 className="font-bold text-sm text-slate-800 dark:text-white truncate flex-1">{graph.name}</h2>
        {readOnly && <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full font-medium">唯讀模式</span>}
      </div>

      {!isMobile && (
        <GraphToolbar
          readingMode={readingMode} editMode={editMode} onToggleEditMode={handleToggleEditMode}
          onAddNode={handleAddNode} onAddSticky={handleAddSticky} onAddImage={handleAddImage} onDeleteSelected={handleDeleteSelected}
          onUndo={handleUndo} onRedo={handleRedo} canUndo={past.length > 0} canRedo={future.length > 0}
          onZoomIn={() => zoomIn()} onZoomOut={() => zoomOut()} onFitView={() => fitView({ padding: 0.2 })}
          onToggleReadingMode={handleToggleReadingMode}
          onExportMermaid={() => setMermaidModal('export')} onImportMermaid={() => setMermaidModal('import')}
          readOnly={isReadOnlyMode} connectMode={connectMode} onToggleConnectMode={() => setConnectMode((c) => !c)}
          onToggleSidePanel={(p) => {
            if ((p === 'edit' || p === 'notes') && selectedNode) setEditingNodeId(selectedNode.id);
            setActiveSidePanel((current) => current === p ? null : p);
          }} activeSidePanel={activeSidePanel}
          hasSelectedConcept={!!(selectedNode && selectedNode.type !== 'sticky' && selectedNode.type !== 'image')}
          bgOpacity={bgOpacity}
           onToggleBgOpacity={() => setBgOpacity((o) => (o === 'translucent' ? 'solid' : 'translucent'))}
           layoutMode={layoutMode} onSelectLayoutMode={handleSelectLayoutMode}
           theme={theme} onApplyTheme={handleApplyTheme}
        />
      )}

      {isMobile && (
        <div className="flex items-center justify-end p-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={handleToggleReadingMode}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              readingMode === 'expand-all' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}
          >
            <Eye size={14} /> {readingMode === 'expand-all' ? '全展開' : '逐步探索'}
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {editMode === 'code' && (
          <div className="w-1/3 min-w-[300px] border-r border-slate-200 dark:border-slate-700 h-full p-2 bg-slate-50 dark:bg-slate-900">
            <GraphCodeEditor value={codeText} onChange={handleCodeChange} errors={codeErrors} />
          </div>
        )}

        <div className="flex-1 relative">
          <ReactFlow
            nodes={visibleNodes} edges={visibleEdges}
            onNodesChange={isReadOnlyMode ? undefined : onNodesChange}
            onEdgesChange={isReadOnlyMode ? undefined : onEdgesChange}
            onConnect={isReadOnlyMode ? undefined : onConnect}
            onConnectStart={isReadOnlyMode ? undefined : onConnectStart}
            onConnectEnd={isReadOnlyMode ? undefined : onConnectEnd}
            onNodeClick={(e, n) => handleNodeClick(e, n, readingMode)}
            onNodeDoubleClick={isReadOnlyMode ? undefined : (_, n) => { if (!readOnly) { setEditingNodeId(n.id); setActiveSidePanel('edit'); } }}
            onEdgeClick={isReadOnlyMode ? undefined : handleEdgeClick}
            onEdgeDoubleClick={isReadOnlyMode ? undefined : handleEdgeDoubleClick}
            onPaneClick={() => { setEditingNodeId(null); clearDropMenu(); }}
            nodeTypes={nodeTypes} nodesDraggable={!isReadOnlyMode} nodesConnectable={!isReadOnlyMode}
            connectOnClick={connectMode && !isReadOnlyMode} elementsSelectable={!isReadOnlyMode} fitView
            deleteKeyCode={isReadOnlyMode ? null : 'Delete'} className="bg-slate-50 dark:bg-slate-900"
          >
            <Controls showInteractive={!isReadOnlyMode} />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          </ReactFlow>

          {dropMenu && (
            <DropNodeMenu
              clientX={dropMenu.clientX}
              clientY={dropMenu.clientY}
              onSelect={handleCreateNodeAndConnect}
              onClose={clearDropMenu}
            />
          )}
        </div>

        {editMode === 'visual' && activeSidePanel === 'search' && (
          <NotesSearch
            nodes={fromRFNodes(nodes)} notes={notesDict} onChangeNotes={setNotesDict}
            onSelectNode={(nid) => { setEditingNodeId(nid); setActiveSidePanel(nodes.find((n) => n.id === nid)?.type !== 'sticky' ? 'notes' : 'edit'); }}
            selectedNodeId={editingNodeId} onClose={() => setActiveSidePanel(null)}
          />
        )}

        {editMode === 'visual' && activeSidePanel === 'notes' && editingNode && editingNode.type !== 'sticky' && editingNode.type !== 'image' && (
          <GraphNotesPanel nodeTitle={((editingNode.data.title || '') as string).trim()} notes={notesDict} onChangeNotes={setNotesDict} onClose={() => setActiveSidePanel(null)} />
        )}

        {editMode === 'visual' && (activeSidePanel === 'edit' || (!activeSidePanel && editingNode)) && editingNode && (
          <NodeEditPanel nodeId={editingNode.id} data={editingNode.data as unknown as GraphNodeData} nodeType={editingNode.type === 'sticky' || editingNode.type === 'image' ? editingNode.type : ((editingNode.type as NodeShapeType) ?? 'concept')} onUpdate={handleUpdateNodeData} onUpdateType={handleUpdateNodeType} onClose={() => { setEditingNodeId(null); setActiveSidePanel(null); }} readOnly={readOnly} />
        )}
      </div>

      {mermaidModal && (
        <MermaidModal mode={mermaidModal} onClose={() => setMermaidModal(null)} onConfirmImport={handleConfirmImport} initialText={mermaidModal === 'export' ? exportText : ''} />
      )}
    </div>
  );
};

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
