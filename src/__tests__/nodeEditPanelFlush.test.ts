import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NodeEditPanel } from '../../components/KnowledgeGraph/NodeEditPanel';
import type { GraphNodeData, GraphDocument } from '../../types/graphTypes';
import type { Node as RFNode } from '@xyflow/react';
import { useGraphStorage } from '../../hooks/useGraphStorage';
import { saveGraph } from '../../services/graphStorage';
import { ToastProvider } from '../../contexts/ToastContext';

describe('NodeEditPanel Debounce Flush Protection (H2)', () => {
  const initialData: GraphNodeData = {
    title: 'Initial Concept',
    definition: 'Initial Definition',
    details: 'Initial Details',
    color: '#3b82f6',
    fontSize: 'md',
  };

  // 場景 A：在節點 A 輸入 → 快速切換至節點 B → 節點 A 的更新被正確 flush 至節點 A
  it('Scenario A: switching nodes flushes pending update to the previous nodeId immediately', () => {
    const onUpdate = vi.fn();
    const onUpdateType = vi.fn();
    const onClose = vi.fn();

    const { getByPlaceholderText, rerender } = render(
      React.createElement(NodeEditPanel, {
        nodeId: 'node-A',
        data: initialData,
        nodeType: 'concept',
        onUpdate,
        onUpdateType,
        onClose,
      })
    );

    const input = getByPlaceholderText('概念名稱');
    fireEvent.change(input, { target: { value: 'Updated Concept A' } });

    // In-flight before debounce (300ms), immediately switch to node-B
    expect(onUpdate).not.toHaveBeenCalled();

    rerender(
      React.createElement(NodeEditPanel, {
        nodeId: 'node-B',
        data: { ...initialData, title: 'Concept B' },
        nodeType: 'concept',
        onUpdate,
        onUpdateType,
        onClose,
      })
    );

    // Node A's pending data must be flushed to 'node-A', not lost or applied to 'node-B'
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith('node-A', expect.objectContaining({ title: 'Updated Concept A' }));
  });

  // 場景 B：組件卸載時 flush pending 更新至當前節點
  it('Scenario B: unmounting component flushes pending update to current nodeId', () => {
    const onUpdate = vi.fn();
    const onUpdateType = vi.fn();
    const onClose = vi.fn();

    const { getByPlaceholderText, unmount } = render(
      React.createElement(NodeEditPanel, {
        nodeId: 'node-B',
        data: initialData,
        nodeType: 'concept',
        onUpdate,
        onUpdateType,
        onClose,
      })
    );

    const input = getByPlaceholderText('概念名稱');
    fireEvent.change(input, { target: { value: 'Pending Unmount Title' } });

    expect(onUpdate).not.toHaveBeenCalled();

    // Unmount before debounce timer fires
    unmount();

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith('node-B', expect.objectContaining({ title: 'Pending Unmount Title' }));
  });

  // 場景 C：觸發 beforeunload 事件時 flush pending 更新 (D10-001)
  it('Scenario C: triggering beforeunload event flushes pending update synchronously', () => {
    const onUpdate = vi.fn();
    const onUpdateType = vi.fn();
    const onClose = vi.fn();

    const { getByPlaceholderText } = render(
      React.createElement(NodeEditPanel, {
        nodeId: 'node-C',
        data: initialData,
        nodeType: 'concept',
        onUpdate,
        onUpdateType,
        onClose,
      })
    );

    const input = getByPlaceholderText('概念名稱');
    fireEvent.change(input, { target: { value: 'Beforeunload Flush Title' } });

    expect(onUpdate).not.toHaveBeenCalled();

    // Simulate browser window or tab closing
    window.dispatchEvent(new Event('beforeunload'));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith('node-C', expect.objectContaining({ title: 'Beforeunload Flush Title' }), { immediateSave: true });
  });

  // 場景 D：整合真實 useGraphStorage，在輸入後立即派發 beforeunload，斷言 localStorage 同步包含最新輸入內容
  it('Scenario D: full beforeunload pipeline synchronously writes to localStorage and clears pending timer', () => {
    const graphId = 'graph-sync-chain-test';
    const initialDoc: GraphDocument = {
      id: graphId,
      schemaVersion: 3,
      name: 'Integration Test Graph',
      backgroundOpacity: 'translucent',
      layoutMode: 'free',
      theme: 'classic',
      nodes: [
        {
          id: 'node-sync-1',
          data: { title: 'Old Title', definition: 'Old Def', color: '#3b82f6', fontSize: 'md' },
          type: 'concept',
          position: { x: 0, y: 0 },
        },
      ],
      edges: [],
      viewState: { readingMode: 'progressive', zoom: 1, panX: 0, panY: 0 },
      notes: {},
      editMode: 'visual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveGraph(initialDoc);

    const IntegrationHarness: React.FC = () => {
      const [nodes, setNodes] = React.useState<RFNode[]>([
        {
          id: 'node-sync-1',
          type: 'concept',
          position: { x: 0, y: 0 },
          data: { title: 'Old Title', definition: 'Old Def', color: '#3b82f6', fontSize: 'md' },
        },
      ]);
      const nodesRef = React.useRef(nodes);
      React.useEffect(() => {
        nodesRef.current = nodes;
      }, [nodes]);

      const { flushSave } = useGraphStorage(
        initialDoc,
        nodes,
        [],
        {},
        'progressive',
        'visual',
        'translucent',
        'free',
        'classic'
      );

      const handleUpdateNodeData = (nodeId: string, partial: Partial<GraphNodeData>, options?: { immediateSave?: boolean }) => {
        const nextNodes = nodesRef.current.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...partial } } : n
        );
        nodesRef.current = nextNodes;
        setNodes(nextNodes);
        if (options?.immediateSave) {
          flushSave(nextNodes);
        }
      };

      return React.createElement(NodeEditPanel, {
        nodeId: 'node-sync-1',
        data: nodes[0].data as unknown as GraphNodeData,
        nodeType: 'concept',
        onUpdate: handleUpdateNodeData,
        onUpdateType: () => {},
        onClose: () => {},
      });
    };

    const { getByPlaceholderText } = render(
      React.createElement(ToastProvider, null, React.createElement(IntegrationHarness))
    );

    const input = getByPlaceholderText('概念名稱');
    fireEvent.change(input, { target: { value: 'Synchronous Chain Title' } });

    // 尚未觸發 beforeunload 前，localStorage 不應含有新標題
    const rawBefore = localStorage.getItem('mindspark_graphs');
    expect(rawBefore).not.toContain('Synchronous Chain Title');

    // 派發 beforeunload 事件
    window.dispatchEvent(new Event('beforeunload'));

    // 斷言 localStorage 同步包含最新輸入內容
    const rawAfter = localStorage.getItem('mindspark_graphs');
    expect(rawAfter).toContain('Synchronous Chain Title');
  });
});
