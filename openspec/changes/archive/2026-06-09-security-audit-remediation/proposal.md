## Why

兩份安全審計報告（`comprehensive_security_audit_report.md` 與 `security_audit_investigation.md`）揭露了 MindSpark 專案中 13 個已確認的真實安全與品質問題，涵蓋 Critical/High/Medium 等級的越權查詢（BOLA/IDOR）、商業邏輯漏洞、記憶體洩漏、型別安全違規、XSS 風險等多維度缺陷。這些問題需要系統性地修復，以保護用戶資料安全、維護應用穩定性、並確保代碼品質符合 `AGENTS.md` 鐵規。

## What Changes

### Critical 優先級
- **BOLA/IDOR 修復**：`getCloudBanks()` 與 `deleteCloudBank()` 加入 `user_id` 過濾，防止水平越權
- **聯賽分數後端判定**：`submitChallengeScore()` 移除前端勝負判定邏輯，改用 Supabase RPC/trigger 在後端比對分數

### High 優先級
- **好友請求邏輯修復**：`acceptFriendRequest()` 限制僅被邀請方（`friend_id`）可接受請求
- **AI 結果 XSS 消毒**：`generateQuestionsFromPDF()` 回傳結果加入 DOMPurify 淨化
- **API Key 保護**：對 localStorage 中的 AI API Key 實施客戶端加密混淆
- **localStorage 防篡改**：對戰鬥狀態與成就資料加入 HMAC 完整性簽名驗證

### Medium 優先級
- **答題雙擊防護**：QuizCard 加入 `useRef` 防重複提交鎖
- **setTimeout 清理**：useBattleSystem 裸露計時器改為 ref 追蹤 + 卸載清理
- **AudioContext 洩漏修復**：FocusTimer 的 AudioContext 在使用後正確 `.close()`
- **`any` 型別消除**：cloudStorage 中 `(window as any)` 改用 `global.d.ts` 介面擴充
- **Array 越界防護**：`useBattleSystem` 的 `allMonsters[0]` 加入空陣列檢查
- **NVIDIA baseUrl 修復**：`resolveNvidiaBaseUrl` 支援生產環境使用同源 proxy
- **成就時間重疊修正**：`useAchievementTracker` 的 `night_owl` 限制至 22:00~0:00

### Low 優先級（附帶清理）
- **廢棄檔案清理**：移除根目錄未被引用的 `constants.ts`

## Capabilities

### New Capabilities
- `client-data-integrity`: 本機 localStorage 資料完整性簽名驗證機制（HMAC-SHA256 防篡改）
- `api-key-protection`: AI API Key 客戶端加密混淆儲存機制

### Modified Capabilities
- `supabase-security-hardening`: 加入 `getCloudBanks` / `deleteCloudBank` 的 `user_id` 強制過濾；聯賽分數後端 RPC 判定
- `social-service-layer`: 修復 `acceptFriendRequest` 越權邏輯；僅允許被邀請方接受
- `nvidia-api`: `resolveNvidiaBaseUrl` 支援生產環境同源 proxy 路徑
- `battle-mode`: setTimeout ref 追蹤 + 卸載清理；空陣列越界防護；localStorage 防抖寫入
- `sync-concurrency-control`: 消除 `(window as any)` 型別違規，改用 `global.d.ts` 介面擴充

## Impact

### 受影響的程式碼範圍
| 檔案 | 變更類型 | 影響範圍 |
|------|----------|----------|
| `services/cloudStorage.ts` | 安全性強化 | 雲端題庫查詢/刪除路徑、同步鎖型別 |
| `services/socialService.ts` | 邏輯修復 | 好友請求接受流程 |
| `services/challenges.ts` | 架構變更 | 聯賽分數提交與結算流程 |
| `services/ai.ts` | 安全性強化 | AI 設定儲存、PDF 生成結果消毒、NVIDIA baseUrl |
| `hooks/useBattleSystem.ts` | 穩定性修復 | 計時器清理、怪物陣列安全、傷害計算 |
| `hooks/useAchievementTracker.ts` | 邏輯修正 | 成就解鎖時間判定 |
| `components/QuizCard.tsx` | 穩定性修復 | 答題提交防護 |
| `components/FocusTimer.tsx` | 資源洩漏修復 | 音訊上下文管理 |
| `types/global.d.ts` | 新增 | Window 介面擴充 |
| `constants.ts` (根目錄) | 刪除 | 清理廢棄檔案 |

### 風險與防護
- **Supabase RLS 依賴**：前端 `user_id` 過濾是防禦第一層，但真正安全需後端 RLS 配合。本次修復先加前端防禦，並在文件中標記 RLS 配置需求。
- **API Key 加密**：客戶端加密無法達到伺服器端安全等級，但能有效阻止明文擷取。
- **battleState 簽名**：需注意簽名鹽值不能寫死在前端可見處，改用 WebCrypto API。
- **向後相容**：localStorage 格式變更需考慮遷移，確保現有用戶資料不遺失。
