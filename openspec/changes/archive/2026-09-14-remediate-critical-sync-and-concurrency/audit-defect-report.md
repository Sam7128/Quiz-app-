# 最終審計缺陷報告

> 審計對象：`openspec/changes/remediate-critical-sync-and-concurrency`
> 審計角色：獨立第二位高階 AI 審計者
> 審計日期：2026-09-13
> 使用技能：`openspec-verify-change`、`ponytail-audit`、`ponytail-debt`、`dead-code`
> 審計範圍：OpenSpec artifacts、變更涉及的 runtime code、相關測試，以及全庫 YAGNI／死代碼／技術債掃描

## 1. 結論

**結論：不建議目前封存或宣告本變更無缺陷。**

自動化門禁全部通過，但仍有下列未閉環項目：

- 1 個 OpenSpec 完整性阻塞：`tasks.md` 的 6.1 未完成，工作樹仍未提交。
- 2 個高風險資料完整性問題：Session 聯集合併仍可能丟失本地未完成進度；chunk 合併依陣列位置而非 `chunk.index`。
- 1 個高風險生命週期問題：`beforeunload` 只觸發 React 非同步狀態更新，不能證明最新文字已在分頁銷毀前落盤。
- 5 個規格／邊界警告：Session status 推導、fallback 鎖過期警告、M1 Toast 可達性、答題鎖在異常狀態下可能卡住，以及 active-limit 裁切追蹤缺口。
- 7 個可收斂的 YAGNI／死代碼項目，以及 1 筆仍在帳簿中的 `ponytail:` 技術債。

因此本報告採 **Conditional Reject／有條件駁回**：測試與編譯狀態良好，但資料同步與關閉分頁路徑仍需由負責人評估並處置。

## 2. OpenSpec 實作檢查

### 2.1 驗證結果

| 檢查項目 | 結果 | 證據 |
|---|---|---|
| Artifact 結構驗證 | 通過 | `openspec validate remediate-critical-sync-and-concurrency`：exit 0 |
| TypeScript | 通過 | `npx tsc --noEmit`：exit 0 |
| 單元測試 | 通過 | 53 個 test files、348 個 tests 全部通過 |
| ESLint | 通過 | `npm run lint`：exit 0 |
| Production build | 通過但有既有 chunk 警告 | `npm run build`：exit 0；`vendor-ui-core` minified chunk 約 1.30 MB |
| Knip | 通過 | `npx knip --include files,dependencies,unlisted,binaries,unresolved,exports,types,duplicates`：exit 0、無輸出 |
| 工作樹 | 未完成 | `git status` 顯示變更仍未提交 |

### 2.2 CRITICAL-01：OpenSpec 任務 6.1 未完成

- **位置**：`openspec/changes/remediate-critical-sync-and-concurrency/tasks.md:70-71`
- **證據**：6.1「所有變更在單一 Git commit 中提交」仍為 `[ ]`；目前 `git log` 的 HEAD 仍是前一個 commit，變更檔案仍在 working tree。
- **判定**：`openspec-verify-change` 的 guardrail 要求未完成任務列為 CRITICAL。這是交付完整性阻塞，不是要求本次審計替使用者提交 commit。
- **建議**：由負責人決定是否依指定 message 提交；若維持「等待使用者評估」流程，應保留未完成狀態，不得將本變更標為 fully complete。
- **補充**：6.2 是「驗證失敗時才執行」的條件性回滾項目，本輪驗證全數通過，因此未觸發回滾；建議將此類條件任務改寫為明確的 `N/A`／條件完成狀態，避免與 6.1 混為一談。

### 2.3 CRITICAL-02：雲端完成數較多時，合併結果仍會丟失本地未完成進度

- **位置**：`services/cloudStorage.ts:918-944`
- **問題**：程式先建立 `mergedSession`，但當 `cloudCompletedCount > localCompletedCount` 時將 `shouldUploadToCloud` 固定為 `false`，並以 `cloudSession` 作為 `targetSession`：

  ```ts
  const targetSession = shouldUploadToCloud
    ? mergedSession
    : (cloudCompletedCount > localCompletedCount ? cloudSession : mergedSession);
  ```

