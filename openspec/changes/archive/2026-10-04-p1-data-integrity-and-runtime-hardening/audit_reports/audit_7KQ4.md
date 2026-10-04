# P1 Data Integrity and Runtime Hardening: Independent Final Audit

- 審計角色：第二位獨立高階 AI／runtime integrity auditor
- 審計 ID：`7KQ4`
- 審計日期：2026-10-04
- 審計範圍：OpenSpec artifacts、runtime implementation、affected tests、false-green boundaries、YAGNI/dead-code、`ponytail:` debt
- 審計結論：**CONDITIONAL PASS；無 CRITICAL 阻塞級缺陷，但有 2 項 WARNING、1 項流程證據缺口與 1 項過期技術債**

## 1. Findings First

### WARNING-01: `type` 與 `answer` 形態錯位未被 runtime guard 拒絕

- 位置：[utils/typeGuards.ts](utils/typeGuards.ts)、[components/QuizCard.tsx](components/QuizCard.tsx)、[components/QuizResult.tsx](components/QuizResult.tsx)
- `isQuestion` 只確認 `answer` 是字串或字串陣列，另行確認 `type` 是 `single`/`multiple`，但沒有要求兩者一致。
- 因此 `{ type: 'single', answer: ['A'] }` 與 `{ type: 'multiple', answer: 'A' }` 都會通過 guard。`QuizCard`、結果頁與題庫管理畫面會用不同組合判斷題型，造成選項互動、答案提交、結果標籤可能互相矛盾。
- 現有 512 個測試全綠，但沒有這兩個交叉形態 fixture；這是實際的偽綠燈，不是單純測試風格問題。
- 建議：在 `isQuestion` 中加入 `type === 'single'` 時只接受字串答案、`type === 'multiple'` 時只接受陣列答案的交叉驗證，並補上兩個負向測試。
- 分級：**WARNING（真實邏輯缺陷，但目前未證明會造成全站不可用或正式資料不可逆損毀）**。

### WARNING-02: repository 的雲端寫入入口沒有共用 runtime guard

- 位置：[services/cloudRepo.ts](services/cloudRepo.ts)、[services/cloudStorage.ts](services/cloudStorage.ts)、[services/storage.ts](services/storage.ts)
- 本地 `saveQuestions` 會經過 `parseQuestions`，但 `CloudStorageRepository.saveQuestions` 直接呼叫 `saveCloudQuestions`；後者立刻對每筆資料執行 `normalizeQuestionForPersistence`，未先以 `unknown` guard 過濾。
- 變更設計宣稱題目在 repository/Supabase 寫入端已由入口保證合法，但目前保證只在 local storage boundary 成立。任何未經 UI import 的 malformed runtime payload 都可能在雲端正規化或資料庫映射前穿透，或因缺欄位而拋錯。
- 現有整合測試只驗證 `LocalStorageRepository`，沒有 `CloudStorageRepository.saveQuestions` 的 malformed input/partial input 測試。
- 建議：在共用 repository write boundary 或 `saveCloudQuestions` 使用相同 guard；至少補雲端 repository 的混合無效、全無效與答案形態錯位測試，並明確定義全無效時的拒寫行為。
- 分級：**WARNING（規格對齊與資料完整性覆蓋缺口）**。

### PROCESS-01: E2E smoke 未在本次獨立審計中重跑

- `tasks.md` 的 6.2 與設計要求 Playwright 驗證 BOM import、Blob download、音效開關與初次 theme 載入；本次獨立執行的是受影響 Vitest、全量 Vitest、`tsc`、lint、build、knip，沒有重新執行 Playwright smoke。
- 這是驗證證據缺口，不升級為核心代碼 CRITICAL；既有單元測試不等於跨瀏覽器下載、首屏時序與真正 UI wiring 已被證明。
- 分級：**流程／證據待補，不是阻塞級邏輯缺陷**。

### PENDING-COMMIT-01: 工作樹尚有未提交變更

- `git status --short` 顯示本變更及其他檔案仍為 modified/untracked。
- 依審計規則歸類為「待提交確認」，不與 runtime correctness 混列，也不構成 CRITICAL。

## 2. OpenSpec Verify

### Completeness

- `proposal.md`、`design.md`、三份 delta spec 與 `tasks.md` 均存在且可讀。
- `tasks.md` Phase 0 至 Phase 7 全部標記 `[x]`。
- 規格所列 BOM 清洗、unknown guard、讀寫雙向防護、Blob URL、Howler consumer、`use-sound` 移除與 theme bootstrap 均有對應實作與測試檔。
- 完整性結論：**文件狀態對齊，但 6.2 的 E2E 證據本次未獨立重跑**。

### Correctness

