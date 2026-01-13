import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Gemini API Client for War Room 1776
 * Handles multimodal tasks: image generation, vision/analysis
 */
class GeminiClient {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.textModel = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
    this.imageModel = process.env.GEMINI_IMAGE_MODEL || 'imagen-4.0-generate-preview-06-06';

    if (!this.apiKey) {
      console.warn('[GeminiClient] Warning: GEMINI_API_KEY not found in environment');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  /**
   * Generate text using Gemini (fallback for Grok)
   * @param {string} prompt - Text prompt
   * @param {Object} options - Generation options
   * @returns {Promise<Object>}
   */
  async generateText(prompt, options = {}) {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.textModel });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 1500,
        }
      });

      const response = await result.response;
      const text = response.text();

      return {
        response: text,
        model: this.textModel
      };
    } catch (error) {
      console.error('[GeminiClient] Text generation error:', error.message);
      throw new Error(`Gemini text generation error: ${error.message}`);
    }
  }

  /**
   * Generate an image using Imagen
   * @param {string} prompt - Image description
   * @param {Object} options - { style, aspectRatio, negativePrompt }
   * @returns {Promise<Object>} - { imageData: base64, imageUrl: string, prompt: string }
   */
  async generateImage(prompt, options = {}) {
    try {
      const { style = 'portrait', aspectRatio = '1:1', negativePrompt = '' } = options;

      // Enhance prompt with War Room 1776 styling
      const enhancedPrompt = this._enhanceImagePrompt(prompt, style);

      const model = this.genAI.getGenerativeModel({ model: this.imageModel });

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: enhancedPrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          candidateCount: 1
        }
      });

      const response = await result.response;

      // Note: Imagen API returns image data differently depending on the model
      // This is a simplified version - actual implementation may need adjustment
      const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;

      if (!imageData) {
        throw new Error('No image data returned from Imagen');
      }

      return {
        imageData: imageData.data,
        mimeType: imageData.mimeType || 'image/png',
        prompt: enhancedPrompt,
        originalPrompt: prompt,
        model: this.imageModel
      };
    } catch (error) {
      console.error('[GeminiClient] Image generation error:', error.message);
      throw new Error(`Gemini image generation error: ${error.message}`);
    }
  }

  /**
   * Analyze an image using Gemini Vision
   * @param {Buffer|string} imageData - Image buffer or base64 string
   * @param {string} prompt - What to analyze (optional)
   * @param {string} mimeType - Image MIME type (default: image/png)
   * @returns {Promise<Object>} - { analysis: string, extractedInfo: Object }
   */
  async analyzeImage(imageData, prompt = null, mimeType = 'image/png') {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.textModel });

      const analysisPrompt = prompt || `Analyze this image in the context of War Room 1776 (a D&D 5e VTT set during the American Revolution). Describe:
1. What you see in the image
2. Any tactical or strategic elements (if it's a map)
3. Any characters, creatures, or NPCs visible
4. Terrain features and cover positions
5. Any text, labels, or annotations present

Provide a structured analysis that would be useful for a Dungeon Master.`;

      // Convert buffer to base64 if needed
      let imageBase64;
      if (Buffer.isBuffer(imageData)) {
        imageBase64 = imageData.toString('base64');
      } else {
        imageBase64 = imageData;
      }

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: analysisPrompt },
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType
              }
            }
          ]
        }]
      });

      const response = await result.response;
      const analysisText = response.text();

      return {
        analysis: analysisText,
        model: this.textModel,
        prompt: analysisPrompt
      };
    } catch (error) {
      console.error('[GeminiClient] Image analysis error:', error.message);
      throw new Error(`Gemini vision error: ${error.message}`);
    }
  }

  /**
   * Generate a battle map from text description
   * @param {string} description - Map description
   * @param {Object} options - Generation options
   * @returns {Promise<Object>}
   */
  async generateBattleMap(description, options = {}) {
    const mapPrompt = `Top-down tactical battle map: ${description}.
Style: Grid overlay, 1776 Revolutionary War setting, strategic view, muted historical colors, clear terrain features, suitable for D&D 5e combat.`;

    return this.generateImage(mapPrompt, { ...options, style: 'map' });
  }

  /**
   * Generate a character portrait
   * @param {Object} characterData - { name, class, level, race, description }
   * @param {Object} options - Generation options
   * @returns {Promise<Object>}
   */
  async generateCharacterPortrait(characterData, options = {}) {
    const { name, class: charClass, race, description } = characterData;

    const portraitPrompt = `Portrait of ${name}, a ${race} ${charClass} during the American Revolution (1776). ${description || ''}.
Continental Army uniform, dramatic lighting, oil painting style, historical accuracy, parchment background, heroic pose.`;

    return this.generateImage(portraitPrompt, { ...options, style: 'portrait' });
  }

  /**
   * Enhance image prompt with style-specific additions
   * @private
   */
  _enhanceImagePrompt(prompt, style) {
    const styleEnhancements = {
      portrait: 'Oil painting portrait style, 1776 American Revolution era, dramatic lighting, historical accuracy, parchment background, detailed facial features',
      map: 'Top-down tactical battle map, grid overlay, strategic view, muted colors, clear terrain features, 1776 setting, suitable for tabletop gaming',
      scene: 'Dramatic scene illustration, 1776 American Revolution setting, painterly style, historical accuracy, cinematic composition, rich details',
      item: 'Detailed item illustration, 1776 era artifact or weapon, technical drawing style, parchment background, clear details'
    };

    const enhancement = styleEnhancements[style] || styleEnhancements.scene;

    // Check if prompt already includes style keywords
    if (prompt.toLowerCase().includes('1776') || prompt.toLowerCase().includes('revolution')) {
      return `${prompt}. ${enhancement}`;
    }

    return `${prompt}. ${enhancement}`;
  }

  /**
   * Extract tactical information from battle map analysis
   * @param {string} analysisText - Raw analysis text
   * @returns {Object} - Structured tactical info
   */
  _extractTacticalInfo(analysisText) {
    // Simple extraction logic - can be enhanced with more sophisticated parsing
    return {
      terrain: this._extractSection(analysisText, ['terrain', 'ground', 'surface']),
      cover: this._extractSection(analysisText, ['cover', 'concealment', 'protection']),
      chokePoints: this._extractSection(analysisText, ['choke', 'narrow', 'bottleneck']),
      highGround: this._extractSection(analysisText, ['high ground', 'elevation', 'height']),
      hazards: this._extractSection(analysisText, ['hazard', 'danger', 'threat']),
      objects: this._extractSection(analysisText, ['object', 'item', 'feature'])
    };
  }

  /**
   * Extract section from analysis text based on keywords
   * @private
   */
  _extractSection(text, keywords) {
    const lowerText = text.toLowerCase();
    for (const keyword of keywords) {
      const index = lowerText.indexOf(keyword);
      if (index !== -1) {
        // Extract sentence containing the keyword
        const start = lowerText.lastIndexOf('.', index) + 1;
        const end = lowerText.indexOf('.', index);
        if (end !== -1) {
          return text.substring(start, end + 1).trim();
        }
      }
    }
    return null;
  }
}

const geminiClient = new GeminiClient();
export default geminiClient;
