import grokClient from './grokClient.js';
import geminiClient from './geminiClient.js';
import promptTemplates from './promptTemplates.js';

/**
 * AI Manager - Central coordinator for AI services
 * Routes requests to appropriate AI provider (Grok or Gemini)
 * Manages context, error handling, and response formatting
 */
class AIManager {
  constructor() {
    this.grok = grokClient;
    this.gemini = geminiClient;
    this.templates = promptTemplates;
  }

  /**
   * DM Assistant Chat
   * @param {string} message - User message
   * @param {Object} gameContext - Current game state context
   * @returns {Promise<Object>}
   */
  async chat(message, gameContext = {}) {
    try {
      const systemPrompt = this.templates.system.dmAssistant;
      const context = this.templates.context.buildGameContext(gameContext);

      const result = await this.grok.chat(message, gameContext, systemPrompt);

      return {
        success: true,
        response: result.response,
        tokens: result.tokens,
        provider: 'grok',
        model: result.model
      };
    } catch (error) {
      console.error('[AIManager] Chat error:', error.message);

      // Fallback to Gemini if Grok fails
      try {
        console.log('[AIManager] Falling back to Gemini for chat');
        const fallbackResult = await this.gemini.generateText(message);
        return {
          success: true,
          response: fallbackResult.response,
          provider: 'gemini',
          model: fallbackResult.model,
          fallback: true
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: 'AI services temporarily unavailable. Please try again.',
          details: error.message
        };
      }
    }
  }

  /**
   * Generate D&D 5e Encounter
   * @param {Object} params - Encounter parameters
   * @param {Object} gameContext - Game state context
   * @returns {Promise<Object>}
   */
  async generateEncounter(params, gameContext = {}) {
    try {
      // Enhance params with context
      const enhancedContext = {
        ...gameContext,
        locationName: params.locationName || gameContext.location?.name,
        partyLevel: params.partyLevel || this._calculateAverageLevel(gameContext.characters),
        partySize: gameContext.characters?.length || 4
      };

      const result = await this.grok.generateEncounter(params, enhancedContext);

      // Validate encounter structure
      if (!this._validateEncounter(result.encounter)) {
        throw new Error('Generated encounter failed validation');
      }

      return {
        success: true,
        encounter: result.encounter,
        rawResponse: result.rawResponse,
        tokens: result.tokens,
        provider: 'grok'
      };
    } catch (error) {
      console.error('[AIManager] Encounter generation error:', error.message);
      return {
        success: false,
        error: 'Failed to generate encounter. Please try again or create manually.',
        details: error.message
      };
    }
  }

  /**
   * Generate NPC Dialogue
   * @param {Object} params - NPC parameters (name, context, mood)
   * @param {Object} gameContext - Game state context
   * @returns {Promise<Object>}
   */
  async generateNPCDialogue(params, gameContext = {}) {
    try {
      const result = await this.grok.generateNPCDialogue(params, gameContext);

      // Clean up dialogue (remove quotes if AI added them)
      let dialogue = result.response.trim();
      if (dialogue.startsWith('"') && dialogue.endsWith('"')) {
        dialogue = dialogue.slice(1, -1);
      }

      return {
        success: true,
        dialogue,
        npcName: params.npcName,
        mood: params.mood,
        tokens: result.tokens,
        provider: 'grok'
      };
    } catch (error) {
      console.error('[AIManager] NPC dialogue error:', error.message);
      return {
        success: false,
        error: 'Failed to generate NPC dialogue. Please try again.',
        details: error.message
      };
    }
  }

  /**
   * Rules Lookup
   * @param {string} query - Rules question
   * @returns {Promise<Object>}
   */
  async rulesLookup(query) {
    try {
      const result = await this.grok.rulesLookup(query);

      return {
        success: true,
        response: result.response,
        tokens: result.tokens,
        provider: 'grok'
      };
    } catch (error) {
      console.error('[AIManager] Rules lookup error:', error.message);
      return {
        success: false,
        error: 'Failed to look up rules. Please consult the rulebooks directly.',
        details: error.message
      };
    }
  }

  /**
   * Generate Image (Character Portrait, Battle Map, Scene)
   * @param {string} prompt - Image description
   * @param {Object} options - { style, aspectRatio, characterData }
   * @returns {Promise<Object>}
   */
  async generateImage(prompt, options = {}) {
    try {
      const { style = 'scene', characterData = null } = options;

      let result;

      // Use specialized methods for specific styles
      if (style === 'portrait' && characterData) {
        result = await this.gemini.generateCharacterPortrait(characterData, options);
      } else if (style === 'map') {
        result = await this.gemini.generateBattleMap(prompt, options);
      } else {
        result = await this.gemini.generateImage(prompt, options);
      }

      return {
        success: true,
        imageData: result.imageData,
        mimeType: result.mimeType,
        prompt: result.prompt,
        originalPrompt: result.originalPrompt,
        provider: 'gemini',
        model: result.model,
        style
      };
    } catch (error) {
      console.error('[AIManager] Image generation error:', error.message);
      return {
        success: false,
        error: 'Failed to generate image. Please try again or adjust your prompt.',
        details: error.message
      };
    }
  }

