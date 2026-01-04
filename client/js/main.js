/**
 * War Room 1776 - Main Application
 * Episode 0.1: Winter Ambush
 *
 * Professional VTT with modular architecture
 */

import { MapEngine } from './MapEngine.js';
import { CanvasRenderer } from './CanvasRenderer.js';
import { GameState } from './GameState.js';
import { CommandDashboard } from './components/CommandDashboard.js';

/**
 * Main Application Class
 */
class WarRoom1776 {
  constructor() {
    this.gameState = new GameState();
    this.mapEngine = null;
    this.canvasRenderer = null;
    this.dashboard = null;
    this.socket = null;

    // Tactical view container
    this.tacticalContainer = null;

    // UI elements
    this.backButton = null;
    this.dmToggle = null;
    this.mapSwitcher = null;
    this.currentMapVariant = 0; // Track which variant is displayed

    // Targeting system
    this.targetedToken = null;
  }

  /**
   * Initialize application
   */
  async init() {
    console.log('═══════════════════════════════════════════');
    console.log('🎖️  WAR ROOM 1776 - EPISODE 0.1');
    console.log('═══════════════════════════════════════════');

    try {
      // Load game data from JSON files (JSON-PRIMARY strategy)
      await this.gameState.loadFromJSON();

      // Initialize map engine
      this.mapEngine = new MapEngine('map', {
        worldZoom: 13,
        center: [40.2985, -74.8718] // McConkey's Ferry
      });

      // Initialize command dashboard
      this.dashboard = new CommandDashboard(this.gameState);

      // Initialize Socket.io
      this._initSocket();

      // Create UI controls
      this._createControls();

      // Setup tactical view container
      this._setupTacticalContainer();

      // Subscribe to game state changes
      this._subscribeToEvents();

      // Render initial state
      this._renderWorldMap();

      console.log('✅ War Room 1776 initialized successfully');
      console.log('═══════════════════════════════════════════');

    } catch (error) {
      console.error('❌ Failed to initialize War Room 1776:', error);
      this._showError('Failed to load game data. Please refresh the page.');
    }
  }

