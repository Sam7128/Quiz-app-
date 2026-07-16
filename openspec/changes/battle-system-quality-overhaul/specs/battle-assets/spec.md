## ADDED Requirements

### Requirement: Concept boards and runtime assets have separate status
`assets-prep/battle-visual-upgrade/` 的整張風格板、角色 roster、action sheet、技能系統板、VFX 語言板與 HUD 示意圖 SHALL 被標記為 reference-only；只有通過切分、透明度、尺寸、命名、視覺檢閱與自動驗證的單一 runtime asset 才可進入 `public/battle/` 及 registry。

#### Scenario: Developer attempts to register a concept board as a sprite
- **WHEN** registry entry 指向 `assets-prep` 或指向含多角色／多格示意的整張 board
- **THEN** asset validation SHALL 失敗
- **AND** build quality gate SHALL 回報具體 asset ID 與路徑

#### Scenario: Prepared pose is promoted to runtime
- **WHEN** 一個角色 pose 已被輸出為獨立透明圖、通過視覺檢閱且符合 registry schema
- **THEN** 該檔案 SHALL 放在版本化 runtime 路徑
- **AND** manifest SHALL 記錄其來源 board、角色、action、尺寸、anchor、format 與狀態

### Requirement: Runtime assets are described by typed registries
英雄、怪物、技能、projectile、impact、背景、環境層、影片與音訊 SHALL 由具體 TypeScript 型別及 readonly registry 描述；component SHALL 以穩定 ID 解析資源，不得散落硬編碼路徑、推測副檔名或動態拼接不存在的 fallback。

#### Scenario: Registered character resolves
- **WHEN** renderer 以合法 character ID 與 action 查詢 registry
- **THEN** resolver SHALL 回傳存在的 primary source、dimensions、anchor、facing、scale 與 fallback chain

#### Scenario: Registry references missing file
- **WHEN** 自動驗證發現 registry source 不存在、大小寫不符或使用未允許副檔名
- **THEN** 驗證 SHALL 以非零狀態失敗
- **AND** 報告 SHALL 指出 registry entry 與缺失路徑

#### Scenario: File exists but is not registered
- **WHEN** `public/battle/` 中出現未被 manifest 登錄且不在明確 ignore list 的媒體檔
- **THEN** 驗證 SHALL 回報 orphan asset
- **AND** 實作者 SHALL 登錄或刪除該檔，不得讓資源無主累積

### Requirement: Character and icon assets meet transparency and readability rules
角色 action sprite、projectile、impact 與技能 icon SHALL 具有透明背景及可辨識 silhouette；技能 icon SHALL 在 48x48 CSS pixels 仍可區分，角色 SHALL 面向 arena 中心並使用一致的左上光源。例外的完整背景／遮罩資源 SHALL 在 registry 明確標記為 opaque。

#### Scenario: Transparent sprite validation
- **WHEN** validator 檢查角色、怪物、projectile、impact 或 icon 類 asset
- **THEN** 圖像 SHALL 含 alpha channel
- **AND** 四角透明度與非透明 bounds SHALL 符合該類別門檻
- **AND** 不得把白色／棋盤格背景誤當透明

#### Scenario: Opaque background validation
- **WHEN** asset category 為 arena background 或明確的 full-screen mask
- **THEN** registry SHALL 允許 opaque image
- **AND** validator SHALL 不要求 alpha channel

#### Scenario: Icon readability review
- **WHEN** 新技能 icon 準備上線
- **THEN** 既有 Playwright QA 頁面 SHALL 同時顯示原尺寸、96px 與48px版本，不需另建 generator
- **AND** 同 tier 的 shape、元素色與邊框 SHALL 可區分
- **AND** 自動驗證 SHALL 檢查尺寸、alpha 與非空內容，人工檢閱 SHALL 確認語義可辨識

### Requirement: Runtime image dimensions and anchors are normalized
同一 asset category SHALL 使用受控 canvas、content bounds 與 anchor 規則；不同原始尺寸不得令角色在換 action 時跳位。registry SHALL 驗證 visualScale、anchor 與 hit target metadata 在安全範圍。

#### Scenario: Character changes from idle to attack
- **WHEN** renderer 在同一角色的 idle 與 attack asset 間切換
- **THEN** feet／ground anchor SHALL 保持穩定
- **AND** sprite bounds SHALL 不因來源 canvas 大小差異而產生非預期跳動

#### Scenario: Oversized or malformed metadata
- **WHEN** visualScale、anchor、width 或 height 超出類別限制
- **THEN** registry validation SHALL 失敗
- **AND** renderer SHALL 不直接套用該值

#### Scenario: Existing 677x369 monster is migrated
- **WHEN** Skeleton Wizard 等非方形舊圖轉換為新 action set
- **THEN** 它 SHALL 使用與其他 monster 相同的 normalized anchor contract
- **AND** Boss 身份與 safe-area scale SHALL 維持正確

### Requirement: Runtime media formats and size budgets are enforced
正式 runtime 圖像 SHALL 優先使用具 alpha 的 WebP／PNG，背景 SHALL 使用最佳化 WebP／AVIF 或經證實相容的等價格式；影片 SHALL 使用實際可播放的 WebM 並提供非影片 fallback。資源驗證 SHALL 強制下列壓縮後預算，除非在變更 design 中記錄量測證據與核准的新預算：單一 character pose ≤ 250 KiB、單一 skill icon ≤ 120 KiB、單一 background layer ≤ 700 KiB、單一 skill video ≤ 6 MiB、初次進入戰鬥的關鍵圖像總量 ≤ 1.5 MiB（不含使用者已快取資源及延遲影片）。

