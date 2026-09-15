/**
 * DoodleClash Canvas Drawing Engine
 * High-performance 2D Canvas with Flood Fill, Smooth Bézier Curves, Geometric Tools & Sync
 */

class DrawingCanvas {
  constructor(canvasElement, onActionCallback) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.onAction = onActionCallback || (() => {});

    // State
    this.isDrawing = false;
    this.isDrawingEnabled = false;
    this.currentTool = 'brush'; // brush, pencil, eraser, line, rect, circle, fill
    this.currentColor = '#1e293b';
    this.brushSize = 6;
    
    // Smooth drawing points buffer
    this.currentStroke = [];
    this.startPoint = null;
    
    // History Stack
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 30;

    // Canvas coordinate cache
    this.rect = this.canvas.getBoundingClientRect();

    this._setupCanvasResolution();
    this._attachEventListeners();
  }

  _setupCanvasResolution() {
    // Internal logical resolution (high-definition standard aspect ratio 4:3)
    this.logicalWidth = 800;
    this.logicalHeight = 600;
    this.canvas.width = this.logicalWidth;
    this.canvas.height = this.logicalHeight;
    this.clearLocal(false);
  }

  resize() {
    this.rect = this.canvas.getBoundingClientRect();
  }

  setTool(tool) {
    this.currentTool = tool;
    this.updateCursor();
  }

  setColor(color) {
    this.currentColor = color;
    this.updateCursor();
  }

  setBrushSize(size) {
    this.brushSize = parseInt(size, 10);
    this.updateCursor();
  }

  setEnabled(enabled) {
    this.isDrawingEnabled = enabled;
    this.updateCursor();
    if (!enabled) {
      this.isDrawing = false;
    }
  }

  updateCursor() {
    if (!this.isDrawingEnabled) {
      this.canvas.style.cursor = 'not-allowed';
      return;
    }
    if (this.currentTool === 'fill') {
      this.canvas.style.cursor = 'cell';
    } else if (this.currentTool === 'eraser') {
      this.canvas.style.cursor = 'grab';
    } else {
      this.canvas.style.cursor = 'crosshair';
    }
  }

  _getNormalizedCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { x, y };
  }

  _attachEventListeners() {
    const handleStart = (e) => {
      if (!this.isDrawingEnabled) return;
      e.preventDefault();
      const pos = this._getNormalizedCoords(e);

      if (this.currentTool === 'fill') {
        this.floodFill(pos.x, pos.y, this.currentColor, true);
        return;
      }

      this.isDrawing = true;
      this.startPoint = pos;
      this.currentStroke = [pos];

      const action = {
        action: 'start',
        tool: this.currentTool,
        color: this.currentColor,
        size: this.brushSize,
        x: pos.x,
        y: pos.y
      };

      this._executeDrawAction(action);
      this.onAction(action);
    };

    const handleMove = (e) => {
      if (!this.isDrawingEnabled || !this.isDrawing) return;
      e.preventDefault();
      const pos = this._getNormalizedCoords(e);
      
      // Filter micro jitter
      const last = this.currentStroke[this.currentStroke.length - 1];
      if (last && Math.hypot(pos.x - last.x, pos.y - last.y) < 0.002) return;

      this.currentStroke.push(pos);

      const action = {
        action: 'step',
        tool: this.currentTool,
        color: this.currentColor,
        size: this.brushSize,
        x: pos.x,
        y: pos.y,
        startX: this.startPoint.x,
        startY: this.startPoint.y
      };

      this._executeDrawAction(action);
      this.onAction(action);
    };

    const handleEnd = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      this.isDrawing = false;

      const action = {
        action: 'end',
        tool: this.currentTool,
        color: this.currentColor,
        size: this.brushSize,
        startX: this.startPoint ? this.startPoint.x : 0,
        startY: this.startPoint ? this.startPoint.y : 0,
        endX: this.currentStroke.length ? this.currentStroke[this.currentStroke.length - 1].x : 0,
        endY: this.currentStroke.length ? this.currentStroke[this.currentStroke.length - 1].y : 0
      };

      this._executeDrawAction(action);
      this.onAction(action);
      this.saveHistoryState();
      this.currentStroke = [];
      this.startPoint = null;
    };

    // Pointer events for desktop & touch devices
    this.canvas.addEventListener('pointerdown', handleStart);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);
    window.addEventListener('resize', () => this.resize());
  }

  _executeDrawAction(data) {
    const { action, tool, color, size, x, y, startX, startY } = data;
    const px = (x || 0) * this.logicalWidth;
    const py = (y || 0) * this.logicalHeight;
    const sX = (startX || 0) * this.logicalWidth;
    const sY = (startY || 0) * this.logicalHeight;

    this.ctx.save();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.fillStyle = '#ffffff';
    } else {
      this.ctx.strokeStyle = color || '#1e293b';
      this.ctx.fillStyle = color || '#1e293b';
    }
    this.ctx.lineWidth = size || 5;

    if (action === 'start') {
      this.ctx.beginPath();
      this.ctx.arc(px, py, (size || 5) / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.lastPoint = { x: px, y: py };
    } else if (action === 'step') {
      if (tool === 'brush' || tool === 'pencil' || tool === 'eraser') {
        if (!this.lastPoint) this.lastPoint = { x: px, y: py };
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
        
        // Midpoint quadratic curve for buttery smooth lines
        const midX = (this.lastPoint.x + px) / 2;
        const midY = (this.lastPoint.y + py) / 2;
        this.ctx.quadraticCurveTo(this.lastPoint.x, this.lastPoint.y, midX, midY);
        this.ctx.lineTo(px, py);
        this.ctx.stroke();
        this.lastPoint = { x: px, y: py };
      }
    } else if (action === 'end') {
      if (tool === 'line') {
        this.ctx.beginPath();
        this.ctx.moveTo(sX, sY);
        const eX = (data.endX || x || 0) * this.logicalWidth;
        const eY = (data.endY || y || 0) * this.logicalHeight;
        this.ctx.lineTo(eX, eY);
        this.ctx.stroke();
      } else if (tool === 'rect') {
        const eX = (data.endX || x || 0) * this.logicalWidth;
        const eY = (data.endY || y || 0) * this.logicalHeight;
        this.ctx.strokeRect(Math.min(sX, eX), Math.min(sY, eY), Math.abs(eX - sX), Math.abs(eY - sY));
      } else if (tool === 'circle') {
        const eX = (data.endX || x || 0) * this.logicalWidth;
        const eY = (data.endY || y || 0) * this.logicalHeight;
        const radiusX = Math.abs(eX - sX) / 2;
        const radiusY = Math.abs(eY - sY) / 2;
        const centerX = Math.min(sX, eX) + radiusX;
        const centerY = Math.min(sY, eY) + radiusY;
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        this.ctx.stroke();
      }
      this.lastPoint = null;
    } else if (action === 'fill') {
      this.floodFill(x, y, color, false);
    } else if (action === 'clear') {
      this.clearLocal(false);
    }

    this.ctx.restore();
  }

  // Handle incoming remote draw actions from other players
  handleRemoteAction(data) {
    this._executeDrawAction(data);
    if (data.action === 'end' || data.action === 'fill' || data.action === 'clear') {
      this.saveHistoryState();
    }
  }

  // Batch replay entire history for joining/reconnecting players
  replayHistory(historyActions) {
    this.clearLocal(false);
    if (!Array.isArray(historyActions)) return;
    for (const action of historyActions) {
      this._executeDrawAction(action);
    }
    this.saveHistoryState();
  }

  clearLocal(triggerCallback = true) {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
    if (triggerCallback) {
      const action = { action: 'clear' };
      this.onAction(action);
      this.saveHistoryState();
    }
  }

  clear() {
    this.clearLocal(true);
  }

  saveHistoryState() {
    try {
      const snapshot = this.ctx.getImageData(0, 0, this.logicalWidth, this.logicalHeight);
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }
      this.history.push(snapshot);
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      } else {
        this.historyIndex++;
      }
    } catch (e) {
      console.warn("Snapshot capture error", e);
    }
  }

  undo() {
    if (!this.isDrawingEnabled || this.historyIndex <= 0) return;
    this.historyIndex--;
    const state = this.history[this.historyIndex];
    if (state) {
      this.ctx.putImageData(state, 0, 0);
      // Synchronize full snapshot to peers
      this.broadcastSnapshot();
    }
  }

  redo() {
    if (!this.isDrawingEnabled || this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    const state = this.history[this.historyIndex];
    if (state) {
      this.ctx.putImageData(state, 0, 0);
      this.broadcastSnapshot();
    }
  }

  broadcastSnapshot() {
    try {
      const dataUrl = this.canvas.toDataURL('image/png', 0.85);
      this.onAction({ action: 'snapshot', image: dataUrl });
    } catch (e) {}
  }

  loadSnapshot(dataUrl) {
    const img = new Image();
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
      this.ctx.drawImage(img, 0, 0);
      this.saveHistoryState();
    };
    img.src = dataUrl;
  }

  // High-performance 4-Way Stack Flood Fill
  floodFill(normX, normY, fillColorHex, triggerCallback = true) {
    const startX = Math.floor(normX * this.logicalWidth);
    const startY = Math.floor(normY * this.logicalHeight);

    if (startX < 0 || startX >= this.logicalWidth || startY < 0 || startY >= this.logicalHeight) return;

    const imgData = this.ctx.getImageData(0, 0, this.logicalWidth, this.logicalHeight);
    const data = imgData.data;
    const width = this.logicalWidth;
    const height = this.logicalHeight;

    // Convert hex to RGBA
    const tempEl = document.createElement('div');
    tempEl.style.color = fillColorHex;
    document.body.appendChild(tempEl);
    const rgbStr = window.getComputedStyle(tempEl).color;
    document.body.removeChild(tempEl);
    
    const rgbMatch = rgbStr.match(/\d+/g);
    const fillR = rgbMatch ? parseInt(rgbMatch[0], 10) : 0;
    const fillG = rgbMatch ? parseInt(rgbMatch[1], 10) : 0;
    const fillB = rgbMatch ? parseInt(rgbMatch[2], 10) : 0;
    const fillA = 255;

    const startIndex = (startY * width + startX) * 4;
    const targetR = data[startIndex];
    const targetG = data[startIndex + 1];
    const targetB = data[startIndex + 2];
    const targetA = data[startIndex + 3];

    // Already target color?
    if (
      Math.abs(targetR - fillR) < 10 &&
      Math.abs(targetG - fillG) < 10 &&
      Math.abs(targetB - fillB) < 10
    ) {
      return;
    }

    const colorMatch = (idx) => {
      const dr = Math.abs(data[idx] - targetR);
      const dg = Math.abs(data[idx + 1] - targetG);
      const db = Math.abs(data[idx + 2] - targetB);
      return (dr + dg + db) < 40; // Tolerance
    };

    const pixelStack = [[startX, startY]];
    const visited = new Uint8Array(width * height);

    while (pixelStack.length > 0) {
      const [x, y] = pixelStack.pop();
      let currentY = y;
      let idx = (currentY * width + x) * 4;

      while (currentY >= 0 && colorMatch(idx)) {
        currentY--;
        idx -= width * 4;
      }
      currentY++;
      idx += width * 4;

      let reachLeft = false;
      let reachRight = false;

      while (currentY < height && colorMatch(idx)) {
        data[idx] = fillR;
        data[idx + 1] = fillG;
        data[idx + 2] = fillB;
        data[idx + 3] = fillA;
        visited[currentY * width + x] = 1;

        if (x > 0) {
          const leftIdx = idx - 4;
          if (colorMatch(leftIdx)) {
            if (!reachLeft) {
              pixelStack.push([x - 1, currentY]);
              reachLeft = true;
            }
          } else {
            reachLeft = false;
          }
        }

        if (x < width - 1) {
          const rightIdx = idx + 4;
          if (colorMatch(rightIdx)) {
            if (!reachRight) {
              pixelStack.push([x + 1, currentY]);
              reachRight = true;
            }
          } else {
            reachRight = false;
          }
        }

        currentY++;
        idx += width * 4;
      }
    }

    this.ctx.putImageData(imgData, 0, 0);

    if (triggerCallback) {
      const action = {
        action: 'fill',
        x: normX,
        y: normY,
        color: fillColorHex
      };
      this.onAction(action);
      this.saveHistoryState();
    }
  }
}

window.DrawingCanvas = DrawingCanvas;
