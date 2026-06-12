## 1. Critical: BOLA/IDOR 越權查詢修復 (cloudStorage.ts)

- [x] 1.1 在 `getCloudBanks()` (cloudStorage.ts:L37-70) 中加入 `user_id` 過濾
  - **目標**：在 Supabase `.select()` 之後加入 `.eq('user_id', user.id)`，且先呼叫 `supabase.auth.getUser()` 取得用戶身份
  - **邊界**：函數簽名不變；未登入時回傳 `[]`；不修改回傳的 `BankMetadata` 結構
  - **具體步驟**：
    1. 在函數開頭加入 `const { data: { user } } = await supabase.auth.getUser();`
    2. 加入 `if (!user) return [];`
    3. 在 `.select('*, questions(count)')` 之後加入 `.eq('user_id', user.id)`
  - **驗證**：`npx tsc --noEmit` 通過；`npm run build` 成功；手動確認查詢結構

- [x] 1.2 在 `deleteCloudBank()` (cloudStorage.ts:L94-101) 中加入 `user_id` 過濾
  - **目標**：刪除時先取得用戶身份，未登入時不執行刪除，查詢加入 `.eq('user_id', user.id)`
  - **邊界**：函數簽名不變；保留 `bankId` 過濾不變
  - **具體步驟**：
    1. 在函數開頭加入 `const { data: { user } } = await supabase.auth.getUser();`
    2. 加入 `if (!user) { console.warn('deleteCloudBank: not authenticated'); return; }`
    3. 在 `.eq('id', bankId)` 之後加入 `.eq('user_id', user.id)`
  - **驗證**：`npx tsc --noEmit` 通過

- [x] 1.3 撰寫 BOLA 修復的單元測試
  - **目標**：在 `src/__tests__/cloudStorage.test.ts`（新建或追加）中驗證 `getCloudBanks` 和 `deleteCloudBank` 在未登入時回傳正確的預設值
  - **邊界**：只測試前端邏輯，mock Supabase client
  - **驗證**：`npm test -- --run cloudStorage` 通過

## 2. Critical: 聯賽分數後端判定 (challenges.ts)

- [x] 2.1 在 `submitChallengeScore()` (challenges.ts:L107-179) 中改為強制 RPC 路徑
  - **目標**：呼叫 `supabase.rpc('submit_challenge_score', { p_challenge_id: challengeId, p_score: score })`，若失敗則拋出錯誤
  - **邊界**：完全移除前端勝負判定邏輯（不進行 client-side fallback），以防止繞過安全機制
  - **具體步驟**：
    1. 將 `submitChallengeScore` 改為純異步 RPC 呼叫
    2. 檢查 `supabase.rpc` 回傳的 `error`，若有 error 則 `throw new Error('[Challenge] Score submission failed: RPC unavailable');`
    3. 成功時回傳 `true`
  - **驗證**：`npx tsc --noEmit` 通過；單元測試驗證 RPC 呼叫失敗時拋出 Error

- [x] 2.2 提供 Supabase RPC SQL 腳本文件
  - **目標**：在 `docs/sql/` 目錄下建立 `submit_challenge_score.sql`，包含完整的 PostgreSQL 函數定義
  - **邊界**：SQL 函數接受 `p_challenge_id UUID, p_score INT`，驗證呼叫者身份，提交分數，並在雙方分數都有時自動判定 winner_id
  - **安全校驗**：
    1. 必須檢驗調用者身份 `auth.uid()`，確保其為該挑戰（challenge）的參與者（`user_id` 或 `friend_id`），否則 `RAISE EXCEPTION` 拒絕越權提交分數（IDOR 防禦）。
    2. 對 `p_score` 進行合理上限與範圍校驗（例如 `p_score >= 0` 且不超過合理分數上限，防止作弊者直接發送惡意高分）。
  - **驗證**：SQL 語法正確，並已包含這兩項安全驗證（可由 DBA 直接在 Supabase SQL Editor 中執行）

