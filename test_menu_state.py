import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from radial_menu.menu_state import MenuState

def test_menu_state():
    data = [
        {"label": "Sub", "type": "submenu", "items": [
            {"label": "Item1", "type": "text", "content": "C1"}
        ]},
        {"label": "TopItem", "type": "text", "content": "C2"}
    ]
    
    state = MenuState(data)
    assert state.is_at_root() is True
    assert len(state.get_current_items()) == 2
    
    # Enter submenu
    assert state.enter_submenu(0) is True
    assert state.is_at_root() is False
    assert len(state.get_current_items()) == 1
    assert state.get_current_items()[0]["label"] == "Item1"
    
    # Go back
    assert state.go_back() is True
    assert state.is_at_root() is True
    assert len(state.get_current_items()) == 2
    
    # Cannot go back from root
    assert state.go_back() is False
    
    # Enter non-submenu
    assert state.enter_submenu(1) is False
    assert state.is_at_root() is True

    print("Menu State tests passed!")

if __name__ == "__main__":
    test_menu_state()
