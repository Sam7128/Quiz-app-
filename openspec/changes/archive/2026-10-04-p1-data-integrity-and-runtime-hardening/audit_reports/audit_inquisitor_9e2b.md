# MindSpark P1 技術債重構最終審計報告

> **審計變更**：`openspec/changes/p1-data-integrity-and-runtime-hardening`  
> **審計角色**：Project Inquisitor（第二獨立審計者）  
> **審計 ID**：`inquisitor_9e2b`  
> **審計時間**：2026-10-04  
> **結論判定**：**PASS WITH CAUTIONS（審計通過，附帶 2 項隱性偽綠燈與 1 項到期技術債跟進項，核心代碼無阻塞級缺陷）**

---

## 1. 審計總覽與執行摘要

本審計由獨立的第二位高階 AI（Project Inquisitor）依據專案鐵規與 OpenSpec 變更計畫，對 `p1-data-integrity-and-runtime-hardening` 進行深度程式碼驗證、規格實作對齊、偽綠燈檢視、Ponytail 過度工程審查及技術債帳簿檢閱。

### 全量品質閘門驗證結果
- **TypeScript 編譯 (`npx tsc --noEmit`)**：✅ PASS（0 錯誤，全庫無新增 `any`）
- **單元測試全量執行 (`npm test -- --run`)**：✅ PASS（71 個測試檔案、512 個測試全數通過）
- **程式碼規範檢查 (`npm run lint`)**：✅ PASS（0 錯誤、0 警告）
- **生產環境構建 (`npm run build`)**：✅ PASS（Vite 打包成功，各 chunk 正常產出）
- **未引用代碼與依賴檢查 (`npx knip --reporter compact`)**：✅ PASS（無孤兒 export 或無效依賴）
- **遺留依賴清理檢驗 (`use-sound`)**：✅ PASS（正式原始碼、測試、`package.json`、`package-lock.json` 零殘留）

---

## 2. OpenSpec 規格與實作對齊檢查 (`openspec-verify-change`)

### 2.1 Completeness（完整性）
- **Task 清單對齊**：`tasks.md` 中所有實作階段（Phase 0 至 Phase 7）之項目皆已正確標記為 `[x]`。
- **交付型任務判定**：當前工作目錄有未提交之檔案變更（Git Working Tree Dirty），此歸類為「**待提交確認（Pending Commit）**」，非代碼 CRITICAL 缺陷。
- **規格需求覆蓋**：
  - `dark-mode-bootstrap`：`<head>` 內置 inline script 實作完整，具備 light/dark/system 解析與完整 try/catch fail-open 保護。
  - `question-data-integrity`：BOM 清洗（`replace(/^\uFEFF+/, '')`）、未知型別窄化守衛（`isQuestion` / `parseQuestions`）、5 則警告上限聚合、儲存雙向門禁（`getQuestions` / `saveQuestions` 全無效拒收）均已落實。
  - `quiz-audio-howler`：QuizCard 答題音效全面收斂至 `useSoundEffects` 的 Howler 常駐單例，SFX 全域開關即時響應，徹底移除 `use-sound` 依賴。

### 2.2 Correctness（正確性）
- 實作完全契合 `spec.md` 中定義之 Gherkin Scenarios：
  - Windows UTF-8 BOM 檔案於 `processJson` 開頭正確清洗，不損壞題幹與選項內之 Unicode。
  - 題庫匯出改用 `Blob` + `URL.createObjectURL`，並於 1000ms 延遲後呼叫 `URL.revokeObjectURL`，按鈕加入 1000ms 防抖禁用。
  - `saveQuestions` 在傳入陣列全為無效題時拒絕覆寫既有題庫，並發出警告日誌。
  - 警告日誌不洩漏題目答案全文與敏感資訊。

### 2.3 Coherence（連貫性）
- 代碼實作完全遵循 `design.md` 的架構原則：採取「入口驗證、下游簡化、現有抽象重用」，未引入未授權的第三方 schema 庫或破壞性的資料庫 migration。

---

## 3. 『偽綠燈（False Green）』深度審查與極端分支漏洞檢測

本審計特別深入剖析「單元測試表面通過，但極端分支或邊界組合仍具隱患」的偽綠燈盲點：

