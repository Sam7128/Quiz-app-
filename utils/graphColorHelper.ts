import type { Edge as RFEdge, Node as RFNode } from '@xyflow/react';
import { DEFAULT_NODE_COLORS, type GraphThemePresetId } from '@/types/graphTypes';
import { getGraphThemePreset } from '@/constants/graphThemes';

const CLASSIC_COLORS = DEFAULT_NODE_COLORS;

function isDefaultColor(color: unknown): boolean {
  return typeof color === 'string' && CLASSIC_COLORS.includes(color as (typeof CLASSIC_COLORS)[number]);
}

/** Apply a complete preset while keeping each top-level branch visually coherent. */
export function applyGraphThemePreset(
  nodes: RFNode[],
  edges: RFEdge[],
  presetId: GraphThemePresetId,
): RFNode[] {
  if (nodes.length === 0) return [];
  const conceptNodes = nodes.filter((node) => node.type !== 'sticky' && node.type !== 'image');
  if (conceptNodes.length === 0) return nodes;

  const conceptIds = new Set(conceptNodes.map((node) => node.id));
  const outgoing = new Map(conceptNodes.map((node) => [node.id, [] as string[]]));
  const inDegree = new Map(conceptNodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    if (edge.source === edge.target || !conceptIds.has(edge.source) || !conceptIds.has(edge.target)) continue;
    outgoing.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const root = conceptNodes
    .filter((node) => (inDegree.get(node.id) ?? 0) === 0)
    .sort((left, right) => (outgoing.get(right.id)?.length ?? 0) - (outgoing.get(left.id)?.length ?? 0))[0]
    ?? conceptNodes[0];
  const preset = getGraphThemePreset(presetId);
  const assigned = new Map<string, string>([[root.id, preset.colors[0]]]);
  const rootChildren = outgoing.get(root.id) ?? [];
  const queue: Array<{ id: string; color: string }> = rootChildren.map((id, index) => ({
    id,
    color: preset.colors[(index % (preset.colors.length - 1)) + 1],
  }));
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;
    if (assigned.has(current.id)) continue;
    assigned.set(current.id, current.color);
    for (const child of outgoing.get(current.id) ?? []) {
      if (!assigned.has(child)) queue.push({ id: child, color: current.color });
    }
  }

  let fallbackIndex = 1;
  return nodes.map((node) => {
    if (node.type === 'sticky' || node.type === 'image') return node;
    const color = assigned.get(node.id) ?? preset.colors[(fallbackIndex++ % (preset.colors.length - 1)) + 1];
    return { ...node, data: { ...node.data, color, customColor: false } };
  });
}

/** Reset only concept nodes that were not explicitly customized by the user. */
export function resetClassicNodeColors(nodes: RFNode[], edges: RFEdge[]): RFNode[] {
  if (nodes.length === 0) return [];

  const inDegree = new Map(nodes.map((node) => [node.id, 0]));
  const adjacency = new Map(nodes.map((node) => [node.id, [] as string[]]));
  for (const edge of edges) {
    const sourceNeighbors = adjacency.get(edge.source);
    const targetNeighbors = adjacency.get(edge.target);
    if (!sourceNeighbors || !targetNeighbors) continue;
    sourceNeighbors.push(edge.target);
    targetNeighbors.push(edge.source);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const root = nodes.find((node) => (inDegree.get(node.id) ?? 0) === 0 && (adjacency.get(node.id)?.length ?? 0) > 0) ?? nodes[0];
  const depths = new Map<string, number>([[root.id, 0]]);
  const queue = [root.id];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const depth = depths.get(current) ?? 0;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!depths.has(neighbor)) {
        depths.set(neighbor, depth + 1);
        queue.push(neighbor);
      }
    }
  }

  let disconnectedDepth = 1;
  for (const node of nodes) {
    if (!depths.has(node.id)) depths.set(node.id, disconnectedDepth++);
  }

  return nodes.map((node) => {
    const data = node.data as Record<string, unknown>;
    const isSticky = node.type === 'sticky';
    const color = data.color;
    if (isSticky || data.customColor === true || (color !== undefined && !isDefaultColor(color))) return node;
    const depth = depths.get(node.id) ?? 0;
    return { ...node, data: { ...node.data, color: CLASSIC_COLORS[Math.min(depth, CLASSIC_COLORS.length - 1)], customColor: false } };
  });
}
