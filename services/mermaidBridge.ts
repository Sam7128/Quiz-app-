// Mermaid ↔ Graph Document Bridge
// Supports subset: graph/flowchart TD/LR, node shapes [], (), {}, arrows -->/---/-->|text|/<-->
// classDef limited to fill property only

import type { GraphNode, GraphEdge } from '@/types/graphTypes';
import { GRAPH_LIMITS } from '@/types/graphTypes';

// ── Export: Graph → Mermaid ──────────────────────────────────────────

export function graphToMermaid(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: 'TD' | 'LR' = 'TD'
): string {
  const lines: string[] = [`graph ${direction}`];

  // Collect unique colors for classDef
  const colorMap = new Map<string, string>();
  let colorIdx = 0;

  for (const node of nodes) {
    const shape = nodeShapeToMermaid(node);
    lines.push(`  ${shape}`);

    const color = node.data.color;
    if (color && !colorMap.has(color)) {
      colorMap.set(color, `c${colorIdx++}`);
    }
  }

  for (const edge of edges) {
    const arrow = edgeArrowToMermaid(edge);
    lines.push(`  ${arrow}`);
  }

  // classDef (fill only)
  for (const [color, cls] of colorMap) {
    lines.push(`  classDef ${cls} fill:${color}`);
  }

  // class assignments
  for (const node of nodes) {
    const cls = colorMap.get(node.data.color);
    if (cls) {
      lines.push(`  class ${node.id} ${cls}`);
    }
  }

  return lines.join('\n');
}

function nodeShapeToMermaid(node: GraphNode): string {
  const title = escapeMermaid(node.data.title);
  switch (node.type) {
    case 'diamond':
      return `${node.id}{${title}}`;
    case 'rounded':
      return `${node.id}(${title})`;
    case 'concept':
    default:
      return `${node.id}[${title}]`;
  }
}

function edgeArrowToMermaid(edge: GraphEdge): string {
  const label = edge.label ? `|${escapeMermaid(edge.label)}|` : '';

  switch (edge.arrowType) {
    case 'none':
      return `${edge.source} ---${label} ${edge.target}`;
    case 'both':
      return `${edge.source} <-->${label} ${edge.target}`;
    case 'arrow':
    default:
      return `${edge.source} -->${label} ${edge.target}`;
  }
}

