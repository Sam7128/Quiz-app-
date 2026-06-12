## Context

MindSpark 是一個具有社交與遊戲化功能的學習應用，使用 React + Vite 前端搭配 Supabase 後端。兩份安全審計報告揭露了 13 個已確認的安全與穩定性問題。核心架構採用 Service Layer + Domain Hooks 模式，資料持久化分為 localStorage（Guest 模式）與 Supabase（已登入模式）。

**當前缺陷分佈**：
- 前端直接發送未經 `user_id` 過濾的 Supabase 查詢 → 水平越權
- 社交功能邏輯允許發起者自我核准好友請求 → 越權
- 聯賽分數的勝負判定在前端完成 → 可被篡改
- localStorage 明文存儲敏感資料且無完整性校驗 → 可被瀏覽器 F12 篡改
- 多處 setTimeout 未在組件卸載時清理 → 記憶體洩漏
- AI 回傳的文字未經 DOMPurify 消毒 → XSS 風險
- 代碼中有 `(window as any)` 違反型別鐵規

## Goals / Non-Goals

**Goals:**
- 修復所有 13 個已確認的安全與品質問題
- 確保修復後不引入新的功能回歸
- 所有修復均有對應的自動化驗證（單元測試或 TypeScript 編譯檢查）
- 代碼變更清晰可讀，方便初階開發者維護
- 向後相容現有用戶 localStorage 資料（Migration Support）

**Non-Goals:**
- 不重寫 Supabase RLS 政策（需後端管理員單獨操作，本次僅在前端加上防禦層並記錄 RLS 建議）
- 不遷移到 server-side session 或 token-based key 管理（超出純前端應用範圍）
- 不進行全面的效能最佳化（僅修復審計報告指出的特定效能問題）
- 不修改 Supabase database schema（僅使用現有的 RPC 或 trigger 機制）

## Decisions

### D1: BOLA/IDOR 修復策略 — 前端 + RLS 雙層防禦

**決策**：在前端 Supabase 查詢中強制加入 `.eq('user_id', user.id)` 過濾，同時在文檔中記錄後端 RLS 配置需求。

**替代方案考量**：
- (A) 僅靠 Supabase RLS → 前端仍可看到非本人資料的查詢結構，且 RLS 配置狀態無法在前端驗證
- (B) 僅前端過濾 → 攻擊者可繞過前端直接發送 HTTP 請求
- ✅ (C) 雙層防禦 → 即使 RLS 未配置，前端也有基本保護；RLS 配置後形成完整防線

**理由**：深度防禦原則。前端修復可立即生效，RLS 建議可由管理員後續配置。

### D2: 聯賽分數判定 — 使用 Supabase RPC

**決策**：創建一個 Supabase RPC 函數 `submit_challenge_score(challenge_id, score)` 來處理分數提交與勝負判定，前端不再計算 `winner_id`。為了防止安全繞過漏洞，聯賽提交強制依賴此 RPC，RPC 呼叫失敗時立即拋出錯誤並中斷，不再提供任何前端 fallback 判定。

**替代方案考量**：
- (A) Database Trigger → 觸發器在 UPDATE 時自動判定，但調試困難且不易測試
- ✅ (B) RPC → 明確的 API 端點，可在 SQL 中實作商業邏輯，易於測試和維護
- (C) Edge Function → 增加部署複雜度，對此簡單邏輯過度設計

**理由**：RPC 提供最直接的控制流，強制執行後端比對，完全杜絕前端篡改分數的可能性。

### D3: localStorage 資料完整性 — HMAC-SHA256 簽名

**決策**：使用 Web Crypto API 的 HMAC-SHA256 對關鍵 localStorage 資料（battle_state, achievements）進行簽名驗證。

**替代方案考量**：
- (A) 純 Schema 驗證 → 只能檢查格式，無法檢測數值被修改
- (B) crypto-js 套件 → 增加第三方依賴
- ✅ (C) Web Crypto API → 原生瀏覽器 API，零依賴，非同步不阻塞主線程
- (D) 不做任何防護 → Guest 模式下遊戲資料完全可被篡改

**理由**：Web Crypto API 是瀏覽器原生方案，不需要額外套件。簽名鹽通過組合應用版本 + 固定前綴生成。
**安全性限制說明**：此 HMAC 簽名主要是用作「防君子不防小人」的完整性校驗，防範普通用戶直接在 DevTools 竄改數值，但無法絕對阻止具有反譯 JS 代碼並重現簽名邏輯之能力的進階攻擊者。

### D4: API Key 混淆儲存 — AES-GCM 加密與本地隨機 Salt

**決策**：對 AI API Key 使用 Web Crypto API AES-GCM 進行客戶端加密存儲。為避免瀏覽器自動更新改變 User-Agent 導致 Key 無法解密，密鑰不再從設備指紋派生。改為在首次加密時，於 localStorage 生成一個隨機 salt（`mindspark_crypto_salt`）並分開持久化，基於此 Salt 派生 AES-GCM 密鑰。

**替代方案考量**：
- (A) 後端 proxy (Edge Function) → 最安全但增加基建複雜度，超出 Non-Goals
- ✅ (B) 客戶端加密與本地 Salt → 防止明文讀取，不增加服務端依賴，且在瀏覽器更新後仍保持密鑰穩定性
- (C) 不處理 → API Key 明文暴露在 localStorage

**理由**：雖然客戶端加密不是銀彈，但它阻止了惡意插件直接讀取明文 localStorage 的常見攻擊向量。使用本地 Salt 解決了 User-Agent 易變的問題。

### D5: 答題雙擊防護 — useRef 鎖定與錯誤處理重置

