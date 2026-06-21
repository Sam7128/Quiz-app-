# Deep Probing Questions Bank

> Use this question bank during Phase 4 (DEEP STRESS TEST).
>
> **IMPORTANT**: Questions are tagged by minimum change scale. The AI MUST auto-detect the change scale using the rules below, then apply questions at the appropriate depth.

---

## Change Scale Detection Rules

Analyze the plan artifacts and classify the change into one of three scales:

| Scale | Tag | Criteria | Question Scope |
|-------|-----|----------|----------------|
| **Small** | `[S]` | ≤3 files modified, single module, no API/schema changes, no new dependencies | 🔴 CRITICAL questions only (~30 questions) |
| **Medium** | `[M]` | 4–10 files, 2–4 modules, minor API changes, ≤2 new dependencies | 🔴 CRITICAL + `[M]` questions (~65 questions) |
| **Large** | `[L]` | >10 files, 5+ modules, breaking API changes, new services, schema migrations, or architectural shifts | ALL questions (~110 questions) |

**Detection heuristic** (evaluate in order):
1. Count modules/components touched in `design.md` → if ≥5, classify as **Large**
2. Check for schema migrations, new services, or breaking API changes in `proposal.md` → if any, classify as **Large**
3. Count files mentioned in `tasks.md` → if >10, **Large**; if 4–10, **Medium**; if ≤3, **Small**
4. Check for new external dependencies → if >2, bump one level up
5. When ambiguous, **always classify UP** (prefer more thorough analysis)

> After classification, state: `📏 Change Scale: [S/M/L] — Rationale: [one-line reason]`

---

## D1: 需求完整性 (Requirement Completeness)

1. 🔴 計畫中是否有任何「未定義行為」？即：當輸入或狀態超出預期範圍時，系統應如何反應？計畫是否明確定義了這些情境？
2. 🔴 所有用戶可見的功能是否都有對應的驗收標準（acceptance criteria）？這些標準是否可測試（testable）？
3. `[M]` 計畫中是否存在使用「應該」、「可能」、「通常」等模糊詞彙的需求？列出每一個並評估其風險。
4. `[L]` 如果將計畫交給兩個獨立團隊實作，他們是否會產出相同行為的系統？差異會出現在哪裡？
5. `[M]` 計畫是否定義了所有錯誤狀態下的用戶體驗？例如：網路中斷、服務不可用、資料損壞時，用戶看到什麼？
6. `[L]` 是否有隱含的需求沒有被寫出來？例如：排序規則、分頁行為、空狀態處理、國際化需求？
7. `[L]` 計畫中提到的每個「限制」或「約束」是否有對應的驗證機制？誰負責強制執行這些約束？
8. 🔴 如果用戶在操作進行到一半時中斷（斷電、關閉瀏覽器、網路斷線），系統重啟後應處於什麼狀態？計畫有定義嗎？
9. `[M]` 計畫是否涵蓋了「第一次使用」和「重複使用」兩種場景？初始化流程和穩態流程是否都被定義了？
10. `[L]` 需求之間是否有優先級衝突？當兩個需求不能同時滿足時，計畫是否定義了取捨規則？

---

## D2: 設計一致性 (Design Consistency)

1. 🔴 proposal.md 中承諾的每個功能是否都在 design.md 中有對應的架構元件？列出任何缺失的映射。
2. 🔴 design.md 中的每個元件是否都在 tasks.md 中有對應的實作任務？列出任何「設計了但沒有任務」或「有任務但沒有設計」的項目。
3. `[M]` proposal.md 中使用的術語是否與 design.md 和 tasks.md 完全一致？是否有同一概念在不同文件中使用了不同名稱？
4. `[M]` design.md 中定義的資料流是否與 proposal.md 描述的用戶流程一致？每個用戶動作是否都能追蹤到一個完整的資料流路徑？
5. `[M]` tasks.md 中的任務順序是否反映了 design.md 中元件之間的依賴關係？是否有任務的前置條件在排程中尚未完成？
6. `[L]` 如果 design.md 中使用了分層架構，每一層的職責邊界是否清晰？是否有跨層調用繞過了中間層？
7. `[L]` proposal.md 中提到的非功能性需求（效能、安全、可用性）是否在 design.md 中有明確的實現策略？
8. 🔴 三份文件中是否有直接矛盾的描述？例如：proposal 說「同步」但 design 說「非同步」？
9. `[M]` design.md 中的錯誤處理策略是否與 proposal.md 中承諾的用戶體驗一致？
10. `[L]` 如果 specs/ 目錄存在，delta-spec 與主規格是否有衝突？

