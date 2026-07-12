import type { GraphNode, GraphEdge, FontSize } from '../types/graphTypes';
import { GRAPH_LIMITS, DEFAULT_NODE_COLORS } from '../types/graphTypes';

/**
 * 計算縮排字串的對應空格數值。
 * 1 個 Tab 等於 4 個空格，1 個空格等於 1。
 */
function getIndentValue(s: string): number {
  let val = 0;
  for (const char of s) {
    if (char === '\t') {
      val += 4;
    } else if (char === ' ') {
      val += 1;
    }
  }
  return val;
}

/**
 * 將 Markdown 縮排清單解析為知識圖譜的節點與邊
 * 
 * 1. 僅解析縮排列表（以 `-` 或 `*` 開頭的行）。不支援 YAML frontmatter（直接忽略）。
 * 2. 縮排層級計算：相容 2 或 4 空格縮排，或 Tab 縮排。若遇到跳躍縮排，進行容錯，掛載至最近的祖先（Parent）。
 * 3. 層級配色：依據節點在樹中的深度（縮排層級），自動套用不同的預設配色（使用 `DEFAULT_NODE_COLORS` 陣列，深度模顏色數）。
 * 4. 節點數量限制：若解析出的節點數量超過 `GRAPH_LIMITS.MAX_NODES` (200)，則在 `errors` 中加入錯誤訊息並進行截斷阻斷。
 * 5. 便利貼過濾：完全過濾且忽略任何 `'sticky'` 類型的節點。
 */
export function parseMarkdownToGraph(text: string): { nodes: GraphNode[]; edges: GraphEdge[]; errors: string[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const errors: string[] = [];

  const lines = text.split(/\r?\n/);
  let inFrontmatter = false;
  
  interface StackItem {
    indentValue: number;
    node: GraphNode;
    level: number;
  }
  const stack: StackItem[] = [];
  let nodeCounter = 0;
  let edgeCounter = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const trimmed = line.trim();

    // Defensive: skip YAML frontmatter if present (not parsed per design.md Non-Goals)
    if (trimmed === '---') {
      if (lineIndex === 0) {
        inFrontmatter = true;
        continue;
      } else if (inFrontmatter) {
        inFrontmatter = false;
        continue;
      }
    }

    if (inFrontmatter) {
      continue;
    }

    if (trimmed === '') {
      continue;
    }

    // 匹配縮排清單，例如： "- 概念 A" 或 "* 概念 B"
    const match = line.match(/^(\s*)([-*])\s+(.*)$/);
    if (!match) {
      // 忽略非縮排清單行
      continue;
    }

    const indentStr = match[1];
    const title = match[3].trim();
    const currIndent = getIndentValue(indentStr);

    // 節點數量限制：如果已經達到上限，則加入錯誤並截斷
    if (nodes.length >= GRAPH_LIMITS.MAX_NODES) {
      if (!errors.includes(`節點數量超過最大限制 (${GRAPH_LIMITS.MAX_NODES})，已進行截斷。`)) {
        errors.push(`節點數量超過最大限制 (${GRAPH_LIMITS.MAX_NODES})，已進行截斷。`);
      }
      break;
    }

    const nodeId = `node-${++nodeCounter}`;

    // 尋找 Parent：彈出縮排大於等於當前縮排的節點
    while (stack.length > 0 && stack[stack.length - 1].indentValue >= currIndent) {
      stack.pop();
    }

    let level = 0;
    let parentNode: GraphNode | null = null;

    if (stack.length > 0) {
      const parentItem = stack[stack.length - 1];
      parentNode = parentItem.node;
      level = parentItem.level + 1;
    }

    const color = DEFAULT_NODE_COLORS[level % DEFAULT_NODE_COLORS.length];

    const newNode: GraphNode = {
      id: nodeId,
      position: { x: 0, y: 0 },
      data: {
        title,
        color,
        fontSize: 'md' as FontSize,
      },
      type: 'concept',
    };

    nodes.push(newNode);

    if (parentNode) {
      edges.push({
        id: `edge-${++edgeCounter}`,
        source: parentNode.id,
        target: newNode.id,
        arrowType: 'arrow',
      });
    }

    stack.push({
      indentValue: currIndent,
      node: newNode,
      level,
    });
  }

  return {
    nodes,
    edges,
    errors,
  };
}

/**
 * 將知識圖譜的節點與邊序列化為 Markdown 縮排列表
 * 
 * 1. 使用 DFS (Depth-First Search) 遍歷結構節點，生成縮排列表。
 * 2. 便利貼過濾：若 nodes 中存在 `type === 'sticky'` 的便利貼節點，必須完全過濾且忽略它們。
 */
export function graphToMarkdown(nodes: GraphNode[], edges: GraphEdge[]): string {
  // 1. 完全過濾且忽略 'sticky' 便利貼節點
  const filteredNodes = nodes.filter(n => n.type !== 'sticky');
  const nodeIds = new Set(filteredNodes.map(n => n.id));

  // 過濾與非便利貼節點無關的邊
  const filteredEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

  if (filteredNodes.length === 0) {
    return '';
  }

  // 計算每個結構節點的入度
  const inDegree: Record<string, number> = {};
  for (const n of filteredNodes) {
    inDegree[n.id] = 0;
  }
  for (const e of filteredEdges) {
    inDegree[e.target]++;
  }

  const remaining = new Set(filteredNodes.map(n => n.id));
  const visited = new Set<string>();
  const lines: string[] = [];

  function dfs(nodeId: string, depth: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    remaining.delete(nodeId);

    const node = filteredNodes.find(n => n.id === nodeId);
    if (!node) return;

    // 每一層級使用 2 個空格縮排
    const indent = '  '.repeat(depth);
    lines.push(`${indent}- ${node.data.title}`);

    // 尋找子節點
    const childrenIds = filteredEdges
      .filter(e => e.source === nodeId)
      .map(e => e.target);

    // 排序以維持穩定的輸出順序（依據在 filteredNodes 中的索引）
    const sortedChildrenIds = childrenIds
      .filter(cid => remaining.has(cid))
      .sort((a, b) => {
        const idxA = filteredNodes.findIndex(n => n.id === a);
        const idxB = filteredNodes.findIndex(n => n.id === b);
        return idxA - idxB;
      });

    for (const childId of sortedChildrenIds) {
      dfs(childId, depth + 1);
    }
  }

  // 當還有剩餘節點時，選擇一個根節點開始 DFS
  while (remaining.size > 0) {
    // 優先選擇入度為 0 的節點
    let rootId: string | null = null;
    for (const id of remaining) {
      if (inDegree[id] === 0) {
        rootId = id;
        break;
      }
    }

    // 若沒有入度為 0 的節點（成環狀況），選擇第一個 remaining 節點
    if (!rootId) {
      for (const n of filteredNodes) {
        if (remaining.has(n.id)) {
          rootId = n.id;
          break;
        }
      }
    }

    if (rootId) {
      dfs(rootId, 0);
    } else {
      break;
    }
  }

  return lines.join('\n');
}
