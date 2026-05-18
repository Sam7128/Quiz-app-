"""GhostWriter Flask-SocketIO server.

Uses 'threading' async_mode for maximum compatibility on Windows.
No eventlet/gevent monkey-patching headaches.
"""

from __future__ import annotations

import socket
import os
import sys
import logging
from typing import Any, Dict, List, Optional, Set

from flask import Flask, request
from flask_socketio import SocketIO, disconnect, emit

try:
    from .injector import inject_text
    from .context_grabber import get_cursor_context
except ImportError:
    from injector import inject_text
    from context_grabber import get_cursor_context

# ── Configuration ────────────────────────────────────────────
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "5000"))

# ── Logging ──────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("ghostwriter")

# ── Flask + SocketIO ─────────────────────────────────────────
app = Flask(__name__, static_folder="static", static_url_path="")
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

socketio = SocketIO(
    app,
    async_mode="threading",       # <-- No monkey-patching needed
    cors_allowed_origins="*",
    ping_timeout=60,              # <-- Generous timeout for mobile networks
    ping_interval=25,
    logger=False,
    engineio_logger=False,
)

# ── Active client tracking ───────────────────────────────────
active_sid: Optional[str] = None
known_sids: Set[str] = set()


# ── Routes ───────────────────────────────────────────────────

@app.route("/")
def index():
    return app.send_static_file("index.html")


@app.after_request
def add_no_cache_headers(response):
    """Prevent stale cached JS from causing protocol mismatches."""
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


# ── Socket.IO event handlers ────────────────────────────────

@socketio.on("connect")
def on_connect():
    global active_sid

    sid = request.sid
    ip = request.remote_addr
    hostname = socket.gethostname()

    log.info(f"[connect] sid={sid} ip={ip}")

    # Single-client mode: if another client is already connected, replace it
    if active_sid and active_sid != sid:
        log.info(f"[replace] kicking old sid={active_sid}")
        emit(
            "status_update",
            {"status": "replaced", "hostname": hostname},
            to=active_sid,
        )
        try:
            disconnect(active_sid)
        except Exception:
            pass
        known_sids.discard(active_sid)

    active_sid = sid
    known_sids.add(sid)

    emit("status_update", {"status": "connected", "hostname": hostname}, to=sid)
    log.info(f"[status] sent 'connected' to sid={sid}")


@socketio.on("disconnect")
def on_disconnect():
    global active_sid

    sid = request.sid
    log.info(f"[disconnect] sid={sid}")
    known_sids.discard(sid)
    if active_sid == sid:
        active_sid = None


@socketio.on("text_input")
def on_text_input(payload: Dict[str, str] | None):
    if not isinstance(payload, dict):
        emit("error", {"message": "Invalid payload", "code": "BAD_PAYLOAD"})
        return

    text = payload.get("text", "")
    mode = payload.get("mode", "stream")

    if not isinstance(text, str):
        emit("error", {"message": "Invalid text", "code": "BAD_TEXT"})
        return

    if text == "":
        return

    log.info(f"[text_input] mode={mode} text={repr(text)}")

    result = inject_text(text)

    if result.get("ok", False):
        log.info(f"[inject] OK mode={result.get('mode')} text={repr(text)}")
        # Auto-push context after injection (Phase 2)
        socketio.start_background_task(push_context_delayed, sid=request.sid)
    else:
        log.warning(f"[inject] FAIL: {result}")
        emit(
            "error",
            {
                "message": result.get("message", "注入失敗"),
                "code": result.get("code", "INJECT_ERR"),
                "detail": result.get("detail", ""),
                "mode": mode,
            },
        )


@socketio.on("key_command")
def on_key_command(payload: Dict[str, Any] | None):
    """Handle special key commands (backspace, etc.)."""
    if not isinstance(payload, dict):
        emit("error", {"message": "Invalid payload", "code": "BAD_PAYLOAD"})
        return

    key = payload.get("key", "")
    
    # Supported keys
    if key == "backspace":
        import pyautogui
        pyautogui.press("backspace")
        log.info("[key_command] Executed Backspace")
    else:
        log.warning(f"[key_command] Unsupported key: {key}")


@socketio.on("move_cursor")
def on_move_cursor(payload: Dict[str, Any] | None):
    """Move PC cursor based on mobile preview click."""
    if not isinstance(payload, dict):
        return
    
    direction = payload.get("direction")
    steps = payload.get("steps", 0)
    
    if direction in ["left", "right"] and steps > 0:
        import pyautogui
        # Move the cursor N times
        pyautogui.press(direction, presses=int(steps))
        log.info(f"[move_cursor] direction={direction} steps={steps}")


