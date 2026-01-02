/**
 * Location Model
 * Represents strategic locations on the campaign map
 */

import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },

  // GPS coordinates for world map
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
  },

  // Discovery radius (meters)
  radius: {
    type: Number,
    default: 50,
    min: 0
  },

  // Tactical map URL
  tacticalMapUrl: {
    type: String,
    required: true
  },

  // Encounter triggers
  encounters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Encounter'
  }],

  // Location type
  locationType: {
    type: String,
    enum: ['Camp', 'Barracks', 'Outpost', 'Ferry', 'Town', 'Battlefield'],
    default: 'Battlefield'
  },

  // Discovery state
  discovered: {
    type: Boolean,
    default: false
  },

  // Strategic value
  strategicValue: {
    type: Number,
    min: 0,
    max: 10,
    default: 5
  }
}, {
  timestamps: true
});

// Indexes
locationSchema.index({ lat: 1, lng: 1 });
locationSchema.index({ locationType: 1 });

// Methods
locationSchema.methods.calculateDistance = function(lat, lng) {
  // Haversine formula for distance in meters
  const R = 6371e3; // Earth radius in meters
  const φ1 = this.lat * Math.PI / 180;
  const φ2 = lat * Math.PI / 180;
  const Δφ = (lat - this.lat) * Math.PI / 180;
  const Δλ = (lng - this.lng) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

locationSchema.methods.isWithinRadius = function(lat, lng) {
  const distance = this.calculateDistance(lat, lng);
  return distance <= this.radius;
};

// Statics
locationSchema.statics.findNearby = function(lat, lng, maxDistance = 1000) {
  return this.find({}).then(locations => {
    return locations.filter(loc => loc.calculateDistance(lat, lng) <= maxDistance);
  });
};

const Location = mongoose.model('Location', locationSchema);

export default Location;