- [x] 2.3 提供後端 Supabase RLS 政策指引文檔
  - **目標**：在 `docs/sql/` 目錄下建立 `supabase_rls_policies.sql` 腳本，提供對應的雲端安全加固政策指引
  - **具體步驟**：
    1. 編寫 `banks` 資料表之 RLS Policy SQL（限定 `auth.uid() = user_id` 才能進行 SELECT, INSERT, UPDATE, DELETE）。
    2. 編寫 `friendships` 資料表之 RLS Policy SQL（限制用戶只能存取 `user_id = auth.uid() OR friend_id = auth.uid()` 的好友關係記錄）。
  - **驗證**：RLS SQL 語法正確，能被 Supabase 管理員用作 Phase 2 安全硬化政策基礎。

## 3. High: 好友請求邏輯修復 (socialService.ts)

- [x] 3.1 修復 `acceptFriendRequest()` (socialService.ts:L108-117) 的越權邏輯
  - **目標**：將 `.or(\`user_id.eq.${userId},friend_id.eq.${userId}\`)` 改為 `.eq('friend_id', userId)`
  - **邊界**：僅修改一行代碼；函數簽名和錯誤處理不變
  - **具體步驟**：
    1. 將第 114 行 `.or(\`user_id.eq.${userId},friend_id.eq.${userId}\`)` 替換為 `.eq('friend_id', userId)`
  - **驗證**：`npx tsc --noEmit` 通過

- [x] 3.2 撰寫好友請求邏輯的單元測試
  - **目標**：在 `src/__tests__/socialService.test.ts`（新建）中驗證 `acceptFriendRequest` 使用正確的 Supabase 查詢過濾
  - **邊界**：Mock Supabase client，驗證 `.eq('friend_id', userId)` 被呼叫
  - **驗證**：`npm test -- --run socialService` 通過

## 4. High: AI 結果 XSS 消毒 (ai.ts)

- [x] 4.1 在 `generateQuestionsFromPDF()` (ai.ts:L278-308) 的回傳值加入 DOMPurify 消毒
  - **目標**：對 `question`, `options`, `hint`, `explanation` 四個文字欄位呼叫 `DOMPurify.sanitize()`
  - **邊界**：不修改函數簽名；不影響 `askAI` 函數；`DOMPurify` 已在 `package.json` 中
  - **具體步驟**：
    1. 在檔案頂部加入 `import DOMPurify from 'dompurify';`
    2. 在 `parsed.map()` 內部（約 L291-307），修改為：
       - `question: DOMPurify.sanitize(typeof q.question === 'string' ? q.question : '')`
       - `options` 陣列中每個元素包裹 `DOMPurify.sanitize()`
       - `hint: typeof q.hint === 'string' ? DOMPurify.sanitize(q.hint) : undefined`
       - `explanation: typeof q.explanation === 'string' ? DOMPurify.sanitize(q.explanation) : undefined`
  - **驗證**：`npx tsc --noEmit` 通過；`npm run build` 成功

- [x] 4.2 撰寫 AI 消毒的單元測試
  - **目標**：在 `src/__tests__/ai.test.ts`（新建或追加）中驗證含有 `<script>` 標籤的 AI 回傳文字被正確消毒
  - **邊界**：測試 `cleanJsonResponse` 和消毒後的 mapping 邏輯
  - **驗證**：`npm test -- --run ai` 通過

## 5. High: API Key 加密混淆儲存 (ai.ts)

