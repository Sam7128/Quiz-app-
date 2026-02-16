# MindSpark Quiz App 深度檢查報告

日期: 2026-02-15  
專案路徑: `c:\Users\user\Desktop\Quiz-app--main`  
檢查範圍: React/Vite 前端 + `services/`(Supabase/本地儲存/AI) 的「後端式業務邏輯」、狀態管理、測試/建置、重複功能、基礎安全面。  

## 結論摘要 (先看這裡)

最需要先處理的問題:

1. **P0 測試配置錯誤**: `npm test` 會把 `e2e/*.spec.ts` 當成 Vitest 測試，導致測試失敗，CI/品質門檻失效。
2. **P0 業務邏輯錯誤 (題庫啟動)**: `startQuizByBank` 先 `dispatch` 再立刻 `startQuiz()`，`useQuizEngine` 仍可能使用「舊的 bank selection」而從錯誤題庫出題。
3. **P0 Cloud 題目 ID 不穩定**: `saveCloudQuestions()` 採用「整包刪除 + 重新插入」且未保留 question `id`，會讓雲端題目 ID 每次變更，連帶破壞錯題/間隔複習/統計等依賴 `questionId` 的資料一致性。
4. **P1 資安風險**: AI provider 的 `apiKey` 目前設計上存於 `localStorage`，一旦未來發生 XSS，會直接導致用戶 API Key 外洩；同時 `index.html` CSP 在 production 仍允許 `unsafe-inline`，降低 CSP 防護價值。
5. **P1 架構漂移與重複功能**: `components/Social.tsx`、`components/ShareModal.tsx` 直接操作 Supabase，違反「Service Layer」模式並重複大量 join/轉換邏輯；`mindspark_*` key 與 JSON parse/try-catch 樣板分散在多處，維護成本高。

## 自動化檢查結果 (可重現)

- `npm run build`: **成功**
- `npx tsc --noEmit`: **通過**
- `npm audit`: **0 個漏洞** (critical/high/moderate/low 全為 0)
- `npx eslint .`: **失敗**，共 **83 個問題 (63 errors, 20 warnings)**  
  - 主要是 `no-unused-vars`、`no-explicit-any`、`prefer-const`，以及 **缺少 `react-hooks` 規則定義** 導致 `react-hooks/exhaustive-deps` 報錯
- `npm test` (Vitest): **失敗**  
  - 單元測試檔案通過，但 `e2e/*.spec.ts` 被 Vitest 收進來執行，產生 Playwright `test()` 使用位置錯誤

## 重大問題 (依嚴重度排序)

### P0. 測試/品質門檻失效: Vitest 誤跑 Playwright E2E

現象:

- `npm test` 執行 Vitest 時，會把 `e2e/json-import.spec.ts`、`e2e/quiz-flow.spec.ts`、`e2e/mindspark.spec.ts` 當成 Vitest suite，導致錯誤:
  - `Playwright Test did not expect test() to be called here.`

根因:

- `vitest.config.ts` 目前沒有 `include/exclude`，Vitest 預設會抓 `**/*.spec.*`，因此把 `e2e/*.spec.ts` 也納入。

建議修正:

- 在 `vitest.config.ts` 明確設定:
  - `test.include` 只包含 `src/__tests__/**/*.test.ts?(x)` (或你希望的範圍)
  - `test.exclude` 排除 `e2e/**`, `playwright-report/**`, `test-results/**`
- 在 `package.json` 增加腳本分流:
  - `test:unit` => `vitest`
  - `test:e2e` => `playwright test`
  - `test` 可以跑 `test:unit`，避免 Playwright 依賴混入

影響:

- 目前「看似有測試」但實際 `npm test` 是紅的，品質門檻等同不存在。

---

### P0. Quiz 啟動題庫選擇競態: 可能從錯誤 bank 出題

位置:

- `App.tsx` (`startQuizByBank`)
- `hooks/useQuizEngine.ts` (`startQuiz`)

問題描述:

- `startQuizByBank` 先 `dispatch({ type: 'set_selected_bank_ids' ... })`，接著立刻呼叫 `quizEngine.startQuiz(...)`。
- 但 `useQuizEngine.startQuiz` 讀取的 `selectedQuizBankIds` 來自 hook props，該值在這一次 render 中仍可能是「舊選擇」。

結果:

- 使用者點「某題庫直接開始」時，實際出題可能來自先前勾選的多題庫或其他題庫，屬於功能錯誤且很難直覺 debug。

建議修正方向:

- 讓 `startQuiz` 接受「明確 bankIds」參數並以該參數取題(不要依賴 state 當下值)；或
- 將「更新 selected bank」與「開始測驗」拆成兩段: dispatch 後由 `useEffect` 偵測 selection 變更再啟動。

