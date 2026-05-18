# GhostWriter Phase 1 MVP — Tasks

## 1. Project Setup & Dependencies

- [x] 1.1 Create `ghostwriter/` project directory structure (`server.py`, `injector.py`, `static/`, `requirements.txt`, `README.md`)
- [x] 1.2 Create `requirements.txt` with dependencies: `flask`, `flask-socketio`, `eventlet`, `pyautogui`, `pyperclip`, `qrcode`
- [x] 1.3 Write `README.md` with installation instructions (`pip install -r requirements.txt`) and usage guide

## 2. Keystroke Injection Engine (`injector.py`)

- [x] 2.1 Implement `inject_text(text: str)` function that detects ASCII vs non-ASCII content
- [x] 2.2 Implement ASCII injection path using `pyautogui.write()`
- [x] 2.3 Implement CJK clipboard injection path: backup clipboard → write text → simulate Ctrl+V → restore clipboard
- [x] 2.4 Implement clipboard safety with try/finally to guarantee restoration
- [x] 2.5 Implement error handling wrapper that catches exceptions and returns structured error dict

## 3. WebSocket Server (`server.py`)

- [x] 3.1 Create Flask app with Socket.IO integration using eventlet async mode
- [x] 3.2 Configure static file hosting to serve `static/` directory at root path
- [x] 3.3 Implement `connect` event handler: log client IP, send `status_update` with hostname
- [x] 3.4 Implement `disconnect` event handler: log disconnection, clean up client state
- [x] 3.5 Implement `text_input` event handler: validate payload, call `inject_text()`, emit errors on failure
- [x] 3.6 Implement server startup: detect LAN IPs, generate QR code, display connection info in terminal
- [x] 3.7 Implement single-client mode: track active client, replace on new connection

## 4. Mobile PWA Frontend (`static/`)

- [x] 4.1 Create `manifest.json` with PWA metadata (name, icons, theme color, display: standalone)
- [x] 4.2 Create `index.html` with responsive mobile layout: connection status bar, text input area, mode controls
- [x] 4.3 Create `style.css` with mobile-first responsive design, dark theme, status indicator animations
- [x] 4.4 Create `app.js` with Socket.IO client: connect to server, send `text_input` events on input change
- [x] 4.5 Implement connection status UI: green/red indicator, hostname display, reconnection feedback
- [x] 4.6 Implement stream mode logic: detect input changes, send only new characters, clear input after send
- [x] 4.7 Ensure zero external CDN dependencies — bundle Socket.IO client JS locally

## 5. Integration & Verification

## 5. Integration & Verification

- [x] 5.1 Test ASCII text injection (English letters, numbers, symbols)
- [x] 5.2 Test CJK text injection (Chinese characters via clipboard strategy)
- [x] 5.3 Test connection/disconnection handling and status display
- [x] 5.4 Test reconnection after Wi-Fi interruption
- [x] 5.5 Verify zero external network requests (no telemetry, no CDN)
- [x] 5.6 Test QR code display and mobile connection via QR scan
- [x] 5.7 End-to-end test: mobile input → WebSocket → keystroke injection → target application
