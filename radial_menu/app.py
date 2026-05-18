import sys
from PyQt6.QtWidgets import QApplication, QSystemTrayIcon, QMenu, QStyle
from PyQt6.QtCore import QTimer

from radial_menu.toolkit_config import ToolkitConfig
from radial_menu.radial_menu_widget import RadialMenuWidget
from radial_menu.hotkey_listener import HotkeyListener
from radial_menu.config_editor import ConfigEditor

def run_radial_menu():
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)
    
    config_manager = ToolkitConfig()
    menu_widget = RadialMenuWidget(config_manager)
    listener = HotkeyListener()
    
    # Use Qt cursor position to avoid DPI mismatch from OS-level hooks.
    listener.trigger_signal.connect(lambda _pos: menu_widget.show_at_cursor())
    listener.release_signal.connect(menu_widget.confirm_selection)
    
    listener.start()
    
    # System Tray
    tray = QSystemTrayIcon()
    tray.setIcon(app.style().standardIcon(QStyle.StandardPixmap.SP_ComputerIcon))
    tray.setToolTip("GhostWriter Radial Menu")
    
    tray_menu = QMenu()
    edit_action = tray_menu.addAction("配置編輯器")
    quit_action = tray_menu.addAction("結束")
    
    editor = None
    
    def show_editor():
        nonlocal editor
        if editor is None:
            editor = ConfigEditor(config_manager)
        editor.show()
        editor.raise_()
        editor.activateWindow()

    def on_tray_activated(reason):
        if reason in (
            QSystemTrayIcon.ActivationReason.Trigger,
            QSystemTrayIcon.ActivationReason.DoubleClick,
        ):
            show_editor()

    edit_action.triggered.connect(show_editor)
    quit_action.triggered.connect(app.quit)
    
    tray.setContextMenu(tray_menu)
    tray.activated.connect(on_tray_activated)
    if QSystemTrayIcon.isSystemTrayAvailable():
        tray.show()
        tray.showMessage(
            "GhostWriter 已啟動",
            "Radial Menu 正在背景執行。按 Ctrl + 滑鼠中鍵 呼叫圓盤選單。",
            QSystemTrayIcon.MessageIcon.Information,
            2500,
        )
        print("[Radial Menu] Running in system tray. Use Ctrl + Middle Mouse to open.")
        # Always show editor once so users can immediately edit phrases without finding tray controls.
        QTimer.singleShot(0, show_editor)
    else:
        print("[Radial Menu] System tray unavailable. Opening config editor window.")
        show_editor()
    
    # Config Hot-reload timer
    reload_timer = QTimer()
    reload_timer.timeout.connect(config_manager.check_for_updates)
    reload_timer.start(2000) # Check every 2 seconds
    
    try:
        sys.exit(app.exec())
    finally:
        listener.stop()

if __name__ == "__main__":
    run_radial_menu()
