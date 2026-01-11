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

/**
 * Helper: Resolve a reference path to actual data
 * @param {string} refPath - Path like "spells/level_1/bless.json" or "traits/divine-health.json"
 * @returns {object|null} - The loaded JSON data or null if not found
 */
const resolveReference = (refPath) => {
  try {
    const fullPath = path.join(__dirname, '../../data', refPath);
    if (fs.existsSync(fullPath)) {
      const fileData = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(fileData);
    }
    return null;
  } catch (error) {
    console.error(`Error resolving reference ${refPath}:`, error.message);
    return null;
  }
};

/**
 * Helper: Expand references in a character object
 * @param {object} character - The character with ref fields
 * @param {boolean} expand - Whether to expand references inline (default: false)
 * @returns {object} - Character with expanded references
 */
const expandCharacterReferences = (character, expand = false) => {
  if (!character) return character;

  const expanded = { ...character };

  // If not expanding, return as-is (refs remain as pointers)
  if (!expand) return expanded;

  // Expand traits
  if (expanded.traits && Array.isArray(expanded.traits)) {
    expanded.traits = expanded.traits.map(trait => {
      if (trait.ref) {
        const resolved = resolveReference(trait.ref);
        return resolved || trait;
      }
      return trait;
    });
  }

  // Expand abilities
  if (expanded.abilities && Array.isArray(expanded.abilities)) {
    expanded.abilities = expanded.abilities.map(ability => {
      if (ability.ref) {
        const resolved = resolveReference(ability.ref);
        return resolved || ability;
      }
      return ability;
    });
  }

  // Expand feats
  if (expanded.feats && Array.isArray(expanded.feats)) {
    expanded.feats = expanded.feats.map(feat => {
      if (feat.ref) {
        const resolved = resolveReference(feat.ref);
        return resolved || feat;
      }
      return feat;
    });
  }

  // Expand hotbar items
  if (expanded.hotbar) {
    Object.keys(expanded.hotbar).forEach(slot => {
      const item = expanded.hotbar[slot];
      if (item.ref) {
        const resolved = resolveReference(item.ref);
        if (resolved) {
          expanded.hotbar[slot] = { ...item, ...resolved };
        }
      }
    });
  }

  // Expand spellbook
  if (expanded.spellbook) {
    Object.keys(expanded.spellbook).forEach(level => {
      if (Array.isArray(expanded.spellbook[level])) {
        expanded.spellbook[level] = expanded.spellbook[level].map(spell => {
          if (spell.ref) {
            const resolved = resolveReference(spell.ref);
            return resolved ? { ...spell, ...resolved } : spell;
          }
          return spell;
        });
      }
    });
  }

  return expanded;
};

/**
 * Helper: Recursively load all character JSON files from /data/tokens folder
 */
const loadCharactersFromTokens = (expand = false) => {
  const characters = [];
  const tokensDir = path.join(__dirname, '../../data/tokens');

  const scanDirectory = (dir) => {
    try {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Recursively scan subdirectories
          scanDirectory(fullPath);
        } else if (item.endsWith('.json') && item !== 'party.json' && item !== 'npcs.json' && item !== 'beastiary.json') {
          // Load individual character JSON files (skip index files)
          try {
            const fileData = fs.readFileSync(fullPath, 'utf8');
            const character = JSON.parse(fileData);
            if (character && character.name) {
              // Expand references if requested
              const processedCharacter = expandCharacterReferences(character, expand);
              characters.push(processedCharacter);
            }
          } catch (error) {
            console.error(`Error loading character file ${fullPath}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error.message);
    }
  };

  scanDirectory(tokensDir);
  return characters;
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
 * Get all characters from individual token files
 * Query params: ?expand=true to resolve all references inline
 */
router.get('/characters', (req, res) => {
  try {
    const expand = req.query.expand === 'true';
    const characters = loadCharactersFromTokens(expand);
    res.json(characters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/characters/:id
 * Get character by ID (MongoDB _id or legacy ID)
 * Query params: ?expand=true to resolve all references inline
 */
router.get('/characters/:id', (req, res) => {
  try {
    const expand = req.query.expand === 'true';
    const characters = loadCharactersFromTokens(expand);
    const character = characters.find(c =>
      c._id === req.params.id ||
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
 * Query params: ?expand=true to resolve all references inline
 */
router.get('/characters/name/:name', (req, res) => {
  try {
    const expand = req.query.expand === 'true';
    const characters = loadCharactersFromTokens(expand);
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
// SPELLS
// ============================================

/**
 * GET /api/spells/list
 * Get list of all spell files organized by level
 * Returns: { 0: ['spell1.json', 'spell2.json'], 1: [...], ... }
 */
router.get('/spells/list', (req, res) => {
  try {
    const levels = [0, 1, 2, 3, 9];
    const spellFiles = {};

    levels.forEach(level => {
      const dirPath = path.join(__dirname, '../../data/spells', `level_${level}`);
      if (fs.existsSync(dirPath)) {
        spellFiles[level] = fs.readdirSync(dirPath)
          .filter(file => file.endsWith('.json'))
          .sort();
      } else {
        spellFiles[level] = [];
      }
    });

    res.json(spellFiles);
  } catch (error) {
    console.error('Error listing spells:', error);
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
    const characters = loadCharactersFromTokens();

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
