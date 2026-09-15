"""
DoodleClash Room & Player Management
"""

import random
import string
import time
from typing import Dict, List, Optional, Any


class Player:
    def __init__(self, player_id: str, ws: Any, name: str, avatar: str = "🦊", is_bot: bool = False):
        self.id = player_id
        self.ws = ws
        self.name = name
        self.avatar = avatar
        self.is_bot = is_bot
        self.is_host = False
        self.is_ready = False
        self.score = 0
        self.round_score = 0
        self.correct_guesses = 0
        self.total_drawings = 0
        self.streak = 0
        self.guessed_current_round = False
        self.guess_time = 0.0
        self.joined_at = time.time()

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "avatar": self.avatar,
            "is_bot": self.is_bot,
            "is_host": self.is_host,
            "is_ready": self.is_ready,
            "score": self.score,
            "round_score": self.round_score,
            "streak": self.streak,
            "guessed": self.guessed_current_round
        }


class Room:
    def __init__(self, code: str, host_player: Player, room_name: Optional[str] = None, is_public: bool = True):
        self.code = code
        self.name = room_name or f"Room #{code}"
        self.is_public = is_public
        self.created_at = time.time()
        
        # Room Settings
        self.settings = {
            "max_rounds": 3,
            "draw_time": 60,
            "categories": ["animals", "food", "objects", "tech", "nature", "fantasy"],
            "custom_words": [],
            "max_players": 10,
            "allow_hints": True
        }
        
        # Player storage
        self.players: Dict[str, Player] = {}
        self.host_id = host_player.id
        host_player.is_host = True
        host_player.is_ready = True
        self.players[host_player.id] = host_player
        
        # Game State
        self.state = "LOBBY"  # LOBBY, WORD_CHOICE, DRAWING, ROUND_END, GAME_OVER
        self.current_round = 1
        self.drawer_rotation: List[str] = []
        self.current_drawer_index = 0
        self.current_drawer_id: Optional[str] = None
        self.current_word_data: Optional[Dict[str, Any]] = None
        self.word_choices: List[Dict[str, Any]] = []
        self.masked_word = ""
        self.revealed_indices: set = set()
        self.time_left = 60
        self.total_time = 60
        self.drawing_history: List[Dict[str, Any]] = []
        self.timer_task = None
        self.bot_draw_task = None

    @property
    def player_count(self) -> int:
        return len(self.players)

    @property
    def current_drawer(self) -> Optional[Player]:
        if self.current_drawer_id and self.current_drawer_id in self.players:
            return self.players[self.current_drawer_id]
        return None

    def add_player(self, player: Player) -> bool:
        if len(self.players) >= self.settings["max_players"] and not player.is_bot:
            return False
        self.players[player.id] = player
        return True

    def remove_player(self, player_id: str) -> Optional[Player]:
        if player_id in self.players:
            removed = self.players.pop(player_id)
            if player_id in self.drawer_rotation:
                self.drawer_rotation.remove(player_id)
            # Reassign host if host leaves
            if self.host_id == player_id and self.players:
                # Pick next non-bot player or any player
                human_players = [p for p in self.players.values() if not p.is_bot]
                next_host = human_players[0] if human_players else list(self.players.values())[0]
                self.host_id = next_host.id
                next_host.is_host = True
            return removed
        return None

    def get_public_info(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "name": self.name,
            "state": self.state,
            "player_count": len(self.players),
            "max_players": self.settings["max_players"],
            "current_round": self.current_round,
            "max_rounds": self.settings["max_rounds"],
            "host_name": self.players[self.host_id].name if self.host_id in self.players else "Unknown"
        }

    def to_state_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "name": self.name,
            "state": self.state,
            "host_id": self.host_id,
            "settings": self.settings,
            "current_round": self.current_round,
            "max_rounds": self.settings["max_rounds"],
            "drawer_id": self.current_drawer_id,
            "drawer_name": self.current_drawer.name if self.current_drawer else "",
            "time_left": self.time_left,
            "total_time": self.total_time,
            "masked_word": self.masked_word,
            "category": self.current_word_data.get("category", "") if self.current_word_data else "",
            "hint": self.current_word_data.get("hint", "") if (self.current_word_data and self.settings["allow_hints"]) else "",
            "players": [p.to_dict() for p in self.players.values()],
            "is_public": self.is_public
        }


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}
        self.player_room_map: Dict[str, str] = {}

    def generate_room_code(self) -> str:
        for _ in range(100):
            code = "".join(random.choices(string.ascii_uppercase, k=6))
            if code not in self.rooms:
                return code
        return f"R{int(time.time()) % 100000:05d}"

    def create_room(self, host_player: Player, room_name: Optional[str] = None, is_public: bool = True) -> Room:
        code = self.generate_room_code()
        room = Room(code, host_player, room_name, is_public)
        self.rooms[code] = room
        self.player_room_map[host_player.id] = code
        return room

    def get_room(self, code: str) -> Optional[Room]:
        return self.rooms.get(code.upper().strip())

    def get_player_room(self, player_id: str) -> Optional[Room]:
        code = self.player_room_map.get(player_id)
        if code:
            return self.rooms.get(code)
        return None

    def join_room(self, code: str, player: Player) -> Optional[Room]:
        room = self.get_room(code)
        if not room:
            return None
        if not room.add_player(player):
            return None
        self.player_room_map[player.id] = room.code
        return room

    def leave_room(self, player_id: str) -> Optional[Room]:
        code = self.player_room_map.pop(player_id, None)
        if not code or code not in self.rooms:
            return None
        room = self.rooms[code]
        room.remove_player(player_id)
        if room.player_count == 0:
            if room.timer_task and not room.timer_task.done():
                room.timer_task.cancel()
            if room.bot_draw_task and not room.bot_draw_task.done():
                room.bot_draw_task.cancel()
            self.rooms.pop(code, None)
        return room

    def get_public_rooms(self) -> List[Dict[str, Any]]:
        return [
            room.get_public_info()
            for room in self.rooms.values()
            if room.is_public and room.player_count > 0
        ]