---

### P0. 雲端題目 ID 不穩定: 破壞錯題/間隔複習/統計一致性

位置:

- `services/cloudStorage.ts`:
  - `saveCloudQuestions(bankId, questions)`
  - `syncLocalToCloud(localBanks)`
- `services/cloudRepo.ts`、`hooks/useQuizEngine.ts` (以 `String(question.id)` 作為學習資料 key)
- DB: `supabase_schema.sql` 的 `questions.id` 是 `uuid default gen_random_uuid()`

問題描述:

- `saveCloudQuestions` 目前策略是:
  1. `delete from questions where bank_id = bankId`
  2. `insert` 新資料 (未提供 `id`)
- 因為 `questions.id` 預設由 DB 產生 uuid，所以每次保存題目都會生成全新的 `id`。

影響 (非常大):

- 錯題紀錄 (`mindspark_mistake_log`) / 間隔複習 (`question_progress.question_id`) / 任何以 `questionId` 綁定的資料會「對不到題目」。
- 雲端使用者可能看到:
  - 明明同一題，卻被當成新題
  - 複習到期數量不準，或到期但找不到題
  - 同步後學習資料被切斷

建議修正方向:

- 讓題目 ID 具備穩定性:
  - 插入時帶入 `id: q.id` (前提: 前端建立題目時就用 `crypto.randomUUID()` 等穩定 ID)，並改用 `upsert` 取代 delete+insert；或
  - 在 `questions` 表新增 `client_id` 欄位並以其作為學習資料 key，避免 DB id 被重建時破壞關聯。
- 若仍需要 batch 更新:
  - 至少要避免「先刪後插」造成中途失敗即全滅的風險 (需交易/分批、或先 upsert 再刪除不存在的舊題)。

---

### P1. 社交功能的 DB RLS Policy 與前端操作不一致 (會直接功能失效)

位置:

- DB: `supabase_social_migration.sql`
- 前端: `components/Social.tsx`

問題描述:

- `friendships` 表目前有 `select/insert/update` policy，但**沒有 `delete` policy**。
- 但前端提供「刪除好友/取消邀請」，實作為:
  - `supabase.from('friendships').delete().eq('id', friendshipId)` (`components/Social.tsx`)

結果:

- 在 RLS 生效的情況下，刪除操作會被拒絕 (除非你另外手動在 Supabase Console 補了 policy)。

建議:

- 明確設計允許的刪除場景並加對應 policy，例如:
  - `for delete using (auth.uid() = user_id or auth.uid() = friend_id)`
- 同時檢視 update policy 是否需要允許 sender 取消 pending (目前 update policy 只允許 `friend_id` 更新)。

---

### P1. Cloud createBank 失敗回傳 `id: ''` 可能造成後續資料破壞

位置:

- `services/cloudRepo.ts` (`createBank`)

問題描述:

- `createCloudBank(...)` 可能回傳 `null`，但 `CloudStorageRepository.createBank` 仍回傳 `BankMetadata`，並把 `id` 設成空字串。

影響:

- 上層若未做防護，可能把 `''` 當成合法 bankId 寫入 localStorage / UI state，導致後續 `saveQuestions('', ...)`、`deleteBank('')` 等出現資料污染或覆蓋。

建議:

- 失敗時應 `throw` 或回傳 `null`/`Result` 型別，強迫呼叫端處理。

---

### P1. Challenge 完成判斷錯誤: 對手分數為 0 時永遠不會結算

位置:

- `services/challenges.ts` (`submitChallengeScore`)

問題描述:

- 判斷「雙方是否都有提交分數」使用 `if (otherScore > 0) { ... completed ... }`
- 若對手真的得到 0 分，`otherScore` 為 0，程式會視為「未提交」，導致 challenge 永遠不會結束。

建議:

- 將「是否提交」與「分數」拆開:
  - 使用 `null` 表示未提交，或加欄位 `challenger_submitted` / `opponent_submitted`
- 或以 `updated_at`/server-side function 判斷提交狀態

---

### P1. NVIDIA /api proxy 只在 dev 存在，production 可能直接壞掉

位置:

- `vite.config.ts` (`server.proxy['/api/nvidia']`)
- `services/ai.ts` (NVIDIA provider `baseURL` 預設走 `${window.location.origin}/api/nvidia`)

問題描述:

- Vite 的 `server.proxy` 只在 `npm run dev` 生效；production build 部署到靜態站點時，通常沒有 `/api/nvidia` 反向代理。
- 目前 `services/ai.ts` 對 NVIDIA provider 的預設 baseURL 會落在同源 `/api/nvidia`，若部署環境沒有額外後端或 edge function 轉發，NVIDIA provider 會失敗。

