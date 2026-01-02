/**
 * Encounter Model
 * Represents combat encounters (e.g., Winter Ambush)
 */

import mongoose from 'mongoose';

const encounterSchema = new mongoose.Schema({
  encounterId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,

  // Trigger configuration
  trigger: {
    type: {
      type: String,
      enum: ['Geography', 'Time', 'Event', 'Manual'],
      default: 'Manual'
    },
    // For geography triggers
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location'
    },
    gps: {
      lat: Number,
      lng: Number,
      radius: Number // trigger radius in meters
    },
    // For time triggers
    gameTime: String,
    // For event triggers
    eventName: String
  },

  // Encounter configuration
  difficulty: {
    type: String,
    enum: ['Trivial', 'Easy', 'Medium', 'Hard', 'Deadly'],
    default: 'Medium'
  },

  // Combatants to spawn
  enemies: [{
    tokenId: String,
    name: String,
    side: String,
    count: { type: Number, default: 1 },
    spawnPosition: {
      // Tactical grid position
      posX: Number,
      posY: Number
    }
  }],

  // Multi-act structure (e.g., Act 1: Ambush, Act 2: Reinforcements)
  acts: [{
    actNumber: Number,
    name: String,
    trigger: {
      type: {
        type: String,
        enum: ['Round', 'HP', 'EnemyCount', 'Manual']
      },
      condition: String // e.g., "Round 2", "50% HP", "All enemies dead"
    },
    spawnTokens: [{
      tokenId: String,
      name: String,
      side: String,
      posX: Number,
      posY: Number
    }],
    narrative: String // Text to display when act triggers
  }],

  // Environment effects
  environment: {
    weather: String,
    terrain: {
      type: String,
      enum: ['Open', 'Forest', 'Urban', 'River', 'Mountain']
    },
    visibility: {
      type: String,
      enum: ['Clear', 'Dim', 'Dark', 'Fog']
    },
    effects: [String] // e.g., "Difficult Terrain", "Heavy Snow"
  },

  // Rewards
  rewards: {
    xp: Number,
    gold: Number,
    items: [String],
    storyProgress: String
  },

  // State tracking
  state: {
    active: {
      type: Boolean,
      default: false
    },
    currentAct: {
      type: Number,
      default: 1
    },
    currentRound: {
      type: Number,
      default: 0
    },
    initiative: [{
      tokenId: String,
      name: String,
      roll: Number,
      hasActed: Boolean
    }],
    completedActs: [Number]
  }
}, {
  timestamps: true
});

// Indexes
encounterSchema.index({ 'trigger.type': 1 });
encounterSchema.index({ 'state.active': 1 });

// Methods
encounterSchema.methods.start = function() {
  this.state.active = true;
  this.state.currentRound = 1;
  this.state.currentAct = 1;
  return this.save();
};

encounterSchema.methods.end = function() {
  this.state.active = false;
  return this.save();
};

encounterSchema.methods.nextRound = function() {
  this.state.currentRound += 1;
  // Reset hasActed for all combatants
  this.state.initiative.forEach(init => init.hasActed = false);
  return this.save();
};

encounterSchema.methods.triggerAct = function(actNumber) {
  const act = this.acts.find(a => a.actNumber === actNumber);
  if (act) {
    this.state.currentAct = actNumber;
    this.state.completedActs.push(actNumber - 1);
    return act;
  }
  return null;
};

encounterSchema.methods.addToInitiative = function(tokenId, name, roll) {
  this.state.initiative.push({
    tokenId,
    name,
    roll,
    hasActed: false
  });
  // Sort by roll (descending)
  this.state.initiative.sort((a, b) => b.roll - a.roll);
  return this.save();
};

encounterSchema.methods.checkActTriggers = function() {
  const triggeredActs = [];

  this.acts.forEach(act => {
    if (this.state.completedActs.includes(act.actNumber)) return;

    const { type, condition } = act.trigger;
    let triggered = false;

    switch(type) {
      case 'Round':
        const targetRound = parseInt(condition.match(/\d+/)?.[0] || '0');
        triggered = this.state.currentRound >= targetRound;
        break;
      case 'Manual':
        // Requires explicit trigger
        break;
      // Add more trigger types as needed
    }

    if (triggered) {
      triggeredActs.push(act);
    }
  });

  return triggeredActs;
};

// Statics
encounterSchema.statics.findActive = function() {
  return this.findOne({ 'state.active': true });
};

encounterSchema.statics.findByLocation = function(locationId) {
  return this.find({ 'trigger.location': locationId });
};

const Encounter = mongoose.model('Encounter', encounterSchema);

export default Encounter;
