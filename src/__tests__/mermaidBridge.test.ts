import { describe, it, expect } from 'vitest';
import { graphToMermaid, mermaidToGraph } from '../../services/mermaidBridge';
import type { GraphNode, GraphEdge } from '../../types/graphTypes';
import { GRAPH_LIMITS } from '../../types/graphTypes';

const makeNode = (id: string, title: string, type: GraphNode['type'] = 'concept'): GraphNode => ({
  id,
  position: { x: 0, y: 0 },
  data: { title, color: '#3B82F6', fontSize: 'md' },
  type,
});

const makeEdge = (source: string, target: string, arrowType: GraphEdge['arrowType'] = 'arrow', label?: string): GraphEdge => ({
  id: `e-${source}-${target}`,
  source,
  target,
  arrowType,
  label,
});

describe('mermaidBridge', () => {
  describe('graphToMermaid', () => {
    it('exports basic nodes and edges', () => {
      const nodes = [makeNode('A', 'Hello'), makeNode('B', 'World')];
      const edges = [makeEdge('A', 'B')];
      const result = graphToMermaid(nodes, edges);

      expect(result).toContain('graph TD');
      expect(result).toContain('A[Hello]');
      expect(result).toContain('B[World]');
      expect(result).toContain('A --> B');
    });

    it('exports rounded and diamond shapes', () => {
      const nodes = [makeNode('A', 'Round', 'rounded'), makeNode('B', 'Decision', 'diamond')];
      const result = graphToMermaid(nodes, []);

      expect(result).toContain('A(Round)');
      expect(result).toContain('B{Decision}');
    });

    it('exports edge labels', () => {
      const edges = [makeEdge('A', 'B', 'arrow', 'depends on')];
      const result = graphToMermaid([makeNode('A', 'A'), makeNode('B', 'B')], edges);
      expect(result).toContain('|depends on|');
    });

    it('exports both arrow type as <-->', () => {
      const edges = [makeEdge('A', 'B', 'both')];
      const result = graphToMermaid([makeNode('A', 'A'), makeNode('B', 'B')], edges);
      expect(result).toContain('<-->');
    });

    it('exports none arrow type as ---', () => {
      const edges = [makeEdge('A', 'B', 'none')];
      const result = graphToMermaid([makeNode('A', 'A'), makeNode('B', 'B')], edges);
      expect(result).toContain('---');
    });

    it('supports LR direction', () => {
      const result = graphToMermaid([makeNode('A', 'A')], [], 'LR');
      expect(result).toContain('graph LR');
    });
  });

  describe('mermaidToGraph', () => {
    it('parses basic flowchart', () => {
      const input = `graph TD\n  A[Start] --> B[End]`;
      const result = mermaidToGraph(input);

      expect(result.success).toBe(true);
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.nodes.find(n => n.id === 'A')?.data.title).toBe('Start');
    });

    it('parses different node shapes', () => {
      const input = `graph TD\n  A[Rect]\n  B(Round)\n  C{Diamond}`;
      const result = mermaidToGraph(input);

      expect(result.success).toBe(true);
      expect(result.nodes.find(n => n.id === 'A')?.type).toBe('concept');
      expect(result.nodes.find(n => n.id === 'B')?.type).toBe('rounded');
      expect(result.nodes.find(n => n.id === 'C')?.type).toBe('diamond');
    });

    it('parses <--> as both arrowType', () => {
      const input = `graph TD\n  A <--> B`;
      const result = mermaidToGraph(input);

      expect(result.success).toBe(true);
      expect(result.edges[0].arrowType).toBe('both');
    });

    it('parses --- as none arrowType', () => {
      const input = `graph TD\n  A --- B`;
      const result = mermaidToGraph(input);

      expect(result.success).toBe(true);
      expect(result.edges[0].arrowType).toBe('none');
    });

    it('parses edge labels', () => {
      const input = `graph TD\n  A -->|depends| B`;
      const result = mermaidToGraph(input);

      expect(result.edges[0].label).toBe('depends');
    });

    it('rejects missing header', () => {
      const result = mermaidToGraph('A --> B');
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('標頭');
    });

    it('rejects input exceeding length limit', () => {
      const long = 'graph TD\n' + 'A --> B\n'.repeat(GRAPH_LIMITS.MERMAID_INPUT_MAX);
      const result = mermaidToGraph(long.slice(0, GRAPH_LIMITS.MERMAID_INPUT_MAX + 1));
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('字元上限');
    });

    it('filters self-loops with warning', () => {
      const input = `graph TD\n  A --> A`;
      const result = mermaidToGraph(input);

      expect(result.edges).toHaveLength(0);
      expect(result.errors.some(e => e.includes('自迴圈'))).toBe(true);
    });

    it('rejects graphs exceeding 50 nodes', () => {
      const nodeLines = Array.from({ length: 51 }, (_, i) => `  N${i}[Node${i}]`).join('\n');
      const input = `graph TD\n${nodeLines}`;
      const result = mermaidToGraph(input);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('50');
    });

    it('handles flowchart keyword same as graph', () => {
      const input = `flowchart LR\n  A[Start] --> B[End]`;
      const result = mermaidToGraph(input);

      expect(result.success).toBe(true);
      expect(result.nodes).toHaveLength(2);
    });

    it('ignores classDef and class lines', () => {
      const input = `graph TD\n  A[Node]\n  classDef blue fill:#00f\n  class A blue`;
      const result = mermaidToGraph(input);

      expect(result.success).toBe(true);
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].data.color).toBe('#00f');
    });

    it('supports larger mermaid input up to configured limit', () => {
      const body = 'A --> B\n'.repeat(5500);
      const input = `graph TD\n${body}`;

      expect(input.length).toBeLessThan(GRAPH_LIMITS.MERMAID_INPUT_MAX);

      const result = mermaidToGraph(input);
      expect(result.success).toBe(true);
    });
  });

  describe('round-trip', () => {
    it('export then import preserves structure', () => {
      const nodes = [makeNode('A', 'Hello'), makeNode('B', 'World', 'rounded')];
      const edges = [makeEdge('A', 'B', 'arrow', 'relates')];

      const mermaid = graphToMermaid(nodes, edges);
      const result = mermaidToGraph(mermaid);

      expect(result.success).toBe(true);
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].label).toBe('relates');
    });

    it('both arrow type survives round-trip', () => {
      const nodes = [makeNode('X', 'X'), makeNode('Y', 'Y')];
      const edges = [makeEdge('X', 'Y', 'both')];

      const mermaid = graphToMermaid(nodes, edges);
      const result = mermaidToGraph(mermaid);

      expect(result.edges[0].arrowType).toBe('both');
    });
  });
});
