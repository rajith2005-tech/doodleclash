@echo off
title DoodleClash - Multiplayer Drawing Game
cd /d "%~dp0"
echo Starting DoodleClash Desktop Application...
"C:\Program Files\Python312\python.exe" app_desktop.py
if errorlevel 1 (
    echo An error occurred. Launching browser server fallback...
    "C:\Program Files\Python312\python.exe" run.py
)
pause
