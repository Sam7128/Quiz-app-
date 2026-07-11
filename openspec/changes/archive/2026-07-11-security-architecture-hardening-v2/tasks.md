## 1. T1 — Vercel.json 安全標頭（N1 + X3）

- [x] 1.1 修改 `vercel.json`，新增 `headers` 區塊對路徑 `/(.*)` 注入 5 個伺服器端安全標頭
  - **目標**：5 個標頭（Content-Security-Policy / X-Frame-Options: DENY / X-Content-Type-Options: nosniff / Referrer-Policy: strict-origin-when-cross-origin / Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()）。CSP `connect-src` 必須完整包含 `'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.openai.com https://integrate.api.nvidia.com`（補 X3 漏掉 OpenAI）。CSP 採報告 §2.2 的範例字串但補 OpenAI。
  - **邊界**：保留既有 `rewrites` 區塊（`/api/nvidia/:path*` + `/(.*)` → `/index.html`）不動；不引入新 dependency
  - **具體步驟**：
    1. 讀取 `vercel.json`，在 `rewrites` 同層新增 `headers` 陣列
    2. 每個標頭以 `{ "key": "...", "value": "..." }` 結構
    3. CSP value 用單行字串（轉義引號用 `'self'` 而非 `\"self\"`）
  - **驗證**：`Get-Content vercel.json | Test-Json` 通過（JSON 合法）；`Select-String "api.openai.com" vercel.json` 出現 1 次

- [x] 1.2 修改 `index.html` 標註 CSP meta 為 dev fallback 並補 OpenAI
  - **目標**：在 `<meta http-equiv="Content-Security-Policy">` 上方加註釋「優先由 vercel.json 提供；此 meta 僅為 dev fallback」；將 meta CSP 的 `connect-src` 補上 `https://api.openai.com`
  - **邊界**：不刪 meta（d## 2. T2 — 跨分頁與同步併發鎖（N2 + D4-001）

- [x] 2.1 在 `services/cloudStorage.ts` 新增私有 `runWithSyncLock` 宣告式輔助函式
  - **目標**：以 `navigator.locks.request` 為主、timestamped localStorage（`mindspark_sync_lock_ts`，30s 過期）為 fallback，以 callback Promise 控制生命週期（防提前釋放）。
  - **邊界**：30s timeout 防死鎖；**禁止任何 `as any`**；型別不足處補 `types/global.d.ts`
  - **具體步驟**：
    1. 定義模組常數 `SYNC_LOCK_NAME = 'mindspark_practice_sync'`、`SYNC_LOCK_TIMEOUT_MS = 30_000`（30秒以緩解 D3-001）、`FALLBACK_LOCK_KEY = 'mindspark_sync_lock_ts'`
    2. `runWithSyncLock<T>(cb: () => Promise<T>): Promise<T>`：先檢查 `typeof navigator !== 'undefined' && navigator.locks?.request`。若支援，則以 `navigator.locks.request(SYNC_LOCK_NAME, { mode: 'exclusive', ifAvailable: true }, async (lock) => { ... })` 請求。若 `lock === null`，拋出 `Error('Sync lock held')`。在此 callback 中 `await cb()`，藉此將鎖鎖定在整個非同步同步期間（解決 D10-001）。若不支援，走 fallback：讀取 localStorage 內 timestamp，差距 < 30s 則拋出 `Error('Sync lock held')`；否則寫入當前 timestamp，執行 `await cb()`，並在 `finally` 區塊中，若 localStorage timestamp 仍與當前一致，則將其 `removeItem`。
  - **驗證**：`npx tsc --noEmit` 通過；`Select-String "as any" services/cloudStorage.ts` 返回空

- [x] 2.2 改寫 `syncLocalPracticeSessions` 引入 `runWithSyncLock`
  - **目標**：移除 `window.__MINDSPARK_SYNC_LOCK__` 讀寫；將其主要同步邏輯包裹在 `runWithSyncLock` 內
  - **邊界**：保留 `EMPTY_SYNC_RESULT` 行為、LWW 比對邏輯；保留 `isSyncingPracticeSessions` 模組旗標做同分頁快速阻擋
  - **具體步驟**：
    1. 移除 `window.__MINDSPARK_SYNC_LOCK__`。
    2. 在 `syncLocalPracticeSessions` 入口，同分頁 `isSyncingPracticeSessions` 快速防護後，將後續邏輯全部包在 `runWithSyncLock(async () => { ... })` 中執行。
    3. 若取得鎖失敗拋出 `Sync lock held`，捕獲後返回 `EMPTY_SYNC_RESULT`。
  - **驗證**：`Select-String "__MINDSPARK_SYNC_LOCK__" services/cloudStorage.ts` 僅剩 global.d.ts 或測試 stub。

