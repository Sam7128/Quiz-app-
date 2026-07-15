import { act, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useGraphStorage } from '../../hooks/useGraphStorage';
import { saveGraph } from '../../services/graphStorage';
import type { GraphDocument } from '../../types/graphTypes';
import type { Node as RFNode } from '@xyflow/react';

// Mock saveGraph
vi.mock('../../services/graphStorage', () => ({
  saveGraph: vi.fn(() => ({ success: true })),
}));

// Mock ToastContext with stable reference
const stableToast = {
  warning: vi.fn(),
  success: vi.fn(),
};
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => stableToast,
}));

describe('useGraphStorage Hook', () => {
  const initialGraph: GraphDocument = {
    id: 'test-graph-id',
    schemaVersion: 3,
    name: 'Test Graph',
    backgroundOpacity: 'translucent',
    layoutMode: 'free',
    theme: 'classic',
    nodes: [],
    edges: [],
    viewState: { readingMode: 'progressive', zoom: 1, panX: 0, panY: 0 },
    notes: {},
    editMode: 'visual',
    createdAt: '2026-07-13T00:00:00Z',
    updatedAt: '2026-07-13T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('元件 mount 時，若無實質變更不應排程儲存定時器', () => {
    renderHook(() =>
      useGraphStorage(initialGraph, [], [], {}, 'progressive', 'visual')
    );

    expect(saveGraph).not.toHaveBeenCalled();

    // 時間推進 2000ms
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // 不應觸發儲存
    expect(saveGraph).not.toHaveBeenCalled();
  });

  it('在頻繁編輯時（每次間隔小於 2000ms），自動儲存的 2000ms debounce 應正常工作且不重複觸發 write IO', () => {
    let nodesList: RFNode[] = [];
    const { rerender } = renderHook(
      ({ nodes }) =>
        useGraphStorage(initialGraph, nodes, [], {}, 'progressive', 'visual'),
      {
        initialProps: { nodes: nodesList },
      }
    );

    // 模擬 5 次頻繁修改，每次間隔 500ms
    for (let i = 1; i <= 5; i++) {
      act(() => {
        vi.advanceTimersByTime(500);
      });
      nodesList = [{ id: `n-${i}`, position: { x: i, y: i }, data: { title: `Node ${i}`, color: '#3B82F6', fontSize: 'md' }, type: 'concept' }];
      rerender({ nodes: nodesList });
    }

    // 在這 2.5 秒的打字過程中，saveGraph 不應該被呼叫（每次都被 debounce 延長）
    expect(saveGraph).not.toHaveBeenCalled();

    // 停止編輯後，等待 2000ms
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // saveGraph 應該只被呼叫 1 次（最後一次編輯的儲存）
    expect(saveGraph).toHaveBeenCalledTimes(1);
  });

  it('當元件 unmount 時，若有 pending timer，應立即 flush 儲存資料，防止資料遺失', () => {
    let nodesList: RFNode[] = [];
    const { rerender, unmount } = renderHook(
      ({ nodes }) =>
        useGraphStorage(initialGraph, nodes, [], {}, 'progressive', 'visual'),
      {
        initialProps: { nodes: nodesList },
      }
    );

    // 變更 nodes 觸發 timer
    nodesList = [{ id: 'n-1', position: { x: 0, y: 0 }, data: { title: 'Node 1', color: '#3B82F6', fontSize: 'md' }, type: 'concept' }];
    rerender({ nodes: nodesList });

    expect(saveGraph).not.toHaveBeenCalled();

    // 立即 unmount
    unmount();

    // 應該立即觸發 saveGraph，不需等待 2000ms
    expect(saveGraph).toHaveBeenCalledTimes(1);
  });

  it('若沒有 pending 的 timer（已儲存完成），unmount 時不應重複觸發儲存（無效 write IO 漏洞修復）', () => {
    let nodesList: RFNode[] = [];
    const { rerender, unmount } = renderHook(
      ({ nodes }) =>
        useGraphStorage(initialGraph, nodes, [], {}, 'progressive', 'visual'),
      {
        initialProps: { nodes: nodesList },
      }
    );

    // 變更 nodes 觸發 timer
    nodesList = [{ id: 'n-1', position: { x: 0, y: 0 }, data: { title: 'Node 1', color: '#3B82F6', fontSize: 'md' }, type: 'concept' }];
    rerender({ nodes: nodesList });

    // 等待 2000ms 完成首次自動儲存
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(saveGraph).toHaveBeenCalledTimes(1);

    // 此時 saveTimerRef 應該是 null（沒有掛起的定時器），我們再 unmount
    unmount();

    // saveGraph 不應該被重複呼叫（保持 1 次）
    expect(saveGraph).toHaveBeenCalledTimes(1);
  });

  it('當瀏覽器觸發 beforeunload 事件時，若有 pending timer，應立即 flush 緩存資料', () => {
    let nodesList: RFNode[] = [];
    const { rerender } = renderHook(
      ({ nodes }) =>
        useGraphStorage(initialGraph, nodes, [], {}, 'progressive', 'visual'),
      {
        initialProps: { nodes: nodesList },
      }
    );

    nodesList = [{ id: 'n-1', position: { x: 0, y: 0 }, data: { title: 'Node 1', color: '#3B82F6', fontSize: 'md' }, type: 'concept' }];
    rerender({ nodes: nodesList });

    expect(saveGraph).not.toHaveBeenCalled();

    // 觸發 beforeunload
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(saveGraph).toHaveBeenCalledTimes(1);
  });

  it('當瀏覽器觸發 visibilitychange 且 visibilityState 為 hidden 時，若有 pending timer，應立即 flush 緩存資料', () => {
    let nodesList: RFNode[] = [];
    const { rerender } = renderHook(
      ({ nodes }) =>
        useGraphStorage(initialGraph, nodes, [], {}, 'progressive', 'visual'),
      {
        initialProps: { nodes: nodesList },
      }
    );

    nodesList = [{ id: 'n-1', position: { x: 0, y: 0 }, data: { title: 'Node 1', color: '#3B82F6', fontSize: 'md' }, type: 'concept' }];
    rerender({ nodes: nodesList });

    expect(saveGraph).not.toHaveBeenCalled();

    // Mock document.visibilityState to 'hidden'
    const visibilityStateSpy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

    // 觸發 visibilitychange
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(saveGraph).toHaveBeenCalledTimes(1);
    visibilityStateSpy.mockRestore();
  });

  it('當瀏覽器觸發 visibilitychange 且 visibilityState 為 visible 時，不應觸發儲存', () => {
    let nodesList: RFNode[] = [];
    const { rerender } = renderHook(
      ({ nodes }) =>
        useGraphStorage(initialGraph, nodes, [], {}, 'progressive', 'visual'),
      {
        initialProps: { nodes: nodesList },
      }
    );

    nodesList = [{ id: 'n-1', position: { x: 0, y: 0 }, data: { title: 'Node 1', color: '#3B82F6', fontSize: 'md' }, type: 'concept' }];
    rerender({ nodes: nodesList });

    expect(saveGraph).not.toHaveBeenCalled();

    // Mock document.visibilityState to 'visible'
    const visibilityStateSpy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');

    // 觸發 visibilitychange
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(saveGraph).not.toHaveBeenCalled();
    visibilityStateSpy.mockRestore();
  });

  it('當元件 unmount 時，應確實清理定時器以防止 memory leaks', () => {
    let nodesList: RFNode[] = [];
    const { rerender, unmount } = renderHook(
      ({ nodes }) =>
        useGraphStorage(initialGraph, nodes, [], {}, 'progressive', 'visual'),
      {
        initialProps: { nodes: nodesList },
      }
    );

    nodesList = [{ id: 'n-1', position: { x: 0, y: 0 }, data: { title: 'Node 1', color: '#3B82F6', fontSize: 'md' }, type: 'concept' }];
    rerender({ nodes: nodesList });

    // 模擬 unmount
    unmount();

    // 我們確認在 unmount 後，若時間再度流逝，saveGraph 不會再被呼叫更多的次數
    // （在 unmount 時會調用 1 次儲存，如果計時器沒有被清理，計時器到期時可能又會再調用一次）
    expect(saveGraph).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // 依然只有 1 次，表示 timer 確實已被清除
    expect(saveGraph).toHaveBeenCalledTimes(1);
  });
});
