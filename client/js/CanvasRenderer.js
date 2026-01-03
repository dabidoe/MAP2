/**
 * Canvas Renderer
 * Renders tokens on a Canvas overlay for tactical maps
 * Provides smooth 60fps dragging with proper event handling
 *
 * @typedef {Object} Token
 * @property {string} tokenId - Unique token ID
 * @property {string} name - Token name
 * @property {string} side - 'Continental' | 'Hessian'
 * @property {Object} grid - {posX: number, posY: number} (percentage)
 * @property {string} icon - Icon URL
 * @property {Object} stats - {hp, hpMax, ac}
 */

export class CanvasRenderer {
  /**
   * @param {HTMLElement} container - Container element for canvas
   * @param {Object} config - Configuration
   */
  constructor(container, config = {}) {
    this.container = container;
    this.config = {
      tokenSize: config.tokenSize || 50,
      borderWidth: config.borderWidth || 3,
      showHP: config.showHP !== false,
      enableDrag: config.enableDrag !== false,
      ...config
    };

    this.canvas = null;
    this.ctx = null;
    this.tokens = [];
    this.images = new Map(); // Cache loaded images
    this.backgroundImage = null; // Background tactical map
    this.backgroundReady = false; // Track if background is loaded

    this.dragState = {
      isDragging: false,
      draggedToken: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0
    };

    // Pan and Zoom state for tactical map
    this.panZoom = {
      zoom: 1.0,
      minZoom: 0.5,
      maxZoom: 3.0,
      panX: 0,
      panY: 0,
      isPanning: false,
      panStartX: 0,
      panStartY: 0
    };

    this.selectedToken = null;
    this.hoveredToken = null;

    // Track current gallery index for each token
    this.tokenGalleryIndex = new Map();

    this.listeners = {
      onTokenClick: null,
      onTokenDragEnd: null,
      onTokenHover: null
    };

    this._init();
  }

  /**
   * Initialize canvas
   * @private
   */
  _init() {
    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '1000';
    this.canvas.style.pointerEvents = 'auto';

    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Set canvas size
    this._resize();

    // Event listeners
    this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this._onMouseLeave(e));
    this.canvas.addEventListener('click', (e) => this._onClick(e));
    this.canvas.addEventListener('dblclick', (e) => this._onDoubleClick(e));
    this.canvas.addEventListener('contextmenu', (e) => this._onRightClick(e));
    this.canvas.addEventListener('wheel', (e) => this._onWheel(e));

    // Resize observer
    window.addEventListener('resize', () => this._resize());