- [x] 2.2a 改寫 `syncLocalToCloud` 引入 `runWithSyncLock`（解決 D4-001 BANKS_META 競態條件）
  - **目標**：使登入時的 bank 同步更新 `BANKS_META` 時獲得鎖保護
  - **具體步驟**：
    1. 在 `syncLocalToCloud` 的入口，將整段同步與 `BANKS_META` 的讀取/寫入邏輯包裹在 `runWithSyncLock(async () => { ... })` 中執行。
    2. 若取得鎖失敗，直接拋出或回傳錯誤以阻止 race。
  - **驗證**：`syncLocalToCloud` 入口包含 `runWithSyncLock` 呼叫。

- [x] 2.3 更新 `types/global.d.ts`
  - **目標**：移除 `__MINDSPARK_SYNC_LOCK__?: boolean` 宣告（已無引用者）；若 `NavigatorLocks` 在 lib.dom.d.ts 型別不完整則補 `NavigatorLocksManager` 介面宣告
  - **邊界**：不影響其他模組；若其他模組仍引用則保留（grep 確認）
  - **具體步驟**：
    1. `Select-String "__MINDSPARK_SYNC_LOCK__"` 在全專案 .ts/.tsx 確認僅剩 global.d.ts 與 spec/archive，可移除
    2. 補 `interface Navigator { locks?: NavigatorLocksManager }` 與 `NavigatorLocksManager` 介面（若 TypeScript 內建已完整則免）
  - **驗證**：`npx tsc --noEmit` 通過

- [x] 2.4 更新 `src/__tests__/practiceSessionStorage.test.ts` 加上 navigator.locks polyfill
  - **目標**：在 jsdom stub `navigator.locks.request`（取得名稱 + modeoption + callback，以 Promise 模擬執行）
  - **邊界**：**禁止修改既有斷言**；保留 L174-176 並發情境測試 pass
  - **具體步驟**：
    1. 在 `beforeEach` 內 stub `Object.defineProperty(navigator, 'locks', { value: { request: async (name, opts, cb) => { const release = () => {}; await cb(release); } }, configurable: true })`
    2. 在 `afterEach` 內還原（delete property 或 restore mock）
  - **驗證**：`npm test -- --run practiceSessionStorage` 全綠

- [x] 2.5 新增跨分頁與同步併發鎖拒絕測試
  - **目標**：mock `navigator.locks.request` 回傳 `null` 給 callback（模擬 lock 被佔用），驗證第二次呼叫 `syncLocalPracticeSessions` 應回 `EMPTY_SYNC_RESULT`。同時新增並發整合測試，使用 `Promise.all` 同時發起多個 `syncLocalToCloud` 與 `syncLocalPracticeSessions` 請求，驗證排他互斥與執行後鎖的正確釋放（解決 R2-B-4）。
  - **邊界**：新測試獨立 `it` 區塊；不修改既有測試
  - **驗證**：新斷言與並發互斥驗證 pass

- [x] 2.6 驗證
  - **執行**：`npm test -- --run practiceSessionStorage cloudStorage` + `npx tsc --noEmit`
  - **驗證**：全綠 + 0 type errors + 0 `as any` 新增

## 3. T3 — 統一 saveChunkDraftSafely（N3）

- [x] 3.1 在 `hooks/useChunkedPractice.ts` 抽出 `saveChunkDraftSafely` useCallback
  - **目標**：將 L398-420 的防退步邏輯搬成獨立 `useCallback`，簽名 `(sessionId: string, chunkIndex: number, progress: ChunkRuntimeProgress) => void`
  - **邊界**：函式本體不改邏輯，只搬位置；依賴陣列為 `[]`（不依賴 currentChunkMeta，由呼叫者傳入）
  - **具體步驟**：
    1. 在 `updateChunkDraft` 之前定義 `saveChunkDraftSafely = useCallback((sessionId, chunkIndex, progress) => { ... })`，含 `getChunkDraft` + 防退步檢查 + `saveChunkDraft`
    2. console.warn 訊息保留
  - **驗證**：`Select-String "saveChunkDraftSafely" hooks/useChunkedPractice.ts` 出現 >= 2 次（定義 + 呼叫）

