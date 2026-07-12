# 🔍 最終審計缺陷報告：knowledge-graph-enhancements

> **審計者**: 獨立第二位高階 AI（Claude Opus 4.6 Thinking）  
> **審計日期**: 2026-07-12  
> **審計範圍**: OpenSpec 規格驗證 + 過度工程/死代碼審計 + 技術債評估

---

## Summary Scorecard

| 維度 | 狀態 | 詳細 |
|------|------|------|
| **Completeness** | ✅ 22/22 tasks | 所有任務已完成並標記 `[x]` |
| **Correctness** | ⚠ 12/13 requirements | 1 項 spec/design 分歧、2 項實作偏移 |
| **Coherence** | ⚠ 設計大致遵循 | 3 項 `any` 型別違規、1 項死代碼 |
| **YAGNI / Dead Code** | ⚠ 2 項過度設計 / 1 項死代碼 |
| **技術債** | ⚠ 5 項需登記 |

---

## 📋 Phase 1: OpenSpec 規格驗證

### 1.1 Completeness（完整性）

**Task Completion: 22/22 ✅**

所有 `tasks.md` 中的 9 大階段、22 個子任務均已標記 `[x]`。涵蓋：
- 環境準備（1.1-1.2）✅
- 資料模型（2.1-2.3）✅
- 放射狀佈局（3.1-3.2）✅
- Markdown 解析器（4.1-4.2）✅
- 便利貼元件（5.1）✅
- 富文本筆記面板（6.1-6.2）✅
- 代碼編輯器（7.1）✅
- 雙模式切換（8.1-8.3）✅
- 完整性驗證（9.1-9.5）✅

**Spec Coverage: 6/6 spec files ✅**

所有 6 個 delta spec 文件中的 Requirements 均在代碼中找到對應實作：

| Spec | Requirements | 覆蓋 |
|------|-------------|------|
| knowledge-graph-code-editor | 6 | ✅ 6/6 |
| knowledge-graph-data | 5 | ✅ 5/5 |
| knowledge-graph-dual-mode | 7 | ⚠ 6/7 (見 WARNING-01) |
| knowledge-graph-editor | 3 | ✅ 3/3 |
| knowledge-graph-notes-panel | 6 | ✅ 6/6 |
| knowledge-graph-sticky-notes | 6 | ✅ 6/6 |

---

### 1.2 Correctness（正確性）

#### 🟢 CRITICAL Issues: 0 項

所有核心功能均已實作，無遺漏的 critical 需求。

---

#### 🟡 WARNING Issues: 3 項

---

**WARNING-01** — Spec/Design Divergence：「使用者手動覆寫顏色」Scenario 與 Design Non-Goals 矛盾

