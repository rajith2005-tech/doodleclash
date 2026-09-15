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

    this.init();
  }

  init() {
    this.setupAvatarGrid();
    this.setupColorPalette();
    this.setupCanvas();
    this.attachDOMListeners();
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
      }, 500);
    }
  }


  setupIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- WebSocket Connection ---
  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    // Connect to WebSocket port 8001
    const wsUrl = `${protocol}//${host}:8001`;

    console.log(`Connecting to WebSocket at ${wsUrl}...`);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Connected to DoodleClash server!');
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
      console.warn('WebSocket connection closed. Reconnecting in 2s...');
      setTimeout(() => this.connectWebSocket(), 2000);
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket encountered an error:', err);
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
        if (!code) return;
        this.send({
          type: 'join_room',
          code,
          name,
          avatar: this.selectedAvatar
        });
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
        this.send({ type: 'leave_room' });
        this.showView('homeView');
        this.send({ type: 'get_public_rooms' });
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
    const protocol = window.location.protocol;
    const host = window.location.host;
    const roomParam = this.roomCode ? `?room=${this.roomCode}` : '';
    const shareUrl = `${protocol}//${host}/${roomParam}`;

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
    if (toolbar) {
      toolbar.style.opacity = isDrawer ? '1' : '0.4';
      toolbar.style.pointerEvents = isDrawer ? 'all' : 'none';
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
