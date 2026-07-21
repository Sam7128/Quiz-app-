import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGraphCodeMode } from '../../hooks/useGraphCodeMode';
import type { GraphDocument } from '../../types/graphTypes';
import type { Node as RFNode, Edge as RFEdge } from '@xyflow/react';

const mockGraph: GraphDocument = {
  id: 'graph-1',
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
  createdAt: '',
  updatedAt: ''
};

describe('Challenger 1: useGraphCodeMode Heuristics and Edge Cases', () => {
  it('驗證 Levenshtein 距離 <= 2 模糊匹配是否能正確保留 UUID, 位置, 形狀, 顏色, 與字型大小', () => {
    // 設置初始的視覺狀態（舊節點）
    // 根節點: "根概念", 子節點: "原概念" (UUID: "node-child-uuid", 帶有自訂樣式與位置)
    const initialNodes: RFNode[] = [
      {
        id: 'node-root-uuid',
        position: { x: 100, y: 100 },
        data: { title: '根概念', color: '#111111', fontSize: 'lg' },
        type: 'rounded'
      },
      {
        id: 'node-child-uuid',
        position: { x: 200, y: 200 },
        data: { title: '原概念', color: '#EF4444', fontSize: 'sm' },
        type: 'diamond'
      }
    ];

    const initialEdges: RFEdge[] = [
      {
        id: 'edge-1',
        source: 'node-root-uuid',
        target: 'node-child-uuid'
      }
    ];

    const initialNotes: Record<string, string> = { '原概念': '這是原概念的筆記' };

    let currentNodes = initialNodes;
    let currentEdges = initialEdges;
    let currentNotesDict = initialNotes;

    const setNodes = (update: RFNode[] | ((prev: RFNode[]) => RFNode[])) => {
      currentNodes = typeof update === 'function' ? update(currentNodes) : update;
    };
    const setEdges = (update: RFEdge[] | ((prev: RFEdge[]) => RFEdge[])) => {
      currentEdges = typeof update === 'function' ? update(currentEdges) : update;
    };
    const setNotesDict = (update: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
      currentNotesDict = typeof update === 'function' ? update(currentNotesDict) : update;
    };

    const { result } = renderHook(() =>
      useGraphCodeMode(
        mockGraph,
        currentNodes,
        currentEdges,
        currentNotesDict,
        setNodes,
        setEdges,
        setNotesDict
      )
    );

    // 模擬代碼模式下的 Markdown 編輯：將 "原概念" 改名為 "新概念" (Levenshtein 編輯距離為 1)
    // 且路徑依然維持在 "根概念" 之下
    const newMarkdown = '# 概念圖\n- 根概念\n  - 新概念';
    
    act(() => {
      result.current.handleCodeChange(newMarkdown);
    });

    // 驗證節點是否成功對齊 (使用模糊匹配)
    // 預期 "新概念" 能成功對齊 "原概念"
    const matchedChild = currentNodes.find(n => n.data.title === '新概念');
    expect(matchedChild).toBeDefined();
    
    // 1. 驗證 UUID 保留
    expect(matchedChild?.id).toBe('node-child-uuid');
    
    // 2. 驗證自訂形狀保留 (type)
    expect(matchedChild?.type).toBe('diamond');
    
    // 3. 驗證自訂顏色保留 (color)
    expect(matchedChild?.data.color).toBe('#EF4444');
    
    // 4. 驗證自訂字體保留 (fontSize)
    expect(matchedChild?.data.fontSize).toBe('sm');
    
    // 5. 驗證坐標保留 (position)
    expect(matchedChild?.position).toEqual({ x: 200, y: 200 });

    // 6. 驗證 notes 級聯變更
    expect(currentNotesDict['新概念']).toBe('這是原概念的筆記');
    expect(currentNotesDict['原概念']).toBeUndefined();
  });

  it('挑戰：當 Levenshtein 距離 > 2 時是否匹配失敗並導致 ID 與樣式丟失，且 notes 殘留或遺失', () => {
    const initialNodes: RFNode[] = [
      {
        id: 'node-root-uuid',
        position: { x: 100, y: 100 },
        data: { title: '根概念', color: '#111111', fontSize: 'lg' },
        type: 'rounded'
      },
      {
        id: 'node-child-uuid',
        position: { x: 200, y: 200 },
        data: { title: '原概念', color: '#EF4444', fontSize: 'sm' },
        type: 'diamond'
      }
    ];

    const initialEdges: RFEdge[] = [
      { id: 'edge-1', source: 'node-root-uuid', target: 'node-child-uuid' }
    ];

    const initialNotes: Record<string, string> = { '原概念': '這是原概念的筆記' };

    let currentNodes = initialNodes;
    let currentEdges = initialEdges;
    let currentNotesDict = initialNotes;

    const setNodes = (update: RFNode[] | ((prev: RFNode[]) => RFNode[])) => { currentNodes = typeof update === 'function' ? update(currentNodes) : update; };
    const setEdges = (update: RFEdge[] | ((prev: RFEdge[]) => RFEdge[])) => { currentEdges = typeof update === 'function' ? update(currentEdges) : update; };
    const setNotesDict = (update: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => { currentNotesDict = typeof update === 'function' ? update(currentNotesDict) : update; };

    const { result } = renderHook(() =>
      useGraphCodeMode(mockGraph, currentNodes, currentEdges, currentNotesDict, setNodes, setEdges, setNotesDict)
    );

    // 改名為 "徹底不同之概念" (Levenshtein 編輯距離為 7 > 2)
    const newMarkdown = '# 概念圖\n- 根概念\n  - 徹底不同之概念';
    
    act(() => {
      result.current.handleCodeChange(newMarkdown);
    });

    const newChild = currentNodes.find(n => n.data.title === '徹底不同之概念');
    expect(newChild).toBeDefined();
    
    // 應匹配失敗，使用新產生的 ID
    expect(newChild?.id).not.toBe('node-child-uuid');
    
    // 自訂樣式與位置被重置 (使用新 parsed 得到的預設值)
    expect(newChild?.type).toBe('concept'); // 預設值
    expect(newChild?.data.color).not.toBe('#EF4444');
    expect(newChild?.position).not.toEqual({ x: 200, y: 200 }); // 由 layout 重新分配的位置

    // notes 沒有被級聯更名！
    expect(currentNotesDict['徹底不同之概念']).toBeUndefined();
    // 舊筆記依然殘留在 dictionary 中！形成孤立垃圾資料
    expect(currentNotesDict['原概念']).toBe('這是原概念的筆記');
  });

  it('新增節點時維持 ID 唯一且不複製既有 node-3', () => {
    const initialNodes: RFNode[] = [
      { id: 'node-1', position: { x: 10, y: 10 }, data: { title: '概念 A', color: 'blue', fontSize: 'md' }, type: 'concept' },
      { id: 'node-3', position: { x: 20, y: 20 }, data: { title: '概念 B', color: 'green', fontSize: 'md' }, type: 'concept' }
    ];
    const initialEdges: RFEdge[] = [];
    const initialNotes = {};

    let currentNodes = initialNodes;
    let currentEdges = initialEdges;
    let currentNotesDict = initialNotes;

    const setNodes = (update: RFNode[] | ((prev: RFNode[]) => RFNode[])) => { currentNodes = typeof update === 'function' ? update(currentNodes) : update; };
    const setEdges = (update: RFEdge[] | ((prev: RFEdge[]) => RFEdge[])) => { currentEdges = typeof update === 'function' ? update(currentEdges) : update; };
    const setNotesDict = (update: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => { currentNotesDict = typeof update === 'function' ? update(currentNotesDict) : update; };

    const { result } = renderHook(() =>
      useGraphCodeMode(mockGraph, currentNodes, currentEdges, currentNotesDict, setNodes, setEdges, setNotesDict)
    );

    const newMarkdown = '# 概念圖\n- 概念 A\n- 概念 C\n- 概念 D';

    act(() => {
      result.current.handleCodeChange(newMarkdown);
    });

    const ids = currentNodes.map(n => n.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter(id => id === 'node-3')).toHaveLength(1);
  });

  it('挑戰：同名重複節點在不同路徑下的筆記共享缺陷與改名級聯刪除缺陷', () => {
    // 初始狀態：兩個同名節點在不同路徑下，共享 '概念 B' 的 notes 鍵
    const initialNodes: RFNode[] = [
      { id: 'uuid-1', position: { x: 10, y: 10 }, data: { title: '根 A', color: 'blue', fontSize: 'md' }, type: 'concept' },
      { id: 'uuid-2', position: { x: 20, y: 20 }, data: { title: '概念 B', color: 'blue', fontSize: 'md' }, type: 'concept' }, // 根 A/概念 B
      { id: 'uuid-3', position: { x: 30, y: 30 }, data: { title: '根 C', color: 'blue', fontSize: 'md' }, type: 'concept' },
      { id: 'uuid-4', position: { x: 40, y: 40 }, data: { title: '概念 B', color: 'blue', fontSize: 'md' }, type: 'concept' }  // 根 C/概念 B
    ];
    const initialEdges: RFEdge[] = [
      { id: 'e1', source: 'uuid-1', target: 'uuid-2' },
      { id: 'e2', source: 'uuid-3', target: 'uuid-4' }
    ];
    const initialNotes: Record<string, string> = { '概念 B': '這是共享的筆記內容' };

    let currentNodes = initialNodes;
    let currentEdges = initialEdges;
    let currentNotesDict = initialNotes;

    const setNodes = (update: RFNode[] | ((prev: RFNode[]) => RFNode[])) => { currentNodes = typeof update === 'function' ? update(currentNodes) : update; };
    const setEdges = (update: RFEdge[] | ((prev: RFEdge[]) => RFEdge[])) => { currentEdges = typeof update === 'function' ? update(currentEdges) : update; };
    const setNotesDict = (update: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => { currentNotesDict = typeof update === 'function' ? update(currentNotesDict) : update; };

    const { result } = renderHook(() =>
      useGraphCodeMode(mockGraph, currentNodes, currentEdges, currentNotesDict, setNodes, setEdges, setNotesDict)
    );

    // 改名：將其中一個 '概念 B' 改名為 '概念 B 改' (Levenshtein 編輯距離為 1)
    // 根 A 之下改名，根 C 之下保持原名
    const newMarkdown = '# 概念圖\n- 根 A\n  - 概念 B 改\n- 根 C\n  - 概念 B';

    act(() => {
      result.current.handleCodeChange(newMarkdown);
    });

    // 預期級聯變更會執行：
    // renamePairs 收集了: { oldTitle: '概念 B', newTitle: '概念 B 改' }
    // notes 級聯邏輯執行：
    // notesDict['概念 B 改'] = notesDict['概念 B']
    // 檢查到畫布上還有另一個 '概念 B'，因此保留舊筆記鍵值，僅為新標題建立副本筆記。
    expect(currentNotesDict['概念 B 改']).toBe('這是共享的筆記內容');
    expect(currentNotesDict['概念 B']).toBe('這是共享的筆記內容'); // 修正：缺陷修復後，原本的 '概念 B' 筆記應被正確保留！
  });
});
