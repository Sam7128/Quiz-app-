## Context

MindSpark 的 Game Mode 把測驗答案轉成 RPG 戰鬥回饋。現有功能已具備怪物 HP、streak 技能、暴擊、護盾、Boss／Elite、對話、Howler 音效、Framer Motion 與簽章 localStorage，因此這不是從零重做；本變更的重點是先把規則與生命週期收斂，再安全替換視覺素材和演出。

### 已核實的基準

- `npx tsc --noEmit` 通過。
- `npx vitest run src/__tests__/useBattleSystem.test.ts` 通過 11/11；現有測試只證明基礎初始化、答對／答錯、5-streak、chunk reset 與簽章快速寫入，沒有覆蓋下列 presentation 與 scheduler 風險。
- `hooks/useBattleSystem.ts` 約 671 行，同時負責簽章、localStorage、戰鬥數值、怪物抽選、Boss 判斷、對話、動畫、計時器及 `window.CustomEvent`。
- `components/BattleArena.tsx` 約 497 行，包含大量遺留推理註解、重複 interface、DOM 座標量測、角色渲染、特效、overlay 與音訊生命週期。
- `components/SkillAnimation.tsx` 約 359 行，Hook timer、component timer、video `onEnded` 可同時完成同一技能；它還推測不存在的 MP4 source，render 時產生隨機粒子，並使用 Tailwind 無法可靠掃描的動態 class。
- `triggerAnswer` 先從 render closure 讀 `battleState` 計算，再做 functional update；兩個不同答案若在 rerender 前抵達，可能以同一舊狀態計算。
- `handleCorrectAnswer` 是未被回傳或呼叫的未完成死碼；`CRIT_MULTIPLIER_RANGE`、`ALL_SKILLS`、types 內 `SkillThreshold` 等合約與實際執行不一致。
- `monsterPool` 被持久化但 caller 永遠傳入 `[]`，選怪實際只靠 `seenMonsters`；兩套欄位造成假狀態。
- Boss 只在怪物死亡後判斷，且以 `% 10 === 0 || % 10 === 1` 容錯；里程碑與 spawn 時機沒有單一紀錄，可能延遲、漏掉或重複。
- `Monster.attackPower` 已存在，但答錯傷害使用固定 `BASE_MONSTER_DAMAGE = 12`，導致 monster data 不是真正規則來源。
- `Monster.attackImagePath`／`hurtImagePath` 目前都指向同一靜態圖，renderer 也只用 `imagePath`；動作狀態無法呈現。
- `battle:damage` 只有兩個 dispatch，專案沒有 listener；projectile component 已顯示 DamageNumber，這是重複且無消費者的架構。
- 戰鬥元件沒有 `useReducedMotion`／`prefers-reduced-motion`，HealthBar 沒有 progressbar semantics，且沒有 BattleArena／SkillAnimation 專屬 component 或 E2E 測試。
- `useSoundEffects` 以 module global Howl 管理，所有攻擊共用 fireball cue；BattleArena unmount 會 unload 全域 SFX，可能影響其他 consumer。
- 現有 runtime 圖像尺寸／alpha 不一致：多數 sprite 500x500 ARGB，Skeleton Wizard 為 677x369；`absolute_zero.png` 是 1024x1024 RGB 無 alpha；背景約 642/924 KiB；三個高 tier WebM 約 7–9.3 MiB。
- `assets-prep/battle-visual-upgrade/` 已有 10 張 style／action／VFX／HUD 概念板及 manifest，但這些是含多格內容的參考板，不是可直接上線的透明 action asset。

### 現有可靠行為，必須保留

- `QuizCard` 的同步 `isSubmittingRef` 已防止同題快速 double submit，且錯誤會釋放鎖。
- `useBattleSystem` 已追蹤主要 timer 並在 unmount 清除；新架構要減少 timer owners，而非回退此安全性。
- Battle snapshot 使用 HMAC／完整性檢查與 ordered write queue；新 codec 必須保留簽章及最後寫入勝出。
- Game Mode 不得改變一般測驗與 Chunk 雲端資料格式；battle state 仍只在本機保存。
- Fire Dragon 與 Skeleton Wizard 是 Boss；Skeleton Warrior 與 Orc 是 Elite。概念板名稱不具有改分類的權力。

### 約束與協作者