- [x] 5.1 建立加密工具模組 `utils/crypto.ts`
  - **目標**：實作 `encryptString(plaintext: string): Promise<EncryptedPayload>` 和 `decryptString(payload: EncryptedPayload): Promise<string>` 函數，使用 Web Crypto API AES-GCM
  - **邊界**：純工具函數，不依賴 React；密鑰從 localStorage 中的 persistent local salt 派派生；`EncryptedPayload` 型別為 `{ iv: string; ciphertext: string }`
  - **具體步驟**：
    1. 建立 `utils/crypto.ts` 檔案
    2. 實作 `getDeviceKey(): Promise<CryptoKey>` — 讀取 localStorage 中的 `mindspark_crypto_salt`。若不存在，則使用 `crypto.getRandomValues()` 產生一個隨機 hex 鹽值並存回 localStorage 確保密鑰持久穩定。
    3. 實作 `encryptString` — 生成隨機 IV，AES-GCM 加密，回傳 base64 編碼的 iv + ciphertext
    4. 實作 `decryptString` — 解碼 base64，使用相同 key 解密
    5. 匯出 `isEncryptedPayload(value: unknown): value is EncryptedPayload` 型別守衛
  - **驗證**：`npx tsc --noEmit` 通過；單元測試驗證加解密往返

- [x] 5.2 修改 `saveAIConfig()` (ai.ts:L114-124) 使用加密儲存
  - **目標**：`persist=true` 時，`apiKey` 欄位先加密再存入 localStorage
  - **邊界**：`persist=false` 時 sessionStorage 保持明文不變；加密是非同步的，函數需改為 `async`
  - **具體步驟**：
    1. 將 `saveAIConfig` 改為 `async`
    2. 調用 `encryptString(config.apiKey)` 取得 `EncryptedPayload`
    3. 存入 localStorage 的 config 物件中 apiKey 欄位替換為加密後的 payload 物件
  - **驗證**：`npx tsc --noEmit` 通過

- [x] 5.3 修改 `getAIConfig()` (ai.ts:L71-112) 支援解密讀取
  - **目標**：讀取 config 時，檢查 `apiKey` 是否為 `EncryptedPayload` 格式，若是則解密
  - **邊界**：如果 `apiKey` 為明文字串（舊版遷移），直接接受；解密失敗時僅清除配置（removeItem）並回傳 `null`，嚴禁使用 `localStorage.clear()` (R1-A-03)
  - **具體步驟**：
    1. 將 `getAIConfig` 改為 `async`
    2. 解析 JSON 後，檢查 `config.apiKey` 是否為 `EncryptedPayload`（使用 `isEncryptedPayload`）
    3. 若是加密格式，呼叫 `decryptString` 解密
    4. 若是明文字串，直接使用（向後相容）
    5. 解密失敗時，僅清除 AI 相關 localStorage 配置（呼叫 `localStorage.removeItem('mindspark_ai_config')`），不得清空其他資料
  - **驗證**：`npx tsc --noEmit` 通過；確認所有 `getAIConfig()` 呼叫方已 `await`

- [x] 5.4 更新所有 `getAIConfig()` 的呼叫方為 `async/await` 並在 React 中處理 loading 狀態
  - **目標**：搜尋所有呼叫 `getAIConfig()` 的位置，確保其以非同步處理。特別是 React 元件（如 `AIConfigPanel.tsx`），引進 `isLoading` state (R1-B-02)
  - **邊界**：不允許在 React 渲染階段同步讀取 Promise。載入完成前，元件必須顯示 Loading 狀態或 Skeleton 骨架屏以防白屏 (D11-001)
  - **具體步驟**：
    1. 將 `AIConfigPanel.tsx` 及其它呼叫 `getAIConfig` 的 React 元件改為在 `useEffect` 中呼叫 `getAIConfig()`
    2. 元件內部新增 `isLoading` state (預設為 `true`)，在 `getAIConfig` 解析完成後設為 `false`並寫入 state
    3. 在 `isLoading` 為 `true` 時，渲染 Skeleton 或 Spinner，防止調用未載入完成的 API config
  - **驗證**：`npx tsc --noEmit` 通過；`npm run build` 成功；手動確認 `AIConfigPanel` 載入時不發生白屏

