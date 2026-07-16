## ADDED Requirements

### Requirement: Presentation consumes an ordered battle event queue
戰鬥呈現層 SHALL 只消費由戰鬥轉移輸出的具型別事件，依 correlation ID 與 sequence 順序演出；每個 active event SHALL 只有一個 completion owner，完成、取消或 fallback 後 SHALL 至多 acknowledge 一次。

#### Scenario: Normal attack completes
- **WHEN** presenter 收到一般攻擊事件序列
- **THEN** 系統 SHALL 依序呈現 hero anticipation、projectile／strike、monster impact、damage feedback 與 settle
- **AND** 只有 presenter scheduler SHALL 推進至下一事件
- **AND** Hook、CSS effect、video `onEnded` 不得各自重複完成同一事件

#### Scenario: Media ends before the safety timeout
- **WHEN** 技能影片正常觸發 `ended`
- **THEN** presenter SHALL acknowledge 目前事件一次並取消 safety timeout
- **AND** 遲到的 timeout SHALL 不得改變新事件狀態

#### Scenario: Event is cancelled on unmount or mode toggle
- **WHEN** BattleArena 卸載、Game Mode 關閉、Chunk 邊界改變或使用者離開頁面
- **THEN** presenter SHALL 取消所有 pending timers、animation callbacks、media listeners 與 queued audio cues
- **AND** 取消事件 SHALL 不再更新已卸載元件

#### Scenario: Page becomes hidden during presentation
- **WHEN** 頁面在 active phase、video playback 或 safety deadline 期間變為 hidden
- **THEN** presenter SHALL 取消 active event 與 pending presentation queue，清除 timers 與 media listeners
- **AND** 呈現層 SHALL 立即 settle 到最新 durable battle state
- **AND** 頁面回復 visible 後 SHALL 不重播舊動畫或再次 complete 舊 event

### Requirement: Every combat outcome has explicit visual phases
一般攻擊、技能、怪物攻擊、暴擊、護盾、怪物擊倒、英雄敗北、怪物生成與 Boss 出場 SHALL 各有明確 phase contract；presentation state SHALL 描述 actor、target、effect、phase 與 event ID，而非只保存一個模糊字串。

#### Scenario: Correct answer normal attack
- **WHEN** 正確答案沒有觸發技能且怪物未被擊倒
- **THEN** 英雄 SHALL 由 idle 進入 anticipation、attack 與 recover pose
- **AND** projectile／slash SHALL 從英雄朝怪物移動
- **AND** 怪物 SHALL 在 impact phase 顯示 hurt pose、受擊閃光與傷害數字後回到 idle

#### Scenario: Wrong answer monster attack
- **WHEN** 答錯且英雄仍存活
- **THEN** 怪物 SHALL 顯示 anticipation 與 attack pose
- **AND** 英雄 SHALL 顯示 hurt feedback、HP 更新與受擊方向
- **AND** 題目操作區 SHALL 保持可理解且不被長時間遮擋

#### Scenario: Monster defeat and next spawn
- **WHEN** 傷害令怪物 HP 到達 0
- **THEN** 系統 SHALL 在傷害 impact 後呈現 defeat pose／消散
- **AND** SHALL 在 defeat 完成後呈現下一怪物的 spawn／entrance
- **AND** 新怪物 HP 與名稱不得在舊怪物尚未離場時提前閃現

#### Scenario: Boss entrance
- **WHEN** next encounter 為 Boss
- **THEN** arena SHALL 顯示可辨識但有上限的 Boss title、環境色調與 entrance cue
- **AND** Boss 進場 SHALL 不阻塞測驗超過規定 presentation duration

### Requirement: Character visuals map to semantic action states
英雄與每種怪物 SHALL 經 typed visual registry 映射至 `idle`、`anticipate`、`attack`、`hurt`、`defeat` 等可用姿態；可選 `victory`／`cast` 狀態在資源存在時使用。renderer SHALL 使用狀態資源，不得為所有動作永遠重複同一靜態圖。

#### Scenario: Complete action set is available
- **WHEN** 角色 registry 為目前 action 提供正式透明資源
- **THEN** renderer SHALL 顯示該 action 對應資源
- **AND** CSS／Framer transitions SHALL 只處理位移、縮放、閃光與換圖節奏

#### Scenario: Optional action is unavailable
- **WHEN** 某角色缺少 optional action pose
- **THEN** renderer SHALL 依 registry 的明確 fallback chain 回退到最接近的合法 pose
- **AND** SHALL 記錄一次開發診斷
- **AND** 不得在 render 中動態建立未登錄 base64 placeholder

