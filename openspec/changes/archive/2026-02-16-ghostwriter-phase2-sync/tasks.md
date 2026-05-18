# GhostWriter Phase 2 Sync — Tasks

## 1. Context Grabber Engine (`context_grabber.py`)

- [x] 1.1 Create `context_grabber.py` module with `get_cursor_context(chars_before=50, chars_after=50)` function
- [x] 1.2 Implement COM initialization with `CoInitializeEx` / `CoUninitialize` for thread safety
- [x] 1.3 Implement `IUIAutomation.GetFocusedElement()` to detect current focus element
- [x] 1.4 Implement `ITextPattern` retrieval with graceful fallback when unsupported
- [x] 1.5 Implement cursor position detection via `GetSelection()` and text range expansion
- [x] 1.6 Implement `before` / `after` / `selected` text extraction using `MoveEndpointByUnit`
- [x] 1.7 Implement `app_name` detection from focused element properties
- [x] 1.8 Implement error handling: catch all COM exceptions and return structured error dict

## 2. Server Protocol Extension (`server.py`)

- [x] 2.1 Import `context_grabber` module and add `request_context` event handler
- [x] 2.2 Implement `context_update` emission: call `get_cursor_context()` and emit result to client
- [x] 2.3 Add auto-push logic after `text_input`: delay 50ms then grab context and push
- [x] 2.4 Implement debounce mechanism: limit context pushes to max 1 per 300ms during rapid input
- [x] 2.5 Handle unsupported app case: emit `context_update` with `supported: false`

## 3. Frontend Context Display (`static/`)

- [x] 3.1 Add context preview section to `index.html`: preview area with cursor indicator, app name label
- [x] 3.2 Add context preview styles to `style.css`: cursor highlight, selection highlight, unsupported state
- [x] 3.3 Add `context_update` event handler in `app.js`: parse payload and update preview DOM
- [x] 3.4 Add `request_context` emission on connect and after input
- [x] 3.5 Handle `supported: false` state: show greyed-out message in preview area

## 4. Dependencies & Configuration

- [x] 4.1 Add `comtypes` to `requirements.txt`
- [x] 4.2 Update `README.md` with Phase 2 usage instructions and supported applications list

## 5. Integration & Verification

- [ ] 5.1 Test context extraction in Notepad (basic text, cursor at various positions)
- [ ] 5.2 Test context extraction in Chrome text input (web-based editor)
- [ ] 5.3 Test graceful fallback for unsupported applications
- [ ] 5.4 Test auto-push after text injection (verify debounce works)
- [ ] 5.5 Test mobile context preview display (cursor indicator, selection highlight)
- [ ] 5.6 End-to-end: type on phone → inject → context update → preview on phone