function escapeMermaid(text: string): string {
  return text
    .replace(/"/g, '#quot;')
    .replace(/[[\](){}|>;]/g, (ch) => `#${ch.charCodeAt(0)};`);
}

// ── Import: Mermaid → Graph ─────────────────────────────────────────

export interface MermaidImportResult {
  success: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  errors: string[];
  direction: 'TB' | 'LR';
  stats: { truncatedTitles: number; truncatedLabels: number; skippedSelfLoops: number };
}

export function mermaidToGraph(input: string): MermaidImportResult {
  const errors: string[] = [];

  // Length limit
  if (input.length > GRAPH_LIMITS.MERMAID_INPUT_MAX) {
    return { success: false, nodes: [], edges: [], errors: [`[輸入檢查] Mermaid 文字超過 ${GRAPH_LIMITS.MERMAID_INPUT_MAX} 字元上限`], direction: 'TB', stats: { truncatedTitles: 0, truncatedLabels: 0, skippedSelfLoops: 0 } };
  }

  const rawLines = input.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));

  // Support semicolon-separated syntax: split "graph TD; A --> B" into separate lines
  const lines: { text: string; lineNum: number }[] = [];
  rawLines.forEach((raw, idx) => {
    const parts = raw.split(';').map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      lines.push({ text: part, lineNum: idx + 1 });
    }
  });

  // Find header
  const headerIdx = lines.findIndex(l => /^(graph|flowchart)\s+(TD|TB|LR)$/i.test(l.text));
  if (headerIdx < 0) {
    return { success: false, nodes: [], edges: [], errors: ['第 1 行: 找不到有效的 graph/flowchart 標頭（需要 TD 或 LR）。修正建議：在第一行加入 `graph TD` 或 `flowchart LR`'], direction: 'TB', stats: { truncatedTitles: 0, truncatedLabels: 0, skippedSelfLoops: 0 } };
  }

  // Extract direction from header
  const headerMatch = lines[headerIdx].text.match(/^(?:graph|flowchart)\s+(TD|TB|LR)$/i);
  const direction: 'TB' | 'LR' = headerMatch && headerMatch[1].toUpperCase() === 'LR' ? 'LR' : 'TB';

  // Stats tracking
  let truncatedTitles = 0;
  let truncatedLabels = 0;
  let skippedSelfLoops = 0;

  // Parse classDef lines for color mapping
  const classDefColors = new Map<string, string>();
  const classAssignments = new Map<string, string>();
  const allContentLines = lines.slice(headerIdx + 1);

  for (const entry of allContentLines) {
    // classDef myClass fill:#f9f → extract fill color
    const classDefMatch = entry.text.match(/^classDef\s+(\S+)\s+(.+)$/);
    if (classDefMatch) {
      const className = classDefMatch[1];
      const attrs = classDefMatch[2];
      const fillMatch = attrs.match(/fill[:\s]*([#\w]+)/);
      if (fillMatch) {
        classDefColors.set(className, fillMatch[1]);
      }
    }
    // class A,B myClass → assign class to nodes
    const classAssignMatch = entry.text.match(/^class\s+(\S+)\s+(\S+)$/);
    if (classAssignMatch) {
      const nodeIds = classAssignMatch[1].split(',');
      const className = classAssignMatch[2];
      for (const nid of nodeIds) {
        classAssignments.set(nid.trim(), className);
      }
    }
  }

  const contentLines = allContentLines
    .filter(l => !l.text.startsWith('classDef') && !l.text.startsWith('class '));

  const nodesMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  let yOffset = 0;

  for (const entry of contentLines) {
    const line = entry.text;
    const lineNum = entry.lineNum;
    // Try to parse as edge first (contains arrow)
    const edgeParsed = parseEdgeLine(line);
    if (edgeParsed) {
      // Ensure both source/target exist as nodes, using inline definitions if available
      if (edgeParsed.sourceNodeDef && !nodesMap.has(edgeParsed.source)) {
        nodesMap.set(edgeParsed.source, createNodeFromParsed(edgeParsed.sourceNodeDef, yOffset));
        yOffset += 80;
      } else {
        ensureNode(nodesMap, edgeParsed.source, yOffset);
        yOffset += 80;
      }

      if (edgeParsed.targetNodeDef && !nodesMap.has(edgeParsed.target)) {
        nodesMap.set(edgeParsed.target, createNodeFromParsed(edgeParsed.targetNodeDef, yOffset));
        yOffset += 80;
      } else {
        ensureNode(nodesMap, edgeParsed.target, yOffset);
        yOffset += 80;
      }

      // Update existing nodes with inline shape/title info
      if (edgeParsed.sourceNodeDef && nodesMap.has(edgeParsed.source)) {
        const existing = nodesMap.get(edgeParsed.source)!;
        if (existing.data.title === existing.id) {
          existing.data.title = edgeParsed.sourceNodeDef.title;
          existing.type = edgeParsed.sourceNodeDef.type;
        }
      }
      if (edgeParsed.targetNodeDef && nodesMap.has(edgeParsed.target)) {
        const existing = nodesMap.get(edgeParsed.target)!;
        if (existing.data.title === existing.id) {
          existing.data.title = edgeParsed.targetNodeDef.title;
          existing.type = edgeParsed.targetNodeDef.type;
        }
      }

      // Prevent self-loop
      if (edgeParsed.source === edgeParsed.target) {
        skippedSelfLoops++;
        errors.push(`第 ${lineNum} 行: 跳過自迴圈: ${edgeParsed.source} → ${edgeParsed.target}`);
        continue;
      }

      edges.push({
        id: `e-${edgeParsed.source}-${edgeParsed.target}`,
        source: edgeParsed.source,
        target: edgeParsed.target,
        label: edgeParsed.label,
        arrowType: edgeParsed.arrowType,
      });
      continue;
    }

    // Try to parse as standalone node
    const nodeParsed = parseNodeDef(line);
    if (nodeParsed) {
      if (!nodesMap.has(nodeParsed.id)) {
        nodesMap.set(nodeParsed.id, createNodeFromParsed(nodeParsed, yOffset));
        yOffset += 80;
      } else {
        // Update existing node with shape/title info
        const existing = nodesMap.get(nodeParsed.id)!;
        existing.data.title = nodeParsed.title;
        existing.type = nodeParsed.type;
      }
      continue;
    }

    // Detect known unsupported syntax and warn with line number
    const unsupported: [RegExp, string, string][] = [
      [/^subgraph\b/, 'subgraph（子圖）', '修正建議：移除 subgraph 區塊，改用節點分組'],
      [/^\s*end\s*$/, 'end（子圖結束）', '修正建議：移除對應的 end 語句'],
      [/^click\b/, 'click（互動事件）', '修正建議：移除 click 互動定義'],
      [/^style\b/, 'style（行內樣式）', '修正建議：改用 classDef 定義樣式'],
      [/^linkStyle\b/, 'linkStyle（連線樣式）', '修正建議：移除 linkStyle 定義'],
      [/^callback\b/, 'callback（回呼事件）', '修正建議：移除 callback 定義'],
    ];
    let recognized = false;
    for (const [pattern, label, suggestion] of unsupported) {
      if (pattern.test(line.trim())) {
        errors.push(`第 ${lineNum} 行: 不支援的語法已略過: ${label} — "${line.trim().slice(0, 40)}"。${suggestion}`);
        recognized = true;
        break;
      }
    }
    if (!recognized && line.trim().length > 0) {
      errors.push(`第 ${lineNum} 行: 無法辨識的語法已略過: "${line.trim().slice(0, 50)}"。修正建議：請檢查語法是否為合法的 flowchart 節點或連線定義`);
    }
  }

  // Graph limit check
  if (nodesMap.size > GRAPH_LIMITS.MAX_NODES) {
    return { success: false, nodes: [], edges: [], errors: [`[全域限制] 節點數量 (${nodesMap.size}) 超過 ${GRAPH_LIMITS.MAX_NODES} 個上限`], direction, stats: { truncatedTitles, truncatedLabels, skippedSelfLoops } };
  }

  // Apply classDef colors to nodes
  for (const [nodeId, className] of classAssignments) {
    const node = nodesMap.get(nodeId);
    const color = classDefColors.get(className);
    if (node && color) {
      node.data.color = color;
    }
  }

  // Decode HTML entities in node titles and edge labels
  const decodeEntities = (text: string): string =>
    text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

  const nodes = Array.from(nodesMap.values()).map((n) => {
    const decoded = decodeEntities(n.data.title);
    if (decoded.length > GRAPH_LIMITS.TITLE_MAX) truncatedTitles++;
    return {
      ...n,
      data: { ...n.data, title: decoded.slice(0, GRAPH_LIMITS.TITLE_MAX) },
    };
  });

  const decodedEdges = edges.map((e) => {
    if (!e.label) return e;
    const decoded = decodeEntities(e.label);
    if (decoded.length > GRAPH_LIMITS.EDGE_LABEL_MAX) truncatedLabels++;
    return { ...e, label: decoded.slice(0, GRAPH_LIMITS.EDGE_LABEL_MAX) || undefined };
  });

  if (truncatedTitles > 0) errors.push(`[匯入摘要] 已截斷 ${truncatedTitles} 個節點標題至 ${GRAPH_LIMITS.TITLE_MAX} 字元`);
  if (truncatedLabels > 0) errors.push(`[匯入摘要] 已截斷 ${truncatedLabels} 個連線標籤至 ${GRAPH_LIMITS.EDGE_LABEL_MAX} 字元`);
  if (skippedSelfLoops > 0) errors.push(`[匯入摘要] 已忽略 ${skippedSelfLoops} 條自迴圈`);

  return {
    success: nodes.length > 0,
    nodes,
    edges: decodedEdges,
    errors,
    direction,
    stats: { truncatedTitles, truncatedLabels, skippedSelfLoops },
  };
}

interface ParsedEdge {
  source: string;
  target: string;
  label?: string;
  arrowType: 'arrow' | 'none' | 'both';
  sourceNodeDef?: ParsedNode;
  targetNodeDef?: ParsedNode;
}

function parseEdgeLine(line: string): ParsedEdge | null {
  // Match: A <--> B, A -->|label| B, A --> B, A --- B
  // Nodes may have inline definitions like A[text], B(text), C{text}
  const patterns: { re: RegExp; arrowType: 'arrow' | 'none' | 'both' }[] = [
    { re: /^(.+?)\s*<-->\s*(?:\|([^|]*)\|)?\s*(.+)$/, arrowType: 'both' },
    { re: /^(.+?)\s*-->\s*(?:\|([^|]*)\|)?\s*(.+)$/, arrowType: 'arrow' },
    { re: /^(.+?)\s*---\s*(?:\|([^|]*)\|)?\s*(.+)$/, arrowType: 'none' },
  ];

  for (const { re, arrowType } of patterns) {
    const m = line.match(re);
    if (m) {
      const sourceRaw = m[1].trim();
      const targetRaw = m[3].trim();
      const source = stripNodeShape(sourceRaw);
      const target = stripNodeShape(targetRaw);
      return {
        source, target,
        label: m[2]?.trim() || undefined,
        arrowType,
        sourceNodeDef: parseNodeDef(sourceRaw) ?? undefined,
        targetNodeDef: parseNodeDef(targetRaw) ?? undefined,
      };
    }
  }
  return null;
}

interface ParsedNode {
  id: string;
  title: string;
  type: 'concept' | 'rounded' | 'diamond';
}

function parseNodeDef(line: string): ParsedNode | null {
  // Diamond: A{text}
  let m = line.match(/^(\w+)\{([^}]+)\}/);
  if (m) return { id: m[1], title: m[2].trim(), type: 'diamond' };

  // Rounded: A(text)
  m = line.match(/^(\w+)\(([^)]+)\)/);
  if (m) return { id: m[1], title: m[2].trim(), type: 'rounded' };

  // Rect: A[text]
  m = line.match(/^(\w+)\[([^\]]+)\]/);
  if (m) return { id: m[1], title: m[2].trim(), type: 'concept' };

  // Plain ID only (no shape)
  m = line.match(/^(\w+)$/);
  if (m) return { id: m[1], title: m[1], type: 'concept' };

  return null;
}

function stripNodeShape(raw: string): string {
  // Extract just the ID from possible inline shape def like A[text]
  const m = raw.match(/^(\w+)/);
  return m ? m[1] : raw;
}

function ensureNode(map: Map<string, GraphNode>, id: string, y: number): void {
  if (!map.has(id)) {
    map.set(id, {
      id,
      position: { x: 100, y },
      data: { title: id, color: '#3B82F6', fontSize: 'md' },
      type: 'concept',
    });
  }
}

function createNodeFromParsed(parsed: ParsedNode, y: number): GraphNode {
  return {
    id: parsed.id,
    position: { x: 100, y },
    data: {
      title: parsed.title,
      color: '#3B82F6',
      fontSize: 'md',
    },
    type: parsed.type,
  };
}
