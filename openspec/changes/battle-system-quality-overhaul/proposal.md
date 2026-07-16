## Why

現有戰鬥模式雖能運作，但戰鬥規則、持久化、動畫排程、對話與瀏覽器事件集中在單一 Hook，畫面又以同一張靜態角色圖、隨機特效及多個互相競爭的完成計時器呈現；結果是演出單薄、里程碑 Boss 與快速答題邊界不可靠，也難以安全加入先前生成的素材。這次變更把「戰鬥結果正確」與「演出可控、可存取、可降級」一併規格化，讓後續實作可逐步驗證，而不是只替現有畫面疊加更多特效。

## What Changes

- 將答題、傷害、技能里程碑、護盾、死亡、怪物輪替與 Boss 排程收斂為可注入亂數與時鐘的純戰鬥轉移模型，消除 stale closure、未使用怪物池及模糊的 `% 10 / % 10 + 1` 容錯規則。
- 將可持久化的戰鬥進度與短暫動畫／對話狀態分離；V2 寫入新的 `mindspark_battle_state_v2`，舊 `mindspark_battle_state` 只作驗證後遷移的唯讀來源，避免舊 PWA 分頁覆寫新格式。
- 引入單一擁有者的戰鬥演出事件佇列，明確描述蓄力、出手、命中、受傷、擊倒、生成與結算階段，避免 Hook、CSS 技能層與影片各自完成同一動畫。
- 重構戰鬥舞台、角色／怪物動作、技能、HUD、傷害數字與音效提示；保留 `BattleArena` 作為穩定入口，只在 state ownership 或測試痛點已明確時才抽出子元件，不預先鎖死六個介面。
- 將 `assets-prep/battle-visual-upgrade/` 定位為美術參考來源，只登錄本輪實際消費的已核准 runtime 素材，以 Node 標準庫與既有 Playwright／browser canvas 驗證路徑、透明度、尺寸與體積；不新增 `sharp`、自製 loader cache 或 contact-sheet generator。尚未核准的全新美術改用既有本地 fallback，不阻塞本 change。
- 加入響應式布局、`prefers-reduced-motion`、語意化血量條、戰鬥結果 live region、裝飾特效隱藏與低效能降級，確保動畫不妨礙答題流程。
- 在既有 `useSoundEffects` 內將通用攻擊音效改為事件對應 cue，移除 `BattleArena` 卸載時的全域 unload；不新增第二個 audio controller。
- 移除未使用／不真實的合約與路徑，包括死碼 `handleCorrectAnswer`、沒有消費者的 `battle:damage` 事件、未實作的 `lottie`／`sequence` 動畫型別、虛設 `monsterPool` 及不存在的 MP4 fallback。
- 建立純邏輯、persistence、presenter、核心元件、無障礙、單一公開 UI E2E、三個決定性視覺 baseline、素材預算與 build 閘門；測試使用隔離儲存，不改寫正式資料或加入 production cheat。

## Capabilities

### New Capabilities

- `battle-presentation`: 定義事件驅動的動畫階段、角色／怪物／技能／HUD／音效呈現、響應式布局、無障礙、降級與演出完成語義。
- `battle-assets`: 定義概念素材到正式 runtime 素材的登錄、驗證、最佳化、預載、fallback、體積預算與授權追蹤。

### Modified Capabilities

- `battle-mode`: 重新定義答題到戰鬥結果的原子轉移、技能與遭遇排程、怪物傷害、分段練習重置、版本化持久化及快速／重複輸入邊界。
- `audio-resource-lifecycle`: 將 BattleArena 卸載時的全域 SFX unload 改為共享 Howl 所有權；僅映射已核准 cue，缺少或初始化失敗時安全 no-op。

## Impact

- 核心型別與規則：`types/battleTypes.ts`、`constants/monstersData.ts`、`constants/skillsData.ts`，以及新增的純戰鬥 engine、快照 codec 與素材 registry。
- 狀態協作：`hooks/useBattleSystem.ts`、`components/QuizCard.tsx` 與分段練習 `chunkMeta` 邊界；對 `AppContent`／設定頁維持既有 `gameMode` 外部行為。
- 呈現與媒體：`components/BattleArena.tsx`、`SkillAnimation.tsx`、`AttackEffect.tsx`、角色攻擊／血量／連擊／傷害元件、`hooks/useSoundEffects.ts`、`public/battle/**` 及 `assets-prep/battle-visual-upgrade/**`。
- 測試與工具：擴充 Vitest／React 元件測試／Playwright E2E，加入素材清單與預算驗證腳本；沿用 React、Framer Motion、Howler 與現有 Vite 工具鏈，不引入 Lottie、Canvas 引擎或新的動畫依賴。
- 使用者資料：舊 key 只讀、V2 寫新 key，以 schema migration 保留合法舊快照；測試只可使用 mock storage，禁止觸碰正式 `mindspark_*` 資料。