- React + TypeScript + Vite、Framer Motion、Howler、Tailwind 是既有技術棧。
- 依專案規則：禁止 `any`；先定義型別並通過 `npx tsc --noEmit`；不可破壞正式資料；外部 dependency 使用前需驗證 exports；不 suppress React warnings；關鍵 async UI 需有可理解 fallback。
- 測驗流程是主系統，戰鬥是增強層。任何 visual／audio error 必須 fail-soft，不得令答案遺失或 UI 永久卡住。
- 先前生成素材由使用者檢閱；apply 階段只把 `approved` 的獨立 runtime asset 接入，不會把概念板自動裁切成 production 檔。

## Goals / Non-Goals

**Goals:**

- 讓每個答題事件只產生一次可驗證的戰鬥結果，並在快速輸入、重試、unmount、chunk change 與 media failure 下保持一致。
- 將 durable domain state、ephemeral presentation state、asset registry、既有 sound hook 與 React UI 建立清晰邊界。
- 讓英雄、怪物、技能、元素、傷害、Boss entrance 與 HUD 有語義一致、層次分明、可降級的演出。
- 將生成素材轉成可追溯、可檢查、可預算控制的正式素材 pipeline。
- 保留舊 snapshot 並安全遷移，禁止測試觸碰真實 `mindspark_*` 資料。
- 為每一小步提供可自動執行的型別、unit、component、E2E、a11y、visual 或 asset validation。
- 在完成時刪除 legacy dead code、無主素材、未實作 type 與臨時 adapter；不得長期保留兩套 engine／presentation。

**Non-Goals:**

- 不改題目生成、SM-2、學習統計、計分或 Supabase practice session schema。
- 不在本變更新增 PvP、多人同步、裝備／背包、角色養成、戰利品或付費系統。
- 不引入 Lottie、Canvas/WebGL 遊戲引擎、three.js 或新的 runtime animation library。
- 不把 battle snapshot 上傳雲端，也不讓戰鬥錯誤改變測驗正誤。
- 不在沒有量測與產品決定下重做整體遊戲平衡；只修正資料欄位與實際規則不一致，並用 golden tests 鎖定核准數值。
- 不在本輪規劃階段修改 production battle code 或 runtime asset；只有 OpenSpec、checklist 與規劃文件會變更。

## Decisions

### 1. 用 domain transition 與 presentation event 分離戰鬥

建立三層資料模型：

1. `BattleProgressState`：可持久化且與 UI 無關，包含 schemaVersion、session/battle ID、hero HP、current monster ID/HP、streak、maxStreak、questionsAnswered、defeatedCount、shield、seen rotation 與單一 pending encounter。已處理 answer event IDs 只在 Hook memory 存活，不寫入 snapshot。
2. `BattleTransitionResult`：純函式輸出 `{ nextState, presentationEvents, diagnostics }`。
3. `BattlePresentationState`：只在記憶體存在，包含 queue、active event、phase、dialogue、geometry snapshot、asset loading status 與 reduced-motion profile。

流程：

```text
Quiz answer confirmed
  -> create unique AnswerEvent
  -> pure battleTransition(currentProgress, event, deps)
  -> atomically commit nextProgress
  -> enqueue typed presentationEvents
  -> presenter owns phases + acknowledge
  -> persistence signs only changed nextProgress
```

理由：domain result 不再由動畫 callback 決定；影片失敗也不會改 damage。React state 只提交純函式結果，可消除 stale closure。presentation 可在 unit/component test 中獨立跑 fake clock。

替代方案：繼續在 `useBattleSystem` 補更多 refs／callbacks。否決，因為同一 Hook 已同時管理 7 種責任，無法建立 single completion owner，且新增動作只會增加交叉 timer。

### 2. 以 reducer-style 純函式處理事件，依賴全部注入

新增 `services/battle/battleEngine.ts`，至少暴露：

- `createInitialBattleProgress(registry, deps)`
- `applyBattleAnswer(state, answerEvent, deps)`
- `resolveNextMonster(state, registry, rng)`
- `scheduleEncounter(state, questionsAnswered)`
- `calculateBattleDamage(input, rng)`

`BattleEngineDependencies` 明確包含 RNG、ID factory、clock、monster registry 與 skill registry。Production adapter 可使用 `Math.random`／`crypto.randomUUID`／`Date.now`，測試使用 deterministic sequence，不在 production 加 seed query、cheat route 或假回傳。