- **可重現情境**：本地完成 Chunk 0，且 Chunk 3 仍有 `in_progress` 作答；雲端完成 Chunk 0、1、2。合併結果本應保留本地 Chunk 3，但程式將整份本地 session 替換成 `cloudSession`，因此丟失 Chunk 3 的進度。現有 Scenario B 只檢查獨立 draft 是否保留，沒有檢查 session chunk 內的 `in_progress` 資料，所以形成偽綠燈。
- **規格衝突**：`specs/practice-session-storage/spec.md` 與 `design.md` 要求先做 chunk-level union，再同時回寫本地與雲端；目前 cloud-leading 分支沒有依 merged session 回寫雲端。
- **建議**：以 `mergedSession` 作為本地回寫基礎；再根據 merged 結果與雲端差異決定是否 upsert，不能以完成數較大的單側 session 取代聯集合併結果。補測「雲端有較多 completed chunks、本地另有未完成 active chunk」案例。

### 2.4 HIGH-01：Chunk 合併用陣列位置，未用規格要求的 `chunk.index`

- **位置**：`services/cloudStorage.ts:688-706`、`services/cloudStorage.ts:920-921`
- **問題**：`mergeChunkedPracticeSessions` 以 `local.chunks[i]`／`cloud.chunks[i]` 比對；`hasNewCompletedChunk` 又以 `cloudSession.chunks[mc.index]` 查找。只要雲端資料重排、存在缺號，或 legacy payload 的陣列順序與 index 不同，便會把不同 chunk 當成同一個 chunk 合併，並可能錯誤清理 draft。
- **規格衝突**：任務 1.4 與 practice-session spec 明確要求「逐一比對每個 chunk index」。
- **建議**：先以 `chunk.index` 建立 Map，使用 union of indices 合併；所有完成判斷、上傳判斷與 draft reconcile 都共用同一個 index map。補上「陣列順序不同／缺號」測試。

### 2.5 HIGH-02：`beforeunload` flush 沒有形成可靠的落盤鏈條

- **位置**：`components/KnowledgeGraph/NodeEditPanel.tsx:49-67`、`components/KnowledgeGraph/GraphEditor.tsx:75-92`、`hooks/useGraphStorage.ts:92-116`
- **問題**：`NodeEditPanel` 的 `beforeunload` handler 只呼叫 `onUpdate(...)`；真實的 `onUpdate` 會排程 React `setNodes`，不是同步寫入。頁面銷毀前不保證 React 完成 render，`useGraphStorage` 另一個 `beforeunload` listener 讀到的 `refs.current.nodes` 仍可能是舊狀態，因此最新輸入可能沒有寫入 `localStorage`。
- **測試缺口**：`nodeEditPanelFlush.test.ts` 與 challenger test 的 `onUpdate` 都是 `vi.fn()`，只驗證 callback 被呼叫，沒有掛上 `GraphEditor`／`useGraphStorage` 驗證實際 persistence。
- **附帶問題**：`handleBeforeUnload` 清空 `pendingUpdateRef`，但沒有清除 `debounceRef`；若事件被取消或測試環境未立即銷毀頁面，原 timer 仍會以空 payload 再呼叫一次 `onUpdate`。
- **建議**：讓 panel 與 storage 共用同步可落盤的 flush bridge，或將 pending data 直接交給 storage layer；handler 內同時清 timer 並置空 ref。補真實整合測試，而非只測 mock callback。

### 2.6 WARNING-01：合併後 session status 可能錯誤標為 completed

- **位置**：`services/cloudStorage.ts:766-775`
- **問題**：`allCompleted` 為 false 時，只要 `local.status` 或 `cloud.status` 任一側是 `completed`，就仍回傳 `completed`。若 session metadata 與 chunks 不一致，會出現「尚有 pending/in_progress chunk，但 session 已 completed」的非法狀態。
- **建議**：`status` 應以 merged chunks 為主判據；只有全部 chunk completed 才能變成 completed，並對 abandoned／active 的衝突做明確策略與測試。

### 2.7 WARNING-02：Fallback 鎖過期覆寫沒有記錄規格要求的 warning

- **位置**：`services/cloudStorage.ts:39-51`
- **問題**：讀到 `now - ts >= SYNC_LOCK_TIMEOUT_MS` 時會直接覆寫 token，但沒有 `console.warn`。`sync-concurrency-control/spec.md` 的「Fallback lock self-clears after timeout」要求記錄已偵測到過期鎖。
- **建議**：只在確認 timestamp 合法且已過期時記錄 bank/practice lock key、原 timestamp 與新 token 的警告；不要把合法的 stale recovery 當成靜默行為。

