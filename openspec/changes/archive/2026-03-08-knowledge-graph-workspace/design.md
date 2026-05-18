## Context

MindSpark 是一個 React 19 + Vite + TypeScript 的前端 SPA，核心功能圍繞題庫管理、測驗練習、錯題回顧與遊戲化學習。目前使用 view-based 路由（`AppView` 型別切換）、`IStorageRepository` 統一儲存抽象（localStorage / Supabase 雙軌）、`useReducer` 管理全域狀態。

根據兩份前置探索報告的結論，知識圖工作區應作為獨立的 Beta 功能模組加入，不干擾現有刷題核心。目前專案無 `React.lazy` / `Suspense` 實踐，因此本次設計必須建立 feature-level code splitting 的先例。

### 現有技術棧

- React 19.2.4 + TypeScript 5.8.2
- Vite + Tailwind CSS v4
- Framer Motion 12.29.2（動畫）
- localStorage + Supabase（雙軌持久化）
- Lucide React（圖標）

### 約束條件

- 主 bundle 大小不得因新功能增長（lazy load 所有重型依賴）
- 手機端僅支援唯讀（閱讀模式）
- 不引入新的後端服務或 Supabase schema 變更
- 遵循現有 Repository Pattern 和 Reducer Pattern

## Goals / Non-Goals

**Goals:**

1. 建立可安全隔離的 Beta 功能開關系統，日後可擴展至其他實驗性功能
2. 提供直覺的節點式視覺化編輯器，讓學生無需編程基礎即可建立知識關聯圖
3. 實現「全部展開 / 逐步探索」兩種閱讀模式，支援不同學習情境
4. 建立 Mermaid flowchart 受控子集的雙向轉換，作為 AI 溝通橋接格式
5. 確保零回歸風險——新功能完全獨立，不修改現有功能邏輯
6. 建立 feature-level code splitting 最佳實踐

**Non-Goals:**

- 不支援全 Mermaid 語法（僅 flowchart 子集）
- 不在 v1 實作 AI 自動生成知識圖
- 不實作圖表與題庫的交叉聯動
- 不實作 Supabase 雲端同步圖表
- 不在手機端提供完整編輯功能
- 不建立新的路由系統（繼續使用 view-based 切換）

## Decisions

### Decision 1: 核心引擎選用 @xyflow/react

**選擇**: 使用 `@xyflow/react`（前身 React Flow）作為節點編輯器核心引擎

**理由**:
- React 生態系中最成熟的節點式編輯器，活躍維護（4M+ npm 週下載量）
- 內建拖曳、縮放、Mini-map、連線管理，大幅降低開發成本
- 自訂節點 (Custom Nodes) 能力強，可實現 3 層內容層級的節點
- 支援受控模式 (Controlled Mode)，與 React state 整合良好
- MIT 授權，商業可用（Open Source 版本完全免費）

**替代方案**:
- ❌ Cytoscape.js：偏向資料分析圖表，互動編輯能力較弱
- ❌ jsPlumb：較舊，React 整合需額外封裝
- ❌ 從零實作：開發成本過高，不符合 v1 Beta 定位
- ❌ Excalidraw：白板取向，缺乏結構化節點概念

### Decision 2: Canvas JSON 為主資料格式

**選擇**: 使用 Node-Edge JSON 作為主資料格式，Mermaid 僅作為匯入/匯出橋接

**理由**:
- JSON 可完整表達節點位置、樣式、內容層級、展開狀態
- 與 @xyflow/react 的資料模型天然對齊
- Mermaid 語法無法表達座標位置、節點內容分層、互動狀態
- JSON 易於序列化至 localStorage

