## Why

知識圖（Knowledge Graph）在上一次迭代（`knowledge-graph-enhancements`）中建立了基礎框架（雙模式編輯、放射狀佈局、TipTap 筆記、便利貼），但使用者在實際使用中發現了多個阻礙體驗的 Bug 和功能缺口，包括：節點無法拖曳連接、菱形形狀變形、逐步探索模式失效、暗色模式下節點不可辨識、節點分佈過於分散、便利貼缺少文字樣式控制等。同時，上一次變更的 verification report 遺留了 4 項技術債（`GraphEditor.tsx` 過大需重構、同名節點覆蓋衝突、硬編碼中文驗證字串、程式碼模式顏色還原矛盾）。

此次升級旨在以最簡潔、安全的架構（Ponytail 核心精神）：修復所有已知 Bug → 償還技術債並重構為輕量級 Hook 架構（精簡至 3 個 Hook，避免過度零碎化） → 採用無侵入式「祖先路徑（Ancestor Path）」複合鍵匹配，解決同名與層級變更時屬性遺失問題（不往 Markdown 代碼寫入任何 UUID，確保 100% 乾淨與可讀） → 新增放射狀佈局與外部圖片 URL 支持（防範 XSS，剔除額外 dagre 依賴與 Supabase Storage 圖片上傳） → 實作安全雙向同步與衝突另存新檔防護 → 將知識圖從實驗模式正式畢業。

## What Changes

### Bug 修復
- **修復菱形節點變形**：`ConceptNode.tsx` 的 `rotate-45` CSS 策略導致文字區域被拉長為膠囊形狀，需改為 CSS `clip-path: polygon()` 方案，內部文字保持水平不旋轉。
- **修復逐步探索模式（Progressive Mode）失效**：切換至 `progressive` 模式後，節點仍顯示全部內容而非按層級展開，需在模式切換時重置節點 `expandLevel` 為 `0`，並確保 `readingMode` 在 `visibleNodes` memo 中傳遞。
- **修復節點拖曳連接不生效**：連接行為未觸發，檢查並修復 React Flow Handle 與 `onConnect` 的正確綁定。

### 技術債償還與核心防護
- **DEBT-04 重構 `GraphEditor.tsx`**：簡化拆分，避免 6 個過度零碎 Hook。僅拆分為 3 個職責清晰的核心 Hooks：`useGraphState`（節點與連線狀態、歷史歷史記錄與 undo/redo）、`useGraphCodeMode`（Markdown 雙模式轉換）、`useGraphStorage`（本地 autosave 與雲端同步）。
- **DEBT-05 同名節點屬性丟失（與 D10-001/D2-001 聯防）**：捨棄複雜且易碎的 `title:depth` 複合鍵方案。改用「祖先路徑（Ancestor Path）」對照方案（如 `父節點:子節點` 複合鍵）。當代碼模式與視覺模式互轉時，只要新節點的祖先路徑與先前一致，即可精準繼承自訂屬性。100% 避免同名及縮排層級變更時屬性遺失，且不在 Markdown 中寫入任何 UUID，確保代碼純淨。
- **DEBT-03 硬編碼中文驗證字串**：將 `graphStorage.ts` 中的中文錯誤訊息遷移至 `GraphErrorCode` enum 錯誤碼，UI 層負責本地化翻譯。
- **WARNING-01 顏色還原規則**：正式採用「保留自訂顏色」策略，在祖先路徑精準匹配下，代碼與視覺模式互轉時 100% 保留使用者自訂樣式。
- **D11-001 向後相容防護**：在 Schema v3 升級中，在儲存層加入 Zod `safeParse` 或安全降級檢驗，遇未知或新增欄位（`backgroundOpacity` 等）自動過濾並套用預設值，保障舊 PWA 客戶端不崩溃。