#### Scenario: Oversized image enters runtime folder
- **WHEN** 新增或修改的 asset 超過其 category budget
- **THEN** asset budget test SHALL 失敗並列出實際與允許大小
- **AND** 實作者 SHALL 最佳化、分層或記錄經核准的預算變更

#### Scenario: Existing 7-9 MiB skill video is migrated
- **WHEN** 既有高 tier WebM 超過 6 MiB
- **THEN** 實作者 SHALL 重新編碼、裁短或更換為符合預算的版本
- **AND** 在達標前該影片 SHALL 保持 lazy 並有 CSS／圖像 fallback

#### Scenario: Initial battle route loads
- **WHEN** 使用者首次開啟 Game Mode
- **THEN** 瀏覽器 SHALL 只請求當前背景、英雄、當前怪物、HUD 與必要基礎效果
- **AND** 高 tier skill video SHALL 不計入初始請求集合

### Requirement: Native loading and preloading behavior are bounded
素材 SHALL 使用瀏覽器 HTTP cache、`<img>`／`Image.decode()` 與 `<video preload="none">`，不建立自製 fetch/decode promise cache service。首次戰鬥路徑 SHALL 只載入目前角色、目前怪物與必要 HUD；arena settled 且 next encounter 已確定後，才可使用原生 `Image` 預載至多一個 next monster。頁面 hidden、mode 關閉、timeout 或遭遇改變時 SHALL 釋放元件參照並停止不再需要的 video download。

#### Scenario: Current monster changes
- **WHEN** 舊 monster defeat 且 next encounter 已解析
- **THEN** loader SHALL 釋放舊 encounter 專用參照
- **AND** SHALL 只預載新 monster 的必要 action set
- **AND** 不得一次下載整個怪物 roster

#### Scenario: Legendary skill has not been reached
- **WHEN** streak 尚未接近對應高 tier 里程碑
- **THEN** legendary video SHALL 不被 eager preload

#### Scenario: Asset is cached
- **WHEN** 同一 source 已成功載入且再次被查詢
- **THEN** renderer SHALL 交由瀏覽器 cache 重用同一 URL
- **AND** React render SHALL 不得動態產生新 URL 或新的 preload helper

### Requirement: Every runtime asset has a deterministic fallback
registry SHALL 為可失敗的角色、技能、影片、背景與音效定義 fallback；fallback SHALL 保持戰鬥資訊與事件完成，不得依賴 render-time `btoa`、遠端 URL、未登錄檔案或 production 假資料。

#### Scenario: Character pose fails to decode
- **WHEN** 特定 action image 404 或 decode 失敗
- **THEN** renderer SHALL 依 registry 回退至同角色的合法 pose，再回退至通用本地 silhouette
- **AND** 同一路徑錯誤 SHALL 只記錄一次
- **AND** event SHALL 繼續完成

#### Scenario: Background layer fails
- **WHEN** arena background 或 ambient layer 無法載入
- **THEN** 系統 SHALL 顯示本地 CSS gradient fallback
- **AND** HUD 對比與 quiz controls SHALL 保持可用

#### Scenario: Audio cue fails
- **WHEN** cue source 無法載入
- **THEN** 既有 shared sound hook SHALL 執行 no-op fallback
- **AND** presentation completion SHALL 不等待音訊

### Requirement: Runtime provenance is minimal and non-blocking
本變更實際引用的 runtime asset SHALL 在單一 registry 記錄 asset ID、source note、usage/license note 與 `approved` status。未核准的全新美術 SHALL 使用既有本地 fallback，不得為了通過本 change 而填入虛假 reviewer/date/prompt metadata。完整 roster 的新美術製作與核准屬後續 change。

#### Scenario: Generated concept is converted to production
- **WHEN** production asset 由先前生成的 board 衍生
- **THEN** manifest SHALL 指向該 board 與對應角色／技能概念
- **AND** review status SHALL 在視覺檢閱前為 `draft`
- **AND** 只有 `approved` asset 可由 production registry 引用

#### Scenario: Asset provenance is incomplete
- **WHEN** manifest 缺少來源、usage note 或 review status
- **THEN** validation SHALL 失敗
- **AND** build SHALL 不得以 placeholder metadata 繞過

### Requirement: Asset quality uses existing tools and a small visual set
專案 SHALL 以 Node `fs`／`path` 驗證檔案存在、format、bytes、registry completeness 與 orphan，以既有 Playwright／browser canvas 驗證 dimensions／alpha。不新增 `sharp`、contact-sheet generator 或 perceptual-hash pipeline。視覺回歸 SHALL 保留 desktop normal、mobile Boss 與 reduced-motion fallback 三個決定性 baseline；其他狀態使用 component assertions。

#### Scenario: Asset validation runs in CI or local quality gate
- **WHEN** 執行 battle asset validation command
- **THEN** 所有檢查 SHALL 以機器可判斷的 exit code 結束
- **AND** 失敗訊息 SHALL 包含 asset ID、rule 與修正方向

#### Scenario: Visual baseline is intentionally updated
- **WHEN** 核准的美術或 layout 變更造成 screenshot 差異
- **THEN** 實作者 SHALL 先檢閱 desktop、mobile 與 reduced-motion diff
- **AND** baseline 更新 SHALL 與對應實作及審核紀錄同一變更提交
- **AND** 不得以全域提高 threshold 或停用動畫斷言掩蓋差異
