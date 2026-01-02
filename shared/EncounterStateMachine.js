/**
 * Encounter State Machine
 * Manages encounter states, act transitions, and geography triggers
 *
 * @typedef {Object} EncounterState
 * @property {string} status - 'idle' | 'triggered' | 'active' | 'completed'
 * @property {number} currentAct - Current act number
 * @property {number} round - Current combat round
 * @property {Array} spawnedTokens - Tokens spawned during encounter
 */

export class EncounterStateMachine {
  /**
   * @param {Object} encounterData - Encounter configuration
   */
  constructor(encounterData) {
    this.id = encounterData.encounterId || 'encounter_' + Date.now();
    this.name = encounterData.name || 'Unknown Encounter';
    this.description = encounterData.description || '';

    this.trigger = encounterData.trigger || { type: 'Manual' };
    this.acts = encounterData.acts || [];
    this.enemies = encounterData.enemies || [];
    this.environment = encounterData.environment || {};

    // State
    this.state = {
      status: 'idle', // idle, triggered, active, completed
      currentAct: 0,
      round: 0,
      spawnedTokens: [],
      initiative: [],
      completedActs: [],
      triggeredActs: []
    };

    this.onStateChange = null; // Callback for state changes
    this.onActTrigger = null; // Callback for act triggers
  }

  /**
   * Check if encounter should trigger based on geography
   * @param {Object} partyPosition - {lat, lng}
   * @returns {boolean}
   */
  checkGeographyTrigger(partyPosition) {
    if (this.trigger.type !== 'Geography') return false;
    if (this.state.status !== 'idle') return false;

    const { lat, lng, radius } = this.trigger.gps;
    const distance = this._calculateDistance(partyPosition, { lat, lng });

    if (distance <= radius) {
      this.trigger_encounter();
      return true;
    }

    return false;
  }

  /**
   * Manually trigger encounter
   */
  trigger_encounter() {
    if (this.state.status !== 'idle') return;

    console.log(`🎭 Encounter Triggered: ${this.name}`);
    this.state.status = 'triggered';
    this._notifyStateChange('triggered');
  }

  /**
   * Start the encounter (enter combat)
   */
  start() {
    if (this.state.status === 'completed') {
      console.warn('Cannot start completed encounter');
      return;
    }

    console.log(`⚔️  Encounter Started: ${this.name}`);
    this.state.status = 'active';
    this.state.currentAct = 1;
    this.state.round = 1;

    // Spawn Act 1 enemies
    this._spawnEnemies(this.enemies);

    // Trigger Act 1 if defined
    if (this.acts.length > 0) {
      this._triggerAct(1);
    }

    this._notifyStateChange('started');
  }

  /**
   * Advance to next round
   */
  nextRound() {
    if (this.state.status !== 'active') return;

    this.state.round++;
    console.log(`Round ${this.state.round} begins`);

    // Reset initiative hasActed flags
    this.state.initiative.forEach(init => init.hasActed = false);

    // Check for act triggers
    this._checkActTriggers();

    this._notifyStateChange('round_advance');
  }

  /**
   * Freeze world movement (called when encounter triggers)
   */
  freezeMovement() {
    console.log('🧊 World movement frozen');
    // This will be handled by the map engine
    return { frozen: true };
  }

  /**
   * Unfreeze world movement
   */
  unfreezeMovement() {
    console.log('✅ World movement restored');
    return { frozen: false };
  }

  /**
   * Spawn tokens for this encounter
   * @param {Array} enemyList - List of enemy definitions
   * @private
   */
  _spawnEnemies(enemyList) {
    const spawned = [];

    enemyList.forEach(enemy => {
      const count = enemy.count || 1;

      for (let i = 0; i < count; i++) {
        const token = {
          tokenId: `${enemy.tokenId}_${i + 1}`,
          name: count > 1 ? `${enemy.name} ${i + 1}` : enemy.name,
          side: enemy.side,
          grid: {
            posX: enemy.spawnPosition.posX + (i * 5), // Offset multiple spawns
            posY: enemy.spawnPosition.posY
          },
          spawned: true
        };

        spawned.push(token);
      }
    });

    this.state.spawnedTokens = [...this.state.spawnedTokens, ...spawned];

    console.log(`Spawned ${spawned.length} enemies`);
    return spawned;
  }

  /**
   * Trigger specific act
   * @param {number} actNumber
   * @private
   */
  _triggerAct(actNumber) {
    const act = this.acts.find(a => a.actNumber === actNumber);
    if (!act) return;

    if (this.state.triggeredActs.includes(actNumber)) {
      console.warn(`Act ${actNumber} already triggered`);
      return;
    }

    console.log(`🎬 Act ${actNumber}: ${act.name}`);
    this.state.currentAct = actNumber;
    this.state.triggeredActs.push(actNumber);

    // Spawn act-specific tokens
    if (act.spawnTokens && act.spawnTokens.length > 0) {
      this._spawnEnemies(act.spawnTokens);
    }

    // Display narrative
    if (act.narrative) {
      console.log(`📖 ${act.narrative}`);
    }

    if (this.onActTrigger) {
      this.onActTrigger(act);
    }
  }

