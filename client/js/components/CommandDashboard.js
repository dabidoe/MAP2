/**
 * Command Dashboard - Floating HUD Edition
 * Manages floating HUD panels:
 * - Atlas Panel (Campaign State)
 * - Unit Card (Selected Token Stats)
 * - Combat Tracker (Initiative)
 */

export class CommandDashboard {
  /**
   * @param {GameState} gameState - Game state instance
   */
  constructor(gameState) {
    this.gameState = gameState;

    // DOM elements
    this.elements = {
      // Atlas Panel
      atlasTitle: document.getElementById('atlas-title'),
      currentObjectiveRow: document.getElementById('current-objective-row'),
      currentObjective: document.getElementById('current-objective'),
      date: document.getElementById('campaign-date'),
      time: document.getElementById('campaign-time'),
      weather: document.getElementById('campaign-weather'),
      moraleFill: document.getElementById('morale-fill'),

      // Unit Card
      unitCard: document.getElementById('floating-unit-card'),
      unitName: document.getElementById('unit-name'),
      unitHp: document.getElementById('unit-hp'),
      unitAc: document.getElementById('unit-ac'),
      unitActions: document.getElementById('unit-actions'),
      closeUnitCard: document.getElementById('close-unit-card'),

      // Combat Tracker
      combatTracker: document.getElementById('floating-combat-tracker'),
      initiativeList: document.getElementById('initiative-list'),

      // Console/Chat
      consoleMessages: document.getElementById('console-messages'),
      chatInput: document.getElementById('chat-input'),
      chatSend: document.getElementById('chat-send'),
      characterSelector: document.getElementById('character-selector'),

      // Dice Roller
      diceIconBtn: document.getElementById('dice-icon-btn'),
      dicePopup: document.getElementById('dice-roller-popup'),
      closeDicePopup: document.getElementById('close-dice-popup'),
      diceCustomInput: document.getElementById('dice-custom-input'),
      diceCustomRoll: document.getElementById('dice-custom-roll'),

      // Character Sheet Modal
      characterSheetModal: document.getElementById('character-sheet-modal'),
      viewCharacterDetails: document.getElementById('view-character-details'),
      closeCharacterSheet: document.getElementById('close-character-sheet'),
      sheetCharacterName: document.getElementById('sheet-character-name'),
      sheetProfile: document.getElementById('sheet-profile'),
      sheetAttributes: document.getElementById('sheet-attributes'),
      sheetSkills: document.getElementById('sheet-skills'),
      sheetTraits: document.getElementById('sheet-traits'),
      sheetFeats: document.getElementById('sheet-feats')
    };

    // Current selected token for character sheet
    this.currentToken = null;

    // Targeted token for attacks
    this.targetToken = null;

    this._init();
  }

  /**
   * Set target token
   * @param {Object} token - Target token
   */
  setTarget(token) {
    this.targetToken = token;

    // Update target label
    const targetLabel = document.getElementById('target-label');
    const targetName = document.getElementById('target-name');

    if (token && targetLabel && targetName) {
      targetName.textContent = token.name;
      targetLabel.style.display = 'flex';
    } else if (targetLabel) {
      targetLabel.style.display = 'none';
    }
  }

