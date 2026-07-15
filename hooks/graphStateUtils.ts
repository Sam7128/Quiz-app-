import { MarkerType, type Edge as RFEdge, type Node as RFNode, type OnConnectStartParams } from '@xyflow/react';
import type { DropNodeType } from '@/components/KnowledgeGraph/DropNodeMenu';

export interface DropMenuPoint {
  clientX: number;
  clientY: number;
}

export interface DropMenuState extends DropMenuPoint {
  x: number;
  y: number;
}

export function getDropMenuPoint(event: MouseEvent | TouchEvent, allowHandle = false): DropMenuPoint | null {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return null;
  const isHandle = Boolean(target.closest('.react-flow__handle'));
  if ((!allowHandle || !isHandle) && target.closest('.react-flow__node, .react-flow__edge, .react-flow__handle')) return null;
  if ('clientX' in event) return { clientX: event.clientX, clientY: event.clientY };
  if (event.changedTouches.length === 0) return null;
  return { clientX: event.changedTouches[0].clientX, clientY: event.changedTouches[0].clientY };
}

export function createDropConnection(
  type: DropNodeType,
  position: { x: number; y: number },
  start: OnConnectStartParams,
  nodeIndex: number,
  colors: readonly string[],
): { node: RFNode; edge: RFEdge } {
  const newNodeId = `node-${crypto.randomUUID().slice(0, 8)}`;
  const isConcept = type !== 'sticky';
  const node: RFNode = {
    id: newNodeId,
    type,
    position,
    data: {
      title: isConcept ? '新概念' : '備忘',
      color: isConcept ? colors[nodeIndex % colors.length] : '#fef08a',
      fontSize: 'md',
      label: isConcept ? undefined : '備忘',
    },
  };
  const forward = start.handleType !== 'target';
  const edge: RFEdge = {
    id: `edge-${crypto.randomUUID().slice(0, 8)}`,
    source: forward ? start.nodeId || newNodeId : newNodeId,
    target: forward ? newNodeId : start.nodeId || newNodeId,
    sourceHandle: forward ? (start.handleId || 'b') : 'b',
    targetHandle: forward ? 't' : (start.handleId || 't'),
    markerEnd: { type: MarkerType.ArrowClosed },
  };
  return { node, edge };
}

export function toggleEdgeMarkers(edge: RFEdge): RFEdge {
  if (edge.markerEnd && !edge.markerStart) {
    return { ...edge, markerStart: { type: MarkerType.ArrowClosed }, markerEnd: { type: MarkerType.ArrowClosed } };
  }
  if (edge.markerEnd && edge.markerStart) {
    return { ...edge, markerStart: undefined, markerEnd: undefined };
  }
  return { ...edge, markerStart: undefined, markerEnd: { type: MarkerType.ArrowClosed } };
}

export function cycleExpandLevel(
  currentLevel: number,
  hasDefinition: boolean,
  hasDetails: boolean,
): number {
  const maxLevel = hasDetails ? 2 : hasDefinition ? 1 : 0;
  return currentLevel >= maxLevel ? 0 : currentLevel + 1;
}

export function resetProgressiveExpandLevels(nodes: RFNode[]): RFNode[] {
  return nodes.map((node) => ({
    ...node,
    data: { ...node.data, expandLevel: 0 },
  }));
}

export interface ProgressiveNodeReference {
  id: string;
  type?: string;
}

export interface ProgressiveEdgeReference {
  source: string;
  target: string;
}

interface ProgressiveHierarchy {
  conceptIds: Set<string>;
  outgoing: Map<string, Set<string>>;
  roots: string[];
}

function isProgressiveConceptNode(node: ProgressiveNodeReference): boolean {
  return node.type !== 'sticky' && node.type !== 'image';
}

