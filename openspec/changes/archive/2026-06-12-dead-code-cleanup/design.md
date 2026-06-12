## Context

MindSpark Quiz App 經歷了多輪功能開發與重構（戰鬥系統重構、分階段練習、AI 整合優化、安全審計等），累積了約 40+ 項冗餘代碼。`knip v6.16.1` 掃描報告已識別所有目標，且經過逐項人工驗證確認了真偽。

**現況問題**：
- 8 個元件同時存在 named export 和 default export（專案統一使用 named export）
- `classnames` 依賴已安裝但未使用，PostCSS 工具鏈已被 `@tailwindcss/vite` 取代
- 多個 constants/services 檔案中的函式、型別只在內部使用卻標記了 `export`
- 殘留的廢棄函式（如 `getMonsterByProgress`、`clearAIConfig`）增加了理解負擔

**約束條件**：
- 必須保持 `npm run build` 和 `npm test` 全部通過
- 不得變更任何面向用戶的功能行為
- 必須保留防禦性預備代碼（cloudStorage.ts 的重試函式）

## Goals / Non-Goals

**Goals:**
- 移除所有經驗證的死碼（函式、型別、檔案、依賴）
- 統一匯出風格（全部使用 named export）
- 收窄不必要的 `export` 作用域以減少 API 表面積
- 零功能回歸：通過構建和測試驗證

**Non-Goals:**
- 不重構任何業務邏輯或架構
- 不修改 cloudStorage.ts 的防禦性預備代碼
- 不升級或替換任何依賴版本
- 不修改測試本身（只驗證測試仍然通過）

## Decisions

### Decision 1: 取消 export vs 刪除函式的策略

**選擇**：對仍在檔案內部使用的符號（如 `cleanJsonResponse`、`getLocalStudySessions`、`isCloudEnabled` 等），只取消 `export` 關鍵字，不刪除函式本體。

**原因**：深度驗證發現報告中 5 項被標記為「可安全清理」的函式/型別，實際上仍在定義檔案內部被使用。直接刪除會導致編譯錯誤。取消 `export` 既能縮小 API 表面積，又不破壞內部功能。

**替代方案**：將內部使用改為 inline 邏輯後再刪除 → 風險太高、變更範圍過大，不符合純清理目標。

### Decision 2: 分階段執行順序

**選擇**：按照以下安全執行順序操作：
1. **Phase 1: 型別與介面**（風險最低）→ 取消 export、刪除未用型別
2. **Phase 2: Export 收窄**（中低風險）→ 取消 constants/services 的多餘 export
3. **Phase 3: 死碼函式刪除**（中風險）→ 物理刪除廢棄函式
4. **Phase 4: 重複匯出清理**（低風險）→ 移除 export default
5. **Phase 5: 依賴清理**（中風險）→ npm uninstall + overrides 清理
6. **Phase 6: 檔案清理**（低風險）→ 刪除範例檔案

**原因**：類型優先（TypeScript 編譯器即時反饋）、依賴最後（影響最大、需要完整構建驗證）。每個 Phase 完成後立即用 `npx tsc --noEmit` 驗證。

### Decision 3: `@testing-library/jest-dom` 的清理

**選擇**：移除 `@testing-library/jest-dom`。

**原因**：全域搜索確認專案中沒有任何 `import` 或 `require` 引用此套件。專案使用 Vitest + jsdom，不依賴 jest-dom 的斷言擴充。報告中建議「保留」是基於推測，但驗證結果表明可安全移除。

### Decision 4: postcss overrides 的保留

**選擇**：保留 `package.json` 的 `overrides` 區段中的 `"postcss": "^8.5.10"` 條目。

**原因**：雖然移除了直屬開發依賴中的 `postcss`，但專案間接依賴（如 `vite`、Tailwind 相關套件）內部仍可能引進舊版帶有安全漏洞的 `postcss`（如 CVE-2023-44270）。保留此 override 能確保整個依賴樹強制限用安全版本 (>= 8.5.10)。

### Decision 5: MistakeLogEntry 的處理

**選擇**：將 `MistakeLogEntry` 從 `export` 改為內部型別（取消 export）。

**原因**：報告判定其為「可安全清理」（刪除），但驗證發現它在 `types.ts` 第 24 行被 `MistakeLog` 的 index signature `[questionId: string]: MistakeLogEntry` 使用。`MistakeLog` 又被外部引用，因此 `MistakeLogEntry` 必須保留定義，只能取消 `export`。

### Decision 6: Named Export 的 React.memo 包裝與主動 Import 移轉

**選擇**：
1. 對需要移除 `export default React.memo(...)` 的 4 個關鍵元件（`QuizCard`、`BankManager`、`Settings`、`AIPromptGuide`），將其 named export 直接改寫為經 `React.memo` 封裝後的元件。
2. 在 Phase 4 重複匯出清理時，主動更新引用端（如將 default import 改為 named import），避免依賴編譯器報錯來進行 Reactive 修復。

**原因**：
1. 確保外部引用 Named Export 時仍能享有 `React.memo` 的效能優化，避免 UI 無謂重繪導致 FPS 下降與卡頓。
2. 主動移轉 import 可以確保重構的原子性與 CI 建置管線的順暢。

## Risks / Trade-offs

### 風險 1: 動態引用遺漏
- **Risk**: 存在 dynamic `import()` 或字串反射引用被清理的符號
- **Mitigation**: 已用 `grep` 全域搜索確認無動態引用；Git 備份可快速回滾

### 風險 2: 依賴間接使用與鎖定檔計算
- **Risk**: `autoprefixer`/`postcss` 可能被 Tailwind/Vite 間接依賴，且 `package-lock.json` 重建可能引入其他間接依賴的無意更新。
- **Mitigation**: 專案使用 `@tailwindcss/vite` 插件；保留 `overrides` 中的 `postcss` 鎖定安全版本；在 Phase 5 清理後，嚴格比對 `package-lock.json` 的 Git Diff，確保只有目標依賴被移除，無核心套件被意外變更。

### 風險 3: `SKILL_THRESHOLDS` 常數取消 export 的影響
- **Risk**: `SKILL_THRESHOLDS` 是一個帶有值的常數（不只是型別），取消 export 可能影響 tree-shaking
- **Mitigation**: 已驗證無外部 import，且 TypeScript 編譯會即時報錯

### 風險 4: 測試中的隱性依賴
- **Risk**: 測試可能透過 side-effect import 使用被清理的符號
- **Mitigation**: `npm test` 作為每個 Phase 的必要驗證步驟

### Trade-off: cloudStorage.ts 防禦代碼保留
- `retryDirtyPracticeSessions` 和 `batchSaveCloudSpacedRepetition` 雖無外部調用，但作為同步失敗的防禦性重試機制，保留比清理更安全。日後如確認完全不需要，可在專門的 PR 中移除。