- [x] 5.5 撰寫加密工具的單元測試
  - **目標**：在 `src/__tests__/crypto.test.ts`（新建）中測試加解密往返、無效 payload 處理
  - **驗證**：`npm test -- --run crypto` 通過

## 6. High: localStorage 防篡改簽名 (useBattleSystem + achievements)

- [x] 6.1 建立簽名工具 `utils/integrityCheck.ts`
  - **目標**：實作 `signData(data: string): Promise<string>` 和 `verifyData(data: string, signature: string): Promise<boolean>`，使用 Web Crypto API HMAC-SHA256
  - **邊界**：鹽值使用固定前綴 `'mindspark_integrity_v1'` + 應用版本。必須在檔案頂部加上安全性限制註解，標明「防君子不防小人」 (R1-B-04)
  - **具體步驟**：
    1. 建立 `utils/integrityCheck.ts`
    2. 在檔案頂部撰寫註解，說明 HMAC 僅作前端完整性防篡改校驗，防範普通用戶 F12 修改，不可用於防範有逆向 JS 能力的攻擊者，以提醒後續開發者其安全性限制 (R1-B-04)。
    3. 實作 `getSigningKey(): Promise<CryptoKey>` — 從固定鹽派生 HMAC key
    4. 實作 `signData` — 使用 HMAC-SHA256 簽名，回傳 hex 字串
    5. 實作 `verifyData` — 重新計算簽名並比對
  - **驗證**：`npx tsc --noEmit` 通過；單元測試驗證簽名驗證

- [x] 6.2 修改 `useBattleSystem` (useBattleSystem.ts:L63-84) 的讀寫加入簽名與非同步載入/競態防護
  - **目標**：
    - **狀態管理**：新增並導出 `isInitialized` state（初始為 `false`），供 UI (如 `App.tsx`) 判斷是否載入完成。載入前 UI 顯示 Skeleton，載入完成後才渲染主遊戲畫面，解決 React 同步初始化被破壞的問題 (D11-001)
    - **讀取時**（L63-71）：在掛載 `useEffect` 中非同步呼叫 `verifyData` 驗證簽名。驗證完畢後更新 state，最後設置 `isInitialized = true`。失敗或被竄改時回退至 `INITIAL_BATTLE_STATE`。
    - **寫入時**（L74-84）：寫入 battle state 後同時寫入簽名。為防止快速連續變更狀態導致非同步寫入順序混亂，實作一個輕量級 Promise 寫入隊列 (Promise Queue)，對 localStorage 寫入進行序列化排隊 (D4-001)
  - **邊界**：不影響原有的戰鬥數據結構與邏輯
  - **具體步驟**：
    1. `useState` 初始化改為 `INITIAL_BATTLE_STATE`
    2. 新增 `isInitialized` state 及其 export
    3. 新增 `useEffect` 在 mount 時非同步讀取、解密與驗證簽名，完畢後 `setBattleState` 並 `setIsInitialized(true)`
    4. 實作 Promise 序列化寫入隊列，在儲存 hook 中將簽名計算與寫入 localStorage 包裝進寫入隊列中排隊執行
  - **驗證**：`npx tsc --noEmit` 通過；`npm test` 通過

- [x] 6.3 修改 `achievements.ts` 與 `useAchievements` hook 以支援簽名與非同步狀態管理
  - **目標**：讀寫成就列表時使用 `signData`/`verifyData`，並對 `useAchievements` hook 進行異步生命週期管理改造，防止同步與非同步初始化衝突與型別錯誤 (R2-A-01)
  - **邊界**：簽名驗證失敗時回傳空陣列 `[]`；向後相容舊格式（無簽名）
  - **具體步驟**：
    1. 將 `getLocalAchievements` 改為異步函數，並在讀寫時使用 `signData` / `verifyData`。
    2. 修改 `hooks/useAchievements.ts`，引入 `isInitialized` 或 `isLoading` 狀態，在 `useEffect` 中非同步調用 `getLocalAchievements()` 加載資料。
    3. 確保載入期間展示 Skeleton 或 Loading 狀態，防止未載入完成前的 UI 異常。
  - **驗證**：`npx tsc --noEmit` 通過

