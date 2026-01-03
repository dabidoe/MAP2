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

      // Console
      consoleMessages: document.getElementById('console-messages'),

      // Dice Roller
      diceResult: document.getElementById('dice-result'),
      diceCustomInput: document.getElementById('dice-custom-input'),
      diceCustomRoll: document.getElementById('dice-custom-roll')
    };

    this._init();
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
    this.gameState.on('locationChange', (location) => this._updateAtlasContext(location));

    // Console event listeners
    this.gameState.on('stateLoaded', () => this._addConsoleMessage('system', 'Game data loaded successfully'));
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

    // Dice roller handlers
    this._initDiceRoller();

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
   * Show Unit Card (floating, bottom-right)
   * @private
   */
  _showUnitCard(token) {
    if (!token || !this.elements.unitCard) return;

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
    alert(`${token.name} uses ${action.name}!\n${action.damage || action.effect}`);
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
   * Initialize dice roller
   * @private
   */
  _initDiceRoller() {
    // Quick dice buttons
    const diceButtons = document.querySelectorAll('.dice-btn[data-dice]');
    diceButtons.forEach(button => {
      button.addEventListener('click', () => {
        const diceType = button.getAttribute('data-dice');
        this._rollDice(diceType);
      });
    });

    // Custom roll button
    if (this.elements.diceCustomRoll) {
      this.elements.diceCustomRoll.addEventListener('click', () => {
        const notation = this.elements.diceCustomInput.value.trim();
        if (notation) {
          this._rollDice(notation);
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
          }
        }
      });
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

      // Display result
      if (this.elements.diceResult) {
        const resultValue = this.elements.diceResult.querySelector('.result-value');
        if (resultValue) {
          resultValue.textContent = result.total;

          // Animate the result
          this.elements.diceResult.classList.add('dice-roll-animation');
          setTimeout(() => {
            this.elements.diceResult.classList.remove('dice-roll-animation');
          }, 500);
        }
      }

      // Add to console
      const detailText = result.rolls.length > 1
        ? `${notation} = [${result.rolls.join(', ')}]${result.modifier !== 0 ? ` ${result.modifier >= 0 ? '+' : ''}${result.modifier}` : ''} = ${result.total}`
        : `${notation} = ${result.total}`;

      this._addConsoleMessage('action', `🎲 Rolled ${detailText}`);

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
        formattedMessage = `<span class="message-sender">SYSTEM:</span><span class="message-text">${text}</span>`;
        break;
      case 'combat':
        formattedMessage = `<span class="message-sender">COMBAT:</span><span class="message-text">${text}</span>`;
        break;
      case 'discovery':
        formattedMessage = `<span class="message-sender">DISCOVERY:</span><span class="message-text">${text}</span>`;
        break;
      case 'action':
        formattedMessage = `<span class="message-sender">ACTION:</span><span class="message-text">${text}</span>`;
        break;
      case 'npc':
        formattedMessage = `<span class="message-sender">NPC:</span><span class="message-text">${text}</span>`;
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
