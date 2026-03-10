# 壓力測試報告與測試矩陣 (Stress Test Report & Test Matrix)

## Section A: 壓力測試報告 (Stress Test Report)

### [ISSUE-001] Category: Architecture
- **Affected Step**: 1.4
- **Problem**: 未定義 `@xyflow/react` 與 React 19 之間的 peer dependency 衝突檢查。React 19 是剛發布的，若未特別處理可能會產生安裝錯誤。
- **Risk Level**: HIGH
- **Suggested Addition**: 新增步驟驗證套件與 React 19 相容性，包含發生衝突時的 npm resolutions 處理策略。

### [ISSUE-002] Category: Missing Detail
- **Affected Step**: 1.1
- **Problem**: `GraphNode` 缺少文字輸入的長度限制，可能導致惡意或過長的輸入佔滿 localStorage 並破壞版面。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 定義 `title`, `definition`, `details` 的最大字元數限制。

### [ISSUE-003] Category: Assumption Risk
- **Affected Step**: 2.3
- **Problem**: 假設存取 `settings.betaFeatures.knowledgeGraph` 是安全的，但對於舊用戶可能 `betaFeatures` 本身是 undefined 導致應用程式白畫面。
- **Risk Level**: HIGH
- **Suggested Addition**: 加上 optional chaining 及預設值防護 `settings?.betaFeatures?.knowledgeGraph ?? false`。

### [ISSUE-004] Category: Logic Gap
- **Affected Step**: 2.3
- **Problem**: 當使用者關閉 Beta 功能後，遺留的 `mindspark_graphs` 資料會永遠殘留在 localStorage 佔用空間。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 關閉 Beta 功能時，提示警告詢問使用者是否自動清空相關圖表資料。

### [ISSUE-005] Category: Logic Gap
- **Affected Step**: 3.4
- **Problem**: 若使用者直接修改 State 或 LocalStorage 強制將 view 設為 `graph`，就算 Beta 關閉，仍有可能繞過導覽列隱藏機制作弊進入。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 實作 View Guardian，在 render 前強行驗證 Beta 狀態，不符則 fallback 回 dashboard。

### [ISSUE-006] Category: Edge Case
- **Affected Step**: 3.4
- **Problem**: Dynamic import (`React.lazy`) 可能在行動網路切換或離線時失敗，導致應用程式卡死在 Suspense，沒有辦法復原。
- **Risk Level**: HIGH
- **Suggested Addition**: 外層必須包裝 ErrorBoundary，當載入 chunk 失敗時顯示「請檢查網路並重試」按鈕。

### [ISSUE-007] Category: Logic Gap
- **Affected Step**: 4.1
- **Problem**: `deleteGraph()` 未考慮如果刪除的正好是**當前正在畫布上開啟的圖表**，會導致系統進入無資料圖表的異常狀態。
- **Risk Level**: HIGH
- **Suggested Addition**: 刪除操作需檢查是否為活躍圖表，若是則強制清除當前 activeId 並回到列表畫面。

### [ISSUE-008] Category: Edge Case
- **Affected Step**: 4.1
- **Problem**: localStorage 很容易因圖表過度複雜而觸發 `QuotaExceededError`（大約 5MB 上限）。
- **Risk Level**: HIGH
- **Suggested Addition**: 捕捉 `saveGraph` 中的 DOMException 22，並彈出 Toast 警告用戶空間已滿。

### [ISSUE-009] Category: Missing Detail
- **Affected Step**: 4.3
- **Problem**: 依賴 `beforeunload` 在不同行動瀏覽器（尤其是 iOS Safari）行為不一致，可能導致離開頁面時未能儲存最後 2 秒的修改。
- **Risk Level**: HIGH
- **Suggested Addition**: 同時綁定 `visibilitychange` 事件來捕捉應用程式進入背景的儲存時機。

### [ISSUE-010] Category: Assumption Risk
- **Affected Step**: 5.4
- **Problem**: 預設的畫布縮放行為如果沒有上限與下限，使用者可能會縮小到找不到節點（遺失在畫布之外）。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 在 ReactFlow 設定中強制加上 `minZoom`、`maxZoom` 與 `translateExtent` 操作範圍邊界。

### [ISSUE-011] Category: Edge Case
- **Affected Step**: 6.4
- **Problem**: 鍵盤按下 Delete 鍵會觸發節點刪除。若使用者正在編輯節點內文字（Input 處於 focus），這會產生嚴重的快捷鍵衝突。
- **Risk Level**: HIGH
- **Suggested Addition**: 偵測 `document.activeElement`，若是 INPUT / TEXTAREA 則忽略圖表的刪除行為。

