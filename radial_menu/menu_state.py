from typing import List, Dict, Any, Optional

class MenuState:
    def __init__(self, root_items: List[Dict[str, Any]]):
        self.root_items = root_items
        self.history: List[List[Dict[str, Any]]] = [root_items]
        self.current_items = root_items

    def enter_submenu(self, index: int) -> bool:
        """Enter a submenu if the item at index is a submenu."""
        if 0 <= index < len(self.current_items):
            item = self.current_items[index]
            if item.get("type") == "submenu" and "items" in item:
                self.current_items = item["items"]
                self.history.append(self.current_items)
                return True
        return False

    def go_back(self) -> bool:
        """Go back to parent menu. Returns False if already at root."""
        if len(self.history) > 1:
            self.history.pop()
            self.current_items = self.history[-1]
            return True
        return False

    def get_current_items(self) -> List[Dict[str, Any]]:
        return self.current_items

    def is_at_root(self) -> bool:
        return len(self.history) == 1

    def get_item(self, index: int) -> Optional[Dict[str, Any]]:
        if 0 <= index < len(self.current_items):
            return self.current_items[index]
        return None
