# 核心函式代碼審計與安全性評估報告

本報告針對專案中的三個核心常數/函式進行詳細的引用分析、實作細查與安全性評估。我們以嚴格的「專案審查者 (Project Inquisitor)」視角，深入剖析其設計瑕疵、安全風險及不完整的實作。

---

## 1. `cleanJsonResponse` (`services/ai.ts`)

### 1.1 程式碼定義與實作
```typescript
export const cleanJsonResponse = (raw: string): string => {
  // Remove markdown code blocks
  let clean = raw.replace(/```json\n?|\n?```/g, "").trim();
  // Remove potential leading/trailing non-JSON characters like comments or text
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start !== -1 && end !== -1) {
    clean = clean.substring(start, end + 1);
  }
  // Remove trailing commas from objects and arrays (common LLM error)
  clean = clean.replace(/,(\s*[\]}])/g, '$1');
  return clean;
};
```

### 1.2 引用情況分析
經由全專案 `grep_search` 掃描，其引用分佈如下：
- **定義位置**：`services/ai.ts` (第 48 行)
- **內部引用**：`services/ai.ts` (第 298 行)，於 `generateQuestionsFromPDF` 中呼叫：
  ```typescript
  const cleanJson = cleanJsonResponse(text);
  const parsed: unknown = JSON.parse(cleanJson);
  ```
- **外部引用**：無。沒有任何其他模組導入或使用此函式。
- **重構狀態**：已在死碼清理計畫（`dead-code-cleanup`）中被列為「取消 export」對象，未來將限制在 `services/ai.ts` 模組私有。

### 1.3 審計與安全性評估

#### ⚠️ 實作缺陷：邊界定位脆弱性 (Fragile Boundary Positioning)
該函式使用 `indexOf('[')` 和 `lastIndexOf(']')` 來擷取最外層的 JSON 陣列。這種作法存在嚴重的解析邊界漏洞：
1. **多重陣列混淆**：若 AI 在回傳的 JSON 之外輸出了其他包含方括號的說明文字（例如：`「以下是為您生成的 5 題練習 [PDF 解析結果]：... 」` 或是 `「註記：[本題目由 Gemini 1.5 產生]」`），這會導致 `start` 或 `end` 定位到非 JSON 陣列的括號，從而使得擷取出來的子字串包含非 JSON 內容，導致 `JSON.parse` 崩潰。
2. **單一物件不支援**：此函式強行假設回傳值必定為 JSON 陣列。若 AI 因為格式跑掉，回傳了單一 JSON 物件（以 `{` 開頭、`}` 結尾），則 `start` 和 `end` 將為 `-1`，函式會直接返回原字串。如果原字串包含 Markdown 標記，雖然已被 replace 掉，但若有其他說明文字，將導致 JSON 解析失敗。

#### 🛡️ 安全性評估
1. **ReDoS 風險**：正則表達式 `/,(\s*[\]}])/g` 用於清除 trailing commas。由於 `\s*` 的匹配是線性的且無過度巢狀的重複量詞（如 `(\s*)*`），因此對 ReDoS (常規表達式拒絕服務攻擊) 的防禦力足夠，風險極低。
2. **XSS 消毒分工**：此函式僅專注於字串格式修復，不涉及 XSS 消毒。在呼叫端的後續邏輯中，已使用 `DOMPurify.sanitize()` 對解析後的 `question`、`options`、`answer`、`hint` 與 `explanation` 進行了嚴格的消毒處理。因此，在此處沒有 XSS 漏洞，分工正確。
3. **無 Try-Catch 保護**：此函式內部沒有包裹 `try-catch`。如果 `clean.substring` 出現非預期錯誤，會直接向外拋出。目前主要依賴呼叫端 `generateQuestionsFromPDF` 中的 try-catch 來防止應用程式崩潰，但做為一個基礎工具函式，其防禦性仍有待加強。

---

## 2. `getLocalStudySessions` (`services/analytics.ts`)

### 2.1 程式碼定義與實作
```typescript
export const getLocalStudySessions = (): LocalStudySession[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STUDY_SESSIONS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};
```

### 2.2 引用情況分析
經由全專案 `grep_search` 掃描，其引用分佈如下：
- **定義位置**：`services/analytics.ts` (第 189 行)
- **內部引用**：在 `services/analytics.ts` 內部有 3 處引用：
  - 第 159 行，於 `recordLocalStudySession` 中取得現有歷程。
  - 第 202 行，於 `getLocalStudyStats` 中用以計算統計數據（答題數、正確率、時間等）。
  - 第 231 行，於 `getLocalDailyStats` 中用以過濾最近 7 天資料並產出圖表數據。
- **外部引用**：無。沒有任何其他模組導入或使用此函式。
- **重構狀態**：已在死碼清理計畫中被列為「取消 export」對象。

### 2.3 審計與安全性評估