- [x] 6.4 修改 `useBattleSystem` 加入 BattleState schema 驗證
  - **目標**：在 `localStorage` 反序列化後，驗證 `heroHp` <= 200, `streak` >= 0, 必要欄位存在
  - **邊界**：建立 `isBattleState(value: unknown): value is BattleState` 型別守衛函數
  - **具體步驟**：
    1. 在 `types/battleTypes.ts` 或 `utils/` 中建立型別守衛
    2. 在讀取邏輯中呼叫，不符時回退到 `INITIAL_BATTLE_STATE`
  - **驗證**：`npx tsc --noEmit` 通過

- [x] 6.5 撰寫簽名與驗證的單元測試
  - **目標**：在 `src/__tests__/integrityCheck.test.ts`（新建）中測試簽名產生、驗證通過、篡改偵測
  - **驗證**：`npm test -- --run integrityCheck` 通過

## 7. Medium: 答題雙擊防護 (QuizCard.tsx)

- [x] 7.1 在 `QuizCard` 的 `submitAnswer` (QuizCard.tsx:L189-229) 中加入 `useRef` 防重複提交與錯誤處理
  - **目標**：使用 `isSubmittingRef = useRef(false)` 作為同步鎖，並妥善重置鎖以防止網路/API 錯誤時 UI 死鎖 (D5-001)
  - **邊界**：不改變 `submitAnswer` 的外部行為和參數；鎖定後在 `question` 變化時重置
  - **具體步驟**：
    1. 在 component 頂部（約 L55 附近）加入 `const isSubmittingRef = useRef(false);`
    2. 在 `submitAnswer` 入口（L189）加入：`if (isSubmittingRef.current || isAnswered) return;`，接著 `isSubmittingRef.current = true;`
    3. 將提交邏輯（API/儲存操作）包裹在 `try...catch...finally` 區塊中。若提交出錯，在 `catch` 或整個非同步流程的 `finally` 中，將 `isSubmittingRef.current = false` 設回 `false`，允許用戶重試。
    4. 在 `question` 變化的 `useEffect`（L142-148）中加入 `isSubmittingRef.current = false;`
  - **驗證**：`npx tsc --noEmit` 通過；單元測試驗證提交拋錯時 `isSubmittingRef.current` 恢復為 `false`

## 8. Medium: setTimeout 清理 (useBattleSystem.ts)

- [x] 8.1 為 `triggerAnswer` 中的裸 setTimeout 加入 ref 追蹤
  - **目標**：新增 `spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` 追蹤 `setTimeout(spawnNewMonster, ...)` 和 `setTimeout(() => setDialogue(...), ...)` 等呼叫
  - **邊界**：不改變計時器的延遲時間或回調邏輯
  - **具體步驟**：
    1. 在 L120 附近（已有 `animationTimerRef`, `dialogueTimerRef`）新增 `const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);`
    2. 將 L501 的 `setTimeout(spawnNewMonster, 1500)` 改為 `spawnTimerRef.current = setTimeout(spawnNewMonster, 1500);`
    3. 將 L510 的 `setTimeout(() => setDialogue('monster', MONSTER_SHIELD_DIALOGUES), 500)` 改為使用 `dialogueTimerRef`（已有但未在此處使用）
    4. 將 L523-524 的 `setTimeout(() => { setAnimation(...) }, 1000)` 改為 `spawnTimerRef.current = setTimeout(..., 1000);`
    5. 將 L562 的 `setTimeout(startBattle, 2000)` 改為 `spawnTimerRef.current = setTimeout(startBattle, 2000);`
    6. 在 L124-129 的清理 `useEffect` 中加入 `if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);`
  - **驗證**：`npx tsc --noEmit` 通過；搜尋 `useBattleSystem.ts` 確認無裸露 `setTimeout` 呼叫（所有 setTimeout 都有 ref 追蹤）

