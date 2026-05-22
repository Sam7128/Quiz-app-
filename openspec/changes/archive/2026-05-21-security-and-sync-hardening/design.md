## Context

MindSpark 是一個純前端 React Quiz App，使用 localStorage 作為主要持久化層，Supabase 作為雲端同步層。兩份獨立審計報告（SECURITY_AND_LOGIC_AUDIT_REPORT 和 RISK_REVIEW_REPORT_2026_05_21）揭示了以下系統性問題：

1. **同步競態條件**：`syncLocalToCloud` 使用 `Promise.all` 導致單一失敗中斷整批；`syncLocalPracticeSessions` 缺乏並發鎖且跳過雲端較新 session
2. **資料完整性風險**：`saveCloudQuestions` 的非原子「upsert + delete」流程在中途失敗時產生幽靈題目或全量刪除
3. **草稿保存衝突**：`updateChunkDraft` 與 `beforeunload` 兩個寫入路徑缺乏完整的版本比較，可能導致進度回流
4. **敏感資料暴露**：AI API Key 儲存在 localStorage，且 `getAIConfig()` 的 JSON 解析缺乏 try-catch
5. **第三方套件漏洞**：vite (High) 和 dompurify (Moderate) 存在已知 CVE

### 已驗證的代碼真實性

| 風險 ID | 報告位置 | 代碼驗證結果 |
|---------|---------|-------------|
| RISK-001 | `saveCloudQuestions` L134-195 | ✅ 已確認：upsert 與 delete 分開執行，非原子 |
| RISK-002 | `syncLocalPracticeSessions` L423-480 | ✅ 已確認：雲端較新時 `skipped++` 但未回寫本機 (L432-434) |
| RISK-003 | `syncLocalPracticeSessions` L428-471 | ✅ 已確認：使用客戶端 `updatedAt` 時間戳作為 LWW 依據 |
| RISK-004 | `useChunkedPractice.ts` L394-449 | ⚠️ 部分修復：已有 index=0 防護，但缺乏 updatedAt 完整比較 |
| RISK-005 | `ai.ts` L60-91 | ✅ 已確認：API Key 直接存儲在 localStorage/sessionStorage |
| RISK-006 | `ai.ts` L60-75 | ✅ 已確認：`JSON.parse(data)` 在 L66 無 try-catch |
| RISK-007 | `syncLocalToCloud` L200-212 | ✅ 已確認：使用 `Promise.all` (L211) |

## Goals / Non-Goals

**Goals:**
- 修復所有 7 項已驗證的風險（RISK-001 到 RISK-007）
- 所有修復向後相容，不引入 breaking changes
- 每項修復都有對應的自動化測試覆蓋
- 升級存在 CVE 的依賴項
- 修復後代碼可被初階開發者理解和維護

**Non-Goals:**
- 建立後端 API Proxy（RISK-005 中建議的架構變更）— 此為獨立的架構決策，範圍過大
- 實作伺服器端時間戳（RISK-003 中建議的 DB trigger）— 需要 Supabase schema migration，風險較高
- Supabase RPC 原子交易（RISK-001 中建議的最佳方案）— 需要 DB function 部署權限，且不在純前端範圍內
- CSRF 防護強化 — Supabase RLS 已提供足夠防護，且為 JSON API

## Decisions

### Decision 1: syncLocalToCloud 改用 Promise.allSettled（修復 RISK-007）

**選擇**: `Promise.allSettled` + 個別結果處理
**替代方案**: 
- (A) 逐一 `await`：保證順序但效能差
- (B) `Promise.all` + 外層 try-catch：仍無法區分哪些 bank 成功

**理由**: `Promise.allSettled` 保留併發效能，同時能精確追蹤每個 bank 的成功/失敗狀態。失敗的 bank 會被記錄並提示重試，不影響其他 bank 的同步。

```typescript
// Before (RISK-007)
await Promise.all(uploadPromises);

// After
const results = await Promise.allSettled(uploadPromises);
const failed = results.filter(r => r.status === 'rejected');
if (failed.length > 0) {
  console.warn(`${failed.length} bank(s) failed to sync`);
  // 返回失敗列表供 UI 顯示重試
}
```

**補充**:
- 加入並發上限（例如 3~5 個 bank 同步），避免大量題庫觸發 Rate Limit。
- `rejected` 的 `reason` 可能不是 Error，需型別守衛後再記錄錯誤訊息。
- 回傳摘要（成功/失敗 ID 清單）讓 UI 顯示部分失敗與重試入口。

### Decision 2: syncLocalPracticeSessions 回寫雲端較新 session（修復 RISK-002）

**選擇**: 雲端較新時，將雲端版本回寫本機 `updatedLocalSessions`
**替代方案**:
- (A) 保留本機版本並打 `stale` 標記：增加複雜度，且 stale 狀態難以清理
- (B) 丟棄本機版本：當前行為，已確認會導致資料消失

