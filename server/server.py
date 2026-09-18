"""
DoodleClash Full-Stack Server
Combines HTTP Static File Server & Real-Time WebSocket Server
"""

import asyncio
import functools
import json
import logging
import mimetypes
import os
import sys
import threading
import time
import uuid
import select
import socket
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from typing import Dict, Any

try:
    import websockets
    from websockets.asyncio.server import serve as ws_serve
except ImportError:
    import websockets
    from websockets.server import serve as ws_serve

from rooms import RoomManager, Player, Room
from game import GameEngine
from words import WORD_CATEGORIES

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
logger = logging.getLogger("DoodleClash")

if getattr(sys, 'frozen', False):
    BASE_DIR = getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
    CLIENT_DIR = os.path.join(BASE_DIR, "client")
else:
    CLIENT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "client"))


# Global Server Ports & Managers
HTTP_PORT = 8000
WS_PORT = 8001
room_manager = RoomManager()
# Map websocket connections to player id
ws_to_player: Dict[Any, Player] = {}


def get_local_lan_ip() -> str:
    """Auto-detect machine's primary local network (LAN) IP address"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        # Connect to public DNS without actually sending packets
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


async def send_to_client(ws, data: dict):
    if ws is None:
        return
    try:
        msg = json.dumps(data)
        await ws.send(msg)
    except Exception as e:
        logger.warning(f"Error sending message: {e}")


async def broadcast_to_room(room: Room, data: dict, exclude_ws=None):
    msg = json.dumps(data)
    dead_connections = []
    for player in list(room.players.values()):
        if player.is_bot or player.ws is None or player.ws == exclude_ws:
            continue
        try:
            await player.ws.send(msg)
        except Exception as e:
            logger.warning(f"Failed broadcasting to {player.name}: {e}")
            dead_connections.append(player.id)

    for pid in dead_connections:
        room_manager.leave_room(pid)


game_engine = GameEngine(broadcast_fn=broadcast_to_room, send_to_fn=send_to_client)


async def handle_ws_message(ws, raw_message: str):
    try:
        payload = json.loads(raw_message)
    except json.JSONDecodeError:
        return

    msg_type = payload.get("type")
    player = ws_to_player.get(ws)

    # PING / HEARTBEAT
    if msg_type == "ping":
        await send_to_client(ws, {"type": "pong", "time": time.time()})
        return

    # GET CATEGORIES & CONFIG
    if msg_type == "get_categories":
        categories_data = {
            k: {"name": v["name"], "count": len(v["words"])}
            for k, v in WORD_CATEGORIES.items()
        }
        await send_to_client(ws, {
            "type": "categories_list",
            "categories": categories_data
        })
        return

    # GET PUBLIC ROOMS
    if msg_type == "get_public_rooms":
        public_rooms = room_manager.get_public_rooms()
        await send_to_client(ws, {
            "type": "public_rooms_list",
            "rooms": public_rooms
        })
        return

    # CREATE ROOM
    if msg_type == "create_room":
        player_name = (payload.get("name") or "Player").strip()[:18] or "Player"
        avatar = payload.get("avatar") or "🦊"
        room_name = (payload.get("room_name") or f"{player_name}'s Room").strip()[:24]
        is_public = bool(payload.get("is_public", True))

        player_id = str(uuid.uuid4())[:8]
        new_player = Player(player_id, ws, player_name, avatar, is_bot=False)
        ws_to_player[ws] = new_player

        room = room_manager.create_room(new_player, room_name=room_name, is_public=is_public)

        # Apply optional custom settings
        custom_settings = payload.get("settings")
        if isinstance(custom_settings, dict):
            for k in ["max_rounds", "draw_time", "categories", "custom_words", "max_players", "allow_hints"]:
                if k in custom_settings:
                    room.settings[k] = custom_settings[k]

        logger.info(f"Room created: {room.code} by {player_name}")

        await send_to_client(ws, {
            "type": "room_joined",
            "room_code": room.code,
            "player_id": player_id,
            "is_host": True,
            "room_state": room.to_state_dict(),
            "drawing_history": room.drawing_history
        })
        return

    # JOIN ROOM
    if msg_type == "join_room":
        code = (payload.get("code") or "").strip().upper()
        player_name = (payload.get("name") or "Player").strip()[:18] or "Player"
        avatar = payload.get("avatar") or "🐱"

        room = room_manager.get_room(code)
        if not room:
            await send_to_client(ws, {
                "type": "error",
                "message": f"Room '{code}' was not found."
            })
            return

        if len(room.players) >= room.settings["max_players"]:
            await send_to_client(ws, {
                "type": "error",
                "message": "Room is full!"
            })
            return

        player_id = str(uuid.uuid4())[:8]
        new_player = Player(player_id, ws, player_name, avatar, is_bot=False)
        ws_to_player[ws] = new_player

        if not room_manager.join_room(code, new_player):
            await send_to_client(ws, {
                "type": "error",
                "message": "Failed to join room."
            })
            return

        logger.info(f"Player {player_name} joined room {code}")

        # Notify joining player
        await send_to_client(ws, {
            "type": "room_joined",
            "room_code": room.code,
            "player_id": player_id,
            "is_host": (room.host_id == player_id),
            "room_state": room.to_state_dict(),
            "drawing_history": room.drawing_history
        })

        # Broadcast player joined to room
        await broadcast_to_room(room, {
            "type": "player_joined",
            "player": new_player.to_dict(),
            "room_state": room.to_state_dict()
        }, exclude_ws=ws)
        return

    # All actions below require the player to be in a room
    if not player:
        return

    room = room_manager.get_player_room(player.id)
    if not room:
        return

    # UPDATE SETTINGS (Host only)
    if msg_type == "update_settings":
        if room.host_id != player.id or room.state != "LOBBY":
            return
        settings_update = payload.get("settings", {})
        for k in ["max_rounds", "draw_time", "categories", "custom_words", "max_players", "allow_hints"]:
            if k in settings_update:
                room.settings[k] = settings_update[k]

        await broadcast_to_room(room, {
            "type": "settings_updated",
            "settings": room.settings,
            "room_state": room.to_state_dict()
        })
        return

    # TOGGLE READY
    if msg_type == "toggle_ready":
        player.is_ready = not player.is_ready
        await broadcast_to_room(room, {
            "type": "player_status_changed",
            "player_id": player.id,
            "is_ready": player.is_ready,
            "room_state": room.to_state_dict()
        })
        return

    # ADD BOT PLAYER
    if msg_type == "add_bot":
        if room.host_id != player.id:
            return
        bot_names = ["DoodleBot 🤖", "PixelBot 👾", "SketchyBot 🎨", "CyberArt ⚡", "RoboPicasso 🎩"]
        bot_avatars = ["🤖", "👾", "🦊", "🐼", "🦄", "🦁"]
        existing_bot_count = sum(1 for p in room.players.values() if p.is_bot)
        bot_name = bot_names[existing_bot_count % len(bot_names)]
        bot_avatar = bot_avatars[existing_bot_count % len(bot_avatars)]

        bot_id = f"bot_{uuid.uuid4().hex[:6]}"
        bot_player = Player(bot_id, None, bot_name, bot_avatar, is_bot=True)
        bot_player.is_ready = True
        room.add_player(bot_player)

        await broadcast_to_room(room, {
            "type": "bot_added",
            "player": bot_player.to_dict(),
            "room_state": room.to_state_dict()
        })
        return

    # REMOVE BOT
    if msg_type == "remove_bot":
        if room.host_id != player.id:
            return
        bot_id = payload.get("bot_id")
        if bot_id and bot_id in room.players and room.players[bot_id].is_bot:
            room.remove_player(bot_id)
            await broadcast_to_room(room, {
                "type": "player_left",
                "player_id": bot_id,
                "room_state": room.to_state_dict()
            })
        return

    # START GAME (Host only)
    if msg_type == "start_game":
        if room.host_id != player.id:
            return
        if len(room.players) < 1:
            return
        await game_engine.start_game(room)
        return

    # RESTART GAME (Host only)
    if msg_type == "restart_game":
        if room.host_id != player.id:
            return
        await game_engine.start_game(room)
        return

    # CHOOSE WORD (Drawer only)
    if msg_type == "choose_word":
        word_index = payload.get("word_index", 0)
        await game_engine.choose_word(room, player.id, word_index)
        return

    # DRAW ACTION (Drawer only)
    if msg_type == "draw_action":
        if room.state != "DRAWING" or room.current_drawer_id != player.id:
            return
        action = payload.get("action")
        # Save to drawing history
        if action == "clear":
            room.drawing_history = [payload]
        elif action in ("start", "step", "end", "fill", "undo"):
            room.drawing_history.append(payload)

        # Broadcast stroke/action to everyone else in the room
        await broadcast_to_room(room, payload, exclude_ws=ws)
        return

    # CHAT / GUESS
    if msg_type == "chat_message":
        raw_text = (payload.get("message") or "").strip()
        if not raw_text:
            return
        await game_engine.handle_guess(room, player, raw_text)
        return

    # FLOATING EMOJI REACTION
    if msg_type == "reaction":
        emoji = payload.get("emoji", "🔥")
        await broadcast_to_room(room, {
            "type": "reaction",
            "emoji": emoji,
            "player_name": player.name
        })
        return

    # LEAVE ROOM
    if msg_type == "leave_room":
        old_room = room_manager.leave_room(player.id)
        ws_to_player.pop(ws, None)
        if old_room:
            await broadcast_to_room(old_room, {
                "type": "player_left",
                "player_id": player.id,
                "player_name": player.name,
                "room_state": old_room.to_state_dict()
            })
        await send_to_client(ws, {"type": "left_room"})
        return


async def ws_handler(ws):
    logger.info("Client connected via WebSocket")
    try:
        async for message in ws:
            await handle_ws_message(ws, message)
    except Exception as e:
        logger.info(f"WebSocket closed or error: {e}")
    finally:
        player = ws_to_player.pop(ws, None)
        if player:
            room = room_manager.leave_room(player.id)
            if room:
                await broadcast_to_room(room, {
                    "type": "player_left",
                    "player_id": player.id,
                    "player_name": player.name,
                    "room_state": room.to_state_dict()
                })


class CustomHTTPHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=CLIENT_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS and caching headers
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        # 1. Check for WebSocket Upgrade (Transparent Single-Port Reverse Proxy)
        upgrade_hdr = self.headers.get("Upgrade", "").lower()
        if upgrade_hdr == "websocket":
            self._proxy_websocket()
            return

        # 2. REST API: Network & Server Info for Local / Online Multiplayer
        if self.path.startswith("/api/network_info") or self.path.startswith("/api/info"):
            self._handle_network_info()
            return

        # 3. Standard Static File Serving
        super().do_GET()

    def _handle_network_info(self):
        local_ip = get_local_lan_ip()
        info = {
            "status": "online",
            "version": "2.0.0",
            "local_ip": local_ip,
            "http_port": HTTP_PORT,
            "ws_port": WS_PORT,
            "lan_url": f"http://{local_ip}:{HTTP_PORT}",
            "local_ws_url": f"ws://{local_ip}:{WS_PORT}",
            "single_port_ws": True,
            "active_rooms": len(room_manager.rooms),
            "public_rooms": room_manager.get_public_rooms(),
            "total_players": len(ws_to_player)
        }
        body = json.dumps(info, indent=2).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _proxy_websocket(self):
        """Bidirectionally pipe client TCP connection to backend WebSocket server"""
        backend = None
        client_sock = self.connection
        try:
            backend = socket.create_connection(("127.0.0.1", WS_PORT), timeout=5)
            # Forward raw request line and headers
            req_line = f"{self.command} {self.path} {self.request_version}\r\n".encode("iso-8859-1")
            headers_raw = self.headers.as_bytes()
            backend.sendall(req_line + headers_raw + b"\r\n")

            self.close_connection = True
            sockets = [client_sock, backend]
            while True:
                readable, _, exceptional = select.select(sockets, [], sockets, 60.0)
                if exceptional:
                    break
                if not readable:
                    continue
                for s in readable:
                    data = s.recv(65536)
                    if not data:
                        return
                    target = backend if s is client_sock else client_sock
                    target.sendall(data)
        except Exception as e:
            logger.debug(f"WebSocket proxy connection ended: {e}")
        finally:
            if backend:
                try:
                    backend.close()
                except Exception:
                    pass

    def log_message(self, format, *args):
        pass  # Quiet down HTTP logs


def start_http_server(host="0.0.0.0", port=8000):
    global HTTP_PORT
    HTTP_PORT = port
    httpd = ThreadingHTTPServer((host, port), CustomHTTPHandler)
    logger.info(f"HTTP Server serving '{CLIENT_DIR}' at http://localhost:{port}")
    http_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    http_thread.start()
    return httpd


async def main(host="0.0.0.0", http_port=8000, ws_port=8001):
    global HTTP_PORT, WS_PORT
    HTTP_PORT = http_port
    WS_PORT = ws_port

    start_http_server(host, http_port)
    local_lan = get_local_lan_ip()
    logger.info(f"Starting WebSocket server on ws://{host}:{ws_port}")
    async with ws_serve(ws_handler, host, ws_port):
        print("\n=======================================================")
        print(" [*] DoodleClash Multiplayer Server is Running!")
        print(f" [>] Local Browser:      http://localhost:{http_port}")
        print(f" [>] Local LAN / Wi-Fi:  http://{local_lan}:{http_port}")
        print(f" [>] WebSocket Ports:    Port {http_port} (Unified) & Port {ws_port}")
        print("=======================================================\n")
        await asyncio.Future()  # Run forever



if __name__ == "__main__":
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutting down DoodleClash server...")