## 9. Medium: AudioContext 洩漏修復 (FocusTimer.tsx)

- [x] 9.1 在 `playNotificationSound()` (FocusTimer.tsx:L49-71) 中加入 `audioContext.close()`
  - **目標**：在 `oscillator.stop()` 之後加入延遲 `audioContext.close()` 呼叫
  - **邊界**：不影響音效播放品質；不修改振盪器參數
  - **具體步驟**：
    1. 在 `oscillator.stop(audioContext.currentTime + 0.5);` 之後（L67 行之後）加入：
       ```typescript
       setTimeout(() => {
         if (audioContext.state !== 'closed') {
           audioContext.close().catch(() => { /* ignore close errors */ });
         }
       }, 600);
       ```
  - **驗證**：`npx tsc --noEmit` 通過

## 10. Medium: `any` 型別消除 (cloudStorage.ts + global.d.ts)

- [x] 10.1 建立 `types/global.d.ts` 宣告 Window 介面擴充
  - **目標**：消除 `cloudStorage.ts` 中 3 處 `(window as any)` 型別違規
  - **邊界**：不改變同步鎖的運行邏輯；只修改型別層
  - **具體步驟**：
    1. 建立 `types/global.d.ts`：
       ```typescript
       declare global {
         interface Window {
           __MINDSPARK_SYNC_LOCK__?: boolean;
         }
       }
       export {};
       ```
    2. 將 cloudStorage.ts L536 的 `(window as any).__MINDSPARK_SYNC_LOCK__` 改為 `window.__MINDSPARK_SYNC_LOCK__`
    3. 將 cloudStorage.ts L543 的 `(window as any).__MINDSPARK_SYNC_LOCK__ = true` 改為 `window.__MINDSPARK_SYNC_LOCK__ = true`
    4. 將 cloudStorage.ts L701 的 `(window as any).__MINDSPARK_SYNC_LOCK__ = false` 改為 `window.__MINDSPARK_SYNC_LOCK__ = false`
  - **驗證**：`npx tsc --noEmit` 通過；`grep -r "as any" services/cloudStorage.ts` 回傳空結果

## 11. Medium: Array 越界防護 (useBattleSystem.ts)

- [x] 11.1 修復 `getNextMonster` (useBattleSystem.ts:L224-225) 的空陣列風險
  - **目標**：在 `allMonsters[0]` fallback 之前加入空陣列檢查
  - **邊界**：不改變正常路徑的行為
  - **具體步驟**：
    1. 在 L224-225 附近，修改為：
       ```typescript
       const allMonsters = getMonstersByDifficulty(isBoss ? 'boss' : isElite ? 'elite' : 'normal');
       if (allMonsters.length === 0) {
         // Fallback: try normal difficulty
         const fallbackMonsters = getMonstersByDifficulty('normal');
         if (fallbackMonsters.length === 0) {
           throw new Error('[BattleSystem] No monsters available in any difficulty pool');
         }
         return { monster: fallbackMonsters[0], newPool: [], newSeen: seen };
       }
       const monster = allMonsters.find(m => m.id === nextId) || allMonsters[0];
       ```
  - **驗證**：`npx tsc --noEmit` 通過

## 12. Medium: NVIDIA baseUrl 修復 (ai.ts)

- [x] 12.1 修改 `resolveNvidiaBaseUrl()` (ai.ts:L133-144) 支援生產環境 proxy
  - **目標**：移除生產環境的 Error 拋出，改為回傳同源 proxy 路徑
  - **邊界**：不修改函數簽名和參數
  - **具體步驟**：
    1. 將 L133-144 的函數體替換為：
       ```typescript
       export const resolveNvidiaBaseUrl = (
         baseUrl: string | undefined,
         _isProd: boolean = import.meta.env.PROD,
         origin: string = window.location.origin
       ): string => {
         return baseUrl && baseUrl !== NVIDIA_DEFAULT_BASE_URL
           ? baseUrl
           : `${origin}/api/nvidia`;
       };
       ```
  - **驗證**：`npx tsc --noEmit` 通過；現有 `resolveNvidiaBaseUrl` 的測試（如有）通過

