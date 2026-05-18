"""Windows UI Automation context grabber for GhostWriter.

Uses the `uiautomation` package for reliable UI element inspection,
with a clipboard-based fallback for grabbing selected text.

Handles Windows cp950 encoding issues by sanitizing Unicode output.
"""

from __future__ import annotations

import logging
import time
import re
from typing import Any, Dict

import pyperclip
import pyautogui

try:
    import uiautomation as auto
    UIA_AVAILABLE = True
except ImportError:
    UIA_AVAILABLE = False

log = logging.getLogger("ghostwriter.context")


def _sanitize_text(text: str) -> str:
    """Remove problematic Unicode characters that crash cp950 encoding.
    
    Chrome and other apps inject special chars like U+FFFC (Object Replacement)
    which break Windows' Big5/cp950 console encoding.
    """
    if not text:
        return ""
    # Remove U+FFFC (Object Replacement Character) and other control chars
    # Keep normal printable chars, CJK, newlines, tabs
    cleaned = text.replace("\ufffc", "")
    # Remove other common invisible / problematic chars in Private Use / Specials block
    cleaned = re.sub(r"[\ufff0-\uffff]", "", cleaned)
    return cleaned


def _get_foreground_app_name() -> str:
    """Get the name of the foreground window."""
    try:
        import ctypes
        user32 = ctypes.windll.user32
        hwnd = user32.GetForegroundWindow()
        length = user32.GetWindowTextLengthW(hwnd)
        buf = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buf, length + 1)
        return buf.value if buf.value else "Unknown"
    except Exception:
        return "Unknown"


def _grab_selected_text_clipboard() -> str:
    """Grab currently selected text using clipboard (Ctrl+C)."""
    try:
        # Save current clipboard
        original = ""
        try:
            original = pyperclip.paste()
        except Exception:
            pass

        # Clear clipboard then copy selection
        pyperclip.copy("")
        time.sleep(0.02)
        pyautogui.hotkey("ctrl", "c")
        time.sleep(0.12)  # Wait for clipboard to populate

        selected = pyperclip.paste()

        # Restore original clipboard
        try:
            pyperclip.copy(original)
        except Exception:
            pass

        return _sanitize_text(selected) if selected else ""
    except Exception as e:
        log.debug(f"Clipboard grab failed: {e}")
        return ""


def _try_uia_context(chars_before: int = 50, chars_after: int = 50) -> Dict[str, Any] | None:
    """Try to get text context using the uiautomation package.
    
    Walks up the control tree (up to 3 levels) to find a control
    that exposes TextPattern.
    
    Returns a context dict on success, or None on failure.
    """
    if not UIA_AVAILABLE:
        return None
        
    try:
        # COM initialization for background threads
        with auto.UIAutomationInitializerInThread():
            # Get focused control
            focused = auto.GetFocusedControl()
            if not focused:
                return None

            app_name = focused.Name or ""
            class_name = focused.ClassName or ""
            display_name = f"{app_name} ({class_name})" if app_name else class_name

            # Try TextPattern on focused element and walk up parents
            pattern = None
            targets = [focused]
            parent = focused
            for _ in range(3):
                parent = parent.GetParentControl()
                if parent:
                    targets.append(parent)

            for ctrl in targets:
                try:
                    tp = ctrl.GetTextPattern()
                except AttributeError:
                    # Some control types (GroupControl) use GetPattern instead
                    try:
                        tp = ctrl.GetPattern(10014)  # UIA_TextPatternId = 10014
                    except Exception:
                        tp = None
                if tp:
                    pattern = tp
                    break

            if not pattern:
                # Fallback: Try ValuePattern (e.g. Chrome Address Bar, simple inputs)
                # ValuePattern gives full text but NO cursor position. 
                # We will assume cursor is at the end to allow appending.
                for ctrl in targets:
                    try:
                        vp = ctrl.GetValuePattern()
                        if vp:
                            raw_val = vp.Value
                            val = _sanitize_text(raw_val)
                            # Return full value as 'before' text context
                            return {
                                "supported": True,
                                "app_name": display_name,
                                "before": val[-chars_before:] if val else "",
                                "after": "",
                                "selected": "",
                                "fallback": "ValuePattern" 
                            }
                    except Exception:
                        pass
                
                return None

            # Get selection ranges
            try:
                selection = pattern.GetSelection()
            except Exception as e:
                log.debug(f"GetSelection failed: {e}")
                return None

            if not selection or len(selection) == 0:
                return None

            caret_range = selection[0]

            # Get selected text
            selected_text = ""
            try:
                raw = caret_range.GetText(-1)
                selected_text = _sanitize_text(raw)
            except Exception as e:
                log.debug(f"Selected text failed: {e}")

            # Get text before caret using DocumentRange
            before_text = ""
            try:
                doc_range = pattern.DocumentRange
                before_range = doc_range.Clone()
                # Set before_range.End = caret_range.Start
                before_range.MoveEndpointByRange(
                    auto.TextPatternRangeEndpoint.End,
                    caret_range,
                    auto.TextPatternRangeEndpoint.Start
                )
                raw_before = before_range.GetText(-1)
                cleaned = _sanitize_text(raw_before)
                before_text = cleaned[-chars_before:] if cleaned else ""
            except Exception as e:
                log.debug(f"Before text failed: {e}")

            # Get text after caret using DocumentRange
            after_text = ""
            try:
                doc_range = pattern.DocumentRange
                after_range = doc_range.Clone()
                # Set after_range.Start = caret_range.End
                after_range.MoveEndpointByRange(
                    auto.TextPatternRangeEndpoint.Start,
                    caret_range,
                    auto.TextPatternRangeEndpoint.End
                )
                raw_after = after_text = "" # placeholder to avoid unbound issues
                raw_after = after_range.GetText(-1)
                cleaned = _sanitize_text(raw_after)
                after_text = cleaned[:chars_after] if cleaned else ""
            except Exception as e:
                log.debug(f"After text failed: {e}")

            return {
                "supported": True,
                "app_name": display_name,
                "before": before_text,
                "after": after_text,
                "selected": selected_text,
            }

    except Exception as e:
        log.debug(f"UIA context failed: {e}")
        return None


