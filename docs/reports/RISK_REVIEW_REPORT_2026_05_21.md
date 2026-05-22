# MindSpark 程式風險與競態審查報告

**日期：** 2026-05-21  
**審查範圍：** `services/cloudStorage.ts`, `services/cloudRepo.ts`, `services/storage.ts`, `hooks/useChunkedPractice.ts`, `hooks/useQuizEngine.ts`, `services/ai.ts`, `components/Settings.tsx`  
**方法：** 靜態程式碼審查（未執行自動化掃描或依賴漏洞掃描）

## 摘要
本次審查聚焦於競態條件、資料一致性與安全性風險。主要風險集中在「雲端同步非原子流程」與「多來源同時寫入本機草稿」兩大類，另包含 AI 金鑰儲存與配置健全性等安全性與穩定性問題。

---

## 1. 風險清單（含成因 / 原因 / 結果 / 影響）

### RISK-001：雲端題庫同步為非原子流程，易產生幽靈題目或錯誤刪除
- **位置：** `services/cloudStorage.ts` `saveCloudQuestions()`（約 L134-L193）
- **成因：** 同步流程為「先 upsert、後 delete」，兩步驟未包在交易中。
- **原因：** Supabase PostgREST API 無原生交易；若網路中斷、權限錯誤或超時，容易在中途失敗。
- **結果：**  
  1. Upsert 成功但 Cleanup 失敗 → 雲端殘留已刪除題目。  
  2. Cleanup 成功但 localQuestions/keepIds 異常為空 → 直接刪除整個 bank 的雲端題目。
- **影響：** 雲端與本地資料不一致，使用者重新載入時出現「幽靈題目」或題庫被清空。
- **建議：** 使用 Supabase RPC 封裝「upsert + cleanup」為單一交易；或改成 server-side diff/merge。

### RISK-002：同步完成後直接覆蓋本機清單，可能清掉雲端較新 session
- **位置：** `services/cloudStorage.ts` `syncLocalPracticeSessions()`（約 L423-L480）
- **成因：** 只將「本地較新」或「同步成功」的 session 放進 `updatedLocalSessions`，最後 `replaceAllPracticeSessions(updatedLocalSessions)`。
- **原因：** 對於「雲端較新」的 session，流程只是 `skipped++`，未把雲端版本寫回本機。
- **結果：** 本機舊 session 直接被移除，且沒有同步成雲端版本的本機快照。
- **影響：** 使用者在離線或雲端不可用時，可能突然失去可繼續的 session（資料表面消失）。
- **建議：** 將「雲端較新」的 session 寫回本機，或至少保留本機版本並打上 `stale` 標記。

### RISK-003：以 `updatedAt`（客戶端時間）作為 LWW 依據，易被時鐘偏移誤判
- **位置：** `services/cloudStorage.ts` `syncLocalPracticeSessions()`（約 L428-L471）
- **成因：** 比較 `localSession.updatedAt > cloudSession.updatedAt` 作為同步判斷。
- **原因：** `updatedAt` 來源為各裝置/分頁的本地時間，跨裝置時鐘偏移無法避免。
- **結果：** 可能把較舊資料當成「最新」上傳，覆蓋雲端正確進度。
- **影響：** 多裝置/多分頁使用者更容易遭遇進度回退或覆蓋。
- **建議：** 改用伺服器時間戳（DB trigger），或在本地增加版本號/遞增序列作為衝突判斷。

### RISK-004：Chunk 草稿多來源寫入，仍可能發生進度回流
- **位置：** `hooks/useChunkedPractice.ts` `updateChunkDraft()` / `beforeunload`（約 L394-L449），`services/storage.ts` `saveChunkDraft()`（約 L250-L252）
- **成因：** 同一份草稿會被「onChunkDraftUpdate」與「beforeunload」分別寫入 localStorage。
- **原因：** 僅在「incoming index=0」時阻擋回寫；缺乏基於 `updatedAt` 的完整版本比較。
- **結果：** 兩個來源的寫入順序若交錯，較舊的草稿仍可能覆蓋較新進度。
- **影響：** 練習進度在重新整理/關閉頁面後可能回退，造成學習中斷與信任下降。
- **建議：** 以 `updatedAt` 進行比較，或加入 version/nonce 機制避免舊寫入覆蓋新寫入。

### RISK-005：AI API Key 儲存於瀏覽器，XSS 或惡意擴充可直接取用
- **位置：** `services/ai.ts` `getAIConfig()` / `saveAIConfig()`（約 L60-L91），`components/Settings.tsx`（約 L300-L466）
- **成因：** 金鑰存放於 `localStorage` / `sessionStorage`。
- **原因：** 純前端架構缺乏後端代理，且瀏覽器儲存區一旦遭 XSS 即可讀取。
- **結果：** 金鑰可被竊取並濫用。
- **影響：** 使用者可能產生經濟損失或帳號被封鎖。
- **建議：** 提供後端 proxy 或短期 token；至少新增 CSP、防止第三方腳本注入。

### RISK-006：AI 設定 JSON 解析未防護，可能造成功能不可用
- **位置：** `services/ai.ts` `getAIConfig()`（約 L60-L75）
- **成因：** `JSON.parse` 未包 try/catch。
- **原因：** 若 storage 內資料被手動破壞、瀏覽器擴充改寫或版本升級導致格式變化，解析會直接拋例外。
- **結果：** AI 功能與設定頁面可能在執行時直接報錯中斷。
- **影響：** 使用者無法修復設定或使用 AI 功能，造成可用性問題。
- **建議：** 以 try/catch 包裝解析，出錯時回退為預設值並清理異常設定。

### RISK-007：本地到雲端同步採 Promise.all，單一失敗會中斷整批
- **位置：** `services/cloudStorage.ts` `syncLocalToCloud()`（約 L200-L212）
- **成因：** 全部 bank 同步以 `Promise.all` 併發，缺乏個別錯誤隔離。
- **原因：** 任一 bank 失敗會導致整批同步 reject。
- **結果：** 可能造成部分 bank 永遠未上雲、使用者誤以為同步完成。
- **影響：** 資料一致性下降，跨裝置體驗不穩定。
- **建議：** 改用 `Promise.allSettled`，並針對失敗的 bank 提示重試。

---

## 2. 結論
目前風險集中在「同步一致性」與「多來源寫入」；其中 `saveCloudQuestions` 的非原子流程與 `syncLocalPracticeSessions` 的本機覆蓋邏輯是最具破壞性的兩項。若要優先處理，建議先強化同步一致性（交易化或 RPC）與本機同步策略（雲端較新時回寫本機）。
