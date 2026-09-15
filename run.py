"""
DoodleClash One-Click Server Launcher
"""

import os
import sys
import subprocess

def main():
    print("\n=======================================================")
    print(" [*] Starting DoodleClash Application ")
    print("=======================================================\n")
    
    desktop_script = os.path.join(os.path.dirname(__file__), "app_desktop.py")
    server_script = os.path.join(os.path.dirname(__file__), "server", "server.py")
    
    try:
        # Prefer native desktop app window
        subprocess.run([sys.executable, desktop_script])
    except Exception:
        # Fallback to server
        subprocess.run([sys.executable, server_script])



if __name__ == "__main__":
    main()
