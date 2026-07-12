import { describe, it, expect } from 'vitest';
import { applyRadialLayout } from '../../services/radialLayout';
import { type Node as RFNode, type Edge as RFEdge } from '@xyflow/react';

describe('Radial Layout Algorithm', () => {
  it('測試空輸入容錯', () => {
    const result = applyRadialLayout([], []);
    expect(result).toEqual([]);
  });

  it('測試單一節點佈局（應在中心點 0, 0）', () => {
    const nodes: RFNode[] = [
      { id: 'n1', position: { x: 10, y: 10 }, data: {}, type: 'concept' }
    ];
    const result = applyRadialLayout(nodes, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('n1');
    expect(result[0].position).toEqual({ x: 0, y: 0 });
  });

  it('測試根節點的選擇：優先選擇入度為 0 的節點', () => {
    // 雖然 n2 在前面，但 n1 入度為 0，出度為 1 (n1 -> n2)
    // 所以 n1 應該被選為根節點並定位於 (0, 0)
    const nodes: RFNode[] = [
      { id: 'n2', position: { x: 10, y: 10 }, data: {}, type: 'concept' },
      { id: 'n1', position: { x: 20, y: 20 }, data: {}, type: 'concept' },
    ];
    const edges: RFEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2' }
    ];

    const result = applyRadialLayout(nodes, edges);
    const n1 = result.find(n => n.id === 'n1');
    const n2 = result.find(n => n.id === 'n2');

    expect(n1?.position).toEqual({ x: 0, y: 0 });
    // n2 在深度 1，角度 theta = 0, 所以 x = 200 * cos(0) = 200, y = 200 * sin(0) = 0
    expect(n2?.position).toEqual({ x: 200, y: 0 });
  });

  it('測試根節點選擇：若有多個入度為 0 的節點，選擇 nodes 中第一個', () => {
    // n1 與 n2 入度皆為 0
    const nodes: RFNode[] = [
      { id: 'n1', position: { x: 10, y: 10 }, data: {}, type: 'concept' },
      { id: 'n2', position: { x: 20, y: 20 }, data: {}, type: 'concept' },
      { id: 'n3', position: { x: 30, y: 30 }, data: {}, type: 'concept' },
    ];
    const edges: RFEdge[] = [
      { id: 'e1', source: 'n1', target: 'n3' },
      { id: 'e2', source: 'n2', target: 'n3' },
    ];

    const result = applyRadialLayout(nodes, edges);
    // n1 是 nodes 中第一個，應被選為根節點定位在 (0, 0)
    const n1 = result.find(n => n.id === 'n1');
    expect(n1?.position).toEqual({ x: 0, y: 0 });
  });

  it('測試多層級角度均分與半徑遞增', () => {
    // 結構為： n1 (L0) -> n2, n3 (L1) -> n4 (L2)
    const nodes: RFNode[] = [
      { id: 'n1', position: { x: 0, y: 0 }, data: {}, type: 'concept' },
      { id: 'n2', position: { x: 0, y: 0 }, data: {}, type: 'concept' },
      { id: 'n3', position: { x: 0, y: 0 }, data: {}, type: 'concept' },
      { id: 'n4', position: { x: 0, y: 0 }, data: {}, type: 'concept' },
    ];
    const edges: RFEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n1', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
    ];

    const result = applyRadialLayout(nodes, edges);
    const n1 = result.find(n => n.id === 'n1')!;
    const n2 = result.find(n => n.id === 'n2')!;
    const n3 = result.find(n => n.id === 'n3')!;
    const n4 = result.find(n => n.id === 'n4')!;

    // n1 (L0) 在 (0, 0)
    expect(n1.position).toEqual({ x: 0, y: 0 });

    // L1 有 n2 與 n3 (Nd = 2, step = 200)
    // 角度分別為 0 與 PI
    // n2: x = 200 * cos(0) = 200, y = 200 * sin(0) = 0
    // n3: x = 200 * cos(PI) = -200, y = 200 * sin(PI) = 0 (極小值會被 round)
    expect(Math.abs(n2.position.x)).toBeCloseTo(200);
    expect(Math.abs(n2.position.y)).toBeCloseTo(0);
    expect(Math.abs(n3.position.x)).toBeCloseTo(200); // x = -200
    expect(Math.abs(n3.position.y)).toBeCloseTo(0);

    // L2 有 n4 (Nd = 1, step = 200)
    // 半徑 d * step = 2 * 200 = 400
    // 角度為 0 (只有一個節點)，所以 x = 400, y = 0
    expect(n4.position).toEqual({ x: 400, y: 0 });
  });

  it('測試同層超過 12 節點防重疊（自動加大半徑步長）', () => {
    // 根節點 n0，與 13 個子節點相連
    const nodes: RFNode[] = [{ id: 'n0', position: { x: 0, y: 0 }, data: {}, type: 'concept' }];
    const edges: RFEdge[] = [];

    for (let i = 1; i <= 13; i++) {
      nodes.push({ id: `n${i}`, position: { x: 0, y: 0 }, data: {}, type: 'concept' });
      edges.push({ id: `e${i}`, source: 'n0', target: `n${i}` });
    }

    const result = applyRadialLayout(nodes, edges);
    // 第一層有 13 個節點，Nd = 13 > 12，所以 step 應大於等於 300
    // 驗證子節點的距離： Math.sqrt(x^2 + y^2) 應為 step
    const n1 = result.find(n => n.id === 'n1')!;
    const distance = Math.sqrt(n1.position.x * n1.position.x + n1.position.y * n1.position.y);
    expect(distance).toBeGreaterThanOrEqual(300);
  });

  it('測試孤立節點的右側垂直排列', () => {
    // n1 與 n2 相連 (L0, L1)，n3 與 n4 是孤立節點
    const nodes: RFNode[] = [
      { id: 'n1', position: { x: 0, y: 0 }, data: {}, type: 'concept' },
      { id: 'n2', position: { x: 0, y: 0 }, data: {}, type: 'concept' },
      { id: 'n3', position: { x: 0, y: 0 }, data: {}, type: 'concept' },
      { id: 'n4', position: { x: 0, y: 0 }, data: {}, type: 'concept' },
    ];
    const edges: RFEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2' }
    ];

    const result = applyRadialLayout(nodes, edges);
    const n3 = result.find(n => n.id === 'n3')!;
    const n4 = result.find(n => n.id === 'n4')!;

    // 結構節點最大深度為 1，所以右側起點 X 座標應為大於等於 500 的值 (maxConnectedDepth * 200 + 300 = 500)
    expect(n3.position.x).toBe(500);
    expect(n4.position.x).toBe(500);

    // 垂直排列 Y 座標：兩個孤立節點時，j=0,1， Y 分別為 -50 與 50
    expect(n3.position.y).toBe(-50);
    expect(n4.position.y).toBe(50);
  });

  it('測試環狀圖（無入度為 0 的節點）之根節點選擇與佈局', () => {
    // 環形結構: n1 -> n2 -> n3 -> n1
    const nodes: RFNode[] = [
      { id: 'n1', position: { x: 0, y: 0 }, data: {}, type: 'concept' },
      { id: 'n2', position: { x: 0, y: 0 }, data: {}, type: 'concept' },
      { id: 'n3', position: { x: 0, y: 0 }, data: {}, type: 'concept' },
    ];
    const edges: RFEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n1' },
    ];

    const result = applyRadialLayout(nodes, edges);
    // 應無入度為 0 節點，故選擇第一個節點 n1 作為根
    const n1 = result.find(n => n.id === 'n1')!;
    expect(n1.position).toEqual({ x: 0, y: 0 });

    const n2 = result.find(n => n.id === 'n2')!;
    const n3 = result.find(n => n.id === 'n3')!;
    // n2 與 n3 的深度皆應大於 0
    expect(n2.position).not.toEqual({ x: 0, y: 0 });
    expect(n3.position).not.toEqual({ x: 0, y: 0 });
  });
});
