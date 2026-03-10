# Performance Benchmark Harness Specification

**Change**: `knowledge-graph-workspace`
**Generated**: 2026-03-08 18:18 (UTC+8)
**Tech Stack**: React 19, TypeScript 5.8, Vite 6, @xyflow/react, @dagrejs/dagre, localStorage
**Stress Test Reference**: `stress-test-report.md`

---

## Section 1: Performance Baselines

### Module 1 — Foundation (Types & Dependencies)

**Target files**: `types/graphTypes.ts`, `types.ts`, `package.json`

| Operation | Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|---------|-----|-----|-----|--------|------------|-------|
| TypeScript compile (incremental) | Small (10 types) | 120ms | 180ms | 250ms | 45MB | — | [ASSUMPTION] |
| TypeScript compile (incremental) | Medium (100 types) | 300ms | 500ms | 700ms | 80MB | — | [ASSUMPTION] |
| TypeScript compile (incremental) | Large (1000 types) | 1.2s | 2.0s | 3.0s | 200MB | — | [ASSUMPTION] |
| TypeScript compile (incremental) | Stress (10000 types) | 5.0s | 8.0s | 12.0s | 600MB | — | [ASSUMPTION] |
| Dependency resolution (`npm install`) | N/A | 8s | 15s | 25s | 150MB disk | — | One-time; @xyflow/react ~200KB gzipped |
| Vite HMR after type change | N/A | 80ms | 150ms | 250ms | — | — | [ASSUMPTION] Vite incremental rebuild |

**Regression gate**: TypeScript incremental compile (10 types) must remain < 300ms p95.

---

### Module 2 — Beta Feature Toggle

**Target files**: `services/storage.ts`, `components/Settings.tsx`

| Operation | Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|---------|-----|-----|-----|--------|------------|-------|
| `localStorage.getItem('mindspark_settings')` + JSON.parse | Small (1KB payload) | 0.05ms | 0.1ms | 0.2ms | <1KB | 20,000 ops/s | [ASSUMPTION] |
| `localStorage.getItem('mindspark_settings')` + JSON.parse | Medium (10KB payload) | 0.1ms | 0.3ms | 0.5ms | 10KB | 10,000 ops/s | [ASSUMPTION] |
| `localStorage.getItem('mindspark_settings')` + JSON.parse | Large (100KB payload) | 0.5ms | 1.0ms | 2.0ms | 100KB | 2,000 ops/s | [ASSUMPTION] |
| `localStorage.getItem('mindspark_settings')` + JSON.parse | Stress (1MB payload) | 3.0ms | 6.0ms | 10.0ms | 1MB | 300 ops/s | [ASSUMPTION] |
| Toggle write (`setItem` + JSON.stringify) | Small (1KB) | 0.1ms | 0.2ms | 0.5ms | <1KB | 15,000 ops/s | [ASSUMPTION] |
| Toggle write (`setItem` + JSON.stringify) | Stress (1MB) | 5.0ms | 10.0ms | 15.0ms | 1MB | 200 ops/s | [ASSUMPTION] |
| Settings.tsx re-render on toggle | N/A | 8ms | 15ms | 25ms | 2MB | — | [ASSUMPTION] React 19 re-render |
| Settings.tsx initial mount | N/A | 25ms | 40ms | 60ms | 5MB | — | [ASSUMPTION] |

**Regression gate**: Settings toggle read/write cycle must complete < 1ms p95 for typical payload (< 10KB).

---

### Module 3 — Navigation Integration

**Target files**: `reducers/appReducer.ts`, `components/AppHeader.tsx`, `components/MobileNav.tsx`, `components/AppContent.tsx`

| Operation | Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|---------|-----|-----|-----|--------|------------|-------|
| View dispatch (`set_view: 'graph'`) | N/A | 0.02ms | 0.05ms | 0.1ms | <1KB | — | Pure reducer; near-zero cost |
| AppHeader.tsx re-render (conditional nav) | N/A | 5ms | 10ms | 18ms | 1.5MB | — | [ASSUMPTION] |
| MobileNav.tsx re-render (conditional nav) | N/A | 4ms | 8ms | 15ms | 1MB | — | [ASSUMPTION] |
| `React.lazy` chunk load (first visit) | N/A | 150ms | 350ms | 600ms | ~200KB net | — | [ASSUMPTION] @xyflow/react chunk download |
| `React.lazy` chunk load (cached) | N/A | 5ms | 10ms | 20ms | 0KB net | — | Vite chunk from browser cache |
| Suspense fallback → component mount | N/A | 200ms | 500ms | 800ms | 8MB | — | [ASSUMPTION] Full workspace mount |
| Conditional render (beta OFF, no graph button) | N/A | 0.5ms | 1.0ms | 2.0ms | 0KB | — | Short-circuit; boolean check only |

**Regression gate**: Lazy chunk first-load must be < 600ms p95 on 4G connection (1.5 Mbps). Cached re-entry must be < 20ms p95. Navigation dispatch must add zero measurable overhead to existing views.

---

### Module 4 — Graph Data Storage Layer

**Target files**: `services/graphStorage.ts`

| Operation | Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|---------|-----|-----|-----|--------|------------|-------|
| `getGraphs()` — list all | Small (10 graphs, ~50KB) | 0.3ms | 0.5ms | 1.0ms | 50KB | 5,000 ops/s | [ASSUMPTION] |
| `getGraphs()` — list all | Medium (20 graphs, ~200KB) | 0.8ms | 1.5ms | 3.0ms | 200KB | 2,000 ops/s | Max 20 graph limit |
| `getGraphs()` — list all | Large (20 graphs, ~2MB dense) | 3.0ms | 6.0ms | 10.0ms | 2MB | 300 ops/s | [ASSUMPTION] Dense graph content |
| `getGraphs()` — list all | Stress (20 graphs, ~5MB edge case) | 8.0ms | 15.0ms | 25.0ms | 5MB | 100 ops/s | [ASSUMPTION] Near localStorage limit |
| `getGraphById(id)` | Small (5KB graph) | 0.2ms | 0.4ms | 0.8ms | 5KB | 10,000 ops/s | [ASSUMPTION] |
| `getGraphById(id)` | Large (500KB graph, 1000 nodes) | 2.0ms | 4.0ms | 8.0ms | 500KB | 500 ops/s | [ASSUMPTION] |
| `getGraphById(id)` | Stress (2MB graph, 10000 nodes) | 8.0ms | 18.0ms | 30.0ms | 2MB | 100 ops/s | [ASSUMPTION] |
| `saveGraph(doc)` — JSON.stringify + setItem | Small (5KB) | 0.3ms | 0.6ms | 1.0ms | 5KB | 8,000 ops/s | [ASSUMPTION] |
| `saveGraph(doc)` — JSON.stringify + setItem | Medium (50KB) | 1.0ms | 2.0ms | 4.0ms | 50KB | 2,000 ops/s | [ASSUMPTION] |
| `saveGraph(doc)` — JSON.stringify + setItem | Large (500KB) | 5.0ms | 10.0ms | 18.0ms | 500KB | 200 ops/s | [ASSUMPTION] |
| `saveGraph(doc)` — JSON.stringify + setItem | Stress (2MB) | 15.0ms | 30.0ms | 50.0ms | 2MB | 50 ops/s | [ASSUMPTION] |
| `deleteGraph(id)` | Any | 0.5ms | 1.0ms | 2.0ms | — | 5,000 ops/s | Parse → filter → rewrite |
| Autosave debounce (2s) fire | N/A | 2000ms | 2050ms | 2100ms | — | — | Timer accuracy; save latency additive |
| `beforeunload` immediate save | N/A | 1.0ms | 5.0ms | 15.0ms | — | — | [ASSUMPTION] Synchronous save |
| Corrupted JSON recovery | N/A | 0.5ms | 1.0ms | 2.0ms | — | — | try-catch → return empty array |
| Graph limit enforcement (20 max) | N/A | 0.3ms | 0.6ms | 1.0ms | — | — | Array length check |

