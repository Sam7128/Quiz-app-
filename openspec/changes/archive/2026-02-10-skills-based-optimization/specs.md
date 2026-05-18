# Skills-Based Optimization - Specifications

## Functional Requirements

### FR-1: AI Prompt 優化
| ID | 需求 | 優先級 |
|----|------|--------|
| FR-1.1 | Prompt 須包含明確的 JSON Schema 定義 | P0 |
| FR-1.2 | Prompt 須包含 2-3 個 Few-Shot 範例 | P0 |
| FR-1.3 | JSON 解析須具備 Markdown 清理邏輯 | P0 |
| FR-1.4 | 解析失敗時須提供有意義的錯誤訊息 | P1 |

### FR-2: React 效能
| ID | 需求 | 優先級 |
|----|------|--------|
| FR-2.1 | `useEffect` 依賴陣列須正確配置 | P0 |
| FR-2.2 | 可 memo 的元件須使用 `React.memo` | P1 |
| FR-2.3 | 穩定的 callback 須使用 `useCallback` | P1 |
| FR-2.4 | 昂貴計算須使用 `useMemo` | P2 |

### FR-3: 戰鬥系統
| ID | 需求 | 優先級 |
|----|------|--------|
| FR-3.1 | 須建立狀態遷移 Mermaid 文檔 | P1 |
| FR-3.2 | DEV 模式須輸出狀態變化日誌 | P1 |
| FR-3.3 | 技能觸發點須符合 [5,10,20,30,40,50] | P0 |
| FR-3.4 | 須有基礎單元測試覆蓋 | P1 |

### FR-4: E2E 測試 (可選)
| ID | 需求 | 優先級 |
|----|------|--------|
| FR-4.1 | Quiz 完整流程須有 E2E 測試 | P2 |
| FR-4.2 | JSON 匯入成功/失敗須有 E2E 測試 | P2 |

### FR-5: 安全審計
| ID | 需求 | 優先級 |
|----|------|--------|
| FR-5.1 | 須通過 `npm audit` 無 high/critical | P0 |
| FR-5.2 | 須完成 OWASP Top 10 對照檢查 | P0 |
| FR-5.3 | 不可使用 `dangerouslySetInnerHTML` 於未消毒內容 | P0 |
| FR-5.4 | CSP meta 標籤須正確配置 | P1 |
| FR-5.5 | 須通過 ESLint Security 規則檢查 | P1 |

## Non-Functional Requirements

### NFR-1: 效能
- Dashboard 首次渲染 < 100ms
- Quiz 切題動畫無明顯卡頓

### NFR-2: 可維護性
- 新增的程式碼須有 JSDoc 註解
- 測試覆蓋率增加量須 > 0%

### NFR-3: 相容性
- 支援現有 localStorage 資料格式 (無破壞性變更)
- 維持 TypeScript strict mode 相容

## Constraints

1. **無後端 API** - 所有資料操作限於 localStorage
2. **無外部 CDN** - 已遷移至 Tailwind v4 本地整合
3. **TypeScript Strict** - 禁止 `any` type
4. **React 18** - 須遵循 Suspense 邊界規範
