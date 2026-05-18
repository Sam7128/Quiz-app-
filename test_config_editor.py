import sys
import os
from PyQt6.QtWidgets import QApplication
from radial_menu.config_editor import ConfigEditor
from radial_menu.toolkit_config import ToolkitConfig

def test_editor_init():
    app = QApplication(sys.argv)
    config = ToolkitConfig("menu_data.json", "menu_schema.json")
    editor = ConfigEditor(config)
    assert editor.windowTitle() == "GhostWriter Radial Menu 配置編輯器"
    assert editor.tree.topLevelItemCount() > 0
    print("Config editor initialization test passed!")
    editor.close()
    app.quit()

if __name__ == "__main__":
    try:
        test_editor_init()
    except Exception as e:
        print(f"Test failed: {e}")
        sys.exit(1)