  /**
   * Analyze Image (Vision)
   * @param {Buffer|string} imageData - Image buffer or base64
   * @param {string} prompt - Analysis prompt (optional)
   * @param {string} mimeType - Image MIME type
   * @returns {Promise<Object>}
   */
  async analyzeImage(imageData, prompt = null, mimeType = 'image/png') {
    try {
      const result = await this.gemini.analyzeImage(imageData, prompt, mimeType);

      // Extract tactical info if this looks like a battle map
      const tacticalInfo = this._extractTacticalInfo(result.analysis);

      return {
        success: true,
        analysis: result.analysis,
        tacticalInfo,
        provider: 'gemini',
        model: result.model
      };
    } catch (error) {
      console.error('[AIManager] Image analysis error:', error.message);
      return {
        success: false,
        error: 'Failed to analyze image. Please try again.',
        details: error.message
      };
    }
  }

  /**
   * Generate Plot Hook
   * @param {Object} gameContext - Game state context
   * @param {string} theme - Optional theme/focus
   * @returns {Promise<Object>}
   */
  async generatePlotHook(gameContext = {}, theme = '') {
    try {
      const systemPrompt = this.templates.system.plotHook;
      const context = this.templates.context.buildGameContext(gameContext);

      const message = theme
        ? `Generate a plot hook with the following theme: ${theme}`
        : 'Generate an engaging plot hook for the current situation';

      const result = await this.grok.chat(message, gameContext, systemPrompt);

      return {
        success: true,
        plotHook: result.response,
        tokens: result.tokens,
        provider: 'grok'
      };
    } catch (error) {
      console.error('[AIManager] Plot hook generation error:', error.message);
      return {
        success: false,
        error: 'Failed to generate plot hook. Please try again.',
        details: error.message
      };
    }
  }

  /**
   * Validate encounter structure
   * @private
   */
  _validateEncounter(encounter) {
    if (!encounter || typeof encounter !== 'object') return false;
    if (!encounter.name || !encounter.description) return false;
    if (!Array.isArray(encounter.enemies) || encounter.enemies.length === 0) return false;

    // Validate each enemy
    for (const enemy of encounter.enemies) {
      if (!enemy.name || !enemy.type) return false;
      if (typeof enemy.hp !== 'number' || typeof enemy.ac !== 'number') return false;
    }

    return true;
  }

  /**
   * Calculate average party level
   * @private
   */
  _calculateAverageLevel(characters) {
    if (!characters || characters.length === 0) return 5; // Default

    const totalLevel = characters.reduce((sum, char) => sum + (char.level || 1), 0);
    return Math.round(totalLevel / characters.length);
  }

  /**
   * Extract tactical information from analysis
   * @private
   */
  _extractTacticalInfo(analysisText) {
    const info = {
      terrain: null,
      cover: [],
      chokePoints: [],
      hazards: [],
      objectives: []
    };

    if (!analysisText) return info;

    const lowerText = analysisText.toLowerCase();

    // Simple keyword extraction - can be enhanced
    if (lowerText.includes('cover') || lowerText.includes('concealment')) {
      info.cover.push('Cover positions detected in analysis');
    }
    if (lowerText.includes('choke') || lowerText.includes('narrow') || lowerText.includes('bottleneck')) {
      info.chokePoints.push('Choke points identified');
    }
    if (lowerText.includes('hazard') || lowerText.includes('danger') || lowerText.includes('trap')) {
      info.hazards.push('Potential hazards detected');
    }
    if (lowerText.includes('terrain') || lowerText.includes('ground') || lowerText.includes('surface')) {
      info.terrain = 'Terrain features identified in image';
    }

    return info;
  }

  /**
   * Get service status
   * @returns {Object}
   */
  getStatus() {
    return {
      grok: {
        available: !!process.env.XAI_API_KEY,
        model: process.env.XAI_MODEL || 'grok-4-1-fast-reasoning'
      },
      gemini: {
        available: !!process.env.GEMINI_API_KEY,
        textModel: process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash',
        imageModel: process.env.GEMINI_IMAGE_MODEL || 'imagen-4.0-generate-preview-06-06'
      }
    };
  }
}

const aiManager = new AIManager();
export default aiManager;