已處理 event IDs 使用 Hook 內存 `Set`，避免同一提交期間的 retry 重複套用；new battle、chunk change 或 game off 即清空。事件 ID 由 QuizCard 每次確認提交時建立，battle off 時不建立戰鬥事件。這是目前單一 UI consumer 所需的最小冪等邊界；不為未來的分散式 retry 持久化 ring buffer。

替代方案：在 Hook 內加入 mutex。否決，mutex 只能串行化副作用，不能令規則可重播、可斷言或避免 closure 計算。

### 3. 遭遇 scheduler 使用單一 pending kind

`EncounterSchedule` 只包含 `nextEncounterKind: elite | boss | null`、`lastEliteMilestone`、`lastBossMilestone`。規則為：

- questionsAnswered 首次到 10 的倍數：將 pending 設為 Boss。
- 首次到 5 的倍數但不是 10 的倍數：只在 pending 不是 Boss 時設為 Elite。
- 活怪跨過 q5 與 q10 時，Boss 覆蓋尚未生成的 Elite；不建立 encounter queue，也不補排被覆蓋的 Elite。
- milestone 只影響下一次 spawn，不在答案中途替換尚存活怪物。monster defeat 後 resolver 消費 pending kind 一次。
- `seenMonsters` 是唯一 rotation state；刪除 `monsterPool`。

這是目前單玩家測驗回饋的最小規則：Boss milestone 不遺失，也不因過快答題累積一長串過時遭遇。

替代方案：第 10 題立即換 Boss。否決，會丟失目前怪物 HP、打斷 damage sequence，並讓答題結果與擊倒獎勵衝突。

### 4. 怪物與技能 registry 是規則與 presentation 的共同 ID 來源

保留 `constants/monstersData.ts` 與 `constants/skillsData.ts` 的 domain definitions，但整理成 readonly typed registries；presentation 不複製 skill tier／element／damage。`Monster.attackPower` 成為反擊規則來源，若需平衡修正則建立一個具名 multiplier table 並測試，不再用無關固定常數覆蓋。

移除或收斂：

- `CRIT_MULTIPLIER_RANGE` 與實際固定 1.5 規則二選一；設計採單一 registry config，測試依 config 驗證。
- types 內未實作 `lottie | sequence`。
- `SkillThreshold`、`SKILL_THRESHOLDS`、`ALL_SKILLS` 等沒有 consumer 的 exports。
- monster `attackImagePath`／`hurtImagePath` 改由 asset registry action map 表示；domain monster 不承載可變 UI path。

替代方案：每個 component 自行 import monster／skill constant。否決，容易令圖示、元素、傷害與音效不一致。

### 5. Presenter scheduler 是唯一動畫完成擁有者

新增 `hooks/useBattlePresentation.ts` 或等價 controller。每個 event 有 `eventId`、`sequence`、`kind`、`actorId`、`targetId`、`durationProfile` 與 payload。scheduler 驅動具名 phase，並提供：

- `completeActiveEvent(eventId, cause)`：只接受目前 event ID，冪等。
- per-event safety deadline：正常 callback、video ended、error 或 timeout 競爭時只第一個有效。
- `cancelAll(reason)`：unmount、game off、chunk boundary、new battle。
- reduced-motion duration profile：phase 語義相同但時間較短。

`document.hidden` 不引入虛擬時鐘或 pause/resume 狀態機。頁面 hidden 時直接 `cancelAll('hidden')`，解除 media listeners、清空 video `src` 與 queue，並將 UI settle 到最新 durable state；visible 後不重播舊演出。戰鬥是 quiz 的裝飾回饋，這個原生 lifecycle 政策比維護一套可暫停 deadline clock 更簡單且不會卡住答題。

Framer Motion `onAnimationComplete`、video events 與 safety timeout 只回報 signal 給 scheduler；它們不直接清空 hook domain state。damage number 由單一 event layer 產生，不再派發 `window` CustomEvent。

替代方案：保留 Hook timer 並讓 component 也自行完成。否決，正是目前 double-completion 與 stale callback 的根因。

### 6. BattleArena 保持 public entry，UI 依實際 ownership 漸進拆分

