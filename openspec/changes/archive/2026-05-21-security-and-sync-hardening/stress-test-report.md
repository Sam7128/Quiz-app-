### [ISSUE-001] Category: Edge Case
- **Affected Step**: 1.1 在 `services/ai.ts` 的 `getAIConfig()` 中，將 L66 的 `JSON.parse(data)` 包裝在 try-catch 中
- **Problem**: 如果 `data` 是極大的 JSON 字串（如遭到惡意擴充注入），`JSON.parse` 可能導致主執行緒長時間阻塞甚至 Memory Exhaustion。
- **Risk Level**: LOW
- **Suggested Addition**: 在進行 `JSON.parse` 前，先檢查 `data.length`，若超過合理大小（如 10KB）則直接視為損壞並回傳 null。

### [ISSUE-002] Category: Logic Gap
- **Affected Step**: 1.1 在 `services/ai.ts` 的 `getAIConfig()` 中
- **Problem**: 即使 JSON 解析成功，它可能不符合 `AIConfig` 的結構（例如缺少重要欄位），導致後續程式碼在讀取時報錯。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 在 try 區塊內新增對解析後物件的結構驗證（Type Guard 或 Schema 檢查），若不符合預期結構則拋出錯誤進入 catch 區塊。

### [ISSUE-003] Category: Missing Detail
- **Affected Step**: 1.1 在 `services/ai.ts` 的 `getAIConfig()` 中
- **Problem**: 任務中提到「清除 sessionStorage 和 localStorage 中的 STORAGE_KEYS.AI_CONFIG」，但未處理若清除動作本身（因權限或其他原因）拋出例外的狀況。
- **Risk Level**: LOW
- **Suggested Addition**: 將清除 localStorage 和 sessionStorage 的操作也包裝在 try-catch 中，防止二次報錯。

### [ISSUE-004] Category: Assumption Risk
- **Affected Step**: 2.1 將 `await Promise.all(uploadPromises)` 替換為 `const results = await Promise.allSettled(uploadPromises)`
- **Problem**: 假設所有的失敗都會被捕捉並返回帶有 `message` 屬性的 Error 物件，但 `Promise.allSettled` 的 `rejected` 狀態其 `reason` 可能是任意型別（如字串或 undefined）。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 任務 2.2 應加入型別防護：`const reason = r.reason instanceof Error ? r.reason.message : String(r.reason);`

### [ISSUE-005] Category: Architecture
- **Affected Step**: 2.1 將 `await Promise.all(uploadPromises)` 替換為 `const results = await Promise.allSettled(uploadPromises)`
- **Problem**: 若 `uploadPromises` 包含大量題庫（例如 50+ 個），無限制的並發可能導致 Supabase API Rate Limit，進而使大量請求被 reject。
- **Risk Level**: HIGH
- **Suggested Addition**: 引入並發控制（Concurrency Control，例如 `p-limit` 或 chunking），限制同時執行的上傳請求數量（例如 3~5 個）。

### [ISSUE-006] Category: Logic Gap
- **Affected Step**: 2.2 遍歷 `results` 陣列，對 `status === 'rejected'` 的結果呼叫 `console.error`
- **Problem**: 失敗的 bank 僅被記錄到 console，並未回傳給 UI 層。UI 無法得知有部分題庫同步失敗，可能向用戶顯示「全部同步成功」。
- **Risk Level**: HIGH
- **Suggested Addition**: 讓 `syncLocalToCloud` 返回同步結果的摘要物件（包含成功和失敗的 IDs），並更新調用者（Tasks 2.3）以在 UI 上顯示部分失敗警告。

### [ISSUE-007] Category: Logic Gap
- **Affected Step**: 3.1 新增 `let isSyncingPracticeSessions = false;` 變數
- **Problem**: 模組級別的變數只能防止單一 Browser Tab 內的並發。若用戶同時開啟多個 Tab，仍可能發生跨 Tab 的同步競態。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 改用 `navigator.locks.request` (Web Locks API) 或基於 `localStorage` 事件的跨分頁鎖，以確保真正的全域排他性。