### [ISSUE-012] Category: Logic Gap
- **Affected Step**: 6.5
- **Problem**: 使用者可能會將節點連向自己，或是形成循環依賴 (A -> B -> A)，這可能讓 dagre 自動佈局遇到演算法死結或報錯。
- **Risk Level**: HIGH
- **Suggested Addition**: 在匯入自動佈局或連線建立時加入 cyclic check 或禁用自體連線機制。

### [ISSUE-013] Category: Missing Detail
- **Affected Step**: 7.4
- **Problem**: 在屬性面板中頻繁修改文字內容，若即時反映到節點上，會造成整個畫布的無意義頻繁重新渲染，影響打字效能。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 屬性面板輸入框使用 Local State，並加入 `onChange` 的輸入 debounce 才推送到畫布 State。

### [ISSUE-014] Category: Architecture
- **Affected Step**: 8.2
- **Problem**: 切換到「全部展開」時，原本密集的佈局會因為節點尺寸突然增大而產生大量節點重疊，破壞視覺體驗。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 在模式切換完成後，自動觸發一次短暫的 dagre 重新佈局或是排斥演算法，以撐開節點間距。

### [ISSUE-015] Category: Missing Detail
- **Affected Step**: 8.5
- **Problem**: 在極小寬度的手機螢幕上，「全部展開」可能會破壞版面，因為 Canvas 機制對於容器寬度非常敏感。
- **Risk Level**: LOW
- **Suggested Addition**: 強制節點設定最大寬度 (`max-width: 90vw`) 並對於展開後的過多文字允許節點內部 Y 軸滾動。

### [ISSUE-016] Category: Logic Gap
- **Affected Step**: 9.4
- **Problem**: Mermaid 解析器若是遇到惡意建構的 RegExp (ReDoS 攻擊) 或極大的圖稿，可能會在 Main Thread 卡死整個瀏覽器。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 限制 Mermaid 匯入文字的最大字元數 (例如 5000字)，或在 Web Worker 解析以避開 Main Thread 阻塞。

### [ISSUE-017] Category: Edge Case
- **Affected Step**: 9.5
- **Problem**: 使用者自訂的節點標題中若包含 Mermaid 關鍵字元（例如 `[`、`(`、`{`、`>`），匯出為 Mermaid 時會導致語法破裂並無法重新匯入。
- **Risk Level**: HIGH
- **Suggested Addition**: Mermaid 匯出函式必須實作嚴格的 sanitize / 逸出 (escape) 規則。

### [ISSUE-018] Category: Architecture
- **Affected Step**: 10.1
- **Problem**: 測試環境中通常缺少 `@xyflow/react` 依賴的 `ResizeObserver` API，這會導致元件掛載即崩潰。
- **Risk Level**: HIGH
- **Suggested Addition**: 明確在 vitest setup 加入 `ResizeObserver` 的 Polyfill 或 mock 設定。

### [ISSUE-019] Category: Missing Detail
- **Affected Step**: 11.2
- **Problem**: 僅針對桌面端偵測寬度隱藏工具列並不夠完善，觸控螢幕的平板可能會被誤判。
- **Risk Level**: LOW
- **Suggested Addition**: 加入 `ontouchstart in window` 等偵測條件，配合 CSS Media API 以正確隱藏編輯工具。

### [ISSUE-020] Category: Assumption Risk
- **Affected Step**: 11.1
- **Problem**: 深淺色主題切換時，若自訂節點內的 SVG 或文字沒有正確使用 CSS 變數跟隨 Theme Context 更新，會導致顏色對比失效。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 確保 GraphNode 使用 `var(--color-...)` 或 Tailwind dark: 前綴，不寫死 HEX 色碼。

---

## Section B: 測試矩陣 (Test Matrix)

### Module: 1. Foundation: 型別定義與依賴安裝

#### Unit Test Cases
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | `GraphDocument` 型別防呆 | 定義檔中的介面 | 符合 TS Interface 校驗且無 `any` 警告 | P0 |
| 2 | Beta 功能預設關閉 | 無設定值 | 反饋為 `false` | P0 |
| 3 | React Flow 基礎載入 | `render()` | 正常 mount 不產生警告 | P1 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | 路由與型別介接 | Router, GlobalState | 當選取 `'graph'` view, 可以正常匹配 Typescript union type |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | `UserSettings` 遷移 | 舊用戶沒有 `betaFeatures` 屬性 | 安全回退到預設 false 而不崩潰 |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | 相依套件版本異常 | 封裝的 React 版本與套件相衝 | CI 建置階段立即噴錯阻擋 |

