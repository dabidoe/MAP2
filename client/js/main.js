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
  }

  /**
   * Initialize application
   */
  async init() {
    console.log('═══════════════════════════════════════════');
    console.log('🎖️  WAR ROOM 1776 - EPISODE 0.1');
    console.log('═══════════════════════════════════════════');

    try {
      // Load game data from API
      await this.gameState.loadFromAPI('/api/campaign');

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
   * @private
   */
  _setupTacticalContainer() {
    // Create tactical container (positioned over map)
    this.tacticalContainer = document.createElement('div');
    this.tacticalContainer.id = 'tactical-container';
    this.tacticalContainer.style.position = 'absolute';
    this.tacticalContainer.style.top = '50%';
    this.tacticalContainer.style.left = '50%';
    this.tacticalContainer.style.transform = 'translate(-50%, -50%)';
    this.tacticalContainer.style.width = '90vh';
    this.tacticalContainer.style.height = '90vh';
    this.tacticalContainer.style.zIndex = '5000';
    this.tacticalContainer.style.display = 'none';
    this.tacticalContainer.style.border = '5px solid #c5a959';
    this.tacticalContainer.style.background = '#000';
    this.tacticalContainer.style.boxShadow = '0 0 30px rgba(0,0,0,0.9)';

    document.getElementById('map-viewport').appendChild(this.tacticalContainer);

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

    this.canvasRenderer.on('tokenDragEnd', (token) => {
      console.log(`Token ${token.name} moved to grid position:`, token.grid);
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
    this.backButton.style.bottom = '20px';
    this.backButton.style.left = '250px';
    this.backButton.style.display = 'none';
    this.backButton.style.zIndex = '6000';
    this.backButton.onclick = () => this._exitTacticalView();
    document.body.appendChild(this.backButton);

    // DM Mode toggle
    this.dmToggle = document.createElement('button');
    this.dmToggle.innerHTML = 'Toggle DM Mode';
    this.dmToggle.className = 'cycle-button';
    this.dmToggle.style.position = 'absolute';
    this.dmToggle.style.top = '20px';
    this.dmToggle.style.right = '20px';
    this.dmToggle.style.zIndex = '6000';
    this.dmToggle.onclick = () => this._toggleDMMode();
    document.body.appendChild(this.dmToggle);
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

      this.mapEngine.addLocationMarker(location, (loc) => {
        this._enterTacticalView(loc);
      });
    });

    // Render character tokens on world map
    state.tokens.forEach(token => {
      // Only show friendly tokens in PLAYER mode
      if (state.mode === 'PLAYER' && token.side !== 'Continental') {
        return;
      }

      const isDraggable = state.mode === 'DM';

      this.mapEngine.addTokenMarker(token, isDraggable, (movedToken, newPos) => {
        console.log(`Token ${movedToken.name} moved to:`, newPos);
        this.gameState.updateTokenPosition(movedToken.tokenId, {
          lat: newPos.lat,
          lng: newPos.lng
        });

        // Emit to server
        this.socket?.emit('token_move', {
          tokenId: movedToken.tokenId,
          gps: { lat: newPos.lat, lng: newPos.lng }
        });
      });
    });
  }

  /**
   * Enter tactical view for a location
   * @private
   */
  _enterTacticalView(location) {
    console.log(`Entering tactical view: ${location.title}`);

    this.gameState.setActiveLocation(location);

    // Enter tactical view on map
    this.mapEngine.enterTacticalView(location);

    // Show tactical container
    this.tacticalContainer.style.display = 'block';

    // Get tokens at this location
    const tokens = this.gameState.getTokensAt(location.id);

    console.log(`Found ${tokens.length} tokens at ${location.id}:`, tokens.map(t => t.name));

    // Render tokens on canvas
    this.canvasRenderer.setTokens(tokens);

    // Show back button
    this.backButton.style.display = 'block';

    // Add tactical-active class for styling
    document.body.classList.add('tactical-active');
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