建議:

- 明確區分 dev/prod 行為:
  - production 改用可用的 `config.baseUrl` (直接指向 NVIDIA endpoint) 並處理 CORS/金鑰外洩風險；或
  - 提供真正的後端 proxy (例如 Vercel/Cloudflare function) 並在 production 路由到它。

### P1. RPC `update_streak` 的安全性與正確性風險 (DB 層)

位置:

- `supabase_streak_migration.sql` (`update_streak(p_user_id uuid) ... security definer`)

風險點:

- **安全性**: function 是 `security definer`，若未在 function 內驗證 `p_user_id = auth.uid()`，理論上任意使用者可呼叫 RPC 並傳入別人的 user id 來更新他人 streak (寫入越權)。
- **正確性**: 以 `if v_last_date is null then insert ...` 判斷「無資料」不可靠:
  - `select ... into ...` 無 row 時變數為 null 沒錯，但若 row 存在且 `last_study_date` 為 null，也會走到 insert 而撞 unique constraint。

建議:

- 將參數拿掉，直接使用 `auth.uid()` 當 user id，或在 function 內加:
  - `if p_user_id <> auth.uid() then raise exception ...; end if;`
- 用 `if not found then ...` 判斷是否存在 row，而不是看欄位是否 null。
- 加上固定 `search_path` 以降低 `security definer` 常見風險 (Supabase 常見建議)。

## 安全性檢查 (SAST + 手動重點)

### 結果摘要

- 依賴漏洞: `npm audit` 顯示 0
- 直接 DOM 注入: 未發現 `dangerouslySetInnerHTML` / `.innerHTML =` / `eval` 等典型高風險用法 (Playwright 報告 HTML 不算 source)

### 重要風險

1. **AI API Key 存於 localStorage (高風險)**
   - `services/ai.ts` 以 `mindspark_ai_config` 存 `apiKey`
   - 只要未來任何一處 XSS，攻擊者即可讀取 key 並濫用
   - 建議改為後端代管或短期 token；最少也要提供「不持久化」模式並在 session 結束清除

2. **CSP 在 production 仍允許 `unsafe-inline` (中風險)**
   - `index.html` meta CSP:
     - `script-src 'self' 'unsafe-inline'`
     - `style-src 'self' 'unsafe-inline' ...`
   - 這會大幅削弱 CSP 對 XSS 的防禦能力
   - 建議:
     - production 移除 `unsafe-inline`
     - 需要 inline 的話改用 nonce/hash (並在部署層加 header，而非 meta)

3. **Supabase profiles 可被所有人讀取 (低-中)**
   - `supabase_schema.sql` profiles select policy 為 public 可讀
   - 若 profiles 未含敏感資訊可接受；否則建議收斂欄位或以 view/公開欄位隔離

### `.env` 現況

- `.env` 在 `.gitignore` 中，且 `git ls-files .env` 顯示 **未被追蹤**。
- 但本機檔案內仍有實際 Supabase 設定值，請確保不要意外加入版控或上傳。

## 架構與重複功能盤點

### 1) Service Layer 模式被破壞

現況:

- 架構文件主張「components 不直接打 Supabase」，但目前:
  - `components/Social.tsx`、`components/ShareModal.tsx` 直接 `import { supabase } ...` 並執行查詢/更新

問題:

- 資料存取與 UI 緊耦合
- 相同 join/資料轉換邏輯在多處重複 (friendships + profiles + shared_banks + profiles)
- 後續做 error handling、重試、schema 變更會很痛

建議:

- 抽出 `services/social.ts` 或 `services/socialRepo.ts`，讓 UI 只呼叫高階方法:
  - `getFriendsAndInbox(userId)`
  - `sendFriendRequest(...)`
  - `acceptFriend(...)`
  - `shareBankSnapshot(...)`

### 2) localStorage key 與 JSON parse 樣板分散 (重複)

現況:

- `mindspark_*` keys 來源不一致:
  - `services/storage.ts` 有 `STORAGE_KEYS`
  - 但 `hooks/useSoundEffects.ts`、`contexts/ThemeContext.tsx`、`hooks/useBattleSystem.ts`、`services/ai.ts`、`services/streak.ts` 等仍大量硬編碼

建議:

- 建立共用 helper:
  - `readJson<T>(key, fallback)`
  - `writeJson(key, value)`
  - `readBool(key, default)`
- 建立單一 keys registry (集中 export)

### 3) 不必要/混亂的遺留目錄與檔案

發現:

