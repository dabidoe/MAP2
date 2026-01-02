/**
 * Party Logistics
 * Tracks party resources (rations, morale, supplies) and environmental effects
 *
 * @typedef {Object} LogisticsState
 * @property {number} rations - Remaining rations
 * @property {number} morale - Morale percentage (0-100)
 * @property {string} weather - Current weather condition
 * @property {number} exhaustion - Exhaustion level (0-5)
 * @property {Object} supplies - Other supplies
 */

export class PartyLogistics {
  /**
   * @param {Object} config - Initial configuration
   */
  constructor(config = {}) {
    this.rations = config.rations || 10; // Days worth
    this.morale = config.morale || 30; // Low morale (Valley Forge era)
    this.weather = config.weather || 'Violent Sleet & Snow';
    this.exhaustion = config.exhaustion || 0; // 0-5 (D&D 5e exhaustion)

    this.supplies = {
      ammunition: config.ammunition || 50,
      medicinalSupplies: config.medicinalSupplies || 20,
      firewood: config.firewood || 5
    };

    this.partySize = config.partySize || 2400; // Continental Army at crossing
    this.lastRationConsumption = 0; // Hours since last consumption
    this.effects = []; // Environmental effects
  }

  /**
   * Consume rations (called every 4 hours of travel)
   * @param {number} hours - Hours of travel
   * @returns {boolean} True if rations available, false if depleted
   */
  consumeRations(hours = 4) {
    this.lastRationConsumption += hours;

    if (this.lastRationConsumption >= 4) {
      const rationDays = Math.floor(this.lastRationConsumption / 24);
      this.rations = Math.max(0, this.rations - rationDays);
      this.lastRationConsumption = this.lastRationConsumption % 24;

      // Low rations affect morale
      if (this.rations <= 2) {
        this.adjustMorale(-5, 'Low rations');
      }

      return this.rations > 0;
    }

    return true;
  }

  /**
   * Adjust morale
   * @param {number} delta - Positive or negative change
   * @param {string} reason - Reason for morale change
   */
  adjustMorale(delta, reason = '') {
    this.morale = Math.max(0, Math.min(100, this.morale + delta));

    console.log(`Morale ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}: ${reason}`);

    // Trigger events based on morale thresholds
    if (this.morale <= 10) {
      this.effects.push('Desertions Likely');
    } else if (this.morale >= 80) {
      this.effects = this.effects.filter(e => e !== 'Desertions Likely');
    }

    return this.morale;
  }

  /**
   * Apply weather effects
   * @param {string} weather - Weather condition
   */
  setWeather(weather) {
    this.weather = weather;

    // Weather affects morale and exhaustion
    const weatherEffects = {
      'Violent Sleet & Snow': { morale: -2, exhaustionRisk: 0.3 },
      'Heavy Snow': { morale: -1, exhaustionRisk: 0.2 },
      'Clear': { morale: +1, exhaustionRisk: 0 },
      'Rain': { morale: -1, exhaustionRisk: 0.1 }
    };

    const effect = weatherEffects[weather] || { morale: 0, exhaustionRisk: 0 };

    this.adjustMorale(effect.morale, `Weather: ${weather}`);

    // Random exhaustion check
    if (Math.random() < effect.exhaustionRisk) {
      this.increaseExhaustion();
    }
  }

  /**
   * Increase exhaustion level
   */
  increaseExhaustion() {
    if (this.exhaustion < 5) {
      this.exhaustion++;
      this.adjustMorale(-5, 'Exhaustion');

      // Apply D&D 5e exhaustion effects
      const exhaustionEffects = [
        '',
        'Disadvantage on ability checks',
        'Speed halved',
        'Disadvantage on attack rolls and saving throws',
        'Hit point maximum halved',
        'Speed reduced to 0',
        'Death'
      ];

      if (this.exhaustion <= 6) {
        this.effects.push(exhaustionEffects[this.exhaustion]);
      }
    }
  }

  /**
   * Rest (reduce exhaustion, restore morale)
   * @param {string} restType - 'short' or 'long'
   */
  rest(restType = 'short') {
    if (restType === 'long') {
      // Long rest: 8 hours
      if (this.exhaustion > 0) {
        this.exhaustion--;
        this.effects = []; // Clear exhaustion effects
      }
      this.adjustMorale(+10, 'Long rest');
      this.consumeRations(8);
    } else {
      // Short rest: 1 hour
      this.adjustMorale(+2, 'Short rest');
    }
  }

  /**
   * Victory in battle
   * @param {string} significance - 'minor' | 'major' | 'decisive'
   */
  victory(significance = 'minor') {
    const moraleBonus = {
      minor: 5,
      major: 15,
      decisive: 30
    };

    this.adjustMorale(moraleBonus[significance] || 5, `${significance} victory`);
  }

  /**
   * Defeat in battle
   * @param {string} severity - 'minor' | 'major' | 'devastating'
   */
  defeat(severity = 'minor') {
    const moralePenalty = {
      minor: -5,
      major: -15,
      devastating: -30
    };

    this.adjustMorale(moralePenalty[severity] || -5, `${severity} defeat`);
  }

  /**
   * Get current state
   * @returns {LogisticsState}
   */
  getState() {
    return {
      rations: this.rations,
      morale: this.morale,
      weather: this.weather,
      exhaustion: this.exhaustion,
      supplies: { ...this.supplies },
      effects: [...this.effects],
      partySize: this.partySize
    };
  }

  /**
   * Get morale level description
   * @returns {string}
   */
  getMoraleLevel() {
    if (this.morale >= 80) return 'High';
    if (this.morale >= 50) return 'Steady';
    if (this.morale >= 30) return 'Low';
    return 'Critical';
  }

  /**
   * Check if party can continue (not too exhausted/demoralized)
   * @returns {boolean}
   */
  canContinue() {
    return this.exhaustion < 5 && this.morale > 5 && this.rations > 0;
  }

  /**
   * Serialize for saving
   * @returns {Object}
   */
  toJSON() {
    return this.getState();
  }

  /**
   * Load from saved state
   * @param {Object} state
   */
  static fromJSON(state) {
    return new PartyLogistics(state);
  }
}

// Export singleton instance
export const partyLogistics = new PartyLogistics({
  rations: 3, // Low supplies (historically accurate)
  morale: 30, // Low morale before Trenton
  weather: 'Violent Sleet & Snow',
  exhaustion: 1, // Already tired from march
  partySize: 2400
});