`components/BattleArena.tsx` 保留現有具名 export 與 caller props。先接上 engine/presenter 穩定 seam，再只在下列情況抽元件：它擁有獨立 state/lifecycle、被第二個 consumer 重用，或不抽出就無法對高風險邏輯做單元測試。預期最多先抽 `BattleHud`、`BattleStage` 與 `BattleSkillOverlay`；character/effects/outcome 可留在 stage/arena，不以六個檔案或六個 interface 當驗收條件。

`AttackEffect.tsx`、`FireballAttack.tsx`、`IceArrowAttack.tsx`、`SkillAnimation.tsx` 在新 path 覆蓋測試且 import graph 為零後才刪除或轉成無邏輯 leaf；替代 path 上線前不先拆除現行程式。

所有 Framer variants 放在 component 外部；粒子 layout 由 event ID seed 產生並 memoize；重計算只依語義 payload。大型 video overlay 以 dynamic import／lazy media source 避免增大初始路徑，但不為已很小的 leaf component 製造無效 chunk。

### 7. 幾何量測改為 anchor snapshot，不在動畫 render 反覆讀 layout

`BattleStage` 用 arena-relative anchors 描述 hero origin、monster target 與 ground line。mount／ResizeObserver 變更時量測一次；event 啟動時複製 geometry snapshot，該 projectile 完成前不因一般 rerender 跳動。主要動畫只改 transform／opacity。

mobile 與 desktop 使用相同相對 anchor contract，加上 safe-area clamp。visualScale 有上下限；Boss 增大 stage presence 但不得遮住 HUD 或 quiz controls。

替代方案：每次 render 讀 `getBoundingClientRect`。否決，會造成 layout thrash，且 resize／overlay 期間座標不穩定。

### 8. 本輪只登錄實際消費的已核准素材

`assets-prep/battle-visual-upgrade/ASSET_MANIFEST.md` 與概念板是視覺 source，不是本 change 的必交 runtime roster。Apply 階段建立單一 typed `constants/battleAssetRegistry.ts`，但只登錄兩週內真正被 `BattleArena` 使用的已有／已核准資源，每個 entry 只保留：

- stable ID、source、category/action、fallback ID。
- renderer 真正需要的 anchor/scale 與 skill/element metadata。
- `status` 與簡短 `sourceNote`/usage note；不在 runtime registry 重複建立 prompt、reviewer、date 等尚無消費者的工作流欄位。

正式檔放 `public/battle/runtime/`，目錄只按現有實際類別分組，不為空的未來類別建目錄。概念板留在 `assets-prep`，production registry 禁止指向該目錄。

Promotion 順序：獨立輸出 → 去除背景 → normalized canvas/anchor → optimize → 在既有 Playwright QA 頁面人工核對 → registry `approved` → validator。本 change 只執行必要資源；英雄／全怪物／全技能的新美術製作及逐 entry 核准另開 change。

不直接 crop board 的原因：現有 boards 包含標題、分隔、場景底色與多角色，機械裁切會留下背景污染、比例不一與不可追溯的 bounds。

### 9. Asset validation 只用標準庫與既有 Playwright

Node `fs`／`path` 負責 registry source、大小寫、format、bytes、orphan 與 fallback target；已安裝的 Playwright 用 browser canvas 驗證 dimensions、alpha 與非空內容。不新增 `sharp`，也不同時維護 Node native 與 Canvas 兩套 validator。

視覺 QA 只保留 desktop normal、mobile Boss、reduced-motion fallback 三個 deterministic screenshots；48/96/original contact-sheet generator、perceptual hash 與大型 state matrix 在沒有實際誤辨問題前不建立。

預算以目前資料為起點：character pose 250 KiB、icon 120 KiB、background layer 700 KiB、video 6 MiB、初始 critical images 1.5 MiB。若視覺品質實測需要調整，必須以 QA screenshot 與 Playwright request bytes 證明並修改 spec；不能只在 validator 加例外。

### 10. 動畫品質採明確 timing profile 與效果上限

定義 typed `MotionProfile`：

- normal attack：短 anticipation → travel → impact → settle，總目標約 700–1100ms。
- monster attack：總目標約 800–1200ms。
- CSS skill：總目標約 1200–1800ms。
- Boss entrance／defeat：總目標不超過 2200ms。
- video skill：依實際檔長但設硬性 safety deadline；不能無限阻塞。
- reduced motion：以 80–250ms fade/state swap 取代 travel、shake、parallax、loop pulse 及 autoplay video。

