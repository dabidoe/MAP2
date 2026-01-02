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
      initiativeList: document.getElementById('initiative-list')
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

    // Close button handler
    if (this.elements.closeUnitCard) {
      this.elements.closeUnitCard.onclick = () => this._hideUnitCard();
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
   * Public API: Manually update campaign display
   */
  updateCampaign(data) {
    this._updateCampaign(data);
  }
}
