# ✅ Battle Visual Upgrade — 三審自動修復閉環（v2.0）

> **最終審計員**: Codex（二審交叉驗證與自動修復）  
> **日期**: 2026-07-20  
> **結論**: **PASS — 0 個未解決 CRITICAL／WARNING／可執行 Ponytail 問題**  
> **範圍**: OpenSpec verify、Ponytail audit/debt、Knip、靜態檢查、全量單測、production build、Chromium E2E

## 最終結果

| 維度 | 結果 | 證據 |
|---|---:|---|
| OpenSpec 完整性 | ✅ | `38/38` tasks `[x]`；proposal/design/specs/tasks 全為 `done`，`isComplete: true` |
| OpenSpec 正確性／一致性 | ✅ | 需求、design、registry、validator、consumer 與測試逐項核對，原 W-1 與錯誤尺寸推論均已修正 |
| Ponytail audit | ✅ 0 | 已刪除無 consumer metadata／flag／interface／action 與重複路徑表；無剩餘可執行過度工程發現 |
| Ponytail debt | ✅ | `2 markers, 0 with no trigger`；兩筆皆為既有 KnowledgeGraph 相容性債務，2026-10-01 到期，非本變更新增 |
| Dead code | ✅ 0 | `npx -y knip --reporter compact --no-progress` exit 0、無輸出 |
| Debug／型別殘留 | ✅ 0 | 變更範圍無 `debugger`、runtime `console.log`、`any`；僅保留 CLI 成功摘要輸出 |
| 自動化驗證 | ✅ | 47 files／319 Vitest、7/7 Chromium、TypeScript、ESLint、asset validator、build、diff check 全通過 |

## 已完成修復

1. **型別與 YAGNI 收斂**
   - `BattleAssetAction` 收窄為真正有素材 consumer 的 action，移除未實作的 `victory`；UI-only `anticipate` 改為 `BattleArena` 私有 presentation state，lookup 明確使用 `idle`。
   - 移除單一實作／單一欄位的 `BattleAssetRegistry` interface、全為 `approved` 的 dead `status` flag、無 runtime consumer 的 `sourceNote`／`usageNote`，以及 skill icon 上無消費者的 `action: 'cast'`。
   - registry 因上述清理縮減 **251 行**；來源／授權資訊仍由既有 `assets-prep/battle-visual-upgrade/ASSET_MANIFEST.md` 保存。
2. **單一資料來源與不可達碼**
   - BGM 路徑直接由 registry 取得，移除一項式 `SOUND_PATHS` 重複表。
   - 刪除 `BattleSkillOverlay` 永遠不可達的 Sparkles fallback 分支。
   - 新增 `battle:prepare` package script，讓資產 CLI 與其既有 `pngjs` 依賴成為明確可追蹤入口。
3. **素材 metadata 與規格真實性**
   - 依 Chromium 實際解碼修正 promoted image metadata：Hero `320×819`、Normal／Elite `362×362`、Dragon `362×724`、Skill icons（含 fallback）`418×418`。
   - E2E 不再以 `sourceNote`／promoted 標記略過尺寸檢查；所有宣告尺寸的圖均做嚴格相等驗證。
   - `elite-monster-actions.png` 在 design/spec/tasks 統一為實際的 `3×4`（3 欄角色、4 列動作）。
   - 將 tasks／benchmark 中不存在的 per-character overlay、failing fixture 與 60-event smoke 證據改為實際可執行的來源 atlas pair、unit 與 Chromium gates。
4. **無障礙、測試與調試清理**
   - reduced-motion 下 shockwave／speed-lines 直接呈現靜態終態，不再播放短暫 scale／opacity 動畫。
   - 移除 FocusTimer、bank manager 與 E2E 的殘留 debug forwarding／`console.log`。
   - 原本只有輸出、沒有 assertion 的 Graph ID collision 測試改為實際唯一性與 `node-3` 斷言。
   - 修正 pending-elite E2E 的錯誤時序假設：第 5 題使用錯答保留當前怪，讓 `elite` pending 在演出 settle 後可被預載；正答會在同一次 engine transition 擊殺並立即消費 pending，不能拿來驗證此路徑。

## 對既有二審報告的交叉結論