完整模式粒子數按 tier 設上限；screen shake 只作用在 stage visual layer，不移動 quiz controls 或可讀文字；閃光 opacity／duration 有上限。`document.visibilityState === hidden` 時暫停 ambient loop 及不必要 decode。

### 11. 音效沿用現有 Hook，不新增 controller 層

在既有 `useSoundEffects` 加入 typed cue mapping 與 per-event dedupe，並移除 `BattleArena` unmount 時的全域 `unloadSfx()`；consumer 只停止自己的 BGM／active playback。Cue 只對應目前已有本地音源，缺 cue 或 audio context failure 為 no-op，不為八個未核准音效建立新 service contract。

音效不是 event completion 條件。BGM 只在 battle active 且使用者允許時播放，visibility hidden／game off 暫停；恢復時遵守 setting，不強制 autoplay。

### 12. QuizCard 只負責建立答案事件與穩定 chunk 邊界

`QuizCard.submitAnswer` 保留現有同步鎖。答案已由 quiz logic 確認後建立 unique `answerEventId`，呼叫 battle adapter，再提交 quiz result；battle 可復原錯誤被記錄並重置 battle，不取消 quiz answer。若 quiz `onAnswer` 自身失敗，現有 finally 仍釋放鎖，且 battle event ID 防止重試重複傷害。

Chunk reset effect 改以穩定 `sessionId:chunkIndex` token 比較，只在 token 變更時觸發。不要把整個 `chunkMeta` object 放成 reset 語義；同 chunk rerender 不重置。

`AppContent`、`AppHeader`、Settings 的 game mode contract 不變。Game off 取消 presenter／audio，但不修改 quiz draft。Battle snapshot 不進 cloud payload。

### 13. Persistence codec 讀舊 key、只寫 V2 新 key

新增 `services/battle/battlePersistence.ts`，包含：

- `decodeBattleEnvelope(unknown)`：現有 integrity envelope 驗證後使用 field-level guards。
- `migrateBattleSnapshot(version)`：逐版本純遷移，未知 version 拒絕。
- `encodeBattleSnapshot(progress)`：只輸出 canonical durable fields。
- `createBattlePersistence(storage, signer)`：ordered writes、dedupe identical snapshot、error containment。

以 monster ID 保存，不保存整個 constant object；載入時透過 registry hydrate。transient animation、dialogue、pending skill、coordinates、timer 不寫入。只有 durable serialized value 改變才簽署，避免每個 animation frame／dialogue 寫 localStorage。

資料安全與回滾：舊 `mindspark_battle_state` 永遠只讀，V2 只寫 `mindspark_battle_state_v2`。因為舊 key 本身已是可回退的 legacy source，不再建立 backup key、30 日 TTL 或 cleanup scheduler。新舊分頁寫不同 key，可消除舊 PWA 覆寫 V2 的競態。Integrity envelope 只用於偵測意外損壞，不宣稱能抵抗可執行前端程式碼的攻擊者。

### 14. 驗證採分層證據，不以單一 screenshot 或舊測試代替

| 層級 | 驗證目標 | 自動化方式 |
|---|---|---|
| Types | 無 `any`、discriminated unions 完整、registry readonly | `npx tsc --noEmit`、lint／targeted `rg` |
| Domain | damage、shield、crit、skill、dedupe、boss/elite scheduler、empty registry | Vitest table/property-style deterministic cases |
| Persistence | v1→v2、tamper、unknown version、rapid writes、transient no-write、backup policy | Vitest + MemoryStorage + fake signer/clock |
| Hook | latest-state sequencing、timer cancellation、game toggle、chunk boundary | React hook tests + fake timers |
| Components | phases、single completion、fallback、progressbar/live region、pointer behavior | React Testing Library/Vitest |
| Assets | 存在、format、bytes、orphan、fallback、dimensions／alpha | Node `fs` + 既有 Playwright canvas |
| E2E | public import→quiz→battle 10 題、5 streak、Boss supersession/spawn、wrong answer、next controls | 單一 Playwright isolated flow |
| Visual | desktop normal、mobile Boss、reduced-motion fallback | 3 個 deterministic Playwright screenshots |
| Performance | initial request bytes、zero eager video、media cleanup、quiz continuity | 可重現 Playwright/component assertions；無跨硬體 FPS/LCP hard gate |
| Regression | standard quiz with game off、chunk resume、settings audio | existing + new E2E |

