/**
 * Game State Manager
 * Centralized state management for the VTT
 * JSON-PRIMARY: Loads directly from /data/*.json files
 */

export class GameState {
  constructor() {
    this.state = {
      // Mode
      mode: 'PLAYER', // 'PLAYER' or 'DM'

      // Data
      tokens: [],
      locations: [],
      characters: [],

      // Campaign (will be loaded from .env via API)
      campaign: {
        date: 'December 23, 1776',
        time: '23:45',
        weather: 'Violent Sleet & Snow',
        morale: 30,
        rations: 3
      },

      // Party
      party: {
        position: { lat: 40.2985, lng: -74.8718 }, // McConkey's Ferry
        discoveredLocations: ['frozen_vigil'],
        isTraveling: false
      },

      // Encounter
      encounter: {
        active: false,
        id: null,
        round: 0,
        initiative: []
      },

      // UI state
      ui: {
        selectedToken: null,
        activeLocation: null,
        mapMode: 'world', // 'world' or 'tactical'
        sidebarCollapsed: false
      }
    };

    // Event listeners
    this.listeners = new Map();
  }

  /**
   * Get full state
   */
  getState() {
    return this.state;
  }

  /**
   * Get tokens for specific location
   */
  getTokensAt(locationId) {
    return this.state.tokens.filter(t => t.locationId === locationId);
  }

  /**
   * Get tokens by side
   */
  getTokensBySide(side) {
    return this.state.tokens.filter(t => t.side === side);
  }

  /**
   * Get location by ID
   */
  getLocation(id) {
    return this.state.locations.find(l => l.id === id) || null;
  }

  /**
   * Get token by ID
   */
  getToken(tokenId) {
    return this.state.tokens.find(t => t.tokenId === tokenId) || null;
  }

  /**
   * Update token
   */
  updateToken(tokenId, updates) {
    const token = this.getToken(tokenId);
    if (token) {
      Object.assign(token, updates);
      this._notify('tokenUpdate', { tokenId, updates });
    }
  }

  /**
   * Update token position
   */
  updateTokenPosition(tokenId, gps, grid) {
    const token = this.getToken(tokenId);
    if (token) {
      if (gps) token.gps = { ...token.gps, ...gps };
      if (grid) token.grid = { ...token.grid, ...grid };
      this._notify('tokenMove', { tokenId, gps, grid });
    }
  }

  /**
   * Set tokens
   */
  setTokens(tokens) {
    this.state.tokens = tokens;
    this._notify('tokensLoaded', tokens);
  }

  /**
   * Set locations
   */
  setLocations(locations) {
    this.state.locations = locations;
    this._notify('locationsLoaded', locations);
  }

  /**
   * Set characters
   */
  setCharacters(characters) {
    this.state.characters = characters;
    this._notify('charactersLoaded', characters);
  }

  /**
   * Update campaign state
   */
  updateCampaign(updates) {
    Object.assign(this.state.campaign, updates);
    this._notify('campaignUpdate', updates);
  }

  /**
   * Discover location
   */
  discoverLocation(locationId) {
    if (!this.state.party.discoveredLocations.includes(locationId)) {
      this.state.party.discoveredLocations.push(locationId);
      this._notify('locationDiscovered', locationId);
    }
  }

  /**
   * Check if location is discovered
   */
  isLocationDiscovered(locationId) {
    return this.state.party.discoveredLocations.includes(locationId);
  }

  /**
   * Start encounter
   */
  startEncounter(encounter) {
    this.state.encounter = {
      active: true,
      id: encounter.id || encounter.encounterId,
      round: 1,
      initiative: encounter.initiative || [],
      ...encounter
    };
    this._notify('encounterStart', encounter);
  }

  /**
   * End encounter
   */
  endEncounter() {
    this.state.encounter = {
      active: false,
      id: null,
      round: 0,
      initiative: []
    };
    this._notify('encounterEnd');
  }

  /**
   * Next round
   */
  nextRound() {
    if (this.state.encounter.active) {
      this.state.encounter.round++;
      this._notify('roundAdvance', this.state.encounter.round);
    }
  }

  /**
   * Add to initiative
   */
  addToInitiative(tokenId, name, roll) {
    this.state.encounter.initiative.push({ tokenId, name, roll, hasActed: false });
    this.state.encounter.initiative.sort((a, b) => b.roll - a.roll);
    this._notify('initiativeUpdate', this.state.encounter.initiative);
  }

  /**
   * Toggle mode (PLAYER <-> DM)
   */
  toggleMode() {
    this.state.mode = this.state.mode === 'DM' ? 'PLAYER' : 'DM';
    this._notify('modeChange', this.state.mode);
  }

  /**
   * Set mode
   */
  setMode(mode) {
    this.state.mode = mode;
    this._notify('modeChange', mode);
  }

  /**
   * Select token
   */
  selectToken(token) {
    this.state.ui.selectedToken = token;
    this._notify('tokenSelect', token);
  }

  /**
   * Set active location
   */
  setActiveLocation(location) {
    this.state.ui.activeLocation = location;
    this.state.ui.mapMode = location ? 'tactical' : 'world';
    this._notify('locationChange', location);
  }

  /**
   * Toggle sidebar
   */
  toggleSidebar() {
    this.state.ui.sidebarCollapsed = !this.state.ui.sidebarCollapsed;
    this._notify('sidebarToggle', this.state.ui.sidebarCollapsed);
  }

  /**
   * Subscribe to state changes
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Unsubscribe
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Notify listeners
   * @private
   */
  _notify(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data, this.state);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }

    // Also trigger 'change' event
    if (event !== 'change') {
      this._notify('change', { event, data });
    }
  }

  /**
   * Load state from JSON files directly (JSON-PRIMARY strategy)
   */
  async loadFromJSON() {
    try {
      console.log('📦 Loading game data from JSON files...');

      // Load in parallel
      const [tokensRes, locationsRes, charactersRes, configRes] = await Promise.all([
        fetch('/data/tokens.json'),
        fetch('/data/locations.json'),
        fetch('/data/characters.json'),
        fetch('/api/campaign').catch(() => null) // Optional: get env config
      ]);

      // Parse responses
      const tokens = await tokensRes.json();
      const locations = await locationsRes.json();
      const characters = await charactersRes.json();

      // Set data
      this.setTokens(tokens);
      this.setLocations(locations);
      this.setCharacters(characters);

      // Update campaign config if available
      if (configRes && configRes.ok) {
        const config = await configRes.json();
        if (config.config) {
          this.updateCampaign({
            date: config.config.date || this.state.campaign.date,
            time: config.config.time || this.state.campaign.time,
            weather: config.config.weather || this.state.campaign.weather
          });
        }
      }

      console.log('✅ Game data loaded from JSON');
      console.log(`  - ${tokens.length} tokens`);
      console.log(`  - ${locations.length} locations`);
      console.log(`  - ${characters.length} characters`);

      this._notify('stateLoaded', { tokens, locations, characters });

      return { tokens, locations, characters };
    } catch (error) {
      console.error('❌ Failed to load game data:', error);
      throw error;
    }
  }

  /**
   * Serialize state
   */
  serialize() {
    return JSON.stringify(this.state, null, 2);
  }

  /**
   * Deserialize state
   */
  deserialize(json) {
    try {
      const data = JSON.parse(json);
      this.state = { ...this.state, ...data };
      this._notify('stateLoaded', data);
    } catch (error) {
      console.error('Failed to deserialize state:', error);
    }
  }
}

// Export singleton instance
export const gameState = new GameState();
