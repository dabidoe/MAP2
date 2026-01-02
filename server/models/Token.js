/**
 * Token Model
 * Represents a character token on the map (world or tactical)
 */

import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  tokenId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  side: {
    type: String,
    enum: ['Continental', 'Hessian', 'Neutral'],
    required: true
  },
  locationId: {
    type: String,
    required: true,
    index: true
  },

  // GPS coordinates for world map
  gps: {
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },

  // Grid coordinates for tactical map (percentage-based)
  grid: {
    posX: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    posY: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    }
  },

  // Combat statistics
  stats: {
    hp: {
      type: Number,
      required: true,
      min: 0
    },
    hpMax: {
      type: Number,
      required: true,
      min: 1
    },
    ac: {
      type: Number,
      required: true,
      min: 0
    },
    init: {
      type: Number,
      default: 0
    }
  },

  // Visual representation
  icon: {
    type: String,
    required: true,
    default: 'https://statsheet-cdn.b-cdn.net/images/placeholder.png'
  },

  // Actions available to this token
  actions: [{
    name: String,
    type: {
      type: String,
      enum: ['Attack', 'Ability', 'Spell', 'Item']
    },
    is_bonus: {
      type: Boolean,
      default: false
    },
    bonus: String,
    damage: String
  }],

  // Status effects
  conditions: [{
    type: String,
    enum: ['Prone', 'Stunned', 'Frightened', 'Grappled', 'Restrained', 'Paralyzed']
  }],

  // Reference to full character data (if exists)
  characterRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Character'
  }
}, {
  timestamps: true
});

// Indexes for performance
tokenSchema.index({ locationId: 1, side: 1 });
tokenSchema.index({ 'gps.lat': 1, 'gps.lng': 1 });

// Methods
tokenSchema.methods.takeDamage = function(amount) {
  this.stats.hp = Math.max(0, this.stats.hp - amount);
  return this.stats.hp;
};

tokenSchema.methods.heal = function(amount) {
  this.stats.hp = Math.min(this.stats.hpMax, this.stats.hp + amount);
  return this.stats.hp;
};

tokenSchema.methods.isDead = function() {
  return this.stats.hp <= 0;
};

// Statics
tokenSchema.statics.findByLocation = function(locationId) {
  return this.find({ locationId });
};

tokenSchema.statics.findBySide = function(side) {
  return this.find({ side });
};

const Token = mongoose.model('Token', tokenSchema);

export default Token;