- BOM：`BankManager.processJson` 在 JSON parse 前移除連續前導 BOM。
- Guard：`isQuestion`/`parseQuestions` 支援 `id: 0`、答案包含性、有限警告數與合法子集。
- Local storage：`getQuestions` 與 local `saveQuestions` 均使用 guard；全無效非空輸入拒絕覆寫。
- Export：使用 `Blob`、`URL.createObjectURL`、1000ms revoke 與 1000ms debounce。
- Audio：QuizCard 透過 `useSoundEffects().playQuizFeedback`，Howler play failure 被隔離，unmount 只 stop 不 unload。
- Theme：head inline bootstrap 接受 `light`/`dark`/`system`，例外 fail-open 到 light。
- Correctness 結論：**大部分 scenarios 對齊；WARNING-01/02 是尚未閉環的邊界**。

### Coherence

- 主要架構仍遵循入口驗證、重用既有 service/hook、避免新增 schema 與重量級 validator。
- `use-sound` 未出現在 source、tests、manifest 或 lockfile 掃描結果。

## 3. False-Green Audit

已實際檢查並確認以下測試只證明表面契約，未覆蓋對應極端分支：

| 風險 | 現有覆蓋 | 未覆蓋結論 |
|---|---|---|
| `type`/`answer` 錯位 | 合法 single、合法 multiple、答案不在 options | 兩種形態錯位均可通過 guard，造成下游題型語意不一致 |
| 陣列順序 | mixed array 保留合法項目；匯出 Blob 存在 | 未驗證 import dedupe/merge 後順序與同來源重複項的穩定性；目前未證明已有 regression |
| 非同步 export lifecycle | fake timer 驗證 1000ms revoke/debounce | 未驗證 1 秒內 unmount；URL revoke 可完成，但 `setIsExporting(false)` timer 未在 unmount 清理 |
| 雲端寫入 malformed payload | local repository 混合資料 | Cloud repository 直接進入 cloud normalizer，沒有同等 boundary test |
| audio unmount | hook 測 stop、不 unload | 已覆蓋主要 lifecycle；未見本次變更造成的 blocker |
| theme exception | storage/matchMedia/classList 例外 | 已覆蓋 fail-open；未重新做真實 browser first-paint smoke |

## 4. Ponytail Audit

本次變更範圍的 YAGNI/dead-code 結論：

- `delete:` `use-sound` 依賴與孤兒 mocks 已移除；這是必要且有效的減法，無殘留。
- `native:` Blob/URL API 取代 Data URI，沒有新增下載套件；符合 YAGNI。
- `yagni:` 新增的 quiz cue 被併入既有 `initSounds()`，因此每個 `useSoundEffects` mount 會一併初始化所有 battle cues 與 quiz cues。這沿用既有初始化模型，尚不足以判定為 blocker；若效能資料證明 quiz-only 頁面不需 battle preload，可再拆成真正按需初始化。
- `npx knip --reporter compact`：0 issues；沒有本次新增的不可達 export 或未使用依賴。
- Net：已移除 1 個依賴；本次沒有需要立即刪除的額外抽象。

## 5. Ponytail Debt Ledger

依 `ponytail-debt` 掃描程式碼註解（排除 node_modules、git、build output 與文件敘述）：

1. [services/storage.ts](services/storage.ts)：localStorage 暫存機制；ceiling 為 user-scoped IndexedDB 遷移；trigger 為 v2.0 全面遷移。**有 trigger，仍有效**。
2. [components/KnowledgeGraph/NodeEditPanel.tsx](components/KnowledgeGraph/NodeEditPanel.tsx)：同時保留 `fontWeight` 相容寫入；ceiling/trigger 為 schema-v2 reader 的 2026-10-01 migration window。**有 trigger，但截至 2026-10-04 已過期，屬 rot risk**。

統計：**2 markers，0 no-trigger，1 expired trigger**。第二項不屬本次 P1 核心變更，應另排清理，不應升級為本次 CRITICAL。

## 6. Verification Evidence

- 受影響測試：**5 files / 68 tests passed**。
- 全量 Vitest：**71 files / 512 tests passed**。
- `npx tsc --noEmit`：**passed**。
- `npm run lint`：**passed**。
- `npm run build`：**passed**；保留既有 `vendor-ui-core` 大於 500 kB 的非阻塞 warning。
- `npx knip --reporter compact`：**0 issues**。
- `use-sound` source/test/manifest/lockfile 掃描：**無命中**。

## 7. Final Decision

- **CRITICAL：0**。沒有證據顯示本次變更會立即造成不可恢復的正式資料損毀、全站崩潰或安全邊界失效。
- **WARNING：2**。應優先處理 `type`/`answer` 形態一致性與雲端 repository write guard，否則「所有題目寫入入口皆已驗證」的宣稱不成立。
- **流程待確認：2**。E2E smoke 本次未獨立重跑；工作樹尚未提交。兩者均不得誤標成核心代碼 CRITICAL。
- **建議判定：CONDITIONAL PASS / HOLD FOR OWNER EVALUATION**。本報告完成後不修改 runtime、不提交、不回滾，等待負責人決定是否修正 WARNING 或直接接受風險。