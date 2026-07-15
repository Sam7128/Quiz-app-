import { describe, expect, it } from 'vitest';
import { type Edge as RFEdge, type Node as RFNode } from '@xyflow/react';
import { applyAutoLayout, applyDagreLayout } from '../../components/KnowledgeGraph/graphUtils';
import { applyRadialLayout, applyRadialLayoutPreservingSticky } from '../../services/radialLayout';

function makeNode(id: string, type: RFNode['type'] = 'concept'): RFNode {
  return { id, position: { x: 99, y: 99 }, data: { title: id }, type };
}

function distance(a: RFNode, b: RFNode): number {
  return Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y);
}

function angle(node: RFNode): number {
  return Math.atan2(node.position.y, node.position.x);
}

describe('Radial Layout Algorithm', () => {
  it('handles empty and single-node graphs', () => {
    expect(applyRadialLayout([], [])).toEqual([]);
    expect(applyRadialLayout([makeNode('root')], [])[0].position).toEqual({ x: 0, y: 0 });
  });

  it('keeps the directed root in the center even when it is not the first node', () => {
    const result = applyRadialLayout(
      [makeNode('child'), makeNode('root')],
      [{ id: 'edge', source: 'root', target: 'child' }],
    );
    expect(result.find((node) => node.id === 'root')?.position).toEqual({ x: 0, y: 0 });
  });

  it('keeps descendants in their parent branch sector instead of mixing BFS rings', () => {
    const nodes = ['root', 'a', 'a1', 'a2', 'b', 'b1', 'b2'].map((id) => makeNode(id));
    const edges: RFEdge[] = [
      { id: 'ra', source: 'root', target: 'a' },
      { id: 'aa1', source: 'a', target: 'a1' },
      { id: 'aa2', source: 'a', target: 'a2' },
      { id: 'rb', source: 'root', target: 'b' },
      { id: 'bb1', source: 'b', target: 'b1' },
      { id: 'bb2', source: 'b', target: 'b2' },
    ];
    const result = applyRadialLayout(nodes, edges);
    const byId = new Map(result.map((node) => [node.id, node]));
    const aAngles = ['a', 'a1', 'a2'].map((id) => angle(byId.get(id)!));
    const bAngles = ['b', 'b1', 'b2'].map((id) => angle(byId.get(id)!));
    expect(Math.max(...aAngles) - Math.min(...aAngles)).toBeLessThan(Math.PI);
    expect(Math.max(...bAngles) - Math.min(...bAngles)).toBeLessThan(Math.PI);
    expect(distance(byId.get('a')!, byId.get('b')!)).toBeGreaterThan(300);
  });

  it('expands crowded rings so ordinary concept nodes do not overlap', () => {
    const nodes = [makeNode('root')];
    const edges: RFEdge[] = [];
    for (let index = 0; index < 18; index += 1) {
      const id = `child-${index}`;
      nodes.push(makeNode(id));
      edges.push({ id: `edge-${index}`, source: 'root', target: id });
    }
    const result = applyRadialLayout(nodes, edges).filter((node) => node.id !== 'root');
    for (let left = 0; left < result.length; left += 1) {
      for (let right = left + 1; right < result.length; right += 1) {
        expect(distance(result[left], result[right])).toBeGreaterThanOrEqual(175);
      }
    }
  });

  it('ignores self-loop edges when computing the hierarchy', () => {
    const nodes = [makeNode('root'), makeNode('child')];
    const edges: RFEdge[] = [
      { id: 'loop', source: 'root', target: 'root' },
      { id: 'child', source: 'root', target: 'child' },
    ];
    const result = applyRadialLayout(nodes, edges);
    expect(result.find((node) => node.id === 'root')?.position).toEqual({ x: 0, y: 0 });
    expect(result.find((node) => node.id === 'child')?.position).not.toEqual({ x: 0, y: 0 });
  });

  it('preserves sticky notes and standalone image positions', () => {
    const nodes = [makeNode('concept'), makeNode('sticky', 'sticky'), makeNode('image', 'image')];
    const result = applyRadialLayoutPreservingSticky(nodes, []);
    expect(result.find((node) => node.id === 'concept')?.position).toEqual({ x: 0, y: 0 });
    expect(result.find((node) => node.id === 'sticky')?.position).toEqual({ x: 99, y: 99 });
    expect(result.find((node) => node.id === 'image')?.position).toEqual({ x: 99, y: 99 });
  });

  it('keeps the compatibility layout alias delegated to applyAutoLayout', () => {
    const nodes = [makeNode('root'), makeNode('child')];
    const edges: RFEdge[] = [{ id: 'edge', source: 'root', target: 'child' }];
    expect(applyDagreLayout(nodes, edges)).toEqual(applyAutoLayout(nodes, edges));
  });
});