---

## D3: 邊界條件與極端輸入 (Boundary Conditions & Extreme Inputs)

1. 🔴 每個接受用戶輸入的介面，其最小值、最大值、空值的行為是否被定義？
2. `[M]` 對於字串輸入：空字串、僅空白字串、超長字串（10KB+）、包含特殊字符（Unicode、emoji、控制字符、null byte）的處理方式是什麼？
3. `[M]` 對於數值輸入：零、負數、MAX_INT、MIN_INT、NaN、Infinity 的處理方式是什麼？
4. `[L]` 對於集合/陣列：空集合、單元素、超大集合（100K+ 元素）的行為是什麼？是否有分頁或流式處理？
5. `[L]` 對於時間相關邏輯：跨時區、夏令時切換、閏秒、系統時鐘回撥的影響是什麼？
6. 🔴 對於並行請求：如果 1000 個用戶同時提交相同操作，每個請求都會成功嗎？結果是否具有確定性？
7. `[L]` 對於檔案操作：零長度檔案、超大檔案（1GB+）、權限不足、磁碟空間用盡的處理方式是什麼？
8. `[M]` 如果所有可選參數都被省略，系統的行為是什麼？如果所有可選參數都被提供呢？
9. `[M]` 計畫中的每個「列表」或「表格」在沒有資料時如何呈現？空狀態是否有專門設計？
10. `[L]` 對於分頁：第一頁、最後一頁、超出範圍的頁碼、每頁數量為 0 或負數的行為是什麼？

---

## D4: 併發與競態條件 (Concurrency & Race Conditions)

1. 🔴 計畫中是否有任何「讀取-修改-寫入」（read-modify-write）模式？這些操作是否是原子的？如果不是，兩個並行操作會產生什麼結果？
2. 🔴 如果兩個用戶同時修改同一資源，衝突解決策略是什麼？Last-write-wins？樂觀鎖？悲觀鎖？計畫是否明確定義了？
3. `[M]` 是否有任何操作依賴於「先檢查再執行」（check-then-act）模式？在檢查和執行之間，狀態是否可能改變？
4. `[M]` 計畫中的快取策略是否考慮了快取一致性？當底層資料改變時，快取何時失效？是否可能讀到過期資料？
5. `[L]` 如果系統使用了佇列或訊息傳遞，訊息是否保證有序？重複訊息如何處理？訊息丟失如何檢測？
6. `[M]` 計畫中是否有任何長時間運行的操作？如果在操作中途系統重啟，操作是否可以安全地重試（idempotent）？
7. `[L]` 如果計畫涉及分散式系統，是否考慮了網路分區（network partition）？CAP 定理的取捨是什麼？
8. `[L]` 是否有任何全域狀態（global state）或單例模式（singleton）？這些在高併發下是否會成為瓶頸？
9. `[L]` 定時器或排程任務在多個實例同時運行時，是否會重複執行？是否有分散式鎖機制？
10. 🔴 資料庫事務的隔離級別是什麼？是否可能出現幻讀（phantom read）或不可重複讀？

---

## D5: 錯誤處理與故障恢復 (Error Handling & Fault Recovery)

1. 🔴 計畫中的每個外部依賴（API、資料庫、檔案系統、第三方服務）都有失敗處理策略嗎？列出每個依賴及其降級方案。
2. `[M]` 錯誤是否會被靜默吞噬（silently swallowed）？每個 catch/except 塊是否都有明確的處理邏輯，而非僅僅記錄日誌？
3. 🔴 是否定義了重試策略？重試次數、退避演算法（exponential backoff）、重試上限是什麼？重試風暴（retry storm）如何預防？
4. `[M]` 部分失敗（partial failure）如何處理？例如：批次操作中 3/10 項成功，其餘失敗。系統是全部回滾還是保留成功的部分？
5. `[L]` 是否有熔斷機制（circuit breaker）？當下游服務持續失敗時，系統是否會停止發送請求以防止級聯故障？
6. `[M]` 錯誤訊息是否對用戶有意義？是否洩漏了內部實現細節（堆疊追蹤、SQL 查詢、內部 ID）？
7. `[L]` 如果系統進入了「不一致狀態」，是否有自我修復機制？還是需要人工介入？
8. `[L]` 資料遷移或 schema 變更失敗時的回滾計畫是什麼？是否經過測試？
9. `[L]` 是否有「死信佇列」（dead letter queue）或等效機制來捕獲無法處理的請求？
10. `[M]` 系統是否能區分「暫時性故障」和「永久性故障」？對兩者的處理策略是否不同？

