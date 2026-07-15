import { MarkerType, type Edge as RFEdge, type Node as RFNode } from '@xyflow/react';
import type { GraphNode, GraphEdge, GraphNodeData, ArrowType, NodeShapeType, ReadingMode } from '@/types/graphTypes';
import { applyRadialLayout } from '@/services/radialLayout';

// Convert our GraphNode → React Flow node
export function toRFNode(node: GraphNode): RFNode {
  return {
    id: node.id,
    position: node.position,
    data: { ...node.data },
    type: node.type,
  };
}

// Convert our GraphEdge → React Flow edge
export function toRFEdge(edge: GraphEdge): RFEdge {
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
export function fromRFNodes(rfNodes: RFNode[]): GraphNode[] {
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
        label: data.label,
        bold: data.bold,
        fontWeight: data.fontWeight,
        customColor: data.customColor,
        imageUrl: data.imageUrl,
        imageDataUrl: data.imageDataUrl,
        imageAlt: data.imageAlt,
      },
      type: (n.type as GraphNode['type']) || 'concept',
    };
  });
}

export function fromRFEdges(rfEdges: RFEdge[]): GraphEdge[] {
  return rfEdges.filter((edge) => edge.source !== edge.target).map((e) => {
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

export function applyAutoLayout(nodes: RFNode[], edges: RFEdge[]): RFNode[] {
  return applyRadialLayout(nodes, edges);
}

/** @deprecated Use applyAutoLayout. Kept for existing graph utility consumers. */
// ponytail: retain this compatibility alias until the external graph utility API migration window closes on 2026-10-01.
export function applyDagreLayout(nodes: RFNode[], edges: RFEdge[]): RFNode[] {
  return applyAutoLayout(nodes, edges);
}

function getLevenshteinDistance(a: string, b: string): number {
  const tmp = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) tmp[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      tmp[i][j] = b[i - 1] === a[j - 1] ? tmp[i - 1][j - 1] : Math.min(tmp[i - 1][j - 1] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j] + 1);
    }
  }
  return tmp[b.length][a.length];
}

function getPath(nodeId: string, parentMap: Map<string, string>, allNodes: { id: string; data: Record<string, unknown> }[]): string {
  const parts: string[] = [];
  let currId = nodeId;
  while (currId) {
    const parentId = parentMap.get(currId);
    const parentNode = parentId ? allNodes.find(n => n.id === parentId) : null;
    if (parentNode) {
      const title = typeof parentNode.data.title === 'string' ? parentNode.data.title : '';
      parts.unshift(title);
      currId = parentId!;
    } else {
      break;
    }
  }
  return parts.join(':');
}

export interface HeuristicMatchResult {
  restoredNodes: RFNode[];
  newIdMap: Map<string, string>;
  renamePairs: { oldTitle: string; newTitle: string }[];
}

