# P1 資料完整性與執行期防禦硬化 — 第三方獨立最終審計

- 審計變更：`openspec/changes/p1-data-integrity-and-runtime-hardening`
- 審計角色：第三位獨立高階 AI（與前兩份審計無關聯之複核者）
- 審計 ID：`K7D2`
- 審計日期：2026-10-04
- 審計範圍：proposal / design / specs(3) / tasks、實作差異（`utils/typeGuards.ts`、`services/storage.ts`、`services/cloudStorage.ts`、`services/cloudRepo.ts`、`components/BankManager.tsx`、`components/QuizCard.tsx`、`hooks/useSoundEffects.ts`、`index.html`）、新增測試（5 檔）、品質閘門重跑、偽綠燈極端分支、YAGNI、技術債帳簿
- 審計結論：**CONDITIONAL PASS — 0 項 CRITICAL，3 項 WARNING，2 項流程待確認。本報告完成後不修改程式碼、不提交，等待負責人評估。**

> 本審計已讀取前兩份報告（`audit_7KQ4.md`、`audit_inquisitor_9e2b.md`）作為交叉比對，但所有閘門與程式碼斷言均為本次獨立重跑、獨立讀碼，不沿用其證據。

---

## 1. OpenSpec 規格與實作對齊（openspec-verify-change）

### 1.1 Completeness（完整性）

- `proposal.md`、`design.md`、`specs/question-data-integrity/spec.md`、`specs/quiz-audio-howler/spec.md`、`specs/dark-mode-bootstrap/spec.md`、`tasks.md` 均存在且可讀。
- `tasks.md` Phase 0–7 全數標記 `[x]`。經比對，勾選狀態與實際程式碼/測試存在情況一致（BOM、guard、讀寫雙向門禁、Blob 匯出、Howler consumer、`use-sound` 移除、theme bootstrap 皆有對應實作與測試檔）。
- 唯一例外是交付型項目：工作樹仍髒（見 §5 PENDING-COMMIT），此為「待提交確認」，不計入程式碼完整性缺口。

### 1.2 Correctness（正確性抽核）

| 規格要求 | 實作位置 | 本次抽核結果 |
|---|---|---|
| BOM 清洗僅清開頭 `\uFEFF+` | `components/BankManager.tsx:331` `jsonString.replace(/^\uFEFF+/, '')` | ✅ 通過，不傷內文 Unicode |
| 非陣列 root 拒收、不寫入 | `BankManager.tsx:334-351`、`utils/typeGuards.ts:114-120` | ✅ 通過，全無效不開 confirm、不 save |
| `parseQuestions` 有界警告（5 則 + 聚合）且不洩漏答案 | `utils/typeGuards.ts:107-154` | ✅ 通過，warn 僅含 source/index/id |
| `id: 0` 相容、可選空字串容錯 | `typeGuards.ts:20-25, 86-102` | ✅ 通過 |
| 答案 ⊆ 選項（死鎖防禦） | `typeGuards.ts:42-58` | ✅ 通過（但見 WARNING-01：未做 `type`×`answer` 交叉） |
| `getQuestions`/`saveQuestions` 雙向門禁、全無效拒寫、count 對齊 | `services/storage.ts:623-658` | ✅ 通過 |
| legacy migration count 取合法數 | `services/storage.ts:512-521` | ✅ 通過 |
| Blob 匯出 + 1000ms revoke + 連點防抖 | `BankManager.tsx:402-429` | ✅ 通過（但見 WARNING-03：unmount timer 未清理；另見 §2 計數不對稱） |
| QuizCard 接 Howler、`use-sound` 零殘留 | `QuizCard.tsx:11,63,290`、`useSoundEffects.ts:261-277` | ✅ 通過；`package.json` 已無 `use-sound`（本次 grep 確認零命中，僅 `.memory-index` 歷史敘述殘留，不屬 source/test/manifest） |
| theme bootstrap fail-open、key 語意一致 | `index.html:52-70` | ✅ 通過；`mindspark_theme`、`light/dark/system`、`matchMedia` try/catch 均具備 |