**Regression gate**: `saveGraph` for typical graph (50KB) must complete < 5ms p95. `getGraphs` for full 20-graph list must complete < 10ms p95. Autosave must not block UI thread (debounce ensures this).

---

### Module 5 — Graph Editor Core

**Target files**: `components/KnowledgeGraph/KnowledgeGraphWorkspace.tsx`, `GraphCanvas.tsx`, `GraphDocumentList.tsx`

| Operation | Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|---------|-----|-----|-----|--------|------------|-------|
| KnowledgeGraphWorkspace initial mount | N/A | 80ms | 150ms | 250ms | 10MB | — | [ASSUMPTION] Includes ReactFlow init |
| GraphCanvas render (ReactFlow) | Small (10 nodes, 15 edges) | 15ms | 25ms | 40ms | 8MB | — | [ASSUMPTION] |
| GraphCanvas render (ReactFlow) | Medium (100 nodes, 200 edges) | 50ms | 90ms | 150ms | 25MB | — | [ASSUMPTION] |
| GraphCanvas render (ReactFlow) | Large (1000 nodes, 2000 edges) | 200ms | 400ms | 700ms | 80MB | — | [ASSUMPTION] |
| GraphCanvas render (ReactFlow) | Stress (10000 nodes, 20000 edges) | 1.5s | 3.0s | 5.0s | 300MB | — | [ASSUMPTION] Beyond typical use |
| Zoom/Pan interaction (fps) | Small (10 nodes) | 60fps | 58fps | 55fps | — | — | Smooth |
| Zoom/Pan interaction (fps) | Medium (100 nodes) | 58fps | 50fps | 45fps | — | — | [ASSUMPTION] |
| Zoom/Pan interaction (fps) | Large (1000 nodes) | 40fps | 30fps | 20fps | — | — | [ASSUMPTION] May degrade |
| Zoom/Pan interaction (fps) | Stress (10000 nodes) | 15fps | 8fps | 5fps | — | — | [ASSUMPTION] Unacceptable; need virtualization |
| Node drag (single node move) | Small (10 nodes) | 2ms/frame | 4ms/frame | 8ms/frame | — | — | [ASSUMPTION] |
| Node drag (single node move) | Large (1000 nodes) | 8ms/frame | 16ms/frame | 25ms/frame | — | — | [ASSUMPTION] Position update per frame |
| GraphDocumentList render | 20 items (max) | 5ms | 10ms | 15ms | 2MB | — | Simple list; max 20 graphs |
| Re-render on node position change | Medium (100 nodes) | 3ms | 6ms | 12ms | — | — | [ASSUMPTION] ReactFlow internal diff |

**Regression gate**: Canvas render for 100 nodes must complete < 150ms p95. Zoom/pan must maintain ≥ 45fps at 100 nodes. Initial workspace mount must complete < 300ms p95 (excluding network).

---

### Module 6 — Custom Nodes & Toolbar

**Target files**: `components/KnowledgeGraph/GraphNodeComponent.tsx`, `GraphToolbar.tsx`

| Operation | Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|---------|-----|-----|-----|--------|------------|-------|
| GraphNodeComponent render (3-layer) | Single node | 2ms | 4ms | 8ms | 0.5KB | — | [ASSUMPTION] |
| GraphNodeComponent render (3-layer) | 10 nodes batch | 12ms | 20ms | 35ms | 5KB | — | [ASSUMPTION] |
| GraphNodeComponent render (3-layer) | 100 nodes batch | 80ms | 140ms | 220ms | 50KB | — | [ASSUMPTION] |
| GraphNodeComponent render (3-layer) | 1000 nodes batch | 600ms | 1.0s | 1.5s | 500KB | — | [ASSUMPTION] |
| Node creation (add to canvas) | N/A | 5ms | 10ms | 20ms | 1KB | — | Create node object + setState |
| Node deletion + edge cleanup | Small (10 edges affected) | 3ms | 6ms | 12ms | — | — | Filter edges by source/target |
| Node deletion + edge cleanup | Large (100 edges affected) | 8ms | 15ms | 25ms | — | — | [ASSUMPTION] |
| Edge creation (drag from handle) | N/A | 3ms | 5ms | 10ms | <1KB | — | ReactFlow built-in |
| Edge label edit (double-click) | N/A | 2ms | 4ms | 8ms | <1KB | — | Text input overlay |
| Toolbar render | N/A | 3ms | 5ms | 10ms | 1MB | — | Static buttons; minimal |
| Re-render count per node add | N/A | 2 renders | 3 renders | 4 renders | — | — | [ASSUMPTION] setState + ReactFlow sync |

**Regression gate**: Single node render must complete < 8ms p95. Node creation must complete < 15ms p95. Node deletion with edge cleanup (10 edges) must complete < 10ms p95. Re-render count per operation must not exceed 3.

---

### Module 7 — Properties Panel

**Target files**: `components/KnowledgeGraph/GraphPropertiesPanel.tsx`

| Operation | Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|---------|-----|-----|-----|--------|------------|-------|
| Panel mount (node selected) | N/A | 8ms | 15ms | 25ms | 2MB | — | [ASSUMPTION] |
| Panel unmount (node deselected) | N/A | 3ms | 5ms | 10ms | — | — | Cleanup |
| Color picker render (6 options) | N/A | 3ms | 5ms | 10ms | 0.5MB | — | Static palette |
| Color change apply | N/A | 2ms | 5ms | 10ms | — | — | setState → node data update |
| Font size toggle (sm/md/lg) | N/A | 2ms | 4ms | 8ms | — | — | CSS class swap |
| Content edit (title field keystroke) | Per keystroke | 1ms | 3ms | 5ms | — | — | Controlled input |
| Content edit (details textarea keystroke) | Per keystroke | 1ms | 3ms | 5ms | — | — | [ASSUMPTION] |
| Content edit (1000-char paste) | N/A | 3ms | 6ms | 12ms | 2KB | — | [ASSUMPTION] Single setState |
| Panel show/hide animation | N/A | 16ms | 16ms | 32ms | — | — | 1-2 frames at 60fps |

**Regression gate**: Panel mount must complete < 25ms p95. Keystroke-to-update latency must be < 5ms p95. Color/font changes must reflect on canvas within 1 frame (16ms).

---

### Module 8 — Reading Modes

**Target files**: `components/KnowledgeGraph/GraphReadingModeToggle.tsx`

| Operation | Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|---------|-----|-----|-----|--------|------------|-------|
| Mode toggle (expand-all → progressive) | Small (10 nodes) | 5ms | 10ms | 18ms | — | — | Collapse all L2/L3 |
| Mode toggle (expand-all → progressive) | Medium (100 nodes) | 20ms | 40ms | 70ms | — | — | [ASSUMPTION] Batch node resize |
| Mode toggle (expand-all → progressive) | Large (1000 nodes) | 100ms | 200ms | 350ms | — | — | [ASSUMPTION] |
| Mode toggle (expand-all → progressive) | Stress (10000 nodes) | 800ms | 1.5s | 2.5s | — | — | [ASSUMPTION] May cause jank |
| Mode toggle (progressive → expand-all) | Small (10 nodes) | 8ms | 15ms | 25ms | 2MB | — | Expand all; more content rendered |
| Mode toggle (progressive → expand-all) | Medium (100 nodes) | 30ms | 60ms | 100ms | 15MB | — | [ASSUMPTION] |
| Mode toggle (progressive → expand-all) | Large (1000 nodes) | 150ms | 300ms | 500ms | 80MB | — | [ASSUMPTION] |
| Progressive click-to-expand (single node) | N/A | 3ms | 6ms | 12ms | <5KB | — | L1→L2 or L2→L3 transition |
| Progressive click-to-collapse (single node) | N/A | 2ms | 4ms | 8ms | — | — | L3→L1 reset |
| Mode persistence (save to viewState) | N/A | 0.2ms | 0.5ms | 1.0ms | — | — | In-memory update; autosave handles IO |
| Node auto-resize after content change | Single node | 4ms | 8ms | 15ms | — | — | [ASSUMPTION] ReactFlow fitView |