### [ISSUE-008] Category: Edge Case
- **Affected Step**: 3.3 將 `syncLocalPracticeSessions()` 的整個 try-catch 區塊包裝在 `isSyncingPracticeSessions = true; try { ... } finally { isSyncingPracticeSessions = false; }` 結構中
- **Problem**: 若在 `try` 區塊中發生無法捕捉的嚴重錯誤（如主執行緒崩潰），鎖將無法釋放。雖前端重整會重置變數，但若實施 localStorage 鎖則會死鎖。
- **Risk Level**: LOW
- **Suggested Addition**: (如果採用 localStorage 鎖) 應為鎖加上 TTL (Time-To-Live) 過期機制。針對當前記憶體鎖，需確保沒有懸掛的非同步操作逃逸出 try 區塊。

### [ISSUE-009] Category: Missing Detail
- **Affected Step**: 3.2 在 `syncLocalPracticeSessions()` 的開頭加入守衛
- **Problem**: `retryDirtyPracticeSessions` 內部也呼叫了 `syncLocalPracticeSessions`，但任務中未明確指出是否需要在 retry 端做狀態反饋。
- **Risk Level**: LOW
- **Suggested Addition**: 確認 UI 在呼叫 `retryDirtyPracticeSessions` 時，能正確處理因為鎖定而回傳的 `EMPTY_SYNC_RESULT`（例如顯示「正在同步中」）。

### [ISSUE-010] Category: Architecture
- **Affected Step**: 4.2 將該區塊修改為：`updatedLocalSessions.push(cloudSession!)`
- **Problem**: 直接將 `cloudSession` push 進 `updatedLocalSessions` 可能導致總 active sessions 數量超過本機限制（PRACTICE_ACTIVE_LIMIT = 5）。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 在 L479 的 `replaceAllPracticeSessions` 之前，或在 push 時，必須明確保證不會破壞 Guest/本機模式下的會話數量限制邏輯。

### [ISSUE-011] Category: Edge Case
- **Affected Step**: 4.2 將雲端版本加入 `updatedLocalSessions`
- **Problem**: 當雲端版本回寫覆蓋本機版本時，若該 session 在本機有中途未完成的 Chunk 草稿（`CHUNK_DRAFT_PREFIX`），草稿與新 session 狀態可能發生不同步（如 currentQuestionIndex 超出範圍）。
- **Risk Level**: HIGH
- **Suggested Addition**: 當發生雲端版本回寫時，應同時呼叫 `clearChunkDraftsForSession(sessionId)` 以清除過期且可能不相容的本地草稿。

### [ISSUE-012] Category: Logic Gap
- **Affected Step**: 4.1 在 `syncLocalPracticeSessions()` 中判斷 `isLocalNewer`
- **Problem**: `updatedAt` 完全依賴客戶端系統時間，跨裝置時鐘偏移（Clock Drift）可能導致雲端較新的資料被誤判為較舊。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 雖然架構決策 (Design D2) 不改 DB，但前端應有基本的防護：若本地與雲端 `updatedAt` 差距大於合理閾值（如未來時間），應提出警告或採用不同的合併策略。

### [ISSUE-013] Category: Logic Gap
- **Affected Step**: 5.2 將 `throw new Error(...)` 改為 `console.warn`
- **Problem**: 降級為 `console.warn` 後，幽靈題目將永遠殘留在雲端資料庫中，因為沒有後續的自動化清理機制（Garbage Collection）來處理這些 orphans。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 在本地記錄這些清理失敗的 Bank ID (例如存入 `mindspark_dirty_banks`)，並在下一次啟動或同步時嘗試重新執行清理。

### [ISSUE-014] Category: Edge Case
- **Affected Step**: 5.1 在 `saveCloudQuestions()` 中處理 cleanup error
- **Problem**: PostgREST 的 `in` 運算子有限制。若 `keepIds` 非常龐大（如上萬題），組合出的 `inList` 字串可能會超過 API 的 URL 或 Payload 長度限制，導致 cleanup 永遠失敗。
- **Risk Level**: LOW
- **Suggested Addition**: 若 `keepIds.length` 大於 500，應將 cleanup 操作分批 (chunking) 執行。