export function runHeuristicNodeMatching(
  prevNodes: RFNode[],
  prevEdges: RFEdge[],
  newLayoutedNodes: RFNode[],
  parsedEdges: GraphEdge[]
): HeuristicMatchResult {
  const prevParentMap = new Map<string, string>();
  prevEdges.forEach(e => prevParentMap.set(e.target, e.source));
  const newParentMap = new Map<string, string>();
  parsedEdges.forEach(e => newParentMap.set(e.target, e.source));

  const prevPathCount = new Map<string, number>();
  const prevInfos = prevNodes
    .filter(n => n.type !== 'sticky' && n.type !== 'image')
    .map(n => {
      const dataObj = n.data as Record<string, unknown>;
      const title = typeof dataObj?.title === 'string' ? dataObj.title : '';
      const path = getPath(n.id, prevParentMap, prevNodes.map(node => ({
        id: node.id,
        data: node.data as Record<string, unknown>
      })));
       const pathKey = path ? `${path}:${title}` : title;
      const count = prevPathCount.get(pathKey) || 0;
      prevPathCount.set(pathKey, count + 1);
      return { node: n, path, count, key: `${pathKey}#${count}`, used: false };
    });

  const newPathCount = new Map<string, number>();
  const newInfos = newLayoutedNodes.map(n => {
    const dataObj = n.data as Record<string, unknown>;
    const title = typeof dataObj?.title === 'string' ? dataObj.title : '';
    const path = getPath(n.id, newParentMap, newLayoutedNodes.map(node => ({
      id: node.id,
      data: node.data as Record<string, unknown>
    })));
     const pathKey = path ? `${path}:${title}` : title;
    const count = newPathCount.get(pathKey) || 0;
    newPathCount.set(pathKey, count + 1);
    return { node: n, path, count, key: `${pathKey}#${count}` };
  });

  interface PrevInfoType {
    node: RFNode;
    path: string;
    count: number;
    key: string;
    used: boolean;
  }

  const matches = new Map<string, PrevInfoType>();
  const renamePairs: { oldTitle: string; newTitle: string }[] = [];

  // 1. Exact Key Match
  newInfos.forEach(info => {
    const match = prevInfos.find(p => !p.used && p.key === info.key);
    if (match) {
      match.used = true;
      matches.set(info.node.id, match);
    }
  });

  // 2. Exact Title Match
  newInfos.forEach(info => {
    if (matches.has(info.node.id)) return;
    const infoData = info.node.data as Record<string, unknown>;
    const infoTitle = typeof infoData?.title === 'string' ? infoData.title : '';
    const match = prevInfos.find(p => {
      const pData = p.node.data as Record<string, unknown>;
      const pTitle = typeof pData?.title === 'string' ? pData.title : '';
      return !p.used && pTitle === infoTitle;
    });
    if (match) {
      match.used = true;
      matches.set(info.node.id, match);
    }
  });

  // 3. Heuristic (Levenshtein) Match
  newInfos.forEach(info => {
    if (matches.has(info.node.id)) return;
    const infoData = info.node.data as Record<string, unknown>;
    const infoTitle = typeof infoData?.title === 'string' ? infoData.title : '';
    const match = prevInfos.find(p => {
      const pData = p.node.data as Record<string, unknown>;
      const pTitle = typeof pData?.title === 'string' ? pData.title : '';
      return (
        !p.used &&
        p.path === info.path &&
        p.count === info.count &&
        getLevenshteinDistance(pTitle, infoTitle) <= 2
      );
    });
    if (match) {
      match.used = true;
      matches.set(info.node.id, match);
      const mData = match.node.data as Record<string, unknown>;
      const mTitle = typeof mData?.title === 'string' ? mData.title : '';
      renamePairs.push({ oldTitle: mTitle, newTitle: infoTitle });
    }
  });

  const existingIds = new Set(prevNodes.map(n => n.id));
  const allocatedIds = new Set<string>();
  const newIdMap = new Map<string, string>();

  const restoredNodes = newInfos.map(info => {
    const m = matches.get(info.node.id);
    let restoredId = m ? m.node.id : null;
    if (!restoredId) {
      do {
        restoredId = `node-${crypto.randomUUID().slice(0, 8)}`;
      } while (existingIds.has(restoredId) || allocatedIds.has(restoredId));
    }
    allocatedIds.add(restoredId);
    newIdMap.set(info.node.id, restoredId);

    const infoData = info.node.data as Record<string, unknown>;
    const mData = m ? (m.node.data as Record<string, unknown>) : null;

    return {
      ...info.node,
      id: restoredId,
      type: m ? m.node.type : info.node.type,
      position: m ? { ...m.node.position } : info.node.position,
      data: {
        ...info.node.data,
        definition: mData ? mData.definition : undefined,
        details: mData ? mData.details : undefined,
        color: mData ? mData.color : infoData?.color,
        fontSize: mData ? mData.fontSize : infoData?.fontSize,
        expandLevel: mData ? mData.expandLevel : 0,
        fontWeight: mData ? mData.fontWeight : infoData?.fontWeight,
        bold: mData ? mData.bold : infoData?.bold,
        customColor: mData ? mData.customColor : infoData?.customColor,
        imageUrl: mData ? mData.imageUrl : infoData?.imageUrl,
        imageDataUrl: mData ? mData.imageDataUrl : infoData?.imageDataUrl,
        imageAlt: mData ? mData.imageAlt : infoData?.imageAlt,
        label: mData ? mData.label : infoData?.label,
      },
    } as RFNode;
  });

  return { restoredNodes, newIdMap, renamePairs };
}
