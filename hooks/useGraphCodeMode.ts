import { useState, useCallback, useEffect } from 'react';
import type { Edge as RFEdge, Node as RFNode } from '@xyflow/react';
import type { GraphDocument } from '@/types/graphTypes';
import { graphToMarkdown, parseMarkdownToGraph } from '@/services/markdownGraphBridge';
import { applyRadialLayout } from '@/services/radialLayout';
import { toRFNode, toRFEdge, fromRFNodes, fromRFEdges, runHeuristicNodeMatching } from '@/components/KnowledgeGraph/graphUtils';

export function useGraphCodeMode(
  graph: GraphDocument,
  nodes: RFNode[],
  edges: RFEdge[],
  notesDict: Record<string, string>,
  setNodes: (nds: RFNode[] | ((prev: RFNode[]) => RFNode[])) => void,
  setEdges: (eds: RFEdge[] | ((prev: RFEdge[]) => RFEdge[])) => void,
  setNotesDict: (notes: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
) {
  const [editMode, setEditMode] = useState<'visual' | 'code'>(graph.editMode || 'visual');
  const [codeText, setCodeText] = useState<string>('');
  const [codeErrors, setCodeErrors] = useState<string[]>([]);

  useEffect(() => {
    if (graph.editMode === 'code') setCodeText(graphToMarkdown(graph.nodes, graph.edges));
  }, [graph]);

  const handleToggleEditMode = useCallback(() => {
    setEditMode((prev) => {
      const next = prev === 'visual' ? 'code' : 'visual';
      if (next === 'code') setCodeText(graphToMarkdown(fromRFNodes(nodes), fromRFEdges(edges)));
      return next;
    });
  }, [nodes, edges]);

  const handleCodeChange = useCallback((text: string) => {
    setCodeText(text);
    const { nodes: parsedNodes, edges: parsedEdges, errors } = parseMarkdownToGraph(text);
    if (errors.length > 0) {
      setCodeErrors(errors);
      return;
    }
    setCodeErrors([]);
    const layouted = applyRadialLayout(parsedNodes.map(toRFNode), parsedEdges.map(toRFEdge));

    const { restoredNodes, newIdMap, renamePairs } = runHeuristicNodeMatching(
      nodes,
      edges,
      layouted,
      parsedEdges
    );

    const nextNodes = [...restoredNodes, ...nodes.filter(n => n.type === 'sticky' || n.type === 'image')];

    // Update Edges
    const nextEdges = parsedEdges.filter((edge) => edge.source !== edge.target).map(edge => {
      const source = newIdMap.get(edge.source) || edge.source;
      const target = newIdMap.get(edge.target) || edge.target;
      const oldEdge = edges.find(e => e.source === source && e.target === target);
      let finalEdgeId = oldEdge ? oldEdge.id : null;
      if (!finalEdgeId) {
        finalEdgeId = `edge-${crypto.randomUUID().slice(0, 8)}`;
      }
      return {
        ...toRFEdge({
          id: edge.id,
          source,
          target,
          label: typeof oldEdge?.label === 'string' ? oldEdge.label : undefined,
          animated: oldEdge?.animated,
          arrowType: oldEdge ? (oldEdge.markerStart && oldEdge.markerEnd ? 'both' : !oldEdge.markerEnd && !oldEdge.markerStart ? 'none' : 'arrow') : 'arrow'
        }),
        id: finalEdgeId,
      };
    });

    // Cascade rename notes with sharing check
    const nextNotesDict = { ...notesDict };
    let hasRename = false;
    if (renamePairs.length > 0) {
      renamePairs.forEach(({ oldTitle, newTitle }) => {
        if (oldTitle && newTitle && oldTitle !== newTitle && nextNotesDict[oldTitle]) {
          nextNotesDict[newTitle] = nextNotesDict[oldTitle];
          const hasOtherNodeWithOldTitle = nextNodes.some(n => {
            const dataObj = n.data as Record<string, unknown>;
            const nodeTitle = typeof dataObj?.title === 'string' ? dataObj.title : '';
            return nodeTitle === oldTitle;
          });
          if (!hasOtherNodeWithOldTitle) {
            delete nextNotesDict[oldTitle];
          }
          hasRename = true;
        }
      });
    }

    setNodes(nextNodes);
    setEdges(nextEdges);
    if (hasRename) {
      setNotesDict(nextNotesDict);
    }
  }, [nodes, edges, notesDict, setNodes, setEdges, setNotesDict]);

  return { editMode, codeText, codeErrors, handleToggleEditMode, handleCodeChange };
}