### [ISSUE-015] Category: Missing Detail
- **Affected Step**: 5.4 新增 `console.info` 說明執行了全量清除
- **Problem**: `keepIds` 為空時直接全量刪除雲端題庫。但若是因為前置步驟的意外錯誤導致 `questions` 陣列被錯誤清空，將造成不可逆的資料遺失。
- **Risk Level**: HIGH
- **Suggested Addition**: 新增雙重確認：若 `bankId` 存在且舊的題庫大於 0，但新存入的 questions 為 0，應拋出錯誤或要求顯式設定 `forceDeleteAll` 參數。

### [ISSUE-016] Category: Edge Case
- **Affected Step**: 6.1 在 `saveChunkDraft()` 中加入版本比較邏輯
- **Problem**: 若 `Date.now()` 在同一個毫秒內連續觸發（例如 React 雙重渲染或快速操作），現有草稿與新草稿的 `updatedAt` 將完全相同，可能導致本應寫入的新狀態被錯誤拒絕。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 版本比較應為 `existing.updatedAt >= draft.updatedAt` 嗎？不，若是同毫秒，應允許寫入（Last Write Wins）。比較條件應嚴格為 `existing.updatedAt > draft.updatedAt`。並加入 `console.debug` 記錄同毫秒覆蓋。

### [ISSUE-017] Category: Assumption Risk
- **Affected Step**: 6.3 / 6.4 確認已正確設置 `updatedAt: Date.now()`
- **Problem**: 使用者若手動修改系統時間（時鐘回撥），`Date.now()` 會產生過去的時間戳，導致後續所有的草稿儲存都被版本守衛拒絕。
- **Risk Level**: LOW
- **Suggested Addition**: 加入時鐘回撥防護：如果發現 `draft.updatedAt` 落後於 `existing.updatedAt` 超過合理的巨大值（例如 > 1小時），應視為時鐘異常，允許強制覆蓋。

### [ISSUE-018] Category: Missing Detail
- **Affected Step**: 6.1 在 `localStorage.setItem` 之前加入版本比較邏輯
- **Problem**: `localStorage.setItem` 在超過 5MB 容量限制時會拋出 `QuotaExceededError`，任務未指示如何處理此例外。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 將 `localStorage.setItem` 包裝在 try-catch 中，若發生 QuotaExceededError 則清除最舊的草稿或顯示警告通知用戶。

### [ISSUE-019] Category: Architecture
- **Affected Step**: 7.2 執行 `npm update vite` 升級到最新安全版本
- **Problem**: Vite 從 5.x 升級到 6.x 或更高版本可能有 Breaking Changes，包括 Rollup 版本的變更或 plugin 介面的修改，僅依賴 `npm run build` 可能無法捕捉所有 runtime 行為變更。
- **Risk Level**: HIGH
- **Suggested Addition**: 升級後必須檢查 `vite.config.ts` 中的 plugin 相容性，並在瀏覽器控制台監控 HMR（Hot Module Replacement）是否正常運作。

### [ISSUE-020] Category: Assumption Risk
- **Affected Step**: 7.3 執行 `npm update dompurify`
- **Problem**: 新版本的 `dompurify` 可能收緊了預設的安全策略（例如對特定 iframe 或 data URI 的過濾變嚴格），這可能會破壞現有題庫中依賴這些 HTML 特性的題目。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 新增針對 `dompurify` 輸出的快照測試，包含現有題庫中常用的 HTML 標籤與屬性，確保升級後不會誤刪合法內容。

### [ISSUE-021] Category: Edge Case
- **Affected Step**: 7.1 / 7.4 執行 `npm audit` 確認漏洞數量減少
- **Problem**: 有些漏洞可能位於開發依賴（devDependencies）的深層子依賴中，簡單的 `npm update` 可能無法修復，需要使用 `npm overrides` 或 `resolutions`。
- **Risk Level**: LOW
- **Suggested Addition**: 在任務 7.4 補充：若漏洞無法透過 `npm update` 消除，必須在 `package.json` 加入 `overrides` 設定。