def get_cursor_context(chars_before: int = 50, chars_after: int = 50, force: bool = False) -> Dict[str, Any]:
    """
    Grab text context around the cursor.
    
    Strategy:
    1. Try uiautomation (TextPattern/ValuePattern).
    2. Try Manual Selection (Clipboard).
    3. If force=True AND nothing else worked: Try Automatic Ctrl+A (Brute Force).
    """
    app_name = _get_foreground_app_name()

    # Strategy 1: Full UIA context
    uia_result = _try_uia_context(chars_before, chars_after)
    if uia_result is not None:
        log.info(
            f"[context] UIA OK app={uia_result.get('app_name','?')[:30]} "
            f"before={len(uia_result.get('before',''))} "
            f"after={len(uia_result.get('after',''))}"
        )
        return uia_result

    # Strategy 2: Manual Selection Fallback (if user manually selected text)
    selected = _grab_selected_text_clipboard()
    if selected:
        log.info(f"[context] Clipboard OK app={app_name} selected_len={len(selected)}")
        return {
            "supported": True,
            "app_name": app_name,
            "before": "",
            "after": "",
            "selected": selected,
        }

    # Strategy 3: Force Grab (Ctrl+A)
    # Only if force=True requested by user
    if force:
        try:
            log.info(f"[context] Attempting FORCE GRAB on {app_name}")
            # Save clipboard
            original = ""
            try:
                original = pyperclip.paste()
            except Exception:
                pass
                
            # Simulate Ctrl+A -> Ctrl+C
            pyautogui.hotkey('ctrl', 'a')
            time.sleep(0.05)
            pyautogui.hotkey('ctrl', 'c')
            time.sleep(0.05)
            
            # Get content
            full_text = pyperclip.paste()
            full_text = _sanitize_text(full_text)
            
            # Deselect (move cursor to end)
            pyautogui.press('right')
            
            # Restore clipboard
            try:
                pyperclip.copy(original)
            except Exception:
                pass

            if full_text:
                log.info(f"[context] ForceGrab OK app={app_name} len={len(full_text)}")
                return {
                    "supported": True,
                    "app_name": app_name,
                    "before": full_text[-chars_before:], # Assume cursor at end
                    "after": "",
                    "selected": "",
                    "fallback": "ForceGrab"
                }
        except Exception as e:
            log.warning(f"Force grab failed: {e}")

    # Nothing worked
    return {
        "supported": False,
        "app_name": app_name,
        "reason": "TextPattern not available. Long-press Refresh to force grab.",
        "before": "",
        "after": "",
        "selected": "",
    }
