"""
DoodleClash End-to-End Automated Integration Test
Tests HTTP server asset serving and WebSocket multiplayer game lifecycle
"""

import asyncio
import json
import urllib.request
import websockets

def test_http_server():
    print("[1/2] Testing HTTP static file server...")
    urls = [
        "http://localhost:8000/",
        "http://localhost:8000/style.css",
        "http://localhost:8000/canvas.js",
        "http://localhost:8000/audio.js",
        "http://localhost:8000/app.js"
    ]
    for u in urls:
        req = urllib.request.urlopen(u)
        status = req.getcode()
        content = req.read()
        assert status == 200, f"Expected 200 for {u}, got {status}"
        assert len(content) > 0, f"Empty content for {u}"
        print(f"  [OK] GET {u} ({len(content)} bytes)")
    print("  --> HTTP static file server is fully operational!\n")


async def test_websocket_multiplayer():
    print("[2/2] Testing WebSocket multiplayer game lifecycle...")
    ws_url = "ws://localhost:8001"

    # Client 1: Host / Alice
    async with websockets.connect(ws_url) as ws_alice:
        # 1. Create Room
        await ws_alice.send(json.dumps({
            "type": "create_room",
            "name": "Alice",
            "avatar": "🦊",
            "room_name": "Test Wonderland",
            "is_public": True,
            "settings": {
                "max_rounds": 2,
                "draw_time": 45,
                "categories": ["animals", "food"]
            }
        }))
        res = json.loads(await ws_alice.recv())
        assert res["type"] == "room_joined", f"Expected room_joined, got {res}"
        room_code = res["room_code"]
        alice_id = res["player_id"]
        print(f"  [OK] Alice created room: {room_code} (ID: {alice_id})")

        # Client 2: Bob joining room
        async with websockets.connect(ws_url) as ws_bob:
            await ws_bob.send(json.dumps({
                "type": "join_room",
                "code": room_code,
                "name": "Bob",
                "avatar": "🐼"
            }))
            res_bob = json.loads(await ws_bob.recv())
            assert res_bob["type"] == "room_joined", f"Expected room_joined for Bob, got {res_bob}"
            bob_id = res_bob["player_id"]
            print(f"  [OK] Bob joined room: {room_code} (ID: {bob_id})")

            # Alice receives player_joined broadcast
            res_alice_notify = json.loads(await ws_alice.recv())
            assert res_alice_notify["type"] == "player_joined"
            print(f"  [OK] Alice received Bob's join notification")

            # Alice starts the game
            await ws_alice.send(json.dumps({"type": "start_game"}))

            # Both receive game_started and word_choice_phase
            msg1 = json.loads(await ws_alice.recv())  # game_started
            msg2 = json.loads(await ws_alice.recv())  # word_choice_phase
            assert msg2["type"] == "word_choice_phase"
            drawer_id = msg2["drawer_id"]
            print(f"  [OK] Game started! Current Drawer is: {drawer_id}")

            # Drawer receives secret word choices
            drawer_ws = ws_alice if drawer_id == alice_id else ws_bob
            guesser_ws = ws_bob if drawer_id == alice_id else ws_alice

            choices_msg = json.loads(await drawer_ws.recv())
            assert choices_msg["type"] == "your_word_choices"
            choices = choices_msg["choices"]
            assert len(choices) == 3, f"Expected 3 choices, got {len(choices)}"
            print(f"  [OK] Drawer received word choices: {[c['word'] for c in choices]}")

            # Drawer picks choice 0
            chosen_word = choices[0]["word"]
            await drawer_ws.send(json.dumps({
                "type": "choose_word",
                "word_index": 0
            }))

            # Guesser receives turn_started with masked word
            turn_msg = json.loads(await guesser_ws.recv())
            while turn_msg.get("type") != "turn_started":
                turn_msg = json.loads(await guesser_ws.recv())
            assert turn_msg["type"] == "turn_started"
            assert "_" in turn_msg["masked_word"]
            print(f"  [OK] Guesser received masked word: '{turn_msg['masked_word']}'")

            # Drawer sends drawing stroke
            stroke = {
                "type": "draw_action",
                "action": "start",
                "tool": "brush",
                "color": "#6366f1",
                "size": 6,
                "x": 0.5,
                "y": 0.5
            }
            await drawer_ws.send(json.dumps(stroke))
            remote_stroke = json.loads(await guesser_ws.recv())
            assert remote_stroke["action"] == "start"
            print(f"  [OK] Live drawing stroke synchronized from drawer to guesser")

            # Guesser guesses correctly
            await guesser_ws.send(json.dumps({
                "type": "chat_message",
                "message": chosen_word
            }))

            guess_result = json.loads(await guesser_ws.recv())
            assert guess_result["type"] == "player_guessed_correctly"
            print(f"  [OK] Guesser successfully guessed '{chosen_word}'! Points awarded: {guess_result['points']}")

            # Floating reaction
            await guesser_ws.send(json.dumps({
                "type": "reaction",
                "emoji": "🔥"
            }))
            reaction_msg = json.loads(await drawer_ws.recv())
            while reaction_msg.get("type") != "reaction":
                reaction_msg = json.loads(await drawer_ws.recv())
            assert reaction_msg["emoji"] == "🔥"
            print(f"  [OK] Floating emoji reaction synchronized")

    print("  --> WebSocket game lifecycle fully verified!\n")


def main():
    test_http_server()
    asyncio.run(test_websocket_multiplayer())
    print("=======================================================")
    print(" ALL TESTS PASSED! DoodleClash Full-Stack App is 100% OK ")
    print("=======================================================")

if __name__ == "__main__":
    main()
