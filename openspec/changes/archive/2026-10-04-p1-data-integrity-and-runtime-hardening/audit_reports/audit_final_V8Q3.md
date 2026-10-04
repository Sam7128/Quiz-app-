# P1 資料完整性與執行期防禦硬化 — 最終交叉覆核審計報告（Final Cross-Validation Audit）

- **審計變更**：`openspec/changes/p1-data-integrity-and-runtime-hardening`
- **審計角色**：第四位獨立高階 AI — 交叉覆核／最終收斂審計員（Cross-Validation Synthesizer）
- **審計 ID**：`V8Q3`
- **審計日期**：2026-10-04
- **審計方法**：
  1. 讀取前三份獨立報告（`audit_7KQ4.md`、`audit_inquisitor_9e2b.md`、`audit_K7D2.md`）建立交叉比對基準
  2. 逐項獨立重跑品質閘門（tsc / Vitest 受影響 5 檔 + 全量 / lint / build / knip / 依賴殘留掃描）
  3. 對三份報告之所有 findings 進行獨立讀碼驗證（confirm / reject / 升級 / 降級）
  4. 偽綠燈（False Green）極端分支獨立剖析：`type×answer` 錯位、計數兩端不對稱、匯出非同步生命週期、雲端讀寫邊界
  5. `ponytail-audit`（YAGNI／不可達代碼）與 `ponytail-debt`（技術債帳簿）全庫掃描
- **最終判定**：**CONDITIONAL PASS — 0 項 CRITICAL 阻塞級缺陷；3 項 WARNING（其中 1 項較前三份報告擴大了範圍）；2 項 SUGGESTION；2 項流程待確認。本報告完成後不修改任何程式碼、不執行 git commit、不回滾，立即停止並等待負責人評估。**

---

## 1. 執行摘要（Findings First）

| # | 分級 | 標題 | 共識狀態 |
|---|------|------|----------|
| W-01 | WARNING（中低） | `isQuestion` 未做 `type`×`answer` 形態交叉驗證，錯位資料可通過 guard | 三份報告一致確認；**駁回「下游 TypeError 崩潰」之衝擊推論**（詳 §3.1） |
| W-02 | WARNING（中） | 雲端邊界缺共用 guard — **含本審計新擴增之 read path 缺口** | 前三案僅涵蓋寫入端；本審計確認 `getCloudQuestions` 讀取端同樣無 guard，且直接餵入 quiz engine（詳 §3.2） |
| W-03 | WARNING（低） | 匯入 Toast 計數兩端不對稱（append 模式誇大、merge/replace 模式帳目不平） | K7D2 獨有發現；本審計取得**測試斷言直接固化錯誤行為的鐵證**（詳 §3.3） |
| S-01 | SUGGESTION | 匯出雙 `setTimeout` 無 unmount cleanup | 三份報告一致；確認無洩漏、React 18 無致命警告 |
| S-02 | SUGGESTION（觀察） | `useSoundEffects` 多實例 `isSfxEnabled` 狀態僅於 mount 時讀 localStorage，跨實例無即時同步 | 本審計補充觀察；**屬既有架構限制，非本次引入**（詳 §3.5） |
| P-01 | 流程證據缺口 | tasks.md 6.2（Playwright smoke）標記 `[x]`，但**儲存庫內不存在任何對應證據**（無 spec、無執行紀錄） | 本審計將前三案之「審計時未重跑」**升級為「證據本身不存在」**（詳 §3.4） |
| P-02 | 待提交確認 | 工作樹仍有大量 modified/untracked 檔案 | 三份報告一致；依規則歸類為待提交確認，嚴禁與代碼 CRITICAL 混淆 |
| P-03 | 範圍衛生備註 | 3+2 個 blast radius 宣告外的檔案被修改（良性 lint/knip 清理） | 本審計新增（詳 §3.6） |

---

## 2. 獨立重跑之驗證證據（本次審計親自執行）

