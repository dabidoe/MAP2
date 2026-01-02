/**
 * Character Model
 * Full D&D 5e character data (links to your existing character builder)
 */

import mongoose from 'mongoose';

const characterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  class: String,
  race: String,
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 20
  },
  background: String,

  // Ability Scores
  abilities: {
    str: { type: Number, default: 10 },
    dex: { type: Number, default: 10 },
    con: { type: Number, default: 10 },
    int: { type: Number, default: 10 },
    wis: { type: Number, default: 10 },
    cha: { type: Number, default: 10 }
  },

  // Combat Stats
  hp: { type: Number, default: 10 },
  hpMax: { type: Number, default: 10 },
  ac: { type: Number, default: 10 },
  initiative: { type: Number, default: 0 },
  speed: { type: Number, default: 30 },

  // Skills
  skills: [{
    name: String,
    proficient: Boolean,
    modifier: Number
  }],

  // Saving Throws
  savingThrows: {
    str: { proficient: Boolean, modifier: Number },
    dex: { proficient: Boolean, modifier: Number },
    con: { proficient: Boolean, modifier: Number },
    int: { proficient: Boolean, modifier: Number },
    wis: { proficient: Boolean, modifier: Number },
    cha: { proficient: Boolean, modifier: Number }
  },

  // Features & Traits
  features: [{
    name: String,
    description: String,
    type: { type: String, enum: ['Racial', 'Class', 'Feat', 'Item'] }
  }],

  // Spells
  spellcasting: {
    spellcastingAbility: String,
    spellSaveDC: Number,
    spellAttackBonus: Number,
    spellSlots: {
      1: { total: Number, used: Number },
      2: { total: Number, used: Number },
      3: { total: Number, used: Number },
      4: { total: Number, used: Number },
      5: { total: Number, used: Number },
      6: { total: Number, used: Number },
      7: { total: Number, used: Number },
      8: { total: Number, used: Number },
      9: { total: Number, used: Number }
    },
    spellsKnown: [{
      name: String,
      level: Number,
      school: String,
      castingTime: String,
      range: String,
      components: String,
      duration: String,
      description: String
    }]
  },

  // Equipment
  equipment: {
    weapons: [{
      name: String,
      attackBonus: Number,
      damage: String,
      damageType: String,
      properties: [String]
    }],
    armor: {
      name: String,
      ac: Number,
      type: String
    },
    items: [{
      name: String,
      quantity: Number,
      description: String,
      weight: Number
    }]
  },

  // Personality
  personality: {
    traits: [String],
    ideals: [String],
    bonds: [String],
    flaws: [String]
  },

  // Visual
  icon: {
    type: String,
    default: 'https://statsheet-cdn.b-cdn.net/images/placeholder.png'
  },
  portrait: String,

  // Metadata
  playerName: String,
  notes: String
}, {
  timestamps: true
});

// Indexes
characterSchema.index({ name: 1, level: 1 });

// Virtual for ability modifiers
characterSchema.virtual('abilityModifiers').get(function() {
  const calculateModifier = (score) => Math.floor((score - 10) / 2);
  return {
    str: calculateModifier(this.abilities.str),
    dex: calculateModifier(this.abilities.dex),
    con: calculateModifier(this.abilities.con),
    int: calculateModifier(this.abilities.int),
    wis: calculateModifier(this.abilities.wis),
    cha: calculateModifier(this.abilities.cha)
  };
});

// Methods
characterSchema.methods.rollInitiative = function() {
  const dexMod = Math.floor((this.abilities.dex - 10) / 2);
  const d20 = Math.floor(Math.random() * 20) + 1;
  return d20 + dexMod + this.initiative;
};

characterSchema.methods.takeDamage = function(amount) {
  this.hp = Math.max(0, this.hp - amount);
  return this.hp;
};

characterSchema.methods.heal = function(amount) {
  this.hp = Math.min(this.hpMax, this.hp + amount);
  return this.hp;
};

const Character = mongoose.model('Character', characterSchema);

export default Character;
