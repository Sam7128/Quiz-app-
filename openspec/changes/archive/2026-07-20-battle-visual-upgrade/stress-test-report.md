# Stress Test Resolution: battle-visual-upgrade

> Original stress test: 2026-07-20  
> Plan review: `review-check` + `ponytail` + `ponytail-review`  
> Current unresolved findings: **0**

## 1. Original findings

原始壓測共 8 項：1 CRITICAL / 2 HIGH / 3 MEDIUM / 2 LOW。逐項重新核對 artifacts 與程式現況後，結果如下。

| ID | Original severity | Final status | Resolution |
|---|---|---|---|
| D4-001 | CRITICAL | fixed by simplification | 刪除 active voice counter / TTL；只保存 `{ howl, soundId }` 並對原 Howl instance `stop → play`，hidden/unmount 也 stop，因此沒有可洩漏的 slot。 |
| D2-001 | HIGH | refuted + covered | `CharacterSprite` 已有原生 `<img onError>` fallback；計畫不重建 fallback，只補 action URL 404/decode error 測試。 |
| D8-001 | HIGH | refuted (YAGNI) | 專案沒有 telemetry sink，建立服務會擴張範圍；保留 validator + `console.warn` + browser fault injection。若未來採用正式 telemetry 再接入。 |
| D1-001 | MEDIUM | fixed by simplification | 單一 active cue 使後到的 boss entrance 自然停止先前 hit；不需要 priority queue。 |
| D10-001 | MEDIUM | refuted | 現有正式角色、技能與背景已使用 WebP；本 change 不改 browser baseline，不新增全域 feature-detection framework。 |
| D5-001 | MEDIUM | refuted | 設計沒有 dynamic import；原生 image loading + 已存在的 CharacterSprite fallback 足夠，且明確刪除 preload timeout/service。 |
| D9-001 | LOW | fixed by reuse | `SkillVfxRenderer` 留在既有 `BattleSkillOverlay.tsx`，直接重用 `ALL_SKILLS`、event payload/phase 與 registry；不建 JSON config/provider/DTO。 |
| D3-001 | LOW | refuted + covered | `useBattlePresentation` 已序列化 event，並有 phase/safety timers；新增 rapid queued event 測試，不加 `layoutId` 或第二 queue。 |

## 2. Review-check canonical issues

三輪兩位獨立 reviewer 的重複發現已合併；主代理另補上 VFX 數量、無 consumer action 與 Ponytail 簡化問題。