E2E fixture 透過公開題庫匯入流程建立 10 個可重現問題，答案仍由 UI 操作；不增加 production test route。視覺測試在具名 stable phase (`data-battle-phase`) 截圖，不能用任意 sleep；reduced-motion suite 驗證真實降級，不是全域關掉動畫以逃避測試。

### 15. 預計檔案影響與完成狀態

| 類型 | 檔案／區域 | 預計動作 |
|---|---|---|
| 修改 | `types/battleTypes.ts` | 先加入 domain/presentation/asset contracts，再移除 stale types |
| 新增 | `services/battle/battleEngine.ts` | 純規則、damage、skill、encounter、monster resolver |
| 新增 | `services/battle/battlePersistence.ts` | versioned codec、migration、signing adapter、backup policy |
| 新增 | `constants/battleAssetRegistry.ts` | 唯一 typed runtime asset/provenance registry |
| 修改 | `constants/monstersData.ts`, `constants/skillsData.ts` | canonical readonly domain registry，移除死 export |
| 修改 | `hooks/useBattleSystem.ts` | 變成 domain orchestration adapter，刪除 presentation timers/dead code |
| 新增 | `hooks/useBattlePresentation.ts` | 最小 queue、phase、completion、cancel-to-settle、reduced profile |
| 修改 | `components/QuizCard.tsx` | unique answer event、stable chunk boundary、fail-soft battle integration |
| 修改 | `components/BattleArena.tsx` | 保留 public wrapper，組合 battle 子元件 |
| 視需要新增 | `components/battle/**` | 先考慮 stage、HUD、skill overlay；無獨立 ownership 的視覺保留在 Arena |
| 修改／移除 | `SkillAnimation.tsx`, `AttackEffect.tsx`, `FireballAttack.tsx`, `IceArrowAttack.tsx` | 遷移後刪除重複完成／damage 顯示；若保留只可為無狀態 leaf |
| 修改 | `HealthBar.tsx`, `StreakCounter.tsx`, `DamageNumber.tsx` | 語意、reduced motion、單事件顯示；可在 battle 子目錄合併後移除舊版 |
| 修改 | `hooks/useSoundEffects.ts` | cue mapping、sound-off、移除 Arena 全域 unload；不新增 audio service |
| 必要時替換 | `public/battle/runtime/**` | 只處理本輪實際消費的已核准資源；全新 roster 另案 |
| 保留參考 | `assets-prep/battle-visual-upgrade/**` | source boards，不被 production import |
| 新增 | 少量合併 battle tests、`e2e/battle-flow.spec.ts` | engine/persistence/presenter/component 合併測試、單一 E2E、3 visual baselines |
| 修改 | `CHECKLIST.md`, `MEMORY.md`, `docs/DEVELOPMENT_LOG.md`, `docs/INDEX.md`（如新增報告） | 任務、架構記憶與驗證證據同步 |

## Risks / Trade-offs

- **[高] Domain/presentation 拆分改變更新時序** → 先建立舊規則 characterization/golden tests，再實作純 engine；BattleArena adapter 保留 public props；每個 phase 都跑 game-off regression。
- **[高] v1→v2 快照遷移與舊 PWA 覆寫** → 舊 key 只讀、V2 寫新 key；舊 key 即 rollback source，不建立 backup/TTL；fixture 覆蓋新舊 client 交錯寫入。
- **[高] 動畫完成競爭與 hidden timer 脫節** → event ID compare-and-complete、單 scheduler；hidden 直接 cancel-to-settle，fake timer test 交錯 `ended/error/timeout/hidden/unmount`。
- **[高] QuizCard 協作導致答案重複或丟失** → 保留同步 submission lock，battle event dedupe，quiz 為 source of truth；E2E 快速 double click、battle failure、next question。
- **[高] 概念板直接上線造成背景污染與比例問題** → validator 禁止 `assets-prep` 路徑；未核准資源使用現有 local fallback，全新 promotion 另案。
- **[中高] 大型影片／圖片拖慢首次 Game Mode** → initial current-only、video preload none；arena settled 後才用原生 `Image` 預載一個 next；timeout 清 `src`。
- **[中高] CSS／Framer 高粒子與 shake 影響低階裝置** → typed effect budgets、transform/opacity、stable particle seed、visibility pause、reduced motion、performance trace。
- **[中] 拆元件過度造成維護負擔** → 先穩定 engine/presenter；UI 只在有獨立 ownership/測試痛點時抽出，不追求檔案數。
- **[中] 修正 `attackPower` 改變體感平衡** → 先產生現況與目標 damage table，產品規則用 named config 明確核准；unit golden cases 和 E2E HP assertion。
- **[低] 圖片 QA 工具成為另一專案** → 只用 Node 標準庫與既有 Playwright Canvas，不引入 `sharp` 或 generator。
- **[中] 音效改動影響 Settings／FocusTimer** → 限於既有 Hook 的 cue map 與 Arena unload 修正；sound off、雙 consumer 與 no-op failure 回歸。
- **[低] Skeleton Wizard 概念板標成 elite 與實際 Boss 衝突** → domain registry 是真相；asset review 改名稱／manifest，不靜默改 difficulty。
- **[低] screenshot 因隨機粒子或 timing flake** → event-seeded layout、stable phase selector、固定 viewport/font、只在核准 diff 後更新 baseline，不放寬全域 threshold。

