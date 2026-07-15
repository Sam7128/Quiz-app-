# Spec: Graph Cloud Storage

## Purpose
Define authenticated cloud persistence, conflict handling, retry behavior, and safe external image references for knowledge graphs.

### Requirement: Supabase knowledge graph sync
登入使用者 SHALL 能夠將知識圖資料同步至 Supabase 雲端，實現跨裝置存取。

#### Scenario: 登入後自動同步
- **GIVEN** 使用者已登入 Supabase
- **WHEN** 使用者進入知識圖工作區
- **THEN** 系統 SHALL 自動比對本地與雲端的知識圖資料
- **AND** 使用 LWW（Last-Write-Wins）策略解決衝突（以 `updatedAt` 為裁決依據）

#### Scenario: 同步衝突另存新檔防護
- **GIVEN** 本地與雲端的最後更新時間不同且雙端皆有修改
- **WHEN** 觸發雲端同步
- **THEN** 系統 SHALL 彈出確認對話框（ConfirmDialog）
- **AND** 允許使用者選擇「另存新圖表」將本地修改另存為「圖表名稱 (衝突副本)」（使用新 UUID 寫入本地與雲端）

#### Scenario: 自動重試同步
- **GIVEN** 使用者之前同步失敗，在 `mindspark_dirty_graphs` 中有 dirty 資料
- **WHEN** 系統偵測到網路從 offline 恢復為 online（監聽 `online` 事件）
- **THEN** 系統 SHALL 自動重新嘗試將 dirty 圖表同步至雲端，無需重新整理網頁

#### Scenario: 儲存自動同步到雲端
- **GIVEN** 使用者已登入且 autosave 觸發
- **WHEN** 知識圖資料被儲存到 localStorage
- **THEN** 系統 SHALL 同時將該圖表的 JSON 資料 upsert 到 Supabase `knowledge_graphs` 表
- **AND** 若雲端同步失敗，系統 SHALL 在 `mindspark_dirty_graphs` 中記錄

#### Scenario: 訪客模式不提供雲端功能
- **GIVEN** 使用者未登入（訪客模式）
- **WHEN** 使用者使用知識圖
- **THEN** 所有資料 SHALL 僅儲存在 localStorage

### Requirement: External image URL reference
概念節點 SHALL 能夠引用外部圖片網址，並顯示在畫布上。

#### Scenario: 引用外部圖片 URL
- **WHEN** 使用者在屬性編輯面板中貼入圖片網址
- **THEN** 系統 SHALL 進行協議安全檢測，僅允許以 `http://` 或 `https://` 開頭的網址
- **AND** 若檢測通過，圖片網址 SHALL 儲存於該節點的 `data.imageUrl` 中
- **AND** 畫布上該節點下方 SHALL 以 `<img>` 顯示圖片縮圖（最大寬度 120px，以防節點變形）
- **AND** 若檢測不通過（如貼入 `javascript:` 偽協定），系統 SHALL 警告提示「僅支援安全 http/https 圖片網址」，並不渲染 `<img>` 以防止 XSS 漏洞

### Requirement: Supabase table schema
系統 SHALL 使用以下 Supabase 資料表結構：

```sql
CREATE TABLE knowledge_graphs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  graph_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_graphs_user ON knowledge_graphs(user_id);

ALTER TABLE knowledge_graphs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own graphs" ON knowledge_graphs
  FOR ALL USING (auth.uid() = user_id);
```

## Verification
- 單元測試：驗證 `graphCloudStorage.ts` 的 sync 邏輯
- 單元測試：驗證雲端衝突 ConfirmDialog 及另存副本邏輯
- 單元測試：驗證外部圖片 URL 協議校驗與 XSS 攔截
- `npm run build` 通過
- `npm test` 通過