| Canonical issue | Initial severity | Final status | Artifact change |
|---|---|---|---|
| C-01 資產流程依賴不存在的 `tsx`/Sharp/global CLI | CRITICAL | fixed | Node 22 strip + existing `pngjs` + Playwright Canvas；沒有新 dependency。 |
| C-02 atlas grid 模糊／方向錯誤 | WARNING | fixed | design/spec/tasks 明列 7 個 `columns × rows` 與 row-major 內容。 |
| C-03 `BattleAssetKind` 無 environment、validator 不掃 sounds | WARNING | fixed | type-first 增加 `environment`；同一 validator 掃 `public/battle` + `public/sounds/battle`。 |
| C-04 phase audio 在 tasks 沒有資料流 | WARNING | fixed | `playBattleCue(event)` 直接讀既有 `event.phase` 與 payload；event/phase/cue 去重。 |
| C-05 重複 presentation/audio lifecycle | WARNING | fixed | 禁止第二 scheduler、counter、TTL、pool、visibility timer；延用 presenter + Howler。 |
| C-06 重複 fallback/preloader | WARNING | fixed | 保留 CharacterSprite onError 與既有 next-monster idle preload；無 manager/service。 |
| C-07 9 技能四階段需求只配置 12 張元素圖 | CRITICAL | fixed | 契約改為 12 張共用元素 phase + 9 張 unique impact image，tasks/IDs/renderer 一致。 |
| C-08 hero victory、wizard cast、dragon fire-breath 無 event consumer | WARNING | fixed | source-only，不發布、不登錄；proposal/spec/design/tasks 一致。 |
| C-09 generic benchmark 不可穩定執行 | WARNING | fixed | 改為 requirement-linked checks + 現有 bounded lifecycle tests（rapid queue、hidden cancel、latest-wins/unmount、environment ceiling/media abort）；刪除 2h soak、假 Safari、audio-to-ear、固定 FPS。 |
| C-10 validator 宣稱與現況能力不一致 | WARNING | fixed | Node 做 magic/bytes/metadata；Playwright 做 decode/pixel alpha；責任明確。 |
| C-11 自製 RIFF/WebP metadata parser 重複瀏覽器能力 | WARNING | fixed | 移除 parser task；Node 只驗 magic/bytes，尺寸與 alpha 交由 Chromium Canvas。 |
| C-12 Long Task 200ms gate 無 requirement 且易受 CI 噪音影響 | WARNING | fixed | smoke 只驗證 node/cue ceiling 與 lifecycle cleanup。 |
| C-13 phase-aware audio 無明確 runtime 呼叫端／cleanup 接線 | CRITICAL | fixed | `BattleArena` 既有 active-event/visibility effects 接 `playBattleCue(full event)` 與 `stopBattleCue()`；無新 listener。 |
| C-14 audio registry 與硬編碼 path map 形成雙重來源 | CRITICAL | fixed | 移除 `SOUND_CUE_PATHS`；`cue-<BattleSoundCue>` 只由 `getBattleAsset` 取路徑。 |
| C-15 跨 Howl 只保存數字 soundId 無法正確停止 | WARNING | fixed | 單一 `{ howl, soundId } | null` ref；播放前對原 instance stop。 |
| C-16 source-only 清單與 atlas 實際 cell 不一致 | WARNING | fixed | 精確列出 3 個 pose、3 個 environment cell 與 `battle_victory.ogg`，registry/pipeline tests 共用 ID 集合。 |
| C-17 defeat identity requirement 缺實作對應 | WARNING | refuted + covered | 現有 `BattleArena` 已優先使用 `activeEvent.payload.monsterId`；任務明定 regression-only，不新增 state。 |
| C-18 固定 atlas 使用不同別名 | WARNING | fixed | design/spec/tasks 統一使用 7 個實際檔名，不新增 alias。 |

## 3. Traceability after revision

| Goal | Spec | Design | Tasks | Verification |
|---|---|---|---|---|
| 26 個有 consumer 的角色 action | character-actions + battle-mode | D1 | 0–3 | registry + BattleArena unit + routed media error |
| 9 技能差異化 | skill-vfx + skill-effects | D2 | 1, 2, 4 | overlay unit + Chromium screenshots/decode |
| bounded environment | environment-presentation | D3 | 2, 3, 5 | node ceiling + mobile/reduced-motion flow |
| 12 個 cue 且不堆疊／鎖死 | audio-cue-library | D4 | 0, 2, 6 | mapping/dedupe/stop→play/hidden tests |
| 可重跑資產升格 | asset-pipeline | D5, D7 | 1, 2, 7 | fixed map + validator + browser decode/alpha |

## 4. Final risk register

沒有未解決 CRITICAL / WARNING。保留的已知 trade-offs 均已寫入 `design.md`：

- 不合格 source cell 不 promote；不以程式硬補美術品質。
- skill phase 由元素共用，差異靠 unique impact image + existing tier。
- short SFX 採 latest-wins，刻意避免混音器與 voice pool。
- 效能以可重現 bounded smoke 與 node/cue ceiling 判定，不宣稱 Long Task 或跨硬體固定 FPS gate。

若 implementation 改變上述邊界，必須重新進行 plan review；目前計畫已可進入 implementation。

## 5. Review rounds

| Round | Reviewer A | Reviewer B | Outcome |
|---|---|---|---|
| 1 | BLOCKED | BLOCKED | 修正工具鏈、atlas、registry、phase flow 與重複 lifecycle。 |
| 2 | BLOCKED | PASS | 補齊 audio runtime caller/cleanup、唯一 path source、Howl instance handle、精確 source-only IDs；再刪 RIFF parser 與 Long Task gate。 |
| 3 | PASS | PASS | 0 CRITICAL、0 WARNING、0 refutation objection；兩位 Ponytail 結論皆為 `Lean already. Ship.`。 |