## Migration Plan

1. **建立 characterization 與型別邊界**：凍結現有可接受的 damage/skill/chunk/toggle 行為；新增 event、progress、presentation、asset contract；typecheck 後才寫 engine。
2. **導入純 engine 與 v2 codec**：以 unit tests 覆蓋所有規則、legacy migration、empty registry、dedupe、rapid writes；尚不改 UI。
3. **用 adapter 接上 `useBattleSystem`／QuizCard**：維持 BattleArena 現有外部 contract；切換 answer processing；驗證 game-off、chunk、double submit、persistence。
4. **建立最小 asset registry／validator**：只登錄本輪實際消費的現有／已核准 runtime asset；Node `fs`、Playwright Canvas、bytes、orphan 檢查即可，未核准新美術使用 fallback。
5. **導入 presenter 與 BattleArena**：normal attack → wrong attack → defeat/spawn → skill → boss entrance 的順序遷移；用合併 component tests 與單一 E2E 驗證，替代 path 完成後才移除舊 renderer。
6. **加入 a11y、reduced motion、responsive 與音效修正**：完成 semantic HUD、live region、motion profile、既有 sound hook 雙 consumer／sound-off tests。
7. **可重現 quality gate**：typecheck、lint、合併 unit/component、asset bytes/existence、三個 visual baseline、10-question E2E、initial request set、production build、console/React warnings。
8. **清理與文件**：刪除 dead types、CustomEvent、legacy renderer、orphan media、臨時 adapter／flag；更新 OpenSpec tasks、CHECKLIST、MEMORY、DEVELOPMENT_LOG、docs index。

### Rollback strategy

- 每一 implementation phase 保持可獨立 revert 的小提交；types/engine 在 caller 切換前不改 runtime 行為。
- V2 只寫新 key，舊 key 永遠只讀，因此舊 key 本身就是 rollback source。若新 codec 或 engine gate 失敗，revert caller adapter 即可回到舊讀取路徑；不建立 backup/TTL。
- asset 替換以 registry entry 為原子單位；單一 asset 失敗可回到已登錄本地 fallback，不需回滾 domain engine。
- presenter 遷移採 vertical slice，但完成 change 前必須移除 legacy path；不以長期 feature flag 或雙 engine 作為結案狀態。

## Open Questions

核心 engine、persistence、presenter 與現有 fallback 素材的實作已 apply-ready。完整英雄／怪物／技能新美術的製作與逐 entry 外部核准不納入本 change 完成條件，另開後續 change。本輪採以下明確前提：

- 視覺方向以概念板為 reference-only；本輪未核准資源一律回到已登錄的現有本地圖片／CSS。
- Boss milestone 採「到達里程碑後，下一次 spawn 必定且只生成一次 Boss」，不在目前怪物存活時硬切場。
- Skeleton Wizard 維持 Boss；若要改為 Elite，需另行修改 balance spec、HP／attack table 及 regression tests。
- 不增加 runtime animation 或 image-processing dependency；asset QA 固定使用 Node 標準庫與現有 Playwright Canvas。
- 音效素材若尚未獲核准，先使用現有本地 cue 的具名 mapping，不生成或下載未授權音訊；缺 cue 使用 no-op，而不是假資料。
