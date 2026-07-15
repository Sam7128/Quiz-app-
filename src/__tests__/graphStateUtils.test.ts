import { describe, expect, it } from 'vitest';
import type { OnConnectStartParams } from '@xyflow/react';
import { createDropConnection, getDropMenuPoint, toggleEdgeMarkers } from '@/hooks/graphStateUtils';

describe('graphStateUtils', () => {
  it('creates each DropNodeMenu shape with a connected arrow edge', () => {
    const start: OnConnectStartParams = { nodeId: 'source', handleId: 'b', handleType: 'source' };
    for (const type of ['concept', 'rounded', 'diamond', 'sticky'] as const) {
      const result = createDropConnection(type, { x: 12, y: 34 }, start, 0, ['#3B82F6']);
      expect(result.node.type).toBe(type);
      expect(result.node.position).toEqual({ x: 12, y: 34 });
      expect(result.edge.source).toBe('source');
      expect(result.edge.target).toBe(result.node.id);
      expect(result.edge.markerEnd).toBeDefined();
    }
  });

  it('cycles edge markers arrow → both → none → arrow', () => {
    const arrow = { id: 'e', source: 'a', target: 'b', markerEnd: { type: 'arrowclosed' as const } };
    const both = toggleEdgeMarkers(arrow);
    const none = toggleEdgeMarkers(both);
    const nextArrow = toggleEdgeMarkers(none);
    expect(both.markerStart).toBeDefined();
    expect(both.markerEnd).toBeDefined();
    expect(none.markerStart).toBeUndefined();
    expect(none.markerEnd).toBeUndefined();
    expect(nextArrow.markerEnd).toBeDefined();
  });

  it('opens from a clicked handle but still ignores a node body target', () => {
    const canvas = document.createElement('div');
    const node = document.createElement('div');
    node.className = 'react-flow__node';
    const handle = document.createElement('button');
    handle.className = 'react-flow__handle';
    node.appendChild(handle);
    canvas.appendChild(node);
    document.body.appendChild(canvas);
    const canvasEvent = new MouseEvent('mouseup', { clientX: 10, clientY: 20, bubbles: true });
    const nodeEvent = new MouseEvent('mouseup', { clientX: 10, clientY: 20, bubbles: true });
    const handleEvent = new MouseEvent('mouseup', { clientX: 30, clientY: 40, bubbles: true });
    canvas.dispatchEvent(canvasEvent);
    node.dispatchEvent(nodeEvent);
    handle.dispatchEvent(handleEvent);
    expect(getDropMenuPoint(canvasEvent)).toEqual({ clientX: 10, clientY: 20 });
    expect(getDropMenuPoint(nodeEvent)).toBeNull();
    expect(getDropMenuPoint(handleEvent, true)).toEqual({ clientX: 30, clientY: 40 });
    canvas.remove();
  });
});
