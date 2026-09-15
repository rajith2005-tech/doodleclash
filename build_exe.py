"""
DoodleClash Standalone Windows Executable / Setup Builder
Compiles the full stack game into a single standalone Windows EXE file
"""

import os
import sys
import subprocess
import shutil

def build():
    print("\n=======================================================")
    print(" [*] Building DoodleClash Standalone Windows Executable ")
    print("=======================================================\n")
    
    project_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(project_dir, "dist")
    build_dir = os.path.join(project_dir, "build")

    pyinstaller_cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--windowed",
        "--name", "DoodleClash",
        "--add-data", f"{os.path.join(project_dir, 'client')};client",
        "--add-data", f"{os.path.join(project_dir, 'server')};server",
        "--hidden-import", "websockets",
        "--hidden-import", "websockets.legacy",
        "--hidden-import", "websockets.legacy.server",
        "--hidden-import", "websockets.asyncio",
        "--hidden-import", "websockets.asyncio.server",
        "--hidden-import", "webview",
        "--hidden-import", "clr",
        "--hidden-import", "pythonnet",
        "--hidden-import", "http.server",
        os.path.join(project_dir, "app_desktop.py")
    ]

    print("[*] Running PyInstaller compilation...")
    result = subprocess.run(pyinstaller_cmd, cwd=project_dir)
    
    if result.returncode == 0:
        exe_path = os.path.join(dist_dir, "DoodleClash", "DoodleClash.exe")
        print("\n=======================================================")
        print(" [SUCCESS] DoodleClash Standalone Executable Created!")
        print(f" Executable: {exe_path}")
        print("=======================================================\n")
    else:
        print("\n[!] Build failed with exit code:", result.returncode)

if __name__ == "__main__":
    build()