## 13. Medium: 成就時間重疊修正 (useAchievementTracker.ts)

- [x] 13.1 修正 `night_owl` 時間判定 (useAchievementTracker.ts:L31)
  - **目標**：將 `(hour >= 22 || hour < 6)` 改為 `(hour >= 22)`，使 `night_owl` 只在 22:00-23:59 觸發
  - **邊界**：`early_bird` 的 `hour < 6` 條件不變
  - **具體步驟**：
    1. 將 L31 的 `(hour >= 22 || hour < 6)` 改為 `hour >= 22`
  - **驗證**：`npx tsc --noEmit` 通過

- [x] 13.2 撰寫成就時間判定的單元測試
  - **目標**：在 `src/__tests__/useAchievementTracker.test.ts`（新建）中驗證凌晨 3 點只觸發 `early_bird`，晚上 23 點只觸發 `night_owl`
  - **驗證**：`npm test -- --run useAchievementTracker` 通過

## 14. Low: 廢棄檔案清理

- [x] 14.1 確認根目錄 `constants.ts` 未被任何檔案引用，然後刪除
  - **目標**：執行 `grep -r "from.*['\"].*constants['\"]" --include="*.ts" --include="*.tsx"` 確認無引用後刪除
  - **邊界**：只刪除根目錄的 `constants.ts`，不影響 `constants/` 目錄
  - **驗證**：`npm run build` 成功；`npx tsc --noEmit` 通過

## 15. 全局驗證與收尾

- [x] 15.1 執行全局 TypeScript 編譯檢查
  - **目標**：`npx tsc --noEmit` 零錯誤
  - **驗證**：命令退出碼為 0

- [x] 15.2 執行全部單元測試
  - **目標**：`npm test -- --run` 全部通過
  - **驗證**：所有測試綠色通過

- [x] 15.2.1 執行 Playwright E2E 安全壓測與故障注入驗證
  - **目標**：根據 `benchmark-harness.md` 規範，執行並通過自動化 E2E 壓測，確保防護機制正常運作 (R1-B-01)
  - **具體步驟**：
    1. 執行連點防護壓測：模擬對 `QuizCard` 選項 1 秒內進行 20 次連點，驗證僅有 1 次有效送出，且在 API 拋錯後能重試（驗證 D5-001 / R1-B-03）。
    2. 執行 RPC 攔截測試：網路阻斷 `/rpc/submit_challenge_score` 呼叫，驗證前端系統 fail-fast 拋出 Network Error 且完全沒有發送 fallback 的 UPDATE 請求（驗證 D6-001）。
    3. 執行狀態寫入競態測試：100ms 內對 `useBattleSystem` 觸發 5 次狀態變更，重整後能成功通過簽名驗證（驗證 D4-001 隊列序列化）。
  - **驗證**：Playwright 測試腳本順利通過且無任何錯誤

- [x] 15.3 執行生產構建
  - **目標**：`npm run build` 成功完成，無警告
  - **驗證**：`dist/` 目錄生成成功

- [x] 15.4 掃描代碼確認無 `any` 型別殘留
  - **目標**：`grep -rn "as any" services/ hooks/ components/ utils/` 回傳空結果
  - **驗證**：無任何 `(xxx as any)` 匹配

- [x] 15.5 更新 `docs/DEVELOPMENT_LOG.md` 記錄本次安全修復
  - **目標**：新增一個條目記錄本次安全審計修復的摘要、影響範圍和完成日期
  - **驗證**：檔案存在且內容正確