- **採納並修復**：W-1、P-1、P-2、P-5。
- **更正**：S-1 判定實體 `fireball.webp` 為 `500×500` 不正確；Chromium 解碼證明實檔及所有 skill icons 均為 `418×418`，已同步全部 metadata。
- **不採納 P-3**：為兩個局部 warning set 抽出 `warnOnce` 只會新增跨模組抽象，沒有淨簡化收益。
- **不採納 P-4**：以 LRU 取代四行 bounded `Set` 會增加抽象與狀態面積，違反本次 YAGNI 目標。

## 最終驗證證據

| 命令／Gate | 結果 |
|---|---|
| `openspec status --change battle-visual-upgrade --json` | exit 0；四項 artifacts `done`、`isComplete: true`（PostHog 網路 flush 警告不影響狀態） |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0；0 errors／0 warnings |
| `npm test -- --run` | **47 files／319 tests passed** |
| `npm run battle:assets` | **79 registered assets passed** |
| `npm run battle:prepare -- slice` | **7 atlases sliced** |
| `npm run build` | exit 0；3179 modules transformed（僅既有 vendor chunk size warning） |
| `npx -y knip --reporter compact --no-progress` | exit 0；0 findings |
| Playwright Chromium（`battle-assets` + `battle-flow`） | **7/7 passed（1.4m）**；helper 正常停止 port 5200 server |
| `git diff --check` | exit 0 |

本變更已符合 archive 前的實作與品質門檻；本輪依使用者範圍未執行 archive、commit 或 push。

---

# 🔍 歷史二審報告（修復前，保留供交叉追溯）

> 下列內容是第二位 AI 的修復前快照；其中 warning／suggestion 已由上方 v2.0 閉環結果取代。

> **審計員**: 獨立第二位高階 AI (Claude Opus 4.6 Thinking)
> **日期**: 2026-07-20
> **變更名稱**: `battle-visual-upgrade`
> **審計範圍**: OpenSpec 實作驗證 + Ponytail 過度工程審計 + 技術債帳簿

---

## Part 1: OpenSpec 實作驗證 (opsx-verify)

### Summary Scorecard

| 維度 | 狀態 |
|------|------|
| **完整性** | ✅ 34/34 tasks `[x]`，所有 capability 均有實作 |
| **正確性** | ✅ 7/7 design decisions 均有對應實作；所有 non-goal 排除項均已遵守 |
| **一致性** | ⚠️ 2 項次要文件/代碼不一致 |

---

### ✅ 完整性 (Completeness)

**Task Completion**: 34/34 (`[x]`)，zero incomplete。

**Spec Coverage**:
- `battle-character-actions`: ✅ 26 action entries 已登錄，hero 4 actions + 6 monsters × 3 actions + dragon 4 actions = 26
- `battle-skill-vfx-library`: ✅ 12 VFX entries + 9 skill icon overrides + `SkillVfxRenderer` 局部元件
- `battle-environment-presentation`: ✅ 5 environment entries + BattleArena 直接渲染 4 overlay + CharacterSprite shadow
- `battle-audio-cue-library`: ✅ 12 cue entries + typed `BattleSoundCue` union + `mapEventToCue` + dedupe + latest-wins
- `battle-asset-pipeline`: ✅ `prepareBattleVisualAssets.ts` 7 atlas map + slice/promote
- `battle-mode` (modified): ✅ `entrance` added to `BattleAssetAction`, `environment` added to `BattleAssetKind`
- `skill-effects-engine` (modified): ✅ `SkillVfxRenderer` in `BattleSkillOverlay.tsx`

**Source-Only Exclusions (0.3 checklist)**: ✅ 全部 7 項確認排除：
- `hero:victory` — not in registry ✅
- `skeleton_wizard:cast` — not in registry ✅
- `dragon_fire:fire-breath` — not in registry, marked `excluded: true` in atlas map ✅
- `environment-rubble`, `environment-ice-motes`, `environment-sparks` — not in registry, marked `excluded: true` ✅
- `battle_victory.ogg` — not in registry, task 1.6 confirms moved to `assets-prep/` ✅

---

### ✅ 正確性 (Correctness)

**Design Decision Adherence**:

