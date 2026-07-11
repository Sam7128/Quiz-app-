## Context

MindSpark 為純前端 React + Vite + Supabase 應用（無後端服務）。`docs/SECURITY_AND_ARCHITECTURE_AUDIT_REPORT_V2.md` 提出的 7 項發現已透過 `codebase-memory-mcp` 與 `explore` 子代理在原始碼中逐項核實：

- `vercel.json` 僅含 rewrites，無 any 安全標頭；`index.html` 的 `<meta>` CSP 為 client-side 且 `connect-src` 漏 `api.openai.com`。
- `services/cloudStorage.ts` 的 `window.__MINDSPARK_SYNC_LOCK__` 為記憶體鎖，多分頁並行 sync 會 race。
- `hooks/useChunkedPractice.ts` 的 `updateChunkDraft`（L394-421）與 `beforeunload` effect（L423-449）有兩份完全相同的防退步邏輯。
- `hooks/useBankManager.ts:48` 的 `localMeta.length > 0 && latest.length === 0` 排他條件讓「雲端有題庫 + 本地新題庫」用戶的本地題庫被靜默覆蓋而遺失。
- `components/FocusTimer.tsx:79-85` 的 `setTimeout(()=>audioContext.close(), 600)` 會被 unmount cleanup（L21-24）的 `clearTimeout` 跳過，導致 AudioContext 永不關閉、解碼通道耗盡。
- `hooks/useKeyboardShortcuts.ts:48-50` 監聽器依賴 4 個回調參考，QuizCard re-render 時反覆解綁再綁定。
- `services/cloudStorage.ts:234-321` 的 `saveCloudQuestions` 在 upsert 成功後但 `addDirtyBank` 寫入 localStorage 前的極限中斷會留下永久的雲端幽靈題目；`retryDirtyPracticeSessions`（L720）為死代碼無生產呼叫者。

補充發現：(1) 報告 §4.1 建議的修補 `local => !latest.some(cloud => cloud.id === local.id)` 有缺陷——`syncLocalToCloud` 透過 `createCloudBank` 為每個本地題庫產生全新雲端 UUID（`cloudStorage.ts:345`），本地 ID 與雲端 UUID 完全不重疊導致每次登入所有本地題庫都會被誤判為「未同步」反覆彈窗。(2) `useSoundEffects` 的 `playCorrectSfx` / `playWrongSfx` 為死導出（QuizCard 用自己的 `use-sound`）。(3) `types/global.d.ts` 已存在並已用於 `__MINDSPARK_SYNC_LOCK__`（即 §3 的型別問題已被前次歸檔變更修補）。

## Goals / Non-Goals

**Goals**:
1. 修補 7 項核實發現（N1-N7）外加 3 項補充發現（X1、X3、X2 死代碼接線）。
2. 透過 OpenSpec delta specs 將修補需求規格化、可供未來 AI / 維護者追溯。
3. 對「不採納的報告建議」（後端 Proxy、PBKDF2、自動 RPC migration、自訂 RPC 腳本）在 `docs/SECURITY_LIMITATIONS.md` 明文記錄邊界，避免未來重複討論。
4. 每個修補提供對應單元測試或既有測試強化，禁 Medicaid 測試或硬編碼假資料。

**Non-Goals**:
1. **不**引入後端 Proxy 或 serverless function 作為 AI 請求中繼（與純前端架構衝突；留待未來）。
2. **不**引入 PBKDF2 + 用戶密碼派生金鑰（破壞現有「輸入一次即可」UX）。
3. **不**自訂任何 Supabase PostgreSQL RPC（秉持 YAGNI 原則與最懶工程師視角，剔除過度設計，前端不引入自訂 RPC 依賴，依靠 RLS 與預寫重試機制保障安全）。
4. **不**改變 `bgmInstance` Howl 單例生命週期（避免設定頁切換破壞 BGM 重播體驗）。
5. **不**變更 `useKeyboardShortcuts` 的外部呼叫介面或 `isEditableTarget` 防護邏輯。
6. **不**變更 `BankMetadata` 既有欄位語意（`cloudSyncedAt` 為 additive optional）。

## Decisions

### D1: 宣告式同步鎖 — `runWithSyncLock` 封裝與 30s Fallback
**選擇理由**：針對 Web Locks API (`navigator.locks`) 生命週期進行修正。原「返回 release 函數」的設計會導致鎖在輔助函式呼叫結束後立刻自動釋放。新設計改為宣告式（Block-based）的 `runWithSyncLock<T>(cb: () => Promise<T>): Promise<T>`。將整個非同步同步流程包覆在 Web Locks 的 callback Promise 內，保證 Promise pending 期間鎖持續有效。
此外，為防止大題庫或慢速網路造成的腦裂，將 timestamped localStorage lock（`mindspark_sync_lock_ts`）的逾時時間延長至 **30秒**。

### D2: 內聚擴展鎖保護至 `syncLocalToCloud` 與 `syncLocalPracticeSessions`
**選擇理由**：為了解決並發同步時 `BANKS_META` 的寫入競態條件（D4-001），不僅 `syncLocalPracticeSessions` 需上鎖，整個 `syncLocalToCloud` 亦必須包覆於 `runWithSyncLock` 的保護範疇中。
為了落實「預設安全（Secure by Default）」，`runWithSyncLock` 鎖邏輯將直接**內聚**在 `syncLocalToCloud` 與 `syncLocalPracticeSessions` 的函式內部最外層，而不是依賴外部調用方包裝。為了解決頁面初始載入時兩者同時觸發引起的併發鎖競爭（進而導致 Dialog 點擊無法 resolve 與卡死），兩者採用獨立解耦的鎖名（分別為 `'mindspark_banks_sync'` 與 `'mindspark_practice_sync'`），以確保不互相干擾，且各流程本身仍保有完整的跨分頁排他性。