### [ISSUE-022] Category: Missing Detail
- **Affected Step**: 8.4 在開發伺服器中手動驗證
- **Problem**: 僅依賴「手動驗證」AI 設定頁面與同步操作，對於這類高度並發與邊界情況的變更來說，容易產生人為疏漏且難以回歸測試。
- **Risk Level**: HIGH
- **Suggested Addition**: 將此驗證自動化，在 `e2e/` 資料夾下新增 Playwright 測試腳本，專門模擬並發同步與 localStorage 破壞情境。

### [ISSUE-023] Category: Logic Gap
- **Affected Step**: 8.3 執行 `npm test` 確認所有單元測試通過
- **Problem**: `vi.useFakeTimers()` 在非同步與 Promise 操作（如 `Promise.allSettled`）中常會引發微妙的死鎖或時間解析錯誤，這在測試 `saveChunkDraft` 和 `syncLocalPracticeSessions` 時極易發生。
- **Risk Level**: MEDIUM
- **Suggested Addition**: 在任務中特別註明：測試時間相關邏輯時，必須正確使用 `vi.runAllTimersAsync()` 以確保 Promise 鏈完全結算。

### [ISSUE-024] Category: Edge Case
- **Affected Step**: 8.2 執行 `npm run build` 確認 production build 成功
- **Problem**: 由於並發鎖 `isSyncingPracticeSessions` 位於模組頂層，在 production bundle (經過 tree-shaking 和 minify) 中，如果模組被多次動態 import，可能導致鎖變成多個實例。
- **Risk Level**: LOW
- **Suggested Addition**: 確保 `services/cloudStorage.ts` 不會因 code-splitting 被實例化多次，或將狀態移至全域 `window.__MINDSPARK_SYNC_LOCK__` 作為最後防線。

---

### Module: AI 設定防護 (M1)

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Valid JSON parsing | `{"provider":"openai","persist":true}` in localStorage | Parsed object matching input | P0 |
| 2 | Invalid JSON fallback | `{invalid}` in localStorage | Returns `null`, storage is cleared | P0 |
| 3 | Empty storage handling | null in localStorage | Returns `null` | P1 |
| 4 | Large string JSON | 10MB string in localStorage | Returns `null` (if length guard added) | P2 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Config load on mount | `App.tsx`, `ai.ts`, Settings Modal | App mounts normally even if config is corrupted |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Storage API throws error | Users with restricted storage policies | Catch blocks handle StorageError safely |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | `removeItem` fails | Locked storage | Skip throwing, continue app execution |

#### Expected Outcomes
- App never crashes due to malformed `mindspark_ai_config`.
- Corrupted configurations are automatically flushed to prevent cyclic crashes.

---

### Module: syncLocalToCloud 改用 Promise.allSettled (M2)

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | All banks sync success | 3 valid banks | Resolves normally, 0 errors logged | P0 |
| 2 | Partial sync failure | 2 valid, 1 throws error | Resolves normally, 1 error logged | P0 |
| 3 | Total sync failure | All banks throw error | Resolves normally, multiple errors logged | P1 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Login trigger sync | `AuthContext`, `cloudStorage` | Partial failure doesn't block login completion |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Massive bank count | API limits | Handled via concurrency controls (if added) |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Network drops mid-sync | Timeout during upload | `status: rejected`, handled gracefully |

#### Expected Outcomes
- Single bank failure isolates gracefully.
- UI continues operation despite partial failure.

---

### Module: 同步並發鎖 (M3)

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Sequential calls | Call 1 finishes, Call 2 starts | Call 2 executes normally | P0 |
| 2 | Concurrent calls | Call 1 starts, Call 2 starts immediately | Call 2 returns EMPTY_SYNC_RESULT | P0 |
| 3 | Lock release on throw | Call 1 throws error, Call 2 starts | Call 2 executes normally | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Dashboard multi-mount | `Dashboard.tsx` strict mode double render | Only one sync occurs, second aborts |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Infinite await in try block | Lock starvation | Promise timeout mechanics (if applicable) |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Uncatchable VM crash | DevTools interaction | Requires page refresh |