---

## D6: 安全攻擊面分析 (Security Attack Surface)

1. 🔴 所有用戶輸入是否都經過驗證和消毒（sanitization）？是否有任何輸入直接用於 SQL 查詢、命令執行、檔案路徑、HTML 渲染？
2. 🔴 認證和授權模型是什麼？是否有任何 API 端點可以在未認證的情況下存取？是否有任何操作缺少授權檢查？
3. `[M]` 敏感資料（密碼、API 金鑰、PII）如何存儲？是否加密？金鑰如何管理？是否可能通過日誌或錯誤訊息洩漏？
4. `[M]` 如果攻擊者能控制任何一個輸入參數的長度和內容，最壞情況下能造成什麼損害？（考慮 injection、overflow、DoS）
5. `[L]` 是否有 CSRF/XSS/SSRF 防護？前端是否使用了 CSP？API 是否驗證了 Origin/Referer？
6. `[M]` 速率限制（rate limiting）策略是什麼？是否可以通過大量請求耗盡系統資源？限制是基於 IP、用戶、還是 API key？
7. `[L]` 資料在傳輸中是否加密（TLS）？是否使用了最新的 TLS 版本？是否禁用了弱密碼套件？
8. 🔴 是否有任何「管理員」或「超級用戶」功能？這些功能的存取控制是否與普通用戶分離？
9. `[L]` 第三方依賴的安全狀態如何？是否有已知漏洞？依賴更新策略是什麼？
10. `[M]` 如果攻擊者獲得了一個普通用戶的憑證，他能水平提權（存取其他用戶資料）嗎？能垂直提權（獲得管理員權限）嗎？

---

## D7: 狀態管理與資料完整性 (State Management & Data Integrity)

1. 🔴 系統中有哪些狀態？每個狀態存儲在哪裡（記憶體、資料庫、快取、本地檔案、Session）？狀態丟失的影響是什麼？
2. `[M]` 狀態轉換是否有明確的狀態機定義？是否有「不合法的狀態轉換」會導致系統進入無效狀態？
3. 🔴 如果系統在狀態轉換的中途崩潰，資料是否處於一致狀態？是否有事務保護？
4. `[L]` 計畫中是否有資料需要跨多個存儲同步？同步失敗時如何處理？是否有最終一致性（eventual consistency）的延遲窗口？
5. `[L]` 是否有資料備份和恢復策略？RPO（Recovery Point Objective）和 RTO（Recovery Time Objective）是什麼？
6. `[M]` 資料刪除是軟刪除還是硬刪除？是否需要遵守資料保留政策或 GDPR 等法規？
7. `[L]` 如果兩個元件對同一資料有不同的「真相來源」（source of truth），衝突如何解決？
8. `[M]` 是否有審計追蹤（audit trail）？誰在什麼時候做了什麼修改，是否可追溯？
9. `[L]` 資料驗證是在入口處執行一次，還是在每個處理階段都驗證？如果入口驗證被繞過，下游是否會崩潰？
10. `[M]` 計畫是否考慮了資料增長？隨著資料量從 1K 增長到 1M 到 1B 記錄，查詢效能和存儲成本如何變化？

---

## D8: 可觀測性盲點 (Observability Blind Spots)

1. 🔴 計畫是否定義了關鍵業務指標（KPIs）和技術指標（metrics）？運維團隊如何知道系統是否「健康」？
2. `[M]` 日誌策略是什麼？哪些事件必須記錄？日誌級別如何劃分？是否有結構化日誌（structured logging）？
3. `[L]` 是否有分散式追蹤（distributed tracing）？跨服務的請求是否可以通過 trace ID 追蹤完整鏈路？
4. `[M]` 告警規則是什麼？什麼條件觸發告警？告警是否有分級（critical/warning/info）？是否有告警疲勞風險？
5. `[M]` 如果系統出現效能退化，運維團隊能在多長時間內發現？發現後能定位到哪個模組？
6. `[L]` 是否有健康檢查端點（health check endpoint）？它檢查的範圍是什麼？是否包含了所有關鍵依賴的連通性？
7. `[L]` 📊 計畫是否需要儀表板（dashboard）？如果需要，哪些指標最關鍵？
8. `[M]` 錯誤率突然升高時，日誌中是否有足夠的上下文來重現問題？還是只有一個 "Error occurred" 訊息？
9. `[L]` 批次處理或非同步任務的進度如何監控？如果任務卡住了，如何檢測？
10. `[L]` 是否有容量規劃的資料收集？隨著使用量增長，何時需要擴展？基於什麼指標決定？

