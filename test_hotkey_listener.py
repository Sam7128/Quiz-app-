import sys
import os
from PyQt6.QtCore import QCoreApplication
from pynput import mouse
from radial_menu.hotkey_listener import HotkeyListener

def test_listener_init():
    app = QCoreApplication(sys.argv)
    listener = HotkeyListener()
    assert listener._is_active is False
    # We can't easily test real hotkeys in a script without blocking
    # but we can verify signals and start/stop
    listener.start()
    assert listener.kb_listener.is_alive()
    assert listener.mouse_listener.is_alive()
    listener.stop()
    assert not listener.kb_listener.is_alive()
    assert not listener.mouse_listener.is_alive()
    print("Hotkey listener initialization and lifecycle test passed!")

def test_listener_records_trigger_latency():
    app = QCoreApplication.instance() or QCoreApplication(sys.argv)
    listener = HotkeyListener()
    listener.ctrl_pressed = True
    listener._on_click(100, 100, mouse.Button.middle, True)
    assert listener.last_trigger_latency_ms is not None
    assert listener.last_trigger_latency_ms >= 0
    print("Hotkey listener latency metric test passed!")

if __name__ == "__main__":
    try:
        test_listener_init()
        test_listener_records_trigger_latency()
    except Exception as e:
        print(f"Test failed: {e}")
        sys.exit(1)
