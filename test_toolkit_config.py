import os
import json
import sys
import time
from radial_menu.toolkit_config import ToolkitConfig

def test_config_cycle():
    data_path = "test_menu_data.json"
    schema_path = "menu_schema.json"
    
    # Ensure clean state
    if os.path.exists(data_path): os.remove(data_path)
    if os.path.exists(data_path + ".bak"): os.remove(data_path + ".bak")

    # 1. Initial creation
    initial_data = {"items": [{"label": "Test", "type": "text", "content": "Hello"}]}
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(initial_data, f)
    
    config = ToolkitConfig(data_path, schema_path)
    assert config.get_items()[0]["label"] == "Test"
    print("Initial load passed.")

    # 2. Save and Load
    new_data = {"items": [{"label": "Updated", "type": "text", "content": "World"}]}
    assert config.save_config(new_data) is True
    assert os.path.exists(data_path + ".bak")
    
    # Reload to verify
    config2 = ToolkitConfig(data_path, schema_path)
    assert config2.get_items()[0]["label"] == "Updated"
    print("Save and reload passed.")

    # 3. Validation failure
    invalid_data = {"items": [{"label": "Invalid", "type": "wrong_type"}]}
    assert config.save_config(invalid_data) is False
    print("Validation failure test passed.")

    # 4. mtime detection
    time.sleep(0.1) # Ensure mtime difference
    external_data = {"items": [{"label": "External", "type": "text", "content": "External"}]}
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(external_data, f)
    
    assert config.check_for_updates() is True
    assert config.get_items()[0]["label"] == "External"
    print("mtime detection passed.")

    # Cleanup
    os.remove(data_path)
    os.remove(data_path + ".bak")
    print("Cleanup done.")

def test_missing_config_auto_create():
    data_path = "test_menu_missing.json"
    schema_path = "menu_schema.json"
    if os.path.exists(data_path):
        os.remove(data_path)
    if os.path.exists(data_path + ".bak"):
        os.remove(data_path + ".bak")

    config = ToolkitConfig(data_path, schema_path)
    assert os.path.exists(data_path)
    assert len(config.get_items()) > 0

    os.remove(data_path)

if __name__ == "__main__":
    try:
        test_config_cycle()
        test_missing_config_auto_create()
        print("All ToolkitConfig tests passed!")
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