  /**
   * Initialize dashboard
   * @private
   */
  _init() {
    // Subscribe to state changes
    this.gameState.on('campaignUpdate', (data) => this._updateCampaign(data));
    this.gameState.on('tokenSelect', (token) => this._showUnitCard(token));
    this.gameState.on('encounterStart', () => this._showCombat());
    this.gameState.on('encounterEnd', () => this._hideCombat());
    this.gameState.on('initiativeUpdate', (init) => this._updateInitiative(init));
    this.gameState.on('locationChange', (location) => {
      this._updateAtlasContext(location);
      this._updateCharacterSelector();
    });

    // Console event listeners
    this.gameState.on('stateLoaded', () => {
      this._addConsoleMessage('system', 'Game data loaded successfully');
      this._updateCharacterSelector();
    });
    this.gameState.on('tokenMove', (data) => {
      const token = this.gameState.getToken(data.tokenId);
      if (token) {
        this._addConsoleMessage('action', `${token.name} moved position`);
      }
    });
    this.gameState.on('encounterStart', (data) => {
      this._addConsoleMessage('combat', `⚔️ Encounter started: ${data.id || 'Unknown'}`);
    });
    this.gameState.on('encounterEnd', () => {
      this._addConsoleMessage('combat', '✅ Encounter ended');
    });
    this.gameState.on('roundAdvance', (round) => {
      this._addConsoleMessage('combat', `Round ${round} begins!`);
    });
    this.gameState.on('locationDiscovered', (locationId) => {
      const location = this.gameState.getLocation(locationId);
      this._addConsoleMessage('discovery', `📍 Discovered: ${location?.title || locationId}`);
    });
    this.gameState.on('modeChange', (mode) => {
      this._addConsoleMessage('system', `Switched to ${mode} mode`);
    });

    // Close button handler
    if (this.elements.closeUnitCard) {
      this.elements.closeUnitCard.onclick = () => this._hideUnitCard();
    }

    // Chat input handlers
    this._initChatInput();

    // Dice roller handlers
    this._initDiceRoller();

    // Character sheet handlers
    if (this.elements.viewCharacterDetails) {
      this.elements.viewCharacterDetails.onclick = () => this._showCharacterSheet();
    }
    if (this.elements.closeCharacterSheet) {
      this.elements.closeCharacterSheet.onclick = () => this._hideCharacterSheet();
    }
    // Close modal when clicking outside
    if (this.elements.characterSheetModal) {
      this.elements.characterSheetModal.onclick = (e) => {
        if (e.target === this.elements.characterSheetModal) {
          this._hideCharacterSheet();
        }
      };
    }

    // Initial render
    this._updateCampaign(this.gameState.getState().campaign);

    console.log('✅ CommandDashboard initialized (Floating HUD)');
  }

  /**
   * Update Atlas Panel: Campaign State
   * @private
   */
  _updateCampaign(campaign) {
    if (this.elements.date) {
      this.elements.date.textContent = campaign.date || 'Unknown';
    }
    if (this.elements.time) {
      this.elements.time.textContent = campaign.time || '00:00';
    }
    if (this.elements.weather) {
      this.elements.weather.textContent = campaign.weather || 'Clear';
    }
    if (this.elements.moraleFill) {
      this.elements.moraleFill.style.width = `${campaign.morale || 0}%`;
    }
  }

  /**
   * Update Atlas Panel: Contextual to active location
   * @private
   */
  _updateAtlasContext(location) {
    if (location) {
      // In tactical view - show location name and objective
      if (this.elements.atlasTitle) {
        this.elements.atlasTitle.textContent = location.title;
      }
      if (this.elements.currentObjective) {
        this.elements.currentObjective.textContent = location.description || 'Secure the area';
      }
      if (this.elements.currentObjectiveRow) {
        this.elements.currentObjectiveRow.style.display = 'flex';
      }
    } else {
      // In world view - show campaign title, hide objective
      if (this.elements.atlasTitle) {
        this.elements.atlasTitle.textContent = 'War Room 1776';
      }
      if (this.elements.currentObjectiveRow) {
        this.elements.currentObjectiveRow.style.display = 'none';
      }
    }
  }