#### Expected Outcomes
- 型別堅固，嚴格保證 API 操作皆有完整防護，完全相容於未來的 Strict Mode 開發。

### Module: 2. Beta 功能開關系統

#### Unit Test Cases
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | 開關狀態寫入 | 點擊 Switch | `betaFeatures.knowledgeGraph` 反轉並儲存 | P0 |
| 2 | 使用者隱私清除 | Nuke System | 開關設定回復預設關閉狀態 | P2 |
| 3 | 不合法的值 | localStorage 手動寫入非布林值 | fallback 為布林值 | P1 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | 跨元件同步 | Settings, AppHeader | Settings 改變立即觸發 Header UI 重繪 |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | 處於圖表內並關閉 Beta | 讓用戶不會卡死在隱藏頁面 | 強制觸發 `dispatch({type: 'set_view', payload: 'dashboard'})` |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | 寫入 localStorage 失敗 | 無痕模式空間限制 | `console.error` 背景紀錄且不中斷操作 |

#### Expected Outcomes
- Beta 開關具備極高的響應能力並且可以安全地阻隔不穩定功能的暴露。

### Module: 3. 導覽整合

#### Unit Test Cases
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | PC 端顯示邏輯 | Beta On | Navbar 出現按鈕 | P0 |
| 2 | Mobile 端顯示邏輯 | Beta On | 漢堡選單內出現按鈕 | P0 |
| 3 | 懶載入觸發 | 進入 Graph 視圖 | `Suspense` 的 fallback 出現 | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Code Split 確認 | Vite 產物 | 確認 index.html 中不包含 reactflow，點擊後才載入 network 請求 |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | 繞過 Beta 機制 | 透過 Devtools 改寫 state | `AppContent` 直接阻擋並回退主頁 |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Chunk 載入失敗 | 網路斷線 | `ErrorBoundary` 跳出提供「重新載入」按鈕 |

#### Expected Outcomes
- Bundle 的大小變更完美隔離，並且功能切換對路由系統帶來 0 負面影響。

### Module: 4. 圖表資料儲存層

#### Unit Test Cases
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Create / Fetch | Graph JSON | 能夠正常建立並回傳 | P0 |
| 2 | Delete / Verify | id | Graph 清單少一項 | P0 |
| 3 | Maximum Limit | 新增第 21 個圖表 | 回傳 Fail 訊息 | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | 防抖寫入測試 | Storage API, Timer | 連續更改 50 次，僅觸發一次真正的 localStorage 寫入 |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | 資料損壞 JSON 解析 | 亂碼假資料 | 回傳 `[]` 並透過 Toast 警告 |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Storage 塞滿 | QuotaExceededError | Try/Catch 捕捉並暫停寫入，保留程式狀態避免炸掉 |

#### Expected Outcomes
- 完美的狀態同步持久化。既不傷害效能，也不容許一絲的資料永久流失風險。

### Module: 5. 圖表編輯器核心

#### Unit Test Cases
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Canvas Mount | 基礎節點 JSON | ReactFlow 元件正確生成對應 Node | P0 |
| 2 | 節點移動更新 | 事件 `nodeDragStop` | 反向更新到 GraphDocument state | P0 |
| 3 | 畫布 Zoom / Pan | 限縮的範圍設定 | 不可以平移到畫面完全不見節點的地方 | P1 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | 狀態與儲存介接 | Canvas, StorageLayer | 節點位置變化立即寫進 Reducer 並進入防抖排程寫入 |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | 空白圖表處理 | Nodes 為空陣列 | 顯示空白 Grid 畫布與教學引導字樣 |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Xyflow 崩潰 | 不支援的版本或函式 | Workspace 層級的 ErrorBoundary 獨立隔離 |

#### Expected Outcomes
- 流暢的視覺互動，高 FPS 體驗，且編輯體驗不易發生失誤（如迷失在畫布之外）。

### Module: 6. 自訂節點與工具列

#### Unit Test Cases
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | 新增節點點擊 | Button onClick | Nodes Array 長度 +1，並顯示在中心點 | P0 |
| 2 | 連線建立拖曳 | Handle onConnect | Edges Array +1 帶箭頭屬性 | P0 |
| 3 | Delete 快捷鍵防護 | Input Box 正在輸入 | Node 不會被誤刪 | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | 清理孤兒連線 | Canvas Node, Edges | 刪除 Node 時，同步遍歷刪除源自或指向它的 Edges |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | 循環連線 | `A -> B -> A` | 排版前驗證並阻擋，或正確跳過循環避免 StackOverflow |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Type 遺失 | nodes 配對不到 custom type | 降級顯示基礎文字節點 |