### 1.3 Coherence（連貫性）

- 實作遵循 design.md「入口驗證、下游簡化、重用既有抽象」：未新增 schema migration、後端 endpoint、第二套 SFX key、重量級驗證套件。
- 唯一設計偏離為 WARNING-02（雲端寫入入口未共用 guard），詳見 §2。

---

## 2. 偽綠燈（False Green）深度審查

本次獨立重跑：受影響 5 檔 **68/68 通過**，全量 **71 檔 512/512 通過**，與前兩份報告一致。但以下極端分支確實「測試全綠、程式碼仍有缺口」：

### WARNING-01：`type` × `answer` 形態錯位可通過 guard（確認存在，危害度下修）

- 位置：`utils/typeGuards.ts:44-63`。
- 現狀：`isSingleAnswerValid` / `isMultipleAnswerValid` 為 OR 關係，`type` 僅做列舉檢查（`single`/`multiple`），未要求 `type === 'single' ⇒ answer 為字串`、`type === 'multiple' ⇒ answer 為陣列`。
- 因此 `{ type: 'single', answer: ['A'] }` 與 `{ type: 'multiple', answer: 'A' }` 皆可通過。現有 `typeGuards.test.ts` 無此交叉 fixture，此為真偽綠燈，本審計同意前兩份報告的「存在性」判斷。
- **獨立加值／危害度修正**：前案稱「下游 `(answer as string[]).map` 將拋 `TypeError` 致崩潰」，本次全庫搜尋未發現此類寫法。實際下游一律以 `Array.isArray(answer)` / `isMultipleAnswer()` 派發（`QuizCard.tsx:165,170-171`、`BankManager.tsx:263`、`utils/questionIdentity.ts:64`、`services/ai.ts:184`），且 `QuizCard.tsx:165` 以 `type === 'multiple' || isMultipleAnswer()` 取 OR，錯位資料會被「寬容渲染」而非崩潰。最壞情況是單/多選互動與標籤語意不一致（例如 `type: 'single'` 卻渲染多選框），屬 UI 語意錯誤而非全站崩潰或資料不可逆損毀。故維持 **WARNING（中低）**，不升 CRITICAL。修復建議與前案相同：補兩行交叉檢查 + 兩個負向測試。

### WARNING-02：雲端寫入入口無共用 guard（確認存在，非本地問題）

- 位置：`services/cloudRepo.ts:75-77` 直調 `saveCloudQuestions`；`services/cloudStorage.ts:381-394` 直接 `normalizeQuestionForPersistence(ensureStableQuestionId(q))` → `mapQuestionToDbRow` → upsert，全程未經 `parseQuestions`。
- 本地 `saveQuestions` 有門禁，但任何繞過 UI import、直呼 cloud repository 的 malformed payload 可穿透至正規化/DB 映射（缺欄位時可能拋錯或寫入畸形列）。現有 `cloudStorage.test.ts` 僅測 keep-list/upsert 成功失敗，無 malformed/partial/mismatch fixture。
- design.md §3.2 宣稱「repository/Supabase 寫入端已由入口保證合法」，該宣稱目前僅對 local boundary 成立。此為規格對齊缺口，列 **WARNING**。修復：在 `saveCloudQuestions` 入口加同一 guard 並定義全無效拒寫語意（注意其現有 `keepIds.length === 0 → forceDeleteAll` 語意需一併釐清，避免 guard 後空陣列誤觸全刪保護）。

### WARNING-03（新）：匯入成功 Toast 計數兩端不對稱（append 模式誇大）