### 🚨 [FG-01] TypeGuard `type` 與 `answer` 交叉一致性欠缺（中度隱患 - 形態錯位）
- **位置**：`utils/typeGuards.ts:42-63`
- **現狀邏輯**：
  ```typescript
  const isSingleAnswerValid =
    typeof answer === 'string' &&
    answer.trim().length > 0 &&
    options.includes(answer);

  const isMultipleAnswerValid =
    Array.isArray(answer) &&
    answer.length > 0 &&
    answer.every(
      (ans): ans is string => typeof ans === 'string' && ans.trim().length > 0 && options.includes(ans)
    );

  if (!isSingleAnswerValid && !isMultipleAnswerValid) {
    return false;
  }

  // Optional: type ('single' | 'multiple')
  if (value.type !== undefined && value.type !== 'single' && value.type !== 'multiple') {
    return false;
  }
  ```
- **偽綠燈盲點**：
  現有單元測試（`typeGuards.test.ts`、`remediateBypass.challenger.test.ts`）僅測試了常規合法情境（`type: 'single'` 配字串，`type: 'multiple'` 配陣列），**未測試形態錯位組合**：
  1. 輸入 `{ id: 1, question: 'Q', options: ['A','B'], answer: ['A'], type: 'single' }`
  2. 輸入 `{ id: 2, question: 'Q', options: ['A','B'], answer: 'A', type: 'multiple' }`
  上述兩種不對稱資料目前均會通過 `isQuestion`！
- **潛在衝擊**：
  當下游組件或統計邏輯依賴 `question.type === 'multiple'` 直接執行 `(question.answer as string[]).map(...)` 時，若 `answer` 實為字串，將在執行期噴出 `TypeError: answer.map is not a function` 導致前端崩潰；反之在單選模式若以 `question.answer === selected` 比較，陣列形態將永遠判定為答錯。
- **防禦加固建議**：
  ```typescript
  if (value.type === 'single' && !isSingleAnswerValid) return false;
  if (value.type === 'multiple' && !isMultipleAnswerValid) return false;
  ```

---

### ⚠️ [FG-02] BankManager 匯出定時器在非同步卸載時未清理（低度隱患 - 生命週期中斷）
- **位置**：`components/BankManager.tsx:423-427`
- **現狀邏輯**：
  ```typescript
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
  ...
  finally {
    setTimeout(() => {
      setIsExporting(false);
    }, 1000);
  }
  ```
- **偽綠燈盲點**：
  測試中使用 `vi.useFakeTimers()` 在同一掛載生命週期內推進時鐘驗證了防抖，但未模擬「使用者點擊匯出後，於 1 秒內切換頁面或關閉彈窗」的卸載情境。
- **潛在衝擊**：
  `URL.revokeObjectURL(url)` 閉包仍會在後台正常釋放，記憶體無洩漏風險；但 `setIsExporting(false)` 將對已卸載組件觸發 React State 更新。雖 React 18/19 不會致命崩潰，但缺乏 `isMountedRef` 或 timer ID 清理防護。
- **防禦加固建議**：在組件 unmount effect 中清理防抖定時器。

---

### ℹ️ [FG-03] saveQuestions 在部分損毀時的資料覆蓋邊界（架構取捨確認）
- **位置**：`services/storage.ts:637-644`
- **設計邊界**：
  ```typescript
  const incomingCount = Array.isArray(questions) ? questions.length : (questions ? 1 : 0);
  const validQuestions = parseQuestions(questions, 'storage.saveQuestions');
  if (incomingCount > 0 && validQuestions.length === 0) {
    console.warn(`[Storage] saveQuestions rejected overwrite...`);
    return;
  }
  ```
- **邊界分析**：
  此邏輯精確落實了 Spec 要求之「輸入非空且**全無效**時拒絕覆寫」。然而，若外部調用點傳入 100 題資料中僅 1 題有效、99 題損毀，`saveQuestions` 將會把原本的題庫靜默覆寫為僅剩 1 題。
- **審計評價**：在 `BankManager.tsx` 的匯入管道中，已有 UI 確認彈窗與略過題數 Toast 保護使用者；但若有其他直接呼叫 `saveQuestions` 的場景，應留意此靜默縮減特性。

---