- 存在 `src/services/supabase.ts` 與 `src/contexts/`，看起來是舊架構遺留，且與現行 `services/supabase.ts` 不一致 (一個用 `process.env`，一個用 `import.meta.env`)。
- 存在 `nul` 檔案 (`Quiz-app--main/nul`) 會讓 `rg` 等工具在 Windows 上報錯，影響搜尋/審計/CI。
- 存在可疑目錄 `CUsersuserDesktopQuiz-app--mainconstants` (疑似路徑拼接錯誤的產物)。

建議:

- 移除或整理遺留 `src/` 內非測試內容，避免誤引用
- 刪除/改名 `nul` 檔案
- 移除奇怪的常數目錄，或確認用途並納入正確結構

### 4) Alias/文件描述與實際設定不一致 (易造成誤引用)

現況:

- `AGENTS.md` 宣稱 `@/*` alias 映射到專案 root。
- `tsconfig.json` 的 `paths` 也是 `@/* -> ./*` (root)。
- 但 `vite.config.ts`/其 test alias 設定將 `@` 指向 `./src`。
- 實際 app 入口 `index.tsx` 多採用相對路徑 `./contexts/...`，alias 未被一致使用；同時 `src/` 內又存在遺留 `contexts/`、`services/`，提高誤引用機率。

影響:

- 新進開發者很容易照文件寫 `@/contexts/...`，結果在 Vite 解析到 `src/contexts` (遺留) 而不是 root `contexts`，產生「編譯能過、但行為錯」的隱性錯誤。

建議:

- 決定單一策略:
  - 要嘛把所有 app code 搬到 `src/` 並統一 alias 到 `src`
  - 要嘛把 alias 全部指向 root，並清掉 `src/` 遺留內容
- 同步更新 `AGENTS.md`，避免文件誤導。

## 狀態管理與效能風險

### 1) quizPoolQuestions 載入可能被舊請求覆蓋 (stale response)

位置:

- `hooks/useAppDataLoader.ts` (`loadQuizPool`)

問題:

- selection 變更時會發多個 `Promise.all`，較慢的舊請求可能在較快的新請求之後 resolve，覆蓋 state，造成 UI 與實際選擇不一致。

建議:

- 加 requestId/版本號，僅最後一次請求可寫入 state；或使用 AbortController (若 repository 可支援)。

### 2) 大型 prop object 每次 render 都換 identity (不必要 rerender)

位置:

- `App.tsx` (`quizEngine={{ ...quizEngine, ... }}`)

建議:

- 用 `useMemo` 封裝，或把需要的 handler 個別傳遞，提升 referential stability。

## ESLint/型別品質問題

狀態:

- `npx eslint .` 目前紅燈，且有不少 `any`、unused imports/vars。
- 另外出現 `react-hooks/exhaustive-deps` 規則找不到，代表目前 ESLint plugin 組態不完整或有錯誤的 disable 註解/規則引用。

建議:

- 把 lint 變成 `npm run lint` 並在 CI/PR 強制
- 補齊 `eslint-plugin-react-hooks` (若要用該規則)，並修掉現有 unused/any

## 建議修復順序 (最小風險、最大收益)

1. **修 Vitest include/exclude**，讓 `npm test` 變綠並把 E2E 分流 (P0)
2. **修 `startQuizByBank` 競態**，確保從指定 bank 啟動一定正確 (P0)
3. **重做 cloud questions 保存策略** (至少保留 `questions.id` 並改 upsert) (P0)
4. **修 challenge score 提交邏輯** (`otherScore > 0` 問題) (P1)
5. **收斂 AI key 儲存策略 + 強化 CSP (production)** (P1)
6. **把 Social/Share 的 Supabase 操作移到 services**，消除重複與耦合 (P1)
7. **清理遺留目錄/檔案 (`nul`, 奇怪 constants 目錄, `src/services/supabase.ts`)** (P2)
8. **補 lint/型別品質門檻** (P2)

## 附錄: 主要檔案/位置索引

- 測試配置: `vitest.config.ts`, `playwright.config.ts`, `package.json`
- Quiz 啟動/狀態: `App.tsx`, `hooks/useQuizEngine.ts`, `hooks/useAppDataLoader.ts`, `reducers/appReducer.ts`
- 雲端儲存: `services/cloudStorage.ts`, `services/cloudRepo.ts`, `services/supabase.ts`
- 本地儲存: `services/storage.ts`, `services/localRepo.ts`
- 社交/分享: `components/Social.tsx`, `components/ShareModal.tsx`, `services/challenges.ts`
- DB/RLS: `supabase_schema.sql`, `supabase_*_migration.sql`
- CSP: `index.html`