**Regression gate**: Mode toggle for 100 nodes must complete < 80ms p95. Single-node expand/collapse must complete < 10ms p95. Mode switch must not drop below 30fps during transition.

---

### Module 9 — Mermaid Bridge

**Target files**: `services/mermaidBridge.ts`, `components/KnowledgeGraph/MermaidImportModal.tsx`, `MermaidExportModal.tsx`

| Operation | Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|---------|-----|-----|-----|--------|------------|-------|
| `parseMermaidToGraph()` | Small (10 lines, 10 nodes) | 1ms | 2ms | 4ms | 5KB | 5,000 ops/s | [ASSUMPTION] Regex-based parser |
| `parseMermaidToGraph()` | Medium (100 lines, 100 nodes) | 5ms | 10ms | 18ms | 50KB | 500 ops/s | [ASSUMPTION] |
| `parseMermaidToGraph()` | Large (1000 lines, 1000 nodes) | 30ms | 60ms | 100ms | 500KB | 50 ops/s | [ASSUMPTION] |
| `parseMermaidToGraph()` | Stress (10000 lines, 10000 nodes) | 200ms | 400ms | 700ms | 5MB | 5 ops/s | [ASSUMPTION] Unlikely real-world |
| `exportGraphToMermaid()` | Small (10 nodes) | 0.5ms | 1ms | 2ms | 2KB | 10,000 ops/s | String concatenation |
| `exportGraphToMermaid()` | Medium (100 nodes) | 2ms | 4ms | 8ms | 20KB | 2,500 ops/s | [ASSUMPTION] |
| `exportGraphToMermaid()` | Large (1000 nodes) | 15ms | 30ms | 50ms | 200KB | 200 ops/s | [ASSUMPTION] |
| `exportGraphToMermaid()` | Stress (10000 nodes) | 100ms | 200ms | 350ms | 2MB | 25 ops/s | [ASSUMPTION] |
| dagre auto-layout | Small (10 nodes, 15 edges) | 2ms | 4ms | 8ms | 1MB | 2,000 ops/s | [ASSUMPTION] |
| dagre auto-layout | Medium (100 nodes, 200 edges) | 15ms | 30ms | 50ms | 5MB | 200 ops/s | [ASSUMPTION] |
| dagre auto-layout | Large (1000 nodes, 2000 edges) | 100ms | 200ms | 350ms | 30MB | 20 ops/s | [ASSUMPTION] |
| dagre auto-layout | Stress (10000 nodes, 20000 edges) | 800ms | 1.5s | 2.5s | 150MB | 2 ops/s | [ASSUMPTION] |
| Mermaid syntax error detection | N/A | 0.5ms | 1ms | 2ms | <1KB | — | Line-by-line parse with error positions |
| MermaidImportModal render | N/A | 15ms | 25ms | 40ms | 3MB | — | Textarea + preview panel |
| MermaidExportModal render | N/A | 10ms | 18ms | 30ms | 2MB | — | Read-only display + copy button |
| Bidirectional roundtrip (parse → export → parse) | Medium (100 nodes) | 12ms | 20ms | 35ms | 70KB | — | Consistency validation |

**Regression gate**: `parseMermaidToGraph` for 100 lines must complete < 15ms p95. dagre layout for 100 nodes must complete < 40ms p95. Export for 100 nodes must complete < 8ms p95. Bidirectional roundtrip must produce structurally identical graph (zero data loss).

---

### Module 10 — Testing

**Target files**: `src/__tests__/graphStorage.test.ts`, `src/__tests__/mermaidBridge.test.ts`, `src/__tests__/betaFeatureToggle.test.ts`, `src/__tests__/readingModes.test.ts`

| Operation | Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|---------|-----|-----|-----|--------|------------|-------|
| Full test suite execution (`npm test`) | All tests | 8s | 15s | 25s | 200MB | — | [ASSUMPTION] Vitest parallel |
| `graphStorage.test.ts` (CRUD suite) | 15-20 tests | 1.5s | 3s | 5s | 50MB | — | [ASSUMPTION] localStorage mock |
| `mermaidBridge.test.ts` (parse/export) | 15-20 tests | 1.0s | 2s | 4s | 40MB | — | [ASSUMPTION] Pure functions |
| `betaFeatureToggle.test.ts` (toggle) | 8-10 tests | 0.5s | 1s | 2s | 30MB | — | [ASSUMPTION] Simple state |
| `readingModes.test.ts` (mode switch) | 10-12 tests | 1.0s | 2s | 3s | 40MB | — | [ASSUMPTION] Component tests |
| `npm run build` (code splitting verify) | N/A | 15s | 30s | 45s | 500MB | — | [ASSUMPTION] Full Vite build |
| Knowledge graph chunk size | N/A | — | — | — | ≤250KB gz | — | [ASSUMPTION] @xyflow/react + components |

**Regression gate**: Full test suite must pass in < 30s. Individual test file must complete in < 8s. Knowledge graph chunk must not exceed 300KB gzipped. Build must not fail.

---

### Module 11 — Integration & Polish

**Target files**: All `components/KnowledgeGraph/*`, `App.tsx`, theme integration

| Operation | Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|---------|-----|-----|-----|--------|------------|-------|
| Theme switch (light → dark) in graph view | Medium (100 nodes) | 15ms | 30ms | 50ms | — | — | [ASSUMPTION] CSS class toggle |
| Theme switch (light → dark) in graph view | Large (1000 nodes) | 40ms | 80ms | 140ms | — | — | [ASSUMPTION] Repaint all nodes |
| Mobile responsive layout (<768px) | N/A | 10ms | 18ms | 30ms | — | — | CSS media query; hide toolbar |
| Beta toggle OFF → graph nav disappears | N/A | 2ms | 5ms | 10ms | — | — | Conditional render removal |
| System nuke (`mindspark_graphs` cleanup) | N/A | 0.5ms | 1.0ms | 2.0ms | — | — | `localStorage.removeItem` |
| Full E2E flow: enable beta → create graph → add nodes → save → reload | N/A | 3s | 5s | 8s | — | — | [ASSUMPTION] Playwright timing |
| Main bundle size impact (no graph loaded) | N/A | — | — | — | 0KB added | — | Feature must NOT affect main chunk |
| Total app memory (graph view active, 100 nodes) | N/A | — | — | — | 45MB | — | [ASSUMPTION] React + ReactFlow + DOM |

**Regression gate**: Theme switch must complete < 50ms p95 at 100 nodes. Main bundle size must not increase. System nuke must clear all graph data. Full E2E flow must complete < 8s.

---

## Section 2: Benchmark Test Scenarios

### Scenario 1: Normal Load (Baseline) — 5 min Steady State

**Objective**: Establish baseline performance under typical user conditions.

**Configuration**:
- Graph document: 1 active, containing 30 nodes + 45 edges
- User actions: 1 operation every 3-5 seconds (drag, edit, toggle)
- localStorage: 5 existing graphs (~25KB each)
- Browser: Chrome 120+, single tab

