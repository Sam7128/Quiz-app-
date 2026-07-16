# `battle-system-quality-overhaul` 最終交叉審計與缺陷修復報告

> 審計版本：v2.0（取代 2026-07-16 v1.0）  
> 最終審計日期：2026-07-16  
> 方法：`openspec-verify-change`、`ponytail-audit`、`ponytail-debt`、Knip、TypeScript、ESLint、Vitest、Node 資產驗證、真實 Chromium 流程  
> 結論：**通過；0 個未解決 CRITICAL／HIGH、0 個 Knip dead-code finding、0 個 lint warning**

## 1. 執行摘要

本報告將另一位 AI 先前產出的 v1.0 報告，與規格、實作、測試及第二輪獨立掃描逐項交叉比對。v1.0 的核心阻塞項 C-01、C-02、C-03 及 W-03～W-06 均屬實，已完成修復；W-02 的「必須有六種音源」解讀過度擴張，但實際火系技能 cue 缺口仍被修正；W-01 建議以十條 `ponytail:` 註解包裝未完成工作不適用，因相關捷徑已直接刪除，沒有理由把已知缺陷改寫成長期技術債。

最終架構只有一條 battle domain commit、一個 presenter completion gate、一個 runtime asset registry 與一個共用 audio controller。Legacy renderer、legacy presentation state、跨模組 `pendingSkill`／`battleState` 欄位、dead exports、未使用依賴與測試專用 public API 均已清除。

## 2. v1.0 報告交叉比對

| 原編號 | 最終判定 | 修復或裁決 |
|---|---|---|
| C-01 Legacy renderer 雙路徑 | 確認、已修復 | 刪除 `AttackEffect`、`FireballAttack`、`IceArrowAttack`、`SkillAnimation`、`DamageNumber` 與舊測試；`BattleArena` 改由 active presentation event、`BattleSkillOverlay` 與同一 event-ID gate 驅動。 |
| C-02 Legacy `BattleState` adapter | 確認、已修復 | 刪除 `toLegacyBattleState` 與 `pendingSkill/currentAnimation/currentDialogue/lastDamage/isLastHitCrit/lastAction/presentationEvents/lastDamageEvent/monsterPool` 等 legacy 欄位；domain 與 presentation 不再雙寫。 |
| C-03 8.1／8.2／8.6 未完成 | 確認、已修復 | Legacy 與 dead-code 清理完成；Knip 零項；本報告完成逐 requirement 驗證，tasks 已同步。 |
| W-01 本次變更沒有 `ponytail:` 標記 | 原推論不成立 | 標記只適用於刻意保留且有上限的捷徑；原列 PD-1～PD-10 已刪除或改為單一真相，無需製造債務註解。現有兩條 KG 相容債均有 2026-10-01 trigger。 |
| W-02 cue map 僅 1/6 音源 | 部分有效、已修復 | 規格明訂缺 cue 為 no-op，不要求虛構音源；真正缺陷是已核准 fire skill 未映射。現以 event kind + element 將 fire `skill_cast` 對應既有 attack SFX，未知元素安全 no-op，並以 event ID 去重。 |
| W-03 `unloadSfx` dead API | 確認、已修復 | 移除介面、實作與只服務此 API 的測試；共用 Howl singleton 不由 BattleArena unmount 全域卸載。 |
| W-04 draft／quiz legacy battle 欄位 | 確認、已修復 | 移除 `ChunkDraftState.pendingSkill` 與 `SavedQuizProgress.battleState`，同步清理 App、hooks、storage fixtures。 |
| W-05 presentation event 雙 projection | 確認、已修復 | `useBattleSystem` 只將 engine events enqueue 至 presenter；`BattleArena` 只讀 `activePresentationEvent`。 |
| W-06 `SkillAnimationType` dead export | 確認、已修復 | 型別與 legacy animation model 一併移除；Knip 不再回報。 |

### v1.0 Ponytail 清單的處置