**理由**: 最簡單且正確的修復。雲端較新表示其他裝置有更新的進度，應以雲端為準。回寫本機確保離線時也能看到最新進度。

```typescript
// Before (RISK-002): skipped 的 session 未加入 updatedLocalSessions
if (!isLocalNewer) {
  skipped += 1;
  continue; // ← 雲端版本被丟棄！
}

// After: 回寫雲端版本到本機
if (!isLocalNewer) {
  skipped += 1;
  updatedLocalSessions.push(cloudSession!); // ← 保留雲端版本
  continue;
}
```

**補充**:
- 回寫雲端版本時，若該 session 存在 chunk draft，需清理過期草稿以避免狀態不一致。
- 在寫回本機前需遵守 `PRACTICE_ACTIVE_LIMIT`（保留最新 N 筆，或明確定義裁切策略）。
- 若偵測 `updatedAt` 與本機時間差異過大（clock drift），需採保守策略（例如偏向雲端並記錄警告）。

### Decision 3: 引入同步並發鎖（修復 RISK-001/部分 RISK-003）

**選擇**: 模組層級 `let isSyncing = false` 旗標
**替代方案**:
- (A) Web Lock API (`navigator.locks`)：瀏覽器支援不完全，Safari 部分版本不支援
- (B) Mutex class with Promise：過度工程化
- (C) AbortController：已有部分 abort 處理，但不能防止重複觸發

**理由**: 簡單的布林旗標足以防止同一分頁內的並發調用。跨分頁的競態在純前端架構下無法完全解決（需要後端），本次僅提供單分頁 best-effort 防護。旗標方案可維護性最高。

```typescript
let isSyncing = false;

export const syncLocalPracticeSessions = async (): Promise<PracticeSyncResult> => {
  if (isSyncing) {
    console.warn('[Sync] Already syncing, skipping duplicate call');
    return EMPTY_SYNC_RESULT;
  }
  isSyncing = true;
  try {
    // ... 原有邏輯
  } finally {
    isSyncing = false;
  }
};
```

### Decision 4: saveCloudQuestions 防禦性非原子流程（修復 RISK-001）

**選擇**: 階段性容錯 — upsert 失敗時拋出錯誤（阻止後續 cleanup），cleanup 失敗時降級為警告而非拋錯
**替代方案**:
- (A) Supabase RPC 原子交易：最佳方案但需 DB function 部署（Non-Goal）
- (B) 先 delete 後 insert：比當前方案更危險
- (C) 完全不做 cleanup：會累積幽靈題目

**理由**: 當前代碼已在 upsert 失敗時拋錯（L167-168），但 cleanup 失敗也會拋錯（L192-193）。改為 cleanup 失敗時僅記錄警告，因為 upsert 已成功，資料不會遺失，幽靈題目的影響遠小於拋錯中斷用戶操作。

同時增加 `keepIds` 空值守衛：當 `questions` 陣列為空時，預設**禁止**全量刪除，除非呼叫端明確傳入 `forceDeleteAll`（且 UI 已做二次確認）。若未提供明確授權，僅記錄警告並回傳可處理的錯誤。

**補充**:
- cleanup 失敗時需將 bankId 記錄到待清理列表，並在下次同步時重試，以避免幽靈題目永久累積。

### Decision 5: saveChunkDraft 加入 updatedAt 時間戳比較（修復 RISK-004）

**選擇**: 在 `saveChunkDraft` 中比較 `draft.updatedAt` 與現有草稿的 `updatedAt`
**替代方案**:
- (A) 遞增版本號 (version/nonce)：需要額外狀態管理
- (B) 僅保留 index=0 防護：當前方案，已證明不夠

**理由**: `updatedAt` 已存在於 `ChunkDraftState` 中，只需在 `saveChunkDraft` 中加入比較即可。最小改動，最大防護。

```typescript
export const saveChunkDraft = (draft: ChunkDraftState): void => {
  const existing = getChunkDraft(draft.sessionId, draft.chunkIndex);
  if (existing && existing.updatedAt && draft.updatedAt && existing.updatedAt > draft.updatedAt) {
    console.warn('[ChunkDraft] Prevented overwrite: existing is newer');
    return;
  }
  localStorage.setItem(getChunkDraftStorageKey(draft.sessionId, draft.chunkIndex), JSON.stringify(draft));
};
```

### Decision 6: getAIConfig try-catch 防護（修復 RISK-006）

**選擇**: 以 try-catch 包裝 `JSON.parse`，失敗時回傳 `null` 並清理損壞設定；同時加入尺寸上限與結構驗證
**理由**: 最低成本修復，完全向後相容；尺寸上限與型別守衛可避免過大/不合法 JSON 造成阻塞或後續崩潰。