**Workload Profile**:
```
Duration:  5 minutes
Actions:   ~80 operations total
Mix:       40% node drag, 20% content edit, 15% edge create/delete,
           10% zoom/pan, 10% reading mode toggle, 5% save/load
```

**Measurements**:
| Metric | Target | Fail Threshold |
|--------|--------|----------------|
| Canvas frame rate (continuous) | ≥ 55fps | < 45fps |
| Node drag latency | < 8ms p95 | > 16ms p95 |
| Content edit keystroke-to-render | < 5ms p95 | > 10ms p95 |
| Autosave trigger-to-complete | < 10ms p95 | > 50ms p95 |
| Memory (heap) after 5 min | < 60MB | > 100MB |
| Memory growth rate | < 1MB/min | > 5MB/min |
| React re-renders per operation | ≤ 3 | > 5 |

**Pass Criteria**: ALL metrics within Target. WARN if any metric between Target and Fail. FAIL if any metric exceeds Fail Threshold.

---

### Scenario 2: Peak Load — 2 min at 3× Normal

**Objective**: Validate performance under burst activity (rapid editing session).

**Configuration**:
- Graph document: 1 active, starting with 100 nodes + 200 edges
- User actions: 1 operation every 1 second (3× normal rate)
- Operations include bulk: add 10 nodes, delete 5 nodes, mode toggle rapid-fire
- localStorage: 20 graphs at limit (~200KB total)

**Workload Profile**:
```
Duration:  2 minutes
Actions:   ~120 operations total
Mix:       30% node add/delete (burst), 25% edge operations,
           20% rapid content editing, 15% mode toggles, 10% zoom/pan
Burst:     10 node additions in 10 seconds (second 30-40)
```

**Measurements**:
| Metric | Target | Fail Threshold |
|--------|--------|----------------|
| Canvas frame rate during burst | ≥ 40fps | < 25fps |
| Node add latency (per node in burst) | < 20ms p95 | > 50ms p95 |
| Edge cleanup on bulk delete (5 nodes) | < 30ms p95 | > 80ms p95 |
| Autosave queue (no missed saves) | 0 missed | > 1 missed |
| Memory peak during burst | < 80MB | > 150MB |
| Post-burst memory (30s after) | < 65MB | > 100MB |
| UI responsiveness (input delay) | < 100ms | > 300ms |

**Pass Criteria**: ALL metrics within Target during peak period. Memory must return to near-baseline within 30s after burst ends.

---

### Scenario 3: Sustained Load (Endurance) — 30 min Steady

**Objective**: Detect memory leaks, handle accumulation, and timer drift over extended sessions.

**Configuration**:
- Graph document: Switch between 3 different graphs during session
- User actions: 1 operation every 5 seconds (relaxed pace)
- Include periodic saves (autosave every 2s + manual saves)
- Simulate tab background/foreground cycles (5 cycles)

**Workload Profile**:
```
Duration:  30 minutes
Actions:   ~360 operations total
Mix:       35% content editing, 25% node drag, 15% graph switching,
           10% mermaid import/export, 10% reading mode toggle, 5% zoom
Switches:  Change active graph every 10 minutes
Tab:       Background tab at 8min, 16min, 24min (30s each)
```

**Measurements**:
| Metric | Target | Fail Threshold |
|--------|--------|----------------|
| Memory at T=0 (baseline) | < 50MB | — |
| Memory at T=10min | < 55MB | > 80MB |
| Memory at T=20min | < 60MB | > 100MB |
| Memory at T=30min | < 65MB | > 120MB |
| Memory growth rate (linear) | < 0.5MB/min | > 2MB/min |
| Frame rate at T=30min vs T=0 | < 5% degradation | > 15% degradation |
| Autosave reliability (30 min) | 100% successful | < 99% |
| localStorage corruption | 0 incidents | > 0 |
| Event listener leak (count at T=30) | ≤ T=0 + 5 | > T=0 + 20 |
| DOM node count growth | < 10% over baseline | > 30% over baseline |
| Graph data integrity after tab cycles | 100% match | < 100% |

**Pass Criteria**: Memory growth must be sub-linear. No leaks detected. All graph data intact after 30 minutes.

---

### Scenario 4: Spike Test — 1 min from 0 → Max → 0

**Objective**: Validate behavior during instantaneous load spikes (e.g., large Mermaid import).

**Configuration**:
- Start: Empty graph workspace (0 nodes)
- Spike: Import 500-node Mermaid document at T=10s
- Sustain: Interact with 500-node graph for 30s
- Drop: Switch to empty new graph at T=40s
- Observe: Recovery for 20s

**Workload Profile**:
```
Duration:  1 minute
Phase 1:   T=0s–10s   — Idle workspace, 0 nodes
Phase 2:   T=10s      — Import 500-node Mermaid (parseMermaidToGraph + dagre layout)
Phase 3:   T=10s–40s  — Interact with 500-node graph (drag, zoom, edit)
Phase 4:   T=40s      — Create new empty graph (500 nodes unloaded)
Phase 5:   T=40s–60s  — Verify recovery to baseline
```

**Measurements**:
| Metric | Target | Fail Threshold |
|--------|--------|----------------|
| Mermaid parse time (500 nodes) | < 100ms | > 300ms |
| dagre layout time (500 nodes) | < 150ms | > 500ms |
| Canvas render after import (500 nodes) | < 400ms | > 1000ms |
| Total import-to-interactive time | < 800ms | > 2000ms |
| Frame rate during 500-node interaction | ≥ 30fps | < 15fps |
| Memory spike (500 nodes loaded) | < 120MB | > 200MB |
| Memory after switch to empty graph | < 60MB | > 100MB |
| GC pause during spike | < 50ms | > 200ms |
| UI freeze during import | < 200ms | > 500ms |

**Pass Criteria**: Import completes without UI freeze > 200ms. Memory recovers to within 20% of baseline after dropping load. Frame rate recovers to ≥ 55fps within 5s of load drop.

---

### Scenario 5: Failure Recovery — 5 min with Injected Failures

**Objective**: Validate graceful degradation and recovery under adverse conditions.

**Configuration**:
- Graph document: Active graph with 50 nodes + 80 edges
- Injected failures at specific times during the 5-minute run

**Failure Injection Schedule**:
```
T=30s   — Corrupt localStorage (set mindspark_graphs to invalid JSON)
T=60s   — Fill localStorage to quota (inject 5MB of dummy data)
T=90s   — Remove mindspark_graphs key entirely during autosave
T=120s  — Trigger rapid re-renders (setState loop simulation)
T=180s  — Simulate beforeunload during active save
T=240s  — Clear all injected failures, observe recovery
```

**Measurements**:
| Metric | Target | Fail Threshold |
|--------|--------|----------------|
| Corrupted JSON handling | Graceful fallback (empty array) | Uncaught exception |
| localStorage quota exceeded | Toast error, in-memory state preserved | Data loss or crash |
| Missing key recovery | Recreate with current state | Crash or blank screen |
| Rapid re-render protection | ≤ 10 renders/second | > 30 renders/second |
| `beforeunload` save reliability | Data persisted or queued | Silent data loss |
| Post-recovery data integrity | ≥ 95% state recovered | < 80% |
| Error boundary activation | Catches component errors | Blank screen |
| Console errors during failures | ≤ 5 unique errors | > 15 unique errors |
| App remains interactive during failures | Yes (outside graph) | Full app freeze |

**Pass Criteria**: App must never crash. All failures must be handled gracefully with user-visible feedback. Recovery must restore usable state within 5s of failure clearance. No silent data loss.

---

## Section 3: Benchmark Harness Setup

### 3.1 Recommended Tools