| 閘門 | 指令 | 結果 |
|------|------|------|
| TypeScript 編譯 | `npx tsc --noEmit` | ✅ exit 0，0 errors |
| 受影響 5 測試檔 | `npx vitest run`（typeGuards / questionDataIntegrity / bankManagerImportExport / quizAudio / themeBootstrap） | ✅ **68/68 passed** |
| 全量單元測試 | `npm test -- --run` | ✅ **71 files / 512 tests passed** |
| Lint | `npm run lint` | ✅ exit 0 |
| 生產打包 | `npm run build` | ✅ exit 0；`vendor-ui-core 1,295.89 kB > 500 kB` 為既有非阻塞警告 |
| 死碼掃描 | `npx knip --reporter compact` | ✅ 0 issues |
| `use-sound` 殘留 | source / tests / `package.json` / `package-lock.json` 掃描 | ✅ 0 命中 |
| `.skip(` / `.only(` | 全 source/test 掃描 | ✅ 0 命中 |
| 工作樹狀態 | `git status --short` | ⚠️ 21 個 modified + 5 個新測試檔 + change 資料夾 untracked（→ P-02） |

---

## 3. 偽綠燈（False Green）深度交叉覆核

本次全量 512 測試全綠，但以下分支確實屬「測試綠燈、程式碼仍有缺口」。

### 3.1 W-01：`type` × `answer` 形態錯位可通過 guard（確認存在；衝擊定調修正）

- **位置**：`utils/typeGuards.ts:44-63`。`isSingleAnswerValid` / `isMultipleAnswerValid` 為 OR 關係；`type` 欄位（61-63 行）僅做列舉檢查，未要求 `type === 'single' ⇒ answer 為字串`、`type === 'multiple' ⇒ answer 為陣列`。
- **偽綠燈證據**：`typeGuards.test.ts` 覆蓋了合法 single、合法 multiple、死鎖答案、`id: 0`、空字串可選欄位、警告聚合與洩漏防護，**唯獨沒有 `{ type: 'single', answer: ['A'] }` 與 `{ type: 'multiple', answer: 'A' }` 兩個交叉 fixture**。
- **交叉覆核裁定**：
  - 存在性：三份報告一致，本審計讀碼確認 ✅。
  - 衝擊：`audit_inquisitor_9e2b` FG-01 宣稱下游 `(question.answer as string[]).map` 會拋 `TypeError` 導致前端崩潰。本審計全庫掃描 `answer as string[]`、`.answer.map`、`answer).map` **均零命中**；實際下游一律以 `Array.isArray` / `isMultipleAnswer()` 派發（`QuizCard.tsx:165,170`、`QuizResult.tsx:93-94`、`BankManager.tsx:263`、`utils/questionIdentity.ts:64`、`services/ai.ts:184`），且 `QuizCard.tsx:165` 用 OR 語意寬容渲染。**K7D2 的降級判斷（UI 語意不一致，非崩潰）正確，inquisitor 的崩潰情境不成立**。
- **分級**：**WARNING（中低，UI 題型語意）**。修復成本極低：`isQuestion` 補兩行交叉檢查（保持 `type === undefined` 時的雙形態容錯）+ 兩個負向測試。
- **不可升級 CRITICAL 之理由**：無崩潰路徑、無資料損毀、無安全邊界失效；錯位資料需先通過匯入/guard 才會出現，而目前僅有歷史髒資料或外部寫入者可產生。

### 3.2 W-02：雲端邊界缺共用 guard（確認存在；本審計擴增至 read path）

