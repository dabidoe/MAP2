/**
 * AI Assistant Component
 * DM Assistant chat interface for War Room 1776
 * Provides AI-powered help with rules, encounters, NPCs, and story hooks
 */

import aiService from '../services/aiService.js';

class AIAssistant {
  constructor(containerId = 'ai-assistant-panel') {
    this.container = document.getElementById(containerId);
    this.messageHistory = [];
    this.isOpen = false;
    this.gameState = null; // Will be set by main.js

    if (!this.container) {
      console.error('[AIAssistant] Container not found:', containerId);
      return;
    }

    this.init();
  }

  /**
   * Initialize the AI Assistant UI
   */
  init() {
    this.render();
    this.attachEventListeners();
    console.log('[AIAssistant] Initialized');
  }

  /**
   * Render the AI Assistant UI
   */
  render() {
    this.container.innerHTML = `
      <div class="ai-assistant-header">
        <span class="ai-assistant-title">🧙‍♂️ Timmilander the Summoner</span>
        <button class="ai-assistant-close" aria-label="Close">×</button>
      </div>

      <div class="ai-assistant-context">
        <span class="context-label">Location:</span>
        <span class="context-info" id="ai-context-info">Loading...</span>
      </div>

      <div class="ai-assistant-messages" id="ai-messages">
        <div class="ai-message ai-system">
          <p><em>"Greetings, Commander. I am Timmilander, arcane advisor to General Washington. I shall assist thee with tactical matters."</em></p>
          <p><strong>I can summon forces and manipulate the battlefield:</strong></p>
          <ul>
            <li><strong>/summon [description]</strong> - I shall conjure enemies onto the map</li>
            <li><strong>/speak [as NPC] [what to say]</strong> - I can channel the voice of any present</li>
            <li><strong>/move [who] [where]</strong> - I shall relocate tokens upon thy request</li>
            <li><strong>/rules [question]</strong> - Consult me on the rules of engagement</li>
            <li><strong>/divine [theme]</strong> - I shall divine a path forward</li>
          </ul>
          <p><em>Speak thy command, and I shall make it so.</em></p>
        </div>
      </div>

      <div class="ai-assistant-quick-actions">
        <button class="ai-quick-btn" data-action="encounter">⚔️ Summon Foes</button>
        <button class="ai-quick-btn" data-action="npc">💬 Speak As...</button>
        <button class="ai-quick-btn" data-action="rules">📜 Rules</button>
        <button class="ai-quick-btn" data-action="plot">🔮 Divine Path</button>
      </div>

      <div class="ai-assistant-input">
        <textarea
          id="ai-input"
          class="ai-input-field"
          placeholder="Ask the DM Assistant..."
          rows="2"
          maxlength="2000"
        ></textarea>
        <button id="ai-send-btn" class="ai-send-btn">Send</button>
      </div>

      <div class="ai-assistant-status" id="ai-status" style="display: none;">
        <span class="ai-status-text">AI is thinking...</span>
      </div>
    `;

    this.updateContextDisplay();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Close button
    const closeBtn = this.container.querySelector('.ai-assistant-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.toggle());
    }

    // Send button
    const sendBtn = document.getElementById('ai-send-btn');
    const inputField = document.getElementById('ai-input');

    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.handleSendMessage());
    }

    // Enter to send (Shift+Enter for new line)
    if (inputField) {
      inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
    }

    // Quick action buttons
    const quickBtns = this.container.querySelectorAll('.ai-quick-btn');
    quickBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        this.handleQuickAction(action);
      });
    });
  }

  /**
   * Handle sending a message
   */
  async handleSendMessage() {
    const inputField = document.getElementById('ai-input');
    const message = inputField.value.trim();

    if (!message) return;
    if (aiService.isRequestInProgress()) {
      console.log('[AIAssistant] Request already in progress');
      return;
    }

    // Clear input
    inputField.value = '';

    // Add user message to UI
    this.addMessage('user', message);

    // Parse slash commands
    if (message.startsWith('/')) {
      await this.handleSlashCommand(message);
    } else {
      // Regular chat
      await this.sendChatMessage(message);
    }
  }

  /**
   * Handle slash commands
   */
  async handleSlashCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    try {
      this.showStatus('Timmilander is working his magic...');

      switch (cmd) {
        case '/ai':
          await this.sendChatMessage(args);
          break;

        case '/summon':
        case '/encounter':
          await this.generateEncounter(args);
          break;

        case '/speak':
        case '/npc':
          await this.generateNPCDialogue(args);
          break;

        case '/move':
          await this.moveToken(args);
          break;

        case '/rules':
          await this.rulesLookup(args);
          break;

        case '/divine':
        case '/plot':
          await this.generatePlotHook(args);
          break;

        default:
          this.addMessage('system', `<em>"I know not that command, Commander. Speak /rules, /summon, /speak, /move, or /divine."</em>`);
      }
    } catch (error) {
      this.addMessage('error', `<em>"Apologies, Commander. My magic has failed: ${error.message}"</em>`);
    } finally {
      this.hideStatus();
    }
  }

  /**
   * Send chat message to AI
   */
  async sendChatMessage(message) {
    try {
      this.showStatus('AI is thinking...');

      const context = this.buildContext();
      const result = await aiService.sendChatMessage(message, context);

      if (result.success) {
        // Check if response contains SUMMON_CHARACTER command
        const summonMatch = result.response.match(/SUMMON_CHARACTER:\s*([^\n]+)/i);

        if (summonMatch) {
          // Extract character names (comma-separated)
          const characterNames = summonMatch[1]
            .split(',')
            .map(name => name.trim())
            .filter(name => name.length > 0);

          // Remove the command from the displayed response
          const cleanResponse = result.response.replace(/SUMMON_CHARACTER:[^\n]+/gi, '').trim();
          this.addMessage('ai', cleanResponse);

          // Summon the characters
          await this.summonCharacters(characterNames);
        } else {
          this.addMessage('ai', result.response);
        }

        this.messageHistory.push({ role: 'user', content: message });
        this.messageHistory.push({ role: 'assistant', content: result.response });
      } else {
        this.addMessage('error', result.error);
      }
    } catch (error) {
      this.addMessage('error', `Failed to get AI response: ${error.message}`);
    } finally {
      this.hideStatus();
    }
  }

  /**
   * Generate encounter and create tokens
   */
  async generateEncounter(description) {
    try {
      this.showStatus('Timmilander summons your foes...');

      const context = this.buildContext();
      const params = {
        description: description || 'A surprise encounter',
        difficulty: 'medium',
        partyLevel: this.getAveragePartyLevel(),
        locationId: context.locationName || 'Unknown'
      };

      const result = await aiService.generateEncounter(params, context);

      if (result.success) {
        const encounter = result.encounter;
        const formattedEncounter = this.formatEncounter(encounter);
        this.addMessage('ai', `<em>"Behold! I have summoned: <strong>${encounter.name}</strong>"</em><br><br>${formattedEncounter}`);

        // Create tokens on the map for each enemy
        this.createEncounterTokens(encounter);

        this.addMessage('system', '<em>"The foes now appear upon thy map, Commander. Initiative shall be rolled presently."</em>');

        // Save encounter for future use
        await this.saveEncounter(encounter, context.locationName);
      } else {
        this.addMessage('error', `<em>"My summoning has failed: ${result.error}"</em>`);
      }
    } catch (error) {
      this.addMessage('error', `<em>"The arcane forces resist me: ${error.message}"</em>`);
    } finally {
      this.hideStatus();
    }
  }

  /**
   * Create tokens on the map from encounter data
   */
  createEncounterTokens(encounter) {
    if (!encounter.enemies || encounter.enemies.length === 0) return;

    // Get current location from game state
    const context = this.buildContext();
    const currentLocation = this.gameState?.currentLocation?.id || context.locationName;

    // Dispatch event to create tokens
    encounter.enemies.forEach((enemy, index) => {
      // Create grid position (spread enemies out in a line)
      const gridPosition = enemy.position || {
        row: 5 + Math.floor(index / 3),
        col: 5 + (index % 3) * 2
      };

      const tokenData = {
        tokenId: `enemy_${Date.now()}_${index}`,
        name: enemy.name,
        type: 'enemy',
        location: currentLocation,
        hp: enemy.hp,
        maxHp: enemy.hp,
        ac: enemy.ac,
        grid: gridPosition,
        icon: '🪖', // Hessian helmet icon
        portraitUrl: null, // Will use icon
        stats: {
          hp: enemy.hp,
          ac: enemy.ac,
          cr: enemy.cr
        },
        tactics: enemy.tactics,
        initiative: null // Will be rolled
      };

      // Dispatch event for main app to handle
      window.dispatchEvent(new CustomEvent('summonToken', {
        detail: { token: tokenData }
      }));
    });

    // Dispatch encounter start event
    window.dispatchEvent(new CustomEvent('encounterStart', {
      detail: {
        encounter: encounter,
        enemies: encounter.enemies
      }
    }));
  }

  /**
   * Summon named characters onto the map
   * @param {Array<string>} characterNames - Array of character names to summon
   */
  async summonCharacters(characterNames) {
    try {
      this.showStatus('Timmilander summons the chosen ones...');

      // Get current location from game state
      const context = this.buildContext();
      const currentLocation = this.gameState?.currentLocation?.id || context.locationName || 'frozen_vigil';

      // Call the token summoning API
      const response = await fetch('/api/summon/summon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          names: characterNames,
          location: currentLocation,
          position: { row: 5, col: 5 },
          type: 'player', // Summoned named characters are usually allies
          spread: 'line'
        })
      });

      const result = await response.json();

      if (result.success && result.tokens && result.tokens.length > 0) {
        // Add success message
        const summonedNames = result.found.join(', ');
        this.addMessage('system', `<em>"Behold! I have summoned: <strong>${summonedNames}</strong>"</em>`);

        // If some characters weren't found
        if (result.notFound && result.notFound.length > 0) {
          this.addMessage('system', `<em>"Alas, these souls elude my grasp: ${result.notFound.join(', ')}"</em>`);
        }

        // Dispatch summon events for each token
        result.tokens.forEach(token => {
          window.dispatchEvent(new CustomEvent('summonToken', {
            detail: { token }
          }));
        });

        this.addMessage('system', `<em>"The summoned now stand ready upon thy map, Commander."</em>`);
      } else {
        this.addMessage('error', `<em>"My summoning has failed: ${result.error || 'Unknown error'}"</em>`);
      }
    } catch (error) {
      this.addMessage('error', `<em>"The arcane forces resist me: ${error.message}"</em>`);
    } finally {
      this.hideStatus();
    }
  }

  /**
   * Save encounter to database for future use
   * @param {Object} encounter - Generated encounter
   * @param {string} locationId - Location ID where encounter occurred
   */
  async saveEncounter(encounter, locationId) {
    try {
      const response = await fetch('/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: encounter.name,
          description: encounter.description || '',
          difficulty: encounter.difficulty || 'medium',
          enemies: encounter.enemies,
          tactics: encounter.tactics || '',
          locationId: locationId || null
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Encounter saved:', encounter.name);
      } else {
        console.warn('⚠️ Failed to save encounter:', result.error);
      }
    } catch (error) {
      console.error('❌ Error saving encounter:', error);
    }
  }

  /**
   * Move a token
   */
  async moveToken(args) {
    try {
      this.showStatus('Moving token...');

      // Parse: /move [token name] [to location/coordinates]
      // For now, just acknowledge the command
      this.addMessage('ai', `<em>"Very well, Commander. I shall relocate them as thou commandest."</em>`);
      this.addMessage('system', '<em>Token movement feature coming soon. For now, drag tokens manually.</em>');

    } catch (error) {
      this.addMessage('error', `Failed to move token: ${error.message}`);
    } finally {
      this.hideStatus();
    }
  }

  /**
   * Generate NPC dialogue (Timmilander speaks as the NPC)
   */
  async generateNPCDialogue(args) {
    try {
      this.showStatus('Timmilander channels the voice...');

      // Parse args: /speak [name] [context]
      const parts = args.split(',');
      const npcName = parts[0]?.trim() || 'Unknown NPC';
      const context = parts.slice(1).join(',').trim() || 'casual conversation';

      const gameContext = this.buildContext();
      const params = {
        npcName,
        context,
        mood: 'neutral'
      };

      const result = await aiService.generateNPCDialogue(params, gameContext);

      if (result.success) {
        this.addMessage('ai', `<em>*Timmilander's eyes glow as he channels ${npcName}*</em><br><br><strong>${npcName}:</strong> "${result.dialogue}"`);
      } else {
        this.addMessage('error', `<em>"I cannot reach ${npcName}'s spirit: ${result.error}"</em>`);
      }
    } catch (error) {
      this.addMessage('error', `<em>"The channeling spell has failed: ${error.message}"</em>`);
    } finally {
      this.hideStatus();
    }
  }

  /**
   * Rules lookup
   */
  async rulesLookup(query) {
    try {
      this.showStatus('Consulting the ancient texts...');

      const result = await aiService.rulesLookup(query);

      if (result.success) {
        this.addMessage('ai', `<em>"The rules are thus, Commander:"</em><br><br>${result.response}`);
      } else {
        this.addMessage('error', `<em>"The texts are unclear: ${result.error}"</em>`);
      }
    } catch (error) {
      this.addMessage('error', `<em>"I cannot access the tomes: ${error.message}"</em>`);
    } finally {
      this.hideStatus();
    }
  }

  /**
   * Generate plot hook (Divine path forward)
   */
  async generatePlotHook(theme) {
    try {
      this.showStatus('Gazing into the crystal...');

      const context = this.buildContext();
      const result = await aiService.generatePlotHook(context, theme);

      if (result.success) {
        this.addMessage('ai', `<em>*Timmilander peers into his crystal orb*</em><br><br><strong>🔮 I divine:</strong> ${result.plotHook}`);
      } else {
        this.addMessage('error', `<em>"The future is clouded: ${result.error}"</em>`);
      }
    } catch (error) {
      this.addMessage('error', `<em>"The divination has failed: ${error.message}"</em>`);
    } finally {
      this.hideStatus();
    }
  }

  /**
   * Handle quick action buttons
   */
  handleQuickAction(action) {
    const inputField = document.getElementById('ai-input');

    switch (action) {
      case 'encounter':
        inputField.value = '/encounter ';
        inputField.focus();
        break;
      case 'npc':
        inputField.value = '/npc ';
        inputField.focus();
        break;
      case 'rules':
        inputField.value = '/rules ';
        inputField.focus();
        break;
      case 'plot':
        inputField.value = '/plot ';
        inputField.focus();
        break;
    }
  }

  /**
   * Add message to chat
   */
  addMessage(type, content) {
    const messagesContainer = document.getElementById('ai-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ai-${type}`;

    // Parse markdown-style formatting
    const formattedContent = this.parseMarkdown(content);
    messageDiv.innerHTML = formattedContent;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Parse simple markdown (bold, lists, etc.)
   */
  parseMarkdown(text) {
    if (typeof text !== 'string') return text;

    // Bold **text**
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Line breaks
    text = text.replace(/\n/g, '<br>');

    return `<p>${text}</p>`;
  }

  /**
   * Format encounter for display
   */
  formatEncounter(encounter) {
    let html = `<strong>${encounter.name}</strong><br>`;
    html += `${encounter.description}<br><br>`;

    html += `<strong>Enemies:</strong><br>`;
    encounter.enemies.forEach(enemy => {
      html += `• <strong>${enemy.name}</strong> (${enemy.type})<br>`;
      html += `  HP: ${enemy.hp}, AC: ${enemy.ac}, CR: ${enemy.cr}<br>`;
      if (enemy.tactics) {
        html += `  Tactics: ${enemy.tactics}<br>`;
      }
    });

    if (encounter.terrain) {
      html += `<br><strong>Terrain:</strong> ${encounter.terrain}<br>`;
    }

    if (encounter.objectives && encounter.objectives.length > 0) {
      html += `<br><strong>Objectives:</strong><br>`;
      encounter.objectives.forEach(obj => {
        html += `• ${obj}<br>`;
      });
    }

    return html;
  }

  /**
   * Show status indicator
   */
  showStatus(message) {
    const statusEl = document.getElementById('ai-status');
    const statusText = statusEl?.querySelector('.ai-status-text');

    if (statusEl && statusText) {
      statusText.textContent = message;
      statusEl.style.display = 'flex';
    }

    // Disable send button
    const sendBtn = document.getElementById('ai-send-btn');
    if (sendBtn) sendBtn.disabled = true;
  }

  /**
   * Hide status indicator
   */
  hideStatus() {
    const statusEl = document.getElementById('ai-status');
    if (statusEl) {
      statusEl.style.display = 'none';
    }

    // Enable send button
    const sendBtn = document.getElementById('ai-send-btn');
    if (sendBtn) sendBtn.disabled = false;
  }

  /**
   * Toggle AI Assistant visibility
   */
  toggle() {
    this.isOpen = !this.isOpen;
    this.container.classList.toggle('ai-assistant-open', this.isOpen);

    if (this.isOpen) {
      document.getElementById('ai-input')?.focus();
    }
  }

  /**
   * Open AI Assistant
   */
  open() {
    this.isOpen = true;
    this.container.classList.add('ai-assistant-open');
    document.getElementById('ai-input')?.focus();
  }

  /**
   * Close AI Assistant
   */
  close() {
    this.isOpen = false;
    this.container.classList.remove('ai-assistant-open');
  }

  /**
   * Update context display
   */
  updateContextDisplay() {
    const contextInfo = document.getElementById('ai-context-info');
    if (!contextInfo) return;

    const context = this.buildContext();
    const parts = [];

    if (context.locationName) parts.push(context.locationName);
    if (context.campaignDate) parts.push(context.campaignDate);
    if (context.characters && context.characters.length > 0) {
      parts.push(`${context.characters.length} character(s)`);
    }

    contextInfo.textContent = parts.length > 0 ? parts.join(' • ') : 'No context available';
  }

  /**
   * Set game state (called by main.js)
   */
  setGameState(gameState) {
    this.gameState = gameState;
    this.updateContextDisplay();
  }

  /**
   * Build context from game state
   */
  buildContext() {
    if (!this.gameState) return {};
    return aiService.buildContext(this.gameState);
  }

  /**
   * Get average party level
   */
  getAveragePartyLevel() {
    if (!this.gameState?.activeCharacters || this.gameState.activeCharacters.length === 0) {
      return 5; // Default
    }

    const total = this.gameState.activeCharacters.reduce((sum, char) => sum + (char.level || 1), 0);
    return Math.round(total / this.gameState.activeCharacters.length);
  }

  /**
   * Clear message history
   */
  clearHistory() {
    this.messageHistory = [];
    const messagesContainer = document.getElementById('ai-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
    }
  }
}

export default AIAssistant;
