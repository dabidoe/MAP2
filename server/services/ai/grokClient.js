import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Grok API Client for War Room 1776
 * Handles text generation for DM assistance, encounters, and NPC dialogue
 */
class GrokClient {
  constructor() {
    this.apiKey = process.env.XAI_API_KEY;
    this.model = process.env.XAI_MODEL || 'grok-4-1-fast-reasoning';
    this.endpoint = 'https://api.x.ai/v1/chat/completions';

    if (!this.apiKey) {
      console.warn('[GrokClient] Warning: XAI_API_KEY not found in environment');
    }
  }

  /**
   * Generic chat completion method
   * @param {Array} messages - Array of {role, content} message objects
   * @param {Object} options - Additional options (temperature, max_tokens, etc.)
   * @returns {Promise<Object>} - { response: string, tokens: number }
   */
  async complete(messages, options = {}) {
    try {
      const response = await axios.post(
        this.endpoint,
        {
          model: this.model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1500,
          stream: options.stream || false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      const result = response.data.choices[0].message.content;
      const tokensUsed = response.data.usage?.total_tokens || 0;

      return {
        response: result,
        tokens: tokensUsed,
        model: this.model
      };
    } catch (error) {
      console.error('[GrokClient] Error:', error.response?.data || error.message);
      throw new Error(`Grok API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * DM Assistant Chat
   * @param {string} userMessage - User's question/request
   * @param {Object} context - Game context (location, characters, etc.)
   * @param {string} systemPrompt - Optional custom system prompt
   * @returns {Promise<Object>}
   */
  async chat(userMessage, context = {}, systemPrompt = null) {
    const contextString = this._buildContextString(context);

    const messages = [
      {
        role: 'system',
        content: systemPrompt || this._getDefaultSystemPrompt()
      },
      {
        role: 'user',
        content: `${contextString}\n\nUser: ${userMessage}`
      }
    ];

    return this.complete(messages, { temperature: 0.8 });
  }

  /**
   * Generate a D&D 5e encounter
   * @param {Object} params - { locationId, difficulty, description, partyLevel }
   * @param {Object} context - Game context
   * @returns {Promise<Object>} - { encounter: Object, rawResponse: string }
   */
  async generateEncounter(params, context = {}) {
    const { locationId, difficulty = 'medium', description, partyLevel = 5 } = params;
    const contextString = this._buildContextString(context);

    const prompt = `Generate a D&D 5e combat encounter for War Room 1776 with the following requirements:

Location: ${context.locationName || locationId}
Difficulty: ${difficulty}
Party Level: ${partyLevel}
Description: ${description || 'A surprise encounter'}

${contextString}

Return ONLY a valid JSON object with this structure:
{
  "name": "Encounter name",
  "description": "Brief narrative description",
  "enemies": [
    {
      "name": "Enemy name",
      "type": "Creature type",
      "cr": "Challenge Rating (number)",
      "hp": "Hit points (number)",
      "ac": "Armor Class (number)",
      "tactics": "Combat tactics",
      "position": { "x": 0, "y": 0 }
    }
  ],
  "terrain": "Terrain description",
  "objectives": ["Primary objective", "Secondary objective"],
  "tactics": "Overall enemy strategy"
}

Ensure the encounter is thematically appropriate for the American Revolution (1776) and balanced for the party level.`;

    const messages = [
      {
        role: 'system',
        content: 'You are an expert D&D 5e encounter designer for War Room 1776. Generate balanced, historically themed encounters. Always respond with valid JSON only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const result = await this.complete(messages, { temperature: 0.6, max_tokens: 2000 });

    // Parse JSON from response
    try {
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const encounter = JSON.parse(jsonMatch[0]);

      return {
        encounter,
        rawResponse: result.response,
        tokens: result.tokens
      };
    } catch (parseError) {
      console.error('[GrokClient] Failed to parse encounter JSON:', parseError);
      throw new Error('Failed to generate valid encounter JSON');
    }
  }

  /**
   * Generate NPC dialogue
   * @param {Object} params - { npcName, context, mood, recentDialogue }
   * @param {Object} gameContext - Game context
   * @returns {Promise<Object>}
   */
  async generateNPCDialogue(params, gameContext = {}) {
    const { npcName, context, mood = 'neutral', recentDialogue = [] } = params;
    const contextString = this._buildContextString(gameContext);

    let prompt = `Generate dialogue for NPC: ${npcName}

Mood: ${mood}
Context: ${context}
${contextString}

${recentDialogue.length > 0 ? `Recent conversation:\n${recentDialogue.join('\n')}\n` : ''}

Generate a single line of period-appropriate dialogue (1776, American Revolution era) that ${npcName} would say in this situation. Keep it concise (1-3 sentences) and in-character. Use historically accurate language and tone.`;

    const messages = [
      {
        role: 'system',
        content: 'You are a historical dialogue writer for War Room 1776. Generate authentic 1776-era dialogue for NPCs during the American Revolution. Keep responses concise and period-appropriate.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    return this.complete(messages, { temperature: 0.9, max_tokens: 300 });
  }

  /**
   * Rules lookup helper
   * @param {string} query - Rules question
   * @returns {Promise<Object>}
   */
  async rulesLookup(query) {
    const messages = [
      {
        role: 'system',
        content: 'You are a D&D 5e rules expert assistant for War Room 1776. Provide accurate, concise rules clarifications with citations when possible. If unsure, recommend checking the Player\'s Handbook or Dungeon Master\'s Guide.'
      },
      {
        role: 'user',
        content: query
      }
    ];

    return this.complete(messages, { temperature: 0.3, max_tokens: 800 });
  }

  /**
   * Build context string from game state
   * @private
   */
  _buildContextString(context) {
    const parts = [];

    if (context.campaignDate) {
      parts.push(`Campaign Date: ${context.campaignDate}`);
    }
    if (context.locationName) {
      parts.push(`Location: ${context.locationName}`);
    }
    if (context.locationDescription) {
      parts.push(`Location Description: ${context.locationDescription}`);
    }
    if (context.characters && context.characters.length > 0) {
      parts.push(`Characters Present: ${context.characters.map(c => `${c.name} (${c.class} ${c.level})`).join(', ')}`);
    }
    if (context.weather) {
      parts.push(`Weather: ${context.weather}`);
    }
    if (context.recentEvents && context.recentEvents.length > 0) {
      parts.push(`Recent Events: ${context.recentEvents.join('; ')}`);
    }

    return parts.length > 0 ? `\n[Game Context]\n${parts.join('\n')}\n` : '';
  }

  /**
   * Get default system prompt for DM assistant
   * @private
   */
  _getDefaultSystemPrompt() {
    return `You are an expert Dungeon Master assistant for "War Room 1776," a Virtual Tabletop set during the American Revolution in December 1776. Your role is to:

- Provide historically grounded advice and suggestions
- Generate balanced D&D 5e encounters with Revolutionary War themes
- Create period-appropriate NPC dialogue
- Assist with rules lookups and mechanics

Tone: Dramatic but informative, respectful of history
Format: Concise, actionable, gameable content
Setting: December 1776, focusing on Washington's crossing of the Delaware River

Keep responses focused and practical for tabletop gameplay.`;
  }
}

const grokClient = new GrokClient();
export default grokClient;