- S-01、S-02：legacy renderer 與根目錄 `constants.ts` 已刪除。
- S-03：`.agents/.claude/.continue` 下的 skill 範例屬工具資產，不是產品 dead code；以 `knip.json` 排除，未誤刪其他 Agent 所需檔案。
- S-04：移除 redundant `@types/dompurify`；補上原本由 transitive dependency 偶然提供的直接依賴 `@tiptap/extension-underline`。
- S-05～S-09、S-12～S-17：所有無跨檔 consumer 的 exports／types 均移除或改為 module-private。
- S-10：不再保留 cue wrapper；`BattleArena` 直接把 typed event kind／element 傳給唯一 `playBattleCue`。
- S-11：`Monster.visualScale` 與 domain image path 已移除；scale、action 與 media 只由 asset registry 提供。

## 3. 第二輪獨立審計新增發現

v1.0 未涵蓋、但本輪確認並修正的項目如下：

1. Presenter 原先只有 event deadline，沒有可驗證的逐 phase scheduler。現以 attack/skill、defeat/spawn、Boss entrance 的明確 phase table推進，phase timer 與 safety deadline 分離，reduced-motion 保留相同語意。
2. Monster defeat 時 durable state 與 spawn event 曾可能顯示錯誤身份。Engine 現在原子輸出 attack → defeat → spawn/Boss，payload 保留舊／新 monster ID；Arena 在 spawn 前持續顯示被擊敗者。
3. Empty registry 可能只在 active state 回 failure。現只要沒有 current monster 就輸出 typed unavailable failure，UI 顯示安全狀態而不是崩潰。
4. Character action registry 缺少 optional action 時沒有一致 fallback。現由 `getBattleCharacterAsset(id, action)` 回退已登錄 idle，DEV 僅記錄一次。
5. `Monster.imagePath` 形成 domain／asset registry 雙真相。現所有 runtime media 路徑只存在 asset registry。
6. Howl constructor 失敗可能破壞初始化。BGM/SFX 建立與播放現皆 fail-soft，battle/quiz 繼續運作。
7. V2 persistence 曾接受空物件並遷移成預設資料。現 field-level codec 拒絕 `{}`、未知版本與非有限數字。
8. Mermaid edge parser 的三個 backtracking regex 被 ESLint security 規則識別為 ReDoS 風險；已改為線性 `indexOf/slice` parser，既有 Mermaid 測試全過。
9. Analytics 讀取 `study_sessions` 的錯誤曾被忽略；現 fetch error 顯式返回 false，不再誤走 create path。
10. `useBattleSystem` 的 `hasPendingSkill`、`currentSkillTier` 只有測試消費；已移除，測試改驗證 domain streak，不為測試保留 public API。

## 4. 最終實作對 OpenSpec 的核對

### Completeness

- `tasks.md`：所有 1.1～8.6 項目均有實作或驗證證據。
- `openspec status`：proposal、design、specs、tasks 全為 `done`。
- `openspec validate --strict`：change valid，0 issues。

### Correctness

- battle-mode：functional latest-state commit、duplicate event ID 防護、bounded damage、deterministic skill milestones、Boss supersedes Elite、V1 read/V2-only write、chunk/game-mode/empty-registry scenarios 均有 engine、hook、persistence 或 browser test。
- battle-presentation：唯一 queue 與 compare-and-complete gate、explicit phases、hidden/unmount cancel、action fallback、stable particles、CSS/image/WebM cleanup、reduced motion、a11y、typed audio cue 與 safety deadline 均已落地。
- battle-assets：單一 registry、禁止 remote/data/assets-prep、bytes/magic/dimensions/alpha、bounded preload、decode fallback、20 個 browser image checks 與 25-entry Node validation 均通過。
- audio-resource-lifecycle：BattleArena unmount 只停止 BGM、不 unload shared SFX；fire cue correlated/deduped；missing/failed audio no-op；dead unload API 已刪。

