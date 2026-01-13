/**
 * Encounter Routes
 * API endpoints for saving, loading, and managing encounters
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Path to encounters file
const ENCOUNTERS_PATH = path.join(__dirname, '../../data/encounters.json');
const LOCATIONS_PATH = path.join(__dirname, '../../data/locations.json');

/**
 * Load encounters from file
 */
async function loadEncounters() {
  try {
    const data = await fs.readFile(ENCOUNTERS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[EncounterRoutes] Error loading encounters:', error);
    return [];
  }
}

/**
 * Save encounters to file
 */
async function saveEncounters(encounters) {
  try {
    await fs.writeFile(ENCOUNTERS_PATH, JSON.stringify(encounters, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('[EncounterRoutes] Error saving encounters:', error);
    return false;
  }
}

/**
 * Load locations from file
 */
async function loadLocations() {
  try {
    const data = await fs.readFile(LOCATIONS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[EncounterRoutes] Error loading locations:', error);
    return [];
  }
}

/**
 * Save locations to file
 */
async function saveLocations(locations) {
  try {
    await fs.writeFile(LOCATIONS_PATH, JSON.stringify(locations, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('[EncounterRoutes] Error saving locations:', error);
    return false;
  }
}

/**
 * GET /api/encounters
 * List all saved encounters
 */
router.get('/', async (req, res) => {
  try {
    const encounters = await loadEncounters();
    res.json({
      success: true,
      count: encounters.length,
      encounters
    });
  } catch (error) {
    console.error('[EncounterRoutes] Error listing encounters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list encounters'
    });
  }
});

/**
 * GET /api/encounters/:id
 * Get encounter by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const encounters = await loadEncounters();
    const encounter = encounters.find(e => e.id === req.params.id);

    if (!encounter) {
      return res.status(404).json({
        success: false,
        error: 'Encounter not found'
      });
    }

    res.json({
      success: true,
      encounter
    });
  } catch (error) {
    console.error('[EncounterRoutes] Error getting encounter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get encounter'
    });
  }
});

/**
 * POST /api/encounters
 * Save a new encounter
 * Body: { name, description, difficulty, enemies[], tactics, locationId? }
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, difficulty, enemies, tactics, locationId } = req.body;

    if (!name || !enemies || enemies.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'name and enemies are required'
      });
    }

    const encounters = await loadEncounters();

    // Generate unique ID
    const id = `encounter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newEncounter = {
      id,
      name,
      description: description || '',
      difficulty: difficulty || 'medium',
      enemies,
      tactics: tactics || '',
      locationId: locationId || null,
      createdAt: new Date().toISOString(),
      usedCount: 0
    };

    encounters.push(newEncounter);

    const saved = await saveEncounters(encounters);

    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save encounter'
      });
    }

    console.log(`✅ Saved encounter: ${name} (${id})`);

    res.json({
      success: true,
      encounter: newEncounter
    });
  } catch (error) {
    console.error('[EncounterRoutes] Error saving encounter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save encounter'
    });
  }
});

/**
 * PUT /api/encounters/:id
 * Update an existing encounter
 */
router.put('/:id', async (req, res) => {
  try {
    const encounters = await loadEncounters();
    const index = encounters.findIndex(e => e.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Encounter not found'
      });
    }

    // Update encounter
    encounters[index] = {
      ...encounters[index],
      ...req.body,
      id: req.params.id, // Preserve ID
      updatedAt: new Date().toISOString()
    };

    const saved = await saveEncounters(encounters);

    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update encounter'
      });
    }

    res.json({
      success: true,
      encounter: encounters[index]
    });
  } catch (error) {
    console.error('[EncounterRoutes] Error updating encounter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update encounter'
    });
  }
});

/**
 * DELETE /api/encounters/:id
 * Delete an encounter
 */
router.delete('/:id', async (req, res) => {
  try {
    const encounters = await loadEncounters();
    const filtered = encounters.filter(e => e.id !== req.params.id);

    if (filtered.length === encounters.length) {
      return res.status(404).json({
        success: false,
        error: 'Encounter not found'
      });
    }

    const saved = await saveEncounters(filtered);

    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete encounter'
      });
    }

    res.json({
      success: true,
      message: 'Encounter deleted'
    });
  } catch (error) {
    console.error('[EncounterRoutes] Error deleting encounter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete encounter'
    });
  }
});

/**
 * GET /api/encounters/location/:locationId
 * Get all encounters for a specific location
 */
router.get('/location/:locationId', async (req, res) => {
  try {
    const encounters = await loadEncounters();
    const locationEncounters = encounters.filter(e => e.locationId === req.params.locationId);

    res.json({
      success: true,
      locationId: req.params.locationId,
      count: locationEncounters.length,
      encounters: locationEncounters
    });
  } catch (error) {
    console.error('[EncounterRoutes] Error getting location encounters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get location encounters'
    });
  }
});

/**
 * POST /api/encounters/:id/use
 * Increment usage count when encounter is used
 */
router.post('/:id/use', async (req, res) => {
  try {
    const encounters = await loadEncounters();
    const encounter = encounters.find(e => e.id === req.params.id);

    if (!encounter) {
      return res.status(404).json({
        success: false,
        error: 'Encounter not found'
      });
    }

    encounter.usedCount = (encounter.usedCount || 0) + 1;
    encounter.lastUsed = new Date().toISOString();

    await saveEncounters(encounters);

    res.json({
      success: true,
      encounter
    });
  } catch (error) {
    console.error('[EncounterRoutes] Error marking encounter as used:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark encounter as used'
    });
  }
});

/**
 * POST /api/encounters/locations
 * Add a new location
 */
router.post('/locations', async (req, res) => {
  try {
    const { id, title, lat, lng, description, radius, tacticalMapUrl, portals, encounters } = req.body;

    if (!id || !title || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        error: 'id, title, lat, and lng are required'
      });
    }

    const locations = await loadLocations();

    // Check if location already exists
    if (locations.find(l => l.id === id)) {
      return res.status(409).json({
        success: false,
        error: 'Location with this ID already exists'
      });
    }

    const newLocation = {
      id,
      title,
      lat,
      lng,
      description: description || '',
      radius: radius || 50,
      tacticalMapUrl: tacticalMapUrl || null,
      portals: portals || [],
      encounters: encounters || []
    };

    locations.push(newLocation);

    const saved = await saveLocations(locations);

    if (!saved) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save location'
      });
    }

    console.log(`✅ Created location: ${title} (${id})`);

    res.json({
      success: true,
      location: newLocation
    });
  } catch (error) {
    console.error('[EncounterRoutes] Error creating location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create location'
    });
  }
});

/**
 * GET /api/encounters/locations
 * List all locations
 */
router.get('/locations', async (req, res) => {
  try {
    const locations = await loadLocations();
    res.json({
      success: true,
      count: locations.length,
      locations
    });
  } catch (error) {
    console.error('[EncounterRoutes] Error listing locations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list locations'
    });
  }
});

export default router;