- **寫入端**（前三案已確認）：`CloudStorageRepository.saveQuestions`（`cloudRepo.ts:75-77`）直呼 `saveCloudQuestions`（`cloudStorage.ts:381-394`），後者對每筆資料直接執行 `normalizeQuestionForPersistence(ensureStableQuestionId(q))` → `mapQuestionToDbRow` → upsert，全程未經 `parseQuestions`。`questionDataIntegrity.test.ts` 只測 `LocalStorageRepository`，雲端 repository 零 malformed fixture。
- **讀取端（本審計新增）**：`getCloudQuestions`（`cloudStorage.ts:188-211`）將 DB row 直接映射為 `Question`，**同樣無 guard**。而 `RepositoryContext.tsx:13` 對已登入用戶選擇 `CloudStorageRepository`，其 `getQuestions` 直接餵入 `useQuizEngine.ts:171,240,266,378`、`useAppDataLoader.ts:57,78`、`useChunkedPractice.ts:113,186`、`Dashboard.tsx:98`、`ShareModal.tsx:50`。
- **具體危害向量**：若 DB 中存在畸形 row（如 `options: null` 或答案不在選項內——可能由其他客戶端、歷史資料或外部寫入產生），登入用戶的 quiz pool 會直接收到未驗證資料：`options: null` 會在 `QuizCard.tsx:176` 的 `[...question.options]` 拋 `TypeError`（渲染崩潰）；「答案不在選項內」的死鎖題會穿透本次變更的核心防護目標。
- **規格對齊缺口**：`design.md` §3.2 宣稱「repository/Supabase：入口與寫入端已保證合法 `Question[]`」——此宣稱目前**僅對 local storage 邊界成立**。spec 的 requirement 列舉「JSON、localStorage、saveQuestions 寫入入口或 legacy migration」未明確包含雲端 DB 讀取，但設計文件的宣稱已使其成為對齊缺口。
- **分級**：**WARNING（中）**。不升 CRITICAL 之理由：(a) 觸發前提是 DB 內已有畸形資料，非本次變更引入；(b) 訪客模式（local）已完全閉環防護；(c) 無證據顯示現網 DB 已有此類髒資料。
- **修復注意**（採納 K7D2 提醒）：在 `saveCloudQuestions` 加 guard 時，必須釐清與 `cloudStorage.ts:408-413` `keepIds.length === 0 → forceDeleteAll` 保護的互動——全無效非空輸入應在 upsert 前即拒寫（鏡像 local `saveQuestions` 語意），不得讓過濾後的空陣列誤入「全刪或拋錯」分支。read path 修復只需在 `getCloudQuestions` return 前包一層 `parseQuestions(rows, 'cloud.getQuestions')`。

### 3.3 W-03：匯入 Toast 計數兩端不對稱（確認存在；取得測試固化鐵證）

- **位置**：`BankManager.tsx:353,373,375`。`skippedCount = rawCount - validQuestions.length`（guard 層略過），但 Toast 以 `mergedQuestions.length` 作為「成功匯入 X 題」。
- **機制**（`utils/questionIdentity.ts:204-214` 驗證）：
  - `append` 模式：`merged = [...existing, ...newImported]` → Toast 數字**含既有題庫**（匯入 1 題入 2 題庫顯示「成功匯入 3 題」）。
  - `replace/merge` 模式：`merged = resolvedImported`（已扣 dedupe）→ dedupe 掉的題數不計入成功也不計入略過，**成功 + 略過 ≠ 原始**。
- **偽綠燈鐵證**：`bankManagerImportExport.test.tsx:134,163` 以**空庫 2 題既有 + 匯入 1 題**的情境斷言 `toHaveBeenCalledWith('成功匯入 3 題！')` —— 測試不是「沒測到」這個錯誤行為，而是**把它固化為期望值**；部分有效測試（285-287 行）只用 `stringContaining('已自動略過 1 題')` 繞過成功數字。這是教科書級的偽綠燈。
- **分級**：**WARNING（低，UI 誠實性）**。建議：成功數改用 `analysis.newQuestionCount + analysis.updatedQuestionCount`（或 `data.length`），dedupe 資訊已在確認對話框呈現，Toast 無需重複。

### 3.4 P-01：tasks.md 6.2 E2E 證據不存在於儲存庫（本審計將缺口升級定性）

- **前三案定性**：7KQ4 / K7D2 均稱「本次審計未重跑 Playwright smoke」——僅是審計者未重跑。
- **本審計事實**：
  1. `e2e/` 全部 13 個 spec 中，**無任何 BOM 匯入、Blob download、答題音效開關、dark/system 首屏載入的測試**。`json-import.spec.ts` 只測貼上文字匯入（無 BOM）；`battle-flow.spec.ts:49` 的 `mindspark_sfx_enabled` 是既有戰鬥音效設定，非新 quiz feedback 消費鏈。
  2. `docs/DEVELOPMENT_LOG.md` 本次變更條目的品質閘門清單（tsc / test / lint / build / knip / use-sound 掃描）**不含任何 Playwright 結果**。
  3. 6.2 自訂的 grep 指令 `--grep "import|audio|theme"` 即使執行，也只會命中上述既有 spec——**命令本身無法驗證 6.2 範圍所列的四項新功能**。
  4. 6.2 的回滾條款要求「記錄環境限制」——儲存庫內亦無此紀錄。