#### ⚠️ 實作缺陷：缺少執行期型別防禦 (Lack of Runtime Type Guard)
此函式雖然在 TypeScript 中宣告返回 `LocalStudySession[]`，但實作中直接回傳 `JSON.parse(data)`。
1. **任意資料注入風險**：`JSON.parse` 在執行期回傳 `any`。若使用者在瀏覽器主控台 (Console) 惡意修改 `localStorage` 中 `mindspark_study_sessions` 的值為其他非陣列結構（例如：`{"key": "value"}`），或者陣列內物件缺少 `questionsAnswered` 或 `sessionDate` 等必要屬性，此函式仍會直接回傳該物件。
2. **連鎖崩潰風險**：當該損毀或遭篡改的資料被傳遞給 `recordLocalStudySession` 呼叫 `sessions.findIndex(...)`，或是被 `getLocalStudyStats` 呼叫 `sessions.reduce(...)` 時，由於 `sessions` 不是陣列或缺少對應方法，會直接引發執行期錯誤（Runtime error: `sessions.reduce is not a function`），進而導致整張統計卡片或甚至是整個 Dashboard 元件崩潰白屏。

#### 🛡️ 安全性評估
1. **防禦性設計不足**：雖然有 `try-catch` 包裹 `JSON.parse`，但這只能防止非法的 JSON 語法字串。如果字串是合法的 JSON 語法，但結構與型別不符，`JSON.parse` 不會拋出錯誤，`catch` 區塊就不會被執行。
2. **DOM-based XSS 隱患**：若 `localStorage` 中的 `sessionDate` 被人手動改寫為 XSS 載荷（例如 `"<script>alert(1)</script>"` 或 `javascript:alert(1)`），且該值在前端圖表或列表渲染時未經過妥善的字串轉義或消毒，將有潛在的 XSS 注入風險（雖然在主流圖表套件中通常會將其當作純文字渲染，但這仍是一個需要留意的邊界）。
3. **建議改進方案**：實作簡單的型別驗證機制（如使用 `Array.isArray` 與欄位檢查），確保回傳的資料格式完全正確。例如：
   ```typescript
   const parsed = JSON.parse(data);
   if (!Array.isArray(parsed)) return [];
   return parsed.filter((item): item is LocalStudySession => 
     item && 
     typeof item === 'object' && 
     typeof item.sessionDate === 'string' &&
     typeof item.questionsAnswered === 'number' &&
     typeof item.correctCount === 'number' &&
     typeof item.sessionDuration === 'number'
   );
   ```

---

## 3. `isCloudEnabled` (`services/supabase.ts`)

### 3.1 程式碼定義與實作
```typescript
export const isCloudEnabled = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '');
};
```

### 3.2 引用情況分析
經由全專案 `grep_search` 掃描，其引用分佈如下：
- **定義位置**：`services/supabase.ts` (第 7 行)
- **內部引用**：`services/supabase.ts` (第 11 行)，在模組載入時檢查是否輸出警示日誌：
  ```typescript
  if (!isCloudEnabled()) {
    console.warn('Supabase configuration is incomplete. Cloud features (sync, social) will be unavailable.');
  }
  ```
- **外部引用**：無。沒有任何其他模組導入或使用此函式。
- **重構狀態**：已在死碼清理計畫中被列為「取消 export」對象。

### 3.3 審計與安全性評估

#### ⚠️ 實作缺陷：環境變數驗證過於寬鬆
該函式僅檢查變數是否存在且不為空字串，沒有對內容進行任何有效性校驗：
1. **格式未驗證**：如果使用者在 `.env` 中設定了無效的 URL 或是格式錯誤的 Key（例如 `VITE_SUPABASE_URL=invalid_string`），`isCloudEnabled` 依然會回傳 `true`。這將導致 Supabase 在嘗試呼叫 API 時拋出網路錯誤或連線失敗，無法提早發出警告。
2. **副作用耦合**：`services/supabase.ts` 模組在載入時（執行環境初始化）就會執行 `isCloudEnabled()` 檢查並印出 `console.warn`。在生產環境中，即使我們不打算使用雲端功能，此警告也會常駐，這通常不是非常優雅的設計。

#### 🛡️ 安全性評估
1. **防崩潰設計**：雖然環境變數可能不完整，但實作中在 `createClient` 呼叫時使用了 fallback placeholder：
   ```typescript
   export const supabase = createClient(
     supabaseUrl || 'https://placeholder-project.supabase.co', 
     supabaseAnonKey || 'placeholder-key'
   );
   ```
   這種防守性寫法極佳，能確保在使用者尚未設定好 `.env` 時，應用程式不會在載入期就因為 `createClient` 參數為空而發生災難性崩潰，保護了應用的生命週期。
2. **洩漏風險**：由於 `isCloudEnabled` 只是一個無參數且返回 boolean 的單純邏輯判斷，不會向外洩漏實際的 URL 或 Key，因此此函式本身無安全外洩風險。
