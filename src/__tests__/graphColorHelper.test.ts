import { describe, expect, it } from 'vitest';
import type { Edge as RFEdge, Node as RFNode } from '@xyflow/react';
import { applyGraphThemePreset, resetClassicNodeColors } from '@/utils/graphColorHelper';

function node(id: string, title: string, color: string, type: RFNode['type'] = 'concept', extra: Record<string, unknown> = {}): RFNode {
  return { id, position: { x: 0, y: 0 }, type, data: { title, color, fontSize: 'md', ...extra } };
}

describe('resetClassicNodeColors', () => {
  it('uses BFS depth and preserves custom and sticky colors', () => {
    const nodes = [
      node('root', 'Root', '#EF4444'),
      node('child', 'Child', '#3B82F6'),
      node('custom', 'Custom', '#123456', 'concept', { customColor: true }),
      node('sticky', 'Note', '#fef08a', 'sticky'),
    ];
    const edges: RFEdge[] = [
      { id: 'e1', source: 'root', target: 'child' },
      { id: 'e2', source: 'child', target: 'custom' },
    ];
    const result = resetClassicNodeColors(nodes, edges);
    expect(result.find((item) => item.id === 'root')?.data.color).toBe('#3B82F6');
    expect(result.find((item) => item.id === 'child')?.data.color).toBe('#10B981');
    expect(result.find((item) => item.id === 'custom')?.data.color).toBe('#123456');
    expect(result.find((item) => item.id === 'sticky')?.data.color).toBe('#fef08a');
  });
});

describe('applyGraphThemePreset', () => {
  it('colors each top-level branch consistently and leaves image/sticky nodes unchanged', () => {
    const nodes = [
      node('root', 'Root', '#000000'),
      node('branch-a', 'A', '#000000'),
      node('leaf-a', 'A1', '#000000'),
      node('branch-b', 'B', '#000000'),
      node('leaf-b', 'B1', '#000000'),
      node('sticky', 'Note', '#fef08a', 'sticky'),
      node('image', 'Slide', '#ffffff', 'image'),
    ];
    const edges: RFEdge[] = [
      { id: 'e1', source: 'root', target: 'branch-a' },
      { id: 'e2', source: 'branch-a', target: 'leaf-a' },
      { id: 'e3', source: 'root', target: 'branch-b' },
      { id: 'e4', source: 'branch-b', target: 'leaf-b' },
    ];
    const result = applyGraphThemePreset(nodes, edges, 'emerald');
    expect(result.find((item) => item.id === 'branch-a')?.data.color)
      .toBe(result.find((item) => item.id === 'leaf-a')?.data.color);
    expect(result.find((item) => item.id === 'branch-b')?.data.color)
      .toBe(result.find((item) => item.id === 'leaf-b')?.data.color);
    expect(result.find((item) => item.id === 'branch-a')?.data.color)
      .not.toBe(result.find((item) => item.id === 'branch-b')?.data.color);
    expect(result.find((item) => item.id === 'sticky')?.data.color).toBe('#fef08a');
    expect(result.find((item) => item.id === 'image')?.data.color).toBe('#ffffff');
  });
});
