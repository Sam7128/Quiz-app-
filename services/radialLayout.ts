import { type Node as RFNode, type Edge as RFEdge } from '@xyflow/react';

/**
 * 放射狀佈局演算法 (Radial Layout Algorithm)
 * 
 * 1. 根節點偵測：優先選擇入度（in-degree）為 0 的節點；若無或有多個，則選擇 `nodes` 陣列中的第一個節點。
 *    注意：孤立節點（入度與出度均為 0）將不參與此處的結構根節點選擇，而是會被直接定位到右側。
 * 2. 使用 BFS 演算法遍歷節點與連線，為每個結構節點分配層級深度 (depth)。
 * 3. 座標計算：設第 d 層 (d >= 1) 節點總數為 Nd，則該層的第 i 個節點角度 theta_i = i * 2pi / Nd，
 *    坐標為 x = cx + (d * step) * cos(theta_i), y = cy + (d * step) * sin(theta_i)。中心點 (cx, cy) 設為 (0, 0)。
 * 4. 防止重疊：當某一層的節點數 Nd > 12 時，自動加大該層的半徑步長（例如將 step 加大為 300 或是與數量成正比擴張）。
 * 5. 孤立節點處理：若節點與任何邊都無關聯（入度出度皆為 0），則將它們定位於畫布的右側，呈垂直排列。
 */
export function applyRadialLayout(nodes: RFNode[], edges: RFEdge[]): RFNode[] {
  if (nodes.length === 0) return [];

  // 計算每個節點的入度與出度
  const inDegree: Record<string, number> = {};
  const outDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};

  for (const node of nodes) {
    inDegree[node.id] = 0;
    outDegree[node.id] = 0;
    adj[node.id] = [];
  }

  // 建立無向鄰接表以供 BFS 遍歷所有連通分量
  for (const edge of edges) {
    const s = edge.source;
    const t = edge.target;

    if (adj[s] !== undefined && adj[t] !== undefined) {
      outDegree[s]++;
      inDegree[t]++;
      adj[s].push(t);
      adj[t].push(s);
    }
  }

  // 根節點偵測：
  // 優先從非孤立節點（入度或出度 > 0）中尋找入度為 0 的節點。
  // 若無或有多個，或者根本沒有非孤立節點，則選擇 nodes 陣列中的第一個節點。
  const nonIsolated = nodes.filter(n => inDegree[n.id] > 0 || outDegree[n.id] > 0);
  let rootNode: RFNode | null = null;

  if (nonIsolated.length > 0) {
    const zeroInDegreeConnected = nonIsolated.filter(n => inDegree[n.id] === 0);
    if (zeroInDegreeConnected.length === 1) {
      rootNode = zeroInDegreeConnected[0];
    } else {
      rootNode = nodes[0];
    }
  } else {
    rootNode = nodes[0];
  }

  // 區分孤立節點與結構節點
  // 根節點即便無連線，也視為結構節點（定位於 0, 0）
  const isolatedNodes: RFNode[] = [];
  const connectedNodes: RFNode[] = [];

  for (const node of nodes) {
    if (rootNode && node.id === rootNode.id) {
      connectedNodes.push(node);
    } else if (inDegree[node.id] === 0 && outDegree[node.id] === 0) {
      isolatedNodes.push(node);
    } else {
      connectedNodes.push(node);
    }
  }

  // BFS 遍歷，分配層級深度 (depth)
  const depth: Record<string, number> = {};
  const visited = new Set<string>();
  const queue: string[] = [];

  if (rootNode) {
    // 如果 rootNode 是孤立節點，我們也予以初始標記，但它只會在 isolatedNodes 中處理
    depth[rootNode.id] = 0;
    visited.add(rootNode.id);
    if (inDegree[rootNode.id] > 0 || outDegree[rootNode.id] > 0) {
      queue.push(rootNode.id);
    }
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currDepth = depth[curr];

    for (const neighbor of adj[curr]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        depth[neighbor] = currDepth + 1;
        queue.push(neighbor);
      }
    }
  }

  // 若還有未訪問的結構節點（說明有多個連通分量），對每個分量繼續進行 BFS，起點深度設為 1
  for (const node of connectedNodes) {
    if (!visited.has(node.id)) {
      visited.add(node.id);
      depth[node.id] = 1;
      const q = [node.id];
      while (q.length > 0) {
        const curr = q.shift()!;
        const currDepth = depth[curr];
        for (const neighbor of adj[curr]) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            depth[neighbor] = currDepth + 1;
            q.push(neighbor);
          }
        }
      }
    }
  }

  // 根據 depth 將結構節點進行分組
  const nodesByDepth: Record<number, RFNode[]> = {};
  for (const node of connectedNodes) {
    const d = depth[node.id];
    const finalD = d !== undefined ? d : 1;
    if (!nodesByDepth[finalD]) {
      nodesByDepth[finalD] = [];
    }
    nodesByDepth[finalD].push(node);
  }

  const resultNodes: RFNode[] = [];
  let maxConnectedDepth = 0;

  // 定位深度為 0 的根節點於中心 (0, 0)
  for (const node of connectedNodes) {
    const d = depth[node.id];
    if (d === 0) {
      resultNodes.push({
        ...node,
        position: { x: 0, y: 0 }
      });
    } else {
      if (d > maxConnectedDepth) {
        maxConnectedDepth = d;
      }
    }
  }

  // 定位深度 d >= 1 的節點
  for (const dStr of Object.keys(nodesByDepth)) {
    const d = parseInt(dStr, 10);
    if (d === 0) continue;

    const layerNodes = nodesByDepth[d];
    const Nd = layerNodes.length;

    // 防止重疊：當 Nd > 12 時，加大半徑步長
    // 預設為 200，大於 12 時加大為 300 或者是與數量成正比擴張
    const step = Nd > 12 ? Math.max(300, 200 + (Nd - 12) * 15) : 200;

    layerNodes.forEach((node, i) => {
      const theta = (i * 2 * Math.PI) / Nd;
      const x = (d * step) * Math.cos(theta);
      const y = (d * step) * Math.sin(theta);

      resultNodes.push({
        ...node,
        position: {
          x: Math.round(x * 100) / 100,
          y: Math.round(y * 100) / 100
        }
      });
    });
  }

  // 孤立節點處理：排列在右側，垂直對稱排列
  if (isolatedNodes.length > 0) {
    const rightX = Math.max(300, maxConnectedDepth * 200 + 300);
    const ySpacing = 100;
    const totalM = isolatedNodes.length;

    isolatedNodes.forEach((node, j) => {
      const y = (j - (totalM - 1) / 2) * ySpacing;
      resultNodes.push({
        ...node,
        position: {
          x: rightX,
          y: Math.round(y * 100) / 100
        }
      });
    });
  }

  return resultNodes;
}