    console.log('✅ CanvasRenderer initialized');
  }

  /**
   * Resize canvas to container
   * CRITICAL: Explicitly set to window dimensions for fullscreen
   * @private
   */
  _resize() {
    // EXPLICIT FULLSCREEN SIZING
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.render();
  }

  /**
   * Load and cache token icon
   * @private
   * @param {string} url - Image URL
   * @returns {Promise<HTMLImageElement>}
   */
  async _loadImage(url) {
    if (this.images.has(url)) {
      return this.images.get(url);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Allow CORS
      img.onload = () => {
        this.images.set(url, img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`Failed to load token image: ${url}`);
        // Create placeholder
        const placeholder = new Image();
        placeholder.src = 'data:image/svg+xml,' + encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50">
            <circle cx="25" cy="25" r="20" fill="#666"/>
          </svg>`
        );
        this.images.set(url, placeholder);
        resolve(placeholder);
      };
      img.src = url;
    });
  }

  /**
   * Set background tactical map image
   * CRITICAL: Await image load before rendering
   * @param {string} imageUrl - Tactical map background URL
   */
  async setBackgroundImage(imageUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.backgroundImage = img;
        this.backgroundReady = true;
        console.log('✅ Background image loaded:', imageUrl);
        this.render();
        resolve(img);
      };
      img.onerror = () => {
        console.error('❌ Failed to load background image:', imageUrl);
        this.backgroundReady = false;
        reject(new Error(`Failed to load ${imageUrl}`));
      };
      img.src = imageUrl;
    });
  }

  /**
   * Set tokens to render
   * @param {Array<Token>} tokens - Array of token data
   */
  async setTokens(tokens) {
    this.tokens = tokens;

    // Preload all images
    const loadPromises = tokens.map(token => this._loadImage(token.icon));
    await Promise.all(loadPromises);

    this.render();
  }

  /**
   * Update single token
   * @param {string} tokenId
   * @param {Object} updates - Token property updates
   */
  updateToken(tokenId, updates) {
    const token = this.tokens.find(t => t.tokenId === tokenId);
    if (token) {
      Object.assign(token, updates);
      this.render();
    }
  }

  /**
   * Render all tokens
   * CRITICAL: Draw background FIRST, then tokens
   */
  render() {
    if (!this.ctx) return;

    // EXPLICIT: Set canvas to fullscreen dimensions every frame
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background image FIRST (if loaded)
    if (this.backgroundReady && this.backgroundImage) {
      this._renderBackground();
    }

    // Render each token ON TOP
    this.tokens.forEach(token => {
      this._renderToken(token);
    });
  }

  /**
   * Render background tactical map WITH PAN AND ZOOM
   * @private
   */
  _renderBackground() {
    if (!this.backgroundImage) return;

    // Apply pan and zoom transformations
    this.ctx.save();
    this.ctx.translate(this.panZoom.panX, this.panZoom.panY);
    this.ctx.scale(this.panZoom.zoom, this.panZoom.zoom);

    // Draw background image to fill entire canvas
    // Use object-fit: contain logic to preserve aspect ratio
    const canvasAspect = this.canvas.width / this.canvas.height;
    const imageAspect = this.backgroundImage.width / this.backgroundImage.height;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (canvasAspect > imageAspect) {
      // Canvas is wider - fit to height
      drawHeight = this.canvas.height;
      drawWidth = drawHeight * imageAspect;
      offsetX = (this.canvas.width - drawWidth) / 2;
      offsetY = 0;
    } else {
      // Canvas is taller - fit to width
      drawWidth = this.canvas.width;
      drawHeight = drawWidth / imageAspect;
      offsetX = 0;
      offsetY = (this.canvas.height - drawHeight) / 2;
    }

    this.ctx.drawImage(
      this.backgroundImage,
      offsetX / this.panZoom.zoom,
      offsetY / this.panZoom.zoom,
      drawWidth / this.panZoom.zoom,
      drawHeight / this.panZoom.zoom
    );

    this.ctx.restore();
  }

  /**
   * Render single token
   * @private
   * @param {Token} token
   */
  _renderToken(token) {
    if (!token.grid) return;

    const { posX, posY } = token.grid;
    const x = (posX / 100) * this.canvas.width;
    const y = (posY / 100) * this.canvas.height;
    const size = this.config.tokenSize;
    const halfSize = size / 2;

    // Draw drop shadow
    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowOffsetX = 3;
    this.ctx.shadowOffsetY = 3;

    // Draw token circle background
    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(x, y, halfSize, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // Draw token icon (clipped to circle)
    const img = this.images.get(token.icon);
    if (img && img.complete) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(x, y, halfSize - this.config.borderWidth, 0, Math.PI * 2);
      this.ctx.clip();
      this.ctx.drawImage(
        img,
        x - halfSize + this.config.borderWidth,
        y - halfSize + this.config.borderWidth,
        size - this.config.borderWidth * 2,
        size - this.config.borderWidth * 2
      );
      this.ctx.restore();
    }

    // Draw gold border (VTT style)
    this.ctx.strokeStyle = '#d4af37'; // Gold
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(x, y, halfSize, 0, Math.PI * 2);
    this.ctx.stroke();

    // Draw selection highlight (brighter gold)
    if (this.selectedToken === token) {
      this.ctx.strokeStyle = '#FFD700';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(x, y, halfSize + 4, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Draw hover highlight
    if (this.hoveredToken === token && this.selectedToken !== token) {
      this.ctx.strokeStyle = '#FFF';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(x, y, halfSize + 2, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Draw HP bar (if enabled and stats available)
    if (this.config.showHP && token.stats && token.stats.hp !== undefined) {
      this._renderHPBar(token, x, y - halfSize - 8);
    }

    // Draw gallery indicator (if token has multiple images)
    if (token.gallery && token.gallery.length > 1) {
      this._renderGalleryIndicator(token, x + halfSize - 8, y - halfSize + 8);
    }

    // Draw name label
    if (this.hoveredToken === token || this.selectedToken === token) {
      this._renderLabel(token.name, x, y + halfSize + 15);
    }
  }

  /**
   * Render HP bar above token
   * @private
   */
  _renderHPBar(token, x, y) {
    const { hp, hpMax } = token.stats;
    const barWidth = this.config.tokenSize;
    const barHeight = 6;
    const hpPercent = Math.max(0, Math.min(1, hp / hpMax));

    // Background
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);

    // HP fill
    const hpColor = hpPercent > 0.5 ? '#4CAF50' : hpPercent > 0.25 ? '#FFA500' : '#f44336';
    this.ctx.fillStyle = hpColor;
    this.ctx.fillRect(x - barWidth / 2, y, barWidth * hpPercent, barHeight);

    // Border
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - barWidth / 2, y, barWidth, barHeight);
  }

  /**
   * Render text label
   * @private
   */
  _renderLabel(text, x, y) {
    this.ctx.font = '12px "Cinzel", serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    // Background
    const metrics = this.ctx.measureText(text);
    const padding = 4;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(
      x - metrics.width / 2 - padding,
      y - padding,
      metrics.width + padding * 2,
      14 + padding * 2
    );

    // Text
    this.ctx.fillStyle = '#e2d1b3';
    this.ctx.fillText(text, x, y);
  }

  /**
   * Render gallery indicator badge
   * @private
   */
  _renderGalleryIndicator(token, x, y) {
    const size = 16;
    const currentIndex = this.tokenGalleryIndex.get(token.tokenId) || 0;

    // Circle background
    this.ctx.fillStyle = 'rgba(197, 169, 89, 0.9)';
    this.ctx.beginPath();
    this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Border
    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    // Gallery icon (camera or images icon)
    this.ctx.fillStyle = '#1a1410';
    this.ctx.font = 'bold 10px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${currentIndex + 1}/${token.gallery.length}`, x, y);
  }

  /**
   * Get token at coordinates
   * @private
   */
  _getTokenAt(canvasX, canvasY) {
    const halfSize = this.config.tokenSize / 2;

    // Check in reverse order (top tokens first)
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const token = this.tokens[i];
      if (!token.grid) continue;

      const x = (token.grid.posX / 100) * this.canvas.width;
      const y = (token.grid.posY / 100) * this.canvas.height;

      const distance = Math.sqrt(
        Math.pow(canvasX - x, 2) + Math.pow(canvasY - y, 2)
      );

      if (distance <= halfSize) {
        return token;
      }
    }

    return null;
  }

  /**
   * Mouse down event
   * @private
   */
  _onMouseDown(e) {
    e.stopPropagation(); // Prevent map drag

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Middle click or space+click for panning
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      this.panZoom.isPanning = true;
      this.panZoom.panStartX = x - this.panZoom.panX;
      this.panZoom.panStartY = y - this.panZoom.panY;
      this.canvas.style.cursor = 'move';
      return;
    }

    // Token dragging (DM mode only)
    if (!this.config.enableDrag) return;

    const token = this._getTokenAt(x, y);

    if (token) {
      this.dragState.isDragging = true;
      this.dragState.draggedToken = token;
      this.dragState.startX = x;
      this.dragState.startY = y;
      this.dragState.offsetX = x - (token.grid.posX / 100) * this.canvas.width;
      this.dragState.offsetY = y - (token.grid.posY / 100) * this.canvas.height;

      this.canvas.style.cursor = 'grabbing';
    }
  }

  /**
   * Mouse move event
   * @private
   */
  _onMouseMove(e) {
    e.stopPropagation();

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle map panning
    if (this.panZoom.isPanning) {
      this.panZoom.panX = x - this.panZoom.panStartX;
      this.panZoom.panY = y - this.panZoom.panStartY;
      this.render();
      return;
    }

    // Handle token dragging
    if (this.dragState.isDragging && this.dragState.draggedToken) {
      const token = this.dragState.draggedToken;

      // Update position (percentage-based)
      const newPosX = ((x - this.dragState.offsetX) / this.canvas.width) * 100;
      const newPosY = ((y - this.dragState.offsetY) / this.canvas.height) * 100;

      token.grid.posX = Math.max(0, Math.min(100, newPosX));
      token.grid.posY = Math.max(0, Math.min(100, newPosY));

      this.render();
      return;
    }

    // Handle hover
    const hoveredToken = this._getTokenAt(x, y);

    if (hoveredToken !== this.hoveredToken) {
      this.hoveredToken = hoveredToken;
      this.canvas.style.cursor = hoveredToken ? 'pointer' : 'default';

      if (this.listeners.onTokenHover) {
        this.listeners.onTokenHover(hoveredToken);
      }

      this.render();
    }
  }

  /**
   * Mouse up event
   * @private
   */
  _onMouseUp(e) {
    if (this.dragState.isDragging && this.dragState.draggedToken) {
      e.stopPropagation();

      // Notify drag end
      if (this.listeners.onTokenDragEnd) {
        this.listeners.onTokenDragEnd(this.dragState.draggedToken);
      }
    }

    this.dragState.isDragging = false;
    this.dragState.draggedToken = null;
    this.panZoom.isPanning = false;
    this.canvas.style.cursor = this.hoveredToken ? 'pointer' : 'default';
  }

  /**
   * Mouse wheel event (zoom)
   * @private
   */
  _onWheel(e) {
    e.preventDefault();
    e.stopPropagation();

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom in or out
    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    const oldZoom = this.panZoom.zoom;
    const newZoom = Math.max(
      this.panZoom.minZoom,
      Math.min(this.panZoom.maxZoom, oldZoom * zoomDelta)
    );

    // Adjust pan to zoom towards mouse cursor
    const zoomRatio = newZoom / oldZoom;
    this.panZoom.panX = mouseX - (mouseX - this.panZoom.panX) * zoomRatio;
    this.panZoom.panY = mouseY - (mouseY - this.panZoom.panY) * zoomRatio;
    this.panZoom.zoom = newZoom;

    this.render();
  }

  /**
   * Mouse leave event
   * @private
   */
  _onMouseLeave(e) {
    this._onMouseUp(e);
    this.hoveredToken = null;
    this.render();
  }

  /**
   * Click event
   * @private
   */
  _onClick(e) {
    e.stopPropagation();

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const token = this._getTokenAt(x, y);

    if (token) {
      this.selectedToken = token;

      if (this.listeners.onTokenClick) {
        this.listeners.onTokenClick(token);
      }

      this.render();
    } else {
      // Click on empty space - deselect
      if (this.selectedToken) {
        this.selectedToken = null;
        this.render();
      }
    }
  }

  /**
   * Double-click event - Cycle token image
   * @private
   */
  _onDoubleClick(e) {
    e.stopPropagation();
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const token = this._getTokenAt(x, y);

    if (token) {
      this._cycleTokenImage(token);
    }
  }

  /**
   * Right-click event - Set target
   * @private
   */
  _onRightClick(e) {
    e.preventDefault(); // Prevent context menu
    e.stopPropagation();

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const token = this._getTokenAt(x, y);

    if (token && this.listeners.onTokenRightClick) {
      this.listeners.onTokenRightClick(token);
      this.render();
    }
  }

  /**
   * Cycle to next image in token's gallery
   * @param {Token} token
   */
  _cycleTokenImage(token) {
    if (!token.gallery || token.gallery.length <= 1) {
      console.log(`Token ${token.name} has no gallery to cycle through`);
      return;
    }

    // Get current index (default to 0)
    let currentIndex = this.tokenGalleryIndex.get(token.tokenId) || 0;

    // Increment and wrap
    currentIndex = (currentIndex + 1) % token.gallery.length;

    // Update index
    this.tokenGalleryIndex.set(token.tokenId, currentIndex);

    // Update token icon
    token.icon = token.gallery[currentIndex];

    // Preload new image and re-render
    this._loadImage(token.icon).then(() => {
      this.render();
      console.log(`🔄 Cycled ${token.name} to image ${currentIndex + 1}/${token.gallery.length}`);
    });
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} callback
   */
  on(event, callback) {
    if (event === 'tokenClick') {
      this.listeners.onTokenClick = callback;
    } else if (event === 'tokenRightClick') {
      this.listeners.onTokenRightClick = callback;
    } else if (event === 'tokenDragEnd') {
      this.listeners.onTokenDragEnd = callback;
    } else if (event === 'tokenHover') {
      this.listeners.onTokenHover = callback;
    }
  }

  /**
   * Show canvas
   */
  show() {
    this.canvas.style.display = 'block';
  }

  /**
   * Hide canvas
   */
  hide() {
    this.canvas.style.display = 'none';
  }

  /**
   * Clear all tokens
   */
  clear() {
    this.tokens = [];
    this.selectedToken = null;
    this.hoveredToken = null;
    this.render();
  }

  /**
   * Destroy renderer
   */
  destroy() {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.images.clear();
  }
}