**決策**：在 `submitAnswer` 入口使用 `isSubmittingRef` (useRef) 作為同步鎖，在新題目到達時重置。同時，在 `submitAnswer` 的 `try/finally` 區塊中，確保不論成功或發生異常，均會解鎖 `isSubmittingRef`，避免網絡錯誤或 API Timeout 導致 UI 永久卡死。

**替代方案考量**：
- (A) 按鈕 disabled 屬性 → 依賴 React 的非同步 render，不夠即時
- ✅ (B) useRef 鎖 + try/finally 釋放 → 同步的 ref 值不受 React 批量更新影響，能可靠地阻止第二次點擊，且不會因網絡出錯卡死
- (C) debounce → 會引入延遲，不適合答題的即時反饋需求

**理由**：useRef 的值更新是同步的，不像 useState 會受到 React batch update 影響。加上 `try/finally` 的容錯處理，確保鎖的生命週期完整。

### D6: setTimeout 清理策略 — ref 追蹤 + 卸載清理

**決策**：`useBattleSystem` 中所有裸露的 `setTimeout` 改用已有的 ref 追蹤模式。注意到 L120-129 已有 `animationTimerRef` 和 `dialogueTimerRef` 及其清理 useEffect，但 `triggerAnswer` 內的 `setTimeout(spawnNewMonster, 1500)` 等4處呼叫未使用這些 ref。

**方案**：新增 `spawnTimerRef`，將 `triggerAnswer` 中的裸 setTimeout 統一使用 ref 追蹤，並在現有的清理 useEffect 中一併清理。

### D7: AudioContext 修復 — 使用後關閉

**決策**：在 `FocusTimer.tsx` 的 `playNotificationSound` 中，在振盪器停止後延遲 100ms 調用 `audioContext.close()`。

**理由**：瀏覽器限制每個頁面最多約 6 個活動 AudioContext。頻繁呼叫不釋放會導致後續音效播放失敗。

### D8: 向後相容 localStorage 遷移

**決策**：對於新增簽名驗證的資料格式，在讀取時實施「寬鬆讀取 + 嚴格寫入」策略：
- **讀取**：如果簽名不存在或驗證失敗，視為「舊格式」，仍然接受資料但標記為 dirty
- **寫入**：永遠加上簽名
- 這確保了現有用戶升級後不會遺失已有資料

### D9: React Hooks 非同步載入生命週期管理與寫入保護

**決策**：為了解決 WebCrypto API 異步讀取 localStorage 資料對 React 同步初始化造成的破壞，將 `getAIConfig` 與 `useBattleSystem` 改造為支援「異步載入狀態（isLoading / isInitialized）」模式。在 hook/組件掛載時，先將 state 初始化為安全預設值，再以 `useEffect` 觸發非同步讀取與驗證，載入期間暴露 loading state，UI 渲染 Skeleton 或 Loading spinner，防止白屏或提前交互。
**寫入保護機制**：在 `useBattleSystem` 的狀態變更與導出寫入函數中，必須加入 `if (!isInitialized) return;` 檢查，防止在加載完成前以預設初始值覆蓋了本地已有的真實舊存檔。

### D10: 寫入排隊機制 (Promise Queue) 與異常防禦

**決策**：為防止 WebCrypto HMAC 計算為異步時，快速連續變更 `battleState` 導致 localStorage 寫入順序混亂（資料與簽名不一致），實作一個輕量級 Promise 寫入隊列。所有非同步的 HMAC 簽名計算與 `setItem` 必須排隊執行，確保寫入順序與狀態變更順序完全一致。
**異常防禦**：寫入隊列中的 Promise 任務必須進行妥善的異常捕獲處理（如在 `try/catch` 內執行或附加 `.catch()` 錯誤捕獲）。不論當前寫入成功與否（即使遇到 localStorage 空間不足或 WebCrypto 拋錯），都必須正常釋放佇列鎖並 resolve，確保單次寫入失敗不會導致整個 session 內後續的存檔功能永久卡死。


## Risks / Trade-offs

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| Supabase RPC 未建立，聯賽修復無法完全生效 | 前端仍有比對邏輯暫時保留 | 實作 RPC 優先路徑 + fallback，並在 console.warn 提示 |
| API Key 混淆不等於加密安全 | 進階攻擊者仍可逆向 | 文檔明確標記為「混淆」非「加密」，長期建議遷移到後端 proxy |
| localStorage 簽名增加寫入開銷 | 每次寫入多一步 HMAC 計算 | Web Crypto API 在現代瀏覽器上極快（< 1ms），可忽略 |
| 修復 `resolveNvidiaBaseUrl` 改變生產環境行為 | 之前會拋出 Error 阻斷，修復後會嘗試 proxy | 確保 Vercel proxy 路由正確配置 |
| 答題 ref 鎖可能在邊界情況下卡死 | 用戶無法提交答案 | 在 question 變更的 useEffect 中重置 ref |
| 成就時間邊界修改影響用戶期望 | 凌晨 0-6 點不再同時觸發兩個成就 | 這是 bug 修復，非功能變更 |

## Migration Plan

1. **Phase 1（無 Supabase 變更）**：前端程式碼修復（D1, D3-D8），可直接部署
2. **Phase 2（需 Supabase 管理員）**：建立 RPC 函數 `submit_challenge_score`，配置 RLS 政策
3. **Rollback**：所有修復都是加性的，回滾只需 revert commit

## Open Questions

1. **Supabase RLS 是否已啟用？** — 如果 `banks` 表已有 RLS policy，D1 的前端修復是額外安全層；如果沒有，則是唯一防線。建議管理員確認。
2. **API Key 混淆的設備指紋策略是否足夠？** — 如果用戶更換瀏覽器或清除快取，加密的 key 會無法解密。需要考慮是否提供重新輸入 key 的 UX 流程。