  /**
   * Update character selector dropdown with available tokens
   * @private
   */
  _updateCharacterSelector() {
    if (!this.elements.characterSelector) return;

    const state = this.gameState.getState();
    const activeLocation = state.ui.activeLocation;

    // Clear current options
    this.elements.characterSelector.innerHTML = '<option value="">Player</option>';

    // If in tactical view, show tokens at current location
    if (activeLocation) {
      const tokens = state.tokens.filter(t => t.locationId === activeLocation);
      tokens.forEach(token => {
        const option = document.createElement('option');
        option.value = token.tokenId;
        option.textContent = token.name;
        this.elements.characterSelector.appendChild(option);
      });

      // Auto-select current token if set
      if (this.currentToken) {
        this.elements.characterSelector.value = this.currentToken.tokenId;
      }
    } else {
      // In world view, show all tokens
      state.tokens.forEach(token => {
        const option = document.createElement('option');
        option.value = token.tokenId;
        option.textContent = token.name;
        this.elements.characterSelector.appendChild(option);
      });
    }
  }

  /**
   * Show Unit Card (floating, bottom-right)
   * @private
   */
  _showUnitCard(token) {
    if (!token || !this.elements.unitCard) return;

    // Save current token for character sheet
    this.currentToken = token;

    // Update character selector
    if (this.elements.characterSelector) {
      this.elements.characterSelector.value = token.tokenId;
    }

    // Populate unit data
    this.elements.unitName.textContent = token.name || 'Unknown Unit';
    this.elements.unitHp.textContent = `${token.hp || 0}/${token.maxHp || 0}`;
    this.elements.unitAc.textContent = token.ac || '0';

    // Populate actions
    this.elements.unitActions.innerHTML = '';
    if (token.actions && token.actions.length > 0) {
      token.actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.textContent = `${action.name} (${action.damage || action.effect})`;
        btn.onclick = () => this._useAction(token, action);
        this.elements.unitActions.appendChild(btn);
      });
    } else {
      this.elements.unitActions.innerHTML = '<p style="color: #8b7355; font-size: 0.8rem;">No actions available</p>';
    }

    // Show the card
    this.elements.unitCard.style.display = 'block';
  }

  /**
   * Hide Unit Card
   * @private
   */
  _hideUnitCard() {
    if (this.elements.unitCard) {
      this.elements.unitCard.style.display = 'none';
    }
    this.gameState.selectToken(null);
  }

  /**
   * Use action from Unit Card
   * @private
   */
  _useAction(token, action) {
    console.log(`${token.name} uses ${action.name}`);

    // Determine action type and format message
    let message = '';
    let messageType = 'action';

    if (action.type === 'Attack') {
      // Roll attack
      const attackRoll = Math.floor(Math.random() * 20) + 1;
      const bonusMatch = action.bonus?.match(/[+-]\d+/);
      const bonus = bonusMatch ? parseInt(bonusMatch[0]) : 0;
      const total = attackRoll + bonus;

      // Build attack message
      const targetName = this.targetToken ? this.targetToken.name : 'target';
      message = `⚔️ ${token.name} attacks ${targetName} with ${action.name}`;
      message += `\n🎲 Attack Roll: [${attackRoll}] + ${bonus} = ${total}`;

      // Check if target is selected
      if (this.targetToken) {
        const targetAC = this.targetToken.stats?.ac || this.targetToken.ac || 10;
        const isHit = total >= targetAC;
        const isCrit = attackRoll === 20;
        const isMiss = attackRoll === 1 || !isHit;

        if (isCrit) {
          message += ` ✅ **CRITICAL HIT!** (AC ${targetAC})`;
        } else if (isHit) {
          message += ` ✅ **HIT!** (AC ${targetAC})`;
        } else {
          message += ` ❌ **MISS!** (AC ${targetAC})`;
        }

        // Roll damage if hit
        if (isHit) {
          const damageMatch = action.damage?.match(/(\d+)d(\d+)([+-]\d+)?/);
          if (damageMatch) {
            const count = parseInt(damageMatch[1]) * (isCrit ? 2 : 1); // Double dice on crit
            const sides = parseInt(damageMatch[2]);
            const mod = damageMatch[3] ? parseInt(damageMatch[3]) : 0;

            let damageTotal = mod;
            const rolls = [];
            for (let i = 0; i < count; i++) {
              const roll = Math.floor(Math.random() * sides) + 1;
              rolls.push(roll);
              damageTotal += roll;
            }

            const damageType = action.damage.split(' ')[1] || '';
            message += `\n💥 Damage: [${rolls.join(', ')}]${mod !== 0 ? ` ${mod >= 0 ? '+' : ''}${mod}` : ''} = ${damageTotal} ${damageType}`;

            // Apply damage to target
            if (this.targetToken.stats?.hp !== undefined) {
              this.targetToken.stats.hp = Math.max(0, this.targetToken.stats.hp - damageTotal);
              message += `\n❤️ ${this.targetToken.name}: ${this.targetToken.stats.hp}/${this.targetToken.stats.hpMax} HP`;
            } else if (this.targetToken.hp !== undefined) {
              this.targetToken.hp = Math.max(0, this.targetToken.hp - damageTotal);
              message += `\n❤️ ${this.targetToken.name}: ${this.targetToken.hp}/${this.targetToken.maxHp} HP`;
            }
          }
        }
      } else {
        // No target - show attack roll and damage roll
        message += ` (no target selected)`;

        // Still roll damage for reference
        const damageMatch = action.damage?.match(/(\d+)d(\d+)([+-]\d+)?/);
        if (damageMatch) {
          const count = parseInt(damageMatch[1]);
          const sides = parseInt(damageMatch[2]);
          const mod = damageMatch[3] ? parseInt(damageMatch[3]) : 0;

          let damageTotal = mod;
          const rolls = [];
          for (let i = 0; i < count; i++) {
            const roll = Math.floor(Math.random() * sides) + 1;
            rolls.push(roll);
            damageTotal += roll;
          }

          const damageType = action.damage.split(' ')[1] || '';
          message += `\n💥 Damage Roll: [${rolls.join(', ')}]${mod !== 0 ? ` ${mod >= 0 ? '+' : ''}${mod}` : ''} = ${damageTotal} ${damageType}`;
        }
      }
      messageType = 'combat';

    } else if (action.type === 'Spell') {
      // Spell cast
      const targetName = this.targetToken ? this.targetToken.name : 'area';
      message = `✨ ${token.name} casts ${action.name} on ${targetName}`;
      if (action.bonus && action.bonus.includes('DC')) {
        message += ` (${action.bonus})`;
      }
      messageType = 'action';

    } else if (action.type === 'Ability') {
      // Ability use
      message = `💪 ${token.name} uses ${action.name}`;
      if (action.damage) {
        message += `: ${action.damage}`;
      }
      messageType = 'action';

    } else {
      // Generic action
      message = `🎯 ${token.name} uses ${action.name}`;
      if (action.damage || action.effect) {
        message += `: ${action.damage || action.effect}`;
      }
      messageType = 'action';
    }

    // Post to chat
    this._addConsoleMessage(messageType, message);

    // TODO: Emit action event for multiplayer
  }

  /**
   * Show Combat Tracker
   * @private
   */
  _showCombat() {
    if (this.elements.combatTracker) {
      this.elements.combatTracker.style.display = 'block';
    }
  }

  /**
   * Hide Combat Tracker
   * @private
   */
  _hideCombat() {
    if (this.elements.combatTracker) {
      this.elements.combatTracker.style.display = 'none';
    }
  }

  /**
   * Update Initiative List
   * @private
   */
  _updateInitiative(initiative) {
    if (!this.elements.initiativeList) return;

    this.elements.initiativeList.innerHTML = '';

    if (!initiative || initiative.length === 0) {
      this.elements.initiativeList.innerHTML = '<p style="color: #8b7355; font-size: 0.8rem;">No combatants</p>';
      return;
    }

    initiative.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'initiative-item';
      if (entry.hasActed) {
        item.style.opacity = '0.5';
      }

      item.innerHTML = `
        <span class="initiative-name">${entry.name}</span>
        <span class="initiative-roll">${entry.roll}</span>
      `;

      this.elements.initiativeList.appendChild(item);
    });
  }

  /**
   * Initialize chat input
   * @private
   */
  _initChatInput() {
    // Send button
    if (this.elements.chatSend) {
      this.elements.chatSend.addEventListener('click', () => {
        this._sendChatMessage();
      });
    }

    // Enter key
    if (this.elements.chatInput) {
      this.elements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this._sendChatMessage();
        }
      });
    }

    // Clear target button
    const clearTargetBtn = document.getElementById('clear-target');
    if (clearTargetBtn) {
      clearTargetBtn.addEventListener('click', () => {
        this.setTarget(null);
      });
    }
  }

  /**
   * Send chat message
   * @private
   */
  _sendChatMessage() {
    if (!this.elements.chatInput) return;

    const message = this.elements.chatInput.value.trim();
    if (!message) return;

    // Process slash commands
    if (message.startsWith('/')) {
      this._processCommand(message);
    } else {
      // Regular player message
      this._addConsoleMessage('player', message);
    }

    // Clear input
    this.elements.chatInput.value = '';
  }

  /**
   * Process slash commands
   * @private
   * @param {string} command - Command string
   */
  _processCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case '/roll':
        // Roll dice: /roll 2d6+3
        if (args.length > 0) {
          const notation = args.join('');
          this._rollDice(notation);
        } else {
          this._addConsoleMessage('system', '❌ Usage: /roll [dice notation]  (e.g., /roll 2d6+3)');
        }
        break;

      case '/help':
        // Show available commands
        this._showHelp();
        break;

      case '/clear':
        // Clear chat history
        if (this.elements.consoleMessages) {
          this.elements.consoleMessages.innerHTML = '';
          this._addConsoleMessage('system', '🧹 Chat cleared');
        }
        break;

      case '/attack':
        // Quick attack: /attack [target name]
        if (this.currentToken) {
          const targetName = args.join(' ') || 'enemy';
          this._quickAttack(this.currentToken, targetName);
        } else {
          this._addConsoleMessage('system', '❌ No character selected. Click a token first.');
        }
        break;

      case '/skill':
        // Skill check: /skill [skill name]
        if (args.length > 0) {
          const skillName = args.join(' ');
          this._skillCheck(skillName);
        } else {
          this._addConsoleMessage('system', '❌ Usage: /skill [skill name]  (e.g., /skill Perception)');
        }
        break;

      case '/init':
      case '/initiative':
        // Roll initiative
        this._rollInitiative();
        break;

      default:
        this._addConsoleMessage('system', `❌ Unknown command: ${cmd}. Type /help for available commands.`);
    }
  }

  /**
   * Show help message with available commands
   * @private
   */
  _showHelp() {
    const helpText = `
<strong>Available Commands:</strong>
• /roll [dice] - Roll dice (e.g., /roll 2d6+3, /roll d20)
• /attack [target] - Quick attack with selected character
• /skill [name] - Make a skill check (e.g., /skill Perception)
• /init - Roll initiative for selected character
• /clear - Clear chat history
• /help - Show this help message
    `.trim();

    this._addConsoleMessage('system', helpText);
  }

  /**
   * Quick attack command
   * @private
   */
  _quickAttack(token, targetName) {
    if (!token.actions || token.actions.length === 0) {
      this._addConsoleMessage('system', `❌ ${token.name} has no available attacks.`);
      return;
    }

    // Use first attack action
    const attackAction = token.actions.find(a => a.type === 'Attack') || token.actions[0];

    // Roll attack
    const attackRoll = Math.floor(Math.random() * 20) + 1;
    const bonusMatch = attackAction.bonus?.match(/[+-]\d+/);
    const bonus = bonusMatch ? parseInt(bonusMatch[0]) : 0;
    const total = attackRoll + bonus;

    this._addConsoleMessage('combat',
      `⚔️ ${token.name} attacks ${targetName} with ${attackAction.name}: [${attackRoll}] + ${bonus} = ${total}`
    );
  }

  /**
   * Skill check command
   * @private
   */
  _skillCheck(skillName) {
    const characterName = this.currentToken ? this.currentToken.name : 'Player';
    const roll = Math.floor(Math.random() * 20) + 1;

    this._addConsoleMessage('action',
      `🎯 ${characterName} makes a ${skillName} check: [${roll}]`
    );
  }

  /**
   * Roll initiative
   * @private
   */
  _rollInitiative() {
    if (!this.currentToken) {
      this._addConsoleMessage('system', '❌ No character selected. Click a token first.');
      return;
    }

    const roll = Math.floor(Math.random() * 20) + 1;
    const initBonus = this.currentToken.stats?.init || 0;
    const total = roll + initBonus;

    this._addConsoleMessage('combat',
      `🎲 ${this.currentToken.name} rolls initiative: [${roll}] + ${initBonus} = ${total}`
    );

    // TODO: Add to initiative tracker
  }

  /**
   * Initialize dice roller
   * @private
   */
  _initDiceRoller() {
    // Dice icon button - opens popup
    if (this.elements.diceIconBtn) {
      this.elements.diceIconBtn.addEventListener('click', () => {
        this._showDicePopup();
      });
    }

    // Close popup button
    if (this.elements.closeDicePopup) {
      this.elements.closeDicePopup.addEventListener('click', () => {
        this._hideDicePopup();
      });
    }

    // Click outside to close
    if (this.elements.dicePopup) {
      this.elements.dicePopup.addEventListener('click', (e) => {
        if (e.target === this.elements.dicePopup) {
          this._hideDicePopup();
        }
      });
    }

    // Quick dice buttons
    const diceButtons = document.querySelectorAll('.dice-btn[data-dice]');
    diceButtons.forEach(button => {
      button.addEventListener('click', () => {
        const diceType = button.getAttribute('data-dice');
        this._rollDice(diceType);
        this._hideDicePopup(); // Close popup after roll
      });
    });

    // Custom roll button
    if (this.elements.diceCustomRoll) {
      this.elements.diceCustomRoll.addEventListener('click', () => {
        const notation = this.elements.diceCustomInput.value.trim();
        if (notation) {
          this._rollDice(notation);
          this.elements.diceCustomInput.value = ''; // Clear input
          this._hideDicePopup(); // Close popup after roll
        }
      });
    }

    // Enter key on custom input
    if (this.elements.diceCustomInput) {
      this.elements.diceCustomInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const notation = this.elements.diceCustomInput.value.trim();
          if (notation) {
            this._rollDice(notation);
            this.elements.diceCustomInput.value = ''; // Clear input
            this._hideDicePopup(); // Close popup after roll
          }
        }
      });
    }
  }

  /**
   * Show dice popup
   * @private
   */
  _showDicePopup() {
    // Don't open if character sheet is already open
    if (this.elements.characterSheetModal &&
        this.elements.characterSheetModal.style.display === 'flex') {
      this._addConsoleMessage('system', '⚠️ Close the character sheet first');
      return;
    }

    if (this.elements.dicePopup) {
      this.elements.dicePopup.style.display = 'flex';
    }
  }

  /**
   * Hide dice popup
   * @private
   */
  _hideDicePopup() {
    if (this.elements.dicePopup) {
      this.elements.dicePopup.style.display = 'none';
    }
  }

  /**
   * Roll dice using standard notation
   * @private
   * @param {string} notation - Dice notation (e.g., "d20", "2d6+3", "d8-1")
   */
  _rollDice(notation) {
    try {
      const result = this._parseDiceNotation(notation);

      // Get character name from selector
      let characterName = 'Player';
      if (this.elements.characterSelector && this.elements.characterSelector.value) {
        const selectedToken = this.gameState.getToken(this.elements.characterSelector.value);
        if (selectedToken) {
          characterName = selectedToken.name;
        }
      } else if (this.currentToken) {
        characterName = this.currentToken.name;
      }

      // Format result message for chat
      const rollBreakdown = result.rolls.length > 1
        ? `[${result.rolls.join(', ')}]${result.modifier !== 0 ? ` ${result.modifier >= 0 ? '+' : ''}${result.modifier}` : ''}`
        : '';

      const chatMessage = `🎲 ${characterName} rolled ${notation}: ${rollBreakdown ? rollBreakdown + ' = ' : ''}${result.total}`;

      // Post to chat
      this._addConsoleMessage('action', chatMessage);

      console.log(`Dice roll: ${notation} = ${result.total}`, result);
    } catch (error) {
      console.error('Invalid dice notation:', notation, error);
      this._addConsoleMessage('system', `❌ Invalid dice notation: ${notation}`);
    }
  }

  /**
   * Parse dice notation and roll
   * @private
   * @param {string} notation - Dice notation
   * @returns {{total: number, rolls: number[], modifier: number}}
   */
  _parseDiceNotation(notation) {
    // Remove spaces
    notation = notation.toLowerCase().replace(/\s/g, '');

    // Match patterns like "d20", "2d6", "3d8+5", "d12-2"
    const match = notation.match(/^(\d*)d(\d+)([+-]\d+)?$/);

    if (!match) {
      throw new Error('Invalid dice notation');
    }

    const count = match[1] ? parseInt(match[1]) : 1;
    const sides = parseInt(match[2]);
    const modifier = match[3] ? parseInt(match[3]) : 0;

    // Validate
    if (count < 1 || count > 100) {
      throw new Error('Dice count must be between 1 and 100');
    }
    if (sides < 2 || sides > 1000) {
      throw new Error('Dice sides must be between 2 and 1000');
    }

    // Roll the dice
    const rolls = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    const rollSum = rolls.reduce((sum, roll) => sum + roll, 0);
    const total = rollSum + modifier;

    return { total, rolls, modifier };
  }

  /**
   * Add message to console
   * @private
   * @param {string} type - Message type: 'system', 'action', 'combat', 'discovery', 'npc'
   * @param {string} text - Message text
   */
  _addConsoleMessage(type, text) {
    if (!this.elements.consoleMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `console-message ${type}-message`;

    // Format based on type
    let formattedMessage;
    switch (type) {
      case 'system':
        formattedMessage = `<span class="message-sender">SYSTEM:</span> <span class="message-text">${text}</span>`;
        break;
      case 'combat':
        // Combat messages often have emoji/formatting, just display as-is
        formattedMessage = `<span class="message-text">${text}</span>`;
        break;
      case 'discovery':
        // Discovery messages often have emoji/formatting, just display as-is
        formattedMessage = `<span class="message-text">${text}</span>`;
        break;
      case 'action':
        // Action messages often have emoji/formatting, just display as-is
        formattedMessage = `<span class="message-text">${text}</span>`;
        break;
      case 'npc':
        // NPC messages already contain character name in format "Name: message"
        formattedMessage = `<span class="message-text">${text}</span>`;
        break;
      case 'player':
        formattedMessage = `<span class="message-text">${text}</span>`;
        break;
      default:
        formattedMessage = `<span class="message-text">${text}</span>`;
    }

    messageDiv.innerHTML = formattedMessage;

    // Add to console
    this.elements.consoleMessages.appendChild(messageDiv);

    // Auto-scroll to bottom
    this.elements.consoleMessages.scrollTop = this.elements.consoleMessages.scrollHeight;

    // Limit message history to last 50 messages
    const messages = this.elements.consoleMessages.children;
    if (messages.length > 50) {
      this.elements.consoleMessages.removeChild(messages[0]);
    }
  }

  /**
   * Show detailed character sheet modal
   * @private
   */
  async _showCharacterSheet() {
    if (!this.currentToken) return;

    // Fetch full character data
    const character = await this._fetchCharacterData(this.currentToken.name);

    if (!character) {
      this._addConsoleMessage('system', `Could not load character data for ${this.currentToken.name}`);
      return;
    }

    // Populate sheet
    this.elements.sheetCharacterName.textContent = character.name;

    // Profile
    this.elements.sheetProfile.innerHTML = `
      <p><span class="label">Class:</span> ${character.class || 'Unknown'}</p>
      <p><span class="label">Race:</span> ${character.race || 'Unknown'}</p>
      <p><span class="label">Level:</span> ${character.level || '?'}</p>
      <p><span class="label">Alignment:</span> ${character.alignment || 'Unknown'}</p>
      ${character.profile?.personality ? `<p><span class="label">Personality:</span> ${character.profile.personality}</p>` : ''}
      ${character.profile?.backstory ? `<p><span class="label">Backstory:</span> ${character.profile.backstory}</p>` : ''}
    `;

    // Attributes
    if (character.attributes) {
      const attrs = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      this.elements.sheetAttributes.innerHTML = attrs.map(attr => `
        <div class="attribute-box">
          <div class="attr-name">${attr.toUpperCase()}</div>
          <div class="attr-value">${character.attributes[attr] || 10}</div>
        </div>
      `).join('');
    }

    // Skills
    if (character.skills && character.skills.length > 0) {
      this.elements.sheetSkills.innerHTML = character.skills.map(skill => `
        <div class="skill-item">
          <div class="skill-name">${skill.name}: ${skill.modifier >= 0 ? '+' : ''}${skill.modifier}</div>
          ${skill.proficient ? '<span style="color: #c5a959;">✓ Proficient</span>' : ''}
        </div>
      `).join('');
    } else {
      this.elements.sheetSkills.innerHTML = '<p style="color: #8b7355;">No skills data</p>';
    }

    // Passive Traits
    if (character.passiveTraits && character.passiveTraits.length > 0) {
      this.elements.sheetTraits.innerHTML = character.passiveTraits.map(trait => `
        <div class="trait-item">
          <div class="trait-name">${trait.name}</div>
          <div class="trait-desc">${trait.summary || trait.description || ''}</div>
        </div>
      `).join('');
    } else {
      this.elements.sheetTraits.innerHTML = '<p style="color: #8b7355;">No passive traits</p>';
    }

    // Feats
    if (character.feats && character.feats.length > 0) {
      this.elements.sheetFeats.innerHTML = character.feats.map(feat => `
        <div class="feat-item">
          <div class="feat-name">${feat.name}</div>
          <div class="feat-desc">${feat.summary || feat.description || ''}</div>
        </div>
      `).join('');
    } else {
      this.elements.sheetFeats.innerHTML = '<p style="color: #8b7355;">No feats or abilities</p>';
    }

    // Don't open if dice popup is already open
    if (this.elements.dicePopup &&
        this.elements.dicePopup.style.display === 'flex') {
      this._hideDicePopup();
    }

    // Show modal
    this.elements.characterSheetModal.style.display = 'flex';
  }

  /**
   * Hide character sheet modal
   * @private
   */
  _hideCharacterSheet() {
    if (this.elements.characterSheetModal) {
      this.elements.characterSheetModal.style.display = 'none';
    }
  }

  /**
   * Fetch full character data by name
   * @private
   */
  async _fetchCharacterData(characterName) {
    try {
      // Fetch from characters.json
      const response = await fetch('/data/characters.json');
      const characters = await response.json();

      // Find matching character
      return characters.find(c => c.name === characterName);
    } catch (error) {
      console.error('Failed to fetch character data:', error);
      return null;
    }
  }

  /**
   * Public API: Manually update campaign display
   */
  updateCampaign(data) {
    this._updateCampaign(data);
  }

  /**
   * Public API: Add console message
   */
  addConsoleMessage(type, text) {
    this._addConsoleMessage(type, text);
  }
}