@socketio.on("request_context")
def on_request_context(payload=None):
    """Manually request text context from the PC."""
    sid = getattr(request, "sid", active_sid)
    if not sid:
        return
        
    force = False
    if isinstance(payload, dict):
        force = payload.get("force", False)

    socketio.start_background_task(run_context_grab, sid=sid, force=force)


def run_context_grab(sid: str, force: bool = False):
    """Execution logic for context grab in background."""
    log.info(f"[request_context] background grab for sid={sid} force={force}")
    ctx = get_cursor_context(force=force)
    
    if ctx.get("supported"):
        log.info(f"[context] SUCCESS app={ctx.get('app_name')} before_len={len(ctx.get('before',''))}")
    else:
        # Only log warning if not brute forcing, to keep logs clean
        if not force:
            log.warning(f"[context] FAIL reason={ctx.get('reason')} app={ctx.get('app_name')}")
    
    socketio.emit("context_update", ctx, to=sid)


def push_context_delayed(sid: str):
    """Delay context grab slightly to allow target app to process input."""
    socketio.sleep(0.1) # 100ms delay
    ctx = get_cursor_context()
    socketio.emit("context_update", ctx, to=sid)


# ── Utility functions ────────────────────────────────────────

def get_lan_ips() -> List[str]:
    """Detect all IPv4 addresses on all interfaces (LAN, VPN, USB, etc.)."""
    ips: List[str] = []
    
    # Method 1: Get all interface addresses using getaddrinfo
    try:
        # 0, 0, 0, 0 means loop over all families/types/protocols
        # but we filter for AF_INET (IPv4)
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None):
            # info structure: (family, type, proto, canonname, sockaddr)
            # sockaddr for IPv4 is (ip, port)
            if info[0] == socket.AF_INET:
                ip = info[4][0]
                if ip and not ip.startswith("127.") and ip not in ips:
                    ips.append(ip)
    except Exception as e:
        log.warning(f"Failed to get local IPs via getaddrinfo: {e}")

    # Method 2: Connection probe (reliable for main internet-facing IP)
    if not ips:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            # Doesn't actually connect to 8.8.8.8, just determines route
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            if ip and not ip.startswith("127.") and ip not in ips:
                ips.append(ip)
        except Exception:
            pass

    return ips


def print_qr(url: str) -> None:
    """Print a QR code in the terminal."""
    try:
        import qrcode
    except ImportError:
        log.warning("qrcode package not installed, skipping QR display")
        return

    print(f"\nScan this QR code to open: {url}\n")
    qr = qrcode.QRCode(border=1)
    qr.add_data(url)
    qr.make(fit=True)
    try:
        qr.print_ascii(invert=True)
    except UnicodeEncodeError:
        matrix = qr.get_matrix()
        for row in matrix:
            line = "".join("##" if cell else "  " for cell in row)
            print(line)
    print("")


# ── Main entry point ─────────────────────────────────────────

def main() -> None:
    lan_ips = get_lan_ips()

    print("=" * 50)
    print("  GhostWriter — Phone-to-PC Input Bridge")
    print("=" * 50)
    # ── Auto-Port Detection ──────────────────────────────────────
    # Try to find an available port starting from config PORT
    # This prevents crashes when port 5000 is occupied (e.g. by MacOS Control Center or another run)
    start_port = PORT
    max_retries = 20
    actual_port = start_port

    for attempt in range(max_retries):
        try:
            # Check availability by binding a socket briefly
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind((HOST, start_port + attempt))
                actual_port = start_port + attempt
                break
        except OSError:
            continue
    else:
         log.error(f"Could not find an open port in range {start_port}-{start_port + max_retries}")
         print(f"Error: Ports {start_port} to {start_port + max_retries} are all in use.")
         print("Please close other applications or check your network settings.")
         sys.exit(1)

    print(f"\nListening on {HOST}:{actual_port}")
    print(f"Async mode: threading")

    if lan_ips:
        print("\nAvailable LAN URLs:")
        for ip in lan_ips:
            print(f"  → http://{ip}:{actual_port}/")
        print("\nQR codes (scan with your phone camera):")
        for ip in lan_ips:
            print_qr(f"http://{ip}:{actual_port}/")
    else:
        print("\nNo LAN IP detected. Use localhost if running on same machine.")

    print("Waiting for connections...\n")

    try:
        socketio.run(
            app,
            host=HOST,
            port=actual_port,
            allow_unsafe_werkzeug=True,  # Required for threading mode
        )
    except OSError as exc:
        log.error(f"Failed to start server on {HOST}:{actual_port}: {exc}")
        print("Try restarting the application.")
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
