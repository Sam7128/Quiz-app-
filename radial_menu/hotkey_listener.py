import time
import logging
from PyQt6.QtCore import QObject, pyqtSignal, QPoint
from pynput import mouse, keyboard

from ghostwriter import injector

logger = logging.getLogger("HotkeyListener")

class HotkeyListener(QObject):
    trigger_signal = pyqtSignal(QPoint)
    release_signal = pyqtSignal()

    def __init__(self):
        super().__init__()
        self.ctrl_pressed = False
        self.mouse_listener = None
        self.kb_listener = None
        self._is_active = False
        self.last_trigger_latency_ms = None
        self._middle_press_started = None

    def start(self):
        self.kb_listener = keyboard.Listener(on_press=self._on_press, on_release=self._on_release)
        self.mouse_listener = mouse.Listener(on_click=self._on_click)
        self.kb_listener.start()
        self.mouse_listener.start()
        self._is_active = True

    def stop(self):
        if self.kb_listener:
            self.kb_listener.stop()
            try:
                self.kb_listener.join(timeout=1.0)
            except RuntimeError:
                pass
        if self.mouse_listener:
            self.mouse_listener.stop()
            try:
                self.mouse_listener.join(timeout=1.0)
            except RuntimeError:
                pass
        self._is_active = False

    def _on_press(self, key):
        if injector._is_self_injecting:
            return
        if key == keyboard.Key.ctrl_l or key == keyboard.Key.ctrl_r:
            self.ctrl_pressed = True

    def _on_release(self, key):
        if injector._is_self_injecting:
            return
        if key == keyboard.Key.ctrl_l or key == keyboard.Key.ctrl_r:
            self.ctrl_pressed = False

    def _on_click(self, x, y, button, pressed):
        if injector._is_self_injecting:
            return

        if button == mouse.Button.middle:
            if pressed and self.ctrl_pressed:
                self._middle_press_started = time.perf_counter()
                # Trigger menu
                self.trigger_signal.emit(QPoint(int(x), int(y)))
                if self._middle_press_started is not None:
                    self.last_trigger_latency_ms = (time.perf_counter() - self._middle_press_started) * 1000
                    if self.last_trigger_latency_ms > 16:
                        logger.warning(
                            "Hotkey event capture latency %.2fms exceeded 16ms target",
                            self.last_trigger_latency_ms,
                        )
            elif not pressed:
                # Release menu
                self.release_signal.emit()