- [x] 3.2 改寫 `updateChunkDraft` 與 `beforeunload` effect 共用 `saveChunkDraftSafely`
  - **目標**：`updateChunkDraft` 只剩 `latestProgressRef.current = progress` + guard + `saveChunkDraftSafely(...)`；`beforeunload` effect 只剩 `saveChunkDraftSafely(...)` 一行
  - **邊界**：行為與原版等價；`useCallback` 依賴項正確（`updateChunkDraft` 依賴 `[currentChunkMeta, saveChunkDraftSafely]`；effect 依賴 `[currentChunkMeta, saveChunkDraftSafely]`）
  - **具體步驟**：
    1. `updateChunkDraft` body 改為：`latestProgressRef.current = progress; if (!currentChunkMeta) return; saveChunkDraftSafely(currentChunkMeta.sessionId, currentChunkMeta.chunkIndex, progress);`
    2. `beforeunload` effect `onBeforeUnload` 改為：`if (!currentChunkMeta || !latestProgressRef.current) return; saveChunkDraftSafely(currentChunkMeta.sessionId, currentChunkMeta.chunkIndex, latestProgressRef.current);`
  - **驗證**：`Select-String "currentQuestionIndex > progress" hooks/useChunkedPractice.ts` 返回空（防退步邏輯只剩 1 份在 saveChunkDraftSafely 內）

- [x] 3.3 新增 `beforeunload` 防退步測試於 `src/__tests__/useChunkedPractice.draft.test.ts`
  - **目標**：4 步情境：(1) `saveChunkDraft` 一份 `currentQuestionIndex=5` 草稿；(2) `startChunk` 重置 latestProgressRef；(3) `window.dispatchEvent(new Event('beforeunload'))`；(4) 斷言 `getChunkDraft` 仍為 5
  - **邊界**：不修改既有測試；新測試獨立 `it` 區塊
  - **具體步驟**：
    1. 在既有 describe 內新增 `it('preserves existing draft when beforeunload fires with null latestProgressRef', ...)`
    2. 設置：`saveChunkDraft({...currentQuestionIndex: 5...})`；`await startChunk(sessionId, 0)`；`act(() => { window.dispatchEvent(new Event('beforeunload')); })`
    3. 斷言：`expect(getChunkDraft(sessionId, 0)?.currentQuestionIndex).toBe(5)`
  - **驗證**：新測試 pass

- [x] 3.4 驗證既有測試不退步
  - **執行**：`npm test -- --run useChunkedPractice useQuizEngine.chunked`
  - **驗證**：全綠（含既有 286 行 draft 測試 + useQuizEngine.chunked 所有 case）

## 4. T4 — refreshBanksData 安全合併（N4 — Critical）

- [x] 4.1 在 `types.ts` 的 `BankMetadata` 介面新增 `cloudSyncedAt?: number`
  - **目標**：optional number 欄位；值為上次成功同步至雲端的 Unix ms timestamp
  - **邊界**：optional，向後相容；不改既有欄位語意
  - **驗證**：`npx tsc --noEmit` 通過

- [x] 4.2 確認 `saveBanksMeta` / `getBanksMeta`（`services/storage.ts:486,512`）保留新欄位
  - **目標**：透過 `JSON.stringify` / `JSON.parse` 自然保存，不需特殊處理
  - **邊界**：無需修改 logic，只手動核對
  - **具體步驟**：讀 storage.ts 確認 saveBanksMeta 用 `JSON.stringify`、getBanksMeta 用 `JSON.parse`
  - **驗證**：手動核對無欄位白名單遺漏

- [x] 4.3 改寫 `syncLocalToCloud`（cloudStorage.ts:326-374）回寫 `cloudSyncedAt`
  - **目標**：每個 bank 成功完成 createCloudBank + saveCloudQuestions 後，在本地 `BANKS_META` 的對應 entry 寫入 `cloudSyncedAt = Date.now()`；失敗者不寫
  - **邊界**：返回 `{ successIds, failed }` shape 不變；回寫發生在 `Promise.allSettled` 解析後、聚合結果前。
  - **具體步驟**：
    1. 在 `results.forEach((r, idx) => {...})` 内，`r.status === 'fulfilled'` 分支前先讀取 `BANKS_META`，更新對應 bank entry 的 `cloudSyncedAt = Date.now()`，寫回。（注意：移除舊有的「成功全部時直接 removeItem」與「覆蓋為 failedMeta」行為，改為始終保留更新後的 BANKS_META，以配合 D2 意圖）
    2. 確保失敗 entry 的 `cloudSyncedAt` 仍為 undefined
  - **驗證**：`npx tsc --noEmit` 通過