| Decision | 遵守狀態 | 證據 |
|----------|----------|------|
| **D1**: 只發布有 consumer 的角色動作 | ✅ | [BattleArena.tsx:399-423](file:///c:/Users/user/Desktop/Quiz-app-/components/BattleArena.tsx#L399-L423) heroAction/monsterAction mapping 精確對應 |
| **D2**: 12 元素 phase + 9 unique skill 圖 | ✅ | [BattleSkillOverlay.tsx:63-153](file:///c:/Users/user/Desktop/Quiz-app-/components/BattleSkillOverlay.tsx#L63-L153) `SkillVfxRenderer` 實作完整 |
| **D3**: Environment image overlay | ✅ | [BattleArena.tsx:549-593](file:///c:/Users/user/Desktop/Quiz-app-/components/BattleArena.tsx#L549-L593) fog/embers/shockwave/speed-lines，最多 4 nodes |
| **D4**: Phase-aware cue mapping | ✅ | [useSoundEffects.ts:40-69](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useSoundEffects.ts#L40-L69) 精確匹配 design 表 |
| **D5**: 固定用途資產準備 | ✅ | [prepareBattleVisualAssets.ts](file:///c:/Users/user/Desktop/Quiz-app-/scripts/prepareBattleVisualAssets.ts) 7 atlas, 2 commands |
| **D6**: 瀏覽器原生載入 + 既有 fallback | ✅ | CharacterSprite `onError` fallback、SkillVfxRenderer 的 fallback chain |
| **D7**: 驗證分離但不建框架 | ✅ | [validateBattleAssets.ts](file:///c:/Users/user/Desktop/Quiz-app-/scripts/validateBattleAssets.ts) 覆蓋全部規則 |

**Non-Goal Compliance** (確認未違反):
- ❌ 無第二 asset registry ✅
- ❌ 無 fallback manager / preload service ✅
- ❌ 無 audio pool / priority queue ✅
- ❌ 無 DOM particle generator ✅
- ❌ 無新 dependency（檢查 `package.json` 無新增）✅
- ❌ 無 telemetry service ✅
- ❌ 無 BattleEnvironmentLayer 檔案 ✅
- ❌ 無 benchmark framework ✅

**Test Coverage**:
- [battleAssetRegistry.test.ts](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/battleAssetRegistry.test.ts): 精確 79 entries、26 actions、12 VFX、5 env、12 audio、7 exclusions、metadata 一致性、budget、format magic ✅
- [useSoundEffects.test.ts](file:///c:/Users/user/Desktop/Quiz-app-/src/__tests__/useSoundEffects.test.ts): cue mapping、dedupe、latest-wins、unmount cleanup、sfx toggle ✅

---

### ⚠️ 一致性 (Coherence)

#### WARNING W-1: Design D5 Atlas Layout 文件與代碼不一致

**文件** ([design.md:106](file:///c:/Users/user/Desktop/Quiz-app-/openspec/changes/battle-visual-upgrade/design.md#L106)):
> `elite-monster-actions.png` `4 × 3` 每列 orc / warrior / wizard；每欄 idle, attack-or-cast, hurt, defeat

**代碼** ([prepareBattleVisualAssets.ts:56-72](file:///c:/Users/user/Desktop/Quiz-app-/scripts/prepareBattleVisualAssets.ts#L56-L72)):
```typescript
'elite-monster-actions.png': {
    cols: 3,  // ← design says 4
    rows: 4,  // ← design says 3
```

Atlas map 使用 `cols: 3, rows: 4` (3 columns × 4 rows)，而 design 說 `4 × 3`。代碼中的 cell layout 顯示每 column 為一個角色（orc、warrior、wizard），每 row 為 idle/attack/hurt/defeat。這與 design 中的「每列角色、每欄動作」意義相同，但維度標註是轉置的。

> **影響**: 此為純文件問題，不影響功能（atlas 已成功 slice/promote 且測試通過）。但若未來有人依照 design 文件重新製作 atlas，會產生混淆。
>
> **建議**: 更新 `design.md` D5 table 的 elite-monster-actions 行為 `3 × 4`，或在 atlas map 旁加註說明列/欄代表什麼。

#### SUGGESTION S-1: `skill-fallback` 和 `fireball` 共享同一 `src` 路徑

[battleAssetRegistry.ts:707-731](file:///c:/Users/user/Desktop/Quiz-app-/constants/battleAssetRegistry.ts#L707-L731):
- `skill-fallback` → `src: '/battle/skills/fireball.webp'`, `width: 418, height: 418`
- `fireball` → `src: '/battle/skills/fireball.webp'`, `width: 500, height: 500`

兩個 entry 指向同一個實體檔案但宣稱不同 dimensions。這意味著 `fireball.webp` 被 promote 後覆蓋了原有的舊 fireball.webp (418×418)，但 `skill-fallback` entry 的 width/height 沒有同步更新。

> **影響**: `skill-fallback` 的 dimensions 記錄過時但目前無任何 consumer 使用這些 dimensions（只用 `src`），因此不影響 runtime 行為。
>
> **建議**: 將 `skill-fallback` 的 `width/height` 更新為 `500 × 500` 以保持 metadata 準確，或在 `sourceNote` 加註 dimensions 為歷史遺留值。

---

## Part 2: Ponytail 過度工程審計 (ponytail-audit)

> 範圍: 本次變更涉及的所有檔案 — `battleAssetRegistry.ts`, `battleTypes.ts`, `BattleArena.tsx`, `BattleSkillOverlay.tsx`, `useSoundEffects.ts`, `validateBattleAssets.ts`, `prepareBattleVisualAssets.ts` 及對應測試。

### Findings (按削減量排序)

| # | Tag | 標的 | 替代方案 | 位置 |
|---|-----|------|---------|------|
| P-1 | `yagni:` | `BattleAssetAction` 的 `'victory'` union member | 無 runtime consumer、無 registry entry、無 atlas promote。刪除此值可將 union 縮減為 7 成員，並消除未來維護者誤以為 victory 已實作的困惑。 | [battleTypes.ts:197](file:///c:/Users/user/Desktop/Quiz-app-/types/battleTypes.ts#L197) |
| P-2 | `yagni:` | `BattleAssetAction` 的 `'anticipate'` union member | 只在 `BattleArena.tsx` 的 `CharacterSprite` 內部做動畫切換使用，但 **registry 中沒有任何 `anticipate` action entry**。`anticipate` 用於觸發 anticipation 動畫 variant 而非載入對應圖片——此值不應屬於 `BattleAssetAction`（它是 asset-centric type），而是 UI animation state。 | [battleTypes.ts:197](file:///c:/Users/user/Desktop/Quiz-app-/types/battleTypes.ts#L197), [BattleArena.tsx:259](file:///c:/Users/user/Desktop/Quiz-app-/components/BattleArena.tsx#L259) |
| P-3 | `shrink:` | `reportedActionFallbacks` + `reportedImageErrors` 兩個模組級 `Set` | 兩個 dev-only dedupe sets 模式完全相同：module-level `Set<string>` + dev guard + conditional add + log。可統一為一個工具函式 `warnOnce(tag, key, msg)` 消除重複（約 -12 行）。 | [battleAssetRegistry.ts:1042](file:///c:/Users/user/Desktop/Quiz-app-/constants/battleAssetRegistry.ts#L1042), [BattleArena.tsx:52](file:///c:/Users/user/Desktop/Quiz-app-/components/BattleArena.tsx#L52) |
| P-4 | `shrink:` | `playedEventCuesRef` 的手動 bounded eviction | 手動 eviction `if (size > 512) delete oldest` 可用一個 fixed-capacity LRU 或直接依 `eventId` 遞增特性只保留近 N 個，簡化控制流。目前實作正確但 ad-hoc。 | [useSoundEffects.ts:199-202](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useSoundEffects.ts#L199-L202) |
| P-5 | `yagni:` | `BattleAssetEntry` 的 `sourceNote` + `usageNote` 必填欄位 | 這兩個欄位只在 validator 中檢查 `.length > 0`，不在 runtime 使用。79 entries × 2 欄位 = 158 個純文件字串佔據了 registry 約 ~30% 的行數。它們的用途可被 `// comment` 取代。但 validator 有對應的 metadata 檢查規則，所以這更多是 **設計品味** 問題而非 bug。 | [battleAssetRegistry.ts](file:///c:/Users/user/Desktop/Quiz-app-/constants/battleAssetRegistry.ts) 全檔 |

**淨評估**: `net: -15~25 lines, -0 deps possible.` 整體極為精簡。在審計的 7 個檔案中，沒有找到：無第二實作的 interface、factory with one product、single-caller wrapper、dead flags、hand-rolled stdlib、或不必要的 dependency。

---

## Part 3: Ponytail 技術債帳簿 (ponytail-debt)

### Scan Results

搜尋範圍: 全專案 `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.css` 中的 `// ponytail:` 或 `# ponytail:` 標記。

| # | 檔案 | 行 | 簡化內容 | Ceiling | Upgrade Trigger | 屬本次變更? |
|---|------|-----|---------|---------|-----------------|------------|
| D-1 | [NodeEditPanel.tsx:245](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/NodeEditPanel.tsx#L245) | 245 | retain fontWeight beside canonical bold for schema-v2 readers | 2026-10-01 migration window | schema-v2 migration | ❌ |
| D-2 | [graphUtils.ts:89](file:///c:/Users/user/Desktop/Quiz-app-/components/KnowledgeGraph/graphUtils.ts#L89) | 89 | retain compatibility alias for external graph utility API | 2026-10-01 migration window | external API migration | ❌ |

**結論**: `2 markers, 0 with no trigger.` 兩個標記均位於 KnowledgeGraph 模組，**不屬於本次 battle-visual-upgrade 變更**。本次變更未新增任何 `ponytail:` 技術債標記。✅

---

## Part 4: 綜合缺陷清單

### 🔴 CRITICAL — 無

無 CRITICAL 等級問題。所有 tasks 完成、所有 requirements 實作、所有 non-goals 遵守。

### 🟡 WARNING (2)

| ID | 描述 | 建議修復 |
|----|------|---------|
| **W-1** | Design D5 的 `elite-monster-actions.png` 維度標註為 `4×3`，但代碼實作為 `cols: 3, rows: 4`（轉置）。 | 更新 [design.md:106](file:///c:/Users/user/Desktop/Quiz-app-/openspec/changes/battle-visual-upgrade/design.md#L106) 為 `3 × 4`。 |
| **P-1** | `BattleAssetAction` 包含 `'victory'` 成員但無任何 runtime consumer、registry entry 或 atlas promote。此為 YAGNI 的典型案例。 | 從 [battleTypes.ts:197](file:///c:/Users/user/Desktop/Quiz-app-/types/battleTypes.ts#L197) 移除 `'victory'`，或加上 `ponytail:` 標記說明其保留理由（如預計在下一輪 change 中實作）。 |

### 🔵 SUGGESTION (4)

| ID | 描述 | 建議修復 |
|----|------|---------|
| **P-2** | `'anticipate'` 是 UI animation state 而非 asset action，不該屬於 `BattleAssetAction` type。 | 若 anticipate 永遠不需要對應的 registry image，考慮拆為獨立的 `CharacterAnimationState` type。但目前 `getBattleCharacterAsset` 會優雅 fallback 到 idle，所以不阻塞。 |
| **P-3** | 兩個 dev-only dedupe set 模式重複。 | 提取 `warnOnce(tag, key, msg)` 工具函式，約可消除 ~12 行重複。 |
| **S-1** | `skill-fallback` 的 dimensions (418×418) 與實際檔案 (500×500, 被 fireball promote 覆蓋) 不一致。 | 更新 `skill-fallback` 的 width/height 為 500。 |
| **P-5** | `sourceNote`/`usageNote` 佔 registry ~30% 行數但非 runtime 使用。 | 設計品味問題，不強制。可考慮移至 JSDoc 或外部 manifest 文件。 |

---

## Final Assessment

> **✅ No critical issues. 2 warning(s) to consider. Ready for archive (with noted improvements).**

本次 `battle-visual-upgrade` 變更在實作完整性、設計遵從度和代碼精簡度方面表現**優異**。以下是審計數據摘要：

- **34/34** tasks 完成
- **7/7** design decisions 正確遵從
- **0** 個被禁止的抽象層（第二 registry/scheduler/telemetry/preload service 等）被引入
- **0** 個新外部依賴
- **79** 個 registry entries 全部有對應的真實檔案
- **7** 個 source-only exclusion 全部正確排除
- 測試覆蓋了 registry 精確計數、metadata 一致性、format magic、budget、cue mapping/dedupe/latest-wins 和 unmount cleanup
- Ponytail 審計僅發現 **5 個微觀級** 過度工程信號，其中最大的 (`'victory'` YAGNI) 只影響 1 行
- 技術債帳簿中 **0 個標記屬於本次變更**

此變更可安全歸檔。建議在歸檔前處理 W-1（文件不一致）和 P-1（victory YAGNI）。