  /**
   * Check if any acts should trigger
   * @private
   */
  _checkActTriggers() {
    this.acts.forEach(act => {
      if (this.state.triggeredActs.includes(act.actNumber)) return;

      const { type, condition } = act.trigger;
      let shouldTrigger = false;

      switch (type) {
        case 'Round':
          const targetRound = parseInt(condition.match(/\d+/)?.[0] || '999');
          shouldTrigger = this.state.round >= targetRound;
          break;

        case 'EnemyCount':
          const aliveEnemies = this.state.spawnedTokens.filter(t => !t.dead).length;
          const requiredCount = parseInt(condition.match(/\d+/)?.[0] || '0');
          shouldTrigger = aliveEnemies <= requiredCount;
          break;

        case 'HP':
          // TODO: Implement HP-based triggers
          break;

        case 'Manual':
          // Requires explicit call
          break;
      }

      if (shouldTrigger) {
        this._triggerAct(act.actNumber);
      }
    });
  }

  /**
   * Add combatant to initiative
   * @param {string} tokenId
   * @param {string} name
   * @param {number} roll
   */
  addToInitiative(tokenId, name, roll) {
    this.state.initiative.push({
      tokenId,
      name,
      roll,
      hasActed: false
    });

    // Sort by roll (descending)
    this.state.initiative.sort((a, b) => b.roll - a.roll);
  }

  /**
   * Mark combatant as having acted
   * @param {string} tokenId
   */
  markActed(tokenId) {
    const combatant = this.state.initiative.find(c => c.tokenId === tokenId);
    if (combatant) {
      combatant.hasActed = true;
    }

    // Check if round is complete
    if (this.state.initiative.every(c => c.hasActed)) {
      console.log('All combatants have acted - round complete');
    }
  }

  /**
   * End the encounter
   * @param {string} outcome - 'victory' | 'defeat' | 'escape'
   */
  end(outcome = 'victory') {
    console.log(`Encounter ended: ${outcome}`);
    this.state.status = 'completed';
    this.state.completedActs = [...this.state.triggeredActs];

    this.unfreezeMovement();
    this._notifyStateChange('completed', { outcome });
  }

  /**
   * Get current state
   * @returns {EncounterState}
   */
  getState() {
    return {
      id: this.id,
      name: this.name,
      ...this.state
    };
  }

  /**
   * Calculate distance between two GPS points
   * @private
   */
  _calculateDistance(from, to) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = from.lat * Math.PI / 180;
    const φ2 = to.lat * Math.PI / 180;
    const Δφ = (to.lat - from.lat) * Math.PI / 180;
    const Δλ = (to.lng - from.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  /**
   * Notify state change listeners
   * @private
   */
  _notifyStateChange(event, data = {}) {
    if (this.onStateChange) {
      this.onStateChange(event, this.getState(), data);
    }
  }
}

/**
 * Winter Ambush Encounter (Pre-configured)
 */
export const winterAmbushEncounter = new EncounterStateMachine({
  encounterId: 'winter_ambush_001',
  name: 'The Winter Ambush',
  description: 'A Hessian picket line has spotted the Continental forces.',

  trigger: {
    type: 'Geography',
    gps: {
      lat: 40.2520,
      lng: -74.8010,
      radius: 100 // meters
    }
  },

  enemies: [
    {
      tokenId: 'sergeant_crowe',
      name: 'Sergeant Thaddeus Crowe',
      side: 'Hessian',
      count: 1,
      spawnPosition: { posX: 50, posY: 30 }
    },
    {
      tokenId: 'loyalist_militia',
      name: 'Loyalist Militiaman',
      side: 'Hessian',
      count: 3,
      spawnPosition: { posX: 40, posY: 40 }
    }
  ],

  acts: [
    {
      actNumber: 1,
      name: 'The Ambush',
      trigger: { type: 'Manual' },
      narrative: 'Musket fire cracks through the frozen air! You are under attack!'
    },
    {
      actNumber: 2,
      name: 'The Hammer Drops',
      trigger: { type: 'Round', condition: 'Round 3' },
      spawnTokens: [
        {
          tokenId: 'hessian_reinforcement',
          name: 'Hessian Grenadier',
          side: 'Hessian',
          posX: 70,
          posY: 20
        },
        {
          tokenId: 'hessian_jager',
          name: 'Hessian Jäger',
          side: 'Hessian',
          posX: 75,
          posY: 25
        }
      ],
      narrative: 'Reinforcements arrive from the treeline! Two more enemies join the fray!'
    }
  ],

  environment: {
    weather: 'Violent Sleet & Snow',
    terrain: 'Forest',
    visibility: 'Fog',
    effects: ['Difficult Terrain', 'Heavy Snow']
  }
});
