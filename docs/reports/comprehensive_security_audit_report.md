# 🛡️ MindSpark 專案深度安全性與系統架構審計報告
> **報告等級**：COMPREHENSIVE AUDIT REPORT (首席資安架構師專屬級別)  
> **評估日期**：2026-06-08  
> **最高原則**：此報告為純調查與漏洞揭露，**未修改**專案中任何原始碼。所有修復方案僅以虛擬代碼範例呈交。

---

## 📊 20 大深度掃描維度矩陣總覽

| 編號 | 掃描維度 | 風險等級 | 核心發現說明 | 狀態 |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **注入攻擊防禦** | **Medium** | AI 生成題目在 JSON 解析後直接渲染，缺乏過濾防護，易受 PDF Prompt Injection 影響。 | ⚠️ 揭露 |
| **2** | **對抗性邏輯漏洞** | **High** | 戰鬥狀態、HP、連擊與解鎖成就在 Guest 模式下明文儲存於本機且缺乏完整性校驗。 | ⚠️ 揭露 |
| **3** | **廢棄與冗餘程式碼殘留** | **Low** | 根目錄下的 `constants.ts` 已被棄用但仍殘留，未被專案引用。 | ⚠️ 揭露 |
| **4** | **身分驗證與授權控制** | **Critical** | 個人題庫查詢與刪除未將 `user_id` 綁定至前端查詢，極易造成水平越權 (BOLA/IDOR)。 | ⚠️ 揭露 |
| **5** | **商業邏輯矛盾** | **High** | 好友請求可由發起者自我核准 (邏輯越權)；聯賽分數由前端直接更新 winner_id 缺乏原子性。 | ⚠️ 揭露 |
| **6** | **資料外洩與敏感資訊** | **High** | 用戶輸入的 AI 第三方 API Key 明文存放在 `localStorage` 中，容易被惡意套件竊取。 | ⚠️ 揭露 |
| **7** | **狀態管理與競爭條件** | **Medium** | 雲端備份成功即將本機快照刪除，離線時資料遺失；同步 RMW 機制缺乏跨分頁排他鎖。 | ⚠️ 揭露 |
| **8** | **依賴套件安全與供應鏈風險** | **Low** | `package.json` 中的 `@supabase/supabase-js` 寫入了非官方正式發行的版本號。 | ⚠️ 揭露 |
| **9** | **錯誤處理與日誌安全性** | **Medium** | 底層儲存錯誤被吞噬導致除錯困難，而 Supabase 與 AI 錯誤直接輸出敏感資訊至前端。 | ⚠️ 揭露 |
| **10** | **記憶體管理與資源洩漏** | **Medium** | 裸露的 `setTimeout` 未在組件卸載時清理；番茄鐘 `AudioContext` 未關閉導致瀏覽器實例溢出。 | ⚠️ 揭露 |
| **11** | **型別安全與邊界檢查** | **Medium** | 違反 `AGENTS.md` 規定使用 `any` 繞過視窗屬性鎖；怪物池空陣列越界盲區可致頁面崩潰。 | ⚠️ 揭露 |
| **12** | **滲透測試模擬** | **High** | 本地 `localStorage` 可被完全篡改數值並藉由同步污染雲端資料庫。 | ⚠️ 揭露 |
| **13** | **效能瓶頸與 DoS 攻擊風險** | **Medium** | 答題雙擊 (Double Submission) 會引發重複提交，且高頻的戰鬥狀態同步 localStorage 阻塞 UI。 | ⚠️ 揭露 |
| **14** | **加密標準與密碼學落實** | **High** | 用戶 API Key 及敏感歷史分數並未實施任何雜湊混淆與簽名校驗。 | ⚠️ 揭露 |
| **15** | **架構與設計對齊度** | **Medium** | UI 組件直接繞過 Service 層與 Domain Hooks 直接呼叫 Storage API，違反架構分離原則。 | ⚠️ 揭露 |
| **16** | **組件生命週期與渲染效能** | **Medium** | Render 階段直接寫入 Mutable Ref 屬性；領域 Hooks 字面量引用導致無效 Re-renders。 | ⚠️ 揭露 |
| **17** | **CSRF 與 SSRF 防護** | **Medium** | Nvidia API 的 `baseURL` 寫死限制阻礙了 Vercel 反向代理，使得金鑰防洩機制受阻。 | ⚠️ 揭露 |
| **18** | **輸入驗證與資料淨化** | **Medium** | AI 題目匯入與 PDF 解析結果完全未經消毒，對不可信輸入缺乏基本過濾。 | ⚠️ 揭露 |
| **19** | **測試覆蓋與可測性盲區** | **Medium** | 戰鬥核心傷害公式、怪物升級邏輯無單元測試；`spacedRepetition` 依賴動態時間，可測性低。 | ⚠️ 揭露 |
| **20** | **環境配置與部署安全** | **Low** | 本地 `.env` 中匿名金鑰權限範圍大且缺乏 RLS 防護；Vercel 部署有潛在 Windows 權限風險。 | ⚠️ 揭露 |