- 位置：`components/BankManager.tsx:342-376` 對照 `utils/questionIdentity.ts:185-233`。
- 現狀：`skippedCount = rawCount - validQuestions.length`（guard 層略過），但 Toast 以 `mergedQuestions.length` 作為「成功匯入 X 題」（`BankManager.tsx:373`）。
- 在 `append` 模式 `merged = existing + newImported`（`questionIdentity.ts:205`），Toast 數字含既有題庫（例如庫內 10 題、匯入 5 題 → 顯示「成功匯入 15 題」）；在 `replace/merge` 模式 `merged = resolvedImported`（已扣 dedupe），dedupe 掉的題數未被計入任何一端，`成功 + 略過 ≠ 原始`。
- 現有匯入測試以空庫為基線，`merged == imported` 恆成立，故全綠卻掩蓋此分支。此為本次第三審計新增發現，列 **WARNING（低，UI 誠實性）**，不升 CRITICAL。建議：Toast 分開顯示「新增 N / 更新 M / 略過 K」，或至少以 `data.length`（待匯入）而非 `mergedQuestions.length`（合併後全庫）作為成功數。

### 非阻塞／已充分覆蓋（明確寫下，避免誤升級）

| 風險 | 抽核結論 |
|---|---|
| 陣列順序錯位 | `parseQuestions` 保留合法項相對順序；`planQuestionImport` dedupe/merge 語意有測試意圖，無回歸證據。不列級別，僅建議後續若動 merge 排序再補穩定性測試 |
| 非同步匯出 unmount（`BankManager.tsx:417-427` 雙 `setTimeout 1000` 無 cleanup） | `revokeObjectURL` 照常釋放、無洩漏；`setIsExporting(false)` 對已卸載元件在 React 18 無致命警告。列為 SUGGESTION（unmount 清 timer），不列 WARNING |
| 部分損毀覆寫（100 題進、1 有效 → 覆寫為 1 題） | Spec 明定僅「全無效拒寫」，部分有效即覆寫為設計取捨；BankManager 另有 confirm + Toast。前案 FG-03 定性為「架構取捨」正確，本審計維持，不列級別 |
| 音效 unmount | `useSoundEffects.ts:224-229` 返 `stop()` 不 `unload()`，符合 spec「保留解碼緩衝」；quiz/battle 各自 ref，不互清。已覆蓋，不列級別 |
| theme 首屏 | inline script fail-open 完整；jsdom 覆蓋四態 + 雙例外。真機 first-paint 屬 E2E 證據缺口（見 PROCESS-01），非單元缺口 |

---

## 3. Ponytail Audit（本次變更範圍，YAGNI / 死碼）

> 依 `ponytail-audit`：只審過度工程，不審正確性/安全/效能；一 finding 一行，刪減量結尾。

- `delete: use-sound` 依賴 + 2 處孤兒 `vi.mock` 已刪，`package.json`/`package-lock` 無殘留。正確減法。[`package.json`, `src/__tests__/autoAdvance.test.tsx`, `src/__tests__/remediateBypass.challenger.test.ts`]
- `native: Blob + URL.createObjectURL` 取代 Data URI/`encodeURIComponent`，零新依賴。正確。[components/BankManager.tsx:402-429]
- `shrink: isRecord` 內聯私有、不對外 export。正確，無公共 API 膨脹。[utils/typeGuards.ts:6-8]
- `yagni(觀察，非砍)：initSounds()` 每次 mount 一併初始化 BGM + 12 battle cues + 2 quiz cues（`useSoundEffects.ts:92-154,167-169`）。quiz-only 頁面亦預載全量 battle 解碼，屬既有初始化模型沿用；無效能數據證明為瓶頸，**不建議本次拆分**，僅記錄供後續以實測數據再議。

結尾：`net: -1 dep, 0 新增抽象需刪。Lean already. Ship.`（`npx knip --reporter compact` 本次重跑：0 issues）

---

## 4. Ponytail Debt（技術債帳簿）

全庫 `ponytail:` 掃描（排除 node_modules/.git/build）：**2 markers，0 no-trigger**，與前案一致：

1. `services/storage.ts:36` — localStorage 暫存機制；ceiling：v2.0 全面遷移至 user-scoped IndexedDB 後退役；trigger：IndexedDB 遷移。狀態：**有效（Active & Documented）**，非本次範圍。
2. `components/KnowledgeGraph/NodeEditPanel.tsx:266` — `fontWeight` 相容別名保留；ceiling/trigger：schema-v2 reader 之 2026-10-01 migration window。狀態：**已屆期（Rot Risk，截至本審計 2026-10-04 已過 3 天）**，應另排清理。本項與 P1 變更無依賴，**不得升級為本次 CRITICAL**。

