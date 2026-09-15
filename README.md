# 🎨 DoodleClash

<div align="center">

![DoodleClash Banner](https://img.shields.io/badge/DoodleClash-Multiplayer%20Drawing%20Game-6366f1?style=for-the-badge&logo=artstation&logoColor=white)
<br/>

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![WebSockets](https://img.shields.io/badge/RealTime-WebSockets-06b6d4?style=flat-square)](https://websockets.readthedocs.io/)
[![HTML5 Canvas](https://img.shields.io/badge/Frontend-HTML5%20Canvas%20%2B%20CSS3-f97316?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Audio](https://img.shields.io/badge/Audio-Web%20Audio%20API-10b981?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)](LICENSE)

**A high-performance real-time multiplayer drawing and guessing game built with Python WebSockets, HTML5 2D Canvas, and Glassmorphic aesthetics.**

[Features](#-features) • [Installation](#-installation) • [How to Play](#-how-to-play) • [Architecture](#-architecture) • [Building EXE](#-building-standalone-exe)

</div>

---

## 🌟 Features

- **🎮 Real-Time Multiplayer Lobby System**:
  - Dynamic 6-character room codes, custom player nicknames, and 18 selectable illustrated avatars.
  - Public lobby browser & private custom rooms with host controls.
  - Configurable match rules: round counts (2–8), draw timers (45s–120s), categorized word packs, and custom word lists.

- **🖌️ High-Performance HTML5 Canvas Engine**:
  - **Smooth Bézier curves** for pressure-feel fluid pen strokes without jagged edges.
  - **Pixel-perfect Flood Fill (Paint Bucket)** using 4-way stack `ImageData` scanline algorithms.
  - Multiple tools: Brush, Pencil, Eraser, Straight Line, Rectangle, Circle, and Color Picker.
  - 24 vibrant preset colors, brush size preview slider, and synchronized Undo / Redo / Clear actions.
  - Resolution-independent coordinate normalization `(0.0..1.0)` for cross-device compatibility.

- **🧠 Game Engine & Smart Guessing**:
  - Progressive hint reveals (`_ _ _ _ _` ➔ `P _ Z Z A`) at 60%, 40%, and 20% remaining time.
  - Exact match detection with speed-bonus points and winning streaks.
  - Fuzzy typo detection (Levenshtein distance) providing private *"You are very close!"* hints.
  - Word masking for players who have already guessed correctly to prevent spoilers.

- **🤖 AI Bot & Solo Practice Mode**:
  - Play alone anytime with **DoodleBot**! The AI bot draws vector doodles step-by-step or simulates human-like guesses.

- **🔊 Procedural Sound Synthesizer**:
  - Zero external MP3/WAV files required! Pure Web Audio API procedural sound engine for chimes, timer ticks, fanfares, and applause.

- **🎉 Floating Emoji Reactions & Grand Podium**:
  - Real-time animated emoji barrage (🔥, 👏, 😂, ❤️, 🎨, 🤯) floating over the canvas.
  - 3D-styled Olympic podium (1st, 2nd, 3rd place) with celebration confetti particle physics and awards (Champion, Guessing Prodigy, Master Artist).

- **📱 Instant LAN & Mobile QR Code Sharing**:
  - Anyone on your Wi-Fi or Mobile Hotspot can point their phone camera at the in-game QR code to join instantly without installing anything.

---

## 📁 Repository Structure

```text
rajiths-project/
├── client/                     # Frontend Application
│   ├── index.html              # Modern semantic HTML5 structure & modals
│   ├── style.css               # Glassmorphic dark design & animations
│   ├── canvas.js               # Canvas 2D engine (Bézier curves & Flood Fill)
│   ├── audio.js                # Web Audio API procedural synthesizer
│   └── app.js                  # WebSocket controller & UI state machine
├── server/                     # Backend Real-Time Server
│   ├── server.py               # Combined Asyncio HTTP & WebSocket server
│   ├── game.py                 # Game state machine, scoring, & bot loop
│   ├── rooms.py                # Room manager & player states
│   └── words.py                # Categorized dictionary & bot vector paths
├── tests/                      # Automated Integration Tests
│   └── test_e2e.py             # HTTP and WebSocket multiplayer test suite
├── app_desktop.py              # Native Desktop Window runner (PyWebView)
├── build_exe.py                # PyInstaller standalone EXE compiler
├── run.py                      # Cross-platform quick launcher
├── DoodleClash.bat             # Windows 1-click desktop launcher
├── requirements.txt            # Python dependencies
├── .gitignore                  # Git exclusions
├── LICENSE                     # MIT License
└── README.md                   # Documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+** (Python 3.12 recommended)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/doodleclash.git
cd doodleclash
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Application

#### Option A: Standalone Desktop Window (Recommended)
```bash
python app_desktop.py
```
*Or double-click `DoodleClash.bat` on Windows.*

#### Option B: Web Browser Mode
```bash
python server/server.py
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

## 🧪 Running Automated Tests

Run the full end-to-end integration test suite:
```bash
python tests/test_e2e.py
```

---

## 📦 Building Standalone Executable (.exe)

To compile a standalone Windows installer executable without requiring Python on client machines:
```bash
python build_exe.py
```
The output `.exe` will be generated in the `dist/` directory.

---

## 🌐 Playing with Friends (LAN & Web)

1. **Local Wi-Fi / Hotspot**:
   - Start the game on your computer.
   - Click the **Share (🔗)** button in the header.
   - Friends on the same Wi-Fi can scan the **QR Code** or navigate to `http://<YOUR-IP>:8000` to join!

2. **Over the Internet (Cloudflare Tunnel)**:
   ```bash
   npx -y cloudflared tunnel --url http://localhost:8000
   ```
   Share the generated `https://*.trycloudflare.com` URL with anyone in the world!

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