#### Scenario: Monster scale differs by difficulty
- **WHEN** normal、elite 或 boss monster 被渲染
- **THEN** renderer SHALL 使用 registry 的受限 visualScale 與 anchor metadata
- **AND** sprite SHALL 保持在 arena safe area，不得遮住主要 HUD 或題目操作

### Requirement: VFX meaning matches the underlying battle event
projectile、impact、screen feedback、particle palette、skill icon、damage number 與音效 SHALL 從同一 BattlePresentationEvent 的 attack／skill ID、element、critical 與 shield metadata 派生；一般攻擊不得在 render 時隨機變成與事件無關的元素。

#### Scenario: Fire skill hits a monster
- **WHEN** active event 的 element 為 `fire`
- **THEN** projectile、impact、particle palette 與 audio cue SHALL 使用 fire mapping
- **AND** skill icon SHALL 使用同一 skill ID 的 registry entry

#### Scenario: Seeded particle layout rerenders
- **WHEN** active event 因父元件 render 而重新渲染
- **THEN** particle positions SHALL 由 event ID／預先計算 seed 穩定產生
- **AND** 粒子不得在每次 render 重新呼叫未注入的 `Math.random()` 而跳位

#### Scenario: Critical damage is shown once
- **WHEN** damage event 標示 `isCrit=true`
- **THEN** arena SHALL 顯示一次加強傷害數字與短促命中 feedback
- **AND** 不得同時由 projectile component 與全域 CustomEvent 各顯示一份傷害

### Requirement: Skill presentation supports image, CSS and video paths consistently
技能 presenter SHALL 依 typed skill visual registry 選用 CSS／圖像或 video 表現，並維持一致的 cast、impact、result 生命週期。系統 SHALL 只宣告實際支援的 animation type 與存在的 media source。

#### Scenario: CSS or image skill executes
- **WHEN** 技能使用 CSS／圖像 presentation
- **THEN** 系統 SHALL 顯示清晰的 skill icon／名稱、目標導向效果與 impact
- **AND** 所有 Tailwind class SHALL 為靜態可分析或改用 typed inline values
- **AND** production CSS SHALL 包含所需樣式

#### Scenario: WebM skill video executes
- **WHEN** 已登錄 WebM 影片可載入及播放
- **THEN** video SHALL 使用實際存在的 source、有限等待時間與可取消 listener
- **AND** 影片不得在初始 BattleArena 載入時自動下載全部高 tier 媒體

#### Scenario: Video cannot load or autoplay
- **WHEN** video error、decode error、autoplay rejection 或安全等待時間到期
- **THEN** 系統 SHALL 切換至該 skill 的已登錄 CSS／圖像 fallback
- **AND** SHALL 保持相同 damage、shield、dialogue 與 completion semantics
- **AND** 不得引用不存在的 MP4 檔案
- **AND** timeout、error、hidden 或 unmount 後 SHALL 解除 media listener、清空 video `src` 並重置 media element，不得在 fallback 後繼續背景下載

### Requirement: Arena layout is layered, responsive and geometry-stable
BattleArena SHALL 以背景、環境、中景角色、projectile／impact、HUD 及暫態 overlay 的固定層級呈現，並在手機、桌面與容器 resize 時維持角色朝向中心、目標座標及 safe area。動畫 SHALL 主要使用 transform／opacity，避免每 frame layout measurement。

#### Scenario: Arena first becomes measurable
- **WHEN** hero、monster 與 arena elements 首次 mount 或容器尺寸改變
- **THEN** 系統 SHALL 透過受控 geometry measurement／ResizeObserver 更新 anchors
- **AND** active projectile SHALL 使用該事件的穩定座標快照
- **AND** render loop SHALL 不重複呼叫 `getBoundingClientRect()` 造成 layout thrash

#### Scenario: Mobile viewport
- **WHEN** viewport 為 360x640 等小型裝置
- **THEN** hero、monster、health bars 與 dialogue SHALL 留在 arena bounds
- **AND** quiz answers、提交與下一題 controls SHALL 可見且可點擊
- **AND** presentation overlay SHALL 不產生水平 scroll

#### Scenario: Desktop viewport
- **WHEN** viewport 大於等於 1024px
- **THEN** arena SHALL 利用額外空間增加層次而非任意放大遮擋
- **AND** background／ambient layers SHALL 不影響文字對比