### 2.8 WARNING-03：M1 disabled button 的 Toast 路徑實際不可達

- **位置**：`components/KnowledgeGraph/GraphToolbar.tsx:175-192`、`hooks/useGraphCodeMode.ts:27-34`
- **問題**：原生 `disabled` button 不會觸發 click，也不會把 click 冒泡至父層；因此 wrapper 的 `onClick` 不能可靠顯示 Toast。此次在 jsdom 驗證 disabled button 的 `.click()` 不會觸發 button 或 parent listener。另一方面，Hook 底層 guard 只 `return`，直接呼叫 `handleToggleEditMode` 時也不會顯示 Toast。
- **建議**：保留 Hook 底層硬阻斷；UI 若必須同時 disabled 與提示，使用可接收 pointer/keyboard event 的提示容器或明確 tooltip/aria 說明，不要依賴 disabled button 的 click bubbling。補 GraphToolbar component test 與 direct-hook test。

### 2.9 WARNING-04：H1 在無效 current question 時會把鎖留在 locked 狀態

- **位置**：`hooks/useQuizEngine.ts:301-310`
- **問題**：先將 `isProcessingRef.current = true` 與 `lastAnsweredQuestionIndexRef.current` 設值，再檢查 `currentQ`。若 state 暫時不一致而 `currentQ` 為 undefined，函式直接 return，且沒有清鎖；之後同一題生命週期內所有答案都會被忽略，直到重新開始或切題。
- **建議**：先取得並驗證 `currentQ`，再上鎖；或在 early return 路徑以 `finally`／明確復原保證鎖不會永久卡住。

### 2.10 WARNING-05：Practice active-limit 規格要求的裁切追蹤未實作

- **位置**：`openspec/changes/remediate-critical-sync-and-concurrency/specs/practice-session-storage/spec.md` 的 active-limit scenario；`services/storage.ts:107-125`
- **問題**：`enforceGuestPracticeSessionLimits` 會把超限 session 標為 abandoned 或移除，但沒有記錄被裁切的 sessionId；這與 modified spec 的「記錄被裁切的 sessionId 以便追蹤」不一致。
- **建議**：補上可測試的裁切記錄／診斷事件，或修訂 spec 明確移除此要求。此項不是本次 C2 漏洞的主因，但會使 OpenSpec verify 不能宣稱 100% 完整。

## 3. `ponytail-audit`：全庫 YAGNI／過度工程／死代碼

以下依技能要求以「最大可刪減量優先」列出 findings；只列複雜度與可刪減問題，不把一般 correctness/security/performance 問題冒充 Ponytail finding。

| Tag | 應刪除／收斂項目 | 替代方案 | 路徑 |
|---|---|---|---|
| `delete` | `GraphToolbar` 外層 `<div onClick>` 是死事件路徑：enabled 時條件為 false，disabled button 又不會可靠冒泡 click | 移除 wrapper；使用 tooltip/aria 或 pointer-level feedback | `components/KnowledgeGraph/GraphToolbar.tsx:175-181` |
| `yagni` | M1 的 guard／Toast 判斷散落 Hook、GraphEditor wrapper、GraphToolbar button、GraphToolbar wrapper；同一規則有多個 UI owner | Hook 保留底層 guard；保留一個 UI 層責任；將 `canSwitchToVisual` 改為必要 prop | `hooks/useGraphCodeMode.ts:27-34`、`components/KnowledgeGraph/GraphEditor.tsx:227-234`、`GraphToolbar.tsx:14-47,175-192` |
| `shrink` | dirty-bank retry 先建立 `keepIds` 再建立 `keepIdsSet`，只有 set 會被實際查詢使用 | 直接 `const keepIdsSet = new Set(toUpsert.map(...))` | `services/cloudStorage.ts:305-306` |
| `shrink` | 同一批 Question 在 caller 與 `mapQuestionToDbRow` 內重複 `ensureStableQuestionId`／`normalizeQuestionForPersistence` | 明確區分「raw input mapper」與「already-normalized row」，每個資料邊界只 normalize 一次 | `services/cloudStorage.ts:231-233,255-292,377-383` |
| `stdlib` | `aborted`／`AbortError` 字串判斷散落多處 | 提取一個 `isAbortError(error: unknown)` type guard/helper | `services/cloudStorage.ts:100,119,588,817,870,959` |
| `delete` | `ConceptNode` 在 diamond／hexagon／cloud 早退後，fallback `shapeClassName` 內的三個 key 永遠不會被讀取 | 將 fallback map 縮成實際會走到的 shape union | `components/KnowledgeGraph/ConceptNode.tsx:224-234` |
| `yagni`（低優先） | `isSyncingPracticeSessions` 與 `runWithSyncLock` 同時提供同一執行緒的互斥；雙重狀態機增加維護面 | 選定一個同頁防護來源，保留跨分頁 lock；若要保留快速返回，應以註解與測試明確其必要性 | `services/cloudStorage.ts:17,796-802` |

