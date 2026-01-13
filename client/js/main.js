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
import { Grimoire } from './components/Grimoire.js';
import { Armory } from './components/Armory.js';
import { HotbarUI } from './components/HotbarUI.js';
import { CharacterSheet } from './components/CharacterSheet.js';
import AIAssistant from './components/AIAssistant.js';

/**
 * Main Application Class
 */
class WarRoom1776 {
  constructor() {
    this.gameState = new GameState();
    this.mapEngine = null;
    this.canvasRenderer = null;
    this.dashboard = null;
    this.grimoire = null;
    this.armory = null;
    this.hotbar = null;
    this.characterSheet = null;
    this.aiAssistant = null;
    this.socket = null;

    // Tactical view container
    this.tacticalContainer = null;

    // UI elements
    this.backButton = null;
    this.mapVariantControls = null;
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

      // Initialize sidebar
      this._initSidebar();

      // Initialize Grimoire
      this.grimoire = new Grimoire();

      // Initialize Armory
      this.armory = new Armory();

      // Initialize Hotbar UI (after dashboard, pass grimoire for spell icons)
      this.hotbar = new HotbarUI(this.gameState, this.dashboard, this.grimoire);

      // Initialize Character Sheet (pass grimoire for spell lookups and dashboard for console output)
      this.characterSheet = new CharacterSheet(this.grimoire, this.dashboard);

      // Initialize AI Assistant
      this.aiAssistant = new AIAssistant('ai-assistant-panel');
      this.aiAssistant.setGameState(this.gameState);

      // Setup AI Assistant sidebar button
      const aiSidebarBtn = document.getElementById('sidebar-ai');
      if (aiSidebarBtn) {
        aiSidebarBtn.addEventListener('click', () => {
          this.aiAssistant.toggle();
          aiSidebarBtn.classList.toggle('active');
        });
      }

      // Setup Party panel toggle
      const partyBtn = document.getElementById('sidebar-party');
      const partyPanel = document.getElementById('sidebar-party-panel');
      const closePartyBtn = document.getElementById('close-party');
      if (partyBtn && partyPanel) {
        partyBtn.addEventListener('click', () => {
          const isVisible = partyPanel.style.display === 'flex';

          if (isVisible) {
            // Close party panel
            partyPanel.style.display = 'none';
            partyBtn.classList.remove('active');
          } else {
            // Close other panels first
            const allPanels = document.querySelectorAll('.sidebar-panel');
            allPanels.forEach(panel => panel.style.display = 'none');

            // Open party panel
            partyPanel.style.display = 'flex';
            partyBtn.classList.add('active');
            this._populatePartyPanel();
          }
        });
      }
      if (closePartyBtn && partyPanel) {
        closePartyBtn.addEventListener('click', () => {
          partyPanel.style.display = 'none';
          partyBtn?.classList.remove('active');
        });
      }

      // Setup Combat Tracker panel toggle
      const combatBtn = document.getElementById('sidebar-combat');
      const combatPanel = document.getElementById('sidebar-combat-panel');
      const closeCombatBtn = document.getElementById('close-combat');
      if (combatBtn && combatPanel) {
        combatBtn.addEventListener('click', () => {
          const isVisible = combatPanel.style.display === 'flex';

          if (isVisible) {
            // Close combat panel
            combatPanel.style.display = 'none';
            combatBtn.classList.remove('active');
          } else {
            // Close other panels first
            const allPanels = document.querySelectorAll('.sidebar-panel');
            allPanels.forEach(panel => panel.style.display = 'none');

            // Open combat panel
            combatPanel.style.display = 'flex';
            combatBtn.classList.add('active');
            this._populateSidebarCombatTracker();
          }
        });
      }
      if (closeCombatBtn && combatPanel) {
        closeCombatBtn.addEventListener('click', () => {
          combatPanel.style.display = 'none';
          combatBtn?.classList.remove('active');
        });
      }

      // Listen for character sheet open events
      window.addEventListener('openCharacterSheet', (e) => {
        this.characterSheet.open(e.detail.character);
      });

      // Listen for spell cast events
      window.addEventListener('castSpell', (e) => {
        const { spell, damage, character } = e.detail;
        if (!this.dashboard) return;

        this.dashboard._addConsoleMessage('action', `✨ ${character || 'Character'} casts ${spell}!`);

        // Only roll if damage exists and is not "None"
        if (damage && damage !== 'None' && damage.trim() !== '') {
          this.dashboard._rollDice(damage);
        }
      });

      // Listen for Timmilander's token summoning
      window.addEventListener('summonToken', (e) => {
        const { token } = e.detail;
        console.log('🧙‍♂️ Timmilander summons token:', token);

        // Add token to game state using the proper method
        this.gameState.addToken(token);

        // Add to dashboard console
        if (this.dashboard) {
          this.dashboard._addConsoleMessage('combat', `⚔️ Timmilander summons: ${token.name} (HP: ${token.hp}, AC: ${token.ac})`);
        }

        // Render token on map if in tactical view
        const state = this.gameState.getState();
        if (state.ui.mapMode === 'tactical' && state.ui.activeLocation && this.canvasRenderer) {
          // Get all tokens at current location and refresh renderer
          const tokens = this.gameState.getTokensAt(state.ui.activeLocation.id);
          this.canvasRenderer.setTokens(tokens);
          console.log('✨ Token rendered on tactical map:', token.name);
        }

        // Broadcast to other clients via socket.io
        if (this.socket) {
          this.socket.emit('token_summoned', { token });
        }
      });

      // Listen for encounter start (for combat tracker)
      window.addEventListener('encounterStart', (e) => {
        const { encounter, enemies } = e.detail;
        console.log('⚔️ Encounter started:', encounter);

        if (this.dashboard) {
          this.dashboard._addConsoleMessage('combat', `🎲 Initiative! ${encounter.name} - ${enemies.length} enemies`);
        }

        // Broadcast encounter start via socket.io
        if (this.socket) {
          this.socket.emit('encounter_started', { encounter, enemies });
        }

        // Populate both combat trackers (floating and sidebar)
        this._populateCombatTracker(encounter, enemies);
        this._populateSidebarCombatTracker();

        // Auto-open sidebar combat tracker
        const combatPanel = document.getElementById('sidebar-combat-panel');
        const combatBtn = document.getElementById('sidebar-combat');
        if (combatPanel && combatBtn) {
          // Close other panels first
          const allPanels = document.querySelectorAll('.sidebar-panel');
          allPanels.forEach(panel => panel.style.display = 'none');

          combatPanel.style.display = 'flex';
          combatBtn.classList.add('active');
        }
      });

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
   * Uses existing #tactical-canvas-container from HTML
   * @private
   */
  _setupTacticalContainer() {
    // Get existing tactical container from HTML
    this.tacticalContainer = document.getElementById('tactical-canvas-container');

    if (!this.tacticalContainer) {
      console.error('❌ Tactical canvas container not found in HTML');
      return;
    }

    // Initialize Canvas renderer (will be shown when entering tactical view)
    this.canvasRenderer = new CanvasRenderer(this.tacticalContainer, {
      tokenSize: 50,
      showHP: true,
      enableDrag: true // DM mode always on
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
   * Create UI controls - hook up existing HTML elements
   * @private
   */
  _createControls() {
    // Get existing controls from HTML
    this.backButton = document.getElementById('return-to-map');
    const mapPrev = document.getElementById('map-prev');
    const mapNext = document.getElementById('map-next');
    const mapVariantControls = document.getElementById('map-variant-controls');

    if (this.backButton) {
      this.backButton.onclick = () => this._exitTacticalView();
    }

    if (mapPrev && mapNext) {
      mapPrev.onclick = () => this._cycleMapVariant(-1);
      mapNext.onclick = () => this._cycleMapVariant(1);
    }

    // Store map variant controls reference
    this.mapVariantControls = mapVariantControls;
  }

  /**
   * Initialize sidebar functionality
   * @private
   */
  _initSidebar() {
    const sidebarIcons = {
      map: document.getElementById('sidebar-map'),
      info: document.getElementById('sidebar-info'),
      settings: document.getElementById('sidebar-settings')
    };

    const sidebarPanels = {
      info: document.getElementById('sidebar-info-panel')
    };

    // Currently active panel
    let activePanel = null;

    // Toggle info panel
    if (sidebarIcons.info && sidebarPanels.info) {
      sidebarIcons.info.onclick = () => {
        if (activePanel === 'info') {
          // Close if already open
          sidebarPanels.info.style.display = 'none';
          activePanel = null;
        } else {
          // Close other panels
          Object.values(sidebarPanels).forEach(panel => {
            panel.style.display = 'none';
          });
          // Open this panel
          sidebarPanels.info.style.display = 'block';
          activePanel = 'info';
        }
      };
    }

    // Map icon - already functional (toggles between views)
    // Settings icon - placeholder for future
    if (sidebarIcons.settings) {
      sidebarIcons.settings.onclick = () => {
        console.log('Settings panel not yet implemented');
      };
    }
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

    // Listen for Timmilander token summoning from other clients
    this.socket.on('token_summoned_remote', (data) => {
      console.log('🧙‍♂️ Timmilander summoned token (remote):', data.token.name);

      // Add token to game state
      this.gameState.tokens.push(data.token);

      // Render on map if in tactical view
      const state = this.gameState.getState();
      if (state.ui.mapMode === 'tactical' && state.ui.activeLocation && this.canvasRenderer) {
        const tokens = this.gameState.getTokensAt(state.ui.activeLocation.id);
        this.canvasRenderer.setTokens(tokens);
      }

      // Add to console
      if (this.dashboard) {
        this.dashboard._addConsoleMessage('combat', `⚔️ ${data.token.name} appears! (Summoned remotely)`);
      }
    });

    // Listen for encounter start from other clients
    this.socket.on('encounter_started_remote', (data) => {
      console.log('⚔️ Encounter started (remote):', data.encounter.name);
      if (this.dashboard) {
        this.dashboard._addConsoleMessage('combat', `🎲 ${data.encounter.name} begins!`);
      }
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

    // Add tactical-active class (CSS handles showing tactical container & console)
    document.body.classList.add('tactical-active');

    // CRITICAL: Resize canvas now that container is visible
    // (container was display:none, so canvas was sized to 0x0)
    this.canvasRenderer._resize();

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

    // Show map variant controls if in DM mode
    if (this.mapVariantControls && this.gameState.getState().mode === 'DM') {
      this.mapVariantControls.style.display = 'flex';
    }

    // Note: Chat panel and unit panel are now always visible in Zone C
    // No need to show/hide them

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

    // Clear canvas
    this.canvasRenderer.clear();

    // Hide back button
    this.backButton.style.display = 'none';

    // Hide map variant controls
    if (this.mapVariantControls) {
      this.mapVariantControls.style.display = 'none';
    }

    // Note: Chat panel and unit panel are now always visible in Zone C
    // No need to hide them

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

    // Update canvas renderer if in tactical view
    if (this.canvasRenderer && this.canvasRenderer.backgroundReady) {
      this.canvasRenderer.setBackgroundImage(newUrl);
    }

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
   * Populate combat tracker with encounter
   * @private
   */
  _populateCombatTracker(encounter, enemies) {
    const combatTracker = document.getElementById('floating-combat-tracker');
    const initiativeList = document.getElementById('initiative-list');

    if (!combatTracker || !initiativeList) {
      console.warn('Combat tracker elements not found');
      return;
    }

    // Show combat tracker
    combatTracker.style.display = 'block';

    // Clear existing initiative
    initiativeList.innerHTML = '';

    // Roll initiative for each enemy
    const initiativeEntries = enemies.map(enemy => {
      const roll = Math.floor(Math.random() * 20) + 1;
      const bonus = 0; // Could calculate from enemy stats
      const total = roll + bonus;

      return {
        name: enemy.name,
        roll: roll,
        bonus: bonus,
        total: total,
        hp: enemy.hp,
        maxHp: enemy.hp,
        ac: enemy.ac,
        type: 'enemy'
      };
    });

    // Sort by initiative (highest first)
    initiativeEntries.sort((a, b) => b.total - a.total);

    // Render initiative list
    initiativeEntries.forEach((entry, index) => {
      const entryDiv = document.createElement('div');
      entryDiv.className = 'initiative-entry';
      entryDiv.innerHTML = `
        <div class="initiative-number">${index + 1}</div>
        <div class="initiative-details">
          <div class="initiative-name">${entry.name} ${entry.type === 'enemy' ? '🪖' : ''}</div>
          <div class="initiative-stats">
            Initiative: ${entry.total} (${entry.roll}${entry.bonus > 0 ? '+' + entry.bonus : ''}) |
            HP: ${entry.hp}/${entry.maxHp} |
            AC: ${entry.ac}
          </div>
        </div>
      `;
      initiativeList.appendChild(entryDiv);
    });

    // Log to console
    console.log('⚔️ Combat Tracker populated:', initiativeEntries);
  }

  /**
   * Populate sidebar combat tracker (alternative to floating tracker)
   * @private
   */
  _populateSidebarCombatTracker() {
    const sidebarInitiativeList = document.getElementById('sidebar-initiative-list');
    const combatPanel = document.getElementById('sidebar-combat-panel');

    if (!sidebarInitiativeList || !combatPanel) {
      console.warn('Sidebar combat tracker elements not found');
      return;
    }

    // Get current combat state from game state
    const state = this.gameState.getState();
    const currentLocation = state.ui.activeLocation?.id || state.ui.currentLocation;
    const tokens = this.gameState.getTokensAt(currentLocation);

    if (!tokens || tokens.length === 0) {
      sidebarInitiativeList.innerHTML = '<div style="padding: 20px; text-align: center; color: #8b7355;">No active combat encounter</div>';
      return;
    }

    // Clear existing list
    sidebarInitiativeList.innerHTML = '';

    // Create initiative entries from tokens
    const initiativeEntries = tokens.map(token => {
      // Roll initiative if not set
      if (token.initiative === null || token.initiative === undefined) {
        const roll = Math.floor(Math.random() * 20) + 1;
        token.initiative = roll;
      }

      return {
        name: token.name,
        initiative: token.initiative,
        hp: token.hp || token.stats?.hp || 0,
        maxHp: token.maxHp || token.stats?.hp || 0,
        ac: token.ac || token.stats?.ac || 10,
        type: token.type || 'unknown',
        icon: token.icon || '🎭'
      };
    });

    // Sort by initiative (highest first)
    initiativeEntries.sort((a, b) => b.initiative - a.initiative);

    // Render initiative list
    initiativeEntries.forEach((entry, index) => {
      const entryDiv = document.createElement('div');
      entryDiv.className = 'initiative-entry';
      entryDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        margin-bottom: 8px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(197, 169, 89, 0.3);
        border-left: 3px solid ${entry.type === 'enemy' ? '#c5393b' : '#4a7c59'};
        border-radius: 4px;
      `;

      entryDiv.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #8b4513 0%, #654321 100%);
          color: #f4e8d0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">${index + 1}</div>
        <div style="flex: 1;">
          <div style="color: #f4e8d0; font-weight: bold; margin-bottom: 4px;">
            ${entry.icon} ${entry.name}
          </div>
          <div style="color: #c5a959; font-size: 11px;">
            Initiative: ${entry.initiative} |
            HP: ${entry.hp}/${entry.maxHp} |
            AC: ${entry.ac}
          </div>
        </div>
      `;
      sidebarInitiativeList.appendChild(entryDiv);
    });

    console.log('⚔️ Sidebar Combat Tracker populated:', initiativeEntries);
  }

  /**
   * Populate party panel with current party members
   * @private
   */
  _populatePartyPanel() {
    const partyMemberList = document.getElementById('party-member-list');
    const partyPanel = document.getElementById('sidebar-party-panel');

    if (!partyMemberList || !partyPanel) {
      console.warn('Party panel elements not found');
      return;
    }

    // Get all player tokens from game state
    const allTokens = this.gameState.tokens || [];
    const partyMembers = allTokens.filter(token => token.type === 'player' || token.type === 'pc');

    // Clear existing list
    partyMemberList.innerHTML = '';

    if (partyMembers.length === 0) {
      partyMemberList.innerHTML = '<div style="padding: 20px; text-align: center; color: #8b7355;">No party members found</div>';
      return;
    }

    // Render party members
    partyMembers.forEach((member, index) => {
      const memberDiv = document.createElement('div');
      memberDiv.className = 'party-member-entry';
      memberDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        margin-bottom: 8px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(197, 169, 89, 0.3);
        border-left: 3px solid #4a7c59;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s;
      `;

      memberDiv.addEventListener('mouseenter', () => {
        memberDiv.style.background = 'rgba(74, 124, 89, 0.2)';
      });
      memberDiv.addEventListener('mouseleave', () => {
        memberDiv.style.background = 'rgba(0, 0, 0, 0.3)';
      });

      // Click to open character sheet
      memberDiv.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('openCharacterSheet', {
          detail: { character: member.name }
        }));
      });

      const icon = member.icon || member.portraitUrl || '🎭';
      const hp = member.hp ?? member.stats?.hp ?? 0;
      const maxHp = member.maxHp ?? member.stats?.hp ?? 0;
      const ac = member.ac ?? member.stats?.ac ?? 10;
      const location = member.location || 'Unknown';

      memberDiv.innerHTML = `
        <div style="font-size: 32px;">${icon}</div>
        <div style="flex: 1;">
          <div style="color: #f4e8d0; font-weight: bold; margin-bottom: 4px;">
            ${member.name}
          </div>
          <div style="color: #c5a959; font-size: 11px; margin-bottom: 4px;">
            HP: ${hp}/${maxHp} | AC: ${ac}
          </div>
          <div style="color: #8b7355; font-size: 10px;">
            📍 ${location}
          </div>
        </div>
      `;
      partyMemberList.appendChild(memberDiv);
    });

    console.log('👥 Party panel populated with', partyMembers.length, 'members');
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
