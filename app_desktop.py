"""
DoodleClash Standalone Desktop Application Window
Powered by PyWebView (Chromium WebView2 Native Window)
"""

import os
import sys
import threading
import time
import asyncio
import webview

if getattr(sys, 'frozen', False):
    BASE_DIR = getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
    SERVER_DIR = os.path.join(BASE_DIR, "server")
else:
    BASE_DIR = os.path.dirname(__file__)
    SERVER_DIR = os.path.join(BASE_DIR, "server")

if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import server


def start_server_in_thread():
    """Runs the asyncio server in a daemon background thread"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(server.main(host="0.0.0.0", http_port=8000, ws_port=8001))
    except Exception as e:
        print(f"[Server Error] {e}")

def main():
    print("[*] Starting DoodleClash Desktop Application...")
    
    # Start background server
    t = threading.Thread(target=start_server_in_thread, daemon=True)
    t.start()

    # Give the server a brief moment to bind sockets
    time.sleep(1.0)

    # Launch Native App Window
    window = webview.create_window(
        title="DoodleClash 🎨 - Multiplayer Drawing Game",
        url="http://localhost:8000",
        width=1280,
        height=820,
        min_size=(960, 640),
        background_color="#0a0e17",
        text_select=True
    )

    webview.start(gui="edgechromium", debug=False)
    print("[*] DoodleClash Desktop Window Closed.")

if __name__ == "__main__":
    main()
