/**
 * Command Dashboard
 * Modular sidebar UI with contextual panels
 *
 * Module A: Campaign State (Date, Time, Weather, Morale)
 * Module B: Selected Token Stats
 * Module C: Combat Tracker (Initiative)
 */

export class CommandDashboard {
  /**
   * @param {GameState} gameState - Game state instance
   */
  constructor(gameState) {
    this.gameState = gameState;

    // DOM elements
    this.elements = {
      date: document.getElementById('campaign-date'),
      time: document.getElementById('campaign-time'),
      weather: document.getElementById('campaign-weather'),
      moraleFill: document.getElementById('morale-fill'),

      tokenInfo: document.getElementById('token-info'),
      tokenStats: document.getElementById('token-stats'),

      combatTracker: document.getElementById('combat-tracker'),
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
    this.gameState.on('tokenSelect', (token) => this._showTokenInfo(token));
    this.gameState.on('encounterStart', () => this._showCombat());
    this.gameState.on('encounterEnd', () => this._hideCombat());
    this.gameState.on('initiativeUpdate', (init) => this._updateInitiative(init));

    // Initial render
    this._updateCampaign(this.gameState.getState().campaign);

    console.log('✅ CommandDashboard initialized');
  }

  /**
   * Update Module A: Campaign State
   * @private
   */
  _updateCampaign(campaign) {
    if (this.elements.date) {
      this.elements.date.textContent = `📅 ${campaign.date}`;
    }

    if (this.elements.time) {
      this.elements.time.textContent = `⏰ ${campaign.time}`;
    }

    if (this.elements.weather) {
      this.elements.weather.textContent = `❄️ ${campaign.weather}`;
    }

    if (this.elements.moraleFill && campaign.morale !== undefined) {
      this.elements.moraleFill.style.width = `${campaign.morale}%`;

      // Color based on morale level
      if (campaign.morale >= 70) {
        this.elements.moraleFill.style.background = '#4CAF50'; // Green
      } else if (campaign.morale >= 40) {
        this.elements.moraleFill.style.background = '#FFA500'; // Orange
      } else {
        this.elements.moraleFill.style.background = '#f44336'; // Red
      }
    }
  }

  /**
   * Show Module B: Token Info
   * @private
   */
  _showTokenInfo(token) {
    if (!token) {
      this.elements.tokenInfo.style.display = 'none';
      return;
    }

    this.elements.tokenInfo.style.display = 'block';

    const stats = token.stats || {};
    const hpPercent = stats.hpMax ? Math.round((stats.hp / stats.hpMax) * 100) : 0;

    this.elements.tokenStats.innerHTML = `
      <div class="token-card">
        <div class="token-header">
          <img src="${token.icon}" class="token-portrait" />
          <div class="token-header-text">
            <div class="token-name">${token.name}</div>
            <div class="token-side" style="color: ${token.side === 'Continental' ? '#4CAF50' : '#f44336'}">
              ${token.side}
            </div>
          </div>
        </div>

        <div class="token-stats-grid">
          <div class="stat-box">
            <label>HP</label>
            <div class="stat-value">${stats.hp || 0}/${stats.hpMax || 0}</div>
            <div class="hp-bar-small">
              <div class="hp-fill-small" style="width: ${hpPercent}%; background: ${hpPercent > 50 ? '#4CAF50' : hpPercent > 25 ? '#FFA500' : '#f44336'}"></div>
            </div>
          </div>

          <div class="stat-box">
            <label>AC</label>
            <div class="stat-value">${stats.ac || 10}</div>
          </div>

          <div class="stat-box">
            <label>INIT</label>
            <div class="stat-value">${stats.init >= 0 ? '+' : ''}${stats.init || 0}</div>
          </div>
        </div>

        ${this._renderActions(token.actions || [])}
      </div>
    `;

    // Add inline styles
    this._injectTokenCardStyles();
  }

  /**
   * Render token actions
   * @private
   */
  _renderActions(actions) {
    if (!actions || actions.length === 0) return '';

    return `
      <div class="token-actions">
        <label class="actions-label">ACTIONS</label>
        ${actions.map(action => `
          <div class="action-item">
            <div class="action-name">${action.name}</div>
            <div class="action-details">
              ${action.bonus ? `<span class="action-bonus">${action.bonus}</span>` : ''}
              ${action.damage ? `<span class="action-damage">${action.damage}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Show Module C: Combat Tracker
   * @private
   */
  _showCombat() {
    this.elements.combatTracker.style.display = 'block';
  }

  /**
   * Hide Module C: Combat Tracker
   * @private
   */
  _hideCombat() {
    this.elements.combatTracker.style.display = 'none';
  }

  /**
   * Update initiative list
   * @private
   */
  _updateInitiative(initiative) {
    if (!initiative || initiative.length === 0) {
      this.elements.initiativeList.innerHTML = '<p style="padding: 10px; color: #888;">No combatants</p>';
      return;
    }

    this.elements.initiativeList.innerHTML = initiative.map((combatant, index) => `
      <div class="initiative-row ${combatant.hasActed ? 'acted' : ''} ${index === 0 ? 'active-turn' : ''}">
        <span class="init-roll">${combatant.roll}</span>
        <span class="init-name">${combatant.name}</span>
        ${index === 0 ? '<span class="turn-indicator">◀</span>' : ''}
      </div>
    `).join('');

    this._injectInitiativeStyles();
  }

  /**
   * Update morale
   * @param {number} morale - 0-100
   */
  setMorale(morale) {
    this.gameState.updateCampaign({ morale });
  }

  /**
   * Update time
   * @param {string} time - HH:mm format
   */
  setTime(time) {
    this.gameState.updateCampaign({ time });
  }

  /**
   * Inject token card styles
   * @private
   */
  _injectTokenCardStyles() {
    if (document.getElementById('token-card-styles')) return;

    const style = document.createElement('style');
    style.id = 'token-card-styles';
    style.textContent = `
      .token-card {
        padding: 10px;
        background: #261f18;
        border: 1px solid #3d3024;
        border-radius: 4px;
      }

      .token-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }

      .token-portrait {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: 2px solid #c5a959;
      }

      .token-header-text {
        flex: 1;
      }

      .token-name {
        font-weight: bold;
        color: #e2d1b3;
        font-size: 1rem;
      }

      .token-side {
        font-size: 0.75rem;
        margin-top: 2px;
      }

      .token-stats-grid {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr;
        gap: 8px;
        margin-bottom: 10px;
      }

      .stat-box {
        background: #1a1410;
        padding: 8px;
        border-radius: 3px;
        text-align: center;
      }

      .stat-box label {
        font-size: 0.65rem;
        color: #a09580;
        display: block;
        margin-bottom: 4px;
      }

      .stat-value {
        font-size: 1rem;
        font-weight: bold;
        color: #e2d1b3;
      }

      .hp-bar-small {
        height: 4px;
        background: #000;
        border: 1px solid #3d3024;
        margin-top: 4px;
        border-radius: 2px;
        overflow: hidden;
      }

      .hp-fill-small {
        height: 100%;
        transition: width 0.3s;
      }

      .token-actions {
        margin-top: 10px;
      }

      .actions-label {
        font-size: 0.65rem;
        color: #c5a959;
        font-weight: bold;
        display: block;
        margin-bottom: 6px;
      }

      .action-item {
        background: #1a1410;
        padding: 6px 8px;
        margin-bottom: 4px;
        border-radius: 3px;
        border-left: 3px solid #c5a959;
      }

      .action-name {
        font-size: 0.85rem;
        color: #e2d1b3;
        font-weight: bold;
      }

      .action-details {
        font-size: 0.75rem;
        color: #a09580;
        margin-top: 2px;
      }

      .action-bonus {
        margin-right: 8px;
      }

      .sidebar-module {
        padding: 10px 0;
        border-top: 1px solid #3d3024;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Inject initiative styles
   * @private
   */
  _injectInitiativeStyles() {
    if (document.getElementById('initiative-styles')) return;

    const style = document.createElement('style');
    style.id = 'initiative-styles';
    style.textContent = `
      .initiative-row {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        margin-bottom: 4px;
        background: #261f18;
        border: 1px solid #3d3024;
        border-radius: 3px;
        transition: all 0.2s;
      }

      .initiative-row.active-turn {
        background: #3a2f1f;
        border-color: #c5a959;
        box-shadow: 0 0 10px rgba(197, 169, 89, 0.3);
      }

      .initiative-row.acted {
        opacity: 0.5;
      }

      .init-roll {
        font-weight: bold;
        color: #c5a959;
        min-width: 30px;
        font-size: 1.1rem;
      }

      .init-name {
        flex: 1;
        color: #e2d1b3;
        margin-left: 10px;
      }

      .turn-indicator {
        color: #c5a959;
        font-size: 1.2rem;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Destroy dashboard
   */
  destroy() {
    // Remove event listeners
    // (GameState handles this internally)
  }
}