  /**
   * Setup tactical container for Canvas rendering
   * TRUE FULLSCREEN (100vw x 100vh)
   * @private
   */
  _setupTacticalContainer() {
    // Create tactical container (TRUE FULLSCREEN)
    this.tacticalContainer = document.createElement('div');
    this.tacticalContainer.id = 'tactical-canvas-container';
    this.tacticalContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 100;
      display: none;
      background: #000;
    `;

    document.body.appendChild(this.tacticalContainer);

    // Initialize Canvas renderer (will be shown when entering tactical view)
    this.canvasRenderer = new CanvasRenderer(this.tacticalContainer, {
      tokenSize: 50,
      showHP: true,
      enableDrag: false // Will be enabled in DM mode
    });

    this.canvasRenderer.on('tokenClick', (token) => {
      this.gameState.selectToken(token);
      console.log('Token selected:', token.name);
    });

    this.canvasRenderer.on('tokenRightClick', (token) => {
      // Right-click to set target
      if (this.targetedToken && this.targetedToken.tokenId === token.tokenId) {
        // Untarget if clicking the same token
        this.targetedToken = null;
        this.dashboard.addConsoleMessage('system', '🎯 Target cleared');
        console.log('Target cleared');
      } else {
        this.targetedToken = token;
        this.dashboard.addConsoleMessage('system', `🎯 Targeting: ${token.name}`);
        console.log('Target set:', token.name);
      }

      // Pass target to dashboard
      if (this.dashboard) {
        this.dashboard.setTarget(this.targetedToken);
      }
    });

    this.canvasRenderer.on('tokenDragEnd', (token) => {
      console.log(`Token ${token.name} moved to grid position:`, token.grid);

      // Check for portal collision
      this._checkPortals(token);

      // Emit to server
      this.socket?.emit('token_move', {
        tokenId: token.tokenId,
        grid: token.grid
      });
    });
  }

  /**
   * Create UI controls
   * @private
   */
  _createControls() {
    // Back button (return to world map)
    this.backButton = document.createElement('button');
    this.backButton.innerHTML = '← Return to Campaign Map';
    this.backButton.className = 'cycle-button';
    this.backButton.style.position = 'absolute';
    this.backButton.style.top = '20px';
    this.backButton.style.left = '50%';
    this.backButton.style.transform = 'translateX(-50%)';
    this.backButton.style.display = 'none';
    this.backButton.style.zIndex = '6000';
    this.backButton.onclick = () => this._exitTacticalView();
    document.body.appendChild(this.backButton);

    // DM Mode toggle
    this.dmToggle = document.createElement('button');
    this.dmToggle.innerHTML = 'Toggle DM Mode';
    this.dmToggle.className = 'cycle-button';
    this.dmToggle.style.position = 'absolute';
    this.dmToggle.style.bottom = '20px';
    this.dmToggle.style.right = '20px';
    this.dmToggle.style.zIndex = '6000';
    this.dmToggle.onclick = () => this._toggleDMMode();
    document.body.appendChild(this.dmToggle);

    // DM Map Switcher (for cycling through tactical map variants)
    this._createMapSwitcher();
  }

  /**
   * Create DM map switcher UI
   * @private
   */
  _createMapSwitcher() {
    this.mapSwitcher = document.createElement('div');
    this.mapSwitcher.id = 'map-switcher';
    this.mapSwitcher.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      display: none;
      z-index: 6000;
    `;

    this.mapSwitcher.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; font-family: 'Cinzel', serif;">
        <button id="map-prev" style="
          background: none;
          border: none;
          color: #c5a959;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
          opacity: 0.8;
          transition: opacity 0.2s;
        ">‹</button>
        <span id="map-variant-label" style="
          font-size: 0.9rem;
          color: #c5a959;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
          user-select: none;
        ">1/4</span>
        <button id="map-next" style="
          background: none;
          border: none;
          color: #c5a959;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
          opacity: 0.8;
          transition: opacity 0.2s;
        ">›</button>
      </div>
    `;

    document.body.appendChild(this.mapSwitcher);

    // Wire up buttons with hover effects
    const prevBtn = document.getElementById('map-prev');
    const nextBtn = document.getElementById('map-next');

    prevBtn.onclick = () => this._cycleMapVariant(-1);
    nextBtn.onclick = () => this._cycleMapVariant(1);

    prevBtn.onmouseenter = () => prevBtn.style.opacity = '1';
    prevBtn.onmouseleave = () => prevBtn.style.opacity = '0.8';
    nextBtn.onmouseenter = () => nextBtn.style.opacity = '1';
    nextBtn.onmouseleave = () => nextBtn.style.opacity = '0.8';
  }

  /**
   * Initialize Socket.io connection
   * @private
   */
  _initSocket() {
    this.socket = io();

    this.socket.on('connect', () => {
      console.log('⚔️ Connected to War Room server');
    });

    this.socket.on('update_token', (data) => {
      console.log('Token update received:', data);
      this.gameState.updateTokenPosition(data.tokenId, data.gps, data.grid);
      this._renderCurrentView();
    });

    this.socket.on('encounter_start', (data) => {
      console.log('Encounter started:', data);
      this.gameState.startEncounter(data);
    });

    this.socket.on('initiative_update', (data) => {
      console.log('Initiative update:', data);
      this.gameState.addToInitiative(data.tokenId, data.name, data.roll);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }

  /**
   * Subscribe to game state events
   * @private
   */
  _subscribeToEvents() {
    // Render when mode changes
    this.gameState.on('modeChange', (mode) => {
      console.log(`Mode changed to: ${mode}`);
      this.canvasRenderer.config.enableDrag = (mode === 'DM');
      this._renderCurrentView();
    });

    // Render when tokens update
    this.gameState.on('tokenUpdate', () => {
      this._renderCurrentView();
    });

    this.gameState.on('tokenMove', () => {
      this._renderCurrentView();
    });
  }

  /**
   * Render world map
   * @private
   */
  _renderWorldMap() {
    const state = this.gameState.getState();

    // Clear existing markers
    this.mapEngine.clearMarkers();

    // Render locations
    state.locations.forEach(location => {
      // Only show discovered locations in PLAYER mode
      if (state.mode === 'PLAYER' && !this.gameState.isLocationDiscovered(location.id)) {
        return;
      }

      // Get tokens at this location for tooltip
      const tokensAtLocation = this.gameState.getTokensAt(location.id);

      this.mapEngine.addLocationMarker(location, (loc) => {
        this._enterTacticalView(loc);
      }, tokensAtLocation);
    });

    // DO NOT render character tokens on world map
    // Characters are only visible in tactical view
  }

  /**
   * Enter tactical view for a location
   * CRITICAL: Await background image load before rendering tokens
   * @private
   */
  async _enterTacticalView(location) {
    console.log(`Entering tactical view: ${location.title}`);

    this.gameState.setActiveLocation(location);
    this.currentMapVariant = 0; // Reset to default variant

    // Enter tactical view on map
    this.mapEngine.enterTacticalView(location);

    // Show tactical container
    this.tacticalContainer.style.display = 'block';

    // Add tactical-active class for styling (hide world map)
    document.body.classList.add('tactical-active');

    // CRITICAL: Load background image FIRST, await completion
    try {
      console.log('⏳ Loading tactical map background...');
      await this.canvasRenderer.setBackgroundImage(location.tacticalMapUrl);
      console.log('✅ Background loaded, now loading tokens...');
    } catch (error) {
      console.error('❌ Failed to load tactical background:', error);
    }

    // Get tokens at this location
    const tokens = this.gameState.getTokensAt(location.id);
    console.log(`Found ${tokens.length} tokens at ${location.id}:`, tokens.map(t => t.name));

    // Enhance tokens with character gallery data
    const enhancedTokens = await this._enhanceTokensWithGallery(tokens);

    // AFTER background is loaded, render tokens on canvas
    await this.canvasRenderer.setTokens(enhancedTokens);

    // Show back button
    this.backButton.style.display = 'block';

    // Show map switcher if in DM mode
    if (this.gameState.getState().mode === 'DM') {
      this.mapSwitcher.style.display = 'block';
    }

    // Show tactical UI elements (chat, unit card)
    const chatPanel = document.getElementById('floating-console');
    if (chatPanel) chatPanel.style.display = 'flex';

    // Show GW welcome message only when entering camp (frozen_vigil)
    if (location.id === 'frozen_vigil') {
      this.dashboard.addConsoleMessage(
        'npc',
        "Gen. Washington: Greetings soldiers, get warm by the fire. I'll be addressing the camp in a few minutes."
      );
    }

    console.log('✅ Tactical view fully loaded');
  }

  /**
   * Exit tactical view
   * @private
   */
  _exitTacticalView() {
    console.log('Exiting tactical view');

    this.gameState.setActiveLocation(null);

    // Exit tactical view on map
    this.mapEngine.exitTacticalView();

    // Hide tactical container
    this.tacticalContainer.style.display = 'none';

    // Clear canvas
    this.canvasRenderer.clear();

    // Hide back button
    this.backButton.style.display = 'none';

    // Hide map switcher
    this.mapSwitcher.style.display = 'none';

    // Hide tactical UI elements (chat, unit card)
    const chatPanel = document.getElementById('floating-console');
    if (chatPanel) chatPanel.style.display = 'none';

    const unitCard = document.getElementById('floating-unit-card');
    if (unitCard) unitCard.style.display = 'none';

    // Remove tactical-active class
    document.body.classList.remove('tactical-active');

    // Re-render world map
    this._renderWorldMap();
  }

  /**
   * Toggle DM mode
   * @private
   */
  _toggleDMMode() {
    this.gameState.toggleMode();
    const mode = this.gameState.getState().mode;
    alert(`Switched to ${mode} Mode`);
  }

  /**
   * Cycle through map variants (DM only)
   * @private
   */
  _cycleMapVariant(direction) {
    const state = this.gameState.getState();
    if (state.mode !== 'DM' || !state.ui.activeLocation) return;

    const location = state.ui.activeLocation;
    const baseUrl = location.tacticalMapUrl;

    // Determine available variants (we have variants 0, 1, 2, 3)
    const maxVariants = 4;
    this.currentMapVariant = (this.currentMapVariant + direction + maxVariants) % maxVariants;

    // Generate new URL
    let newUrl;
    if (this.currentMapVariant === 0) {
      newUrl = baseUrl; // Base variant has no suffix
    } else {
      // Replace .png with (1).png, (2).png, or (3).png
      newUrl = baseUrl.replace('.png', ` (${this.currentMapVariant}).png`);
    }

    console.log(`Switching to map variant ${this.currentMapVariant}: ${newUrl}`);

    // Update map overlay
    this.mapEngine.setTacticalMapImage(newUrl);

    // Update label
    document.getElementById('map-variant-label').textContent = `${this.currentMapVariant + 1}/4`;
  }

  /**
   * Enhance tokens with character gallery data
   * @private
   */
  async _enhanceTokensWithGallery(tokens) {
    const characters = this.gameState.getState().characters;

    return tokens.map(token => {
      // Find matching character by name
      const character = characters.find(c => c.name === token.name);

      if (character && character.gallery && character.gallery.length > 0) {
        // Add gallery to token
        return {
          ...token,
          gallery: character.gallery
        };
      }

      return token;
    });
  }

  /**
   * Check if token landed on a portal/door
   * @private
   */
  _checkPortals(token) {
    const state = this.gameState.getState();
    const currentLocation = state.locations.find(l => l.id === state.ui.activeLocation);

    if (!currentLocation || !currentLocation.portals) return;

    // Get token position (grid coordinates are in percentage)
    const tokenX = token.grid.posX;
    const tokenY = token.grid.posY;

    // Check each portal for collision
    for (const portal of currentLocation.portals) {
      const portalX = portal.position.x;
      const portalY = portal.position.y;
      const portalRadius = portal.radius || 5;

      // Calculate distance
      const distance = Math.sqrt(
        Math.pow(tokenX - portalX, 2) + Math.pow(tokenY - portalY, 2)
      );

      // Check if token is within portal radius
      if (distance <= portalRadius) {
        console.log(`🚪 Portal triggered: ${portal.label} → ${portal.destination}`);

        // Show transition message in chat
        if (this.dashboard) {
          this.dashboard.addConsoleMessage(
            'system',
            `🚪 ${token.name} entered: ${portal.label}`
          );
        }

        // Trigger scene transition after a short delay
        setTimeout(() => {
          this._transitionToLocation(portal.destination, token.tokenId);
        }, 500);

        return; // Only trigger one portal
      }
    }
  }

  /**
   * Transition token to a new location
   * @private
   */
  _transitionToLocation(destinationId, tokenId) {
    const state = this.gameState.getState();
    const destination = state.locations.find(l => l.id === destinationId);

    if (!destination) {
      console.error(`Destination location not found: ${destinationId}`);
      return;
    }

    // Update token location
    const token = state.tokens.find(t => t.tokenId === tokenId);
    if (token) {
      token.locationId = destinationId;
      token.grid = { posX: 50, posY: 50 }; // Spawn in center of new location
    }

    // Show notification
    if (this.dashboard) {
      this.dashboard.addConsoleMessage(
        'discovery',
        `📍 Arrived at: ${destination.title}`
      );
    }

    // Re-enter tactical view at new location
    this._enterTacticalView(destination);
  }

  /**
   * Render current view (world or tactical)
   * @private
   */
  _renderCurrentView() {
    const state = this.gameState.getState();

    if (state.ui.mapMode === 'tactical' && state.ui.activeLocation) {
      // Re-render tactical view
      const tokens = this.gameState.getTokensAt(state.ui.activeLocation.id);
      this.canvasRenderer.setTokens(tokens);
    } else {
      // Re-render world map
      this._renderWorldMap();
    }
  }

  /**
   * Show error message
   * @private
   */
  _showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #f44336;
      color: white;
      padding: 20px 40px;
      border-radius: 8px;
      font-family: 'Cinzel', serif;
      z-index: 10000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
  }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new WarRoom1776();
    app.init();
  });
} else {
  const app = new WarRoom1776();
  app.init();
}
