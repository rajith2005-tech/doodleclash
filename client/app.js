/**
 * DoodleClash Main Application Controller
 * Handles WebSockets, UI State, Game Lifecycle, Chat, Reactions & Confetti
 */

const AVATARS = [
  '🦊', '🐱', '🐶', '🐼', '🦁', '🐯',
  '🐸', '🐵', '🦄', '🐲', '🐙', '🐧',
  '🤖', '👾', '🤠', '🧙‍♂️', '🦹‍♀️', '🚀'
];

const RANDOM_NAMES = [
  'PixelPicasso', 'DoodleKnight', 'BrushNinja', 'NeonArtist',
  'SpeedySketcher', 'ColorWizard', 'CosmicDoodler', 'VividViper',
  'MasterOfPaint', 'SketchySam', 'CanvasQueen', 'CyberDraw'
];

const PALETTE_COLORS = [
  '#000000', '#ffffff', '#64748b', '#94a3b8',
  '#ef4444', '#f87171', '#ec4899', '#f472b6',
  '#f97316', '#fb923c', '#f59e0b', '#fde047',
  '#10b981', '#34d399', '#06b6d4', '#38bdf8',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#854d0e', '#78350f', '#334155'
];

const OFFLINE_WORD_POOL = [
  { word: 'Elephant', hint: 'Large animal with a trunk', category: 'Animals' },
  { word: 'Penguin', hint: 'Flightless bird in tuxedos', category: 'Animals' },
  { word: 'Giraffe', hint: 'Tallest mammal with long neck', category: 'Animals' },
  { word: 'Dolphin', hint: 'Intelligent aquatic mammal', category: 'Animals' },
  { word: 'Kangaroo', hint: 'Hops and carries baby in pouch', category: 'Animals' },
  { word: 'Octopus', hint: 'Sea creature with eight arms', category: 'Animals' },
  { word: 'Cheetah', hint: 'Fastest land animal on Earth', category: 'Animals' },
  { word: 'Butterfly', hint: 'Insect with colorful fluttery wings', category: 'Animals' },
  { word: 'Pizza', hint: 'Italian cheesy pie with toppings', category: 'Food' },
  { word: 'Hamburger', hint: 'Patty between two sesame buns', category: 'Food' },
  { word: 'Sushi', hint: 'Rice rolled with seaweed & fish', category: 'Food' },
  { word: 'Ice Cream', hint: 'Frozen sweet dessert in a cone', category: 'Food' },
  { word: 'Pancake', hint: 'Flat round cake topped with syrup', category: 'Food' },
  { word: 'Taco', hint: 'Crispy folded shell with spicy fillings', category: 'Food' },
  { word: 'Guitar', hint: 'Stringed musical instrument', category: 'Objects' },
  { word: 'Bicycle', hint: 'Two-wheeled pedal vehicle', category: 'Objects' },
  { word: 'Clock', hint: 'Tells hours and minutes on the wall', category: 'Objects' },
  { word: 'Umbrella', hint: 'Shields you from raindrops', category: 'Objects' },
  { word: 'Rocket', hint: 'Blasts astronauts into outer space', category: 'Tech' },
  { word: 'Laptop', hint: 'Portable computer device with screen', category: 'Tech' },
  { word: 'Robot', hint: 'Mechanical automated cyber assistant', category: 'Tech' },
  { word: 'Rainbow', hint: 'Colorful seven-color arc after rain', category: 'Nature' },
  { word: 'Volcano', hint: 'Mountain spewing hot red lava', category: 'Nature' },
  { word: 'Dragon', hint: 'Mythical flying fire-breathing beast', category: 'Fantasy' }
];

class DoodleApp {
  constructor() {
    this.ws = null;
    this.playerId = null;
    this.roomCode = null;
    this.isHost = false;
    this.isMyTurn = false;
    this.selectedAvatar = '🦊';
    this.roomState = null;
    this.drawingCanvas = null;
    this.confettiRunning = false;

    // Multiplayer Modes & Network State
    this.currentMode = 'online'; // 'online', 'lan', 'party', 'solo'
    this.networkInfo = null;
    this.customWsUrl = localStorage.getItem('doodleclash_ws_url') || null;
    this.activeWsUrl = null;
    this._triedFallback8001 = false;

    // Local Pass & Play State
    this.partyState = {
      players: [
        { id: 'p1', name: 'Alice', avatar: '🦊', score: 0 },
        { id: 'p2', name: 'Bob', avatar: '🐼', score: 0 }
      ],
      rounds: 3,
      timer: 60,
      currentRound: 1,
      currentDrawerIdx: 0,
      activeWord: '',
      activeCategory: '',
      timerInterval: null,
      timeLeft: 60,
      guessesGuessed: new Set()
    };

    this.init();
  }

  init() {
    this.setupAvatarGrid();
    this.setupColorPalette();
    this.setupCanvas();
    this.attachDOMListeners();
    this.setupModeSwitcher();
    this.setupServerAndTunnelModals();
    this.setupPartyMode();
    this.fetchNetworkInfo();
    this.connectWebSocket();
    this.setupIcons();
    this.checkUrlRoomParam();
  }

  checkUrlRoomParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    if (roomCode) {
      setTimeout(() => {
        const inputJoin = document.getElementById('inputJoinRoomCode');
        if (inputJoin) {
          inputJoin.value = roomCode.toUpperCase();
          this.openModal('joinRoomModal');
        }
      }, 600);
    }
  }

  setupIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  updateServerStatus(status, text) {
    const dot = document.getElementById('serverStatusDot');
    const label = document.getElementById('serverStatusText');
    if (dot) {
      dot.className = `status-indicator-dot ${status}`;
    }
    if (label) {
      label.textContent = text;
    }
  }

  async fetchNetworkInfo() {
    try {
      const res = await fetch('/api/network_info');
      if (res.ok) {
        const data = await res.json();
        this.networkInfo = data;
        const lanInput = document.getElementById('lanHostUrlDisplay');
        if (lanInput && data.lan_url) lanInput.value = data.lan_url;

        const lanQr = document.getElementById('lanQrCodeImage');
        if (lanQr && data.lan_url) {
          lanQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(data.lan_url)}`;
        }
      }
    } catch (e) {
      console.debug('Network info endpoint not available yet:', e);
    }
  }

  // --- WebSocket URL Normalizer ---
  _normalizeServerToWsUrl(addr) {
    // Already a ws:// or wss:// URL
    if (addr.startsWith('ws://') || addr.startsWith('wss://')) return addr;

    // https:// → wss://,  http:// → ws://
    if (addr.startsWith('https://')) return 'wss://' + addr.slice(8).replace(/\/+$/, '');
    if (addr.startsWith('http://'))  return 'ws://'  + addr.slice(7).replace(/\/+$/, '');

    // Bare IP:port  e.g. "192.168.1.5:8000"  or  "192.168.1.5"
    const clean = addr.replace(/\/+$/, '');
    return `ws://${clean}`;
  }

  // --- WebSocket Connection ---
  connectWebSocket(customUrl = null) {
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.close();
      } catch (e) {}
    }

    this.updateServerStatus('connecting', 'Connecting...');

    const urlParams = new URLSearchParams(window.location.search);
    const serverParam = urlParams.get('server');

    let wsUrl = customUrl || serverParam || this.customWsUrl;
    if (!wsUrl) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname || 'localhost';
      const port = window.location.port;

      // If running through tunnel or standard HTTP port (e.g. 8000 / 80 / 443 / no port)
      if (protocol === 'wss:' || !port || port === '8000' || port === '80' || port === '443') {
        wsUrl = `${protocol}//${window.location.host}`;
      } else {
        wsUrl = `${protocol}//${host}:8001`;
      }
    }

    this.activeWsUrl = wsUrl;
    console.log(`Connecting to WebSocket at ${wsUrl}...`);

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error('Failed to create WebSocket instance:', err);
      this.updateServerStatus('offline', 'Error');
      return;
    }

    this.ws.onopen = () => {
      console.log('Connected to DoodleClash server at ' + wsUrl);
      this.updateServerStatus('online', this.currentMode === 'lan' ? 'LAN Connected' : 'Online');
      this.send({ type: 'get_public_rooms' });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleServerMessage(data);
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    };

    this.ws.onclose = () => {
      console.warn('WebSocket connection closed.');
      this.updateServerStatus('offline', 'Disconnected');

      // If unified reverse proxy port connection closed and we haven't tried port 8001 yet, try port 8001
      if (this.activeWsUrl && (this.activeWsUrl.includes(':8000') || !this.activeWsUrl.includes(':8001')) && !this._triedFallback8001) {
        this._triedFallback8001 = true;
        const fallbackUrl = `ws://${window.location.hostname || 'localhost'}:8001`;
        console.log(`Attempting fallback to dedicated WebSocket port: ${fallbackUrl}`);
        setTimeout(() => this.connectWebSocket(fallbackUrl), 500);
      } else {
        setTimeout(() => this.connectWebSocket(), 3000);
      }
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket encountered an error:', err);
      this.updateServerStatus('offline', 'Connection Error');
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // --- UI & Canvas Setup ---
  setupAvatarGrid() {
    const grid = document.getElementById('avatarGrid');
    if (!grid) return;
    grid.innerHTML = '';
    AVATARS.forEach((av, idx) => {
      const btn = document.createElement('button');
      btn.className = `avatar-btn ${idx === 0 ? 'selected' : ''}`;
      btn.textContent = av;
      btn.onclick = () => {
        document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedAvatar = av;
        window.soundEngine.playClick();
      };
      grid.appendChild(btn);
    });
  }

  setupColorPalette() {
    const container = document.getElementById('colorPalette');
    if (!container) return;
    container.innerHTML = '';
    PALETTE_COLORS.forEach((hex, idx) => {
      const swatch = document.createElement('div');
      swatch.className = `color-swatch ${idx === 0 ? 'active' : ''}`;
      swatch.style.backgroundColor = hex;
      swatch.onclick = () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        if (this.drawingCanvas) {
          this.drawingCanvas.setColor(hex);
        }
        window.soundEngine.playClick();
      };
      container.appendChild(swatch);
    });
  }

  setupCanvas() {
    const canvasEl = document.getElementById('gameCanvas');
    if (!canvasEl) return;
    this.drawingCanvas = new DrawingCanvas(canvasEl, (actionData) => {
      this.send({
        type: 'draw_action',
        ...actionData
      });
    });
  }

  // --- View Navigation ---
  showView(viewId) {
    document.querySelectorAll('.view-section').forEach(view => {
      view.classList.remove('active');
    });
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
    }

    // Header room badge & leave button visibility
    const isInsideRoom = (viewId === 'lobbyView' || viewId === 'gameView');
    document.getElementById('roomCodeHeaderBadge').style.display = isInsideRoom ? 'flex' : 'none';
    document.getElementById('btnLeaveRoom').style.display = isInsideRoom ? 'inline-flex' : 'none';

    if (viewId === 'gameView' && this.drawingCanvas) {
      setTimeout(() => this.drawingCanvas.resize(), 50);
    }
  }

  // --- Event Listeners ---
  attachDOMListeners() {
    // Sound Toggle
    const btnSound = document.getElementById('btnSoundToggle');
    if (btnSound) {
      btnSound.onclick = () => {
        const isMuted = window.soundEngine.toggleMute();
        const icon = document.getElementById('soundIcon');
        if (icon) {
          icon.setAttribute('data-lucide', isMuted ? 'volume-x' : 'volume-2');
          this.setupIcons();
        }
      };
    }

    // Random Name Generator
    const btnRandom = document.getElementById('btnRandomName');
    if (btnRandom) {
      btnRandom.onclick = () => {
        const nameInput = document.getElementById('playerNameInput');
        const rand = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
        const num = Math.floor(Math.random() * 90) + 10;
        nameInput.value = `${rand}${num}`;
        window.soundEngine.playClick();
      };
    }

    // How to Play Rules Modal
    const btnRules = document.getElementById('btnRules');
    if (btnRules) {
      btnRules.onclick = () => this.openModal('rulesModal');
    }

    // Share & Invite Modal
    const btnShare = document.getElementById('btnShareGame');
    if (btnShare) {
      btnShare.onclick = () => this.openShareModal();
    }

    const btnCopyUrl = document.getElementById('btnCopyShareUrl');
    if (btnCopyUrl) {
      btnCopyUrl.onclick = () => {
        const urlInput = document.getElementById('shareUrlInput');
        if (urlInput) {
          navigator.clipboard.writeText(urlInput.value);
          this.showToast('Invite Link copied to clipboard!');
          window.soundEngine.playClick();
        }
      };
    }

    const btnCopyCode = document.getElementById('btnCopyShareCode');
    if (btnCopyCode) {
      btnCopyCode.onclick = () => {
        const codeInput = document.getElementById('shareCodeInput');
        if (codeInput) {
          navigator.clipboard.writeText(codeInput.value);
          this.showToast(`Room code ${codeInput.value} copied!`);
          window.soundEngine.playClick();
        }
      };
    }


    // Close Modals
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.onclick = () => this.closeAllModals();
    });

    // Create Room Modal Open
    const btnOpenCreate = document.getElementById('btnOpenCreateModal');
    if (btnOpenCreate) {
      btnOpenCreate.onclick = () => this.openModal('createRoomModal');
    }

    // Join Code Modal Open
    const btnOpenJoin = document.getElementById('btnOpenJoinModal');
    if (btnOpenJoin) {
      btnOpenJoin.onclick = () => this.openModal('joinRoomModal');
    }

    // Confirm Create Room
    const btnConfirmCreate = document.getElementById('btnConfirmCreateRoom');
    if (btnConfirmCreate) {
      btnConfirmCreate.onclick = () => {
        const name = document.getElementById('playerNameInput').value.trim() || 'Artist';
        const roomName = document.getElementById('inputRoomName').value.trim() || `${name}'s Room`;
        const rounds = parseInt(document.getElementById('selectRounds').value, 10) || 3;
        const drawTime = parseInt(document.getElementById('selectDrawTime').value, 10) || 60;
        
        const categories = [];
        document.querySelectorAll('#createCategoriesList input[type="checkbox"]:checked').forEach(cb => {
          categories.push(cb.value);
        });

        const customWordsRaw = document.getElementById('inputCustomWords').value;
        const customWords = customWordsRaw.split(',').map(w => w.trim()).filter(Boolean);

        this.send({
          type: 'create_room',
          name,
          avatar: this.selectedAvatar,
          room_name: roomName,
          is_public: true,
          settings: {
            max_rounds: rounds,
            draw_time: drawTime,
            categories: categories.length ? categories : ['animals', 'food'],
            custom_words: customWords,
            max_players: 8,
            allow_hints: true
          }
        });
        this.closeAllModals();
        window.soundEngine.playClick();
      };
    }

    // Confirm Join Room
    const btnConfirmJoin = document.getElementById('btnConfirmJoinRoom');
    if (btnConfirmJoin) {
      btnConfirmJoin.onclick = () => {
        const code = document.getElementById('inputJoinRoomCode').value.trim().toUpperCase();
        const name = document.getElementById('playerNameInput').value.trim() || 'Artist';
        const rawServerAddr = (document.getElementById('inputJoinServerAddress')?.value || '').trim();
        if (!code) return;

        const doJoin = () => {
          this.send({
            type: 'join_room',
            code,
            name,
            avatar: this.selectedAvatar
          });
        };

        if (rawServerAddr) {
          // User specified a remote server address — reconnect then join
          const wsUrl = this._normalizeServerToWsUrl(rawServerAddr);
          this.showToast(`Connecting to ${wsUrl}...`);
          localStorage.setItem('doodleclash_ws_url', wsUrl);
          this.customWsUrl = wsUrl;
          this.connectWebSocket(wsUrl);
          // Wait for connection to open, then join
          const prevOnOpen = this.ws.onopen;
          this.ws.onopen = (ev) => {
            if (prevOnOpen) prevOnOpen.call(this.ws, ev);
            doJoin();
          };
        } else {
          // Same server — join immediately
          doJoin();
        }

        this.closeAllModals();
        window.soundEngine.playClick();
      };
    }

    // Solo Practice Mode
    const btnSolo = document.getElementById('btnPlaySolo');
    if (btnSolo) {
      btnSolo.onclick = () => {
        const name = document.getElementById('playerNameInput').value.trim() || 'Player';
        this.send({
          type: 'create_room',
          name,
          avatar: this.selectedAvatar,
          room_name: 'Solo Practice Arena',
          is_public: false,
          settings: { max_rounds: 3, draw_time: 60 }
        });
        // Auto add bot after join
        setTimeout(() => {
          this.send({ type: 'add_bot' });
          setTimeout(() => this.send({ type: 'start_game' }), 300);
        }, 400);
      };
    }

    // Refresh Public Rooms
    const btnRefresh = document.getElementById('btnRefreshRooms');
    if (btnRefresh) {
      btnRefresh.onclick = () => {
        this.send({ type: 'get_public_rooms' });
        window.soundEngine.playClick();
      };
    }

    // Copy Lobby Code
    const lobbyCodeBadge = document.getElementById('lobbyCodeBadge');
    if (lobbyCodeBadge) {
      lobbyCodeBadge.onclick = () => {
        if (this.roomCode) {
          navigator.clipboard.writeText(this.roomCode);
          this.showToast(`Room code ${this.roomCode} copied to clipboard!`);
          window.soundEngine.playClick();
        }
      };
    }

    // Lobby Actions
    const btnAddBot = document.getElementById('btnAddBot');
    if (btnAddBot) {
      btnAddBot.onclick = () => {
        this.send({ type: 'add_bot' });
        window.soundEngine.playClick();
      };
    }

    const btnReady = document.getElementById('btnToggleReady');
    if (btnReady) {
      btnReady.onclick = () => {
        this.send({ type: 'toggle_ready' });
        window.soundEngine.playClick();
      };
    }

    const btnStart = document.getElementById('btnStartGame');
    if (btnStart) {
      btnStart.onclick = () => {
        this.send({ type: 'start_game' });
        window.soundEngine.playTurnStart();
      };
    }

    // Leave Room
    const btnLeave = document.getElementById('btnLeaveRoom');
    if (btnLeave) {
      btnLeave.onclick = () => {
        if (this.partyTimerInterval) {
          clearInterval(this.partyTimerInterval);
        }
        const buzzerBar = document.getElementById('partyBuzzerBar');
        if (buzzerBar) buzzerBar.style.display = 'none';

        if (this.roomCode) {
          this.send({ type: 'leave_room' });
        }
        this.showView('homeView');
        this.send({ type: 'get_public_rooms' });
        window.soundEngine.playClick();
      };
    }

    // LAN Action Listeners
    const btnCreateLan = document.getElementById('btnCreateLanRoom');
    if (btnCreateLan) {
      btnCreateLan.onclick = () => this.openModal('createRoomModal');
    }

    const btnJoinLan = document.getElementById('btnJoinLanRoom');
    if (btnJoinLan) {
      btnJoinLan.onclick = () => this.openModal('joinRoomModal');
    }

    const btnCopyLan = document.getElementById('btnCopyLanUrl');
    if (btnCopyLan) {
      btnCopyLan.onclick = () => {
        const inp = document.getElementById('lanHostUrlDisplay');
        if (inp) {
          navigator.clipboard.writeText(inp.value);
          this.showToast('LAN Host URL copied to clipboard!');
          window.soundEngine.playClick();
        }
      };
    }

    const btnConnectLan = document.getElementById('btnConnectCustomLan');
    if (btnConnectLan) {
      btnConnectLan.onclick = () => {
        const host = document.getElementById('inputCustomLanHost')?.value.trim();
        if (!host) return;
        const normalized = host.startsWith('http') ? host : `http://${host}`;
        window.location.href = normalized;
      };
    }

    const btnRefreshLan = document.getElementById('btnRefreshLanInfo');
    if (btnRefreshLan) {
      btnRefreshLan.onclick = () => {
        this.fetchNetworkInfo();
        this.send({ type: 'get_public_rooms' });
        this.showToast('Refreshing LAN network status...');
        window.soundEngine.playClick();
      };
    }

    // Drawing Tools
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tool = btn.getAttribute('data-tool');
        if (this.drawingCanvas) {
          this.drawingCanvas.setTool(tool);
        }
        window.soundEngine.playClick();
      };
    });

    // Custom Color Picker
    const customColorInput = document.getElementById('customColorInput');
    if (customColorInput) {
      customColorInput.oninput = (e) => {
        const color = e.target.value;
        if (this.drawingCanvas) {
          this.drawingCanvas.setColor(color);
        }
      };
    }

    // Brush Size Slider
    const sizeSlider = document.getElementById('brushSizeSlider');
    if (sizeSlider) {
      sizeSlider.oninput = (e) => {
        if (this.drawingCanvas) {
          this.drawingCanvas.setBrushSize(e.target.value);
        }
      };
    }

    // Undo / Redo / Clear
    const btnUndo = document.getElementById('btnUndo');
    if (btnUndo) {
      btnUndo.onclick = () => {
        if (this.drawingCanvas && this.isMyTurn) {
          this.drawingCanvas.undo();
          window.soundEngine.playClick();
        }
      };
    }

    const btnRedo = document.getElementById('btnRedo');
    if (btnRedo) {
      btnRedo.onclick = () => {
        if (this.drawingCanvas && this.isMyTurn) {
          this.drawingCanvas.redo();
          window.soundEngine.playClick();
        }
      };
    }

    const btnClear = document.getElementById('btnClearCanvas');
    if (btnClear) {
      btnClear.onclick = () => {
        if (this.drawingCanvas && this.isMyTurn) {
          this.drawingCanvas.clear();
          window.soundEngine.playClick();
        }
      };
    }

    // Guess Chat Form
    const chatForm = document.getElementById('chatForm');
    if (chatForm) {
      chatForm.onsubmit = (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (!text) return;
        this.send({
          type: 'chat_message',
          message: text
        });
        input.value = '';
      };
    }

    // Dedicated Guess Judge Form
    const guessJudgeForm = document.getElementById('guessJudgeForm');
    if (guessJudgeForm) {
      guessJudgeForm.onsubmit = (e) => {
        e.preventDefault();
        const input = document.getElementById('dedicatedGuessInput');
        const text = input.value.trim();
        if (!text) return;
        this.send({
          type: 'chat_message',
          message: text
        });
        input.value = '';
      };
    }


    // Floating Emoji Reaction Buttons
    document.querySelectorAll('.btn-reaction').forEach(btn => {
      btn.onclick = () => {
        const emoji = btn.getAttribute('data-emoji');
        this.send({ type: 'reaction', emoji });
        this.spawnFloatingEmoji(emoji);
        window.soundEngine.playReaction();
      };
    });

    // Return to Lobby after Game Over
    const btnReturn = document.getElementById('btnReturnToLobby');
    if (btnReturn) {
      btnReturn.onclick = () => {
        this.closeAllModals();
        this.showView('lobbyView');
        this.stopConfetti();
        window.soundEngine.playClick();
      };
    }

    const btnRestart = document.getElementById('btnRestartGame');
    if (btnRestart) {
      btnRestart.onclick = () => {
        this.closeAllModals();
        this.stopConfetti();
        this.send({ type: 'restart_game' });
        window.soundEngine.playClick();
      };
    }
  }

  openShareModal() {
    let baseOrigin = `${window.location.protocol}//${window.location.host}`;

    // If host is on localhost and we have detected LAN IP, prioritize the LAN address so mobile devices can connect
    if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && this.networkInfo && this.networkInfo.lan_url) {
      baseOrigin = this.networkInfo.lan_url;
    }

    const roomParam = this.roomCode ? `?room=${this.roomCode}` : '';
    const shareUrl = `${baseOrigin}/${roomParam}`;

    const urlInput = document.getElementById('shareUrlInput');
    if (urlInput) urlInput.value = shareUrl;

    const codeInput = document.getElementById('shareCodeInput');
    if (codeInput) codeInput.value = this.roomCode || 'NO ROOM';

    const qrImg = document.getElementById('shareQrImage');
    if (qrImg) {
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}`;
    }

    this.openModal('shareModal');
  }

  // --- Multiplayer Mode Switcher ---
  setupModeSwitcher() {
    const tabs = [
      { id: 'tabModeOnline', mode: 'online' },
      { id: 'tabModeLocalLan', mode: 'lan' },
      { id: 'tabModeParty', mode: 'party' },
      { id: 'tabModeSolo', mode: 'solo' }
    ];

    tabs.forEach(({ id, mode }) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.onclick = () => {
        tabs.forEach(t => {
          const el = document.getElementById(t.id);
          if (el) el.classList.remove('active');
        });
        btn.classList.add('active');
        this.switchMode(mode);
        window.soundEngine.playClick();
      };
    });
  }

  switchMode(mode) {
    this.currentMode = mode;

    const stdProfile = document.getElementById('standardProfileSection');
    const partySetup = document.getElementById('partySetupSection');
    const actOnline = document.getElementById('actionsOnlineMode');
    const actLan = document.getElementById('actionsLanMode');
    const actParty = document.getElementById('actionsPartyMode');
    const actSolo = document.getElementById('actionsSoloMode');

    const rightOnline = document.getElementById('rightPanelOnline');
    const rightLan = document.getElementById('rightPanelLan');
    const rightParty = document.getElementById('rightPanelParty');
    const rightSolo = document.getElementById('rightPanelSolo');

    const badge = document.getElementById('modeHeroBadge');
    const title = document.getElementById('modeHeroTitle');
    const desc = document.getElementById('modeHeroDesc');

    if (stdProfile) stdProfile.style.display = (mode === 'party') ? 'none' : 'block';
    if (partySetup) partySetup.style.display = (mode === 'party') ? 'block' : 'none';

    if (actOnline) actOnline.style.display = (mode === 'online') ? 'block' : 'none';
    if (actLan) actLan.style.display = (mode === 'lan') ? 'block' : 'none';
    if (actParty) actParty.style.display = (mode === 'party') ? 'block' : 'none';
    if (actSolo) actSolo.style.display = (mode === 'solo') ? 'block' : 'none';

    if (rightOnline) rightOnline.style.display = (mode === 'online') ? 'block' : 'none';
    if (rightLan) rightLan.style.display = (mode === 'lan') ? 'block' : 'none';
    if (rightParty) rightParty.style.display = (mode === 'party') ? 'block' : 'none';
    if (rightSolo) rightSolo.style.display = (mode === 'solo') ? 'block' : 'none';

    if (mode === 'online') {
      if (badge) badge.innerHTML = '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i> <span>Real-Time Online Multiplayer</span>';
      if (title) title.innerHTML = 'Draw, Guess, & <span>Clash!</span>';
      if (desc) desc.textContent = 'Unleash your inner artist or guess hilarious doodles against players worldwide.';
      this.updateServerStatus('online', 'Online');
      this.send({ type: 'get_public_rooms' });
    } else if (mode === 'lan') {
      if (badge) badge.innerHTML = '<i data-lucide="wifi" style="width: 14px; height: 14px;"></i> <span>Local Wi-Fi & Hotspot Multiplayer</span>';
      if (title) title.innerHTML = 'Play on <span>Local Wi-Fi!</span>';
      if (desc) desc.textContent = 'Challenge family, roommates, or friends connected to the same Wi-Fi router or Mobile Hotspot.';
      this.updateServerStatus('online', 'LAN Mode');
      this.fetchNetworkInfo();
      this.send({ type: 'get_public_rooms' });
    } else if (mode === 'party') {
      this.renderPartyRoster();
      this.updateServerStatus('online', 'Local Party');
    } else if (mode === 'solo') {
      if (badge) badge.innerHTML = '<i data-lucide="bot" style="width: 14px; height: 14px;"></i> <span>Solo Practice vs AI</span>';
      if (title) title.innerHTML = 'Practice with <span>DoodleBot!</span>';
      if (desc) desc.textContent = 'DoodleBot will draw vector doodles or simulate human guesses to train your skills.';
      this.updateServerStatus('online', 'Solo Practice');
    }

    this.setupIcons();
  }

  // --- Server Network & Tunnel Settings Modals ---
  setupServerAndTunnelModals() {
    const btnServer = document.getElementById('btnServerSettings');
    if (btnServer) {
      btnServer.onclick = () => {
        const input = document.getElementById('inputCustomWsUrl');
        if (input) input.value = this.activeWsUrl || '';
        this.openModal('serverConfigModal');
      };
    }

    const btnTest = document.getElementById('btnTestServerConnection');
    const fb = document.getElementById('serverTestFeedback');
    if (btnTest) {
      btnTest.onclick = () => {
        const url = document.getElementById('inputCustomWsUrl')?.value.trim();
        if (!url) return;
        if (fb) {
          fb.style.display = 'block';
          fb.style.color = '#38bdf8';
          fb.textContent = `Pinging ${url}...`;
        }
        try {
          const testWs = new WebSocket(url);
          testWs.onopen = () => {
            if (fb) {
              fb.style.color = '#34d399';
              fb.textContent = '✓ Server reachable & online!';
            }
            testWs.close();
          };
          testWs.onerror = () => {
            if (fb) {
              fb.style.color = '#f87171';
              fb.textContent = '✗ Connection failed. Check server address and port.';
            }
          };
        } catch (e) {
          if (fb) {
            fb.style.color = '#f87171';
            fb.textContent = `✗ Invalid URL: ${e.message}`;
          }
        }
      };
    }

    const btnSave = document.getElementById('btnSaveServerConfig');
    if (btnSave) {
      btnSave.onclick = () => {
        const url = document.getElementById('inputCustomWsUrl')?.value.trim();
        if (url) {
          localStorage.setItem('doodleclash_ws_url', url);
          this.customWsUrl = url;
          this.connectWebSocket(url);
          this.showToast('Connecting to ' + url);
        }
        this.closeAllModals();
      };
    }

    // Server Presets
    const pLocal8000 = document.getElementById('btnPresetLocalAuto');
    if (pLocal8000) {
      pLocal8000.onclick = () => {
        const inp = document.getElementById('inputCustomWsUrl');
        if (inp) inp.value = `ws://${window.location.hostname || 'localhost'}:8000`;
      };
    }
    const pLocal8001 = document.getElementById('btnPresetLocal8001');
    if (pLocal8001) {
      pLocal8001.onclick = () => {
        const inp = document.getElementById('inputCustomWsUrl');
        if (inp) inp.value = `ws://${window.location.hostname || 'localhost'}:8001`;
      };
    }
    const pAuto = document.getElementById('btnPresetAutoDetect');
    if (pAuto) {
      pAuto.onclick = () => {
        const inp = document.getElementById('inputCustomWsUrl');
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        if (inp) inp.value = `${proto}//${window.location.host}`;
      };
    }

    // Host Tunnel Modal
    const btnOpenTunnel = document.getElementById('btnOpenHostTunnelModal');
    if (btnOpenTunnel) {
      btnOpenTunnel.onclick = () => this.openModal('hostTunnelModal');
    }

    const btnCopyCmd = document.getElementById('btnCopyTunnelCommand');
    if (btnCopyCmd) {
      btnCopyCmd.onclick = () => {
        navigator.clipboard.writeText('npx -y cloudflared tunnel --url http://localhost:8000');
        this.showToast('Tunnel command copied to clipboard!');
        window.soundEngine.playClick();
      };
    }

    const btnApplyTunnel = document.getElementById('btnApplyTunnelUrl');
    if (btnApplyTunnel) {
      btnApplyTunnel.onclick = () => {
        const val = document.getElementById('inputTunnelUrl')?.value.trim();
        if (!val) return;
        const normalized = val.replace(/\/+$/, '');
        const roomCode = this.roomCode || 'GAME';
        const inviteUrl = `${normalized}/?room=${roomCode}`;

        const resultBox = document.getElementById('tunnelInviteResult');
        const shareInput = document.getElementById('generatedOnlineShareUrl');
        if (resultBox && shareInput) {
          resultBox.style.display = 'block';
          shareInput.value = inviteUrl;
        }
        window.soundEngine.playClick();
      };
    }

    const btnCopyGenUrl = document.getElementById('btnCopyGeneratedOnlineUrl');
    if (btnCopyGenUrl) {
      btnCopyGenUrl.onclick = () => {
        const shareInput = document.getElementById('generatedOnlineShareUrl');
        if (shareInput && shareInput.value) {
          navigator.clipboard.writeText(shareInput.value);
          this.showToast('Online invite link copied to clipboard!');
          window.soundEngine.playClick();
        }
      };
    }
  }

  // --- Local Pass & Play Party Mode Engine ---
  setupPartyMode() {
    const btnAdd = document.getElementById('btnPartyAddPlayer');
    const inputAdd = document.getElementById('partyAddNameInput');
    if (btnAdd && inputAdd) {
      btnAdd.onclick = () => {
        const name = inputAdd.value.trim();
        if (!name) return;
        if (this.partyState.players.length >= 8) {
          this.showToast('Maximum 8 players reached for Party Mode!');
          return;
        }
        const avIndex = (this.partyState.players.length) % AVATARS.length;
        this.partyState.players.push({
          id: 'p' + (Date.now() % 10000),
          name,
          avatar: AVATARS[avIndex],
          score: 0
        });
        inputAdd.value = '';
        this.renderPartyRoster();
        window.soundEngine.playClick();
      };
      inputAdd.onkeydown = (e) => {
        if (e.key === 'Enter') btnAdd.click();
      };
    }

    const btnStartParty = document.getElementById('btnStartPartyMatch');
    if (btnStartParty) {
      btnStartParty.onclick = () => this.startPartyGame();
    }

    const btnDrawerReady = document.getElementById('btnPartyDrawerReady');
    if (btnDrawerReady) {
      btnDrawerReady.onclick = () => this.handlePartyDrawerReady();
    }

    this.renderPartyRoster();
  }

  renderPartyRoster() {
    const list = document.getElementById('partyRosterList');
    const countTag = document.getElementById('partyPlayerCountTag');
    if (!list) return;

    if (countTag) countTag.textContent = `${this.partyState.players.length} Players`;

    list.innerHTML = this.partyState.players.map((p, idx) => `
      <div class="party-roster-item">
        <div class="party-roster-left">
          <span class="party-roster-avatar">${p.avatar}</span>
          <span class="party-roster-name">${p.name}</span>
        </div>
        <div>
          ${this.partyState.players.length > 2 ? `
            <button type="button" class="party-roster-del" onclick="window.doodleApp.removePartyPlayer(${idx})" title="Remove Player">
              <i data-lucide="trash" style="width: 14px; height: 14px;"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');

    this.setupIcons();
  }

  removePartyPlayer(index) {
    if (this.partyState.players.length <= 2) {
      this.showToast('Party Mode requires at least 2 players!');
      return;
    }
    this.partyState.players.splice(index, 1);
    this.renderPartyRoster();
    window.soundEngine.playClick();
  }

  startPartyGame() {
    if (this.partyState.players.length < 2) {
      this.showToast('Please add at least 2 players for Party Mode!');
      return;
    }

    this.partyState.players.forEach(p => p.score = 0);
    this.partyState.currentRound = 1;
    this.partyState.currentDrawerIdx = 0;
    this.partyState.rounds = parseInt(document.getElementById('partyRoundsSelect')?.value || '3', 10);
    this.partyState.timer = parseInt(document.getElementById('partyTimerSelect')?.value || '60', 10);

    window.soundEngine.playStartGame();
    this.startPartyTurn();
  }

  startPartyTurn() {
    if (this.partyState.currentDrawerIdx >= this.partyState.players.length) {
      this.partyState.currentDrawerIdx = 0;
      this.partyState.currentRound++;
      if (this.partyState.currentRound > this.partyState.rounds) {
        this.endPartyGame();
        return;
      }
    }

    const drawer = this.partyState.players[this.partyState.currentDrawerIdx];
    this.partyState.guessesGuessed = new Set();

    const veilName = document.getElementById('partyVeilName');
    const veilAv = document.getElementById('partyVeilAvatar');
    if (veilName) veilName.textContent = drawer.name;
    if (veilAv) veilAv.textContent = drawer.avatar;

    this.openModal('partyPrivacyModal');
  }

  handlePartyDrawerReady() {
    this.closeAllModals();

    const shuffled = [...OFFLINE_WORD_POOL].sort(() => 0.5 - Math.random());
    const choices = shuffled.slice(0, 3);

    const grid = document.getElementById('wordChoicesGrid');
    if (grid) {
      grid.innerHTML = '';
      choices.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'word-choice-btn';
        btn.innerHTML = `<div>${c.word}</div><div style="font-size: 11px; opacity: 0.8; font-weight: normal;">${c.hint}</div>`;
        btn.onclick = () => {
          this.choosePartyWord(c);
          window.soundEngine.playClick();
        };
        grid.appendChild(btn);
      });
    }

    const timerLabel = document.getElementById('wordChoiceTimer');
    if (timerLabel) timerLabel.textContent = 'Secretly choose your word!';

    this.openModal('wordChoiceModal');
  }

  choosePartyWord(choice) {
    this.closeAllModals();
    this.partyState.activeWord = choice.word;
    this.partyState.activeCategory = choice.category;

    const drawer = this.partyState.players[this.partyState.currentDrawerIdx];

    this.showView('gameView');
    this.isMyTurn = true;

    if (this.drawingCanvas) {
      this.drawingCanvas.clear();
      this.drawingCanvas.setReadOnly(false);
    }

    const tb = document.getElementById('drawingToolbar');
    if (tb) tb.style.display = 'flex';
    const jb = document.getElementById('guessJudgeBar');
    if (jb) jb.style.display = 'none';

    const roundDisp = document.getElementById('gameRoundDisplay');
    if (roundDisp) roundDisp.textContent = `Party Round ${this.partyState.currentRound} / ${this.partyState.rounds}`;

    const catDisp = document.getElementById('wordCategoryDisplay');
    if (catDisp) catDisp.textContent = `Category: ${choice.category} • Artist: ${drawer.name}`;

    const hintDisp = document.getElementById('wordHintLetters');
    if (hintDisp) hintDisp.textContent = `${choice.word} (${choice.hint})`;

    this.updatePartyScoreboard();
    this.setupPartyBuzzerBar();

    this.partyState.timeLeft = this.partyState.timer;
    const timerBox = document.getElementById('gameTimerBox');
    if (timerBox) {
      timerBox.textContent = this.partyState.timeLeft;
      timerBox.classList.remove('urgent');
    }

    if (this.partyTimerInterval) clearInterval(this.partyTimerInterval);
    this.partyTimerInterval = setInterval(() => this.partyTimerTick(), 1000);

    window.soundEngine.playChime();
  }

  partyTimerTick() {
    this.partyState.timeLeft--;
    const timerBox = document.getElementById('gameTimerBox');
    if (timerBox) {
      timerBox.textContent = this.partyState.timeLeft;
      if (this.partyState.timeLeft <= 10) timerBox.classList.add('urgent');
    }

    if (this.partyState.timeLeft <= 0) {
      clearInterval(this.partyTimerInterval);
      this.endPartyTurn('Time up!');
    }
  }

  setupPartyBuzzerBar() {
    const buzzerBar = document.getElementById('partyBuzzerBar');
    const buzzerBtns = document.getElementById('partyBuzzerButtons');
    if (!buzzerBar || !buzzerBtns) return;

    buzzerBar.style.display = 'block';
    buzzerBtns.innerHTML = '';

    const drawer = this.partyState.players[this.partyState.currentDrawerIdx];
    const guessers = this.partyState.players.filter(p => p.id !== drawer.id);

    guessers.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'party-buzz-btn';
      btn.innerHTML = `<span>${p.avatar}</span> <span>${p.name} Guessed!</span>`;
      btn.onclick = () => {
        this.awardPartyGuess(p);
      };
      buzzerBtns.appendChild(btn);
    });

    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'party-buzz-btn';
    skipBtn.style.background = 'rgba(239, 68, 68, 0.2)';
    skipBtn.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    skipBtn.innerHTML = `<span>⏭️ Nobody Guessed</span>`;
    skipBtn.onclick = () => {
      clearInterval(this.partyTimerInterval);
      this.endPartyTurn('Nobody guessed it!');
    };
    buzzerBtns.appendChild(skipBtn);
  }

  awardPartyGuess(guesser) {
    if (this.partyState.guessesGuessed.has(guesser.id)) return;
    this.partyState.guessesGuessed.add(guesser.id);

    const timeBonus = Math.max(50, Math.floor((this.partyState.timeLeft / this.partyState.timer) * 250));
    guesser.score += (250 + timeBonus);

    const drawer = this.partyState.players[this.partyState.currentDrawerIdx];
    drawer.score += 150;

    window.soundEngine.playCorrect();
    this.showToast(`🎉 ${guesser.name} guessed correctly! (+${250 + timeBonus} pts)`);

    clearInterval(this.partyTimerInterval);
    this.endPartyTurn(`${guesser.name} guessed it!`);
  }

  endPartyTurn(reason) {
    if (this.partyTimerInterval) clearInterval(this.partyTimerInterval);

    const buzzerBar = document.getElementById('partyBuzzerBar');
    if (buzzerBar) buzzerBar.style.display = 'none';

    const roundEndWord = document.getElementById('roundEndWord');
    if (roundEndWord) roundEndWord.textContent = this.partyState.activeWord;

    const lb = document.getElementById('roundEndLeaderboard');
    if (lb) {
      const sorted = [...this.partyState.players].sort((a, b) => b.score - a.score);
      lb.innerHTML = sorted.map((p, i) => `
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
          <span>${i + 1}. ${p.avatar} ${p.name}</span>
          <strong style="color: #34d399;">${p.score} pts</strong>
        </div>
      `).join('');
    }

    this.openModal('roundEndModal');

    setTimeout(() => {
      this.closeAllModals();
      this.partyState.currentDrawerIdx++;
      this.startPartyTurn();
    }, 3200);
  }

  endPartyGame() {
    if (this.partyTimerInterval) clearInterval(this.partyTimerInterval);

    const sorted = [...this.partyState.players].sort((a, b) => b.score - a.score);
    this.showPartyPodium(sorted);
  }

  showPartyPodium(ranked) {
    const stage = document.getElementById('podiumStage');
    if (stage) {
      stage.innerHTML = '';
      const p1 = ranked[0];
      const p2 = ranked[1];
      const p3 = ranked[2];

      if (p2) {
        stage.innerHTML += `
          <div class="podium-pillar second-place">
            <div class="podium-avatar">${p2.avatar}</div>
            <div class="podium-name">${p2.name}</div>
            <div class="podium-block">2<div class="podium-score-tag">${p2.score} pts</div></div>
          </div>
        `;
      }
      if (p1) {
        stage.innerHTML += `
          <div class="podium-pillar first-place">
            <div class="podium-crown">👑</div>
            <div class="podium-avatar">${p1.avatar}</div>
            <div class="podium-name">${p1.name}</div>
            <div class="podium-block">1<div class="podium-score-tag">${p1.score} pts</div></div>
          </div>
        `;
      }
      if (p3) {
        stage.innerHTML += `
          <div class="podium-pillar third-place">
            <div class="podium-avatar">${p3.avatar}</div>
            <div class="podium-name">${p3.name}</div>
            <div class="podium-block">3<div class="podium-score-tag">${p3.score} pts</div></div>
          </div>
        `;
      }
    }

    const awardsDiv = document.getElementById('podiumAwardsList');
    if (awardsDiv && ranked.length > 0) {
      awardsDiv.innerHTML = `
        <div style="background: rgba(255,255,255,0.04); border-radius: 8px; padding: 8px; margin-bottom: 6px; font-size: 13px;">
          <strong>🏆 Party Champion:</strong> ${ranked[0].name} with ${ranked[0].score} points!
        </div>
      `;
    }

    const btnRestart = document.getElementById('btnRestartGame');
    if (btnRestart) {
      btnRestart.style.display = 'inline-flex';
      btnRestart.onclick = () => {
        this.closeAllModals();
        this.startPartyGame();
      };
    }

    const btnReturn = document.getElementById('btnReturnToLobby');
    if (btnReturn) {
      btnReturn.onclick = () => {
        this.closeAllModals();
        this.showView('homeView');
      };
    }

    this.openModal('podiumModal');
    this.startConfetti();
    window.soundEngine.playApplause();
  }

  updatePartyScoreboard() {
    const list = document.getElementById('inGameScoreList');
    const countTag = document.getElementById('playerCountTag');
    if (!list) return;

    if (countTag) countTag.textContent = `${this.partyState.players.length} Players`;
    const drawer = this.partyState.players[this.partyState.currentDrawerIdx];

    list.innerHTML = this.partyState.players.map(p => {
      const isDrawing = (p.id === drawer.id);
      return `
        <div class="score-player-item ${isDrawing ? 'is-drawer' : ''}">
          <div class="player-avatar-badge">${p.avatar}</div>
          <div class="player-meta-box">
            <div class="player-meta-name">${p.name} ${isDrawing ? '✏️ (Drawing)' : ''}</div>
            <div class="player-meta-score">${p.score} pts</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Modal Utilities ---
  openModal(modalId) {

    this.closeAllModals();
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
    this.setupIcons();
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
  }

  showToast(message) {
    const box = document.getElementById('chatMessagesBox');
    if (box) {
      const div = document.createElement('div');
      div.className = 'chat-msg system';
      div.textContent = message;
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
    }
  }

  spawnFloatingEmoji(emoji) {
    const layer = document.getElementById('reactionsLayer');
    if (!layer) return;
    const el = document.createElement('div');
    el.className = 'floating-emoji';
    el.textContent = emoji;
    el.style.left = `${15 + Math.random() * 70}%`;
    el.style.bottom = '10px';
    layer.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 2200);
  }

  // --- WebSocket Message Handlers ---
  handleServerMessage(data) {
    switch (data.type) {
      case 'public_rooms_list':
        this.renderPublicRooms(data.rooms);
        break;

      case 'room_joined':
        this.roomCode = data.room_code;
        this.playerId = data.player_id;
        this.isHost = data.is_host;
        this.roomState = data.room_state;
        
        document.getElementById('headerRoomCode').textContent = this.roomCode;
        document.getElementById('lobbyCodeDisplay').textContent = this.roomCode;
        document.getElementById('lobbyRoomName').textContent = data.room_state.name || 'Doodle Room';
        
        this.showView('lobbyView');
        this.renderLobbyPlayers(data.room_state.players);
        this.renderLobbySettings(data.room_state.settings);
        this.updateHostControls();

        // Show host IP quick-share card so others know what server address to use
        if (this.isHost) {
          const ipCard = document.getElementById('hostIpQuickCard');
          const ipDisplay = document.getElementById('hostIpQuickDisplay');
          const ipCopyBtn = document.getElementById('btnCopyHostIp');
          const localIp = (this.networkInfo && this.networkInfo.local_ip) ? this.networkInfo.local_ip : window.location.hostname;
          const port = (this.networkInfo && this.networkInfo.http_port) ? this.networkInfo.http_port : 8000;
          const hostAddr = `${localIp}:${port}`;
          if (ipCard) ipCard.style.display = 'block';
          if (ipDisplay) ipDisplay.value = hostAddr;
          if (ipCopyBtn && !ipCopyBtn._bound) {
            ipCopyBtn._bound = true;
            ipCopyBtn.onclick = () => {
              navigator.clipboard.writeText(hostAddr);
              this.showToast(`Host address ${hostAddr} copied! Share this with your friends.`);
            };
          }
        }
        break;


      case 'player_joined':
      case 'bot_added':
      case 'player_status_changed':
      case 'player_left':
        this.roomState = data.room_state;
        if (data.room_state) {
          this.renderLobbyPlayers(data.room_state.players);
          this.renderInGameScoreboard(data.room_state.players, data.room_state.drawer_id);
          this.updateHostControls();
        }
        break;

      case 'game_started':
        this.roomState = data.room_state;
        this.showView('gameView');
        window.soundEngine.playTurnStart();
        break;

      case 'word_choice_phase':
        this.roomState = data.room_state;
        this.showView('gameView');
        document.getElementById('gameRoundDisplay').textContent = `Round ${data.current_round} / ${data.max_rounds}`;
        document.getElementById('wordHintLetters').textContent = 'Choosing Word...';
        document.getElementById('wordCategoryDisplay').textContent = `${data.drawer_name} is choosing a word`;
        this.isMyTurn = (data.drawer_id === this.playerId);
        this.updateDrawerHUD(false);
        break;

      case 'your_word_choices':
        this.renderWordChoicesModal(data.choices);
        break;

      case 'turn_started':
        this.closeAllModals();
        this.roomState = data.room_state;
        this.isMyTurn = (data.drawer_id === this.playerId);
        this.updateDrawerHUD(this.isMyTurn);
        
        document.getElementById('gameTimerBox').textContent = data.time_left;
        document.getElementById('gameTimerBox').classList.remove('warning');
        document.getElementById('wordCategoryDisplay').textContent = `Category: ${data.category}`;
        
        if (!this.isMyTurn) {
          document.getElementById('wordHintLetters').textContent = data.masked_word;
        }

        if (this.drawingCanvas) {
          this.drawingCanvas.clearLocal(false);
          this.drawingCanvas.setEnabled(this.isMyTurn);
        }

        this.renderInGameScoreboard(data.room_state.players, data.drawer_id);
        window.soundEngine.playTurnStart();
        break;

      case 'secret_word':
        document.getElementById('wordHintLetters').textContent = data.word.toUpperCase();
        document.getElementById('wordCategoryDisplay').textContent = `Draw this: ${data.word} (${data.hint})`;
        break;

      case 'timer_tick':
        const timerBox = document.getElementById('gameTimerBox');
        if (timerBox) {
          timerBox.textContent = data.time_left;
          if (data.time_left <= 10) {
            timerBox.classList.add('warning');
            window.soundEngine.playWarningTick();
          } else {
            timerBox.classList.remove('warning');
          }
        }
        break;

      case 'hint_revealed':
        if (!this.isMyTurn) {
          document.getElementById('wordHintLetters').textContent = data.masked_word;
        }
        window.soundEngine.playClick();
        break;

      case 'draw_action':
        if (this.drawingCanvas) {
          if (data.action === 'snapshot') {
            this.drawingCanvas.loadSnapshot(data.image);
          } else {
            this.drawingCanvas.handleRemoteAction(data);
          }
        }
        break;

      case 'chat_message':
        this.appendChatMessage(data);
        break;

      case 'close_guess_hint':
        this.appendCloseGuessHint(data.message);
        window.soundEngine.playCloseGuess();
        break;

      case 'guess_feedback':
        this.handleGuessFeedback(data);
        break;

      case 'player_guessed_correctly':
        this.appendCorrectGuessBanner(data);

        if (data.room_state) {
          this.renderInGameScoreboard(data.room_state.players, data.room_state.drawer_id);
        }
        window.soundEngine.playCorrectGuess();
        break;

      case 'turn_ended':
        this.renderRoundEndModal(data);
        if (this.drawingCanvas) {
          this.drawingCanvas.setEnabled(false);
        }
        window.soundEngine.playTimeUp();
        break;

      case 'game_over':
        this.renderPodiumModal(data);
        this.startConfetti();
        window.soundEngine.playVictory();
        break;

      case 'reaction':
        this.spawnFloatingEmoji(data.emoji);
        window.soundEngine.playReaction();
        break;

      case 'error':
        alert(data.message || 'An error occurred');
        break;
    }
  }

  // --- Renderers ---
  renderPublicRooms(rooms) {
    const list = document.getElementById('publicRoomsList');
    if (!list) return;
    list.innerHTML = '';
    if (!rooms || rooms.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 40px 0;">
          <p>No active public rooms found. Create your own!</p>
        </div>`;
      return;
    }

    rooms.forEach(r => {
      const item = document.createElement('div');
      item.className = 'public-room-item';
      item.innerHTML = `
        <div>
          <div class="room-info-title">${r.name}</div>
          <div class="room-meta-tags">
            <span class="meta-tag">Host: ${r.host_name}</span>
            <span class="meta-tag">Players: ${r.player_count}/${r.max_players}</span>
            <span class="meta-tag ${r.state === 'DRAWING' ? 'live' : ''}">${r.state}</span>
          </div>
        </div>
        <button class="btn-primary" style="padding: 8px 16px; font-size: 13px;">Join</button>
      `;
      item.querySelector('button').onclick = () => {
        const name = document.getElementById('playerNameInput').value.trim() || 'Artist';
        this.send({
          type: 'join_room',
          code: r.code,
          name,
          avatar: this.selectedAvatar
        });
      };
      list.appendChild(item);
    });
  }

  renderLobbyPlayers(players) {
    const grid = document.getElementById('lobbyPlayersGrid');
    if (!grid || !Array.isArray(players)) return;
    grid.innerHTML = '';

    players.forEach(p => {
      const card = document.createElement('div');
      card.className = 'player-lobby-card';
      card.innerHTML = `
        <div class="player-avatar-large">${p.avatar || '🦊'}</div>
        <div class="player-name-text">
          ${p.name}
          ${p.is_host ? '<span class="badge-host">HOST</span>' : ''}
          ${p.is_bot ? '<span class="badge-bot">BOT</span>' : ''}
        </div>
        <div class="player-status-tag" style="color: ${p.is_ready ? 'var(--success)' : 'var(--text-muted)'}">
          ${p.is_ready ? '✓ Ready' : '• Waiting'}
        </div>
      `;

      if (this.isHost && p.is_bot) {
        const rmBtn = document.createElement('button');
        rmBtn.className = 'btn-remove-bot';
        rmBtn.innerHTML = '✕';
        rmBtn.title = 'Remove Bot';
        rmBtn.onclick = (e) => {
          e.stopPropagation();
          this.send({ type: 'remove_bot', bot_id: p.id });
        };
        card.appendChild(rmBtn);
      }

      grid.appendChild(card);
    });
  }

  renderLobbySettings(settings) {
    if (!settings) return;
    const roundsEl = document.getElementById('lobbySettingRounds');
    if (roundsEl) roundsEl.textContent = `${settings.max_rounds} Rounds`;

    const drawTimeEl = document.getElementById('lobbySettingDrawTime');
    if (drawTimeEl) drawTimeEl.textContent = `${settings.draw_time} Seconds`;

    const catContainer = document.getElementById('lobbySettingCategories');
    if (catContainer && Array.isArray(settings.categories)) {
      catContainer.innerHTML = '';
      settings.categories.forEach(cat => {
        const chip = document.createElement('span');
        chip.className = 'category-chip';
        chip.textContent = cat.toUpperCase();
        catContainer.appendChild(chip);
      });
    }
  }

  updateHostControls() {
    const btnStart = document.getElementById('btnStartGame');
    if (btnStart) {
      btnStart.style.display = this.isHost ? 'inline-flex' : 'none';
    }
    const btnAddBot = document.getElementById('btnAddBot');
    if (btnAddBot) {
      btnAddBot.style.display = this.isHost ? 'inline-flex' : 'none';
    }
  }

  renderInGameScoreboard(players, drawerId) {
    const list = document.getElementById('inGameScoreList');
    if (!list || !Array.isArray(players)) return;
    list.innerHTML = '';

    const sorted = [...players].sort((a, b) => b.score - a.score);
    document.getElementById('playerCountTag').textContent = `${players.length} Players`;

    sorted.forEach((p, idx) => {
      const card = document.createElement('div');
      const isDrawer = (p.id === drawerId);
      card.className = `player-score-card ${isDrawer ? 'is-drawing' : ''} ${p.guessed ? 'has-guessed' : ''}`;
      
      card.innerHTML = `
        <div class="player-info-left">
          <div style="font-size: 11px; font-weight: 800; color: var(--text-dim); width: 14px;">#${idx + 1}</div>
          <div class="score-avatar">${p.avatar}</div>
          <div>
            <div class="score-name">${p.name} ${isDrawer ? '✏️' : (p.guessed ? '✅' : '')}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${p.streak > 1 ? `🔥 ${p.streak} streak` : ''}</div>
          </div>
        </div>
        <div class="score-pts">${p.score}</div>
      `;
      list.appendChild(card);
    });
  }

  updateDrawerHUD(isDrawer) {
    const toolbar = document.getElementById('drawingToolbar');
    const guessBar = document.getElementById('guessJudgeBar');
    
    if (toolbar) {
      toolbar.style.display = isDrawer ? 'flex' : 'none';
      toolbar.style.opacity = isDrawer ? '1' : '0.4';
      toolbar.style.pointerEvents = isDrawer ? 'all' : 'none';
    }

    if (guessBar) {
      guessBar.style.display = isDrawer ? 'none' : 'flex';
      const statusEl = document.getElementById('guessJudgeStatus');
      const statusText = document.getElementById('guessStatusText');
      const input = document.getElementById('dedicatedGuessInput');
      const btn = document.getElementById('btnJudgeGuess');

      if (statusEl) statusEl.className = 'guess-judge-status';
      if (statusText) statusText.innerHTML = '🤔 Type your guess below to judge if it\'s correct!';
      if (input) {
        input.disabled = false;
        input.value = '';
        input.placeholder = 'Enter your guess here (e.g. Pizza, Rocket, Elephant)...';
        setTimeout(() => input.focus(), 150);
      }
      if (btn) btn.disabled = false;
    }
  }

  handleGuessFeedback(data) {
    const statusEl = document.getElementById('guessJudgeStatus');
    const statusText = document.getElementById('guessStatusText');
    const input = document.getElementById('dedicatedGuessInput');
    const btn = document.getElementById('btnJudgeGuess');
    if (!statusEl || !statusText) return;

    statusEl.className = `guess-judge-status ${data.result}`;

    if (data.result === 'correct') {
      statusText.innerHTML = `🎉 <strong>${data.message || 'CORRECT!'}</strong>`;
      if (input) {
        input.disabled = true;
        input.value = `✓ Solved: ${data.guess}`;
      }
      if (btn) btn.disabled = true;
    } else if (data.result === 'close') {
      statusText.innerHTML = `💡 <strong>Close!</strong> ${data.message || 'Almost there, check spelling!'}`;
    } else {
      statusText.innerHTML = `❌ <strong>Not quite:</strong> '${data.guess}' is incorrect. Try again!`;
    }
  }


  renderWordChoicesModal(choices) {
    const grid = document.getElementById('wordChoicesGrid');
    if (!grid || !Array.isArray(choices)) return;
    grid.innerHTML = '';

    choices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'word-choice-btn';
      btn.innerHTML = `
        <span class="word-choice-text">${choice.word}</span>
        <span class="word-difficulty-badge diff-${choice.difficulty}">Tier ${choice.difficulty}</span>
        <span style="font-size: 11px; color: var(--text-muted);">${choice.hint}</span>
      `;
      btn.onclick = () => {
        this.send({
          type: 'choose_word',
          word_index: idx
        });
        this.closeAllModals();
        window.soundEngine.playClick();
      };
      grid.appendChild(btn);
    });

    this.openModal('wordChoiceModal');
  }

  appendChatMessage(data) {
    const box = document.getElementById('chatMessagesBox');
    if (!box) return;

    const div = document.createElement('div');
    div.className = 'chat-msg normal';
    div.innerHTML = `<span class="msg-author">${data.player_name}:</span> ${data.message}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  appendCloseGuessHint(text) {
    const box = document.getElementById('chatMessagesBox');
    if (!box) return;

    const div = document.createElement('div');
    div.className = 'chat-msg close-hint';
    div.innerHTML = `💡 <strong>Hint:</strong> ${text}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  appendCorrectGuessBanner(data) {
    const box = document.getElementById('chatMessagesBox');
    if (!box) return;

    const div = document.createElement('div');
    div.className = 'chat-msg correct-guess';
    div.innerHTML = `🎉 <strong>${data.player_name}</strong> guessed the word! (+${data.points} pts)`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  renderRoundEndModal(data) {
    document.getElementById('roundEndWord').textContent = data.word.toUpperCase();
    const board = document.getElementById('roundEndLeaderboard');
    if (board && Array.isArray(data.leaderboard)) {
      board.innerHTML = '';
      data.leaderboard.slice(0, 5).forEach((p, i) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.padding = '6px 0';
        row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        row.innerHTML = `
          <span>#${i + 1} ${p.avatar} <strong>${p.name}</strong></span>
          <span style="font-weight: 800; color: var(--accent);">${p.score} pts ${p.round_score ? `(+${p.round_score})` : ''}</span>
        `;
        board.appendChild(row);
      });
    }
    this.openModal('roundEndModal');
  }

  renderPodiumModal(data) {
    const stage = document.getElementById('podiumStage');
    if (!stage || !Array.isArray(data.podium)) return;
    stage.innerHTML = '';

    const places = [
      { order: 2, class: 'second-place', rank: '2nd', p: data.podium[1] },
      { order: 1, class: 'first-place', rank: '👑 1st', p: data.podium[0] },
      { order: 3, class: 'third-place', rank: '3rd', p: data.podium[2] }
    ];

    places.forEach(slot => {
      if (slot.p) {
        const pillar = document.createElement('div');
        pillar.className = `podium-pillar ${slot.class}`;
        pillar.innerHTML = `
          <div class="podium-avatar">${slot.p.avatar}</div>
          <div class="podium-name">${slot.p.name}</div>
          <div class="podium-block">
            <span>${slot.rank}</span>
            <span class="podium-score-tag">${slot.p.score} pts</span>
          </div>
        `;
        stage.appendChild(pillar);
      }
    });

    // Awards
    const awardsDiv = document.getElementById('podiumAwardsList');
    if (awardsDiv && Array.isArray(data.awards)) {
      awardsDiv.innerHTML = '';
      data.awards.forEach(aw => {
        const item = document.createElement('div');
        item.style.padding = '6px 12px';
        item.style.background = 'rgba(255,255,255,0.04)';
        item.style.borderRadius = '8px';
        item.style.marginBottom = '6px';
        item.style.fontSize = '13px';
        item.innerHTML = `<strong>${aw.title}:</strong> ${aw.player} (${aw.desc})`;
        awardsDiv.appendChild(item);
      });
    }

    const btnRestart = document.getElementById('btnRestartGame');
    if (btnRestart) {
      btnRestart.style.display = this.isHost ? 'inline-flex' : 'none';
    }

    this.openModal('podiumModal');
  }

  // --- Confetti Particle System ---
  startConfetti() {
    this.confettiRunning = true;
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth || 600;
    canvas.height = canvas.parentElement.clientHeight || 500;

    const particles = [];
    const colors = ['#f59e0b', '#ec4899', '#6366f1', '#10b981', '#06b6d4', '#fde047'];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 10,
        tiltAngleIncremental: Math.random() * 0.07 + 0.05,
        tiltAngle: 0
      });
    }

    const loop = () => {
      if (!this.confettiRunning) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.tilt = Math.sin(p.tiltAngle - (p.r / 3)) * 15;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + (p.r / 4), p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + (p.r / 4));
        ctx.stroke();

        if (p.y > canvas.height) {
          p.x = Math.random() * canvas.width;
          p.y = -20;
        }
      });
      requestAnimationFrame(loop);
    };
    loop();
  }

  stopConfetti() {
    this.confettiRunning = false;
  }
}

// Instantiate application on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.doodleApp = new DoodleApp();
});