**資料結構核心**:
```typescript
interface GraphDocument {
  id: string;
  schemaVersion: number;   // v1 = 1, 用於未來資料遷移（初始值固定為 1）
  name: string;            // max 50 chars, trimmed, non-empty（空白回退為「未命名圖表」）
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewState: GraphViewState;
  createdAt: string;
  updatedAt: string;
}

interface GraphNode {
  id: string;
  position: { x: number; y: number };
  data: {
    title: string;           // Level 1 (max 100 chars)
    definition?: string;     // Level 2 (max 500 chars)
    details?: string;        // Level 3 (max 2000 chars)
    color: string;
    fontSize: 'sm' | 'md' | 'lg';
  };
  type: 'concept' | 'rounded' | 'diamond';  // 支援 Mermaid [] / () / {} 語意
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  arrowType: 'arrow' | 'none' | 'both';  // 箭頭方向類型
}

interface GraphViewState {
  readingMode: 'expand-all' | 'progressive';
  zoom: number;
  panX: number;
  panY: number;
}
```

### Decision 3: Beta 開關存儲於 UserSettings

**選擇**: Beta 功能開關存入 `mindspark_settings` localStorage key（與現有 UserSettings 合併）

**理由**:
- 探索報告明確指出 `gameMode` 使用獨立 key 是歷史遺留，不應複製此模式
- 統一至 UserSettings 可避免 key 增殖
- 設定清除時自動包含在內

**替代方案**:
- ❌ 獨立 `mindspark_beta_features` key：增加維護複雜度
- ❌ 存入 AppState（非持久化）：關閉頁面後設定丟失

### Decision 4: Feature-Level Code Splitting 架構

**選擇**: 使用 `React.lazy` + `Suspense` 將整個知識圖工作區作為單一 lazy chunk

**實作方式**:
```typescript
// components/AppContent.tsx
const KnowledgeGraphWorkspace = React.lazy(
  () => import('./KnowledgeGraph/KnowledgeGraphWorkspace')
);

// 在 render 中
{state.view === 'graph' && (
  <Suspense fallback={<LoadingSpinner />}>
    <KnowledgeGraphWorkspace />
  </Suspense>
)}
```

**理由**:
- @xyflow/react 約 200KB gzipped，不應進入主 bundle
- Vite 自動將 dynamic import 分割為獨立 chunk
- 僅在使用者進入知識圖頁面時才下載

### Decision 5: 手機端策略——桌面優先，手機唯讀

**選擇**: 手機端僅顯示閱讀模式（全部展開 / 逐步探索），隱藏編輯工具列

**理由**:
- 節點拖曳在觸控裝置上體驗極差（與縮放手勢衝突）
- 探索報告明確建議不要預設手機完整可編輯
- 閱讀模式在手機上價值更高（隨時複習知識結構）

**偵測方式**: 使用 CSS media query `@media (max-width: 768px)` 控制工具列可見性，配合 `window.matchMedia` 在 JS 層決定是否載入編輯邏輯

### Decision 6: Mermaid 匯入採子集策略

**選擇**: 僅支援 Mermaid `graph`/`flowchart` 語法的受控子集

**支援範圍**:
- `graph TD` / `graph LR` / `flowchart TD` / `flowchart LR` 方向宣告
- `A[text]`、`A(text)`、`A{text}` 節點語法（方形、圓角、菱形）
- `A --> B`、`A --- B`、`A -->|label| B`、`A <--> B` 連線語法（單向、無箭頭、帶標籤、雙向）
- `classDef` 與 `class` 樣式定義（僅映射 `fill` → 節點 color，其餘 CSS 屬性忽略）

**不支援**:
- subgraph（巢狀群組）
- click 事件
- 其他圖表類型（sequence, gantt, pie 等）
- 複雜的 markdown 內嵌

**理由**: 完整 Mermaid 語法解析器複雜度過高，v1 應聚焦於最常見的 flowchart 用例

### Decision 7: Autosave 與資料保護

**選擇**: 每次操作後 debounce 2 秒自動儲存至 localStorage

