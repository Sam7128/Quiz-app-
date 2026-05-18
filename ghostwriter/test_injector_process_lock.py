import multiprocessing as mp
import os
import sys
import time

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ghostwriter.injector import _acquire_process_clipboard_lock


def _hold_lock_for(duration: float, queue: mp.Queue):
    with _acquire_process_clipboard_lock(timeout=5.0):
        queue.put("locked")
        time.sleep(duration)


def test_cross_process_lock_blocks_second_holder():
    queue = mp.Queue()
    proc = mp.Process(target=_hold_lock_for, args=(0.35, queue))
    proc.start()

    # Wait until child confirms lock ownership.
    queue.get(timeout=2.0)
    start = time.perf_counter()
    with _acquire_process_clipboard_lock(timeout=5.0):
        elapsed = time.perf_counter() - start

    proc.join(timeout=2.0)
    if proc.is_alive():
        proc.terminate()
        proc.join(timeout=1.0)
        raise RuntimeError("Lock-holder process did not exit cleanly")

    # The main process should have waited while child held the lock.
    assert elapsed >= 0.25, f"Expected blocking wait, got {elapsed:.3f}s"
    print("Cross-process clipboard lock test passed!")


if __name__ == "__main__":
    test_cross_process_lock_blocks_second_holder()