### Requirement: Battle HUD communicates state accessibly
英雄與怪物血量、streak、技能里程碑、Boss／Elite 身份、傷害結果與戰鬥不可用狀態 SHALL 同時以視覺和語意方式傳達；裝飾特效 SHALL `aria-hidden`，重要結果 SHALL 經節流的 polite live region 宣告。

#### Scenario: Health changes
- **WHEN** 英雄或怪物 HP 改變
- **THEN** health bar SHALL 具有 `role="progressbar"`、可理解 label、`aria-valuemin=0`、正確 `aria-valuemax` 與 `aria-valuenow`
- **AND** 顏色不得是唯一的剩餘血量線索

#### Scenario: Damage and defeat announcement
- **WHEN** 一次攻擊造成傷害或擊倒
- **THEN** live region SHALL 宣告合併後的關鍵結果而非每一粒子／frame
- **AND** announcement SHALL 不重複同一 event ID

#### Scenario: Decorative animation renders
- **WHEN** 粒子、光暈、震動、背景霧或 projectile 被渲染
- **THEN** 這些元素 SHALL 不進入 accessibility tree
- **AND** SHALL 不攔截 pointer 或 keyboard input

### Requirement: Motion and sensory effects honor user preferences
系統 SHALL 偵測 `prefers-reduced-motion`，並為 reduced mode 提供相同資訊與完成語義的低動態演出；高亮閃光、全畫面震動、粒子量與影片 SHALL 有安全上限，且音效 SHALL 遵守既有使用者聲音設定。

#### Scenario: Reduced motion is enabled
- **WHEN** 瀏覽器回報 `prefers-reduced-motion: reduce`
- **THEN** projectile 長距離移動、反覆 pulse、parallax、劇烈 shake 與 autoplay skill video SHALL 停用或縮短為淡入／狀態切換
- **AND** damage、skill、defeat 與 next encounter 結果 SHALL 仍清楚呈現
- **AND** event queue SHALL 正常完成而非等待已停用動畫

#### Scenario: Full motion is enabled
- **WHEN** 使用者未要求 reduced motion
- **THEN** 系統 SHALL 使用依 tier 設定且有最大時長／粒子數的完整演出
- **AND** 無限動畫 SHALL 僅限低成本 ambient layer 並在頁面 hidden 時暫停

#### Scenario: Sound is disabled
- **WHEN** 使用者關閉 sound effects 或 BGM
- **THEN** presenter SHALL 不播放相應 cue
- **AND** 視覺／語意回饋與事件完成 SHALL 不依賴音訊

### Requirement: Battle audio preserves shared ownership
戰鬥音效與 BGM SHALL 沿用既有共享 `useSoundEffects`並映射至具名 cue；BattleArena 卸載 SHALL 只停止自身播放，不得全域 unload 仍被其他元件使用的音源。除非出現第二個實際 controller consumer，不新增另一層 audio service。

#### Scenario: Concurrent sound consumers exist
- **WHEN** Settings preview、FocusTimer 或其他元件與 BattleArena 同時使用音訊服務
- **THEN** BattleArena 卸載 SHALL 不使其他 consumer 的 cue 失效

#### Scenario: Rapid event sequence plays cues
- **WHEN** cast、impact 與 defeat 在短時間內依序發生
- **THEN** controller SHALL 依 cue policy 控制重疊、debounce 或優先級
- **AND** 同一 event ID 的 cue SHALL 至多播放一次

#### Scenario: Browser audio initialization fails
- **WHEN** Howler 或瀏覽器 audio context 無法初始化
- **THEN** 戰鬥與測驗 SHALL 繼續
- **AND** controller SHALL 回傳安全 no-op 而非拋出至 UI

### Requirement: Presentation never blocks core quiz interaction indefinitely
每個 presentation event SHALL 有可取消的最長時限與 fallback；overlay SHALL 預設不攔截 pointer，只有明確需要的可互動戰鬥控制可取得焦點。無論媒體、動畫或音效是否成功，下一題與答題流程 SHALL 在受測時限內恢復。

#### Scenario: Animation completion callback never fires
- **WHEN** CSS animation、Framer callback 或 media event 未觸發
- **THEN** safety deadline SHALL 完成或降級該 event
- **AND** presenter SHALL 清理 stale resources
- **AND** 使用者 SHALL 能繼續測驗

#### Scenario: User submits during settle phase
- **WHEN** quiz UI 已允許下一個答案而前一演出仍在 non-critical settle phase
- **THEN** 新 battle event SHALL 依 queue policy 排隊或合併
- **AND** 不得覆蓋 active event 或丟失 durable transition
- **AND** quiz submission lock SHALL 維持每題一次的規則
