/**
 * Token Routes
 * API endpoints for loading and summoning pre-existing character tokens
 */

import express from 'express';
import tokenLoader from '../services/tokenLoader.js';

const router = express.Router();

/**
 * GET /api/tokens/list
 * List all available characters
 */
router.get('/list', async (req, res) => {
  try {
    const characters = await tokenLoader.loadCharacters();
    const names = characters.map(char => ({
      name: char.name,
      class: char.class,
      race: char.race,
      level: char.level,
      id: char._id?.$oid || char._id
    }));

    res.json({
      success: true,
      count: names.length,
      characters: names
    });
  } catch (error) {
    console.error('[TokenRoutes] Error listing characters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list characters'
    });
  }
});

/**
 * GET /api/tokens/search?q=<query>
 * Search characters by name
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) is required'
      });
    }

    const results = await tokenLoader.searchCharacters(q);

    res.json({
      success: true,
      query: q,
      count: results.length,
      characters: results.map(char => ({
        name: char.name,
        class: char.class,
        race: char.race,
        level: char.level,
        hp: char.hp,
        ac: char.ac
      }))
    });
  } catch (error) {
    console.error('[TokenRoutes] Error searching characters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search characters'
    });
  }
});

/**
 * GET /api/tokens/party
 * Get party members
 */
router.get('/party', async (req, res) => {
  try {
    const partyMembers = await tokenLoader.getPartyMembers();

    res.json({
      success: true,
      count: partyMembers.length,
      party: partyMembers.map(char => ({
        name: char.name,
        class: char.class,
        race: char.race,
        level: char.level,
        hp: char.hp,
        ac: char.ac,
        icon: char.icon
      }))
    });
  } catch (error) {
    console.error('[TokenRoutes] Error getting party:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get party members'
    });
  }
});

/**
 * GET /api/tokens/enemies
 * Get enemy characters (Hessians, etc.)
 */
router.get('/enemies', async (req, res) => {
  try {
    const enemies = await tokenLoader.getEnemies();

    res.json({
      success: true,
      count: enemies.length,
      enemies: enemies.map(char => ({
        name: char.name,
        class: char.class,
        race: char.race,
        level: char.level,
        hp: char.hp,
        ac: char.ac
      }))
    });
  } catch (error) {
    console.error('[TokenRoutes] Error getting enemies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get enemies'
    });
  }
});

/**
 * POST /api/tokens/summon
 * Summon character(s) as tokens on the map
 * Body: {
 *   names: string[], // Character names to summon
 *   location: string, // Location ID
 *   position: { row: number, col: number }, // Starting position
 *   type: 'player' | 'enemy' | 'npc', // Token type
 *   spread: 'formation' | 'line' | 'scattered' // How to position multiple tokens
 * }
 */
router.post('/summon', async (req, res) => {
  try {
    const {
      names,
      location = 'frozen_vigil',
      position = { row: 5, col: 5 },
      type = 'enemy',
      spread = 'formation'
    } = req.body;

    if (!names || !Array.isArray(names) || names.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'names array is required'
      });
    }

    // Fetch characters by name
    const characters = await Promise.all(
      names.map(name => tokenLoader.getCharacterByName(name))
    );

    // Filter out null values (characters not found)
    const foundCharacters = characters.filter(char => char !== null);

    if (foundCharacters.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No characters found with provided names',
        requested: names
      });
    }

    // Transform to tokens
    const tokens = tokenLoader.charactersToTokens(foundCharacters, {
      location,
      startPosition: position,
      type,
      spread
    });

    res.json({
      success: true,
      count: tokens.length,
      requested: names,
      found: foundCharacters.map(c => c.name),
      notFound: names.filter(name =>
        !foundCharacters.some(c => c.name.toLowerCase() === name.toLowerCase())
      ),
      tokens
    });
  } catch (error) {
    console.error('[TokenRoutes] Error summoning tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to summon tokens'
    });
  }
});

/**
 * GET /api/tokens/character/:name
 * Get full character data by name
 */
router.get('/character/:name', async (req, res) => {
  try {
    const { name } = req.params;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Character name is required'
      });
    }

    const character = await tokenLoader.getCharacterByName(name);

    if (!character) {
      return res.status(404).json({
        success: false,
        error: 'Character not found',
        name
      });
    }

    res.json({
      success: true,
      character
    });
  } catch (error) {
    console.error('[TokenRoutes] Error getting character:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get character'
    });
  }
});

export default router;
