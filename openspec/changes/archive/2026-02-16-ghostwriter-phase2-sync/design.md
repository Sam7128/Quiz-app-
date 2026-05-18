# GhostWriter Phase 2 Sync — Technical Design

## Context

Phase 1 已建立穩定的 WebSocket 通訊管道和按鍵注入引擎。Phase 2 需要在不影響 Phase 1 穩定性的前提下，加入「讀取」能力——從電腦端抓取游標周圍文字並回傳給手機。

現有程式碼架構：
- `server.py`：Flask-SocketIO (threading mode) + 靜態檔案託管
- `injector.py`：pyautogui + pyperclip 按鍵注入
- `static/app.js`：Sio4Lite WebSocket 客戶端 + IME compositionend 處理

## Goals / Non-Goals

**Goals:**
- 使用 Windows UI Automation (IUIAutomation COM) 抓取焦點元素的文字與游標位置
- 在文字注入後自動推送上下文更新給手機
- 手機端顯示游標前後各 50 字元的上下文片段
- 支援 Notepad、Word、Chrome 等主流應用的文字讀取

**Non-Goals (Phase 2 範圍外):**
- 修改電腦端的文字內容（Phase 3）
- Backspace / 刪除 / 取代邏輯（Phase 3）
- 跨段落或全文件同步
- 不支援 UI Automation 的舊版應用的 fallback

## Architecture

```
手機端                                         電腦端
┌────────────────────┐                  ┌──────────────────────────────┐
│ 上下文預覽區       │◄─────────────────│  context_grabber.py          │
│ "...打入電│腦..."  │  context_update  │                              │
│    (游標: │)       │                  │  IUIAutomation COM           │
├────────────────────┤                  │    ↓                         │
│ 輸入框             │────────────────►│  GetFocusedElement()          │
│ [你好世界]         │  text_input      │    ↓                         │
└────────────────────┘                  │  ITextPattern                │
                                        │    ↓                         │
         request_context ──────────────►│  GetSelection() / GetText()  │
                                        │    ↓                         │
         context_update ◄───────────────│  { before, after, selected } │
                                        └──────────────────────────────┘
```

### 新增模組

| 模組 | 技術 | 職責 |
|---|---|---|
| **context_grabber.py** | comtypes + ctypes (IUIAutomation COM) | 抓取焦點元素文字、游標位置、選取範圍 |

### 修改模組

| 模組 | 變更 |
|---|---|
| **server.py** | 新增 `request_context` / `context_update` 事件處理 |
| **app.js** | 新增上下文顯示邏輯、自動請求上下文 |
| **index.html** | 新增上下文預覽區 DOM 結構 |
| **style.css** | 新增上下文預覽區樣式 |
| **requirements.txt** | 新增 `comtypes` 依賴 |

### 通訊協議擴展

```
事件名稱             方向              Payload 結構
──────────────────────────────────────────────────────────
"request_context"    手機 → 電腦       { }  (空 payload，觸發一次抓取)
"context_update"     電腦 → 手機       {
                                          "before": "...游標前50字...",
                                          "after": "...游標後50字...",
                                          "selected": "選取的文字",
                                          "app_name": "Notepad",
                                          "supported": true
                                        }
```

### UI Automation 抓取策略

```python
# 核心流程 (context_grabber.py)
def get_cursor_context(chars_before=50, chars_after=50):
    # 1. 取得 IUIAutomation 實例
    uia = comtypes.CoCreateInstance(CUIAutomation)

    # 2. 取得焦點元素
    focused = uia.GetFocusedElement()

    # 3. 嘗試取得 TextPattern
    text_pattern = focused.GetCurrentPattern(UIA_TextPatternId)

    # 4. 取得游標位置（選取範圍）
    selection = text_pattern.GetSelection()
    caret_range = selection.GetElement(0)

    # 5. 向前/向後擴展範圍，取得上下文文字
    before_range = caret_range.Clone()
    before_range.MoveEndpointByUnit(Start, Character, -chars_before)
    before_text = before_range.GetText(-1)

    after_range = caret_range.Clone()
    after_range.MoveEndpointByUnit(End, Character, chars_after)
    after_text = after_range.GetText(-1)

    return { "before": before_text, "after": after_text, ... }
```

### 上下文推送時機

1. **手機主動請求**：收到 `request_context` 事件時立即抓取並回傳
2. **注入後自動推送**：`text_input` 處理完成後，自動抓取一次上下文並推送
3. **防抖機制**：連續輸入時，最多每 300ms 推送一次上下文（避免頻繁 COM 呼叫）

## Decisions

1. **comtypes 而非 pywinauto**
   - 理由：comtypes 直接存取 UI Automation COM 介面，更輕量、無多餘依賴。pywinauto 功能過多且引入大量不需要的模組。

2. **游標前後 50 字元而非全文**
   - 理由：全文傳輸在大文件中效能差且手機端無法有效顯示。50 字元足以讓使用者判斷上下文。

3. **注入後自動推送而非輪詢**
   - 理由：減少不必要的 COM 呼叫和 WebSocket 流量。只在「有意義的狀態變化」時才抓取。

4. **Graceful degradation：不支援 TextPattern 時回傳 `supported: false`**
   - 理由：並非所有應用都實作 TextPattern（如遊戲、某些自繪 UI）。系統應優雅降級而非崩潰。

## File Structure Changes

```
ghostwriter/
├── server.py              # [MODIFY] 新增 request_context / context_update 事件
├── injector.py            # [NO CHANGE]
├── context_grabber.py     # [NEW] Windows UI Automation 上下文抓取引擎
├── requirements.txt       # [MODIFY] 新增 comtypes
├── static/
│   ├── index.html         # [MODIFY] 新增上下文預覽區 DOM
│   ├── app.js             # [MODIFY] 新增上下文同步邏輯
│   ├── style.css          # [MODIFY] 新增上下文預覽區樣式
│   └── ...
└── ...
```

## Risks / Trade-offs

| 風險 | 等級 | 緩解策略 |
|---|---|---|
| UI Automation COM 呼叫可能阻塞主執行緒 | 中 | 在背景執行緒中執行 COM 呼叫，使用 `CoInitializeEx` 初始化 COM |
| 某些應用不支援 TextPattern | 中 | 回傳 `supported: false`，手機端顯示「不支援」提示 |
| 頻繁 COM 呼叫影響效能 | 低 | 防抖機制限制最高頻率；僅在注入後或主動請求時抓取 |
| comtypes 在某些 Python 版本中的相容性 | 低 | 使用穩定版 comtypes，提供降級提示 |