- **裁定**：6.2 勾選 `[x]` 缺乏可追溯證據。依規則歸類為**流程證據缺口**（勾選與證據不符），**非阻塞級邏輯缺陷**。處置二選一：(a) 補跑專用 smoke 並記錄結果；(b) 由負責人明示接受單元測試覆蓋已足、將 6.2 降級為單元層驗證並修正其敘述。

### 3.5 S-02（觀察）：`useSoundEffects` 多實例 SFX 狀態僅 mount 時同步

- `useSoundEffects` 的 `isSfxEnabled` 為 per-instance `useState`（mount 時讀 `mindspark_sfx_enabled`），跨實例無 storage event / shared store 同步。`QuizCard`（AppContent:192）與 `SettingsModal`（GlobalModals，AppContent:267）可同時掛載——測驗中透過 Settings 切換 SFX，已掛載的 QuizCard 實例不會即時跟隨（QuizCard 自身頭部有音效切換鈕可獨立操作）。
- **明確定性**：此為**既有鉤子架構限制**（Settings↔BattleArena 在本次變更前即如此），非本次引入；且較舊行（QuizCard 私有 `soundEnabled` 完全不接全域 key）已屬改善。spec scenario「SFX disabled 時抑制音效」在單實例語意下成立。列 **SUGGESTION** 供後續以 shared store 收斂，本次不要求修改。

### 3.6 P-03（範圍衛生備註）：blast radius 外的修改檔案

`git diff` 顯示本次工作樹另含 proposal 未宣告的修改：`AppSessionContainer.tsx`（移除未用解構 prop）、`services/analytics.ts`（`setItem` 包 try/catch）、`focusTimerStats.test.tsx` / `useQuizEngine.userAnswerMap.test.ts`（移除未用 import/變數）。皆為良性 lint/knip 驅動清理，`tsc`/`lint`/全量測試均通過。**不列缺陷**，但提交時應在 commit message 如實宣告，避免審計軌跡與實際 diff 不一致。

### 3.7 已充分覆蓋、明確不列級的項目（防止誤升級）

| 風險 | 覆核結論 |
|---|---|
| 陣列順序錯位 | `parseQuestions` 以 for-loop 保序；`planQuestionImport` append/merge/replace 的串接順序經讀碼無回歸跡象。不列級 |
| 匯出 revoke 生命週期 | `URL.revokeObjectURL` 於閉包中必然執行，unmount 不造成洩漏；僅 `setIsExporting(false)` 對已卸載元件無害觸發（→ S-01） |
| 部分損毀覆寫（100 題進 1 有效 → 覆寫為 1 題） | spec 明定只要求「全無效拒寫」；BankManager 有 confirm 對話框 + 略過數 Toast。設計取捨，正確不列級 |
| 音效 unmount | `useSoundEffects.ts:213-229` cleanup 僅 `stop()` 不 `unload()`，符 spec「緩衝常駐」；latest-wins 與 Howler throw 降級均有測試。已覆蓋 |
| theme bootstrap | `index.html:52-70` fail-open 完整；`themeBootstrap.test.ts` 覆蓋四 theme 態 + 無效值 + storage/matchMedia/classList 三類例外 + script 位置斷言。單元層已閉環；真機首屏屬 P-01 範疇 |
| BOM 清洗 | `replace(/^\uFEFF+/, '')` 僅清開頭、不傷內文；雙 BOM 有測試。已閉環 |

---

## 4. OpenSpec 規格與實作對齊（openspec-verify-change 三維度）

### 4.1 Completeness — ✅ 通過（附 P-01 例外）