function buildProgressiveHierarchy(
  nodes: ReadonlyArray<ProgressiveNodeReference>,
  edges: ReadonlyArray<ProgressiveEdgeReference>,
): ProgressiveHierarchy {
  const conceptNodes = nodes.filter(isProgressiveConceptNode);
  const conceptIds = new Set(conceptNodes.map((node) => node.id));
  const outgoing = new Map<string, Set<string>>(conceptNodes.map((node) => [node.id, new Set<string>()]));
  const incoming = new Map<string, Set<string>>(conceptNodes.map((node) => [node.id, new Set<string>()]));
  const adjacency = new Map<string, Set<string>>(conceptNodes.map((node) => [node.id, new Set<string>()]));

  for (const edge of edges) {
    if (edge.source === edge.target || !conceptIds.has(edge.source) || !conceptIds.has(edge.target)) continue;
    outgoing.get(edge.source)?.add(edge.target);
    incoming.get(edge.target)?.add(edge.source);
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  const roots: string[] = [];
  const componentVisited = new Set<string>();
  for (const node of conceptNodes) {
    if (componentVisited.has(node.id)) continue;
    const component: string[] = [];
    const queue = [node.id];
    componentVisited.add(node.id);
    let queueIndex = 0;
    while (queueIndex < queue.length) {
      const current = queue[queueIndex];
      queueIndex += 1;
      component.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (componentVisited.has(neighbor)) continue;
        componentVisited.add(neighbor);
        queue.push(neighbor);
      }
    }
    const componentRoots = component.filter((id) => (incoming.get(id)?.size ?? 0) === 0);
    roots.push(...(componentRoots.length > 0 ? componentRoots : [component[0]]));
  }

  return { conceptIds, outgoing, roots };
}

/**
 * Progressive mode shows every root and its direct children first. Each
 * expanded node then unlocks only its own outgoing child branch.
 */
export function getProgressiveVisibleNodeIds(
  nodes: ReadonlyArray<ProgressiveNodeReference>,
  edges: ReadonlyArray<ProgressiveEdgeReference>,
  expandedNodeIds: ReadonlySet<string>,
): Set<string> {
  const hierarchy = buildProgressiveHierarchy(nodes, edges);
  const visible = new Set(nodes.filter((node) => !hierarchy.conceptIds.has(node.id)).map((node) => node.id));
  const childrenProcessed = new Set<string>();
  const queue = hierarchy.roots.map((rootId) => ({ id: rootId, showChildren: true }));

  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;
    if (!hierarchy.conceptIds.has(current.id)) continue;
    visible.add(current.id);
    if (!current.showChildren || childrenProcessed.has(current.id)) continue;
    childrenProcessed.add(current.id);
    for (const childId of hierarchy.outgoing.get(current.id) ?? []) {
      visible.add(childId);
      queue.push({ id: childId, showChildren: expandedNodeIds.has(childId) });
    }
  }

  return visible;
}

/**
 * Toggle one branch. Collapsing a node also clears remembered descendants so
 * reopening that branch always starts from its immediate children.
 */
export function toggleProgressiveBranch(
  expandedNodeIds: ReadonlySet<string>,
  nodeId: string,
  nodes: ReadonlyArray<ProgressiveNodeReference>,
  edges: ReadonlyArray<ProgressiveEdgeReference>,
): Set<string> {
  const hierarchy = buildProgressiveHierarchy(nodes, edges);
  const rootIds = new Set(hierarchy.roots);
  const childIds = hierarchy.outgoing.get(nodeId);
  const next = new Set(expandedNodeIds);

  if (!hierarchy.conceptIds.has(nodeId) || rootIds.has(nodeId) || !childIds || childIds.size === 0) return next;
  if (!next.has(nodeId)) {
    next.add(nodeId);
    return next;
  }

  next.delete(nodeId);
  const descendants = new Set<string>();
  const queue = [...childIds];
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const descendantId = queue[queueIndex];
    queueIndex += 1;
    if (descendants.has(descendantId)) continue;
    descendants.add(descendantId);
    queue.push(...(hierarchy.outgoing.get(descendantId) ?? []));
  }
  for (const descendantId of descendants) next.delete(descendantId);
  return next;
}
