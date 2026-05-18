/**
 * Reading Modes — unit tests for progressive L1→L2→L3 cycle logic
 * Validates the expand-level cycling and reading mode persistence.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_VIEW_STATE } from '@/types/graphTypes';
import type { ReadingMode, GraphViewState } from '@/types/graphTypes';

/**
 * Simulates the progressive expand level cycling logic
 * as implemented in GraphEditor.handleNodeClick.
 */
function cycleExpandLevel(
  currentLevel: number,
  hasDefinition: boolean,
  hasDetails: boolean
): number {
  const maxLevel = hasDetails ? 2 : hasDefinition ? 1 : 0;
  return currentLevel >= maxLevel ? 0 : currentLevel + 1;
}

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
