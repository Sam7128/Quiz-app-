/**
 * Reading Modes — unit tests for progressive L1→L2→L3 cycle logic
 * Validates the expand-level cycling and reading mode persistence.
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_VIEW_STATE } from '@/types/graphTypes';
import type { ReadingMode, GraphViewState } from '@/types/graphTypes';
import {
  cycleExpandLevel,
  getProgressiveVisibleNodeIds,
  resetProgressiveExpandLevels,
  toggleProgressiveBranch,
} from '@/hooks/graphStateUtils';
import type { Node as RFNode } from '@xyflow/react';

describe('Reading Modes', () => {
  describe('DEFAULT_VIEW_STATE', () => {
    it('defaults to progressive reading mode', () => {
      expect(DEFAULT_VIEW_STATE.readingMode).toBe('progressive');
    });
  });

  describe('Progressive expand level cycling', () => {
    it('cycles L0→L1 for node with only definition', () => {
      expect(cycleExpandLevel(0, true, false)).toBe(1);
    });

    it('cycles L1→L0 for node with only definition (wraps)', () => {
      expect(cycleExpandLevel(1, true, false)).toBe(0);
    });

    it('cycles L0→L1→L2→L0 for node with definition + details', () => {
      expect(cycleExpandLevel(0, true, true)).toBe(1);
      expect(cycleExpandLevel(1, true, true)).toBe(2);
      expect(cycleExpandLevel(2, true, true)).toBe(0);
    });

    it('stays at L0 for node with no definition or details', () => {
      expect(cycleExpandLevel(0, false, false)).toBe(0);
    });

    it('handles details without definition (edge case)', () => {
      // If somehow details exist but not definition, maxLevel = 2
      expect(cycleExpandLevel(0, false, true)).toBe(1);
      expect(cycleExpandLevel(1, false, true)).toBe(2);
      expect(cycleExpandLevel(2, false, true)).toBe(0);
    });
  });

  describe('Reading mode toggle', () => {
    it('toggles between expand-all and progressive', () => {
      let mode: ReadingMode = 'expand-all';
      const toggle = () => { mode = mode === 'expand-all' ? 'progressive' : 'expand-all'; };

      toggle();
      expect(mode).toBe('progressive');
      toggle();
      expect(mode).toBe('expand-all');
    });

    it('resets every node expandLevel when entering progressive mode', () => {
      const nodes: RFNode[] = [
        { id: 'root', position: { x: 0, y: 0 }, data: { title: 'Root', expandLevel: 2 }, type: 'concept' },
        { id: 'sticky', position: { x: 10, y: 10 }, data: { title: 'Note', expandLevel: 1 }, type: 'sticky' },
      ];
      const reset = resetProgressiveExpandLevels(nodes);
      expect(reset.map((node) => node.data.expandLevel)).toEqual([0, 0]);
      expect(nodes.map((node) => node.data.expandLevel)).toEqual([2, 1]);
    });
  });

  describe('Progressive branch visibility', () => {
    const nodes = [
      { id: 'main', type: 'concept' },
      { id: 'second-a', type: 'concept' },
      { id: 'second-b', type: 'concept' },
      { id: 'third-a', type: 'concept' },
      { id: 'third-b', type: 'concept' },
      { id: 'fourth-a', type: 'concept' },
    ];
    const edges = [
      { source: 'main', target: 'second-a' },
      { source: 'main', target: 'second-b' },
      { source: 'second-a', target: 'third-a' },
      { source: 'second-b', target: 'third-b' },
      { source: 'third-a', target: 'fourth-a' },
    ];

    it('shows the main node and all second-level nodes first', () => {
      const visible = getProgressiveVisibleNodeIds(nodes, edges, new Set());

      expect([...visible].sort()).toEqual(['main', 'second-a', 'second-b'].sort());
      expect(visible.has('third-a')).toBe(false);
      expect(visible.has('third-b')).toBe(false);
    });

    it('reveals only the clicked second-level branch', () => {
      const expanded = toggleProgressiveBranch(new Set(), 'second-a', nodes, edges);
      const visible = getProgressiveVisibleNodeIds(nodes, edges, expanded);

      expect(visible.has('third-a')).toBe(true);
      expect(visible.has('third-b')).toBe(false);
    });

    it('collapses the selected branch without affecting sibling branches', () => {
      const expanded = toggleProgressiveBranch(new Set(), 'second-a', nodes, edges);
      const collapsed = toggleProgressiveBranch(expanded, 'second-a', nodes, edges);
      const visible = getProgressiveVisibleNodeIds(nodes, edges, collapsed);

      expect(visible.has('third-a')).toBe(false);
      expect(visible.has('second-b')).toBe(true);
    });

    it('continues one level at a time along the selected branch', () => {
      const secondExpanded = toggleProgressiveBranch(new Set(), 'second-a', nodes, edges);
      const afterSecond = getProgressiveVisibleNodeIds(nodes, edges, secondExpanded);
      expect(afterSecond.has('fourth-a')).toBe(false);

      const thirdExpanded = toggleProgressiveBranch(secondExpanded, 'third-a', nodes, edges);
      const afterThird = getProgressiveVisibleNodeIds(nodes, edges, thirdExpanded);
      expect(afterThird.has('fourth-a')).toBe(true);
      expect(afterThird.has('third-b')).toBe(false);
    });
  });

  describe('ViewState persistence shape', () => {
    it('includes readingMode in GraphViewState', () => {
      const state: GraphViewState = {
        readingMode: 'progressive',
        zoom: 1,
        panX: 0,
        panY: 0,
      };
      expect(state.readingMode).toBe('progressive');
    });

    it('serializes and deserializes correctly', () => {
      const state: GraphViewState = { ...DEFAULT_VIEW_STATE, readingMode: 'progressive' };
      const json = JSON.stringify(state);
      const parsed = JSON.parse(json) as GraphViewState;
      expect(parsed.readingMode).toBe('progressive');
    });
  });
});
