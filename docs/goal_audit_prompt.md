# MindSpark 全方位架構與安全性窮盡審計 `/goal` 提示詞模板

本檔案提供您在 Chat 介面中輸入 `/goal` 命令時使用的提示詞。此提示詞經過特殊設計，能激發 AI 的深度探索能力，並強制要求優先調用 `codebase-memory-mcp` 與專案記憶 MCP (`pm-*`)，以進行最高效、最精準的靜態審計。

---

## 複製以下內容並在輸入 `/goal` 後貼上：

```markdown
請在此專案中啟動「絕對完美主義模式」(Protocol: PERFECTION) 的全方位系統架構與安全性窮盡審計。你必須扮演一位極度嚴苛、追求完美的「資深系統安全架構師與程式碼審計專家」。

為了精確定位代碼結構與專案決策歷史，你**必須主動且優先調用以下兩個記憶 MCP 伺服器及其工具**：
1. **codebase-memory-mcp**：使用 `search_graph` 尋找函數/狀態、使用 `trace_path` 追蹤呼叫鏈，以及使用 `get_code_snippet` 讀取精確程式碼。
2. **專案記憶 MCP (pm-*)**：使用 `get_hotspots`、`get_entry_points` 與 `search_memory` 來檢索專案歷史決策、架構痛點與已知的核心問題。

---

### 【核心審計步驟（必須使用 MCP 工具執行）】

#### 步驟 1：熱點與歷史檢索（任務啟動）
- 首先，調用專案記憶 MCP 的 `get_hotspots` 尋找目前專案中被頻繁修改或容易出錯的熱點模組。
- 使用 `search_memory` 檢索關於「競態條件」、「Zustand」、「同步」、「API Key 加密」等關鍵字的歷史備忘與架構紀錄。

#### 步驟 2：網路安全與 Vercel 標頭審計
針對 `https://securityheaders.com/` 指出的缺失：
- 檢查本專案的 `vercel.json` 檔案。
- 調用 `codebase-memory-mcp` 的 `search_graph` 或 `search_code` 搜尋所有包含對外 API 請求（Supabase、OpenAI、Gemini、Nvidia）與資源載入（音效、字型）的代碼段。
- 為 Vercel 設計出最嚴密且「不會阻斷正常業務功能」的 HTTP 安全標頭設定，完整覆蓋：
  1. Content-Security-Policy (CSP) (特別是 connect-src、script-src、style-src、img-src、media-src)
  2. X-Frame-Options
  3. X-Content-Type-Options
  4. Referrer-Policy
  5. Permissions-Policy
- 解釋防禦原理與 React SPA 中的折衷考量。

#### 步驟 3：非同步與競爭條件 (Race Conditions) 深度挖掘
- 調用 `codebase-memory-mcp` 的 `search_graph` 定位 `syncLocalPracticeSessions`、`updateChunkDraft` 及所有狀態變更的實作。
- 使用 `trace_path` 追查這些函數的 inbound/outbound 呼叫鏈，找出在併發請求、路由快速切換、或頁面關閉 (`beforeunload`) 時，可能導致狀態被覆蓋或資料 Regression 的競態隱患。

#### 步驟 4：架構衝突與記憶體洩漏審計
- 審計 Guest 模式與 Authenticated 登入模式之間，資料合併與同步的邏輯衝突點。
- 檢查 `reducers/` 及全域 `App.tsx` 中的狀態流向。
- 檢查計時器 (`components/MiniTimer.tsx`)、音效播放器 (`hooks/useSoundEffects.ts`) 及鍵盤監聽器在組件卸載 (Unmount) 時是否確實被釋放，杜絕長期運行的記憶體與硬體解碼通道資源洩漏。

---

### 【執行與產出規範】
1. **無限制窮盡原則**：拒絕敷衍，不要對尋找的問題數量設限。必須依據 MCP 工具回傳的呼叫路徑層層追查。
2. **工具優先**：嚴禁直接使用傳統 grep 暴力掃描代碼庫。除非 MCP 工具無法覆蓋，否則必須優先使用 `search_graph` 與 `trace_path`。
3. **具體代碼修復**：對於發現的每一個問題，請給出精確的檔案路徑與行號，並提供「修改前」與「修改後」的具體程式碼對比（Diff 格式）。
4. **Vercel 配置實作**：直接優化專案根目錄的 `vercel.json`，配置上述 5 個安全標頭，並在修改前進行備份。
5. **驗證與建置**：完成任何代碼或配置修改後，必須執行 `npm run build` 或 `npx tsc --noEmit` 驗證，確保沒有造成編譯錯誤或打包失敗。
6. **最終報告產出**：將審計結果寫入 `docs/SECURITY_AND_ARCHITECTURE_AUDIT_REPORT_V2.md`，內容應結構化包含：問題描述、嚴重程度（Critical/High/Medium/Low）、影響範圍、重現路徑、具體修復方案、以及 Vercel 安全標頭配置的詳盡解析。

請開始執行此任務，在完全確保系統安全、穩定且所有功能正常運作前，請勿停止。
```
