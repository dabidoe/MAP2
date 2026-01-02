/**
 * API Routes
 * RESTful endpoints for game data
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Token from '../models/Token.js';
import Location from '../models/Location.js';
import Character from '../models/Character.js';
import Encounter from '../models/Encounter.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper: Try MongoDB first, fallback to JSON files
 */
const getFromDBOrFile = async (Model, jsonPath, fallbackData = []) => {
  try {
    // Try MongoDB first
    const data = await Model.find({});
    if (data && data.length > 0) return data;

    // Fallback to JSON file
    const filePath = path.join(__dirname, '../../data', jsonPath);
    if (fs.existsSync(filePath)) {
      const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return fileData;
    }

    return fallbackData;
  } catch (error) {
    console.error(`Error fetching data:`, error.message);
    // Last resort fallback
    try {
      const filePath = path.join(__dirname, '../../data', jsonPath);
      if (fs.existsSync(filePath)) {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return fileData;
      }
    } catch (fileError) {
      console.error('File fallback also failed:', fileError.message);
    }
    return fallbackData;
  }
};

// ============================================
// TOKENS
// ============================================

/**
 * GET /api/tokens
 * Get all tokens
 */
router.get('/tokens', async (req, res) => {
  try {
    const tokens = await getFromDBOrFile(Token, 'tokens.json');
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tokens/:id
 * Get token by ID
 */
router.get('/tokens/:id', async (req, res) => {
  try {
    const token = await Token.findOne({ tokenId: req.params.id }) ||
                  await Token.findById(req.params.id);
    if (!token) return res.status(404).json({ error: 'Token not found' });
    res.json(token);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tokens/location/:locationId
 * Get all tokens at a location
 */
router.get('/tokens/location/:locationId', async (req, res) => {
  try {
    const tokens = await Token.findByLocation(req.params.locationId);
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/tokens/:id
 * Update token position or stats
 */
router.patch('/tokens/:id', async (req, res) => {
  try {
    const token = await Token.findOneAndUpdate(
      { tokenId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!token) return res.status(404).json({ error: 'Token not found' });
    res.json(token);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// LOCATIONS
// ============================================

/**
 * GET /api/locations
 * Get all locations
 */
router.get('/locations', async (req, res) => {
  try {
    const locations = await getFromDBOrFile(Location, 'locations.json');
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/locations/:id
 * Get location by ID
 */
router.get('/locations/:id', async (req, res) => {
  try {
    const location = await Location.findOne({ id: req.params.id }) ||
                     await Location.findById(req.params.id);
    if (!location) return res.status(404).json({ error: 'Location not found' });
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/locations/nearby/:lat/:lng
 * Find locations near coordinates
 */
router.get('/locations/nearby/:lat/:lng', async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const maxDistance = req.query.distance || 1000;
    const locations = await Location.findNearby(parseFloat(lat), parseFloat(lng), parseFloat(maxDistance));
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CHARACTERS
// ============================================

/**
 * GET /api/characters
 * Get all characters
 */
router.get('/characters', async (req, res) => {
  try {
    const characters = await getFromDBOrFile(Character, 'characters.json');
    res.json(characters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/characters/:id
 * Get character by ID
 */
router.get('/characters/:id', async (req, res) => {
  try {
    const character = await Character.findById(req.params.id);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    res.json(character);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/characters/name/:name
 * Get character by name
 */
router.get('/characters/name/:name', async (req, res) => {
  try {
    const character = await Character.findOne({ name: req.params.name });
    if (!character) return res.status(404).json({ error: 'Character not found' });
    res.json(character);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENCOUNTERS
// ============================================

/**
 * GET /api/encounters
 * Get all encounters
 */
router.get('/encounters', async (req, res) => {
  try {
    const encounters = await Encounter.find({});
    res.json(encounters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/encounters/active
 * Get currently active encounter
 */
router.get('/encounters/active', async (req, res) => {
  try {
    const encounter = await Encounter.findActive();
    res.json(encounter || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/encounters/:id
 * Get encounter by ID
 */
router.get('/encounters/:id', async (req, res) => {
  try {
    const encounter = await Encounter.findOne({ encounterId: req.params.id }) ||
                      await Encounter.findById(req.params.id);
    if (!encounter) return res.status(404).json({ error: 'Encounter not found' });
    res.json(encounter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/encounters/:id/start
 * Start an encounter
 */
router.post('/encounters/:id/start', async (req, res) => {
  try {
    const encounter = await Encounter.findOne({ encounterId: req.params.id });
    if (!encounter) return res.status(404).json({ error: 'Encounter not found' });

    await encounter.start();
    res.json(encounter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/encounters/:id/end
 * End an encounter
 */
router.post('/encounters/:id/end', async (req, res) => {
  try {
    const encounter = await Encounter.findOne({ encounterId: req.params.id });
    if (!encounter) return res.status(404).json({ error: 'Encounter not found' });

    await encounter.end();
    res.json(encounter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/encounters/:id/initiative
 * Add combatant to initiative
 */
router.post('/encounters/:id/initiative', async (req, res) => {
  try {
    const { tokenId, name, roll } = req.body;
    const encounter = await Encounter.findOne({ encounterId: req.params.id });
    if (!encounter) return res.status(404).json({ error: 'Encounter not found' });

    await encounter.addToInitiative(tokenId, name, roll);
    res.json(encounter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// LIBRARY (Lazy Loading)
// ============================================

/**
 * GET /api/library/:type/:id
 * Lazy load spell/ability/item data
 * Examples:
 *   /api/library/spell/divine-smite
 *   /api/library/ability/action-surge
 *   /api/library/item/saber-of-liberty
 */
router.get('/library/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;

    // For now, return placeholder data
    // TODO: Connect to your character builder's library
    res.json({
      type,
      id,
      name: id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      description: 'Detailed information loaded on demand...',
      placeholder: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CAMPAIGN STATE
// ============================================

/**
 * GET /api/campaign
 * Get full campaign state
 */
router.get('/campaign', async (req, res) => {
  try {
    const [tokens, locations, characters, activeEncounter] = await Promise.all([
      getFromDBOrFile(Token, 'tokens.json'),
      getFromDBOrFile(Location, 'locations.json'),
      getFromDBOrFile(Character, 'characters.json'),
      Encounter.findActive().catch(() => null)
    ]);

    res.json({
      tokens,
      locations,
      characters,
      activeEncounter,
      config: {
        date: process.env.CAMPAIGN_DATE,
        time: process.env.CAMPAIGN_START_TIME,
        weather: process.env.WEATHER
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