- [x] 4.4 改寫 `refreshBanksData`（hooks/useBankManager.ts:44-75）
  - **目標**：以 `unsyncedLocalMeta = localMeta.filter(b => !b.cloudSyncedAt)` 取代 `if (localMeta.length > 0 && latest.length === 0)`；不採報告 ID 比對寫法
  - **邊界**：保留既有失敗分支的 toast 訊息、保留 `getBankFolderMap` / `getFolders` 後續邏輯
  - **具體步驟**：
    1. 移除 `if (localMeta.length > 0 && latest.length === 0)`
    2. 新增 `const unsyncedLocalMeta = localMeta.filter(b => !b.cloudSyncedAt);`
    3. `if (unsyncedLocalMeta.length > 0)`：依 `latest.length === 0` 分支訊息字串
    4. confirmDialog 後 `repository.syncLocalToCloud(unsyncedLocalMeta)`
    5. 同步後 `latest = await repository.getBanks()`
    6. 失敗處理：不論成功或部分失敗，**絕不**呼叫 `localStorage.removeItem(STORAGE_KEYS.BANKS_META)`，也不以失敗清單覆蓋（因為 `syncLocalToCloud` 已負責更新 timestamp 並保留所有 entries）。僅依照 syncResult 顯示對應的 toast 訊息。
  - **驗證**：`Select-String "latest.length === 0" hooks/useBankManager.ts` 僅出現在訊息分支而非排他條件

- [x] 4.5 新建 `src/__tests__/useBankManager.test.ts`
  - **目標**：4 個情境：(1) 雲空+本地未同步 → confirm 觸發 → syncLocalToCloud(unsyncedOnly) → BANKS_META **保留並含有 cloudSyncedAt**；(2) 雲有+本地未同步 → 訊息顯示數量 → syncLocalToCloud(unsyncedOnly) → **BANKS_META 保留並含有 cloudSyncedAt**；(3) 本地全已同步 → 不觸發 confirm；(4) syncLocalToCloud 全失敗 → BANKS_META 不變 + toast.error
  - **邊界**：mock repository / confirmDialog / toast；用 vi.fn(predictable return)；**不得** mock syncLocalToCloud 真實邏輯
  - **具體步驟**：
    1. 建立 mock repository：`getBanks: vi.fn(async () => [])`、`syncLocalToCloud: vi.fn(async (banks) => ({ successIds: banks.map(b=>b.id), failed: [] }))`
    2. `useBankManager` 需要 `dispatch` mock（`vi.fn()`）
    3. 為每情境設計 `localStorage.setItem(STORAGE_KEYS.BANKS_META, JSON.stringify([...]))` 預置本地題庫
    4. 使用 `renderHook` + `act(async () => await result.current.refreshBanksData())`
    5. 斷言 `confirmDialog` 被呼叫 / 不被呼叫；`repository.syncLocalToCloud` 被呼叫的 bank 清單正確；`localStorage.getItem(STORAGE_KEYS.BANKS_META)` 結果
  - **驗證**：4 個 case 全綠

- [x] 4.6 確認既有 stub 不需修改
  - **目標**：`useQuizEngine.chunked.test.ts:15`、`useChunkedPractice.test.ts:27`、`useChunkedPractice.draft.test.ts:30` 的 `repository.syncLocalToCloud = async () => ({ successIds: [], failed: [] })` stub 不需改；`useAppDataLoader.stale.test.tsx:37` 的 `refreshBanksData` mock 不需改
  - **驗證**：`npm test -- --run useQuizEngine.chunked useChunkedPractice useAppDataLoader` 全綠

- [x] 4.7 驗證
  - **執行**：`npm test -- --run useBankManager useChunkedPractice useAppDataLoader` + `npx tsc --noEmit`
  - **驗證**：全綠 + 0 type errors
  - **資料安全**：執行前先備份 `localStorage.getItem('mindspark_banks_meta')` 寫到外部檔（dev 環境不會跑，但保險措施）

## 5. T5 — FocusTimer AudioContext 生命週期（N5）