- proposal / design / 3 份 delta spec / tasks 全部存在可讀；Phase 0–7 全數 `[x]。
- BOM、guard、讀寫雙向門禁、Blob 匯出、Howler consumer、`use-sound` 移除、theme bootstrap、`CHECKLIST.md` 與 `docs/DEVELOPMENT_LOG.md` 更新（7.2）均有對應實作與紀錄。
- 唯一例外：6.2 的勾選缺乏儲存庫內證據（P-01）；交付型「git commit 結案」屬 P-02 待提交確認。

### 4.2 Correctness — ✅ 大幅對齊（W-01/02/03 為未閉環邊界）

| Spec 要求 | 實作位置 | 本次抽核 |
|---|---|---|
| BOM 容忍匯入 | `BankManager.tsx:331` | ✅ |
| 非陣列 root 拒收、不 save 不 confirm | `BankManager.tsx:334-340`、`typeGuards.ts:114-120` | ✅ |
| `id: 0`／空字串可選欄位容錯 | `typeGuards.ts:20-25, 86-102` | ✅（有正負有限數值 id 測試） |
| 答案 ⊆ 選項死鎖防禦 | `typeGuards.ts:42-58` | ✅（但 `type`×`answer` 交叉缺 → W-01） |
| 有界警告（5 則 + 聚合）不洩漏答案 | `typeGuards.ts:107-154` | ✅（聚合計數與 secret-leak 測試均過） |
| `getQuestions`/`saveQuestions` 雙向門禁、全無效拒寫、count 對齊 | `storage.ts:623-658` | ✅（含非陣列 payload 拒寫測試） |
| legacy migration 以合法數計 | `storage.ts:502-527` | ✅（混合 legacy fixture 測試） |
| Blob 匯出 + 1000ms revoke + 防抖 + 錯誤降級 | `BankManager.tsx:402-429` | ✅（500ms/1000ms 精準斷言、5 連擊防抖、createObjectURL throw 降級） |
| QuizCard 接 Howler、SFX 抑制、失敗不阻塞作答 | `QuizCard.tsx:11,63,290`、`useSoundEffects.ts:261-277` | ✅ |
| `use-sound` 零殘留 | 全庫掃描 | ✅（mock 已改 howler 直 mock，乾淨） |
| theme pre-paint bootstrap + fail-open | `index.html:52-70` | ✅ |

### 4.3 Coherence — ✅ 通過

- 遵循「入口驗證、下游簡化、現有抽象重用」：無新 schema、無新依賴（淨 -1）、無第二套 SFX key、無重量級驗證套件。
- 唯一設計偏離為 W-02（雲端邊界宣稱未落實），已列 WARNING。

---

## 5. Ponytail Audit（本次變更範圍，YAGNI／不可達代碼）

- `delete:` `use-sound` + 2 處孤兒 `vi.mock` 已徹底移除，`package.json`/lockfile 零殘留——必要且有效的減法。
- `native:` Blob + `URL.createObjectURL` 取代 Data URI——零新依賴，正確。
- `shrink:` `isRecord` 內聯私有、不對外 export——無公共 API 膨脹。
- `yagni（觀察，不砍）：` `initSounds()`（`useSoundEffects.ts:92-154`）每次 mount 一併初始化 BGM + 12 個 battle cues + 2 個 quiz cues；quiz-only 頁面亦預載全量 battle 音效解碼。屬既有初始化模型沿用，無效能數據證明為瓶頸，**本次不建議拆分**，僅記錄待實測再議。
- `npx knip --reporter compact` 本次重跑 0 issues：無本次新增的不可達 export / 未用依賴 / 死檔案。
- **Net：-1 dependency，0 新增抽象需刪。Lean already.**

---

## 6. Ponytail Debt（技術債帳簿）

全庫 `ponytail:` 掃描（排除 node_modules/.git/build output/.memory-index 歷史敘述）：

| # | 位置 | 內容 | Ceiling / Trigger | 狀態 |
|---|------|------|-------------------|------|
| D-1 | `services/storage.ts:36` | localStorage 暫存機制 | v2.0 遷移 user-scoped IndexedDB 後退役 / trigger：IndexedDB 遷移 | 🟢 有效（Active & Documented） |
| D-2 | `components/KnowledgeGraph/NodeEditPanel.tsx:266` | `fontWeight` 相容寫入（schema-v2 readers） | 2026-10-01 migration window / trigger：窗口關閉 | 🔴 **已過期 3 天（Rot Risk）**，應另排清理 |

**統計：2 markers，0 no-trigger，1 expired。** 本次變更未新增任何 marker。D-2 與本 P1 變更無依賴關係，**不得升級為本次 CRITICAL**，應排入下一輪維護清償。

---

## 7. 問題等級嚴格劃分（阻塞級邏輯缺陷 vs 流程標記）

### 🛑 CRITICAL（阻塞級邏輯缺陷）：**0 項**

無證據顯示本次變更造成正式資料不可逆損毀、全站崩潰、安全邊界失效或任何閘門失敗。四道閘門 + 512 測試 + 依賴掃描本次全部獨立重跑通過。

### ⚠️ WARNING（真實邏輯／對齊缺口，建議修，交負責人決定）：**3 項**

1. **W-01**：`isQuestion` 補 `type`×`answer` 交叉驗證（2 行 + 2 個負向測試）。
2. **W-02**：雲端 read+write 邊界接共用 guard（`getCloudQuestions` return 前包 `parseQuestions`；`saveCloudQuestions` 入口過濾並定義全無效拒寫語意，注意 `forceDeleteAll` 互動）+ 補雲端 repository malformed fixtures。
3. **W-03**：Toast 成功數改用實際新增/更新數，勿用合併後全庫長度。

### 💡 SUGGESTION：**2 項**

1. **S-01**：BankManager 匯出雙 timer 加 unmount cleanup（存 timer id 於 effect cleanup 清除）。
2. **S-02**：`useSoundEffects` 跨實例 SFX 即時同步（shared store）——既有架構限制，後續收斂。

### 📋 待提交確認／流程證據（嚴禁與 CRITICAL 混淆）：**3 項**

1. **P-01**：6.2 E2E 證據不存在於儲存庫——補跑並記錄，或明示接受單元覆蓋並修正 6.2 敘述。
2. **P-02**：工作樹未提交（21 modified + untracked）——是否 `git commit` 結案由負責人決定，本審計不執行提交。
3. **P-03**：3+2 個 blast radius 外的良性修改應於 commit message 如實宣告。

---

## 8. 三份前案交叉覆核共識表

| 前案 Finding | 本審計裁定 | 備註 |
|---|---|---|
| 7KQ4 W-01（type×answer） | ✅ 確認 | 嚴重度維持 WARNING（中低） |
| 7KQ4 W-02（雲端寫入無 guard） | ✅ 確認 + **擴增至 read path** | 本審計新發現 `getCloudQuestions` 同缺口且直達 quiz engine |
| inquisitor FG-01「下游 TypeError 崩潰」 | ❌ **駁回衝擊推論** | 全庫無 `answer as string[]` / `.answer.map`；下游皆 `Array.isArray` 派發（K7D2 之修正正確） |
| inquisitor FG-02（匝出 timer） | ✅ 確認 → S-01 | revoke 無洩漏，僅狀態更新無害觸發 |
| inquisitor FG-03（部分損毀覆寫） | ✅ 確認為設計取捨 | spec 只要求全無效拒寫，不列級 |
| K7D2 W-03（Toast 計數不對稱） | ✅ 確認 + **取得測試固化鐵證** | `bankManagerImportExport.test.tsx:134,163` 斷言「成功匯入 3 題」（1 新 + 2 既有） |
| K7D2 forceDeleteAll 語意提醒 | ✅ 採納 | 修 W-02 時必須一併釐清，避免 guard 後空陣列誤觸全刪保護 |
| 三案 PROCESS-01（E2E 未重跑） | ⬆️ **升級：證據不存在於 repo** | 無 spec、無 log 紀錄、6.2 自訂 grep 命令亦無法覆蓋四項新功能 |
| 三案 ponytail debt（2 markers、1 過期） | ✅ 一致 | NodeEditPanel D-2 已過期 3 天，另排清理 |

---

## 9. 最終判定

- **CRITICAL：0**。本變更具備結案條件，無阻塞項。
- **WARNING：3**（W-01 / W-02〔含 read path 擴增〕/ W-03）。三項修復成本皆低（合計約 10 行代碼 + 6 個測試），建議於提交前或提交後立即安排；若負責人選擇直接接受風險，應將三項登記為後續追蹤項，**而非視為已修復**。
- **SUGGESTION：2**（S-01 unmount cleanup；S-02 既有架構觀察）。
- **流程：3**（P-01 E2E 證據、P-02 待提交確認、P-03 範圍衛生）——均為交付與證據範疇，**嚴禁誤標為核心代碼 CRITICAL**。
- **判定：CONDITIONAL PASS / HOLD FOR OWNER EVALUATION。**

*（審計員 V8Q3 於本報告寫入後立即停止操作：不修改程式碼、不執行 git commit、不回滾，等待負責人評估。）*