**機制**:
- 使用 `useRef` + `setTimeout` 實現 debounce
- 離開頁面前（`beforeunload` event）立即儲存
- 應用進入背景時（`visibilitychange` event, `document.hidden === true`）立即儲存（iOS Safari 相容）
- 切換 view 時立即儲存
- 屬性面板輸入使用 local state + 300ms debounce 再同步至畫布 state，避免打字時觸發頻繁重繪
- 系統清除（nuke）時一併清除 `mindspark_graphs` key

**Flush 規則**（強制順序）:
所有「立即儲存」觸發點（`visibilitychange(hidden)`、`beforeunload`、切換 graph 文件、切換 view、關閉 Beta、刪除 active graph）MUST 先執行 `flushPendingEditorChanges()`（將屬性面板的 pending local state 同步至畫布 state），再執行 `persistToLocalStorage()`。確保「最後一個字剛打完就切頁」不丟資料。

### Decision 8: 元件目錄結構

```
components/KnowledgeGraph/
├── KnowledgeGraphWorkspace.tsx   # 主容器（lazy 入口）
├── GraphCanvas.tsx               # @xyflow/react 畫布封裝
├── GraphToolbar.tsx              # 編輯工具列
├── GraphNodeComponent.tsx        # 自訂節點元件（3 層內容）
├── GraphPropertiesPanel.tsx      # 節點屬性面板（顏色、文字）
├── GraphReadingModeToggle.tsx    # 閱讀模式切換
├── GraphDocumentList.tsx         # 圖表文件清單
├── MermaidImportModal.tsx        # Mermaid 匯入對話框
└── MermaidExportModal.tsx        # Mermaid 匯出對話框
```

## Risks / Trade-offs

### [Risk 1] @xyflow/react 套件體積影響載入速度
→ **Mitigation**: Feature-level code splitting 確保主 bundle 零增長。已確認 Vite dynamic import 自動分割 chunk。可透過 `npm run build -- --report` 驗證。

### [Risk 2] Mermaid 解析器容錯不足導致匯入失敗
→ **Mitigation**: 採用子集策略限制支援範圍。匯入時提供明確錯誤訊息與修正建議。加入「預覽」步驟讓使用者確認後再匯入。

### [Risk 3] localStorage 儲存空間限制（約 5-10MB）
→ **Mitigation**: 單一圖表 JSON 通常不超過 100KB。加入圖表數量上限（v1 建議 20 份）。超限時提示使用者刪除舊圖表。

### [Risk 4] 導覽變更導致回歸
→ **Mitigation**: Beta 開關預設關閉，僅在開啟時注入導覽項目。導覽變更使用條件式渲染，不修改現有程式碼邏輯。

### [Risk 5] 手機端觸控與畫布互動衝突
→ **Mitigation**: 手機端完全禁用編輯模式，僅呈現唯讀閱讀模式。避免觸控手勢與 @xyflow 的內建手勢衝突。

### [Risk 6] @xyflow/react 與 React 19 相容性
→ **Mitigation**: @xyflow/react v12+ 宣稱支援 React 18+，但 React 19 為較新版本，可能存在 peer dependency 衝突。安裝時需確認 `npm ls` 無衝突，必要時設定 npm overrides。Task 1.4 包含專門的相容性驗證步驟。

### [Risk 7] lazy-loaded chunk 載入失敗
→ **Mitigation**: 使用 ErrorBoundary 包裹 React.lazy + Suspense，chunk 載入失敗時顯示友善錯誤提示與「重試」按鈕，而非白畫面。Task 3.4 明確包含此實作。

### [Trade-off 1] Beta 開關增加設定複雜度
→ **Accepted**: 這是保護核心體驗的必要代價。開關語義明確為「頁面可見性」而非權限控制。

### [Trade-off 2] 手機不可編輯限制了使用場景
→ **Accepted**: 探索報告明確建議桌面優先策略。手機閱讀模式仍有複習價值。未來版本可逐步引入輕量編輯。
