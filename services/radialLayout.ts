import { type Edge as RFEdge, type Node as RFNode } from '@xyflow/react';

const BASE_RING_RADIUS = 240;
const NODE_ARC_GAP = 190;
const COMPONENT_GAP = 360;

interface LayoutTree {
  rootId: string;
  children: Map<string, string[]>;
  depth: Map<string, number>;
}

interface Sector {
  start: number;
  end: number;
}

function buildComponents(nodeIds: string[], adjacency: Map<string, string[]>): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];
  for (const nodeId of nodeIds) {
    if (visited.has(nodeId)) continue;
    const component: string[] = [];
    const queue = [nodeId];
    visited.add(nodeId);
    let queueIndex = 0;
    while (queueIndex < queue.length) {
      const current = queue[queueIndex];
      queueIndex += 1;
      component.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
    components.push(component);
  }
  return components.sort((left, right) => right.length - left.length);
}

function chooseRoot(component: string[], inDegree: Map<string, number>, outgoing: Map<string, string[]>): string {
  const zeroInDegree = component.filter((id) => (inDegree.get(id) ?? 0) === 0);
  const candidates = zeroInDegree.length > 0 ? zeroInDegree : component;
  return [...candidates].sort((left, right) => {
    const degreeDifference = (outgoing.get(right)?.length ?? 0) - (outgoing.get(left)?.length ?? 0);
    return degreeDifference !== 0 ? degreeDifference : component.indexOf(left) - component.indexOf(right);
  })[0];
}

function buildLayoutTree(
  component: string[],
  rootId: string,
  outgoing: Map<string, string[]>,
  adjacency: Map<string, string[]>,
): LayoutTree {
  const componentIds = new Set(component);
  const children = new Map(component.map((id) => [id, [] as string[]]));
  const depth = new Map<string, number>([[rootId, 0]]);
  const visited = new Set<string>([rootId]);
  const queue = [rootId];
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;
    const directed = outgoing.get(current) ?? [];
    const directedIds = new Set(directed);
    const candidates = [
      ...directed,
      ...(adjacency.get(current) ?? []).filter((id) => !directedIds.has(id)),
    ];
    for (const neighbor of candidates) {
      if (!componentIds.has(neighbor) || visited.has(neighbor)) continue;
      visited.add(neighbor);
      children.get(current)?.push(neighbor);
      depth.set(neighbor, (depth.get(current) ?? 0) + 1);
      queue.push(neighbor);
    }
  }
  return { rootId, children, depth };
}

function computeLeafWeights(rootId: string, children: Map<string, string[]>): Map<string, number> {
  const weights = new Map<string, number>();
  const visit = (nodeId: string): number => {
    const childIds = children.get(nodeId) ?? [];
    const weight = childIds.length === 0
      ? 1
      : childIds.reduce((sum, childId) => sum + visit(childId), 0);
    weights.set(nodeId, weight);
    return weight;
  };
  visit(rootId);
  return weights;
}

function assignSectors(
  nodeId: string,
  sector: Sector,
  children: Map<string, string[]>,
  weights: Map<string, number>,
  sectors: Map<string, Sector>,
): void {
  sectors.set(nodeId, sector);
  const childIds = children.get(nodeId) ?? [];
  const totalWeight = childIds.reduce((sum, childId) => sum + (weights.get(childId) ?? 1), 0);
  let cursor = sector.start;
  for (const childId of childIds) {
    const fraction = (weights.get(childId) ?? 1) / Math.max(1, totalWeight);
    const childEnd = cursor + (sector.end - sector.start) * fraction;
    assignSectors(childId, { start: cursor, end: childEnd }, children, weights, sectors);
    cursor = childEnd;
  }
}

function layoutComponent(component: string[], tree: LayoutTree): Map<string, { x: number; y: number }> {
  const countsByDepth = new Map<number, number>();
  for (const depth of tree.depth.values()) countsByDepth.set(depth, (countsByDepth.get(depth) ?? 0) + 1);
  const radiusByDepth = new Map<number, number>();
  for (const [depth, count] of countsByDepth) {
    if (depth === 0) {
      radiusByDepth.set(depth, 0);
      continue;
    }
    const crowdRadius = (count * NODE_ARC_GAP) / (2 * Math.PI);
    radiusByDepth.set(depth, Math.max(depth * BASE_RING_RADIUS, crowdRadius));
  }

  const weights = computeLeafWeights(tree.rootId, tree.children);
  const sectors = new Map<string, Sector>();
  assignSectors(tree.rootId, { start: -Math.PI, end: Math.PI }, tree.children, weights, sectors);
  const positions = new Map<string, { x: number; y: number }>();
  for (const nodeId of component) {
    const depth = tree.depth.get(nodeId) ?? 0;
    if (depth === 0) {
      positions.set(nodeId, { x: 0, y: 0 });
      continue;
    }
    const sector = sectors.get(nodeId) ?? { start: 0, end: 0 };
    const theta = (sector.start + sector.end) / 2;
    const radius = radiusByDepth.get(depth) ?? depth * BASE_RING_RADIUS;
    positions.set(nodeId, {
      x: Math.round(radius * Math.cos(theta) * 100) / 100,
      y: Math.round(radius * Math.sin(theta) * 100) / 100,
    });
  }
  return positions;
}

/**
 * Subtree-aware radial layout. Each branch owns a contiguous angular sector,
 * crowded rings expand by estimated node width, and invalid self-loops are ignored.
 */
export function applyRadialLayout(nodes: RFNode[], edges: RFEdge[]): RFNode[] {
  if (nodes.length === 0) return [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const adjacency = new Map(nodes.map((node) => [node.id, [] as string[]]));
  const outgoing = new Map(nodes.map((node) => [node.id, [] as string[]]));
  const inDegree = new Map(nodes.map((node) => [node.id, 0]));

  for (const edge of edges) {
    if (edge.source === edge.target || !nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
    outgoing.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const components = buildComponents(nodes.map((node) => node.id), adjacency);
  const allPositions = new Map<string, { x: number; y: number }>();
  let previousMaxX = 0;
  components.forEach((component, componentIndex) => {
    const rootId = chooseRoot(component, inDegree, outgoing);
    const tree = buildLayoutTree(component, rootId, outgoing, adjacency);
    const localPositions = layoutComponent(component, tree);
    const xValues = [...localPositions.values()].map((position) => position.x);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const offsetX = componentIndex === 0 ? 0 : previousMaxX + COMPONENT_GAP - minX;
    for (const [nodeId, position] of localPositions) {
      allPositions.set(nodeId, { x: position.x + offsetX, y: position.y });
    }
    previousMaxX = componentIndex === 0 ? maxX : maxX + offsetX;
  });

  return nodes.map((node) => ({ ...node, position: allPositions.get(node.id) ?? node.position }));
}

export function applyRadialLayoutPreservingSticky(nodes: RFNode[], edges: RFEdge[]): RFNode[] {
  const concepts = nodes.filter((node) => node.type !== 'sticky' && node.type !== 'image');
  const conceptIds = new Set(concepts.map((node) => node.id));
  const conceptEdges = edges.filter((edge) => (
    edge.source !== edge.target && conceptIds.has(edge.source) && conceptIds.has(edge.target)
  ));
  const layouted = applyRadialLayout(concepts, conceptEdges);
  const positions = new Map(layouted.map((node) => [node.id, node.position]));
  return nodes.map((node) => {
    const position = positions.get(node.id);
    return position ? { ...node, position } : node;
  });
}
