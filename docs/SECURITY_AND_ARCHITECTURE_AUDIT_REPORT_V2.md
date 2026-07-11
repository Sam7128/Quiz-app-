# MindSpark 全方位系統架構與安全性窮盡審計報告 (V2 - 終極窮盡版)

## 📌 報告資訊
- **審計日期**：2026-06-26
- **審計專家**：資深系統安全架構師與程式碼審計專家 (Protocol: PERFECTION)
- **專案名稱**：MindSpark Quiz App
- **狀態**：窮盡審查完成

---

## 📖 目錄
1. [專案背景與熱點歷史檢索](#1-專案背景與熱點歷史檢索)
2. [網絡安全與 Vercel 標頭安全審計](#2-網絡安全與-vercel-標頭安全審計)
3. [非同步與競爭條件 (Race Conditions) 深度挖掘](#3-非同步與競爭條件-race-conditions-深度挖掘)
4. [架構衝突與資源洩漏審計](#4-架構衝突與資源洩漏審計)
   - 4.1 [Guest 模式與 Authenticated 模式合併同步邏輯衝突](#41-guest-模式與-authenticated-模式合併同步邏輯衝突)
   - 4.2 [FocusTimer 中的 Web AudioContext 資源洩漏](#42-focustimer-中的-web-audiocontext-資源洩漏)
   - 4.3 [鍵盤監聽器的卸載安全性](#43-鍵盤監聽器的卸載安全性)
5. [【全新挖掘】最底層隱蔽風險與架構邊界審計](#5-全新挖掘最底層隱蔽風險與架構邊界審計)
   - 5.1 [API 金鑰加密在 Client-Only 下的 XSS 同網域繞過漏洞](#51-api-金鑰加密在-client-only-下的-xss-同網域繞過漏洞)
   - 5.2 [Supabase 題庫同步非原子性與「極限中斷」遺留幽靈題目](#52-supabase-題庫同步非原子性與極限中斷遺留幽靈題目)
   - 5.3 [全域音效單例的長效內存佔用](#53-全域音效單例的長效內存佔用)
6. [總結與後續風險改善建議](#6-總結與後續風險改善建議)

---

## 1. 專案背景與熱點歷史檢索

透過調用 `codebase-memory-mcp` 的知識圖譜 (`get_architecture` 及其 hotspots)，並檢索本專案歷史備忘與 `MEMORY.md` 之後，我們鎖定了本系統架構的邊界特徵、痛點與狀態管理特徵：

### 1.1 系統邊界與 I/O 熱點分析
- **I/O 分離模式**：元件不直接讀寫 `localStorage` 或 Supabase 雲端資料庫，而是透過 `services/` 層（如 [storage.ts](file:///C:/Users/user/Desktop/Quiz-app-/services/storage.ts) 與 [cloudStorage.ts](file:///C:/Users/user/Desktop/Quiz-app-/services/cloudStorage.ts)）與 [RepositoryContext](file:///C:/Users/user/Desktop/Quiz-app-/contexts/RepositoryContext.tsx) 進行資料隔離。
- **熱點函數 (High Fan-In Hotspots)**：
  - `getAllPracticeSessions` (fan_in = 12) & `persistPracticeSessions` (fan_in = 7)：分階段練習與雲端/本機持久化的核心交換中轉。
  - `getUserSettings` (fan_in = 7)：管理使用者 AI 偏好與音效狀態的儲存讀取點。
  - `useQuizEngine` / `useBattleSystem`：與戰鬥 RPG 狀態、技能動畫、答題邏輯有深度的雙向耦合。

### 1.2 狀態與安全歷史事實 (Stable Facts)
- **API 金鑰與資料防禦**：先前已實施 `HMAC-SHA256` 無狀態動態派生簽名（[integrityCheck.ts](file:///C:/Users/user/Desktop/Quiz-app-/utils/integrityCheck.ts)），並且在讀取本機 AI 設定時加上了 `Type Guard` 屬性安全驗證，防止惡意 payload 注入。
- **練習同步 (Practice Session Sync)**：在 [cloudStorage.ts](file:///C:/Users/user/Desktop/Quiz-app-/services/cloudStorage.ts#L543) 中配置了本地並發鎖 `window.__MINDSPARK_SYNC_LOCK__` 防護，並針對未登入至已登入狀態，修補了雲端 session 反寫回本機的覆蓋規則 (LWW)，防範進度被空資料蓋掉。

---

## 2. 網絡安全與 Vercel 標頭安全審計

經過掃描專案內對外 API 的實作，我們確認了 MindSpark 主要呼叫的三個外部資源端點：
1. **Supabase (雲端資料庫)**：向 `https://*.supabase.co` 進行身分驗證與資料庫讀寫。
2. **Google Gemini API**：直接向 `https://generativelanguage.googleapis.com` 呼叫生成模型（例如 PDF 題庫生成與 AI 助教答題）。
3. **NVIDIA / OpenAI API**：使用 OpenAI SDK 對自訂 URL 發送請求。本專案已在 [vercel.json](file:///C:/Users/user/Desktop/Quiz-app-/vercel.json) 中配置了 NVIDIA 代理（將 `/api/nvidia` proxy 到 `https://integrate.api.nvidia.com/v1`），但如果使用者自訂了 base URL（如直接呼叫 OpenAI 官網），則需要連線到 `https://api.openai.com`。
4. **外部資源載入**：在 [index.html](file:///C:/Users/user/Desktop/Quiz-app-/index.html#L44-L45) 中引入了 Google 字型服務（`https://fonts.googleapis.com` 與 `https://fonts.gstatic.com`）。

### 2.1 嚴密 HTTP 安全標頭配置設計

我們為 Vercel 部署環境設計了以下 5 個安全防禦標頭。這些標頭能夠有效限制前端 XSS 注入程式碼的外傳能力、防止 Clickjacking，並縮減受攻擊面。

#### 1. Content-Security-Policy (CSP)
- **connect-src**: `connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.openai.com https://integrate.api.nvidia.com;`
  - *防禦原理*：僅允許前端發送網絡請求 (Fetch/XHR) 到本機同源、Supabase、Gemini、OpenAI 與 NVIDIA。若前端遭到 XSS 惡意指令注入，試圖將 `localStorage` 中的明文 API 金鑰傳送到黑客控制的外部伺服器（例如 `https://hacker.evil.com`），瀏覽器會在傳輸層直接攔截，金鑰無法流出。
- **script-src**: `script-src 'self' 'unsafe-inline';`
  - *折衷考量*：因為 Vite 打包的 React 專案在靜態部署時有部分內聯腳本，且 Vite HMR 或部分動態渲染需要 `unsafe-inline`，因此保留它。不加入 `unsafe-eval` 以徹底禁止動態執行不安全的字串代碼。
- **style-src**: `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;`
  - *防禦原理*：除了同源樣式外，允許使用內聯樣式（React 的 CSS-in-JS 動態樣式必備）與 Google Fonts 的樣式表引入。
- **font-src**: `font-src 'self' https://fonts.gstatic.com;`
  - *防禦原理*：僅允許向同源或 Google Fonts 靜態字型伺服器載入字體檔案。
- **media-src**: `media-src 'self' https: blob:;`
  - *防禦原理*：遊戲模式下的音效（攻擊、正確、錯誤）均部署在 Vercel 靜態資源中 (`/sounds/`)，故僅允許 `'self'` 與安全協議 `https:` 或 `blob:`，防止加載惡意語音/視訊注入。

#### 2. X-Frame-Options: `DENY`
- *防禦原理*：徹底禁止此網頁被嵌入到任何其他網站的 `<iframe />` 或 `<frame />` 中。這能完全防範「點擊劫持 (Clickjacking)」，避免攻擊者在惡意網站上透過透明圖層覆蓋我們的應用，誘騙用戶點擊執行未授權的同步或重置操作。

#### 3. X-Content-Type-Options: `nosniff`
- *防禦原理*：強制瀏覽器嚴格遵守 HTTP 回應中宣告的 `Content-Type`，不進行自動的 MIME 型別嗅探（Sniffing）。這防止了攻擊者將惡意 script 偽裝為圖片或文字檔案上傳，再誘使瀏覽器以 JavaScript 解釋執行。

#### 4. Referrer-Policy: `strict-origin-when-cross-origin`
- *防禦原理*：在同源請求時發送完整的路徑作為 Referrer，但在跨站請求時只發送網域名稱（Origin）。如果當前路徑包含敏感資訊（例如 query 中的 token 或 id），這能防止在發送請求到第三方 API（如 Gemini / Nvidia）時洩漏敏感路徑。

#### 5. Permissions-Policy: `camera=(), microphone=(), geolocation=(), interest-cohort=()`
- *防禦原理*：主動告知瀏覽器此網站絕不使用相機、麥克風與地理定位權限，瀏覽器將對這些硬體接口進行最嚴格的鎖定。即使前端有邏輯漏洞被劫持，也無法透過瀏覽器私自調用硬體設備竊聽。

### 2.2 具體 `vercel.json` 實作配置

建議對專案根目錄的 [vercel.json](file:///C:/Users/user/Desktop/Quiz-app-/vercel.json) 進行如下更新：

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.openai.com https://integrate.api.nvidia.com; media-src 'self' https: blob:; frame-ancestors 'none';"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/nvidia/:path*",
      "destination": "https://integrate.api.nvidia.com/v1/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 3. 非同步與競爭條件 (Race Conditions) 深度挖掘

### 3.1 雲端同步並發鎖
- **現狀評價**：在 [services/cloudStorage.ts](file:///C:/Users/user/Desktop/Quiz-app-/services/cloudStorage.ts#L546-L555) 中，`syncLocalPracticeSessions` 導入了 `window.__MINDSPARK_SYNC_LOCK__`。這有效阻止了單一頁面上因路由切換或 Effect 重跑引起的二次並發同步。
- **潛在隱患 (多分頁競態)**：該變數是記憶體變數，無法跨瀏覽器分頁 (Tab) 共享。如果使用者開啟多個 Tab，並同時在兩邊進行同步，此時 `LWW (Last-Write-Wins)` 比對機制可能會因為非同步寫入的微秒級時差，導致本地 localStorage 在雙向寫入時發生資料混亂。
- **優化建議**：可以使用 `localStorage` 的鎖來取代內存鎖，因為 `localStorage` 是跨分頁共享的。
  ```typescript
  // 跨分頁鎖範例
  const acquireLock = () => {
    const lock = localStorage.getItem('mindspark_sync_lock');
    if (lock && Date.now() - Number(lock) < 10000) return false; // 10秒防死鎖
    localStorage.setItem('mindspark_sync_lock', String(Date.now()));
    return true;
  };
  ```

### 3.2 草稿 Regression 競態條件
- **代碼位置**：[hooks/useChunkedPractice.ts](file:///C:/Users/user/Desktop/Quiz-app-/hooks/useChunkedPractice.ts) 內部的 `updateChunkDraft` 與 `beforeunload`。
- **問題成因**：`beforeunload` 事件監聽器與組件內的 `useState` 狀態不同步，容易以未及時更新的 `latestProgressRef.current` (甚至在剛掛載還沒初始化時為空，或是 index 為 0) 覆蓋 `localStorage` 中進度較新的草稿。
- **重構與防禦方案**：將草稿保存的防禦與寫入邏輯合併為一個統一的 `saveChunkDraftSafely` 輔助函數，在正常進度更新與 `beforeunload` 中一致呼叫，以杜絕邏輯重複與競態風險。

#### 💡 程式碼修改對比 (Diff)

```diff
<<<< 原程式碼 (C:\Users\user\Desktop\Quiz-app-\hooks\useChunkedPractice.ts:L394-L449)
  const updateChunkDraft = useCallback((progress: ChunkRuntimeProgress) => {
    latestProgressRef.current = progress;
    if (!currentChunkMeta) return;

    // 防禦性進度保護：避免以初始狀態 (0 題且無錯誤) 覆蓋已存在的更先進草稿
    const existingDraft = getChunkDraft(currentChunkMeta.sessionId, currentChunkMeta.chunkIndex);
    if (
      existingDraft &&
      existingDraft.currentQuestionIndex > progress.currentQuestionIndex &&
      progress.currentQuestionIndex === 0 &&
      progress.wrongQuestionIds.length === 0
    ) {
      console.warn(
        `[ChunkPractice] Prevented draft regression: local is ${existingDraft.currentQuestionIndex}, incoming is ${progress.currentQuestionIndex}`
      );
      return;
    }

    saveChunkDraft({
      sessionId: currentChunkMeta.sessionId,
      chunkIndex: currentChunkMeta.chunkIndex,
      currentQuestionIndex: progress.currentQuestionIndex,
      score: progress.score,
      wrongQuestionIds: progress.wrongQuestionIds,
      pendingSkill: progress.pendingSkill,
      updatedAt: Date.now(),
    });
  }, [currentChunkMeta]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (!currentChunkMeta || !latestProgressRef.current) return;

      const existingDraft = getChunkDraft(currentChunkMeta.sessionId, currentChunkMeta.chunkIndex);
      if (
        existingDraft &&
        existingDraft.currentQuestionIndex > latestProgressRef.current.currentQuestionIndex &&
        latestProgressRef.current.currentQuestionIndex === 0 &&
        latestProgressRef.current.wrongQuestionIds.length === 0
      ) {
        return;
      }

      saveChunkDraft({
        sessionId: currentChunkMeta.sessionId,
        chunkIndex: currentChunkMeta.chunkIndex,
        currentQuestionIndex: latestProgressRef.current.currentQuestionIndex,
        score: latestProgressRef.current.score,
        wrongQuestionIds: latestProgressRef.current.wrongQuestionIds,
        pendingSkill: latestProgressRef.current.pendingSkill,
        updatedAt: Date.now(),
      });
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [currentChunkMeta]);
====
==== 修改後優化程式碼
  const saveChunkDraftSafely = useCallback((sessionId: string, chunkIndex: number, progress: ChunkRuntimeProgress) => {
    // 防禦性進度保護：避免以初始狀態 (0 題且無錯誤) 覆蓋已存在的更先進草稿
    const existingDraft = getChunkDraft(sessionId, chunkIndex);
    if (
      existingDraft &&
      existingDraft.currentQuestionIndex > progress.currentQuestionIndex &&
      progress.currentQuestionIndex === 0 &&
      progress.wrongQuestionIds.length === 0
    ) {
      console.warn(
        `[ChunkPractice] Prevented draft regression: local is ${existingDraft.currentQuestionIndex}, incoming is ${progress.currentQuestionIndex}`
      );
      return;
    }

    saveChunkDraft({
      sessionId,
      chunkIndex,
      currentQuestionIndex: progress.currentQuestionIndex,
      score: progress.score,
      wrongQuestionIds: progress.wrongQuestionIds,
      pendingSkill: progress.pendingSkill,
      updatedAt: Date.now(),
    });
  }, []);

  const updateChunkDraft = useCallback((progress: ChunkRuntimeProgress) => {
    latestProgressRef.current = progress;
    if (!currentChunkMeta) return;
    saveChunkDraftSafely(currentChunkMeta.sessionId, currentChunkMeta.chunkIndex, progress);
  }, [currentChunkMeta, saveChunkDraftSafely]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (!currentChunkMeta || !latestProgressRef.current) return;
      saveChunkDraftSafely(currentChunkMeta.sessionId, currentChunkMeta.chunkIndex, latestProgressRef.current);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [currentChunkMeta, saveChunkDraftSafely]);
>>>>
```

---

## 4. 架構衝突與資源洩漏審計

### 4.1 Guest 模式與 Authenticated 模式合併同步邏輯衝突
- **問題分析**：在 [hooks/useBankManager.ts](file:///C:/Users/user/Desktop/Quiz-app-/hooks/useBankManager.ts) 的 `refreshBanksData` 中，有一行排他條件：
  `if (localMeta.length > 0 && latest.length === 0)`
  - *嚴重程度*：**High (高)**
  - *影響範圍*：當原本就在雲端有題庫的用戶，在未登入狀態下新增了本地題庫，登入後 `latest.length` 不為 0，這會導致該用戶在本地 Guest 模式下建立的題庫**完全不會觸發同步提示**，並且在 `dispatch({ type: 'sync_banks_data' })` 後，本地的 Guest 題庫直接被雲端題庫清單覆蓋，導致用戶本地的心血遺失。
  - *修復方案*：改為計算「只存在於本地而不在雲端」的題庫清單。如果有，則提示合併。

#### 💡 程式碼修改對比 (Diff)

```diff
<<<< 原程式碼 (C:\Users\user\Desktop\Quiz-app-\hooks\useBankManager.ts:L47-L62)
    const localMeta = getBanksMeta();
    if (localMeta.length > 0 && latest.length === 0) {
      if (await confirmDialog({ title: '同步題庫', message: '偵測到您在本地端有題庫，但雲端是空的。是否要將本地題庫上傳至雲端同步？' })) {
        const syncResult = await repository.syncLocalToCloud(localMeta);
        latest = await repository.getBanks();
        if (syncResult.failed.length === 0) {
          localStorage.removeItem(STORAGE_KEYS.BANKS_META);
          toast.success('同步完成！');
        } else if (syncResult.successIds.length > 0) {
          const failedMeta = localMeta.filter(b => syncResult.failed.some(f => f.id === b.id));
          localStorage.setItem(STORAGE_KEYS.BANKS_META, JSON.stringify(failedMeta));
          toast.warning(`同步部分成功！${syncResult.successIds.length} 個題庫同步成功，${syncResult.failed.length} 個失敗。`);
        } else {
          toast.error(`同步失敗！所有 ${syncResult.failed.length} 個題庫同步失敗，請稍後重試。`);
        }
      }
    }
====
==== 修改後優化程式碼
    const localMeta = getBanksMeta();
    // 篩選出只在本機存在但不在雲端資料清單中的題庫 (以 id 識別)
    const unsyncedLocalMeta = localMeta.filter(local => !latest.some(cloud => cloud.id === local.id));

    if (unsyncedLocalMeta.length > 0) {
      const message = latest.length === 0
        ? '偵測到您在本地端有題庫，但雲端是空的。是否要將本地題庫上傳至雲端同步？'
        : `偵測到您在本地端有 ${unsyncedLocalMeta.length} 個題庫尚未同步至雲端。是否要將它們合併上傳？`;

      if (await confirmDialog({ title: '同步題庫', message })) {
        const syncResult = await repository.syncLocalToCloud(unsyncedLocalMeta);
        latest = await repository.getBanks();
        if (syncResult.failed.length === 0) {
          // 只移除成功上網的題庫 metadata
          const remainingMeta = localMeta.filter(b => !syncResult.successIds.includes(b.id));
          if (remainingMeta.length === 0) {
            localStorage.removeItem(STORAGE_KEYS.BANKS_META);
          } else {
            localStorage.setItem(STORAGE_KEYS.BANKS_META, JSON.stringify(remainingMeta));
          }
          toast.success('同步完成！');
        } else if (syncResult.successIds.length > 0) {
          const remainingMeta = localMeta.filter(b => !syncResult.successIds.includes(b.id));
          localStorage.setItem(STORAGE_KEYS.BANKS_META, JSON.stringify(remainingMeta));
          toast.warning(`同步部分成功！${syncResult.successIds.length} 個題庫同步成功，${syncResult.failed.length} 個失敗。`);
        } else {
          toast.error(`同步失敗！所有 ${syncResult.failed.length} 個題庫同步失敗，請稍後重試。`);
        }
      }
    }
>>>>
```

---

### 4.2 FocusTimer 中的 Web AudioContext 資源洩漏
- **問題分析**：在 [components/FocusTimer.tsx](file:///C:/Users/user/Desktop/Quiz-app-/components/FocusTimer.tsx) 的 `playNotificationSound` 中，使用了原生 Web Audio API 動態建立 `AudioContext` 播放嗶嗶聲。
  - *嚴重程度*：**High (高)**
  - *影響範圍*：元件內使用 `setTimeout` 延遲 0.6 秒關閉該 `audioContext`。然而，如果使用者在播放完畢前（0.6秒內）關閉計時器或切換路由，導致組件卸載 (Unmount)，會觸發 cleanup 中的 `audioTimersRef.current.forEach(clearTimeout)`。
  - *結果*：這會清除該 `setTimeout`，導致 `audioContext.close()` **永遠不會被執行**。每次未播完即卸載時，系統便會遺留一個未關閉的 `AudioContext`，持續佔用瀏覽器的音訊解碼通道資源。當通道被佔滿時，瀏覽器將拒絕建立新的音效物件，並發出 `AudioContext quota exceeded` 的報錯，造成音效功能死鎖。
  - *修復方案*：建立一個 `activeAudioContextsRef` 來追蹤所有活躍中的 `AudioContext`。組件卸載時，遍歷列表將它們全部強制關閉。

#### 💡 程式碼修改對比 (Diff)

```diff
<<<< 原程式碼 (C:\Users\user\Desktop\Quiz-app-\components\FocusTimer.tsx:L16-L26 與 L58-L92)
  const [completedSessions, setCompletedSessions] = useState(0);
  const audioTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup audio timers on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      audioTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  ...

  const playNotificationSound = () => {
    // Simple beep using Web Audio API
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // 在音效停止後 0.6 秒 (0.5秒音效時間 + 0.1秒緩衝時間) 釋放 AudioContext 資源
      const timer = setTimeout(() => {
        try {
          audioContext.close();
        } catch (closeErr) {
          console.error('[FocusTimer] Failed to close AudioContext:', closeErr);
        }
      }, 600);

      // 追蹤此計時器，組件銷毀時可一併釋放
      audioTimersRef.current.push(timer);
    } catch (e) {
      console.log('Audio not supported', e);
    }
  };
====
==== 修改後優化程式碼
  const [completedSessions, setCompletedSessions] = useState(0);
  const audioTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const activeAudioContextsRef = useRef<AudioContext[]>([]);

  // Cleanup audio resources on unmount
  useEffect(() => {
    return () => {
      // 1. 清除所有待執行的釋放定時器
      // eslint-disable-next-line react-hooks/exhaustive-deps
      audioTimersRef.current.forEach(timer => clearTimeout(timer));
      // 2. 強制關閉所有未釋放的音訊解碼通道
      // eslint-disable-next-line react-hooks/exhaustive-deps
      activeAudioContextsRef.current.forEach(ctx => {
        try {
          if (ctx.state !== 'closed') {
            ctx.close();
          }
        } catch (err) {
          console.error('[FocusTimer] Unmount closing AudioContext failed:', err);
        }
      });
    };
  }, []);

  ...

  const playNotificationSound = () => {
    // Simple beep using Web Audio API
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      activeAudioContextsRef.current.push(audioContext); // 註冊追蹤

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // 在音效停止後 0.6 秒 (0.5秒音效時間 + 0.1秒緩衝時間) 釋放 AudioContext 資源
      const timer = setTimeout(() => {
        try {
          audioContext.close();
          // 從活躍註冊列表中移出
          activeAudioContextsRef.current = activeAudioContextsRef.current.filter(ctx => ctx !== audioContext);
        } catch (closeErr) {
          console.error('[FocusTimer] Failed to close AudioContext:', closeErr);
        }
      }, 600);

      // 追蹤此計時器，組件銷毀時可一併釋放
      audioTimersRef.current.push(timer);
    } catch (e) {
      console.log('Audio not supported', e);
    }
  };
>>>>
```

---

### 4.3 鍵盤監聽器的卸載安全性
- **現狀評估**：在 [hooks/useKeyboardShortcuts.ts](file:///C:/Users/user/Desktop/Quiz-app-/hooks/useKeyboardShortcuts.ts#L48-L49) 中，使用了標準的事件訂閱結構：
  ```typescript
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
  ```
- **安全風險**：當組件卸載時，事件會被正確註銷，沒有洩漏風險。但由於依賴項包含了 `onSelectOption, onSubmitOrNext, onToggleHint, onExit`，只要其中任何一個處理函數因為 React 重新渲染而改變參考，這個 useEffect 就會反覆解綁與重新繫結。
- **優化方向**：建議將回調函數使用 `useRef` 進行包裹，在事件監聽器中透過 ref 呼叫，使事件監聽器生命週期完全獨立於回調函數的參考變化，提高渲染效能。
  ```typescript
  const handlersRef = useRef({ onSelectOption, onSubmitOrNext, onToggleHint, onExit });
  useEffect(() => {
    handlersRef.current = { onSelectOption, onSubmitOrNext, onToggleHint, onExit };
  }); // 每次渲染都更新 ref
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 透過 handlersRef.current.onSubmitOrNext() 呼叫
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // 依賴為空，只繫結一次
  ```

---

## 5. 【全新挖掘】最底層隱蔽風險與架構邊界審計

在實施 Protocol: PERFECTION 的審計規範下，我們對專案底層的加密模組、Supabase 原子性與全局單例生命週期進行了二次深潛 (Deep Dive)，發現了以下更隱蔽的架構與安全性風險：

### 5.1 API 金鑰加密在 Client-Only 下的 XSS 同網域繞過漏洞
- **代碼位置**：[utils/crypto.ts](file:///C:/Users/user/Desktop/Quiz-app-/utils/crypto.ts)
- **嚴重程度**：**High (高)**
- **問題成因**：
  在 `utils/crypto.ts` 中，API 金鑰是使用 `AES-GCM` 算法加密後儲存在 `localStorage` 中。解密時會調用 `getCryptoKey()`：
  ```typescript
  const salt = getOrGenerateSalt(); // 來自 localStorage 中的 mindspark_crypto_salt
  const encoder = new TextEncoder();
  const seed = encoder.encode('mindspark_secure_key_seed'); // 硬編碼種子
  ```
  這意味著，加密所需的所有動態與靜態要素（Salt 存儲在 localStorage，Seed 硬編碼在前端 JS 程式碼中）**完全暴露在同一個網域下**。
- **結果與危害**：
  如果網站不幸遭受 XSS (跨站腳本) 攻擊，惡意腳本不僅能讀取 `localStorage` 中加密後的 API 金鑰，還可以直接讀取 `mindspark_crypto_salt` 拿到鹽值，並將前端公開的 `'mindspark_secure_key_seed'` 與鹽值結合，在受害者瀏覽器中**直接呼叫 SubtleCrypto 解密出明文的 API Key**。
- **結論**：純前端的 AES-GCM 加密雖然能防止用戶通過 F12 瀏覽器儲存直觀看到金鑰，但**無法防禦 XSS 攻擊盜取金鑰**。
- **架構優化建議**：
  1. *終極防禦*：將對 Google Gemini 或 Nvidia API 的請求改為經由用戶自備的 Backend Proxy 轉發，前端只保存短效 (Short-lived) Token，不留存長期有效的主 API Key。
  2. *折衷妥協*：如果不引入後端，應在使用者登入或輸入 Key 時，要求輸入一個自訂密碼，以該密碼結合 PBKDF2 衍生解密金鑰，密碼絕不留存於 localStorage，只有在當前 session 內存中有效。

---

### 5.2 Supabase 題庫同步非原子性與「極限中斷」遺留幽靈題目
- **代碼位置**：[services/cloudStorage.ts](file:///C:/Users/user/Desktop/Quiz-app-/services/cloudStorage.ts) -> `saveCloudQuestions`
- **嚴重程度**：**Medium (中)**
- **問題成因**：
  當使用者儲存或同步題庫時，`saveCloudQuestions` 採取了以下步驟：
  1. 呼叫 `supabase.from('questions').upsert(...)` (寫入/更新題目)。
  2. 呼叫 `supabase.from('questions').select('id').eq(...)` (獲取雲端該題庫現有的 IDs)。
  3. 對比本地不存在的 IDs，分批呼叫 `supabase.from('questions').delete().in(...)` (刪除已被本地刪除的 orphan 題目)。
  雖然代碼很防禦性地在 `catch` 到 fetch/delete 失敗時會調用 `addDirtyBank(bankId)` 將其標記為 `mindspark_dirty_banks` 並在下次重試。但如果在 **Upsert 成功後，但 Fetch 尚未執行（或 Delete 尚未成功）的極短瞬間**，發生了以下「極限中斷」：
  - 用戶強制關閉瀏覽器分頁 (Kill Tab)。
  - 行動裝置上因內存不足 (OOM) 導致瀏覽器背景進程被作業系統殺死。
  - 電腦突發斷電。
- **結果**：
  由於 upsert 已在雲端資料庫生效，但 orphans 刪除指令未發送，且 `addDirtyBank` 因為進程中斷**來不及寫入本地的 localStorage**，這會導致該題庫在雲端留下永久的「幽靈題目 (Orphan Questions)」。當用戶於其他設備重新同步該題庫時，會將這些已被刪除的題目重新拉回，造成本地與雲端資料不一致。
- **架構優化建議**：
  棄用前端多步發送請求的機制，在 Supabase 端建立一個 PostgreSQL 的 RPC 預存程序，將 `questions` 的 upsert 與 orphan 刪除操作封裝在同一個資料庫交易 (`Transaction`) 中：
  ```sql
  -- Supabase Postgres Transaction RPC 範例
  CREATE OR REPLACE FUNCTION sync_bank_questions(
    p_bank_id UUID,
    p_questions JSONB
  ) RETURNS VOID AS $$
  BEGIN
    -- 1. 執行批次 upsert
    -- 2. 刪除不在 p_questions 清單中的舊題目 (利用 single query 在同一個事務中處理)
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```
  前端改為僅呼叫 `supabase.rpc('sync_bank_questions', { ... })`，實現真正的原子性交易防護。

---

### 5.3 全域音效單例的長效內存佔用
- **代碼位置**：[hooks/useSoundEffects.ts](file:///C:/Users/user/Desktop/Quiz-app-/hooks/useSoundEffects.ts)
- **嚴重程度**：**Low (低)**
- **問題成因**：
  系統使用 Howler.js 作音效管理，並以全域變數做單例快取：
  ```typescript
  let bgmInstance: Howl | null = null;
  let sfxAttackInstance: Howl | null = null;
  ...
  ```
  這在避免多次重疊實例化上效果顯著，但在單頁應用 (SPA) 路由多次切換（即使切換到完全不需要音效的設定或社交頁面）或長期背景運行（Timer 專注期間）時，這些被實例化的音訊快取解碼數據會**永久駐留在記憶體**中不釋放。
- **架構優化建議**：
  在 `useSoundEffects` 內提供一個手動註銷或自動 GC 機制，在特定頁面卸載時呼叫 `Howler.unload()` 或實例的 `unload()`，以在記憶體吃緊的行動裝置上釋放音訊解碼記憶體。

---

## 6. 總結與後續風險改善建議

本專案具備健全的程式碼潔淨度 (Code Hygiene) 及資料驗證邏輯，但若能依據本報告指出的核心邊界進行防禦與修復，將使系統的安全性與資料完整性更趨完美：

1. **部署 Vercel 安全防禦**：將 CSP 與 Frame 防護設定寫入 `vercel.json` 進行伺服器端標頭強制封鎖，以取代靜態 `<meta>`。這能防範未來的 XSS 進而保護 `localStorage` 中的明文憑證。
2. **重構草稿防 Regression 邏輯**：使用統一的 `saveChunkDraftSafely` 移除重複邏輯，並限制舊進度覆蓋新進度的機會。
3. **修補 Guest 合併同步缺陷**：消除 `latest.length === 0` 的排他機制，讓既有用戶的本地題庫也能被安全合併上傳。
4. **硬體解碼通道資源釋放**：在計時器與音效播放 unmount 時強制關閉 `AudioContext`，保障應用的記憶體衛生。
5. **資料庫交易 (RPC)**：建議使用 Supabase Postgres Function 封裝 `saveCloudQuestions`，消除極限中斷時幽靈資料遺留的隱患。
6. **API Key 本地安全極限**：正視前端加密在 XSS 下的局限性，後續若專案擴大，應考慮建立後端 Proxy。

---
*報告結束*
