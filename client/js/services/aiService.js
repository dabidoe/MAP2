/**
 * AI Service - Client-side API wrapper for AI endpoints
 * Handles communication with War Room 1776 AI backend (Grok & Gemini)
 */

class AIService {
  constructor() {
    this.baseUrl = '/api/ai';
    this.requestInProgress = false;
  }

  /**
   * Send chat message to DM Assistant
   * @param {string} message - User message
   * @param {Object} context - Game context (location, characters, etc.)
   * @returns {Promise<Object>}
   */
  async sendChatMessage(message, context = {}) {
    try {
      this.requestInProgress = true;

      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, context })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send chat message');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[AIService] Chat error:', error);
      throw error;
    } finally {
      this.requestInProgress = false;
    }
  }

  /**
   * Generate a D&D 5e encounter
   * @param {Object} params - { locationId, difficulty, description, partyLevel }
   * @param {Object} context - Game context
   * @returns {Promise<Object>}
   */
  async generateEncounter(params, context = {}) {
    try {
      this.requestInProgress = true;

      const response = await fetch(`${this.baseUrl}/encounter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...params, context })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate encounter');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[AIService] Encounter generation error:', error);
      throw error;
    } finally {
      this.requestInProgress = false;
    }
  }

  /**
   * Generate NPC dialogue
   * @param {Object} params - { npcName, context, mood, recentDialogue }
   * @param {Object} gameContext - Game context
   * @returns {Promise<Object>}
   */
  async generateNPCDialogue(params, gameContext = {}) {
    try {
      this.requestInProgress = true;

      const response = await fetch(`${this.baseUrl}/npc-dialogue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...params, gameContext })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate NPC dialogue');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[AIService] NPC dialogue error:', error);
      throw error;
    } finally {
      this.requestInProgress = false;
    }
  }

  /**
   * Look up D&D 5e rules
   * @param {string} query - Rules question
   * @returns {Promise<Object>}
   */
  async rulesLookup(query) {
    try {
      this.requestInProgress = true;

      const response = await fetch(`${this.baseUrl}/rules-lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to lookup rules');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[AIService] Rules lookup error:', error);
      throw error;
    } finally {
      this.requestInProgress = false;
    }
  }

  /**
   * Generate a plot hook
   * @param {Object} context - Game context
   * @param {string} theme - Optional theme/focus
   * @returns {Promise<Object>}
   */
  async generatePlotHook(context = {}, theme = '') {
    try {
      this.requestInProgress = true;

      const response = await fetch(`${this.baseUrl}/plot-hook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ context, theme })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate plot hook');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[AIService] Plot hook error:', error);
      throw error;
    } finally {
      this.requestInProgress = false;
    }
  }

  /**
   * Generate an image
   * @param {string} prompt - Image description
   * @param {Object} options - { style: 'portrait'|'map'|'scene'|'item', characterData, aspectRatio }
   * @returns {Promise<Object>}
   */
  async generateImage(prompt, options = {}) {
    try {
      this.requestInProgress = true;

      const response = await fetch(`${this.baseUrl}/image/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, ...options })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate image');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[AIService] Image generation error:', error);
      throw error;
    } finally {
      this.requestInProgress = false;
    }
  }

  /**
   * Analyze an image
   * @param {string} imageData - Base64 image data or data URI
   * @param {string} prompt - Optional analysis prompt
   * @param {string} mimeType - Image MIME type
   * @returns {Promise<Object>}
   */
  async analyzeImage(imageData, prompt = null, mimeType = 'image/png') {
    try {
      this.requestInProgress = true;

      const response = await fetch(`${this.baseUrl}/image/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageData, prompt, mimeType })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze image');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[AIService] Image analysis error:', error);
      throw error;
    } finally {
      this.requestInProgress = false;
    }
  }

  /**
   * Get AI service status
   * @returns {Promise<Object>}
   */
  async getStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/status`);

      if (!response.ok) {
        throw new Error('Failed to get AI status');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[AIService] Status check error:', error);
      throw error;
    }
  }

  /**
   * Check if a request is in progress
   * @returns {boolean}
   */
  isRequestInProgress() {
    return this.requestInProgress;
  }

  /**
   * Build game context from current game state
   * @param {Object} gameState - Current game state
   * @returns {Object}
   */
  buildContext(gameState) {
    const context = {};

    if (gameState.campaign) {
      context.campaignDate = gameState.campaign.date;
      context.weather = gameState.campaign.weather;
      context.timeOfDay = gameState.campaign.timeOfDay;
    }

    if (gameState.currentLocation) {
      context.locationName = gameState.currentLocation.name;
      context.locationDescription = gameState.currentLocation.description;
    }

    if (gameState.activeCharacters && gameState.activeCharacters.length > 0) {
      context.characters = gameState.activeCharacters.map(char => ({
        name: char.name,
        class: char.class,
        level: char.level,
        race: char.race,
        hp: char.hp,
        maxHp: char.maxHp
      }));
    }

    if (gameState.recentEvents) {
      context.recentEvents = gameState.recentEvents.slice(-5); // Last 5 events
    }

    return context;
  }
}

// Create singleton instance
const aiService = new AIService();

// Export for ES6 modules
export default aiService;

// Also attach to window for legacy compatibility
if (typeof window !== 'undefined') {
  window.aiService = aiService;
}