| Tool | Purpose | Version | Install |
|------|---------|---------|---------|
| **Vitest** | Unit benchmark + test runner | 4.0.18 (existing) | Already installed |
| **Vitest bench** | Microbenchmark (`bench()` API) | Built-in to Vitest | `vitest bench` command |
| **React Testing Library** | Component render timing | 16.3.2 (existing) | Already installed |
| **Playwright** | E2E performance + screenshots | 1.58.2 (existing) | Already installed |
| **Performance API** | Browser-native timing | Built-in | `performance.now()`, `performance.mark()` |
| **Chrome DevTools Protocol** | Memory snapshots, heap analysis | Via Playwright CDP | `page.evaluate(() => performance.memory)` |

### 3.2 Data Seeding

#### PowerShell Script: Generate Test Graph Documents

```powershell
# File: scripts/seed-benchmark-graphs.ps1
# Generates JSON test fixtures for benchmark scenarios

param(
    [int]$NodeCount = 100,
    [int]$EdgeMultiplier = 2,
    [string]$OutputDir = "src/__tests__/fixtures"
)

# Ensure output directory exists
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$edgeCount = $NodeCount * $EdgeMultiplier

# Generate nodes
$nodes = @()
for ($i = 0; $i -lt $NodeCount; $i++) {
    $row = [math]::Floor($i / 10)
    $col = $i % 10
    $nodes += @{
        id = "node-$i"
        position = @{ x = $col * 200; y = $row * 150 }
        data = @{
            title = "Concept $i"
            definition = "Definition for concept $i. This is Level 2 content for benchmark testing."
            details = "Detailed notes for concept $i. This represents Level 3 content. " +
                      "It contains additional information that would be shown in expand-all mode. " +
                      "The content is intentionally longer to simulate realistic node payloads."
            color = @('#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899')[$i % 6]
            fontSize = @('sm', 'md', 'lg')[$i % 3]
        }
        type = "concept"
    }
}

# Generate edges (random connections, no self-loops)
$edges = @()
$edgeSet = @{}
for ($i = 0; $i -lt $edgeCount; $i++) {
    do {
        $src = Get-Random -Minimum 0 -Maximum $NodeCount
        $tgt = Get-Random -Minimum 0 -Maximum $NodeCount
        $key = "$src->$tgt"
    } while ($src -eq $tgt -or $edgeSet.ContainsKey($key))
    $edgeSet[$key] = $true
    $edges += @{
        id = "edge-$i"
        source = "node-$src"
        target = "node-$tgt"
        label = if ($i % 3 -eq 0) { "relates to" } elseif ($i % 3 -eq 1) { "depends on" } else { "" }
        animated = ($i % 5 -eq 0)
        markerEnd = $true
    }
}

# Assemble graph document
$graph = @{
    id = "bench-graph-$NodeCount"
    name = "Benchmark Graph ($NodeCount nodes)"
    nodes = $nodes
    edges = $edges
    viewState = @{
        readingMode = "expand-all"
        zoom = 1.0
        panX = 0
        panY = 0
    }
    createdAt = (Get-Date -Format "o")
    updatedAt = (Get-Date -Format "o")
}

$json = $graph | ConvertTo-Json -Depth 10
$outFile = Join-Path $OutputDir "bench-graph-$NodeCount.json"
Set-Content -Path $outFile -Value $json -Encoding UTF8

Write-Host "Generated: $outFile"
Write-Host "  Nodes: $NodeCount"
Write-Host "  Edges: $($edges.Count)"
Write-Host "  File size: $([math]::Round($json.Length / 1024, 1)) KB"
```

#### Generate All Benchmark Profiles

```powershell
# Generate fixtures for all 4 input profiles
$profiles = @(10, 100, 1000, 10000)
foreach ($n in $profiles) {
    pwsh -File scripts/seed-benchmark-graphs.ps1 -NodeCount $n -EdgeMultiplier 2
}
```

#### Generate Mermaid Test Fixtures

```powershell
# File: scripts/seed-mermaid-fixtures.ps1
# Generates Mermaid flowchart strings for parse benchmarks

param(
    [int]$NodeCount = 100,
    [string]$OutputDir = "src/__tests__/fixtures"
)

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$lines = @("graph TD")

# Node declarations
for ($i = 0; $i -lt $NodeCount; $i++) {
    $syntax = switch ($i % 3) {
        0 { "N$i[Concept $i]" }
        1 { "N$i(Concept $i)" }
        2 { "N$i{Concept $i}" }
    }
    $lines += "    $syntax"
}

# Edge declarations (chain + cross-links)
for ($i = 0; $i -lt ($NodeCount - 1); $i++) {
    $lines += "    N$i --> N$($i + 1)"
    if ($i % 5 -eq 0 -and ($i + 3) -lt $NodeCount) {
        $lines += "    N$i -->|relates| N$($i + 3)"
    }
}

# Add some classDef
$lines += "    classDef important fill:#f96,stroke:#333"
$lines += "    classDef secondary fill:#69b,stroke:#555"
$lines += "    class N0,N5,N10 important"

$content = $lines -join "`n"
$outFile = Join-Path $OutputDir "bench-mermaid-$NodeCount.txt"
Set-Content -Path $outFile -Value $content -Encoding UTF8

Write-Host "Generated: $outFile ($($lines.Count) lines, $NodeCount nodes)"
```

### 3.3 Environment Isolation

#### Test localStorage Isolation

```typescript
// src/__tests__/helpers/benchmarkSetup.ts

const BENCH_PREFIX = 'mindspark_bench_';

