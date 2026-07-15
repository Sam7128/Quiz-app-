import { describe, expect, it } from 'vitest';
import type { Edge as RFEdge, Node as RFNode } from '@xyflow/react';
import { applyRadialLayout } from '@/services/radialLayout';

describe('knowledge graph benchmark gates', () => {
  it('lays out the 200-node target within one second', () => {
    const nodes: RFNode[] = Array.from({ length: 200 }, (_, index) => ({
      id: `node-${index}`,
      position: { x: index, y: index },
      data: {},
      type: 'concept',
    }));
    const edges: RFEdge[] = Array.from({ length: 199 }, (_, index) => ({
      id: `edge-${index}`,
      source: `node-${index}`,
      target: `node-${index + 1}`,
    }));
    const startedAt = performance.now();
    const layouted = applyRadialLayout(nodes, edges);
    const elapsedMs = performance.now() - startedAt;

    expect(layouted).toHaveLength(200);
    expect(elapsedMs).toBeLessThan(1000);
  });
});