#### Expected Outcomes
- Exactly one sync runs per tab.
- Network requests are strictly serialized.

---

### Module: 雲端較新 session 回寫本機 (M4)

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Cloud is newer | Local T=1, Cloud T=2 | Cloud session pushed to local | P0 |
| 2 | Local is newer | Local T=2, Cloud T=1 | Local session triggers upload | P0 |
| 3 | Timestamps match | Local T=1, Cloud T=1 | No overwrite, skipped++ | P1 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Cross-device resume | `Dashboard`, `cloudStorage` | Device B sees Device A's progress |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Overwriting active local draft | Local has unsaved chunk progress | Drafts are cleared to prevent state mismatch |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | `replaceAll` fails | LocalStorage full | Caught by top-level storage handler |

#### Expected Outcomes
- Local state accurately reflects the most advanced cloud state.

---

### Module: saveCloudQuestions cleanup 降級 (M5)

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Upsert success, cleanup success | Normal data | Both operations succeed | P0 |
| 2 | Upsert success, cleanup fails | Normal data, DB mock throws on delete | Warns in console, resolves normally | P0 |
| 3 | Upsert fails | Malformed data, DB mock throws on upsert | Throws Error, cleanup not called | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Save bank from Manager | `BankManager`, `cloudStorage` | UI shows success even if cleanup fails |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Empty `keepIds` | Potential accidental delete-all | Logs info, executes delete |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Massive keepIds string | PostgREST limits | Request fails, degrades to warning |

#### Expected Outcomes
- Bank saves never fail due to cleanup errors.
- Data retention (upsert) is prioritized over data deletion (cleanup).

---

### Module: saveChunkDraft 版本守衛 (M6)

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Newer draft write | Existing T=1, Draft T=2 | Writes to storage | P0 |
| 2 | Older draft write | Existing T=2, Draft T=1 | Rejected, warns in console | P0 |
| 3 | Equal timestamp write | Existing T=1, Draft T=1 | Writes to storage | P1 |
| 4 | Legacy draft overwrite | Existing no timestamp, Draft T=1 | Writes to storage | P1 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Unload vs React effect | `useChunkedPractice` | Older `beforeunload` is rejected |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Huge clock rollback | Existing T=9999, Draft T=1 | Blocked (or accepted if rollback mitigation added) |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Storage full | `localStorage.setItem` throws | Try-catch handles QuotaExceededError |

#### Expected Outcomes
- Progress regressions caused by delayed callbacks or unload events are eliminated.

---

### Module: 依賴項安全升級 (M7)

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | DOMPurify output | `<script>alert(1)</script>` | Script tag removed completely | P0 |
| 2 | DOMPurify safe output | `<b>Hello</b>` | Retains HTML tags | P0 |
| 3 | Build process test | Standard build command | Exits with code 0 | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Rendering complex explanation | `QuizCard`, DOMPurify | UI renders without breaking layout |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | MathML or SVG in questions | Purify might strip them | Verify configuration preserves needed tags |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Build failure | Vite plugin incompatibility | Manual intervention required to fix config |

#### Expected Outcomes
- Zero vulnerabilities reported by `npm audit`.
- Core application functionality remains visually and functionally identical.

---

### Module: 全面驗證 (M8)

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Typescript compiler check | `tsc --noEmit` | Returns 0 exit code | P0 |
| 2 | Vitest execution | `npm test` | All tests pass | P0 |
| 3 | Playwright execution | `npx playwright test` | All E2E flows pass | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Full application boot | Vite preview | App loads without console errors |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | False positive tests | Flaky async tests | Use proper `waitFor` or `runAllTimersAsync` |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | CI pipeline failure | Missing dependencies | Fix package-lock.json |

#### Expected Outcomes
- 100% confidence in the stability of the release candidate.
