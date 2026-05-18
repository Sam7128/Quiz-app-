import sys
import os
from PyQt6.QtWidgets import QApplication
from radial_menu.radial_menu_widget import RadialMenuWidget
from radial_menu.toolkit_config import ToolkitConfig

def test_widget_init():
    app = QApplication(sys.argv)
    config = ToolkitConfig("menu_data.json", "menu_schema.json")
    widget = RadialMenuWidget(config)
    assert widget.width() == 400
    assert widget.height() == 400
    assert len(widget.sectors) > 0
    print("Widget initialization test passed!")
    # Close app
    widget.close()
    app.quit()

if __name__ == "__main__":
    try:
        test_widget_init()
    except Exception as e:
        print(f"Test failed: {e}")
        sys.exit(1)
