import express from 'express';
import rateLimit from 'express-rate-limit';
import aiManager from '../services/ai/aiManager.js';

const router = express.Router();

/**
 * Rate limiting configurations
 */
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: { error: 'Too many chat requests, please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const imageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: { error: 'Too many image generation requests, please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const globalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour
  message: { error: 'Too many AI requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Apply global rate limiting to all AI routes
 */
router.use(globalLimiter);

/**
 * POST /api/ai/chat
 * DM Assistant Chat
 * Body: { message: string, context: object }
 */
router.post('/chat', chatLimiter, async (req, res) => {
  try {
    const { message, context = {} } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required and must be a non-empty string' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long. Maximum 2000 characters.' });
    }

    const result = await aiManager.chat(message, context);

    if (!result.success) {
      return res.status(500).json({ error: result.error, details: result.details });
    }

    res.json(result);
  } catch (error) {
    console.error('[AI Routes] Chat error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * POST /api/ai/encounter
 * Generate D&D 5e Encounter
 * Body: { locationId: string, difficulty: string, description: string, partyLevel: number }
 */
router.post('/encounter', chatLimiter, async (req, res) => {
  try {
    const { locationId, difficulty = 'medium', description, partyLevel, context = {} } = req.body;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ error: 'Description is required for encounter generation' });
    }

    const params = {
      locationId,
      difficulty,
      description,
      partyLevel: partyLevel || 5
    };

    const result = await aiManager.generateEncounter(params, context);

    if (!result.success) {
      return res.status(500).json({ error: result.error, details: result.details });
    }

    res.json(result);
  } catch (error) {
    console.error('[AI Routes] Encounter generation error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * POST /api/ai/npc-dialogue
 * Generate NPC Dialogue
 * Body: { npcName: string, context: string, mood: string, recentDialogue: array }
 */
router.post('/npc-dialogue', chatLimiter, async (req, res) => {
  try {
    const { npcName, context, mood = 'neutral', recentDialogue = [], gameContext = {} } = req.body;

    if (!npcName || typeof npcName !== 'string') {
      return res.status(400).json({ error: 'NPC name is required' });
    }

    if (!context || typeof context !== 'string') {
      return res.status(400).json({ error: 'Context is required for dialogue generation' });
    }

    const params = {
      npcName,
      context,
      mood,
      recentDialogue
    };

    const result = await aiManager.generateNPCDialogue(params, gameContext);

    if (!result.success) {
      return res.status(500).json({ error: result.error, details: result.details });
    }

    res.json(result);
  } catch (error) {
    console.error('[AI Routes] NPC dialogue error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * POST /api/ai/rules-lookup
 * D&D 5e Rules Lookup
 * Body: { query: string }
 */
router.post('/rules-lookup', chatLimiter, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await aiManager.rulesLookup(query);

    if (!result.success) {
      return res.status(500).json({ error: result.error, details: result.details });
    }

    res.json(result);
  } catch (error) {
    console.error('[AI Routes] Rules lookup error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * POST /api/ai/plot-hook
 * Generate Plot Hook
 * Body: { context: object, theme: string }
 */
router.post('/plot-hook', chatLimiter, async (req, res) => {
  try {
    const { context = {}, theme = '' } = req.body;

    const result = await aiManager.generatePlotHook(context, theme);

    if (!result.success) {
      return res.status(500).json({ error: result.error, details: result.details });
    }

    res.json(result);
  } catch (error) {
    console.error('[AI Routes] Plot hook error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * POST /api/ai/image/generate
 * Generate Image (Character Portrait, Battle Map, Scene)
 * Body: { prompt: string, style: string, characterData: object, options: object }
 */
router.post('/image/generate', imageLimiter, async (req, res) => {
  try {
    const { prompt, style = 'scene', characterData = null, options = {} } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required for image generation' });
    }

    if (prompt.length > 1000) {
      return res.status(400).json({ error: 'Prompt too long. Maximum 1000 characters.' });
    }

    const validStyles = ['portrait', 'map', 'scene', 'item'];
    if (!validStyles.includes(style)) {
      return res.status(400).json({ error: `Invalid style. Must be one of: ${validStyles.join(', ')}` });
    }

    const result = await aiManager.generateImage(prompt, {
      ...options,
      style,
      characterData
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error, details: result.details });
    }

    // Return image as base64 data URI
    const dataUri = `data:${result.mimeType};base64,${result.imageData}`;

    res.json({
      ...result,
      imageUrl: dataUri, // Client can use this directly in <img src="">
      imageData: result.imageData // Raw base64 if client wants to save
    });
  } catch (error) {
    console.error('[AI Routes] Image generation error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * POST /api/ai/image/analyze
 * Analyze Image (Vision)
 * Body: multipart/form-data with 'image' file and optional 'prompt' field
 */
router.post('/image/analyze', imageLimiter, async (req, res) => {
  try {
    // Note: This requires multer middleware for file uploads
    // For now, we'll accept base64 image data in JSON body

    const { imageData, prompt = null, mimeType = 'image/png' } = req.body;

    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({ error: 'Image data (base64) is required' });
    }

    // Remove data URI prefix if present
    let cleanImageData = imageData;
    if (imageData.startsWith('data:')) {
      const base64Index = imageData.indexOf('base64,');
      if (base64Index !== -1) {
        cleanImageData = imageData.substring(base64Index + 7);
      }
    }

    const result = await aiManager.analyzeImage(cleanImageData, prompt, mimeType);

    if (!result.success) {
      return res.status(500).json({ error: result.error, details: result.details });
    }

    res.json(result);
  } catch (error) {
    console.error('[AI Routes] Image analysis error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * GET /api/ai/status
 * Get AI service status
 */
router.get('/status', (req, res) => {
  try {
    const status = aiManager.getStatus();
    res.json({
      success: true,
      services: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[AI Routes] Status check error:', error);
    res.status(500).json({ error: 'Failed to check AI service status' });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
