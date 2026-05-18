# GhostWriter — Phone-to-PC Input Bridge

GhostWriter lets your phone send text to the focused cursor on your Windows PC over local Wi-Fi (LAN only), and syncs the cursor context back to your phone.

## Features

- **Low-latency Bridge**: Socket.IO connection from phone browser to PC.
- **Smart Injection**: ASCII via `pyautogui`, Unicode/CJK via clipboard with restore.
- **Context Sync (Phase 2)**: Real-time preview of the text surrounding your PC cursor on your phone.
- **Mobile PWA**: Modern dark theme, connection status, and auto-focus input.
- **Privacy First**: LAN only, no external CDN or cloud dependencies.

## Requirements

- Python 3.10+ (Windows only for context sync)
- Windows PC and phone on the same Wi-Fi/LAN

## Installation

```bash
cd ghostwriter
pip install -r requirements.txt
```

## Running

```bash
# Start both Server and Radial Menu Toolkit
python launcher.py

# Or start only the server
python -m ghostwriter.server
```

Open the printed LAN URL or scan the QR code on your mobile device.

## Usage

1. **PC**: Ensure the target application (Notepad, Chrome, Word, etc.) has keyboard focus.
2. **Phone**: Open the link. You should see the context of your PC cursor (e.g., surrounding text).
3. **Phone**: Type in the input box. Words will appear at your PC cursor and the context preview will update.
4. **Refresh**: If focus changes, tap the ↻ button on your phone to update the context.

## Support

Context synchronization requires the target application to support **Windows UI Automation (TextPattern)**. 
- **Supported**: Notepad, Microsoft Word, Google Chrome, Edge, VS Code, etc.
- **May not work**: Some legacy apps, games, or apps with custom-drawn text engines.

## Notes

- GhostWriter uses `Ctrl+V` and clipboard restoration for non-ASCII characters.
- This phase supports single-client mode: new connections replace older ones.