### D3: 辨識「未同步本地題庫」採 `cloudSyncedAt` 而非 ID 比對
**選擇理由**：報告 §4.1 建議的 `local => !latest.some(cloud => cloud.id === local.id)` 有嚴重缺陷——本地題庫每次同步透過 `createCloudBank` 產生新雲端 UUID（`cloudStorage.ts:345`），本地 ID 與雲端 UUID 完全不重疊導致每次登入所有本地題庫都會被誤判為「未同步」反覆彈窗。採 `BankMetadata.cloudSyncedAt?: number` 新欄位：`undefined` 代表未同步，`>=1` 代表已同步。`syncLocalToCloud` 成功後回寫 timestamp，下次登入時 `unsyncedLocalMeta = localMeta.filter(b => !b.cloudSyncedAt)` 過濾。
`syncLocalToCloud` 在 `Promise.allSettled` 解析後更新本地 metadata。

### D4: FocusTimer AudioContext 生命週期 — `activeAudioContextsRef` + 雙重 close 路徑
**選擇理由**：報告 §4.2 建議方向正確（建立 ref 追蹤）。每個新建 AudioContext 立即 push 進 `activeAudioContextsRef.current`；`setTimeout` 內成功 close 後從 ref 中移除引用；unmount cleanup 遍歷剩餘 ref 對 `state !== 'closed'` 的 ctx 強制 close 並 try-catch 個別呼叫。

### D5: `useKeyboardShortcuts` ref 模式 — handlersRef + 監聽器綁定一次
**選擇理由**：報告 §4.3 建議的 `handlersRef` 模式為 React 官方「最佳化事件監聽」慣用寫法。`handlersRef` 每次渲染透過無依賴 `useEffect` 同步最新回調；監聽器 `useEffect` 依賴 `[]` 全生命週期只綁定一次。

### D6: dirty-bank 預寫 + `removeDirtyBank`
**選擇理由**：報告 §5.2 的「極限中斷遺留幽靈題目」風險根源在於 `addDirtyBank` 只在錯誤路徑被呼叫。改為「upsert **之前** 先預寫 dirty」將殘餘風險收斂至 < 1ms。新增 `removeDirtyBank` 私有 helper，於 upsert+cleanup 全成功後清除；失敗路徑維持舊邏輯保留 dirty 標記。`retryCleanupDirtyBanks` 在 `syncLocalToCloud` 開頭已有呼叫（L328），保留。

### D7: CSP 與自訂 AI 端點限制
**選擇理由**：靜態 CSP 政策（`vercel.json`）無法動態適應設定頁中的自訂 `baseUrl`。為求最簡化架構，不採用複雜的動態標頭注入。在 `docs/SECURITY_LIMITATIONS.md` 中明確記錄此一限制：凡使用自訂 Proxy 或 Local 端點的用戶，需手動於部署時修改 `vercel.json` 裡的 `connect-src` 白名單。同時，於 UI 設定頁面元件（`components/Settings.tsx`）與 `index.html` 加上註記說明引導與連結。

### D8: 死導出移除以最小變更 — 移除 `playCorrectSfx` / `playWrongSfx`
**選擇理由**：核實 `useSoundEffects` 的 `playCorrectSfx` / `playWrongSfx` 在 `components/`、`hooks/`、`contexts/`、`App.tsx` 均無呼叫者（`QuizCard` 用自己的 `use-sound` hook 得到 `playCorrect` / `playWrong`）。移除可減少介面表面積、避免未來誤用。`BattleArena` unmount 額外呼叫 `unloadSfx()` 釋放 `sfxAttackInstance`（不動 `bgmInstance`）。

## Risks / Trade-offs

| 風險 | 緩解 |
|------|------|
| `navigator.locks` 在 jsdom 測試環境不存在 → T2 測試失敗 | 在 `practiceSessionStorage.test.ts` 設定中 stub `navigator.locks.request` 模擬排他執行，以 callback Promise resolve 來測試鎖狀態。 |
| `cloudSyncedAt` 推斷於既有用戶升級時觸發一次同步彈窗（UX 短期影響） | 為可接受遷移；同步成功後 BANKS_META 帶 timestamp，後續不再彈窗。 |
| T1 vercel.json CSP過嚴擋住用戶自訂的 Proxy 網域 | 透過 `docs/SECURITY_LIMITATIONS.md` 明確註記此限制，並於設定頁與 index.html 提供提示引導手動加白名單。 |
| `saveCloudQuestions` 預寫 dirty 在所有 sync 成功後未清除 → 持續 retry RPC | T8.4 測試必須驗證成功後 `mindspark_dirty_banks` 不含該 bankId。 |
| `useKeyboardShortcuts.test.tsx` 真實 keydown 在 jsdom 不自動觸發 | T6.3 測試用 `window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))` 明確派發。 |
| `BattleArena` unmount 時 unload `sfxAttackInstance` 後若 `BattleArena` 重新 mount 時 `sfxAttackInstance` 為 null | `initSounds` 在 `useSoundEffects` mount effect 內執行；`unloadSfx` 將 `sfxAttackInstance = null`，下次 `initSounds()` 會重建。 |
