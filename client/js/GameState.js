/**
 * Game State Manager
 * Centralized state management for the VTT
 * Single source of truth for all game data
 *
 * @typedef {Object} GameStateData
 * @property {string} mode - 'PLAYER' | 'DM'
 * @property {Array} tokens - All tokens
 * @property {Array} locations - All locations
 * @property {Array} characters - All characters
 * @property {Object} campaign - Campaign metadata
 * @property {Object} encounter - Active encounter (if any)
 * @property {Object} party - Party state
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

      // Campaign
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
        mapMode: 'world' // 'world' or 'tactical'
      }
    };

    // Event listeners
    this.listeners = new Map();
  }

  /**
   * Get full state
   * @returns {GameStateData}
   */
  getState() {
    return this.state;
  }

  /**
   * Get tokens for specific location
   * @param {string} locationId
   * @returns {Array}
   */
  getTokensAt(locationId) {
    return this.state.tokens.filter(t => t.locationId === locationId);
  }

  /**
   * Get tokens by side
   * @param {string} side - 'Continental' | 'Hessian'
   * @returns {Array}
   */
  getTokensBySide(side) {
    return this.state.tokens.filter(t => t.side === side);
  }

  /**
   * Get location by ID
   * @param {string} id
   * @returns {Object|null}
   */
  getLocation(id) {
    return this.state.locations.find(l => l.id === id) || null;
  }

  /**
   * Get token by ID
   * @param {string} tokenId
   * @returns {Object|null}
   */
  getToken(tokenId) {
    return this.state.tokens.find(t => t.tokenId === tokenId) || null;
  }

  /**
   * Update token
   * @param {string} tokenId
   * @param {Object} updates
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
   * @param {string} tokenId
   * @param {Object} gps - {lat, lng}
   * @param {Object} grid - {posX, posY}
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
   * Set tokens (from API)
   * @param {Array} tokens
   */
  setTokens(tokens) {
    this.state.tokens = tokens;
    this._notify('tokensLoaded', tokens);
  }

  /**
   * Set locations (from API)
   * @param {Array} locations
   */
  setLocations(locations) {
    this.state.locations = locations;
    this._notify('locationsLoaded', locations);
  }

  /**
   * Set characters (from API)
   * @param {Array} characters
   */
  setCharacters(characters) {
    this.state.characters = characters;
    this._notify('charactersLoaded', characters);
  }

  /**
   * Update campaign state
   * @param {Object} updates
   */
  updateCampaign(updates) {
    Object.assign(this.state.campaign, updates);
    this._notify('campaignUpdate', updates);
  }

  /**
   * Discover location
   * @param {string} locationId
   */
  discoverLocation(locationId) {
    if (!this.state.party.discoveredLocations.includes(locationId)) {
      this.state.party.discoveredLocations.push(locationId);
      this._notify('locationDiscovered', locationId);
    }
  }

  /**
   * Check if location is discovered
   * @param {string} locationId
   * @returns {boolean}
   */
  isLocationDiscovered(locationId) {
    return this.state.party.discoveredLocations.includes(locationId);
  }

  /**
   * Start encounter
   * @param {Object} encounter
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
   * @param {string} tokenId
   * @param {string} name
   * @param {number} roll
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
   * @param {string} mode - 'PLAYER' | 'DM'
   */
  setMode(mode) {
    this.state.mode = mode;
    this._notify('modeChange', mode);
  }

  /**
   * Select token
   * @param {Object|null} token
   */
  selectToken(token) {
    this.state.ui.selectedToken = token;
    this._notify('tokenSelect', token);
  }

  /**
   * Set active location (for tactical view)
   * @param {Object|null} location
   */
  setActiveLocation(location) {
    this.state.ui.activeLocation = location;
    this.state.ui.mapMode = location ? 'tactical' : 'world';
    this._notify('locationChange', location);
  }

  /**
   * Subscribe to state changes
   * @param {string} event - Event name
   * @param {Function} callback
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Unsubscribe from state changes
   * @param {string} event
   * @param {Function} callback
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
   * @param {string} event
   * @param {*} data
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

    // Also trigger 'change' event for any state change
    if (event !== 'change') {
      this._notify('change', { event, data });
    }
  }

  /**
   * Load state from API
   * @param {string} apiUrl
   */
  async loadFromAPI(apiUrl = '/api/campaign') {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      // Set data
      if (data.tokens) this.setTokens(data.tokens);
      if (data.locations) this.setLocations(data.locations);
      if (data.characters) this.setCharacters(data.characters);

      // Update campaign config
      if (data.config) {
        this.updateCampaign({
          date: data.config.date || this.state.campaign.date,
          time: data.config.time || this.state.campaign.time,
          weather: data.config.weather || this.state.campaign.weather
        });
      }

      console.log('✅ Game state loaded from API');
      this._notify('stateLoaded', data);

      return data;
    } catch (error) {
      console.error('Failed to load game state:', error);
      throw error;
    }
  }

  /**
   * Serialize state to JSON
   * @returns {string}
   */
  serialize() {
    return JSON.stringify(this.state, null, 2);
  }

  /**
   * Load state from JSON
   * @param {string} json
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
