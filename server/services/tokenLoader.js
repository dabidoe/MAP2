/**
 * Token Loader Service
 * Loads and manages pre-existing character tokens from Character Foundry exports
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TokenLoader {
  constructor() {
    this.characters = [];
    this.loaded = false;
  }

  /**
   * Load all characters from CharacterFoundryWeb.characters.json
   */
  async loadCharacters() {
    if (this.loaded) {
      return this.characters;
    }

    try {
      const charactersPath = path.join(__dirname, '../../data/tokens/CharacterFoundryWeb.characters.json');
      const rawData = await fs.readFile(charactersPath, 'utf8');
      this.characters = JSON.parse(rawData);
      this.loaded = true;
      console.log(`✅ Loaded ${this.characters.length} characters from Character Foundry`);
      return this.characters;
    } catch (error) {
      console.error('❌ Failed to load characters:', error);
      throw error;
    }
  }

  /**
   * Get character by name (case-insensitive)
   * @param {string} name - Character name
   * @returns {Object|null} Character object or null if not found
   */
  async getCharacterByName(name) {
    if (!this.loaded) {
      await this.loadCharacters();
    }

    const normalizedName = name.toLowerCase().trim();
    return this.characters.find(char =>
      char.name.toLowerCase().trim() === normalizedName
    ) || null;
  }

  /**
   * Search characters by partial name match
   * @param {string} query - Search query
   * @returns {Array} Matching characters
   */
  async searchCharacters(query) {
    if (!this.loaded) {
      await this.loadCharacters();
    }

    const normalizedQuery = query.toLowerCase().trim();
    return this.characters.filter(char =>
      char.name.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Get all character names
   * @returns {Array<string>} Array of character names
   */
  async getCharacterNames() {
    if (!this.loaded) {
      await this.loadCharacters();
    }

    return this.characters.map(char => char.name).sort();
  }

  /**
   * Get party members (filter by specific names or criteria)
   * @returns {Array} Party member characters
   */
  async getPartyMembers() {
    if (!this.loaded) {
      await this.loadCharacters();
    }

    // Revolutionary War party members
    const partyNames = [
      'George Washington',
      'General Nathanael Greene',
      'Benjamin Franklin',
      'BATMAN 2', // For testing
      'Merlin'    // For testing
    ];

    return this.characters.filter(char =>
      partyNames.some(partyName =>
        char.name.toLowerCase() === partyName.toLowerCase()
      )
    );
  }

  /**
   * Get enemy characters (Hessians, etc.)
   * @returns {Array} Enemy characters
   */
  async getEnemies() {
    if (!this.loaded) {
      await this.loadCharacters();
    }

    const enemyKeywords = ['gefreiter', 'feldwebel', 'hessian', 'cultist', 'novice'];

    return this.characters.filter(char =>
      enemyKeywords.some(keyword =>
        char.name.toLowerCase().includes(keyword)
      )
    );
  }

  /**
   * Transform Character Foundry format to War Room 1776 token format
   * @param {Object} character - Character Foundry character
   * @param {Object} options - Additional options (location, position, type)
   * @returns {Object} Token in War Room format
   */
  characterToToken(character, options = {}) {
    const {
      location = 'frozen_vigil',
      position = { row: 5, col: 5 },
      type = 'player'
    } = options;

    // Determine icon based on character name/class
    let icon = '🎭';
    const name = character.name.toLowerCase();

    if (name.includes('washington')) icon = '⭐';
    else if (name.includes('greene')) icon = '🎖️';
    else if (name.includes('franklin')) icon = '📜';
    else if (name.includes('batman')) icon = '🦇';
    else if (name.includes('merlin')) icon = '🧙';
    else if (name.includes('gefreiter') || name.includes('feldwebel')) icon = '🪖';
    else if (character.class === 'Rogue') icon = '🗡️';
    else if (character.class === 'Wizard' || character.class === 'Warlock') icon = '🔮';
    else if (character.class === 'Fighter') icon = '⚔️';
    else if (character.class === 'Cleric') icon = '✝️';
    else if (character.class === 'Ranger') icon = '🏹';

    return {
      tokenId: `token_${character._id?.$oid || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: character.name,
      type: type, // 'player', 'enemy', 'npc'
      location: location,
      hp: character.hp?.current || character.hp?.max || 0,
      maxHp: character.hp?.max || 0,
      ac: character.ac || 10,
      grid: position,
      icon: icon,
      portraitUrl: character.icon || null,
      stats: {
        hp: character.hp?.max || 0,
        ac: character.ac || 10,
        level: character.level || 1,
        class: character.class || 'Unknown',
        race: character.race || 'Unknown',
        ...character.attributes
      },
      initiative: character.initiative || null,
      abilities: character.abilities || [],
      spells: character.spells || { slots: [], known: [] },
      profile: character.profile || {},
      state: character.state || 'Active'
    };
  }

  /**
   * Generate multiple tokens with smart positioning
   * @param {Array<Object>} characters - Array of characters
   * @param {Object} options - Options (location, startPosition, type)
   * @returns {Array<Object>} Array of tokens
   */
  charactersToTokens(characters, options = {}) {
    const {
      location = 'frozen_vigil',
      startPosition = { row: 5, col: 5 },
      type = 'enemy',
      spread = 'formation' // 'formation', 'scattered', 'line'
    } = options;

    return characters.map((character, index) => {
      let position = { ...startPosition };

      // Calculate position based on spread type
      if (spread === 'formation') {
        // 3 per row, 2 columns apart
        position.row = startPosition.row + Math.floor(index / 3);
        position.col = startPosition.col + (index % 3) * 2;
      } else if (spread === 'line') {
        // Horizontal line
        position.col = startPosition.col + index * 2;
      } else if (spread === 'scattered') {
        // Random scatter within 5x5 area
        position.row = startPosition.row + Math.floor(Math.random() * 5);
        position.col = startPosition.col + Math.floor(Math.random() * 5);
      }

      return this.characterToToken(character, { location, position, type });
    });
  }
}

// Singleton instance
const tokenLoader = new TokenLoader();

export default tokenLoader;
