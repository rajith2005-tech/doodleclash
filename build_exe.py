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
        "--hidden-import", "select",
        "--hidden-import", "socket",
        os.path.join(project_dir, "app_desktop.py")
    ]

    print("[*] Running PyInstaller compilation for DoodleClash folder...")
    result = subprocess.run(pyinstaller_cmd, cwd=project_dir)
    
    if result.returncode == 0:
        exe_path = os.path.join(dist_dir, "DoodleClash", "DoodleClash.exe")
        print("  [OK] DoodleClash folder built at:", exe_path)
    else:
        print("\n[!] Folder build failed with exit code:", result.returncode)

    # 2. Build Standalone OneFile Setup Executable
    print("\n[*] Running PyInstaller compilation for DoodleClash_Setup.exe...")
    setup_cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        os.path.join(project_dir, "DoodleClash_Setup.spec")
    ]
    result_setup = subprocess.run(setup_cmd, cwd=project_dir)

    if result_setup.returncode == 0:
        setup_exe = os.path.join(dist_dir, "DoodleClash_Setup.exe")
        print("\n=======================================================")
        print(" [SUCCESS] DoodleClash Distribution Fully Updated!")
        print(f" Standalone Setup: {setup_exe}")
        print(f" Directory Bundle: {os.path.join(dist_dir, 'DoodleClash')}")
        print("=======================================================\n")
    else:
        print("\n[!] Setup build failed with exit code:", result_setup.returncode)

if __name__ == "__main__":
    build()