---

## 5. 等級嚴格劃分（阻塞缺陷 vs 流程標記）

### CRITICAL（阻塞級邏輯缺陷）：0 項

- 無證據顯示本次變更造成正式資料不可逆損毀、全站崩潰、安全邊界失效或閘門失敗。

### WARNING（建議修，但不阻擋結案判斷，交負責人決定）：3 項

- WARNING-01：`type`×`answer` 交叉一致性（中低，UI 語意）。
- WARNING-02：雲端寫入入口缺 guard（中，規格宣稱缺口；修時注意 `forceDeleteAll` 語意互動）。
- WARNING-03：匯入 Toast 計數不對稱（低，UI 誠實性；本報告新增）。

### SUGGESTION：1 項

- BankManager 匯出雙 timer 加 unmount cleanup（`isMountedRef` 或存 timer id 於 effect cleanup 清除）。

### 待提交確認 / 流程證據（非 CRITICAL，嚴禁混淆）：2 項

- **PENDING-COMMIT-01**：`git status --short` 本次重跑仍顯示大量 modified（`components/BankManager.tsx`、`QuizCard.tsx`、`services/storage.ts`、`hooks/useSoundEffects.ts`、`index.html`、`package.json` 等）+ untracked（`openspec/changes/p1-.../`、`bankManagerImportExport.test.tsx`、`questionDataIntegrity.test.ts`、`quizAudio.test.tsx`、`themeBootstrap.test.ts`、`typeGuards.test.ts`）。歸類為**待提交確認**，非程式碼缺陷。是否 `git commit` 結案由負責人決定，本審計不執行提交。
- **PROCESS-01（E2E 證據缺口）**：`tasks.md` 6.2（Playwright：BOM import、Blob download、音效開關不阻塞作答、dark/system 首載，desktop/mobile 各一 viewport）本次未重跑；前案亦未重跑。單元全綠 ≠ 跨瀏覽器下載/首屏時序已證。列為流程待補，非 CRITICAL。

---

## 6. 本次獨立驗證證據

- `npx tsc --noEmit`：**通過**（本次重跑，0 錯誤）。
- 受影響 5 檔：`typeGuards` + `questionDataIntegrity` + `bankManagerImportExport` + `quizAudio` + `themeBootstrap`：**68/68 通過**（本次重跑）。
- 全量 `npm test -- --run`：**71 檔 512/512 通過**（本次重跑；stderr 內 Supabase mock 缺 `auth.getUser`、Howler 無 codec 等皆為既有測試預期內噪音，非失敗）。
- `npm run lint`：**通過**（0 錯誤）。
- `npm run build`：**通過**（`vendor-ui-core` > 500 kB 既有非阻塞 warning）。
- `npx knip --reporter compact`：**0 issues**（本次重跑）。
- `use-sound` 掃描：`package.json` 零命中；source/test 無 `vi.mock('use-sound')` 殘留（僅 `.memory-index` 歷史審計敘述提及，非程式碼殘留）。
- `.skip(`/`.only(`：全庫零命中。新增 `any`：`tsc` 通過且抽核 guard/storage/BankManager 無 `any`。

---

## 7. 最終判定

- **CRITICAL：0**。本次變更具備結案條件，阻擋項為零。
- **WARNING：3**（§2）。若負責人選擇直接接受風險，建議至少將 WARNING-01/02/03 登記為後續追蹤項，而非視為已修復。
- **流程：2**（PENDING-COMMIT-01、PROCESS-01）。E2E 與提交與否由負責人裁量，不得誤標為程式碼 CRITICAL。
- **判定：CONDITIONAL PASS / 同意結案（附 3 WARNING + 1 屆期技術債另排清理），等待負責人評估。**

*（審計者 K7D2 於報告寫入後即停止，不修改程式碼、不提交、不回滾。）*