/** Create isolated localStorage for benchmarks (no cross-contamination) */
export function createIsolatedStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[`${BENCH_PREFIX}${key}`] ?? null,
    setItem: (key: string, value: string) => { store[`${BENCH_PREFIX}${key}`] = value; },
    removeItem: (key: string) => { delete store[`${BENCH_PREFIX}${key}`]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

/** Seed benchmark localStorage with fixture data */
export async function seedBenchmarkData(
  storage: Storage,
  fixturePath: string
): Promise<void> {
  const fs = await import('fs');
  const data = fs.readFileSync(fixturePath, 'utf-8');
  storage.setItem('mindspark_graphs', `[${data}]`);
}

/** Cleanup after benchmark run */
export function cleanupBenchmark(storage: Storage): void {
  storage.clear();
}
```

#### Vitest Benchmark Configuration

```typescript
// vitest.bench.config.ts (add to project root if not present)
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/__tests__/benchmarks/**/*.bench.ts'],
    benchmark: {
      include: ['src/__tests__/benchmarks/**/*.bench.ts'],
      outputFile: 'benchmark-results.json',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

### 3.4 Sample Benchmark Files

#### Storage Layer Benchmark

```typescript
// src/__tests__/benchmarks/graphStorage.bench.ts
import { bench, describe } from 'vitest';
import { createIsolatedStorage } from '../helpers/benchmarkSetup';

// Simulated graphStorage functions (import actual after implementation)
function getGraphs(storage: Storage): unknown[] {
  const raw = storage.getItem('mindspark_graphs');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function saveGraph(storage: Storage, graphs: unknown[], doc: unknown): void {
  const updated = [...graphs.filter((g: any) => g.id !== (doc as any).id), doc];
  storage.setItem('mindspark_graphs', JSON.stringify(updated));
}

describe('graphStorage CRUD benchmarks', () => {
  const smallFixture = JSON.stringify(
    Array.from({ length: 10 }, (_, i) => ({
      id: `graph-${i}`, name: `Graph ${i}`, nodes: [], edges: [],
      viewState: { readingMode: 'expand-all', zoom: 1, panX: 0, panY: 0 },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }))
  );

  bench('getGraphs — Small (10 graphs)', () => {
    const storage = createIsolatedStorage();
    storage.setItem('mindspark_graphs', smallFixture);
    getGraphs(storage);
  });

  bench('saveGraph — Small (5KB)', () => {
    const storage = createIsolatedStorage();
    storage.setItem('mindspark_graphs', '[]');
    const doc = { id: 'new', name: 'New', nodes: Array(10).fill({ id: 'n', position: { x: 0, y: 0 }, data: { title: 'T' }, type: 'concept' }), edges: [], viewState: { readingMode: 'expand-all', zoom: 1, panX: 0, panY: 0 }, createdAt: '', updatedAt: '' };
    saveGraph(storage, [], doc);
  });
});
```

#### Mermaid Parser Benchmark

```typescript
// src/__tests__/benchmarks/mermaidBridge.bench.ts
import { bench, describe } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Placeholder — replace with actual import after implementation
// import { parseMermaidToGraph, exportGraphToMermaid } from '@/services/mermaidBridge';

describe('Mermaid Bridge benchmarks', () => {
  const smallMermaid = 'graph TD\n' +
    Array.from({ length: 10 }, (_, i) => `    N${i}[Concept ${i}]`).join('\n') + '\n' +
    Array.from({ length: 9 }, (_, i) => `    N${i} --> N${i + 1}`).join('\n');

  const mediumMermaid = 'graph TD\n' +
    Array.from({ length: 100 }, (_, i) => `    N${i}[Concept ${i}]`).join('\n') + '\n' +
    Array.from({ length: 99 }, (_, i) => `    N${i} --> N${i + 1}`).join('\n');

  bench('parseMermaidToGraph — Small (10 nodes)', () => {
    // parseMermaidToGraph(smallMermaid);
    // Placeholder: simulate regex parsing
    const lines = smallMermaid.split('\n');
    lines.forEach(line => /(\w+)\[([^\]]+)\]/.exec(line));
  });

  bench('parseMermaidToGraph — Medium (100 nodes)', () => {
    // parseMermaidToGraph(mediumMermaid);
    const lines = mediumMermaid.split('\n');
    lines.forEach(line => /(\w+)\[([^\]]+)\]/.exec(line));
  });
});
```

### 3.5 How to Run

#### Run All Benchmarks

```powershell
# Run microbenchmarks (Vitest bench)
npx vitest bench --config vitest.bench.config.ts

# Run with JSON output for CI comparison
npx vitest bench --config vitest.bench.config.ts --reporter=json > benchmark-results.json

# Run unit tests (verify correctness before benchmarking)
npm test

# Run E2E performance tests (Playwright)
npx playwright test e2e/knowledge-graph-perf.spec.ts --reporter=html
```

#### Run Individual Module Benchmarks

```powershell
# Storage benchmarks only
npx vitest bench src/__tests__/benchmarks/graphStorage.bench.ts

# Mermaid bridge benchmarks only
npx vitest bench src/__tests__/benchmarks/mermaidBridge.bench.ts

# Canvas rendering benchmarks (Playwright-based)
npx playwright test e2e/canvas-perf.spec.ts
```

#### Generate Fixtures Before First Run

```powershell
# Ensure fixtures exist
New-Item -ItemType Directory -Force -Path src/__tests__/fixtures | Out-Null

# Generate all profiles
@(10, 100, 1000, 10000) | ForEach-Object {
    pwsh -File scripts/seed-benchmark-graphs.ps1 -NodeCount $_ -EdgeMultiplier 2
}

# Generate Mermaid fixtures
@(10, 100, 1000, 10000) | ForEach-Object {
    pwsh -File scripts/seed-mermaid-fixtures.ps1 -NodeCount $_
}
```

#### Measure Bundle Size Impact

```powershell
# Build and measure chunk sizes
npm run build 2>&1 | Out-Null

# List all chunks and their sizes
Get-ChildItem -Path dist/assets -Filter "*.js" | 
    Sort-Object Length -Descending |
    Select-Object Name, @{N='SizeKB';E={[math]::Round($_.Length/1024,1)}} |
    Format-Table -AutoSize

# Find knowledge-graph specific chunks
Get-ChildItem -Path dist/assets -Filter "*.js" -Recurse |
    Where-Object { $_.Length -gt 50KB } |
    ForEach-Object {
        $hasXyflow = (Select-String -Path $_.FullName -Pattern "xyflow|reactflow" -Quiet)
        [PSCustomObject]@{
            File = $_.Name
            SizeKB = [math]::Round($_.Length/1024, 1)
            ContainsXyflow = $hasXyflow
        }
    } | Format-Table -AutoSize

# Verify main chunk did NOT grow (compare with baseline)
# Baseline should be recorded before knowledge-graph implementation
$mainChunk = Get-ChildItem -Path dist/assets -Filter "index-*.js" | Select-Object -First 1
Write-Host "Main chunk size: $([math]::Round($mainChunk.Length/1024, 1)) KB"
```

### 3.6 How to Interpret Results

#### Pass / Warn / Fail Classification

| Indicator | Meaning | Action Required |
|-----------|---------|-----------------|
| ✅ **PASS** | Metric within target threshold | None — performance is healthy |
| ⚠️ **WARN** | Metric between target and fail threshold (within 20% of fail) | Investigate; optimize if trending up |
| ❌ **FAIL** | Metric exceeds fail threshold | Block merge; fix before proceeding |

#### Per-Module Result Interpretation

| Module | Key Metric | PASS | WARN | FAIL |
|--------|-----------|------|------|------|
| M1: Foundation | tsc incremental | < 200ms | 200–300ms | > 300ms |
| M2: Beta Toggle | Settings read/write | < 0.5ms | 0.5–1.0ms | > 1.0ms |
| M3: Navigation | Lazy chunk first-load | < 400ms | 400–600ms | > 600ms |
| M4: Storage | saveGraph (50KB) | < 3ms | 3–5ms | > 5ms |
| M4: Storage | getGraphs (20 graphs) | < 5ms | 5–10ms | > 10ms |
| M5: Editor Core | Canvas render (100 nodes) | < 100ms | 100–150ms | > 150ms |
| M5: Editor Core | Zoom/pan fps (100 nodes) | ≥ 50fps | 45–50fps | < 45fps |
| M6: Custom Nodes | Single node render | < 5ms | 5–8ms | > 8ms |
| M6: Custom Nodes | Re-render count | ≤ 2 | 3 | > 3 |
| M7: Properties | Panel mount | < 15ms | 15–25ms | > 25ms |
| M7: Properties | Keystroke latency | < 3ms | 3–5ms | > 5ms |
| M8: Reading Modes | Mode toggle (100 nodes) | < 50ms | 50–80ms | > 80ms |
| M9: Mermaid | parse (100 nodes) | < 8ms | 8–15ms | > 15ms |
| M9: Mermaid | dagre layout (100 nodes) | < 25ms | 25–40ms | > 40ms |
| M9: Mermaid | export (100 nodes) | < 5ms | 5–8ms | > 8ms |
| M10: Testing | Full suite runtime | < 20s | 20–30s | > 30s |
| M10: Testing | Graph chunk size | < 200KB | 200–300KB | > 300KB |
| M11: Integration | Theme switch (100 nodes) | < 30ms | 30–50ms | > 50ms |
| M11: Integration | Main bundle delta | 0KB | < 5KB | > 5KB |

---

## Section 4: Regression Gate

### Module-Level Regression Thresholds

Every module has a specific threshold that must NOT be exceeded on any PR. These are enforced via CI benchmark comparison.

| Module | Gate Metric | Threshold | Measurement Method |
|--------|-----------|-----------|-------------------|
| **M1: Foundation** | tsc incremental compile time | < 300ms p95 | `Measure-Command { npx tsc --noEmit }` |
| **M2: Beta Toggle** | Settings toggle cycle (read+write) | < 1ms p95 | Vitest bench: `benchmarkSetup.ts` |
| **M3: Navigation** | Lazy chunk size (gzipped) | ≤ 300KB | `npm run build` → check `dist/assets/` |
| **M3: Navigation** | Cached re-entry time | < 20ms p95 | Playwright: navigation timing |
| **M4: Storage** | `saveGraph` latency (50KB doc) | < 5ms p95 | Vitest bench: `graphStorage.bench.ts` |
| **M4: Storage** | `getGraphs` latency (20 graphs) | < 10ms p95 | Vitest bench: `graphStorage.bench.ts` |
| **M4: Storage** | Autosave debounce accuracy | 2000ms ± 100ms | Timer assertion in unit test |
| **M5: Editor Core** | Canvas render (100 nodes) | < 150ms p95 | Vitest bench with JSDOM or Playwright |
| **M5: Editor Core** | Zoom/pan frame rate (100 nodes) | ≥ 45fps sustained | Playwright: `requestAnimationFrame` counter |
| **M6: Custom Nodes** | Node render time (single) | < 8ms p95 | React Testing Library: `render()` timing |
| **M6: Custom Nodes** | Re-renders per CRUD operation | ≤ 3 | React Profiler API count |
| **M7: Properties** | Panel mount time | < 25ms p95 | React Testing Library: mount timing |
| **M7: Properties** | Input keystroke-to-update | < 5ms p95 | Controlled input timing |
| **M8: Reading Modes** | Mode toggle (100 nodes) | < 80ms p95 | Vitest bench or Playwright |
| **M8: Reading Modes** | Single node expand/collapse | < 10ms p95 | Event handler timing |
| **M9: Mermaid** | `parseMermaidToGraph` (100 lines) | < 15ms p95 | Vitest bench: `mermaidBridge.bench.ts` |
| **M9: Mermaid** | dagre layout (100 nodes, 200 edges) | < 40ms p95 | Vitest bench: dagre timing |
| **M9: Mermaid** | `exportGraphToMermaid` (100 nodes) | < 8ms p95 | Vitest bench: export timing |
| **M9: Mermaid** | Roundtrip data loss | 0% | Assertion: parse(export(graph)) ≅ graph |
| **M10: Testing** | Full test suite runtime | < 30s | `Measure-Command { npm test }` |
| **M10: Testing** | Knowledge graph chunk (gzipped) | ≤ 300KB | Build artifact check |
| **M11: Integration** | Theme switch latency (100 nodes) | < 50ms p95 | Playwright: className toggle timing |
| **M11: Integration** | Main bundle size delta | 0KB added | Compare `index-*.js` before/after |
| **M11: Integration** | E2E full flow time | < 8s | Playwright: full scenario timing |

### CI Integration Commands

#### Baseline Capture (Run Once Before Feature Branch)

```powershell
# Capture baseline metrics on main branch
git checkout main

# Record main bundle size
npm run build 2>&1 | Out-Null
$baseline = Get-ChildItem -Path dist/assets -Filter "index-*.js" | 
    Select-Object -First 1
$baselineSize = $baseline.Length
Set-Content -Path ".perf-baseline.json" -Value (@{
    mainBundleBytes = $baselineSize
    capturedAt = (Get-Date -Format "o")
    branch = "main"
    commitSha = (git rev-parse HEAD)
} | ConvertTo-Json)

Write-Host "Baseline captured: $([math]::Round($baselineSize/1024, 1)) KB"
```

#### PR Gate Check (Run on Every PR)

```powershell
# Script: scripts/perf-gate-check.ps1
# Exit code 0 = pass, 1 = fail

$exitCode = 0
$results = @()

# --- Check 1: Main bundle size regression ---
npm run build 2>&1 | Out-Null
$mainChunk = Get-ChildItem -Path dist/assets -Filter "index-*.js" | Select-Object -First 1
$baseline = Get-Content ".perf-baseline.json" | ConvertFrom-Json

$delta = $mainChunk.Length - $baseline.mainBundleBytes
$deltaKB = [math]::Round($delta / 1024, 1)

if ($delta -gt 5120) {  # > 5KB
    Write-Host "FAIL: Main bundle grew by ${deltaKB}KB (max: 5KB)" -ForegroundColor Red
    $exitCode = 1
} elseif ($delta -gt 0) {
    Write-Host "WARN: Main bundle grew by ${deltaKB}KB" -ForegroundColor Yellow
} else {
    Write-Host "PASS: Main bundle size OK (delta: ${deltaKB}KB)" -ForegroundColor Green
}
$results += @{ check = "main-bundle-size"; delta = $deltaKB; status = if ($delta -gt 5120) { "FAIL" } elseif ($delta -gt 0) { "WARN" } else { "PASS" } }

# --- Check 2: Knowledge graph chunk size ---
$kgChunks = Get-ChildItem -Path dist/assets -Filter "*.js" -Recurse |
    Where-Object { Select-String -Path $_.FullName -Pattern "xyflow|reactflow|KnowledgeGraph" -Quiet }
$totalKgSize = ($kgChunks | Measure-Object -Property Length -Sum).Sum
$kgSizeKB = [math]::Round($totalKgSize / 1024, 1)

if ($totalKgSize -gt 307200) {  # > 300KB
    Write-Host "FAIL: Knowledge graph chunk ${kgSizeKB}KB exceeds 300KB" -ForegroundColor Red
    $exitCode = 1
} elseif ($totalKgSize -gt 204800) {  # > 200KB
    Write-Host "WARN: Knowledge graph chunk ${kgSizeKB}KB approaching limit" -ForegroundColor Yellow
} else {
    Write-Host "PASS: Knowledge graph chunk ${kgSizeKB}KB OK" -ForegroundColor Green
}
$results += @{ check = "kg-chunk-size"; sizeKB = $kgSizeKB; status = if ($totalKgSize -gt 307200) { "FAIL" } elseif ($totalKgSize -gt 204800) { "WARN" } else { "PASS" } }

# --- Check 3: Test suite ---
$testResult = Measure-Command { npm test -- --run 2>&1 }
$testSeconds = [math]::Round($testResult.TotalSeconds, 1)

if ($testResult.TotalSeconds -gt 30) {
    Write-Host "FAIL: Test suite took ${testSeconds}s (max: 30s)" -ForegroundColor Red
    $exitCode = 1
} elseif ($testResult.TotalSeconds -gt 20) {
    Write-Host "WARN: Test suite took ${testSeconds}s" -ForegroundColor Yellow
} else {
    Write-Host "PASS: Test suite completed in ${testSeconds}s" -ForegroundColor Green
}
$results += @{ check = "test-suite-time"; seconds = $testSeconds; status = if ($testResult.TotalSeconds -gt 30) { "FAIL" } elseif ($testResult.TotalSeconds -gt 20) { "WARN" } else { "PASS" } }

# --- Check 4: TypeScript compilation ---
$tscResult = Measure-Command { npx tsc --noEmit 2>&1 }
$tscMs = [math]::Round($tscResult.TotalMilliseconds)

if ($tscMs -gt 5000) {
    Write-Host "FAIL: tsc took ${tscMs}ms" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "PASS: tsc completed in ${tscMs}ms" -ForegroundColor Green
}
$results += @{ check = "tsc-compile"; ms = $tscMs; status = if ($tscMs -gt 5000) { "FAIL" } else { "PASS" } }

# --- Check 5: Vitest benchmarks (if benchmark files exist) ---
$benchFiles = Get-ChildItem -Path "src/__tests__/benchmarks" -Filter "*.bench.ts" -ErrorAction SilentlyContinue
if ($benchFiles) {
    Write-Host "`nRunning microbenchmarks..." -ForegroundColor Cyan
    npx vitest bench --config vitest.bench.config.ts --reporter=json 2>&1 |
        Set-Content -Path "benchmark-results.json"
    Write-Host "Benchmark results written to benchmark-results.json"
} else {
    Write-Host "SKIP: No benchmark files found (create src/__tests__/benchmarks/*.bench.ts)" -ForegroundColor Gray
}

# --- Summary ---
Write-Host "`n=== Performance Gate Summary ===" -ForegroundColor Cyan
$results | ForEach-Object {
    $color = switch ($_.status) { "PASS" { "Green" } "WARN" { "Yellow" } "FAIL" { "Red" } }
    Write-Host "  [$($_.status)] $($_.check)" -ForegroundColor $color
}

if ($exitCode -ne 0) {
    Write-Host "`nPerformance gate FAILED. Fix regressions before merging." -ForegroundColor Red
} else {
    Write-Host "`nPerformance gate PASSED." -ForegroundColor Green
}

exit $exitCode
```

#### Quick Performance Smoke Test

```powershell
# Fast check — run after any knowledge-graph code change
# Completes in < 60 seconds

Write-Host "=== Quick Performance Smoke Test ===" -ForegroundColor Cyan

# 1. Type check
Write-Host "`n[1/4] TypeScript check..." -NoNewline
$tsc = Measure-Command { npx tsc --noEmit 2>&1 }
Write-Host " $([math]::Round($tsc.TotalMilliseconds))ms" -ForegroundColor $(if ($tsc.TotalMilliseconds -lt 5000) { "Green" } else { "Red" })

# 2. Unit tests (knowledge-graph related only)
Write-Host "[2/4] Unit tests..." -NoNewline
$test = Measure-Command { npx vitest run --reporter=dot src/__tests__/graphStorage src/__tests__/mermaidBridge src/__tests__/betaFeatureToggle src/__tests__/readingModes 2>&1 }
Write-Host " $([math]::Round($test.TotalSeconds, 1))s" -ForegroundColor $(if ($test.TotalSeconds -lt 10) { "Green" } else { "Red" })

# 3. Build (verify code splitting)
Write-Host "[3/4] Build..." -NoNewline
$build = Measure-Command { npm run build 2>&1 }
Write-Host " $([math]::Round($build.TotalSeconds, 1))s" -ForegroundColor $(if ($build.TotalSeconds -lt 45) { "Green" } else { "Red" })

# 4. Chunk size check
Write-Host "[4/4] Chunk analysis..." -NoNewline
$mainChunk = Get-ChildItem -Path dist/assets -Filter "index-*.js" | Select-Object -First 1
$mainKB = [math]::Round($mainChunk.Length / 1024, 1)
Write-Host " main=${mainKB}KB" -ForegroundColor Green

Write-Host "`nSmoke test complete." -ForegroundColor Cyan
```

---

## Coverage Summary

| Dimension | Coverage | Details |
|-----------|----------|---------|
| **Modules benchmarked** | 11 / 11 (100%) | All modules have baseline tables |
| **Scenario types** | 5 / 5 (100%) | Normal, Peak, Sustained, Spike, Failure Recovery |
| **Input profiles** | 4 / 4 (100%) | Small (10), Medium (100), Large (1000), Stress (10000) |
| **Operations measured** | 62 unique operations | Across all modules |
| **Regression gates** | 24 thresholds | At least 1 per module, up to 4 for complex modules |
| **CI automation** | 3 scripts | Baseline capture, PR gate, quick smoke test |
| **Fixture generators** | 2 scripts | Graph JSON + Mermaid text |
| **Benchmark files** | 2 sample files | `graphStorage.bench.ts`, `mermaidBridge.bench.ts` |
| **Metrics per operation** | 5-6 columns | p50, p95, p99, Memory, Throughput, Notes |

---

## Assumptions Log

| # | Assumption | Basis | Risk if Wrong |
|---|-----------|-------|---------------|
| A1 | localStorage `getItem` + `JSON.parse` completes < 1ms for < 10KB payloads | Browser localStorage spec; V8 JSON parser is highly optimized | **Low** — localStorage is synchronous and fast for small payloads; if wrong, all storage baselines shift but architecture is unchanged |
| A2 | @xyflow/react renders 100 nodes in < 150ms | ReactFlow documentation claims smooth performance up to hundreds of nodes; community benchmarks support this | **Medium** — if ReactFlow is slower, may need node virtualization or canvas batching for Module 5 |
| A3 | @xyflow/react gzipped bundle is ~200KB | npm bundle analysis (bundlephobia.com); actual size may vary with tree-shaking | **Medium** — if larger, lazy loading strategy becomes even more critical; may need to reconsider if > 400KB |
| A4 | dagre layout for 100 nodes completes < 40ms | dagre is a well-optimized graph layout library; 100 nodes is within comfortable range | **Low** — dagre is CPU-bound but efficient; unlikely to exceed threshold for typical graphs |
| A5 | Vitest `bench()` API provides reliable p50/p95/p99 measurements | Vitest documentation confirms benchmark API uses tinybench under the hood with statistical analysis | **Low** — Vitest bench is mature; results may vary by machine but relative comparisons are stable |
| A6 | React 19 re-render cost per component is 2-8ms | React 19 performance characteristics; functional components with hooks | **Low** — React 19 may be faster than assumed; baselines are conservative |
| A7 | Single GraphDocument with 100 nodes serializes to ~50KB JSON | Estimated from node structure: ~500 bytes/node × 100 nodes + edges + metadata | **Low** — actual size depends on content length (title, definition, details); 50KB is a reasonable median |
| A8 | Mermaid regex-based parser handles 100 lines in < 15ms | Simple regex line-by-line parsing; no AST construction needed for supported subset | **Low** — regex parsing is fast; risk only if parser implementation uses backtracking patterns |
| A9 | localStorage quota is ~5-10MB across browsers | Chrome: 5MB, Firefox: 5MB, Safari: 5MB (per origin) | **Medium** — if a user has many other `mindspark_*` keys, available space for graphs decreases; 20-graph limit mitigates this |
| A10 | `beforeunload` event fires reliably for autosave | Standard browser behavior; synchronous operations complete during unload | **Medium** — some mobile browsers may kill the page without firing unload; data loss possible on mobile crash |
| A11 | Playwright can measure sub-100ms timing accurately | Playwright uses CDP protocol for precise timing; `performance.now()` resolution is sufficient | **Low** — modern browsers provide high-resolution timers; Playwright adds minimal overhead |
| A12 | 10,000-node graphs are "stress" scenarios beyond normal use | Knowledge graphs for study typically have 10-200 concepts; 10K is an extreme edge case | **Low** — if users somehow create 10K-node graphs, performance will degrade but the app won't crash due to localStorage limits (5MB cap) |
| A13 | Main bundle size will not increase with proper lazy loading | Vite dynamic import creates separate chunks; `React.lazy` prevents main-chunk inclusion | **Low** — Vite's code splitting is well-tested; risk only if circular imports pull ReactFlow into main |
| A14 | Memory growth < 0.5MB/min indicates no significant leaks | Baseline for React SPAs with moderate state; some growth is normal from browser caches | **Medium** — if ReactFlow has internal caches that grow, may need periodic cleanup or node pool recycling |
| A15 | Theme switch (CSS class toggle) completes < 50ms for 100 nodes | Tailwind dark mode uses CSS class swap; browser repaints affected elements | **Low** — CSS-only changes are fast; risk if custom node styles require JS recalculation |

---

*End of Performance Benchmark Harness Specification*
