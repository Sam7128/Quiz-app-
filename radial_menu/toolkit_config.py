import json
import os
import time
import shutil
import logging
from typing import Dict, Any, List, Optional
import jsonschema

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ToolkitConfig")

class ToolkitConfig:
    def __init__(self, data_path: str = "menu_data.json", schema_path: str = "menu_schema.json"):
        self.data_path = os.path.abspath(data_path)
        self.schema_path = os.path.abspath(schema_path)
        self.config_data: Dict[str, Any] = {"items": []}
        self.last_mtime: float = 0
        self.schema: Optional[Dict[str, Any]] = None
        
        self.load_schema()
        self.load_config()

    @staticmethod
    def _default_config() -> Dict[str, Any]:
        return {
            "items": [
                {
                    "label": "常用語",
                    "type": "submenu",
                    "items": [
                        {"label": "你好", "type": "text", "content": "您好，很高興為您服務！"},
                        {"label": "謝謝", "type": "text", "content": "非常感謝您的協助！"},
                    ],
                },
                {"label": "我的電子郵件", "type": "text", "content": "ghostwriter@example.com"},
            ]
        }

    def load_schema(self):
        try:
            if os.path.exists(self.schema_path):
                with open(self.schema_path, "r", encoding="utf-8") as f:
                    self.schema = json.load(f)
            else:
                logger.warning(f"Schema file not found at {self.schema_path}")
        except Exception as e:
            logger.error(f"Failed to load schema: {e}")

    def load_config(self) -> bool:
        """Load and validate config from disk."""
        try:
            if not os.path.exists(self.data_path):
                logger.info("Config file not found, creating default config file.")
                default_data = self._default_config()
                if self.save_config(default_data):
                    self.config_data = default_data
                    return True
                self.config_data = default_data
                return False

            with open(self.data_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            if self.schema:
                jsonschema.validate(instance=data, schema=self.schema)
            
            self.config_data = data
            self.last_mtime = os.path.getmtime(self.data_path)
            logger.info("Config loaded and validated successfully.")
            return True
        except jsonschema.ValidationError as ve:
            logger.error(f"Config validation failed: {ve.message}")
            self.config_data = self._default_config()
            return False
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            self.config_data = self._default_config()
            return False

    def save_config(self, data: Dict[str, Any]) -> bool:
        """Atomic save using .tmp file."""
        tmp_path = self.data_path + ".tmp"
        try:
            if self.schema:
                jsonschema.validate(instance=data, schema=self.schema)
            
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            # Atomic swap
            if os.path.exists(self.data_path):
                # Create backup
                shutil.copy2(self.data_path, self.data_path + ".bak")
            
            os.replace(tmp_path, self.data_path)
            self.config_data = data
            self.last_mtime = os.path.getmtime(self.data_path)
            logger.info("Config saved atomically.")
            return True
        except Exception as e:
            logger.error(f"Failed to save config: {e}")
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            return False

    def check_for_updates(self) -> bool:
        """Check if file has been modified on disk."""
        try:
            if not os.path.exists(self.data_path):
                return False
            
            current_mtime = os.path.getmtime(self.data_path)
            if current_mtime > self.last_mtime:
                logger.info("Config file change detected on disk.")
                return self.load_config()
            return False
        except Exception as e:
            logger.error(f"Error checking for updates: {e}")
            return False

    def get_items(self) -> List[Dict[str, Any]]:
        return self.config_data.get("items", [])