```typescript
export const getAIConfig = (): AIConfig | null => {
  const sessionData = sessionStorage.getItem(STORAGE_KEYS.AI_CONFIG);
  const localData = localStorage.getItem(STORAGE_KEYS.AI_CONFIG);
  const data = sessionData || localData;
  if (!data) return null;

  try {
    if (data.length > MAX_AI_CONFIG_SIZE) return null;
    const config = JSON.parse(data);
    if (!isAIConfig(config)) throw new Error('Invalid AI config');
    if (!config.provider) config.provider = 'google';
    if (config.persist === undefined) config.persist = true;
    return config;
  } catch {
    console.error('[AI Config] Failed to parse config, clearing corrupted data');
    try {
      sessionStorage.removeItem(STORAGE_KEYS.AI_CONFIG);
      localStorage.removeItem(STORAGE_KEYS.AI_CONFIG);
    } catch {
      console.warn('[AI Config] Failed to clear corrupted storage');
    }
    return null;
  }
};
```

### Decision 7: 依賴項安全升級

**選擇**: 升級 `vite` 和 `dompurify` 到最新安全版本
**風險控制**: 升級後執行 `npm run build` + `npm test` 確認無破壞性變更

### Decision 8: AI API Key 儲存安全提示與 sessionStorage-only 模式

**選擇**: 預設維持現有行為，但在設定頁提示風險並提供「只存 sessionStorage」選項。
**理由**: 在不引入後端代理的前提下，讓使用者自行選擇風險/便利權衡；同時降低長期持久化帶來的曝露風險。

## Risks / Trade-offs

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| Promise.allSettled 改造可能改變 syncLocalToCloud 的返回語義 | 上層調用者可能依賴 Promise.all 的 reject 行為 | 檢查所有 caller，確保返回值語義一致 |
| 同步並發上限造成單次同步時間拉長 | 大量 bank 同步可能延遲完成 | UI 顯示同步進度與可中斷/重試機制 |
| 回寫雲端 session 到本機可能覆蓋用戶在離線期間的本機操作 | 極端場景下可能遺失離線進度 | 只在雲端 `updatedAt` 嚴格大於本機時才回寫 |
| saveChunkDraft 的 updatedAt 比較可能在時鐘回撥時拒絕合法寫入 | 極罕見場景 | 增加 fallback：若 updatedAt 差異 > 30 秒，強制寫入 |
| cleanup 失敗降級為警告可能導致幽靈題目累積 | 長期可能增加雲端垃圾資料 | 記錄警告日誌，未來可建立定期清理機制 |
| vite 大版本升級可能引入 breaking changes | 開發環境或 build 流程可能受影響 | 僅升級 patch/minor 版本；升級前先查閱 changelog |
| 單分頁鎖無法跨分頁排他 | 多分頁仍可能競態 | 文件明確說明限制；未來可採 Web Locks/localStorage TTL |

## Migration Plan

1. **Phase 1 - 低風險修復**（RISK-006, RISK-007）：AI config try-catch + Promise.allSettled，影響面小
2. **Phase 2 - 同步強化**（RISK-002, RISK-003, partial RISK-001）：session 回寫 + 並發鎖
3. **Phase 3 - 資料完整性**（RISK-001, RISK-004）：cleanup 降級 + draft 版本守衛
4. **Phase 4 - 依賴升級**（CVE 修復）：vite + dompurify 升級
5. **Phase 5 - 驗證**：全量 build + test + E2E

**Rollback 策略**: 每個 Phase 為獨立 commit，可個別 revert。

## Acceptance & Deployment Gates

在合併/釋出此變更前，必須滿足下列門檻（CI / 測試 / 運維）：

- Gate A: 所有 CRITICAL 與 WARNING（High）已被關閉或有明確可執行的緩解與可驗證測試。
- Gate B: CI 全量通過（unit + integration），並且 `npx tsc --noEmit` 成功無錯誤。
- Gate C: Stress harness 在可重現的 baseline 場景（multi-client, partition）執行且無資料分叉或資料遺失（zero divergence）— 若出現則 Block。
- Gate D: 秘密掃描 (secret-scan) 無檢出或已完成旋轉/撤銷；所有 client-side 長期 key 已替換為短期 token 並有 token-minting 流程。
- Gate E: 依賴項安全審查（`npm audit`）無未處理的 HIGH/CRITICAL CVE，或有 documented compensating controls 與 upgrade plan。
- Gate F: 明確 rollback / mitigation steps：每個 Phase 的回滾 commit 與操作 Runbook 已記錄於 docs/ 並可執行。

滿足以上門檻後，可標記為可執行（Ready to deploy）。若任一 Gate 未達成，變更應停在 BLOCKED，並在 tasks.md 中追蹤未完成項目。

## Open Questions

- **Q1**: `syncLocalToCloud` 改用 `Promise.allSettled` 後，是否需要修改 `App.tsx` 中的調用者以處理部分失敗結果？→ 需檢查 caller
- **Q2**: vite 的安全版本是否有 breaking changes？→ 升級前需查閱 changelog
