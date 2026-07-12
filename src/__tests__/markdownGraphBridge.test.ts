import { describe, it, expect } from 'vitest';
import { parseMarkdownToGraph, graphToMarkdown } from '../../services/markdownGraphBridge';
import type { GraphNode, GraphEdge } from '../../types/graphTypes';
import { GRAPH_LIMITS } from '../../types/graphTypes';

describe('Markdown Graph Bridge', () => {
  describe('parseMarkdownToGraph', () => {
    it('測試基本 Markdown 縮排列表解析', () => {
      const md = `
---
title: 忽略 YAML frontmatter
---
- 節點 A
  - 節點 B
  * 節點 C
`;
      const { nodes, edges, errors } = parseMarkdownToGraph(md);
      expect(errors).toHaveLength(0);
      expect(nodes).toHaveLength(3);

      const nodeA = nodes.find(n => n.data.title === '節點 A')!;
      const nodeB = nodes.find(n => n.data.title === '節點 B')!;
      const nodeC = nodes.find(n => n.data.title === '節點 C')!;

      expect(nodeA).toBeDefined();
      expect(nodeB).toBeDefined();
      expect(nodeC).toBeDefined();

      // 驗證結構層級與配色 (L0 藍色, L1 綠色)
      // 根據 types/graphTypes.ts:
      // DEFAULT_NODE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
      expect(nodeA.data.color).toBe('#3B82F6');
      expect(nodeB.data.color).toBe('#10B981');
      expect(nodeC.data.color).toBe('#10B981');

      // 驗證邊
      expect(edges).toHaveLength(2);
      const edgeAB = edges.find(e => e.source === nodeA.id && e.target === nodeB.id);
      const edgeAC = edges.find(e => e.source === nodeA.id && e.target === nodeC.id);
      expect(edgeAB).toBeDefined();
      expect(edgeAC).toBeDefined();
    });

    it('測試多層縮排及跳躍縮排容錯', () => {
      // L0 跳 L3，之後 L3 退回 L1 
      const md = `
- 根節點
      - 跳躍子節點 (L3)
    - 正常子節點 (L2)
`;
      const { nodes, edges } = parseMarkdownToGraph(md);
      expect(nodes).toHaveLength(3);

      const root = nodes[0];
      const jumpNode = nodes[1];
      const normalNode = nodes[2];

      expect(root.data.title).toBe('根節點');
      expect(jumpNode.data.title).toBe('跳躍子節點 (L3)');
      expect(normalNode.data.title).toBe('正常子節點 (L2)');

      // 跳躍節點掛載在根節點之下 (深度 1, 配色綠色)
      expect(jumpNode.data.color).toBe('#10B981');
      // 正常節點掛載在根節點之下 (深度 1, 配色綠色)
      expect(normalNode.data.color).toBe('#10B981');

      // 邊
      expect(edges).toHaveLength(2);
      const edge1 = edges.find(e => e.source === root.id && e.target === jumpNode.id);
      const edge2 = edges.find(e => e.source === root.id && e.target === normalNode.id);
      expect(edge1).toBeDefined();
      expect(edge2).toBeDefined();
    });

    it('測試最大節點上限 200 截斷', () => {
      let md = '';
      for (let i = 0; i < 210; i++) {
        md += `- 節點 ${i}\n`;
      }

      const { nodes, edges, errors } = parseMarkdownToGraph(md);
      expect(nodes).toHaveLength(GRAPH_LIMITS.MAX_NODES); // 200
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain(`節點數量超過最大限制 (${GRAPH_LIMITS.MAX_NODES})`);
    });

    it('測試不含有縮排清單之文字（應回傳空節點）', () => {
      const md = `這是純文字第一行\n這是純文字第二行`;
      const { nodes, edges } = parseMarkdownToGraph(md);
      expect(nodes).toHaveLength(0);
      expect(edges).toHaveLength(0);
    });
  });

  describe('graphToMarkdown & 便利貼過濾', () => {
    it('測試基本 DFS 結構序列化回 Markdown', () => {
      const nodes: GraphNode[] = [
        { id: '1', position: { x: 0, y: 0 }, data: { title: 'A', color: 'blue', fontSize: 'md' }, type: 'concept' },
        { id: '2', position: { x: 0, y: 0 }, data: { title: 'B', color: 'green', fontSize: 'md' }, type: 'concept' },
        { id: '3', position: { x: 0, y: 0 }, data: { title: 'C', color: 'green', fontSize: 'md' }, type: 'concept' },
      ];
      const edges: GraphEdge[] = [
        { id: 'e1', source: '1', target: '2', arrowType: 'arrow' },
        { id: 'e2', source: '1', target: '3', arrowType: 'arrow' },
      ];

      const md = graphToMarkdown(nodes, edges);
      // 應生成 DFS 結構
      const expected = `- A\n  - B\n  - C`;
      expect(md).toBe(expected);
    });

    it('測試忽略與過濾便利貼節點 (type: sticky)', () => {
      const nodes: GraphNode[] = [
        { id: '1', position: { x: 0, y: 0 }, data: { title: 'A', color: 'blue', fontSize: 'md' }, type: 'concept' },
        { id: '2', position: { x: 0, y: 0 }, data: { title: 'B', color: 'green', fontSize: 'md' }, type: 'concept' },
        { id: 's1', position: { x: 0, y: 0 }, data: { title: '我的便利貼', color: 'yellow', fontSize: 'md' }, type: 'sticky' },
      ];
      const edges: GraphEdge[] = [
        { id: 'e1', source: '1', target: '2', arrowType: 'arrow' },
        { id: 'e2', source: '1', target: 's1', arrowType: 'arrow' },
      ];

      const md = graphToMarkdown(nodes, edges);
      // 便利貼節點 's1' 應被完全忽略過濾，不顯示在 markdown 中
      const expected = `- A\n  - B`;
      expect(md).toBe(expected);
    });

    it('測試多連通分量與孤立節點的序列化', () => {
      const nodes: GraphNode[] = [
        { id: '1', position: { x: 0, y: 0 }, data: { title: 'A', color: 'blue', fontSize: 'md' }, type: 'concept' },
        { id: '2', position: { x: 0, y: 0 }, data: { title: 'B', color: 'green', fontSize: 'md' }, type: 'concept' },
        { id: '3', position: { x: 0, y: 0 }, data: { title: '孤立概念', color: 'blue', fontSize: 'md' }, type: 'concept' },
      ];
      const edges: GraphEdge[] = [
        { id: 'e1', source: '1', target: '2', arrowType: 'arrow' },
      ];

      const md = graphToMarkdown(nodes, edges);
      const expected = `- A\n  - B\n- 孤立概念`;
      expect(md).toBe(expected);
    });
  });
});
