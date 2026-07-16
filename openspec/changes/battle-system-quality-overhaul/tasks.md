## 1. 基準與資料安全

- [x] 1.1 記錄現有 battle 型別檢查、11 個 Hook 測試、lint 與 production build 基準。驗證：`npx tsc --noEmit`、既有 battle test、`npm run lint`、`npm run build` 全部成功。
- [x] 1.2 在既有 Vitest 內建立最小 `MemoryStorage`、sequence RNG、fake clock 與 ID factory；所有 persistence 測試只注入隔離 storage，不讀寫真實 `mindspark_*`、`user_data.json` 或 Supabase。
- [x] 1.3 以 table-driven characterization 鎖定現有 damage、crit、streak 5/10/30/40/50、chunk reset、Game Mode toggle 與 monster taxonomy；不修改 production 條件來做 mutation 測試。
- [x] 1.4 盤點目前實際被 battle components 引用的 runtime media；只記錄路徑、bytes、format、dimensions 與 consumer，reference boards 維持不進 bundle。

## 2. Type-first 純戰鬥 Engine

- [x] 2.1 在 `types/battleTypes.ts` 定義 durable progress、answer event、engine result、presentation event 與 typed failure；不使用 `any`，完成後先跑 `npx tsc --noEmit`。
- [x] 2.2 建立純 `battleEngine`，注入 RNG、ID factory、clock 與既有 monster/skill registries；不得讀寫 DOM、storage、audio 或 timer。
- [x] 2.3 統一 monster resolver 與唯一 `seenMonsters` rotation；engine 移除 operational `monsterPool`，空 registry 回 typed unavailable；legacy `BattleState.monsterPool` 保留作既有 caller 相容接口。
- [x] 2.4 統一 damage、crit、shield 與 `Monster.attackPower` 規則，有限數字超界時安全拒絕；用同一結果產生 domain state 與 presentation payload。
- [x] 2.5 統一 skill registry 與 milestone：5、10 以上每 10；6/15/25 不觸發；以 deterministic tests 覆蓋 1–60 streak。
- [x] 2.6 Encounter 僅保留一個 pending kind：5 的非 10 倍數排 Elite，10 的倍數排 Boss；尚未生成的 Elite 遇 Boss milestone 時由 Boss 覆蓋，已處理 milestone 不重複排程。驗證同一活怪跨 q5、q10、q15 及 spawn consumption。
- [x] 2.7 `applyBattleAnswer` 使用 functional latest state 原子提交；同一提交期間的 duplicate event ID 由 Hook 內存 Set 忽略，Set 在 new battle/chunk/game-off 清除，不寫入 snapshot。

## 3. V2 Persistence 與跨版本相容

- [x] 3.1 建立 field-level codec，完整驗證 finite numbers、IDs、arrays 與 encounter state；未知版本或損壞資料回安全初始狀態，不碰其他 key。
- [x] 3.2 將 `mindspark_battle_state` 定位為唯讀 legacy source；V2 只寫 `mindspark_battle_state_v2`。首次載入先讀 V2，缺少時驗證並遷移 V1；永不以 V2 覆寫 V1 key。
- [x] 3.3 保留現有 integrity envelope 以偵測意外損壞，但文件不得宣稱能抵抗可執行任意前端程式碼的攻擊者；不新增第二個 backup key、TTL 或 writer epoch。
- [x] 3.4 Canonical encoder 只存 durable fields；presentation phase、dialogue、coordinates、timers、audio 與 processed-event Set 不得進 snapshot。
- [x] 3.5 沿用 ordered write queue 並 dedupe identical bytes；測試交錯 V1/V2 client、tamper/unknown version、rapid writes 與 transient no-write。

## 4. Hook、QuizCard 與 Chunk 協作

- [x] 4.1 將 `useBattleSystem` 收斂為 engine commit、persistence enqueue 與 presentation enqueue adapter，不保留第二套 damage/spawn 規則。
- [x] 4.2 `QuizCard` 保留現有同步 submission lock，答案確認後才建立 battle event ID；battle 可復原錯誤不得阻止 quiz `onAnswer` 或下一題。
- [x] 4.3 Chunk reset 改用穩定 `sessionId:chunkIndex`；同 chunk rerender 不重置，新 chunk 只重置一次。
- [x] 4.4 Game Mode ON 中途開始新 battle、不追溯答案；OFF 清除 presentation/audio 與 in-memory dedupe，保留本機 V2 snapshot且不改 practice payload。
- [x] 4.5 在新 presenter 接管前保留舊 presentation contract 但禁止新增使用；legacy timers、`pendingSkill` 與 `battle:damage` 的實際刪除延後至第 8 階段零 consumer 後進行。
- [x] 4.6 驗證 `BattleArena`、AppContent、Settings 與 Game Mode OFF caller contract；game-off 不請求 battle media、不寫 battle storage。

## 5. 最小 Runtime 素材路徑

- [x] 5.1 建立單一 readonly runtime asset registry，只含目前兩週內實際由 BattleArena 消費的 hero、current monsters、skills、background、video 與 audio IDs；未核准新素材使用既有本地 fallback，不阻塞本 change。
- [x] 5.2 Registry 以最少欄位描述 `id/src/kind/action/fallback/status/sourceNote`；不得指向 `assets-prep`、remote URL、data URL 或不存在檔案。
- [x] 5.3 使用 Node `fs`/`path` 驗證檔案存在、大小、orphan 與預算；使用既有 Playwright + browser canvas 驗證 dimensions/alpha。不得新增 `sharp` 或第二套 validator。
- [x] 5.4 首次進入只載 current background、hero、current monster、HUD/basic effects；arena settled 且 next encounter 已確定後才可用原生 `Image` 預載至多一個 next monster。
- [x] 5.5 依賴瀏覽器 HTTP cache、`<img>`/`Image.decode()` 與 `<video preload="none">`；不建立自訂 fetch/decode promise cache service。video error/timeout/unmount 必須解除 listener、清空 `src` 並 `load()`，停止背景下載。
- [x] 5.6 只最佳化／重編碼目前已核准且被 runtime 引用的資產，使 pose ≤250 KiB、icon ≤120 KiB、background ≤700 KiB、每支 video ≤6 MiB、initial critical images ≤1.5 MiB。
- [x] 5.7 用既有 Playwright 頁面產生一次性 desktop/mobile/reduced-motion QA screenshots 供人工檢閱；不建立 contact-sheet generator、perceptual hash 工具或逐 entry 外部核准 gate。全新美術製作與完整 roster promotion 另開 change。

