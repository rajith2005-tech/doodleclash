"""
DoodleClash Game State Machine & Logic Engine
"""

import asyncio
import json
import random
import time
from typing import Dict, List, Optional, Any
from words import WORD_CATEGORIES, BOT_DOODLES
from rooms import Room, Player


def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculate edit distance between two normalized strings"""
    s1, s2 = s1.lower().strip(), s2.lower().strip()
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]


def build_masked_word(word: str, revealed_indices: set) -> str:
    """Build masked string preserving spaces and revealing selected characters."""
    masked = []
    for idx, char in enumerate(word):
        if char == " " or char == "-" or char == "'":
            masked.append(char)
        elif idx in revealed_indices:
            masked.append(char)
        else:
            masked.append("_")
    return " ".join(masked)


class GameEngine:
    def __init__(self, broadcast_fn, send_to_fn):
        self.broadcast = broadcast_fn
        self.send_to = send_to_fn

    def get_word_pool(self, room: Room) -> List[Dict[str, Any]]:
        pool = []
        for cat_key in room.settings.get("categories", []):
            if cat_key in WORD_CATEGORIES:
                cat_info = WORD_CATEGORIES[cat_key]
                for item in cat_info["words"]:
                    pool.append({
                        "word": item["word"],
                        "hint": item.get("hint", ""),
                        "difficulty": item.get("difficulty", 1),
                        "category": cat_info["name"]
                    })
        for custom in room.settings.get("custom_words", []):
            if custom.strip():
                pool.append({
                    "word": custom.strip(),
                    "hint": "Custom Word",
                    "difficulty": 2,
                    "category": "Custom Words"
                })
        if not pool:
            # Fallback
            for cat in WORD_CATEGORIES.values():
                for item in cat["words"]:
                    pool.append({
                        "word": item["word"],
                        "hint": item.get("hint", ""),
                        "difficulty": item.get("difficulty", 1),
                        "category": cat["name"]
                    })
        return pool

    def pick_random_words(self, room: Room, count: int = 3) -> List[Dict[str, Any]]:
        pool = self.get_word_pool(room)
        random.shuffle(pool)
        return pool[:min(count, len(pool))]

    async def start_game(self, room: Room):
        if len(room.players) < 1:
            return

        room.state = "WORD_CHOICE"
        room.current_round = 1
        room.drawer_rotation = list(room.players.keys())
        random.shuffle(room.drawer_rotation)
        room.current_drawer_index = 0
        
        # Reset player scores for new game
        for p in room.players.values():
            p.score = 0
            p.streak = 0
            p.correct_guesses = 0
            p.total_drawings = 0

        await self.broadcast(room, {
            "type": "game_started",
            "message": f"Game started! Round 1 of {room.settings['max_rounds']}",
            "room_state": room.to_state_dict()
        })

        await self.start_turn_word_choice(room)

    async def start_turn_word_choice(self, room: Room):
        if room.current_drawer_index >= len(room.drawer_rotation):
            # All drawers finished current round
            room.current_round += 1
            room.current_drawer_index = 0
            if room.current_round > room.settings["max_rounds"]:
                await self.end_game(room)
                return

        # Ensure valid drawer exists
        while room.current_drawer_index < len(room.drawer_rotation):
            drawer_id = room.drawer_rotation[room.current_drawer_index]
            if drawer_id in room.players:
                room.current_drawer_id = drawer_id
                break
            room.current_drawer_index += 1

        if not room.current_drawer_id or room.current_drawer_id not in room.players:
            await self.end_game(room)
            return

        drawer = room.players[room.current_drawer_id]
        room.state = "WORD_CHOICE"
        room.word_choices = self.pick_random_words(room, 3)
        room.drawing_history = []
        room.revealed_indices = set()
        room.time_left = 15

        # Reset per-round player flags
        for p in room.players.values():
            p.round_score = 0
            p.guessed_current_round = False

        await self.broadcast(room, {
            "type": "word_choice_phase",
            "drawer_id": drawer.id,
            "drawer_name": drawer.name,
            "time_left": 15,
            "current_round": room.current_round,
            "max_rounds": room.settings["max_rounds"],
            "room_state": room.to_state_dict()
        })

        # Send private word choices to drawer
        if not drawer.is_bot and drawer.ws:
            await self.send_to(drawer.ws, {
                "type": "your_word_choices",
                "choices": room.word_choices
            })

        # Cancel previous timer if any
        if room.timer_task and not room.timer_task.done():
            room.timer_task.cancel()

        room.timer_task = asyncio.create_task(self._word_choice_timer(room))

    async def _word_choice_timer(self, room: Room):
        try:
            drawer = room.current_drawer
            if drawer and drawer.is_bot:
                # Bot picks within 1.5 seconds
                await asyncio.sleep(1.5)
                chosen = random.choice(room.word_choices)
                await self.start_drawing_phase(room, chosen)
                return

            for remaining in range(15, 0, -1):
                room.time_left = remaining
                await asyncio.sleep(1)

            # Timeout: auto pick first word
            if room.state == "WORD_CHOICE" and room.word_choices:
                await self.start_drawing_phase(room, room.word_choices[0])
        except asyncio.CancelledError:
            pass

    async def choose_word(self, room: Room, player_id: str, word_index: int):
        if room.state != "WORD_CHOICE" or room.current_drawer_id != player_id:
            return
        if 0 <= word_index < len(room.word_choices):
            if room.timer_task and not room.timer_task.done():
                room.timer_task.cancel()
            chosen = room.word_choices[word_index]
            await self.start_drawing_phase(room, chosen)

    async def start_drawing_phase(self, room: Room, word_data: Dict[str, Any]):
        room.state = "DRAWING"
        room.current_word_data = word_data
        word = word_data["word"]
        room.revealed_indices = set()
        room.masked_word = build_masked_word(word, room.revealed_indices)
        room.total_time = room.settings["draw_time"]
        room.time_left = room.total_time
        room.drawing_history = []

        drawer = room.current_drawer
        if drawer:
            drawer.total_drawings += 1

        # Broadcast turn started to all players (with masked word)
        await self.broadcast(room, {
            "type": "turn_started",
            "drawer_id": drawer.id if drawer else "",
            "drawer_name": drawer.name if drawer else "",
            "masked_word": room.masked_word,
            "word_length": len(word.replace(" ", "")),
            "category": word_data.get("category", "General"),
            "hint": word_data.get("hint", "") if room.settings["allow_hints"] else "",
            "time_left": room.time_left,
            "total_time": room.total_time,
            "room_state": room.to_state_dict()
        })

        # Send full secret word to drawer
        if drawer and not drawer.is_bot and drawer.ws:
            await self.send_to(drawer.ws, {
                "type": "secret_word",
                "word": word,
                "hint": word_data.get("hint", ""),
                "category": word_data.get("category", "")
            })

        if room.timer_task and not room.timer_task.done():
            room.timer_task.cancel()
        room.timer_task = asyncio.create_task(self._drawing_timer(room))

        # If drawer is bot, trigger bot drawing loop
        if drawer and drawer.is_bot:
            if room.bot_draw_task and not room.bot_draw_task.done():
                room.bot_draw_task.cancel()
            room.bot_draw_task = asyncio.create_task(self._bot_draw_loop(room, word))

    async def _drawing_timer(self, room: Room):
        try:
            word = room.current_word_data["word"]
            clean_indices = [i for i, c in enumerate(word) if c not in (" ", "-", "'")]
            max_hints = max(1, len(clean_indices) // 2)

            while room.time_left > 0 and room.state == "DRAWING":
                await asyncio.sleep(1)
                room.time_left -= 1

                # Periodic Hint Reveals (e.g. at 60%, 40%, 20% remaining time)
                ratio = room.time_left / room.total_time
                should_reveal = False

                if ratio <= 0.6 and len(room.revealed_indices) < 1 and max_hints >= 1:
                    should_reveal = True
                elif ratio <= 0.4 and len(room.revealed_indices) < 2 and max_hints >= 2:
                    should_reveal = True
                elif ratio <= 0.2 and len(room.revealed_indices) < max_hints:
                    should_reveal = True

                if should_reveal and room.settings.get("allow_hints", True):
                    unrevealed = [i for i in clean_indices if i not in room.revealed_indices]
                    if unrevealed:
                        idx_to_reveal = random.choice(unrevealed)
                        room.revealed_indices.add(idx_to_reveal)
                        room.masked_word = build_masked_word(word, room.revealed_indices)
                        await self.broadcast(room, {
                            "type": "hint_revealed",
                            "masked_word": room.masked_word,
                            "revealed_index": idx_to_reveal
                        })

                # Tick broadcast
                await self.broadcast(room, {
                    "type": "timer_tick",
                    "time_left": room.time_left
                })

                # If bot players are guessing in the room, simulate periodic bot guesses
                bot_guessers = [p for p in room.players.values() if p.is_bot and p.id != room.current_drawer_id and not p.guessed_current_round]
                if bot_guessers and random.random() < 0.15 and room.time_left < (room.total_time * 0.75):
                    bot = random.choice(bot_guessers)
                    # 40% chance bot gets it right when it decides to guess
                    if random.random() < 0.4:
                        await self.handle_guess(room, bot, word)

            if room.state == "DRAWING":
                await self.end_drawing_turn(room, reason="time_up")
        except asyncio.CancelledError:
            pass

    async def _bot_draw_loop(self, room: Room, word: str):
        """Simulate dynamic human-like vector drawing by the AI bot"""
        try:
            # Look up predefined doodle or fallback
            strokes = BOT_DOODLES.get(word, BOT_DOODLES.get("Default"))
            await asyncio.sleep(1.0)

            for stroke_idx, stroke in enumerate(strokes):
                if room.state != "DRAWING":
                    break
                points = stroke["points"]
                color = stroke.get("color", "#2c3e50")
                size = stroke.get("size", 5)

                if not points:
                    continue

                # Start stroke
                start_action = {
                    "type": "draw_action",
                    "action": "start",
                    "x": points[0][0],
                    "y": points[0][1],
                    "color": color,
                    "size": size,
                    "tool": stroke.get("tool", "brush")
                }
                room.drawing_history.append(start_action)
                await self.broadcast(room, start_action)
                await asyncio.sleep(0.08)

                for pt in points[1:]:
                    if room.state != "DRAWING":
                        break
                    step_action = {
                        "type": "draw_action",
                        "action": "step",
                        "x": pt[0],
                        "y": pt[1],
                        "color": color,
                        "size": size,
                        "tool": stroke.get("tool", "brush")
                    }
                    room.drawing_history.append(step_action)
                    await self.broadcast(room, step_action)
                    await asyncio.sleep(0.12)

                end_action = {
                    "type": "draw_action",
                    "action": "end"
                }
                room.drawing_history.append(end_action)
                await self.broadcast(room, end_action)
                await asyncio.sleep(0.3)

        except asyncio.CancelledError:
            pass

    async def handle_guess(self, room: Room, player: Player, raw_guess: str):
        if room.state != "DRAWING" or not room.current_word_data:
            return

        # Drawer cannot guess
        if player.id == room.current_drawer_id:
            return

        # Already guessed players cannot guess again
        if player.guessed_current_round:
            # Mask their chat to other players who haven't guessed yet
            await self.broadcast(room, {
                "type": "chat_message",
                "player_id": player.id,
                "player_name": player.name,
                "message": raw_guess,
                "is_guessed": True
            })
            return

        guess_clean = raw_guess.strip().lower()
        target_word = room.current_word_data["word"].strip().lower()

        # Check Exact Match
        if guess_clean == target_word:
            player.guessed_current_round = True
            player.correct_guesses += 1
            player.streak += 1

            # Score calculation
            speed_ratio = max(0.1, room.time_left / room.total_time)
            base_pts = 250
            speed_bonus = int(250 * speed_ratio)
            streak_bonus = min(150, player.streak * 25)
            total_earned = base_pts + speed_bonus + streak_bonus

            player.score += total_earned
            player.round_score = total_earned

            # Award points to drawer
            drawer = room.current_drawer
            if drawer:
                drawer_pts = 60 + int(30 * speed_ratio)
                drawer.score += drawer_pts
                drawer.round_score += drawer_pts

            await self.broadcast(room, {
                "type": "player_guessed_correctly",
                "player_id": player.id,
                "player_name": player.name,
                "points": total_earned,
                "streak": player.streak,
                "room_state": room.to_state_dict()
            })

            # Check if all eligible guessers have guessed
            non_drawers = [p for p in room.players.values() if p.id != room.current_drawer_id]
            all_guessed = non_drawers and all(p.guessed_current_round for p in non_drawers)
            if all_guessed:
                await self.end_drawing_turn(room, reason="all_guessed")
            return

        # Check Close Guess (fuzzy matching)
        if len(target_word) >= 4:
            dist = levenshtein_distance(guess_clean, target_word)
            if dist <= (1 if len(target_word) <= 5 else 2):
                if not player.is_bot and player.ws:
                    await self.send_to(player.ws, {
                        "type": "close_guess_hint",
                        "message": f"'{raw_guess}' is very close!"
                    })
                return

        # Regular Chat Message
        await self.broadcast(room, {
            "type": "chat_message",
            "player_id": player.id,
            "player_name": player.name,
            "message": raw_guess,
            "is_guessed": False
        })

    async def end_drawing_turn(self, room: Room, reason: str = "time_up"):
        if room.timer_task and not room.timer_task.done():
            room.timer_task.cancel()
        if room.bot_draw_task and not room.bot_draw_task.done():
            room.bot_draw_task.cancel()

        room.state = "ROUND_END"
        word_revealed = room.current_word_data["word"] if room.current_word_data else "Unknown"

        # Break streaks for players who didn't guess
        for p in room.players.values():
            if p.id != room.current_drawer_id and not p.guessed_current_round:
                p.streak = 0

        # Sort leaderboard
        leaderboard = sorted(room.players.values(), key=lambda p: p.score, reverse=True)

        await self.broadcast(room, {
            "type": "turn_ended",
            "word": word_revealed,
            "hint": room.current_word_data.get("hint", "") if room.current_word_data else "",
            "reason": reason,
            "leaderboard": [p.to_dict() for p in leaderboard],
            "room_state": room.to_state_dict()
        })

        # Wait 4.5 seconds on the round summary screen before next turn
        await asyncio.sleep(4.5)

        room.current_drawer_index += 1
        await self.start_turn_word_choice(room)

    async def end_game(self, room: Room):
        if room.timer_task and not room.timer_task.done():
            room.timer_task.cancel()
        if room.bot_draw_task and not room.bot_draw_task.done():
            room.bot_draw_task.cancel()

        room.state = "GAME_OVER"
        sorted_players = sorted(room.players.values(), key=lambda p: p.score, reverse=True)

        # Highlight special achievements
        podium = [p.to_dict() for p in sorted_players[:3]]
        
        # Awards
        awards = []
        if sorted_players:
            awards.append({"title": "🏆 Champion", "player": sorted_players[0].name, "desc": f"Scored {sorted_players[0].score} points!"})
        
        best_guesser = max(room.players.values(), key=lambda p: p.correct_guesses, default=None)
        if best_guesser and best_guesser.correct_guesses > 0:
            awards.append({"title": "🎯 Guessing Prodigy", "player": best_guesser.name, "desc": f"{best_guesser.correct_guesses} correct guesses"})

        await self.broadcast(room, {
            "type": "game_over",
            "podium": podium,
            "awards": awards,
            "all_players": [p.to_dict() for p in sorted_players],
            "room_state": room.to_state_dict()
        })