#### Expected Outcomes
- 強大的自定義節點與順暢工具體驗。

### Module: 7. 屬性面板

#### Unit Test Cases
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | 選擇觸發 | OnNodeClick | 面板變為 Visible, 帶上 Node context | P0 |
| 2 | 取消選擇 | OnPaneClick | 面板隱藏並清空 ActiveData | P0 |
| 3 | 顏色變更 | 按下色塊 | 節點即時變色 | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | 雙向綁定順暢度 | Panel Input, Canvas Node | 打字不會卡頓，透過 debounced sync 進行資料回寫 |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | 極長內容輸入 | 貼上的字串達上千字 | Panel 有 max-height 與 overflow，且文字 word-break |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Node 突然被刪除 | 雙視窗或熱鍵觸發 | 面板偵測 Target 消失自動關閉 |

#### Expected Outcomes
- 給予使用者精準修改節點內容的介面，漸進式揭露資訊，不打擾原本心流作業。

### Module: 8. 閱讀模式

#### Unit Test Cases
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | 模式切換 Expand | mode = `expand-all` | 所有 L2/L3 資料不再套用 `hidden` class | P0 |
| 2 | 模式切換 Progressive | mode = `progressive` | 所有 L2/L3 隱藏，僅保持標題 | P0 |
| 3 | 持久化檢驗 | 切換頁面再回來 | 先前設定的 Mode 被正確戴入 | P1 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | 自動版面調整配合 | Canvas mode changes | Expand All 會呼叫 `fitView` 或做次級佈局調整以避免節點強烈擠壓重疊 |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | 沒有 L2 卻有 L3 | 意外的結構 | Progressive Mode 直接一鍵顯示 L3 |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Node 高度暴增 | 包含巨量文字 | 以 max-height / overflow 限制 node 不會無限擴張 |

#### Expected Outcomes
- 穩健地展示知識的三層架構，適合從測驗複習跳轉到脈絡梳理不同學習曲線的情境。

### Module: 9. Mermaid 橋接器

#### Unit Test Cases
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | 基礎 Parser 測試 | `A[Start]-->B[End]` | nodes=[A,B], edges=[A->B] | P0 |
| 2 | Dagre 佈局 | Nodes 無座標 | Dagre 賦予 x,y 後回傳 | P0 |
| 3 | Mermaid 匯出 | Canvas 狀態資料 | 正確轉換為 `graph TD;\n...` Markdown 文字 | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | 安全跳脫處理 | Builder, Canvas Data | 針對有括號、標點符號的文字實作字元跳脫 (Escape)，避免產出死結語法 |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | 不支援語法匯入 | `subgraph` 或 `sequenceDiagram` | 提示 Toast「格式不相容」，並阻擋匯入 |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Parser 遇到爛語法 | AI 產生殘缺的 markdown | 優雅的 try-catch，告訴使用者有語法錯誤。 |

#### Expected Outcomes
- 打通外界 LLM 的橋樑。

### Module: 10. 測試

#### Unit Test Cases
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | 記憶體上限防呆 | Mock 假象 localStorage 超載 | catch handler 被正常激活 | P0 |
| 2 | ResizeObserver Mock | env settings | 確保 `vitest.setup.ts` 運行良好 | P0 |
| 3 | CRUD 行為 | Reducer Action | Store State 反映出相應調整 | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | App 回歸影響確認 | 主動觸發舊有 quiz 元件測試 | 全部通過，且無引用 graph chunk |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | 單元測試快取污染 | Multiple Tests Sharing | 確保在 `afterEach` 清洗 mock storage。 |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Dagre test 逾時 | timeout | 使用合理的大小做佈局測試 |

#### Expected Outcomes
- 建構全面保護網。

### Module: 11. 整合與收尾

#### Unit Test Cases
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | 手機端介面自適應 | Width < 768px | Toolbar 不生成 DOM | P0 |
| 2 | Nuke 整體打掃 | System Action Reset | Graph 相關 Keys 被全部殺死 | P0 |
| 3 | DarkMode 動態刷新 | Theme 切換 | Node 使用的 Custom CSS Vars 自動更隨主體變色 | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Safari 觸控驗證 | `ontouchstart` check | 如果判定為 Touch 裝置，即便是大平板，也會強制進入閱讀模式不可編輯 |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | 系統大更新衝突 | N/A | 無任何副作用影響。 |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Global Style Bleed | Tailwind class 碰撞 | `xy-theme` 與預設 CSS 無隔離導致變形 -> scoped CSS 阻擋 |

#### Expected Outcomes
- Beta 版順利融合，與主邏輯隔絕良好，呈現無痕且乾淨的使用者體驗。