- [x] 5.1 在 `components/FocusTimer.tsx` 新增 `activeAudioContextsRef`
  - **目標**：`const activeAudioContextsRef = useRef<AudioContext[]>([])`；`playNotificationSound` 內 `new AudioContextClass()` 後 push 進 ref；timeout close 成功後 filter 移除
  - **邊界**：保留既有 `audioTimersRef` 不動；**禁止 `as any`**
  - **具體步驟**：
    1. 新增 `const activeAudioContextsRef = useRef<AudioContext[]>([]);` 與 audioTimersRef 同層
    2. `playNotificationSound` 內 `const audioContext = new AudioContextClass();` 後立即 `activeAudioContextsRef.current.push(audioContext);`
    3. `setTimeout` 的 close 成功 branch 內追加 `activeAudioContextsRef.current = activeAudioContextsRef.current.filter(ctx => ctx !== audioContext);`
  - **驗證**：`Select-String "activeAudioContextsRef" components/FocusTimer.tsx` 出現 >= 3 次

- [x] 5.2 修改 cleanup effect 強制 close 全部 AudioContext
  - **目標**：cleanup 內遍歷 `activeAudioContextsRef.current`，對 `ctx.state !== 'closed'` 呼叫 `ctx.close()`，try-catch 個別呼叫
  - **邊界**：close 失敗只記 console.error 不拋；保留既有 `audioTimersRef.current.forEach(clearTimeout)` 在前
  - **具體步驟**：
    1. cleanup 函式續接在 `audioTimersRef.current.forEach(clearTimeout)` 之後
    2. `activeAudioContextsRef.current.forEach(ctx => { try { if (ctx.state !== 'closed') ctx.close(); } catch (err) { console.error('[FocusTimer] Unmount closing AudioContext failed:', err); } });`
  - **驗證**：cleanup 內含 `state !== 'closed'` 條件

- [x] 5.3 新建 `src/__tests__/focusTimer.audio.test.tsx`
  - **目標**：2 個情境：(1) playNotificationSound 後立即 unmount → mock AudioContext.close 被呼叫；(2) playNotificationSound 後等 600ms + unmount → close 只被呼叫一次（不重複）
  - **邊界**：mock `window.AudioContext` 為假 class 追蹤 close 呼叫計數；用 `@testing-library/react` 的 `render` / `unmount`
  - **具體步驟**：
    1. beforeEach 內替換 `window.AudioContext = class { state = 'running'; close = vi.fn(async () => { this.state = 'closed'; }); createOscillator() {...} createGain() {...} get currentTime() { return 0; } get destination() { return {}; } }`
    2. 測試 1：render FocusTimer；驅動內部 `timeLeft=0` 觸發 `playNotificationSound`（透過 mock 或 expose）；unmount；`expect(closeMock).toHaveBeenCalled()`
    3. 測試 2：render；觸發 playNotificationSound；`await vi.advanceTimersByTimeAsync(600)`；unmount；`expect(closeMock).toHaveBeenCalledTimes(1)`
  - **驗證**：2 個 case 全綠

## 6. T6 — useKeyboardShortcuts ref 模式（N6）

- [x] 6.1 改寫 `hooks/useKeyboardShortcuts.ts`
  - **目標**：`handlersRef = useRef({onSelectOption,onSubmitOrNext,onToggleHint,onExit})`；每次渲染透過獨立 useEffect 更新 ref；監聽器 useEffect 依賴 `[]` 只綁定一次，回調透過 `handlersRef.current.xxx()` 呼叫
  - **邊界**：**禁止改變 isEditableTarget 防護邏輯**；外部呼叫介面不變；**禁止 `as any`**
  - **具體步驟**：
    1. 新增 `const handlersRef = useRef({ onSelectOption, onSubmitOrNext, onToggleHint, onExit });`
    2. 新增 `useEffect(() => { handlersRef.current = { onSelectOption, onSubmitOrNext, onToggleHint, onExit }; });`（無依賴陣列，每次渲染後執行）
    3. 監聽器 useEffect 依賴改為 `[]`；handleKeyDown 內以 `handlersRef.current.onSelectOption(index)` 等取代直接呼叫
    4. isEditableTarget 防護邏輯保留原狀
  - **驗證**：`Select-String "useEffect" hooks/useKeyboardShortcuts.ts` 出現 2 次；`Select-String "handlersRef.current" hooks/useKeyboardShortcuts.ts` 出現 >= 4 次；`Select-String "onSelectOption\(index\)" hooks/useKeyboardShortcuts.ts` 僅出現在 ref 內