### Coherence

- 實作遵守 design 的 pure engine → persistence/presenter adapter → Arena 三層邊界。
- 沒有新增 sharp、自製 media cache、第二 audio controller、備份 key、TTL、writer epoch 或跨硬體效能 hard gate。
- `BattleArena` public entry、QuizCard 答題流程與 practice/cloud payload contract 保持不變。

## 5. 全庫 YAGNI／Dead Code 最終結果

- `npx -y knip --reporter compact --no-progress`：**0 findings**。
- `npm run lint`：**0 errors、0 warnings**。
- 顯式 `any` 掃描：**0 hits**。
- `test.skip/describe.skip` 掃描：**0 hits**；刪除沒有測試內容的跨裝置 stub。
- 刪除 6 個 legacy component/test leaf、根目錄 dead `constants.ts`、無 consumer helpers/exports/types，以及多組未使用 icons/props/imports。
- 未刪除 Agent skill 範例與其他工具所有權檔案；它們由 Knip 精準排除，避免把「產品未引用」誤判為「可刪」。

## 6. Ponytail 技術債帳簿

| 位置 | Ceiling／升級條件 | 狀態 |
|---|---|---|
| `components/KnowledgeGraph/graphUtils.ts` | 保留 compatibility alias 至外部 graph utility API migration window 於 2026-10-01 關閉 | 未到期，有明確 trigger |
| `components/KnowledgeGraph/NodeEditPanel.tsx` | schema-v2 reader 相容 `fontWeight` 至 2026-10-01 migration window 關閉 | 未到期，有明確 trigger |

帳簿結算：**2 markers，0 個缺少 trigger，0 個屬於本次 battle change**。本次確認的 battle 捷徑已直接消除，不以註解掩蓋未完成實作。

## 7. 驗證證據

| Gate | 結果 |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS，0 warning |
| `npm test -- --run` | PASS，47 files／301 tests |
| battle core targeted tests | PASS，22 tests（最後 dead API 收斂後重跑） |
| `npx -y knip --reporter compact --no-progress` | PASS，零輸出 |
| `npm run battle:assets` | PASS，25 registered assets |
| `npm run build` | PASS；保留既有 `vendor-ui-core` >500 kB 警告 |
| Chromium asset probe | PASS，20 images 的 dimensions/alpha |
| Chromium public battle flow | PASS，25 題；double-click、streak、wrong answer、Boss schedule/spawn |
| `openspec validate ... --strict --json` | PASS，valid=true、0 issues |

Playwright test runner 在本 Windows/Codex 環境會於測試完成前卡在 worker/webServer teardown，甚至不遵守自身 30 秒 timeout；因此未把外層 command timeout 偽裝成產品失敗或成功。相同 Chromium 驗證改由 `webapp-testing` 的 server lifecycle helper 執行，56 秒內完成且 server 正常停止。這是本機 runner 限制，不是 battle flow 缺陷。

## 8. 剩餘非阻塞技術風險

1. `vendor-ui-core` production chunk 仍超過 Vite 500 kB 警戒值；這是既有 DEC-004 為避免 React/Recharts/Framer `forwardRef` 相容問題而強制合併的取捨，列於 MEMORY RISK-002，不能在本 change 無證據拆分。
2. 上述 Windows Playwright runner teardown 問題需獨立基礎設施任務處理；本輪已有可重現的直接 Chromium gate 作為替代證據。
3. 兩條 Knowledge Graph 相容債需在 2026-10-01 觸發日重新評估。

以上均非本次 OpenSpec critical/high requirement 缺口。沒有執行 archive、commit 或 push，保留給使用者最終評估。

## 9. 最終判定

**✅ 通過。** v1.0 的所有有效 CRITICAL/WARNING 與全庫 Knip dead-code findings 已關閉；錯誤或過度擴張的建議已留下裁決理由。此 change 已具備完成條件，但是否 archive 由使用者決定。
