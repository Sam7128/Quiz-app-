import subprocess
import sys
import time
import argparse

def run_server(capture_output: bool = False):
    print("Starting GhostWriter Server...")
    # Run as a module so relative imports work
    if capture_output:
        return subprocess.Popen(
            [sys.executable, "-m", "ghostwriter.server"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
    return subprocess.Popen([sys.executable, "-m", "ghostwriter.server"])

def run_menu():
    print("Starting Radial Menu Toolkit...")
    from radial_menu.app import run_radial_menu
    run_radial_menu()

def main():
    parser = argparse.ArgumentParser(description="GhostWriter Launcher")
    parser.add_argument("--server-only", action="store_true", help="Start only the Flask server")
    parser.add_argument("--menu-only", action="store_true", help="Start only the Radial Menu toolkit")
    args = parser.parse_args()

    if args.server_only:
        proc = run_server(capture_output=True)
        try:
            for line in proc.stdout:
                print(f"[Server] {line.strip()}")
        except KeyboardInterrupt:
            proc.terminate()
        return

    if args.menu_only:
        run_menu()
        return

    # Start both
    server_proc = run_server(capture_output=False)
    
    # Wait a bit for server to start
    time.sleep(1)
    if server_proc.poll() is not None:
        print(f"[ERROR] GhostWriter Server exited early with code {server_proc.returncode}.")
        return
    
    try:
        run_menu()
    except KeyboardInterrupt:
        pass
    finally:
        print("Shutting down...")
        server_proc.terminate()
        server_proc.wait()

if __name__ == "__main__":
    main()