---

## 🔍 深度審計細節與加固建議 (以維度歸類)

### 🚨 [維度 4] 身分驗證與授權控制 - 個人題庫水平越權查詢與刪除 (BOLA / IDOR)
* **📍 問題精確位置 (Location)**：
  - [services/cloudStorage.ts:L39-L41](file:///c:/Users/user/Desktop/Quiz-app--main/services/cloudStorage.ts#L39-L41)
  - [services/cloudStorage.ts:L95-L98](file:///c:/Users/user/Desktop/Quiz-app--main/services/cloudStorage.ts#L95-L98)
* **💡 發生成因 (Root Cause)**：
  在讀取雲端題庫 (`getCloudBanks`) 與刪除雲端題庫 (`deleteCloudBank`) 時，前端發起 Supabase query 時**未綁定**目前登入用戶的 `user_id`。如果 Supabase 後端數據庫上的行級安全 (RLS) 沒有嚴格配置，這會導致任何已登入的用戶可以直接拉取所有其他人的題庫 ID，甚至隨意發送 API 請求刪除他人的題庫。
* **💥 潛在影響與連鎖反應 (Impact Analysis & Ripple Effects)**：
  這是一個 Critical 級別的越權漏洞。如果修改此處，只會影響 `cloudStorage` 與數據庫互動的過濾。然而，如果在 Supabase 端未配置 RLS，而我們又只在前端做防禦，攻擊者依然可以繞過前端發送 HTTP 請求。因此，修復必須前端加上 `user_id` 過濾，同時後端啟用 RLS。
* **🛡️ 防禦與修復建議 (Mitigation & Fix Recommendations)**：
  前端查詢與刪除時，強制在 Supabase 語法鏈加上 `.eq('user_id', user.id)` 限制。
  ```diff
  // getCloudBanks 範例
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
       .from('banks')
-      .select('*, questions(count)');
+      .select('*, questions(count)')
+      .eq('user_id', user.id);
  ```
* **📐 對齊度審查 (Alignment Check)**：
  違背了 `AGENTS.md` 所規定的「雲端同步安全與權限控制邊界」原則。

---

### 🚨 [維度 5] 商業邏輯矛盾 - 好友請求單方面自我接受漏洞 (越權審核)
* **📍 問題精確位置 (Location)**：
  - [services/socialService.ts:L110-L114](file:///c:/Users/user/Desktop/Quiz-app--main/services/socialService.ts#L110-L114)
* **💡 發生成因 (Root Cause)**：
  在 `acceptFriendRequest` 中，更新 `friendships` 狀態為 `accepted` 時的過濾條件為：
  ```typescript
  .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
  ```
  這意味著，不論是邀請接受人 (`friend_id`) 還是邀請發起人 (`user_id`)，只要發送此請求，都可以將狀態變更為 `accepted`。
* **💥 潛在影響與連鎖反應 (Impact Analysis & Ripple Effects)**：
  發送好友請求的人（A）在發送請求給對方（B）後，A 可以自己調用 `acceptFriendRequest` API 自我核准好友邀請，從而單方面強行與 B 成為好友，並在後續獲取 B 的學習排行與聯賽資料。
* **🛡️ 防禦與修復建議 (Mitigation & Fix Recommendations)**：
  限制僅有被邀請方 (`friend_id`) 可以接收並更新此狀態。
  ```diff
  export const acceptFriendRequest = async (friendshipId: string): Promise<void> => {
     const userId = await requireUserId();
     const { error } = await supabase
       .from('friendships')
       .update({ status: 'accepted' })
       .eq('id', friendshipId)
-      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
+      .eq('friend_id', userId); // 強制僅有接收者能接受

     if (error) throw error;
  };
  ```
* **📐 對齊度審查 (Alignment Check)**：
  違背社交系統雙向確認的邏輯設計。

---

### 🚨 [維度 5] 商業邏輯矛盾 - 聯賽分數前端判定與越權修改
* **📍 問題精確位置 (Location)**：
  - [services/challenges.ts:L155-L171](file:///c:/Users/user/Desktop/Quiz-app--main/services/challenges.ts#L155-L171)
* **💡 發生成因 (Root Cause)**：
  當雙方均提交了挑戰分數時，勝負的判定 (`winner_id` 的賦值) 以及挑戰狀態的結算 (`status = 'completed'`) 完全在前端進行計算，並直接將計算後的 `updateData` 發送至 Supabase 的 `challenges` 表進行更新。
* **💥 潛在影響與連鎖反應 (Impact Analysis & Ripple Effects)**：
  攻擊者可以發送修改後的 `winner_id` 為自己的 ID，甚至在分數比對方低的情況下，直接篡改 API 請求以獲得「勝場」記錄，從而操控聯賽排行榜與挑戰勝率。
* **🛡️ 防禦與修復建議 (Mitigation & Fix Recommendations)**：
  應使用 Supabase 數據庫觸發器 (Database Trigger) 或 RPC (stored procedures) 在後端進行安全比對，不應將勝負判定邏輯暴露在客戶端。
  ```sql
  -- 後端 Postgres Trigger 範例：挑戰完成時自動比對分數判定勝者
  CREATE OR REPLACE FUNCTION determine_challenge_winner()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.challenger_score IS NOT NULL AND NEW.opponent_score IS NOT NULL THEN
      NEW.status := 'completed';
      IF NEW.challenger_score > NEW.opponent_score THEN
        NEW.winner_id := NEW.challenger_id;
      ELSIF NEW.opponent_score > NEW.challenger_score THEN
        NEW.winner_id := NEW.opponent_id;
      ELSE
        NEW.winner_id := NULL; -- 平手
      END IF;
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```

---

### 🚨 [維度 2] 對抗性邏輯漏洞 - 本地數據直接讀寫與防作弊盲區 (localStorage 篡改)
* **📍 問題精確位置 (Location)**：
  - [useBattleSystem.ts:L63-84](file:///c:/Users/user/Desktop/Quiz-app--main/hooks/useBattleSystem.ts#L63-L84)
  - [achievements.ts:L52-70](file:///c:/Users/user/Desktop/Quiz-app--main/services/achievements.ts#L52-L70)
* **💡 發生成因 (Root Cause)**：
  在 Guest 模式下，戰鬥狀態 `BattleState` 與成就解鎖列表直接在 `localStorage` 中明文讀寫，並且在反序列化時沒有檢驗其合理性，直接信任本地端傳入的資料。
* **💥 潛在影響與連鎖反應 (Impact Analysis & Ripple Effects)**：
  使用者可以透過瀏覽器 F12 console 直接修改 `localStorage.setItem('mindspark_battle_state', ...)` 將 `heroHp` 設為 `99999`，`streak` 設為 `999`，或將成就清單填滿。這會導致玩家在不用真正答對題目的情況下，無痛刷爆所有遊戲內容。
* **🛡️ 防禦與修復建議 (Mitigation & Fix Recommendations)**：
  在本地讀取時引入 Schema 型別防禦與數據範圍修正；對成就和戰鬥的核心狀態在儲存時，附加一個基於特定 Local Salt 的 SHA-256 雜湊簽名（防篡改標記）：
  ```typescript
  // 簽名保存防禦範例
  import crypto from 'crypto-js';
  const LOCAL_SALT = 'mindspark_secure_salt_9f2a';

  export const saveSecureBattleState = (state: BattleState) => {
    const serialized = JSON.stringify(state);
    const signature = crypto.SHA256(serialized + LOCAL_SALT).toString();
    localStorage.setItem(STORAGE_KEYS.BATTLE_STATE, serialized);
    localStorage.setItem(STORAGE_KEYS.BATTLE_STATE + '_sig', signature);
  };
  ```
* **📐 對齊度審查 (Alignment Check)**：
  違背了 `AGENTS.md` 規定的「DATA_SAFETY」與本機資料儲存完整性保全機制。

---

### 🚨 [維度 13] 效能瓶頸與 DoS - 答題雙擊重複提交 (Double Submission) 與 I/O 阻塞
* **📍 問題精確位置 (Location)**：
  - [QuizCard.tsx:L176-187](file:///c:/Users/user/Desktop/Quiz-app--main/components/QuizCard.tsx#L176-L187)
  - [useBattleSystem.ts:L74-84](file:///c:/Users/user/Desktop/Quiz-app--main/hooks/useBattleSystem.ts#L74-L84)
* **💡 發生成因 (Root Cause)**：
  1. `QuizCard` 中的 `submitAnswer` 調用時，雖然在之後呼叫了 `setIsAnswered(true)`，但 React 的 state更新是非同步的，在此狀態尚未重新渲染完成前，快速點擊會再次觸發 `submitAnswer`。
  2. `useBattleSystem` 的 `useEffect` 監聽了 `battleState` 的每一次細微變化，並同步進行 `JSON.stringify` 並寫入 `localStorage`，在動畫頻繁播放時會頻繁佔用主線程。
* **💥 潛在影響與連鎖反應 (Impact Analysis & Ripple Effects)**：
  1. 重重複提交：使用者可利用快速點擊在一道題目內累積多次 correct 判定，刷高 streak 並對怪獸造成雙倍/多倍傷害。
  2. 效能卡頓：高頻率的同步 `localStorage` 寫入操作會導致低階行動裝置上出現明顯卡頓與掉幀。
* **🛡️ 防禦與修復建議 (Mitigation & Fix Recommendations)**：
  1. 在 `QuizCard` 引入一個 `isSubmittingRef` 防止二次進入。
  2. 戰鬥系統的儲存改為在關鍵轉折點（怪物死亡、角色死亡、答題結束）寫入，或在 localStorage 的寫入上套用防抖 (debounce)。
  ```diff
  // QuizCard 答題鎖修復範例
+ const isSubmittingRef = useRef(false);

  const submitAnswer = (selection: string[]) => {
+   if (isSubmittingRef.current || isAnswered) return;
+   isSubmittingRef.current = true;
    // ... 原本的提交邏輯
    setIsAnswered(true);
  };

  useEffect(() => {
+   isSubmittingRef.current = false;
    setSelectedOptions([]);
  }, [question]);
  ```

---

### 🚨 [維度 1] 注入攻擊防禦 與 [維度 18] 資料淨化 - AI 生成結果缺乏 Sanitization 漏洞
* **📍 問題精確位置 (Location)**：
  - [services/ai.ts:L278-L308](file:///c:/Users/user/Desktop/Quiz-app--main/services/ai.ts#L278-L308)
* **💡 發生成因 (Root Cause)**：
  雖然專案在 `BankManager.tsx` 對用戶的 JSON 匯入有做 `DOMPurify` 消毒，但是在 `generateQuestionsFromPDF` 解析 AI 生成的題目陣列時，卻直接回傳了解析後的屬性，完全沒有對這些屬性進行 HTML 消毒過濾。
* **💥 潛在影響與連鎖反應 (Impact Analysis & Ripple Effects)**：
  AI 回傳的題目有可能受到 **Prompt Injection (提示注入)** 攻擊。如果用戶上傳的 PDF 內容包含惡意指令，威脅 AI 生成帶有 `<iframe src="..." onload="maliciousCode()">` 或 `<script>` 的題目文本，這些題目在答題卡上被選中時可能觸發 XSS。
* **🛡️ 防禦與修復建議 (Mitigation & Fix Recommendations)**：
  在 AI 回傳題目物件 mapping 階段，呼叫 `dompurify` 對文字欄位（question, options, hint, explanation）進行安全消毒。
  ```typescript
  import DOMPurify from 'dompurify';
  // ...
  return {
    id: generateUUID(),
    question: DOMPurify.sanitize(typeof q.question === 'string' ? q.question : ''),
    options: options.map(opt => DOMPurify.sanitize(opt)),
    explanation: q.explanation ? DOMPurify.sanitize(String(q.explanation)) : undefined,
    // ...
  };
  ```

---

### 🚨 [維度 10] 記憶體管理 - 裸露 setTimeout 未在組件卸載時清理 (Memory Leak)
* **📍 問題精確位置 (Location)**：
  - [useBattleSystem.ts:L501, L523-525, L562](file:///c:/Users/user/Desktop/Quiz-app--main/hooks/useBattleSystem.ts#L501)
* **💡 發生成因 (Root Cause)**：
  在 `triggerAnswer` 函數中，為了解決怪獸重生 (`spawnNewMonster`) 和關卡轉換動畫，代碼有多個處在 `setTimeout` 的計時器，但在 Hook 被卸載（例如用戶切換視圖退出作答）時，這些計時器並未被取消。
* **💥 潛在影響與連鎖反應 (Impact Analysis & Ripple Effects)**：
  若玩家在答題反饋播放的 1~2 秒內切換頁面退出 Quiz，計時器仍會在後台觸發並調用 `setBattleState`。這會導致已卸載組件產生記憶體洩漏，並伴隨 `Can't perform a React state update on an unmounted component` 的警告或運行時混亂。
* **🛡️ 防禦與修復建議 (Mitigation & Fix Recommendations)**：
  宣告 ref 儲存計時器，並在 hook 卸載時清理：
  ```diff
+ const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 於觸發處
- setTimeout(spawnNewMonster, 1500);
+ spawnTimerRef.current = setTimeout(spawnNewMonster, 1500);

  // 清理
  useEffect(() => {
    return () => {
+     if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    };
  }, []);
  ```

---

### 🚨 [維度 10] 記憶體管理 - FocusTimer.tsx 中 AudioContext 未關閉
* **📍 問題精確位置 (Location)**：
  - [FocusTimer.tsx:L49-71](file:///c:/Users/user/Desktop/Quiz-app--main/components/FocusTimer.tsx#L49-L71)
* **💡 發生成因 (Root Cause)**：
  每次點擊播放番茄鐘提示音都會宣告 `new AudioContext()`，但在振盪器 `oscillator` 播放停止後，並未將 `audioContext` 呼叫 `close()` 關閉釋放資源。
* **💥 潛在影響與連鎖反應 (Impact Analysis & Ripple Effects)**：
  現代瀏覽器對每個網頁分頁的 `AudioContext` 大小有 6 個左右的硬性上限。如果玩家頻繁使用或點擊，會導致 AudioContext 實例數溢出，隨後瀏覽器會拒絕播放任何音效並在控制台拋出 runtime 異常。
* **🛡️ 防禦與修復建議 (Mitigation & Fix Recommendations)**：
  在音效停止後 0.5 秒左右調用 `audioContext.close()`。
  ```typescript
  setTimeout(() => {
     if (audioContext && audioContext.state !== 'closed') {
         audioContext.close().catch(console.error);
     }
  }, 600);
  ```

---

### 🚨 [維度 11] 型別安全與邊界檢查 - 違反鐵規使用 `any` 與未檢查的 Array 越界
* **📍 問題精確位置 (Location)**：
  - [services/cloudStorage.ts:L536, L543, L701](file:///c:/Users/user/Desktop/Quiz-app--main/services/cloudStorage.ts#L536)
  - [hooks/useBattleSystem.ts:L224-225](file:///c:/Users/user/Desktop/Quiz-app--main/hooks/useBattleSystem.ts#L224-L225)
* **💡 發生成因 (Root Cause)**：
  1. `cloudStorage.ts` 中為了繞過 Window 物件掛載全域鎖，使用了 `(window as any)` 強制轉型。這直接違反了專案的最嚴格鐵規。
  2. `useBattleSystem.ts` 在查找隨機怪獸時：
     `const monster = allMonsters.find(...) || allMonsters[0];`
     如果 `allMonsters` 陣列因讀取失敗為空，`allMonsters[0]` 會返回 `undefined`，但在型別上卻被推斷為 `Monster`。
* **💥 潛在影響與連鎖反應 (Impact Analysis & Ripple Effects)**：
  1. 使用 `any` 會破壞型別靜態分析防線，若日後鎖的屬性變更，編譯器將無法檢測到。
  2. 陣列越界會導致後續程式讀取 `monster.maxHp` 時拋出白屏崩潰。
* **🛡️ 防禦與修復建議 (Mitigation & Fix Recommendations)**：
  1. 在 `global.d.ts` 或檔案頂部宣告擴充 Window 介面。
  2. 對怪物陣列進行長度檢查，防範空陣列情況。
  ```typescript
  // Window 鎖擴充範例
  declare global {
    interface Window {
      __MINDSPARK_SYNC_LOCK__?: boolean;
    }
  }
  ```
* **📐 對齊度審查 (Alignment Check)**：
  直接違反了 `AGENTS.md` 🔒 鐵規第 3 條：「**嚴禁使用 any 型別。使用 unknown + 型別守衛。**」

---

### 🚨 [維度 7] 狀態管理與同步 - 離線狀態下雲端覆蓋與 Practice Session 丟失
* **📍 問題精確位置 (Location)**：
  - [services/cloudStorage.ts:L624-L630](file:///c:/Users/user/Desktop/Quiz-app--main/services/cloudStorage.ts#L624-L630)
  - [services/storage.ts:L186](file:///c:/Users/user/Desktop/Quiz-app--main/services/storage.ts#L186)
* **💡 發生成因 (Root Cause)**：
  1. 雲端同步完成後，調用了 `removePracticeSessionCache`，將本地的 session cache 實體刪除。
  2. 當雲端 session 較新時，代碼會呼叫 `clearChunkDraftsForSession` 清除本地的答題草稿。
* **💥 潛在影響與連鎖反應 (Impact Analysis & Ripple Effects)**：
  如果在同步成功後實體刪除本地快照，當網絡波動、Supabase 出錯或用戶在無網環境刷新頁面時，本地將再也抓不到該 Session 的任何進度，導致正在練習中的 Chunk 進度完全丟失。
* **🛡️ 防禦與修復建議 (Mitigation & Fix Recommendations)**：
  本地快照不應該在同步後實體刪除。應該僅將 `dirty` 標記設為 `false`，保留本地 session 作為離線讀取的 fallback 快照，只有在主動點擊 delete/abandon 時才實體清理本地資料與草稿。
  ```diff
  // sync 成功後不應呼叫刪除快照，而是改為清除 dirty
  - removePracticeSessionCache(session.id);
  + clearPracticeSessionDirty(session.id);
  ```

---

### 🚨 [維度 8] 依賴安全 - package.json 中寫入不存在的 Supabase 套件版本
* **📍 問題精確位置 (Location)**：
  - [package.json:L21](file:///c:/Users/user/Desktop/Quiz-app--main/package.json#L21)
* **💡 發生成因 (Root Cause)**：
  `@supabase/supabase-js` 的版本被指定為 `^2.93.2`，但 Supabase JS 官方目前並無此大版本的發行版（當前主流為 `^2.4x.x`）。
* **💥 潛在影響與連鎖反應 (Impact Analysis & Ripple Effects)**：
  在執行 `npm install` 時會因找不到對應版本而安裝失敗，或是如果 npm 倉庫上出現惡意搶註（Typosquatting）此非法版本號的包，可能會在 install 時將惡意依賴引入本地開發機與 Vercel 正式部署環境中，造成嚴重的供應鏈攻擊。
* **🛡️ 防禦與修復建議 (Mitigation & Fix Recommendations)**：
  修正為 Supabase 官方真實的穩定版本號：
  ```diff
- "@supabase/supabase-js": "^2.93.2",
+ "@supabase/supabase-js": "^2.45.0",
  ```
* **📐 對齊度審查 (Alignment Check)**：
  違背了 `AGENTS.md` 中的「DEPENDENCY_VERIFY」鐵規。

---

### 🚨 [維度 6] 資料外洩 - 第三方 API Key 明文存放在 localStorage 中
* **📍 問題精確位置 (Location)**：
  - [services/ai.ts:L114-L124](file:///c:/Users/user/Desktop/Quiz-app--main/services/ai.ts#L114-L124)
* **💡 發生成因 (Root Cause)**：
  用戶輸入的 Gemini / OpenAI 的 API Key 在啟用持久化時，是直接被轉成 JSON 明文 `JSON.stringify(config)` 並存放在客戶端的 `localStorage` 中。
* **💥 潛在影響與連鎖反應 (Impact Analysis & Ripple Effects)**：
  這屬於敏感資訊外洩。如果網站遭遇了 XSS 漏洞，或者是用戶安裝了惡意的瀏覽器插件，這些金鑰非常容易被一併讀取並發送至惡意伺服器，對用戶造成不可挽回的金錢與 API 配額損失。
* **🛡️ 防禦與修復建議 (Mitigation & Fix Recommendations)**：
  雖然這是一個靜態 Serverless 前端，但最安全的解決方案是透過一個後端中轉 Proxy（例如 Supabase Edge Functions），用戶的 Key 可以加密後以一次性 Token 換取，或是由後端統一控管配額。若必須存於前端，建議至少對金鑰進行簡單的客戶端對稱加密（如 AES），防止被明文撈取。

---

### 🚨 [維度 17] CSRF / SSRF 防護 - NVIDIA API 寫死 baseUrl 與 proxy 繞過限制
* **📍 問題精確位置 (Location)**：
  - [services/ai.ts:L133-L144](file:///c:/Users/user/Desktop/Quiz-app--main/services/ai.ts#L133-L144)
* **💡 發生成因 (Root Cause)**：
  在 `resolveNvidiaBaseUrl` 中，如果環境為 Production，而 `baseUrl` 又是預設的網域時，代碼會拋出 Error 阻斷請求。
* **💥 潛在影響與連鎖反應 (Impact Analysis & Ripple Effects)**：
  這迫使用戶必須在前端設定真實的 baseUrl，而無法利用 `vercel.json` 所配置的 `/api/nvidia` 反向代理（Proxy）。這繞過了服務端的代理隔離，使得前端不得不直接與外部第三方網域通信，增加了 CORS 以及 API Key 在請求攔截中被洩漏的風險，同時降低了 SSRF（服務端請求偽造）的屏蔽能力。
* **🛡️ 防禦與修復建議 (Mitigation & Fix Recommendations)**：
  應支持在正式環境下使用同源 Vercel 代理路徑：
  ```diff
  export const resolveNvidiaBaseUrl = (baseUrl: string | undefined, isProd: boolean = import.meta.env.PROD, origin: string = window.location.origin): string => {
-   const isDefaultUrl = !baseUrl || baseUrl === NVIDIA_DEFAULT_BASE_URL;
-   if (isProd && isDefaultUrl) {
-     throw new Error('NVIDIA 供應商在正式環境需設定自訂 baseUrl...');
-   }
-   return isDefaultUrl ? `${origin}/api/nvidia` : baseUrl;
+   return baseUrl || `${origin}/api/nvidia`;
  };
  ```

---

### 🚨 [維度 19] 測試覆蓋與可測性盲區 - 傷害計算與怪物升級邏輯無單元測試
* **📍 問題精確位置 (Location)**：
  - [hooks/useBattleSystem.ts:L366-L387](file:///c:/Users/user/Desktop/Quiz-app--main/hooks/useBattleSystem.ts#L366-L387)
  - [src/__tests__/useBattleSystem.test.ts](file:///c:/Users/user/Desktop/Quiz-app--main/src/__tests__/useBattleSystem.test.ts)
* **💡 發生成因 (Root Cause)**：
  專案雖然有針對戰鬥系統的基本狀態機做單元測試，但是針對最核心的數值公式（例如「單次傷害限制護盾」在 Normal/Elite/Boss 的減傷公式百分比）以及「每 10 題出 Boss、每 5 題出 Elite」的生成邏輯，完全沒有撰寫對應的單元測試進行邊界驗證。
* **💥 潛在影響與連鎖反應 (Impact Analysis & Ripple Effects)**：
  任何對 `useBattleSystem` 數值公式的調整都可能無意中破壞遊戲難度平衡，甚至因為除以零或無窮大而引發狀態機故障。
* **🛡️ 防禦與修復建議 (Mitigation & Fix Recommendations)**：
  在 `useBattleSystem.test.ts` 中補齊對 `triggerAnswer` 在多種邊界條件（連續答對 5 次、10 次、怪獸 HP 臨界值）下的單元測試：
  ```typescript
  // 測試套件加固範例
  it('should spawn Elite monster on 5th question and Boss on 10th question', () => {
      // 模擬連續答題，驗證怪物難度狀態變化是否正確符合 5 (elite) 與 10 (boss) 的設定
  });
  ```

---

## 📐 其他小發現 (Additional Architectural Recommendations)

### 📌 好友成就解鎖時間重疊設計缺失
* **位置**：`hooks/useAchievementTracker.ts`
* **成因**：解鎖 `night_owl` (22:00 ~ 6:00) 與 `early_bird` (0:00 ~ 6:00) 的時間判斷區間在凌晨有部分重合。
* **影響**：這導致在凌晨 0:00 ~ 6:00 答題時，用戶會一口氣觸發兩項成就的解鎖判定，使得成就解鎖的獨特性與驚喜感降低。
* **建議**：修正為 `night_owl` 限制在 `22:00 ~ 0:00`，而 `early_bird` 限制在 `0:00 ~ 6:00`。

---

> [!IMPORTANT]
> **本報告之所有加固策略均已寫入專案的 `docs/reports/` 目錄下以供備存。請於審閱本報告後，再決定是否指示後續的修復與驗證實作。**
