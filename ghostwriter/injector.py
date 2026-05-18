"""Keystroke injection engine for GhostWriter."""

from __future__ import annotations

import errno
import os
import tempfile
import time
import threading
from contextlib import contextmanager
from typing import Any, Dict

import pyautogui
import pyperclip

# Thread-safety for clipboard operations
_inject_lock = threading.Lock()
_process_lock_file_path = os.path.join(tempfile.gettempdir(), "ghostwriter_clipboard.lock")

# Flag to prevent self-injection loop when hotkey listener is active
_is_self_injecting = False

try:
    import msvcrt
except ImportError:  # pragma: no cover - non-Windows fallback
    msvcrt = None
    import fcntl


@contextmanager
def _acquire_process_clipboard_lock(timeout: float = 2.0, poll_interval: float = 0.01):
    """Cross-process lock to serialize clipboard mutation across processes."""
    lock_file = open(_process_lock_file_path, "a+b")
    start = time.perf_counter()
    acquired = False
    try:
        while True:
            try:
                lock_file.seek(0)
                if msvcrt is not None:
                    msvcrt.locking(lock_file.fileno(), msvcrt.LK_NBLCK, 1)
                else:  # pragma: no cover - non-Windows fallback
                    fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                acquired = True
                break
            except OSError as exc:
                lock_busy = exc.errno in (errno.EACCES, errno.EAGAIN, errno.EDEADLK, 13, 33)
                if not lock_busy:
                    raise
                if (time.perf_counter() - start) >= timeout:
                    raise TimeoutError("Timed out waiting for cross-process clipboard lock") from exc
                time.sleep(poll_interval)
        yield
    finally:
        if acquired:
            lock_file.seek(0)
            if msvcrt is not None:
                msvcrt.locking(lock_file.fileno(), msvcrt.LK_UNLCK, 1)
            else:  # pragma: no cover - non-Windows fallback
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
        lock_file.close()


def _is_ascii(text: str) -> bool:
    try:
        text.encode("ascii")
        return True
    except UnicodeEncodeError:
        return False


def _inject_ascii(text: str) -> Dict[str, Any]:
    pyautogui.write(text, interval=0.01)
    return {"ok": True, "mode": "ascii", "text": text}


def _inject_clipboard(text: str) -> Dict[str, Any]:
    with _inject_lock:
        with _acquire_process_clipboard_lock():
            previous_clipboard = pyperclip.paste()
            try:
                pyperclip.copy(text)

                # Wait for clipboard to catch up (with retry)
                for _ in range(5):
                    if pyperclip.paste() == text:
                        break
                    time.sleep(0.01)

                pyautogui.hotkey("ctrl", "v")
                # Wait a bit for the paste operation to complete before restoring
                time.sleep(0.05)
                return {"ok": True, "mode": "clipboard", "text": text}
            finally:
                # Try to restore clipboard with retries
                for _ in range(3):
                    try:
                        pyperclip.copy(previous_clipboard)
                        break
                    except Exception:
                        time.sleep(0.02)


def force_clipboard_paste(text: str) -> Dict[str, Any]:
    """Always use clipboard for injection, bypassing ASCII check."""
    global _is_self_injecting
    _is_self_injecting = True
    try:
        return _inject_clipboard(text)
    finally:
        time.sleep(0.05)
        _is_self_injecting = False


def inject_text(text: str) -> Dict[str, Any]:
    """Inject text into active window and return structured result."""
    global _is_self_injecting
    try:
        if not isinstance(text, str):
            return {"ok": False, "message": "Invalid text payload", "code": "INJECT_ERR"}
        if text == "":
            return {"ok": True, "mode": "noop", "text": ""}

        _is_self_injecting = True
        try:
            if _is_ascii(text):
                return _inject_ascii(text)
            return _inject_clipboard(text)
        finally:
            # Short delay before resetting flag to ensure all simulated events are processed
            time.sleep(0.05)
            _is_self_injecting = False
    except Exception as exc:  # pragma: no cover - hardware/system dependent
        return {
            "ok": False,
            "message": "注入失敗",
            "code": "INJECT_ERR",
            "detail": str(exc),
        }
