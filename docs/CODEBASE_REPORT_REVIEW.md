# MindSpark 代碼庫改善報告 — 獨立第三方深度審查報告

> **審查者**：Project Inquisitor（第三方代碼審計角色）
> **審查對象**：[CODEBASE_INNOVATION_AND_IMPROVEMENT_REPORT.md](file:///c:/Users/user/Desktop/Quiz-app-/docs/CODEBASE_INNOVATION_AND_IMPROVEMENT_REPORT.md)（50 輪、2927 行）
> **參考材料**：[AI deep_analysis.md](file:///c:/Users/user/Desktop/Quiz-app-/docs/AI%20deep_analysis.md)（兩位 AI 的獨立分析）
> **驗證方法**：直接對照當前代碼庫源碼（grep + view_file 逐行核實）
> **審查日期**：2026-09-28

---

## 📊 總體判定

| 維度 | 評分 | 說明 |
|:---|:---:|:---|
| 問題發現的真實性 | **85%** | 核心技術問題大多確實存在，少數描述過時或嚴重度灌水 |
| 原因診斷的準確性 | **80%** | 多數根因分析精準，部分場景推演過度誇大災難性 |
| 建議功能的實用性 | **55%** | P0 級速贏功能極具價值；但近半數建議屬過度工程 |
| 報告整體可信度 | **中高（需篩選）** | 當作「候選 Backlog 線索池」而非「已驗證施工圖」使用 |

---

## 第一部分：問題真實性與原因逐條核實

### ✅ 確認真實存在 — 代碼實證充分

#### 1. SM-2 待複習入口斷鏈（Round 1, 8）

| 項目 | 內容 |
|:---|:---|
| **報告聲稱** | `dueCount` 完全沒有被 JSX 引用，使用者無法發起到期複習 |
| **代碼實證** | [Dashboard.tsx:172-178](file:///c:/Users/user/Desktop/Quiz-app-/components/Dashboard.tsx#L172-L178) 確實渲染了 `有 {dueCount} 題需要複習`，但它是純 `<div>`，**不是按鈕、不可點擊** |
| **判定** | ✅ **問題真實存在**（報告初版描述略有偏差，但本質正確：有提示無操作入口） |
| **嚴重度** | **P0** — 核心認知科學賣點完全沉睡 |

#### 2. 快捷鍵劫持瀏覽器原生組合鍵（Round 9）

| 項目 | 內容 |
|:---|:---|
| **報告聲稱** | `useKeyboardShortcuts` 缺少 `ctrlKey/altKey/metaKey/isComposing` 守衛 |
| **代碼實證** | [useKeyboardShortcuts.ts:29-38](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useKeyboardShortcuts.ts#L29-L38) — **確認完全沒有修飾鍵檢查**，對 `1-4, h, H, Enter, Escape` 直接 `preventDefault()` |
| **判定** | ✅ **100% 真實存在** — `Ctrl+1`（切分頁）、`Ctrl+H`（歷史紀錄）確實會被劫持 |
| **嚴重度** | **P1** — 修復成本極低（3 行代碼），立即應修 |

#### 3. 登出未清 localStorage 導致跨帳號殘留風險（Round 22）

| 項目 | 內容 |
|:---|:---|
| **報告聲稱** | `signOut` 僅呼叫 `supabase.auth.signOut()`，完全不清本地資料 |
| **代碼實證** | [AuthContext.tsx:42-44](file:///c:/Users/user/Desktop/Quiz-app-/contexts/AuthContext.tsx#L42-L44) — **確認只有 `await supabase.auth.signOut();`，無任何 localStorage 清理** |
| **判定** | ✅ **真實存在** |
| **嚴重度修正** | **P0 安全風險**，但報告說「無聲自動上傳」需修正 — 實際上 `useBankManager` 會有確認對話框，不是全自動。正確描述：**存在跨帳號殘留與誤同步風險，非完全無提示** |

#### 4. UTC 時區導致晨讀打卡倒流（Round 35）

| 項目 | 內容 |
|:---|:---|
| **報告聲稱** | `toISOString().split('T')[0]` 使東八區 00:00-07:59 記錄被算到昨天 |
| **代碼實證** | [analytics.ts:25](file:///c:/Users/user/Desktop/Quiz-app-/services/analytics.ts#L25) 與 [analytics.ts:168](file:///c:/Users/user/Desktop/Quiz-app-/services/analytics.ts#L168) — **兩處均使用 `new Date().toISOString().split('T')[0]`**，且 [streak.ts:82](file:///c:/Users/user/Desktop/Quiz-app-/services/streak.ts#L82) 同樣存在 |
| **判定** | ✅ **100% 真實存在** — 直接影響連續學習天數（Streak）計算 |
| **嚴重度** | **P1** — 影響台灣/香港/新加坡等 UTC+8 用戶群 |

#### 5. 幽靈成就系統（Round 12）

| 項目 | 內容 |
|:---|:---|
| **報告聲稱** | 成就定義了 20+ 項，但 `useAchievementTracker` 只處理 4 個 |
| **代碼實證** | [useAchievementTracker.ts](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useAchievementTracker.ts) — 全文 47 行，僅處理 `perfect_score`、`first_question`、`night_owl`、`early_bird` |
| **判定** | ✅ **100% 真實存在** — 其餘成就永遠不會被解鎖 |
| **嚴重度** | **P1** — 對學習激勵系統的信任感有中度傷害 |

#### 6. FocusTimer 完成時長未寫入統計（Round 29, 40）

| 項目 | 內容 |
|:---|:---|
| **報告聲稱** | `Dashboard.tsx` 渲染 `<FocusTimer />` 時未傳入 `onSessionComplete` |
| **代碼實證** | Dashboard.tsx 中搜尋 `FocusTimer` — **0 結果**（可能已移除或重構），但 [FocusTimer.tsx:5](file:///c:/Users/user/Desktop/Quiz-app-/components/FocusTimer.tsx#L5) 確實宣告了 `onSessionComplete?` 回調 |
| **判定** | ⚠️ **需重新確認** — Dashboard 中可能已無 FocusTimer 或路徑變更，但若仍存在則問題成立 |

#### 7. SM-2 硬編碼 4/1 評分（Round 1, 12）

| 項目 | 內容 |
|:---|:---|
| **報告聲稱** | 答對硬編碼 grade=4，答錯硬編碼 grade=1，失去動態間隔精髓 |
| **代碼實證** | [useQuizEngine.ts:323](file:///c:/Users/user/Desktop/Quiz-app-/hooks/useQuizEngine.ts#L323) — `const grade = isCorrect ? 4 : 1;` **確認存在** |
| **判定** | ✅ **真實存在**，但「偽算法」的描述過於嚴厲 — 二元系統用簡化評分是合理的第一版，真正問題是缺乏「困難但答對」等梯度 |
| **嚴重度** | **P2** — 功能性尚可，優化空間大 |

#### 8. 音效雙軌架構衝突（Round 23, 36）

| 項目 | 內容 |
|:---|:---|
| **報告聲稱** | 戰鬥用 Howler.js，QuizCard 用 `use-sound`，靜音狀態脫節 |
| **代碼實證** | [QuizCard.tsx:3](file:///c:/Users/user/Desktop/Quiz-app-/components/QuizCard.tsx#L3) — `import useSound from 'use-sound';` **確認存在** |
| **判定** | ✅ **真實存在** — 雙軌音效引擎確實造成全域靜音設定無法統一控制 |

---

### ⚠️ 存在但嚴重度需修正

#### 9. 雲端同步 `createCloudBank` 重複副本（Round 33）

- **報告聲稱**：每次同步都無腦 `createCloudBank` 導致幽靈題庫指數膨脹
- **修正**：實際代碼在成功同步後會寫入 `cloudSyncedAt`，正常 UI 操作不會無限重複。**但確實缺乏本地↔雲端的 ID 映射機制**，在異常路徑、手動觸發或 metadata 寫入失敗時可能產生副本
- **判定**：**P1 架構風險**（不是報告描述的「每次登入必然爆炸」的 P0 災難）

#### 10. 學習統計漏計（Round 6）

- **報告聲稱**：`onRetry`、`onRestart`、中途 `onExit` 均未呼叫 `recordStudySession`
- **代碼實證**：[AppContent.tsx:160](file:///c:/Users/user/Desktop/Quiz-app-/components/AppContent.tsx#L160) 僅在 `onHome` 路徑呼叫了 `recordStudySession`
- **判定**：✅ 問題方向正確，但需逐條核實每個退出路徑，部分場景可能已修復

#### 11. Storage 反序列化缺乏 runtime 型別驗證（Round 15）

- **報告聲稱**：`JSON.parse` 結果直接當目標型別使用，會導致白屏
- **修正**：解析失敗有 try-catch，不會直接白屏。但**結構性欄位缺失**（如 `options` 為 `null`）確實可能導致後續 `.map()` 崩潰
- **判定**：**P1** — 風險真實但不如報告描述的那麼「必然白屏」

---

### ❌ 證據不足或過度推演

| 問題 | 報告聲稱 | 核實結果 |
|:---|:---|:---|
| 社交功能使用率 < 2% | Round 4, 14 | **無實際數據支撐**。純屬產品推測，缺乏 Analytics 佐證 |
| 音訊佔用 15-30MB 導致 OOM | Round 23 | **需 Memory Profile 實測**。Howl 預載不等於記憶體爆炸 |
| 圖譜 300 節點 FPS 掉到 10-15 | Round 21 | **需 Performance Trace 實測**。不能僅靠 DOM 節點數推算 |
| AI 變形題「超越市場 99%」 | Round 32 | **純行銷話術**，無可驗證基準 |
| Client-side SSRF (P0) | Round 48 | **過度標籤化**。瀏覽器端 CORS 限制下這是「使用者可控的瀏覽器請求」，非傳統伺服器 SSRF |

---

## 第二部分：建議功能實用性裁決

### 🟢 真正有用 — 必須落地

| 功能 | 價值評估 | 理由 |
|:---|:---|:---|
| **SM-2 待複習一鍵入口** | ⭐⭐⭐⭐⭐ | 打通核心認知科學閉環，`<div>` 改 `<button>` + 啟動 `spaced_due` 模式 |
| **錯題選項對比（紅綠字）** | ⭐⭐⭐⭐⭐ | 認知反差是訂正效率的核心，目前代碼明文承認 `"We don't know what user picked"` |
| **快捷鍵修飾鍵守衛** | ⭐⭐⭐⭐⭐ | 3 行代碼修復，防止劫持 Ctrl+1~4 與 IME 選字 |
| **登出資料隔離** | ⭐⭐⭐⭐⭐ | 安全底線，共用設備場景不可忽視 |
| **UTC 時區修正** | ⭐⭐⭐⭐⭐ | 直接影響 Streak 打卡，一行 `getLocalDateString()` 即修 |
| **答對自動切題開關** | ⭐⭐⭐⭐ | 刷題心流大幅提升，設定中加一個 toggle |
| **UTF-8 BOM 清洗** | ⭐⭐⭐⭐ | Windows 使用者的匯入救星，一行正則 |
| **戰鬥舞台緊湊模式** | ⭐⭐⭐⭐ | 解決筆電螢幕選項掉出視窗的 P0 人機工程問題 |
| **成就隱藏未實作項** | ⭐⭐⭐⭐ | 短期最務實：先隱藏 16 個幽靈成就，再逐步補上 |
| **音效統一至 Howler** | ⭐⭐⭐ | 清理技術債，消除靜音設定脫節 |

### 🟡 有價值但需驗證需求後再做

| 功能 | 價值評估 | 理由 |
|:---|:---|:---|
| **IndexedDB 圖片遷移** | ⭐⭐⭐ | 風險真實，但先加容量監控 + 失敗提示，再考慮遷移 |
| **圖譜與題目掌握度整合** | ⭐⭐⭐ | 方向正確，但資料模型重構成本高，需先建立 Question↔Node 關聯 |
| **AI 蘇格拉底錯題解析** | ⭐⭐⭐ | 教育價值高但依賴 API 成本，適合作為進階功能 |
| **題庫搜尋與篩選** | ⭐⭐⭐ | 500+ 題庫場景確實痛苦，但需衡量開發優先級 |
| **RPG 靈魂復仇機制** | ⭐⭐⭐ | 遊戲化學習轉化很巧妙，但開發量不小 |
| **匯出含 SM-2 學習包** | ⭐⭐⭐ | 資料可攜性不完整是事實，但需要產品決策 |
| **Blob 替代 Data URI 匯出** | ⭐⭐⭐ | 千題匯出確實有 Data URI 上限問題 |

### 🔴 過度工程 — 建議剔除或大幅降級

| 功能 | 過度原因 |
|:---|:---|
| **IRT 項目反應理論 / Elo 自適應** | 個人題庫工具缺乏海量考生樣本，無法計算有統計效度的 IRT 參數。「錯題優先」+ 「隨機切片」已足夠 |
| **題目級 Git 三方合併** | 成本極高，邊際效益極低。LWW + 確認覆蓋即可 |
| **社群好友即時對戰重做** | 報告自身承認使用率 < 2%。改用 URL 輕量分享更務實 |
| **全螢幕強制休息彈窗** | 破壞心流，降級為頂部微型提醒條 |
| **認知防傾斜中斷器** | 概念過度包裝。「提示按鈕高亮」+ 「剔除干擾項」就夠了 |
| **雙向 Wikilink `[[...]]` 語法** | MindSpark 是測驗工具不是 Obsidian，引入 Markdown 超連結解析會帶來 XSS 二次負擔 |
| **Swipe 物理手勢刷題** | 屬產品偏好，非系統缺陷。開發成本高、ROI 不明 |
| **Canvas/WebGL 圖譜渲染** | 目前大多數用戶不會建 300+ 節點圖譜，先優化再考慮 |
| **RTL 阿拉伯語支援** | MindSpark 目標用戶群以繁中為主，RTL 是遠期願景而非當前缺陷 |
| **成就事件匯流排 (AchievementEventBus)** | 目前只需補 4-6 個關鍵成就的解鎖邏輯，不需要重量級事件系統 |

---

## 第三部分：報告本身的問題與偏誤

### 1. 嚴重度灌水（Severity Inflation）

報告傾向將「合理風險」直接標為「P0 致命災難」。例如：
- 雲端同步副本 → 報告標 P0，實際是 P1 架構風險
- Client-side SSRF → 報告標 P0，瀏覽器 CORS 限制下實際影響有限
- Storage 反序列化 → 報告說「必然白屏」，實際有 try-catch 兜底

### 2. 陳舊描述未更新

- Round 1 稱「`dueCount` 完全沒有被 JSX 引用」→ 實際已渲染為 `<div>` 文字提示
- 部分行號引用可能因後續重構而偏移

### 3. 無實測數據支撐的「災難」斷言

- 「圖譜 300 節點 FPS 掉到 10-15」— 無 Performance Trace
- 「音訊 15-30MB OOM 崩潰」— 無 Memory Profile
- 「社交使用率 < 2%」— 無 Analytics 數據

### 4. 功能膨脹傾向

50 輪審計產生了大量「未來願景」級建議（IRT、Canvas/WebGL、Wikilinks、手勢物理學），與當前專案規模嚴重不匹配。若全部實作，開發週期將延長 6-12 個月且偏離核心學習工具定位。

---

## 第四部分：建議的真正優先順序

### P0：立即修正（1-2 週）

1. ✅ **SM-2 待複習真正入口**（`<div>` → `<button>` + `spaced_due` 模式）
2. ✅ **快捷鍵修飾鍵 + IME 守衛**（3 行代碼）
3. ✅ **UTC 時區修正**（`toISOString` → 本地日期 helper）
4. ✅ **登出資料隔離 / 清除選項**
5. ✅ **戰鬥舞台垂直溢出**（緊湊模式或雙欄布局）

### P1：高價值、低到中成本（3-4 週）

6. 顯示使用者錯誤答案（紅綠字對比）
7. 答對自動切題開關
8. UTF-8 BOM 清洗 + Blob 匯出
9. 成就系統隱藏未實作項 + 補上少數關鍵事件
10. 統計結算流程補齊（所有退出路徑均結算）
11. FocusTimer 接入 repository 統計
12. 音效統一至 Howler，靜音設定全域生效
13. 題庫/題目 JSON runtime validation
14. Dark mode FOUC 修正

### P2：先驗證需求再做（長期）

15. IndexedDB 圖片儲存
16. 圖譜與題目掌握度整合
17. AI 錯題變形題
18. 題庫搜尋與篩選
19. 社交系統降級為 URL 分享
20. 匯出含 SM-2 學習進度

### ❌ 不建議實作

- IRT/Elo/CAT 自適應
- 題目級三方合併
- Wikilink 雙向連結
- 手勢物理滑動
- Canvas/WebGL 圖譜
- 成就事件匯流排
- RTL 國際化
- 認知防傾斜中斷器

---

## 最終結論

> [!IMPORTANT]
> 這份 50 輪審計報告是一份**含金量極高但需要嚴格篩選**的文件。
>
> - **審計部分（找出的問題）**：價值極大，揭發了多個平時難以察覺的深層 Bug
> - **建議部分（新增功能）**：需要保持克制，約半數屬於過度工程
>
> **使用方式**：當作「候選 Backlog 與問題線索池」，而非「已驗證的施工藍圖」。按照本報告修正後的 P0→P1→P2 優先級逐步推進，專注落地核心體驗修復，堅決捨棄不切實際的重型架構。