- [x] 6.2 確認 `components/QuizCard.tsx:155-178` 呼叫介面不變
  - **目標**：QuizCard 對 `useKeyboardShortcuts({ onSelectOption, onSubmitOrNext, onToggleHint, onExit })` 的呼叫不需修改
  - **驗證**：`git diff components/QuizCard.tsx` 為空（或純空白差異）

- [x] 6.3 新建 `src/__tests__/useKeyboardShortcuts.test.tsx`
  - **目標**：4 個情境：(1) 按 `1` → `onSelectOption(0)` 被呼叫；(2) 按 `Enter` → `onSubmitOrNext` 被呼叫；(3) 焦點在 `<input>` 上按 `1` → callback 不被呼叫；(4) re-render 提供新 callback 參考 → window.addEventListener 不被再次呼叫（spy 計數）
  - **邊界**：用 `renderHook` + 真實 `KeyboardEvent` 派發；**不 mock addEventListener**；spy `window.addEventListener` 計數
  - **具體步驟**：
    1. 測試 1：renderHook 提供 vi.fn callbacks；`act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' })))`；`expect(onSelectOption).toHaveBeenCalledWith(0)`
    2. 測試 3：render `<input>` 並 `document.body.appendChild(input); input.focus();`；派發 `keydown` key=1；斷言 callback 不被呼叫（isEditableTarget 防護生效）
    3. 測試 4：spy `window.addEventListener`；renderHook initial；rerender 提供新 callback 參考；`expect(spy).toHaveBeenCalledTimes(1)`（mount 時一次，rerender 不應再綁）
  - **驗證**：4 個 case 全綠

## 7. T7 — Howler 生命週期與死導出清理（X1 + §5.3）

- [x] 7.1 確認並移除死導出 `playCorrectSfx` / `playWrongSfx`
  - **目標**：先 grep 全專案確認零呼叫者，才可移除
  - **邊界**：若 grep 發現呼叫者，**停止此任務**並改為接線（不可直接移除）
  - **具體步驟**：
    1. `Select-String "playCorrectSfx|playWrongSfx" -Path components,hooks,contexts,App.tsx,services -Include *.ts,*.tsx` 確認只在 `useSoundEffects.ts` 出現
    2. 移除 `UseSoundEffectsReturn` 介面中 `playCorrectSfx` / `playWrongSfx` 兩個欄位
    3. 移除 hook 內對應 `useCallback` 與回傳物件中的兩個鍵
  - **驗證**：`Select-String "playCorrectSfx|playWrongSfx" hooks/useSoundEffects.ts` 返回空；`npx tsc --noEmit` 通過

- [x] 7.2 在 `useSoundEffects` 新增 `unloadSfx()` 並在 BattleArena cleanup 呼叫
  - **目標**：公開 `unloadSfx: () => void`，內部呼叫 `sfxAttackInstance?.unload(); sfxAttackInstance = null;`（不動 bgmInstance）
  - **邊界**：加進 `UseSoundEffectsReturn` 介面
  - **具體步驟**：
    1. `useSoundEffects.ts` 新增 `const unloadSfx = useCallback(() => { if (sfxAttackInstance) { sfxAttackInstance.unload(); sfxAttackInstance = null; } }, []);`
    2. 回傳物件加入 `unloadSfx`
    3. `components/BattleArena.tsx` 既有 cleanup effect（L254 `return () => stopBgm()`）改為 `return () => { stopBgm(); unloadSfx(); };`
    4. 在 BattleArena 解構 `useSoundEffects()` 加入 `unloadSfx`
  - **驗證**：cleanup 內含 `unloadSfx()` 呼叫

- [x] 7.3 新建 `src/__tests__/useSoundEffects.test.ts`
  - **目標**：3 個情境：(1) initSounds 後 `sfxAttackInstance` 不為 null（jsdom mock `howler`）；(2) `playAttackSfx` 被呼叫 → Howl.play 被呼叫；(3) `unloadSfx()` 後 sfxAttackInstance 為 null，下次 `initSounds` 會重建
  - **邊界**：mock `howler` 的 `Howl` class 為 vi.fn 假實例追蹤 play / unload 呼叫
  - **具體步驟**：
    1. `vi.mock('howler', () => ({ Howl: vi.fn().mockImplementation(() => ({ play: vi.fn(), stop: vi.fn(), playing: vi.fn(() => false), unload: vi.fn() })) }))`
    2. `renderHook(() => useSoundEffects())` mount 觸發 `initSounds()`；`expect(Howl).toHaveBeenCalled()`
    3. `act(() => result.current.playAttackSfx())`；`expect(mockPlay).toHaveBeenCalled()`
    4. `act(() => result.current.unloadSfx())`；下次 mount 重新 render 應再次建 Howl
  - **驗證**：3 個 case 全綠