### 新功能（精簡版，拒絕過度工程）
- **拖曳至空白處新增節點**：從連接點拖曳線至空白處時，彈出簡化浮動選單（方形/圓角/菱形/便利貼），選擇後自動建立節點並連線。
- **暗色模式純色背景選項**：在工具列新增「背景透明度」切換（半透明 / 純色），解決暗色模式節點辨識度問題。
- **多佈局支援**：保留「自由拖曳」與「放射狀佈局（使用既有 radialLayout.ts，不引入任何外部佈局庫）」。
- **便利貼文字樣式**：支援簡單字體大小與粗體樣式。
- **Supabase 雲端儲存與防護**：登入用戶可將知識圖 JSON 同步至雲端 `knowledge_graphs` 表。同步採用 LWW 策略，若檢測到雙向修改衝突，彈出對話框提供「保留本地」、「保留雲端」或「另存新圖表（圖名 + 衝突副本）」選項，拒絕無聲覆寫。
- **外部圖片引用**：支援在節點屬性面板中直接輸入外部圖片 URL 網址並顯示於節點中（進行 http/https 協議安全驗證以防範 XSS），不實作複雜且有安全漏洞的 Supabase Storage 圖片上傳。
- **正式推出**：移除 `betaFeatures.knowledgeGraph` 閘門，知識圖成為一級功能。

## Capabilities

### New Capabilities
- `graph-node-interactions`: 拖曳至空白處建立節點、快捷形狀選單、節點間拖曳連接修復
- `graph-visual-themes`: 暗色模式純色背景切換、菱形節點修復、外部圖片網址引用（安全校驗）
- `graph-layout-modes`: 自由與放射狀佈局切換
- `graph-cloud-storage`: Supabase 知識圖雲端同步（含衝突副本另存新檔與 online 自動重試）
- `graph-editor-refactor`: GraphEditor 輕量級 3 Hooks 重構、錯誤碼系統、祖先路徑複合鍵映射

### Modified Capabilities
- `knowledge-graph-editor`: 新增 onConnectEnd 拖曳建立節點、便利貼文字樣式、連線修復
- `knowledge-graph-reading-modes`: 修復逐步探索模式的 `expandLevel` 傳遞 Bug
- `knowledge-graph-data`: schema v3 升級、錯誤碼遷移與安全 safeParse 向前相容
- `beta-feature-toggle`: 移除知識圖的 beta 閘門，轉為正式功能

## Impact

### 受影響的檔案（按風險排序）
| 風險等級 | 檔案 | 影響範圍 |
|---------|------|---------|
| 🔴 高 | `components/KnowledgeGraph/GraphEditor.tsx` | 重構目標，拆分為 3 個 Hooks |
| 🔴 高 | `services/graphStorage.ts` | Schema v3 safeParse、錯誤碼、雲端同步衝突另存機制 |
| 🟡 中 | `components/KnowledgeGraph/ConceptNode.tsx` | 菱形修復、純色背景切換、外部圖片網址顯示 |
| 🟡 中 | `types/graphTypes.ts` | Schema v3 型別新增 |
| 🟡 中 | `components/KnowledgeGraph/KnowledgeGraphWorkspace.tsx` | 移除 beta 閘門、監聽 online 自動重試、同步衝突 Dialog |
| 🟡 中 | `components/KnowledgeGraph/GraphToolbar.tsx` | 新增背景/佈局切換按鈕 |
| 🟡 中 | `components/KnowledgeGraph/StickyNoteNode.tsx` | 文字樣式支援 |
| 🟢 低 | `components/Settings.tsx` | 移除 beta toggle UI |
| 🟢 低 | `components/AppContent.tsx`, `AppHeader.tsx`, `MobileNav.tsx` | 移除 beta 閘門檢查 |

### 新增依賴
- 無新增外部依賴

### 資料遷移
- localStorage schema v2 → v3 自動遷移與安全向後相容。
- Supabase 需建立 `knowledge_graphs` 資料表，不需建立 Storage bucket。

