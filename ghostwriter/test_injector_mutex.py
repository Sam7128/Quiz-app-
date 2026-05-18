import threading
import time
import sys
import os

# Add parent directory to sys.path to import ghostwriter
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ghostwriter.injector import inject_text
import pyperclip

def test_injector_mutex():
    """Verify that multiple threads calling inject_text don't corrupt clipboard."""
    print("Starting injector mutex test...")
    original_clipboard = "ORIGINAL_CONTENT"
    pyperclip.copy(original_clipboard)
    
    results = []
    
    def worker(text):
        res = inject_text(text)
        results.append(res)

    threads = []
    # Use CJK text to force clipboard mode
    # Note: pyautogui.hotkey('ctrl', 'v') might actually paste into WHATEVER is active.
    # In a headless/terminal test, this might be messy, but the clipboard restoration logic is what we are testing.
    for i in range(10):
        t = threading.Thread(target=worker, args=(f"測試文本_{i}",))
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    # The final clipboard should be the original content
    final_clipboard = pyperclip.paste()
    print(f"Final clipboard: {final_clipboard}")
    
    if final_clipboard == original_clipboard:
        print("Success: Clipboard restored correctly.")
    else:
        print(f"Failure: Clipboard was {final_clipboard}, expected {original_clipboard}")
        sys.exit(1)

    if len(results) == 10:
        print("Success: All injections finished.")
    else:
        print(f"Failure: Only {len(results)} results found.")
        sys.exit(1)

    for r in results:
        if not r["ok"]:
            print(f"Failure: Injection failed: {r}")
            sys.exit(1)
        if r["mode"] != "clipboard":
            print(f"Failure: Unexpected mode: {r['mode']}")
            sys.exit(1)
    
    print("All checks passed.")

if __name__ == "__main__":
    test_injector_mutex()
    print("Test Passed")