## 6. Presenter、Arena、無障礙與音效

- [x] 6.1 建立最小 queue reducer 與 single compare-and-complete gate；`ended/error/timeout` 對 active event 至多完成一次，stale signal 無效。
- [x] 6.2 hidden、unmount、game-off 或 chunk change 時取消 active presentation、清 queue/timers/media listeners，並立即 settle 到最新 durable state；visible 後不恢復舊動畫。測試 hidden 發生於 timeout/ended 前後皆不重複完成。
- [x] 6.3 定義 normal、wrong、skill、defeat/spawn 與 Boss 的最少 phase table及安全 deadline；presentation 永不成為 quiz completion prerequisite。
- [x] 6.4 `BattleArena` 保留 public entry；只在 state ownership 或測試痛點明確時抽出 `BattleHud`、`BattleStage`、`BattleSkillOverlay`，不把固定檔案數或 interface 預先當驗收條件。
- [x] 6.5 使用 arena-relative anchors + `ResizeObserver`；event 啟動時凍結 geometry，動畫只改 transform/opacity，角色/HUD/quiz controls 在 mobile/desktop bounds 內。
- [x] 6.6 VFX、damage、crit、shield、icon 與 cue 必須從同一 correlation ID/skill ID/element payload 派生；粒子以 event ID 穩定產生，damage number 每 event 一次。
- [x] 6.7 CSS/image/WebM skill 共用 completion gate；reduced motion 停用 travel/shake/autoplay video但保留結果；video fallback 不改 domain state。
- [x] 6.8 HUD 提供 progressbar label/min/max/now 與文字 HP；難度/傷害不只靠顏色；decorative VFX `aria-hidden` 且不攔 pointer；live region 每 event 宣告一次。
- [x] 6.9 在既有 `useSoundEffects` 內加入 typed cue mapping與 per-event dedupe，並移除 BattleArena unmount 的全域 `unloadSfx()`；不新增第二個 audio controller。sound setting off 時不得播放，audio failure為 no-op。
- [x] 6.10 驗證 keyboard/focus 不搶走答案、Enter/Space/Esc contract 不變，overlay 預設不可聚焦。

## 7. 精簡且可重現的驗證

- [x] 7.1 合併 domain tests 至 `battleEngine.test.ts`：initialization、bounds、skills、encounter supersession、duplicate/rapid events、empty registry。
- [x] 7.2 合併 persistence tests 至 `battlePersistence.test.ts`：V1 read/V2 write、交錯舊 client、corruption、unknown version、ordered writes、transient no-write。
- [x] 7.3 合併 presenter/component tests：single completion、hidden cancel-to-settle、media cleanup、reduced motion、correlated VFX、sound-off、a11y 與 responsive bounds。
- [x] 7.4 建立一個公開 UI `battle-flow.spec.ts`，透過隔離題庫匯入與答題涵蓋 streak 5、Boss supersession/spawn、wrong answer、media fallback、double click、toggle 與 chunk boundary；不加 production cheat。
- [x] 7.5 建立三個 deterministic visual baselines：desktop normal、mobile Boss、reduced-motion fallback；其餘狀態以 component assertions 驗證，不擴張 screenshot matrix。
- [x] 7.6 CI hard gates 僅包含 typecheck、lint、unit/component/E2E、asset bytes/existence、initial request set、build 與 console errors；跨硬體 FPS/LCP/heap 數字不作硬閘。
- [x] 7.7 執行短版 benchmark：公開 UI 10 題流程、30 次 presenter enqueue/cancel component stress、media timeout cleanup；輸出 pass/fail 與實際 asset request bytes。長時 soak、500/1800 題與實體裝置比較僅在量測到回歸時另立工作。

## 8. Legacy 清理與結案

- [x] 8.1 新 presenter 覆蓋後刪除 legacy `AttackEffect`/`FireballAttack`/`IceArrowAttack`/`SkillAnimation` active paths、`battle:damage`、不存在 MP4、dynamic Tailwind 與 render-time random；只保留有 consumer 的 leaf。
- [x] 8.2 移除 dead types/config/exports與無 consumer media；先以 code graph/targeted `rg` 證明零 consumer，不刪不確定所有權的素材。
- [x] 8.3 執行 `npx tsc --noEmit`、`npm run lint`、`npm test -- --run`、battle E2E、asset validation 與 `npm run build`；不得 `.skip/.only` 或放寬全域 threshold。
- [x] 8.4 更新 `MEMORY.md`、`docs/DEVELOPMENT_LOG.md`、必要時 `docs/INDEX.md`，記錄 V2 key、engine/presenter邊界與精簡決策。
- [x] 8.5 將 `CHECKLIST.md` 與本 tasks 實際完成狀態同步；只有有驗證證據的 task 標 `[x]`。
- [x] 8.6 使用 OpenSpec verify 逐 requirement 對照實作與測試；所有 critical/high finding 關閉後才結案。
