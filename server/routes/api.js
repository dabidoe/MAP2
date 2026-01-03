/**
 * API Routes
 * RESTful endpoints for game data
 * DIRECT FILE-SYSTEM READS - No MongoDB/Mongoose
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper: Load JSON file directly from /data folder
 */
const loadJSONFile = (filename) => {
  try {
    const filePath = path.join(__dirname, '../../data', filename);
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileData);
    }
    console.warn(`File not found: ${filename}`);
    return [];
  } catch (error) {
    console.error(`Error loading ${filename}:`, error.message);
    return [];
  }
};

// ============================================
// TOKENS
// ============================================

/**
 * GET /api/tokens
 * Get all tokens
 */
router.get('/tokens', (req, res) => {
  try {
    const tokens = loadJSONFile('tokens.json');
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tokens/:id
 * Get token by ID
 */
router.get('/tokens/:id', (req, res) => {
  try {
    const tokens = loadJSONFile('tokens.json');
    const token = tokens.find(t => t.tokenId === req.params.id);
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
router.get('/tokens/location/:locationId', (req, res) => {
  try {
    const tokens = loadJSONFile('tokens.json');
    const locationTokens = tokens.filter(t => t.locationId === req.params.locationId);
    res.json(locationTokens);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/tokens/:id
 * Update token position or stats (in-memory only, not persisted)
 */
router.patch('/tokens/:id', (req, res) => {
  try {
    const tokens = loadJSONFile('tokens.json');
    const token = tokens.find(t => t.tokenId === req.params.id);
    if (!token) return res.status(404).json({ error: 'Token not found' });

    // Merge updates
    Object.assign(token, req.body);
    res.json(token);

    // NOTE: Changes are NOT persisted to file (in-memory only for this session)
    console.log(`⚠️  Token ${req.params.id} updated (in-memory only, not saved to file)`);
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
router.get('/locations', (req, res) => {
  try {
    const locations = loadJSONFile('locations.json');
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/locations/:id
 * Get location by ID
 */
router.get('/locations/:id', (req, res) => {
  try {
    const locations = loadJSONFile('locations.json');
    const location = locations.find(l => l.id === req.params.id);
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
router.get('/locations/nearby/:lat/:lng', (req, res) => {
  try {
    const { lat, lng } = req.params;
    const maxDistance = parseFloat(req.query.distance) || 1000;
    const locations = loadJSONFile('locations.json');

    // Simple distance calculation (haversine approximation)
    const nearbyLocations = locations.filter(loc => {
      const latDiff = Math.abs(loc.lat - parseFloat(lat));
      const lngDiff = Math.abs(loc.lng - parseFloat(lng));
      const distanceKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // rough km conversion
      return distanceKm <= maxDistance;
    });

    res.json(nearbyLocations);
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
router.get('/characters', (req, res) => {
  try {
    const characters = loadJSONFile('characters.json');
    res.json(characters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/characters/:id
 * Get character by ID (MongoDB _id or legacy ID)
 */
router.get('/characters/:id', (req, res) => {
  try {
    const characters = loadJSONFile('characters.json');
    const character = characters.find(c =>
      c._id?.$oid === req.params.id ||
      c.legacySourceId === req.params.id
    );
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
router.get('/characters/name/:name', (req, res) => {
  try {
    const characters = loadJSONFile('characters.json');
    const character = characters.find(c => c.name === req.params.name);
    if (!character) return res.status(404).json({ error: 'Character not found' });
    res.json(character);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ENCOUNTERS (stub - no file yet)
// ============================================

/**
 * GET /api/encounters
 * Get all encounters (currently returns empty array)
 */
router.get('/encounters', (req, res) => {
  try {
    // No encounters.json file yet - return empty
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/encounters/active
 * Get currently active encounter
 */
router.get('/encounters/active', (req, res) => {
  try {
    res.json(null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/encounters/:id
 * Get encounter by ID
 */
router.get('/encounters/:id', (req, res) => {
  try {
    res.status(404).json({ error: 'Encounter not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/encounters/:id/start
 * Start an encounter (stub)
 */
router.post('/encounters/:id/start', (req, res) => {
  res.status(501).json({ error: 'Encounters not yet implemented' });
});

/**
 * POST /api/encounters/:id/end
 * End an encounter (stub)
 */
router.post('/encounters/:id/end', (req, res) => {
  res.status(501).json({ error: 'Encounters not yet implemented' });
});

/**
 * POST /api/encounters/:id/initiative
 * Add combatant to initiative (stub)
 */
router.post('/encounters/:id/initiative', (req, res) => {
  res.status(501).json({ error: 'Encounters not yet implemented' });
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
router.get('/library/:type/:id', (req, res) => {
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
router.get('/campaign', (req, res) => {
  try {
    const tokens = loadJSONFile('tokens.json');
    const locations = loadJSONFile('locations.json');
    const characters = loadJSONFile('characters.json');

    res.json({
      tokens,
      locations,
      characters,
      activeEncounter: null,
      config: {
        date: process.env.CAMPAIGN_DATE || 'December 25, 1776',
        time: process.env.CAMPAIGN_START_TIME || '18:00',
        weather: process.env.WEATHER || 'Heavy Snow'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
