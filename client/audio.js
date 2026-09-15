/**
 * DoodleClash Procedural Sound Engine (Web Audio API)
 * Zero external audio asset dependencies!
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.6;
    this._initOnUserInteraction();
  }

  _initOnUserInteraction() {
    const unlock = () => {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  setMuted(muted) {
    this.muted = muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  _playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.3) {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(gainVal * this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }

  playClick() {
    this._playTone(800, 'sine', 0.05, 0.2);
  }

  playDraw() {
    this._playTone(320 + Math.random() * 40, 'triangle', 0.04, 0.08);
  }

  playTurnStart() {
    if (this.muted || !this.ctx) return;
    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this._playTone(freq, 'triangle', 0.25, 0.4);
      }, idx * 100);
    });
  }

  playCorrectGuess() {
    if (this.muted || !this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C major chime
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this._playTone(freq, 'sine', 0.35, 0.5);
      }, idx * 80);
    });
  }

  playCloseGuess() {
    this._playTone(600, 'sine', 0.15, 0.3);
    setTimeout(() => this._playTone(750, 'sine', 0.18, 0.3), 120);
  }

  playTick() {
    this._playTone(900, 'square', 0.04, 0.15);
  }

  playWarningTick() {
    this._playTone(1200, 'square', 0.06, 0.25);
  }

  playTimeUp() {
    if (this.muted || !this.ctx) return;
    const notes = [400, 350, 300, 220];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this._playTone(freq, 'sawtooth', 0.2, 0.3);
      }, idx * 110);
    });
  }

  playReaction() {
    this._playTone(500 + Math.random() * 400, 'sine', 0.12, 0.25);
  }

  playVictory() {
    if (this.muted || !this.ctx) return;
    const chords = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    chords.forEach((freq, idx) => {
      setTimeout(() => {
        this._playTone(freq, 'triangle', 0.6, 0.5);
      }, idx * 120);
    });
  }
}

window.soundEngine = new SoundEngine();