## 8. T8 — dirty-bank 預寫 + removeDirtyBank（N7）

- [x] 8.1 修改 `saveCloudQuestions`（cloudStorage.ts:234-321）為「upsert 前預寫」
  - **目標**：upsert 之前 `addDirtyBank(bankId)`；upsert+cleanup 全成功後 `removeDirtyBank(bankId)`
  - **邊界**：`addDirtyBank` 必須 idempotent（已存在則 no-op）；既有失敗路徑的 `addDirtyBank` 保留
  - **具體步驟**：
    1. 函式開頭（normalize 之後、upsert 之前）追加 `addDirtyBank(bankId);`
    2. `keepIds.length === 0 + forceDeleteAll` 分支：delete 成功後呼叫 `removeDirtyBank(bankId);` 再 return
    3. 正常 cleanup 完成後（所有 batch delete 成功）呼叫 `removeDirtyBank(bankId);` 後 return
    4. 既有失敗分支（fetchError / deleteError）保留 `addDirtyBank`（其實 add 已在開頭做过了，這裡可改為 `// dirty already pre-written` 或保留 idempotent）
  - **驗證**：`Select-String "addDirtyBank\(bankId\)" services/cloudStorage.ts` 至少在 upsert 之前出現 1 次；`Select-String "removeDirtyBank" services/cloudStorage.ts` 至少 2 次

- [x] 8.2 新增 `removeDirtyBank` 私有 helper
  - **目標**：與 `addDirtyBank` 對稱；從 `mindspark_dirty_banks` 移除指定 bankId；不存在則 no-op
  - **邊界**：try-catch 包裹 localStorage；不拋
  - **具體步驟**：在 `addDirtyBank`（L148）旁新增對稱 helper
  - **驗證**：`npx tsc --noEmit` 通過

- [x] 8.3 接線 `retryCleanupDirtyBanks` 至 `saveCloudQuestions` 結尾
  - **目標**：dirty-bank 重試在 `syncLocalToCloud` 開頭已有呼叫（L328，保留）；確認 `retryDirtyPracticeSessions`（L717-720）為死代碼，本次標記 `// TODO: remove in v3 — dead code` 但不刪除
  - **邊界**：不擴大範圍
  - **驗證**：grep 確認 `retryCleanupDirtyBanks` 同時從 `syncLocalToCloud:328` 呼叫（保留）；`retryDirtyPracticeSessions` 僅內部呼叫

- [x] 8.4 更新 `src/__tests__/cloudStorage.test.ts` 與 `syncLocalToCloud.test.ts`
  - **目標**：(1) 新增情境：`saveCloudQuestions` 成功後 `mindspark_dirty_banks` 不應包含該 bankId；(2) upsert 失敗時 dirty list 應保留該 bankId；(3) 既有 L202/235 失敗情境測試仍 pass
  - **邊界**：既有斷言不刪，只補新斷言
  - **具體步驟**：
    1. 在 cloudStorage.test.ts 既有成功情境的 it 區塊內追加 `expect(JSON.parse(localStorage.getItem('mindspark_dirty_banks') || '[]')).not.toContain('bank-success');`
    2. 新增 `it('marks bank dirty before upsert then clears on success', ...)`
  - **驗證**：`npm test -- --run cloudStorage syncLocalToCloud` 全綠

- [x] 8.5 驗證
  - **執行**：`npm test -- --run cloudStorage syncLocalToCloud practiceSessionStorage` + `npx tsc --noEmit`
  - **驗證**：全綠 + 0 type errors

## 9. T9 — 限制與邊界文件（N1 + D6-001 緩解）

- [x] 9.1 [DELETE] 本次變更依據 YAGNI 原則與資深工程師 (ponytail) 建議，徹底剔除 PostgreSQL RPC `sync_bank_questions.sql` 的新建任務，以防止引入無人使用的資料庫端擴充接口。