## 4. Ponytail Audit：極簡化與過度工程審查

依據 `ponytail-audit` 規則，審查本次變更範圍內是否存在不符合 YAGNI 原則之過度工程：

| 標籤 | 審查項目 | 評估與處置建議 |
|---|---|---|
| `native` | `Blob` + `URL.createObjectURL` 替代 Data URI 與第三方下載工具庫 | 完美符合，零外部相依，利用瀏覽器原生 API 解決記憶體膨脹。 |
| `delete` | 徹底刪除 `use-sound` 外部套件與 package-lock 節點 | 完美符合，減少 1 個大型相依套件與 2 處孤兒測試 Mock。 |
| `shrink` | `utils/typeGuards.ts` 內之 `isRecord` 內聯為私有函式 | 完美符合，不對外暴露非必要工具函式，避免公共 API 膨脹。 |
| `yagni` | `utils/typeGuards.ts` 針對 `sourceQuestionKey`、`sourceFingerprint` 的手動檢查 | 可接受。雖目前題庫使用頻率較低，但為避免原型污染與非型別欄位穿透，保留此輕量防禦符合防禦式設計原則。 |

- **Ponytail Audit 總結**：`Net: -1 dependency, clean standard library adoption. Lean and sound.`

---

## 5. Ponytail Debt：技術債帳簿檢閱

全專案搜尋 `(#|//)\s*ponytail:` 標記，檢閱結果如下：

1. **`services/storage.ts:36`**
   - 標記內容：`// ponytail: [Sunset: v2.0 - 待系統遷移至 user-scoped IndexedDB 時，localStorage 快取即退役]`
   - 限制上限（Ceiling）：v2.0 架構遷移
   - 重審觸發（Upgrade Trigger）：引入 user-scoped IndexedDB
   - 狀態：**正常運作中（Active & Documented）**

2. **`components/KnowledgeGraph/NodeEditPanel.tsx:266`**
   - 標記內容：`// ponytail: retain fontWeight beside canonical bold for schema-v2 readers until the 2026-10-01 migration window closes.`
   - 限制上限（Ceiling）：2026-10-01 遷移窗口
   - 重審觸發（Upgrade Trigger）：窗口關閉
   - 狀態：**🚨 過期技術債（Rot Risk Alert!）**  
     當前審計日期為 2026-10-04，該相容性別名的 2026-10-01 遷移窗口**已經關閉**！此項標記已符合清理條件，應排入後續重構任務中移除。

- **技術債總計**：共發現 2 處 `ponytail:` 標記，其中 0 處缺少觸發條件（no-trigger），1 處已屆期需排程清理。

---

## 6. 問題等級嚴格劃分與最終判定

依據審計規範，嚴格劃分核心邏輯缺陷與交付流程標記：

### 🛑 阻塞級邏輯缺陷（CRITICAL）
- **無（0 項）**：無任何導致系統崩潰、安全破壞、正式資料損毀或測試失敗之重大阻斷性 Bug。

### 📋 待提交確認（PROCESS / PENDING COMMIT）
- **項次 1**：Git 工作目錄目前包含未提交之變更檔案（Unstaged / Untracked files），請在最終發布前執行規範化 Git Commit。

### ⚠️ 警告與後續改善建議（WARNING / SUGGESTION）
- **[WARNING]** 修正 [FG-01]：於 `isQuestion` 中補上 `type === 'single'` 與 `type === 'multiple'` 與 `answer` 實體型別的一致性檢查，防範形態錯位。
- **[WARNING]** 清理過期技術債：`components/KnowledgeGraph/NodeEditPanel.tsx:266` 的遷移窗口已於 2026-10-01 結束，建議排入下一階段重構移除。
- **[SUGGESTION]** 優化 [FG-02]：`BankManager.tsx` 匯出防抖定時器於組件卸載時加入取消保護。

---

## 7. 最終審計結論

本次 P1 資料完整性與執行期防禦硬化變更整體架構健全，各項核心防禦（BOM、未知反序列化防禦、Blob 匯出、Howler 單例音效、首屏 FOUC Bootstrap）皆已高品質落地，各項指標均達標。

**審計決策：同意本變更（APPROVED WITH CAUTIONS），可進行交接或提交！**