---

## D9: 可維護性與技術債 (Maintainability & Technical Debt)

1. 🔴 計畫引入的新元件是否遵循了專案現有的架構模式和程式碼風格？還是引入了一種新的、不一致的模式？
2. `[M]` 計畫中是否有「臨時解決方案」或「之後再處理」的標記？這些技術債是否有追蹤和清理計畫？
3. `[M]` 新增的模組是否有清晰的 API 邊界？其他開發者能否在不理解內部實現的情況下使用它？
4. `[M]` 計畫的可測試性如何？新增的邏輯是否容易編寫單元測試？是否有過度耦合使測試困難？
5. `[L]` 如果 6 個月後需要修改這個功能，開發者需要理解多少上下文才能安全地進行修改？
6. `[L]` 計畫是否增加了建構時間或部署時間？是否引入了新的建構步驟或依賴？
7. `[L]` 配置是否外部化？是否需要修改程式碼才能改變行為？是否有特性開關（feature flag）？
8. `[L]` 計畫是否產生了重複的程式碼？是否有機會抽取為共用元件或工具函數？
9. `[M]` 文件是否充足？新開發者能否僅通過閱讀文件理解這個變更的目的和運作方式？
10. `[L]` 計畫是否引入了新的外部依賴？這些依賴的維護狀態、授權協議、社區活躍度如何？

---

## D10: 隱式假設與環境依賴 (Implicit Assumptions & Environment Dependencies)

1. 🔴 計畫假設了哪些關於運行環境的條件？列出所有假設（OS、runtime 版本、可用記憶體、網路連接、檔案系統權限等）。
2. 🔴 如果這些假設不成立會怎樣？系統是否會清楚地報錯，還是會產生難以調試的隱藏故障？
3. `[M]` 計畫是否假設了特定的部署拓撲（單機、叢集、容器、Serverless）？如果拓撲變更，哪些部分需要修改？
4. `[M]` 是否假設了特定的資料格式或編碼（UTF-8、JSON、特定的日期格式）？如果收到不符合假設的資料會怎樣？
5. `[L]` 計畫是否依賴於環境變數或配置檔案？這些配置在所有環境（開發、測試、生產）中是否一致？
6. `[L]` 是否假設了網路延遲在某個範圍內？如果延遲突然增加 10 倍會怎樣？
7. `[L]` 計畫是否假設了時鐘同步？如果節點之間的時鐘偏差超過 1 秒會影響邏輯嗎？
8. `[L]` 是否有對第三方服務的 SLA 假設？如果第三方服務的回應時間從 100ms 退化到 5s 會怎樣？
9. `[L]` 計畫是否假設了磁碟 I/O 效能？如果運行在網路存儲（NFS/EBS）而非本地 SSD 上會怎樣？
10. `[L]` 是否假設了特定的資料庫行為（如特定的排序規則 collation、特定的隔離級別）？更換資料庫引擎是否會破壞邏輯？

---

## D11: 向後相容性與遷移風險 (Backward Compatibility & Migration Risk)

1. 🔴 這個變更是否會破壞現有的 API 合約？現有的客戶端是否需要修改？
2. 🔴 如果涉及資料庫 schema 變更，遷移腳本是否支持回滾？遷移過程中系統是否仍可服務？
3. `[M]` 是否有現有的資料需要遷移？資料量有多大？遷移的預估時間是多少？遷移失敗的回滾策略是什麼？
4. `[L]` 新版本是否能與舊版本共存？滾動更新期間，新舊版本同時運行是否會導致問題？
5. `[L]` 是否有外部系統（webhook、第三方整合）依賴於即將改變的介面？是否已通知這些依賴方？
6. `[M]` 配置檔案格式是否變更？舊的配置檔案是否仍然有效？
7. `[L]` 是否有已棄用（deprecated）的功能計畫在此次變更中移除？是否有用戶仍在使用？
8. 🔴 如果這個變更部署失敗，能否安全地回滾到上一個版本？回滾是否會導致資料丟失？
9. `[M]` 變更是否影響了快取結構？部署後是否需要清除快取？快取冷啟動對效能的影響是什麼？
10. `[L]` 是否需要特性開關（feature flag）來控制新功能的啟用，以便逐步灰度發布？