- [x] 9.2 新建 `docs/SECURITY_LIMITATIONS.md`
  - **目標**：明文記錄 3 個設計邊界與 Fallback 鎖超時風險，引導自訂 API 代理用戶安全配置。
  - **章節**：
    1. **API Key 前端加密的 XSS 邊界**：crypto.ts 防不了同網域 XSS；CSP 是主防禦；未來後端 Proxy 才能根治。
    2. **Supabase 題庫同步的極限中斷風險**：dirty-bank 預寫將殘餘風險降到 < 1ms。
    3. **跨分頁 sync 鎖的瀏覽器支援與超時風險**：`navigator.locks` 為主（以宣告式回調保證鎖釋放），不加自訂 timeout 以防與原生的 Promise timeout 重疊；IE / 舊 Safari 走 30s timeout fallback，若單次同步執行超過 30 秒，fallback 鎖會被搶佔（已作為 known limitation 記錄於此，解決 R2-A-2 & R2-B-2）。
    4. **CSP connect-src 限制與自訂端點指引**：說明因為靜態 CSP 的安全需求限制了 `connect-src` 的白名單域。當用戶需要配置自訂 AI Proxy 時，需在 Vercel 部署前手動修改 `vercel.json` 並將其 Proxy 域名加入 `connect-src` 中。
  - **驗證**：`Select-String "XSS|Proxy|navigator.locks" docs/SECURITY_LIMITATIONS.md` 均出現

- [x] 9.3 修改 index.html 與設定頁面元件（解決 R2-A-1）
  - **目標**：在 index.html CSP meta 上方加註，並在 `components/Settings.tsx` 的 API 金鑰輸入框旁新增警示提示，說明自訂 AI Proxy 的 CSP 限制與手動部署指引，並提供指向 `docs/SECURITY_LIMITATIONS.md` 的引導連結。
  - **邊界**：僅為 UI 註記與引導，不影響原有金鑰儲存與同步邏輯。
  - **驗證**：手動確認 Settings.tsx 中出現該警示與 limitations 檔案連結；`npm run build` 成功。

## 100. 全域驗證 + 文件 + 記憶更新

- [x] 100.1 全套測試
  - **執行**：`npm test -- --run`
  - **驗證**：全綠（不允許任何 skip / xdescribe）；與 baseline 比較不應有新 fail

- [x] 100.2 型別 + build
  - **執行**：`npx tsc --noEmit` + `npm run build`
  - **驗證**：0 type errors；build 成功產出 `dist/`

- [x] 100.3 Lint
  - **執行**：`npm run lint`（若 package.json 提供）
  - **驗證**：0 errors；若無 lint 指令則跳過並於 DEVELOPMENT_LOG 註明

- [x] 100.4 E2E（port 5200）
  - **執行**：`npm run preview`（背景）+ `npx playwright test`
  - **驗證**：`e2e/sync-and-settings-hardening.spec.ts` 與 `e2e/mindspark.spec.ts` 全綠

- [x] 100.5 `any` 型別稽核
  - **執行**：`Select-String -Path hooks/,services/,components/ -Include *.ts,*.tsx -Pattern ":\s*any\b|<any>|as any"`
  - **驗證**：除受控的 `unknown` + type guard 外 0 件 `any`；若有殘留記錄於 DEVELOPMENT_LOG 並列 tech debt

- [x] 100.6 死導出最後確認
  - **執行**：`Select-String "playCorrectSfx|playWrongSfx" -Path hooks/,components/,contexts/,services/ -Include *.ts,*.tsx`
  - **驗證**：返回空（T7.1 已移除）

- [x] 100.7 更新 `docs/DEVELOPMENT_LOG.md`
  - **目標**：記錄本次變更（遵循 AGENTS.md 鐵規 10）；列出每個 Phase 的結果
  - **邊界**：日期為今日；列出 8 個 N+X 項修補狀態
  - **驗證**：檔案含本次變更段，含完成日期

- [x] 100.8 更新 `MEMORY.md` Hotspots 與 Stable Facts
  - **目標**：
    - Hotspots 新增：`saveCloudQuestions`（預寫/清除 dirty）、`refreshBanksData`（cloudSyncedAt 合併邏輯）、`runWithSyncLock`（Web Locks）
    - Stable Facts 更新：API Key 加密邊界、跨分頁鎖機制、AudioContext 生命週期
    - Aliases & Vocabulary：新增 `cloudSyncedAt`、`saveChunkDraftSafely`、`activeAudioContextsRef`、`handlersRef`、`removeDirtyBank`
  - **驗證**：`project-memory_rebuild_project_memory_cache` 執行後回 success

- [x] 100.9 OpenSpec 驗證
  - **執行**：`openspec validate security-architecture-hardening-v2 --strict`
  - **驗證**：全 pass；準備好執行 `/opsx:verify` 與 `/opsx:archive`（不在本次範圍內，留給用戶）