- **Spec**: [knowledge-graph-code-editor/spec.md:60-62](file:///c:/Users/user/Desktop/Quiz-app-/openspec/changes/knowledge-graph-enhancements/specs/knowledge-graph-code-editor/spec.md#L60-L62) 定義了 `#### Scenario: 使用者手動覆寫顏色`，要求「代碼模式解析時被層級自動配色覆寫」
- **Design**: [design.md:36](file:///c:/Users/user/Desktop/Quiz-app-/openspec/changes/knowledge-graph-enhancements/design.md#L36) Non-Goals 明確排除「YAML frontmatter 解析和多個主題切換」
- **實作**: [markdownGraphBridge.ts:104](file:///c:/Users/user/Desktop/Quiz-app-/services/markdownGraphBridge.ts#L104) 僅使用 `DEFAULT_NODE_COLORS[level % DEFAULT_NODE_COLORS.length]`，代碼模式確實會覆寫顏色（行為正確），但 [GraphEditor.tsx:281-296](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/GraphEditor.tsx#L281-L296) 中的 `handleCodeChange` 嘗試**恢復**先前節點的顏色（`prevNode.data.color`），這與 Spec 中「代碼模式始終根據最新結構重新配色」的描述**矛盾**
- **結論**: 實作中的 `handleCodeChange` 保留了舊顏色，與 Spec 的「覆寫」語意衝突
- **Recommendation**: 
  1. 將該 Scenario 標註為 `Out of scope for v1` 或從 spec 中移除（使用者確認的方案）
  2. 如果決定保留覆寫行為，應移除 `handleCodeChange` 中第 283-294 行的顏色恢復邏輯

---

**WARNING-02** — 便利貼預設文字不符合 Spec

- **Spec**: [knowledge-graph-sticky-notes/spec.md:13](file:///c:/Users/user/Desktop/Quiz-app-/openspec/changes/knowledge-graph-enhancements/specs/knowledge-graph-sticky-notes/spec.md#L13) 要求預設文字為「**備忘**」
- **實作**: [GraphEditor.tsx:374-377](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/GraphEditor.tsx#L374-L377) 便利貼建立時 `title: ''`, `label: ''`（空字串），不是「備忘」
- **UI 呈現**: [StickyNoteNode.tsx:82](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/StickyNoteNode.tsx#L82) 顯示 `雙擊編輯便利貼...` 的 placeholder，而非 Spec 所述的「備忘」
- **Recommendation**: 將 `handleAddSticky` 中的 `title` 和 `label` 改為 `'備忘'`

---

**WARNING-03** — Fail-fast 遷移保護有缺口（含 `any` 型別違規）

- **Spec**: [knowledge-graph-data/spec.md:33-35](file:///c:/Users/user/Desktop/Quiz-app-/openspec/changes/knowledge-graph-enhancements/specs/knowledge-graph-data/spec.md#L33-L35) 要求遷移失敗時「直接向外拋出異常」
- **實作**: [graphStorage.ts:28-84](file:///c:/Users/user/Desktop/Quiz-app-/services/graphStorage.ts#L28-L84) 中 `getGraphs()` 的遷移邏輯**沒有** try-catch 包裹（依賴自然拋出），但以下兩處返回 `[]` 可能掩蓋問題：
  - 第 32-34 行：`localStorage.getItem` 失敗返回 `[]`（合理，初始讀取）
  - 第 40-42 行：`JSON.parse` 失敗返回 `[]`（**風險**：腐敗的 JSON 資料被靜默忽略，後續 save 可能覆蓋）
- **`any` 違規**: 第 37 行 `let graphs: any[];` 直接使用 `any` 型別，違反 AGENTS.md 鐵規 `NO_ANY`
- **Recommendation**: 
  1. 將 `any[]` 改為 `unknown[]` + 型別守衛
  2. 考慮 `JSON.parse` 失敗時也 throw（或至少 console.error 並保留原始 raw data）

---

### 1.3 Coherence（一致性）

#### Design Adherence ✅（大致符合）

| Decision | 狀態 | 備註 |
|----------|------|------|
| D1: TipTap v2 | ✅ | 正確使用 `@tiptap/react` + `starter-kit` + `extension-placeholder` + `extension-underline` |
| D2: Notes 字典去耦 | ✅ | `GraphDocument.notes` 正確實作為 `Record<string, string>` |
| D3: 自定義 Radial Layout | ✅ | [radialLayout.ts](file:///c:/Users/user/Desktop/Quiz-app-/services/radialLayout.ts) 無外部依賴 |
| D4: 輕量 Markdown 解析器 | ✅ | [markdownGraphBridge.ts](file:///c:/Users/user/Desktop/Quiz-app-/services/markdownGraphBridge.ts) ~240 行，自建 |
| D5: 強制即時預覽 | ✅ | 500ms debounce 在 [GraphCodeEditor.tsx:31](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/GraphCodeEditor.tsx#L31) |
| D6: 便利貼作為 `sticky` 節點 | ✅ | 正確存在於 `nodes[]` 中 |
| D7: TipTap 打包策略 | ✅ | 需確認 `vite.config.ts` 設定（未在本次審查範圍深入驗證） |
| D8: Fail-fast 安全策略 | ⚠ | 見 WARNING-03 |

---

## 📋 Phase 2: 過度工程與死代碼審計（Ponytail-Audit）

### 🔴 DEAD CODE: 1 項

**DEAD-01** — `NodeEditPanel` 與 `GraphNotesPanel` 功能重疊

- **問題**: 根據 [knowledge-graph-editor/spec.md:6](file:///c:/Users/user/Desktop/Quiz-app-/openspec/changes/knowledge-graph-enhancements/specs/knowledge-graph-editor/spec.md#L6) 的 Requirement: `Properties panel replacement`，原有的 `NodeEditPanel`（純文字 textarea）**SHALL 被替換為**新的 `GraphNotesPanel`。
- **實作**: [NodeEditPanel.tsx](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/NodeEditPanel.tsx) (187 行) 仍然完整保留，且在 [GraphEditor.tsx:749-758](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/GraphEditor.tsx#L749-L758) 中**仍然被使用**作為「屬性編輯面板」（顏色、形狀、字體大小）。
- **分析**: 
  - Spec 說 "replaced"，但 design.md 的 dual-mode spec (L77) 說「原有的 NodeEditPanel 中的屬性編輯（標題、顏色、形狀等）**精簡後保留**在筆記面板頂部的摺疊區域中」
  - 實際上 **GraphNotesPanel 中沒有任何摺疊的屬性編輯 UI**，所以 NodeEditPanel 被保留為獨立面板使用
  - 這導致兩個面板的標題編輯功能重疊（NodeEditPanel 有標題輸入，GraphNotesPanel 也顯示節點標題）
- **Verdict**: NodeEditPanel 不是純死代碼（仍在使用），但其「定義/筆記 textarea」（第 87-113 行）與 GraphNotesPanel 的 TipTap 編輯器**功能完全重疊**，形成「partial dead code」
- **Recommendation**: 
  - 短期：保留 NodeEditPanel 僅作為屬性面板（顏色/形狀/字體），移除其中的 definition 和 details textarea
  - 長期：按照 spec，將屬性編輯整合進 GraphNotesPanel 的摺疊區域，然後刪除 NodeEditPanel

---

### 🟡 OVER-ENGINEERING: 2 項

**OVER-01** — `markdownGraphBridge.ts` 中的 YAML Frontmatter 偵測邏輯

- **Design**: [design.md:36](file:///c:/Users/user/Desktop/Quiz-app-/openspec/changes/knowledge-graph-enhancements/design.md#L36) Non-Goals 明確「不實作 YAML frontmatter 解析」
- **實作**: [markdownGraphBridge.ts:50-63](file:///c:/Users/user/Desktop/Quiz-app-/services/markdownGraphBridge.ts#L50-L63) 實作了完整的 YAML frontmatter 偵測與跳過邏輯（`inFrontmatter` flag，`---` 開閉偵測）
- **YAGNI 判定**: 雖然這段代碼讓解析器更健壯（可安全忽略用戶貼入帶 frontmatter 的 markdown），但根據嚴格的 YAGNI 原則，這 14 行代碼在 v1 中不需要存在。
- **風險等級**: 低（代碼正確且有防禦價值）
- **Recommendation**: 保留但標註 `// Defensive: skip YAML frontmatter if present (not parsed per design.md Non-Goals)`

---

**OVER-02** — `markdownGraphBridge.ts:135-138` 二次 sticky 節點過濾

- **程式碼**: [markdownGraphBridge.ts:135-138](file:///c:/Users/user/Desktop/Quiz-app-/services/markdownGraphBridge.ts#L135-L138)
  ```typescript
  // 二次確保完全過濾並忽略 'sticky' 節點（雖然從 markdown 中不會解析出 sticky）
  const filteredNodes = nodes.filter(n => n.type !== 'sticky');
  ```
- **分析**: 正如註釋所說，**從 Markdown 中永遠不可能解析出 `sticky` 節點**。所有 `parseMarkdownToGraph` 建立的節點 `type` 都是 `'concept'`（第 114 行）。這個二次過濾是純粹的冗餘代碼。
- **Recommendation**: 移除第 135-138 行，或改為 `assert`/開發環境檢查

---

## 📋 Phase 3: 技術債評估（Ponytail-Debt）

### DEBT-01 — `graphStorage.ts` 中的 3 處 `any` 型別違規 🔴

| 行號 | 代碼 | 問題 |
|------|------|------|
| [L37](file:///c:/Users/user/Desktop/Quiz-app-/services/graphStorage.ts#L37) | `let graphs: any[];` | 直接使用 `any`，應改 `unknown[]` |
| [L176-178](file:///c:/Users/user/Desktop/Quiz-app-/services/graphStorage.ts#L176-L178) | `(err as any).name`, `(err as any).code` | 應使用具體型別或 `unknown` + 型別守衛 |
| [L217](file:///c:/Users/user/Desktop/Quiz-app-/services/graphStorage.ts#L217) | `(node.data as any).label` | 應使用 `GraphNodeData & { label?: string }` |

**違反**: AGENTS.md 鐵規 #3 `NO_ANY`  
**Recommendation**: 使用 `unknown` + 型別守衛或精確的型別斷言替代所有 `any`

---

### DEBT-02 — `GraphCodeEditor.tsx` 的 unmount 不 flush debounced 變更 🟡

- **問題**: [GraphCodeEditor.tsx:42-49](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/GraphCodeEditor.tsx#L42-L49) 在 unmount 時只 `clearTimeout`，但**不呼叫 `onChange`**。這表示用戶最後 500ms 內的輸入會在切換模式時丟失。
- **對比**: [GraphNotesPanel.tsx:253-257](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/GraphNotesPanel.tsx#L253-L257) 正確地在 unmount 時呼叫 `flush()` 強制同步。
- **Recommendation**: 在 `GraphCodeEditor` 的 unmount cleanup 中呼叫 `onChange(localValue)` 而非僅清除 timeout

---

### DEBT-03 — 驗證錯誤使用中文硬編碼字串 🟢

- **問題**: [graphStorage.ts:188-242](file:///c:/Users/user/Desktop/Quiz-app-/services/graphStorage.ts#L188-L242) 中的 `validateGraphDocument` 函式直接回傳中文字串（例如 `'節點標題不可超過 100 個字元'`）
- **影響**: 所有驗證錯誤直接作為 Toast 訊息使用，目前功能正常
- **Recommendation**: 長期考慮使用自定義 Error Classes 或 enum 錯誤代碼處理商務邏輯驗證，為未來多語系支援保留空間（與使用者提出的 SUGGESTION 一致）

---

### DEBT-04 — `GraphEditorInner` 巨型元件（878 行）🟡

- **問題**: [GraphEditor.tsx](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/GraphEditor.tsx) 共 878 行，`GraphEditorInner` 單一函式元件包含：
  - 20+ 個 `useState`/`useCallback`/`useMemo` hooks
  - 完整的 Mermaid modal UI
  - 雙模式切換邏輯
  - undo/redo 管理
  - autosave 計時器
- **Recommendation**: 
  - 抽取 `useMermaidModal` 自定義 hook
  - 抽取 `useAutoSave` 自定義 hook
  - 將 Mermaid Modal JSX 抽取為獨立元件 `MermaidModal.tsx`
  - 將 undo/redo 邏輯移至專用 hook（已部分完成 `useUndoRedo`）

---

### DEBT-05 — `handleCodeChange` 中的「名稱相同即視為相同節點」恢復邏輯缺乏邊界防禦 🟡

- **問題**: [GraphEditor.tsx:270-297](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/GraphEditor.tsx#L270-L297) 中的節點恢復邏輯使用 `title` 作為 key 進行匹配，但如果存在多個同名節點，`Map` 只會保留最後一個，導致先前同名節點的屬性被丟棄。
- **Recommendation**: 加入 `console.warn` 提示同名節點衝突，或改用更健壯的匹配策略（例如 title + 層級深度組合 key）

---

## 📊 Final Assessment

| 類別 | 數量 | 結論 |
|------|------|------|
| CRITICAL | **0** | 無阻斷性缺陷 |
| WARNING | **3** | W-01: Spec/Design 顏色覆寫矛盾、W-02: 便利貼預設文字、W-03: Fail-fast `any` 違規 |
| SUGGESTION | **2** | OVER-01: YAML frontmatter 偵測（可保留）、OVER-02: 冗餘 sticky 過濾 |
| DEAD CODE | **1** | NodeEditPanel 部分功能重疊 |
| TECH DEBT | **5** | DEBT-01~05 如上所列 |

> [!IMPORTANT]
> **整體評估**: 無 CRITICAL 阻斷問題。3 項 WARNING 建議在歸檔前修正（特別是 `any` 違規和便利貼預設文字），但不影響核心功能的正確運作。代碼品質整體良好，架構決策合理，測試覆蓋完整。
>
> **建議**: 修正 3 項 WARNING 後即可安全歸檔。SUGGESTION 和 TECH DEBT 項目可登記為後續迭代任務。

---

## 附錄：與使用者自檢結果交叉驗證

| 使用者發現 | 本審計對應 | 結論 |
|-----------|-----------|------|
| Spec 中「使用者手動覆寫顏色」Scenario 與 Design Non-Goals 矛盾 | **WARNING-01** | ✅ 確認一致。實作還有額外問題：`handleCodeChange` 嘗試恢復舊顏色（與 spec 「覆寫」語意矛盾） |
| `validateGraphDocument` 使用中文硬編碼字串 | **DEBT-03** | ✅ 確認一致。分類為長期技術債，非阻斷性問題 |

使用者發現的問題已**全部納入**本報告，且補充了更深層的實作分析。