### 死代碼掃描結論

- `tldr dead . --lang typescript` 無法執行：本機沒有 `tldr` executable。
- 依 dead-code skill 的 fallback，執行 Knip 全項目掃描，exit 0 且無未使用檔案、依賴、export、type 或 duplicate 報告。
- 明確全文檢索確認 runtime code 已無 `applyDagreLayout`；P1 dead export 清理有效。
- 手工仍找到上表 `ConceptNode` 的三個不可達 object keys；這類 property-level dead code 不一定會被 Knip 捕獲。
- 全庫 `any` 型別掃描零命中；這是通過項，不是缺陷。

**net: -30 lines, -0 deps possible.**

## 4. `ponytail-debt` 技術債帳簿

依技能規則排除 `node_modules`、`.git`、build output，並只計算程式碼註解中的 `ponytail:` marker：

| 檔案／行 | 簡化內容 | Ceiling | Upgrade trigger | Rot risk |
|---|---|---|---|---|
| `components/KnowledgeGraph/NodeEditPanel.tsx:262` | 同時寫入 canonical `bold` 與 legacy `fontWeight`，維持 schema-v2 reader 相容性 | 2026-10-01 migration window | schema-v2 migration window closes | 低；有明確日期與觸發條件 |

統計：**1 marker、0 筆 no-trigger**。

本次已清理的 P1 `applyDagreLayout` 不再是 active marker；歷史報告中的文字引用不計入現行帳簿。

### 未標記但應追蹤的技術債

- `as unknown as` 在 production code 的型別逃生口：`ConceptNode.tsx`、`ImageNode.tsx`、`GraphEditor.tsx`、`services/graphCloudStorage.ts`。
- `GraphEditor.tsx` 約 347 行，仍聚合節點互動、工具列、匯入、佈局與面板渲染；可列為後續縮減候選，但不應為了行數指標進行無收益拆檔。

### 審計期間已修正的文件不一致

- 審計初始讀取時，`MEMORY.md` 的 FACT-054 仍寫著 `applyDagreLayout` 是 deprecated alias；本輪已與 DEC-010 及 runtime 現況統一為 purged。
- 審計初始讀取時，`CHECKLIST.md`／`docs/DEVELOPMENT_LOG.md` 的當前摘要出現 339／345 tests；本輪已將當前摘要統一為 348，歷史段落中的舊數字保留為歷史證據，不再作為現行門禁數字。

## 5. 修復優先順序

1. 先處理 CRITICAL-02、HIGH-01、HIGH-02；它們直接關係學習進度與圖譜編輯資料是否遺失。
2. 補上 M1 disabled/Toast 的可達性測試、H1 invalid-state lock 測試與 stale-lock warning 測試。
3. 決定 `tasks.md:6.1` 的 commit 交付狀態；在此之前不要把 change archive 當成完整結案。
4. 清理低風險 YAGNI 項目，並在 schema migration 完成後處理 `fontWeight` marker。
5. 同步修正 MEMORY、CHECKLIST 與 DEVELOPMENT_LOG 的矛盾數字與 alias 狀態。

## 6. 審計停止聲明

本報告只記錄審計結果與必要的文件證據，沒有修改 runtime implementation、沒有提交 Git commit，也沒有執行回滾。後續是否修復、標記任務完成或提交變更，等待使用者評估裁決。
