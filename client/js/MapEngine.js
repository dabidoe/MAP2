/**
 * Map Engine
 * Manages dual-layer map system (World + Tactical)
 * Handles zoom-based layer switching and camera lock
 *
 * @typedef {Object} MapConfig
 * @property {number} worldZoom - Initial world map zoom level
 * @property {number} tacticalZoomThreshold - Zoom level to switch to tactical
 * @property {Array<number>} center - Initial center [lat, lng]
 */

export class MapEngine {
  /**
   * @param {string} containerId - Map container DOM ID
   * @param {MapConfig} config - Configuration
   */
  constructor(containerId, config = {}) {
    this.containerId = containerId;
    this.config = {
      worldZoom: config.worldZoom || 13,
      tacticalZoomThreshold: config.tacticalZoomThreshold || 16,
      center: config.center || [40.2985, -74.8718], // McConkey's Ferry
      maxZoom: 19
    };

    this.map = null;
    this.layers = {
      world: null,        // Esri World Imagery
      tactical: null,     // Current tactical overlay
      markers: null       // Location/token markers
    };

    this.state = {
      mode: 'world',           // 'world' or 'tactical'
      activeLocation: null,    // Active tactical location
      cameraLocked: false,     // Camera lock for tactical view
      currentZoom: this.config.worldZoom
    };

    this.listeners = {
      onModeChange: null,
      onLocationEnter: null,
      onLocationExit: null
    };

    this._init();
  }

  /**
   * Initialize Leaflet map
   * @private
   */
  _init() {
    // Create map
    this.map = L.map(this.containerId, {
      zoomControl: true,
      maxZoom: this.config.maxZoom,
      minZoom: 10,
      fadeAnimation: true,
      zoomAnimation: true,
      preferCanvas: true // Better performance
    }).setView(this.config.center, this.config.worldZoom);

    // Apply parchment filter
    L.DomUtil.addClass(this.map.getContainer(), 'parchment-container');

    // Initialize layers
    this._initWorldLayer();
    this._initMarkerLayer();

    // Event listeners
    this.map.on('zoomend', () => this._onZoomChange());

    console.log('✅ MapEngine initialized');
  }

  /**
   * Initialize world satellite layer
   * @private
   */
  _initWorldLayer() {
    this.layers.world = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Esri',
        maxZoom: this.config.maxZoom,
        opacity: 1
      }
    ).addTo(this.map);
  }

  /**
   * Initialize marker layer group
   * @private
   */
  _initMarkerLayer() {
    this.layers.markers = L.layerGroup().addTo(this.map);
  }

  /**
   * Enter tactical view for a location
   * @param {Object} location - Location data with tacticalMapUrl
   */
  enterTacticalView(location) {
    console.log(`🎯 Entering tactical view: ${location.title || location.id}`);

    this.state.mode = 'tactical';
    this.state.activeLocation = location;

    // Clear markers (we'll use Canvas for tactical tokens)
    this.layers.markers.clearLayers();

    // Fade out world layer
    this.layers.world.setOpacity(0.2);

    // Create tactical overlay
    this._createTacticalOverlay(location);

    // Lock camera
    this.state.cameraLocked = true;
    this.map.dragging.disable();
    this.map.scrollWheelZoom.disable();

    // Notify listeners
    if (this.listeners.onLocationEnter) {
      this.listeners.onLocationEnter(location);
    }

    // Trigger mode change
    this._notifyModeChange('tactical');
  }

  /**
   * Exit tactical view, return to world map
   */
  exitTacticalView() {
    console.log('🌍 Exiting tactical view');

    this.state.mode = 'world';
    this.state.activeLocation = null;

    // Remove tactical overlay
    if (this.layers.tactical) {
      this.map.removeLayer(this.layers.tactical);
      this.layers.tactical = null;
    }

    // Restore world layer
    this.layers.world.setOpacity(1);

    // Unlock camera
    this.state.cameraLocked = false;
    this.map.dragging.enable();
    this.map.scrollWheelZoom.enable();

    // Notify listeners
    if (this.listeners.onLocationExit) {
      this.listeners.onLocationExit();
    }

    // Trigger mode change
    this._notifyModeChange('world');
  }

  /**
   * Set tactical map image (for DM variant switching)
   * @param {string} imageUrl - New tactical map URL
   */
  setTacticalMapImage(imageUrl) {
    if (!this.layers.tactical || this.state.mode !== 'tactical') {
      console.warn('Cannot change tactical map - not in tactical mode');
      return;
    }

    const currentOpacity = this.layers.tactical.options.opacity || 1;
    const bounds = this.layers.tactical.getBounds();

    // Fade out current overlay
    this.layers.tactical.setOpacity(0);

    setTimeout(() => {
      // Remove old overlay
      this.map.removeLayer(this.layers.tactical);

      // Create new overlay with same bounds
      this.layers.tactical = L.imageOverlay(
        imageUrl,
        bounds,
        {
          opacity: 0,
          interactive: false,
          className: 'tactical-overlay'
        }
      ).addTo(this.map);

      // Fade in new overlay
      setTimeout(() => {
        this.layers.tactical.setOpacity(currentOpacity);
      }, 50);

      console.log(`✨ Tactical map updated: ${imageUrl}`);
    }, 300); // Wait for fade out
  }

  /**
   * Create tactical map overlay
   * @private
   * @param {Object} location - Location with tacticalMapUrl
   */
  _createTacticalOverlay(location) {
    if (!location.tacticalMapUrl) {
      console.warn('No tactical map URL for location:', location);
      return;
    }

    // Calculate image bounds based on location
    const centerLat = location.lat;
    const centerLng = location.lng;

    // Define bounds (approximately 500m square around center)
    const latOffset = 0.0045; // ~500m in latitude
    const lngOffset = 0.006;  // ~500m in longitude

    const bounds = [
      [centerLat - latOffset, centerLng - lngOffset], // Southwest
      [centerLat + latOffset, centerLng + lngOffset]  // Northeast
    ];

    // Create image overlay
    this.layers.tactical = L.imageOverlay(
      location.tacticalMapUrl,
      bounds,
      {
        opacity: 1,
        interactive: false, // Clicks pass through to canvas
        className: 'tactical-overlay'
      }
    ).addTo(this.map);

    // Fit map to tactical bounds
    this.map.fitBounds(bounds, {
      padding: [50, 50],
      animate: true,
      duration: 0.5
    });

    // Add CSS for overlay
    const style = document.createElement('style');
    style.textContent = `
      .tactical-overlay {
        border: 3px solid #c5a959;
        box-shadow: 0 0 20px rgba(197, 169, 89, 0.5);
        transition: opacity 0.3s ease-in-out;
      }
    `;
    if (!document.getElementById('tactical-overlay-style')) {
      style.id = 'tactical-overlay-style';
      document.head.appendChild(style);
    }
  }

  /**
   * Handle zoom level changes
   * @private
   */
  _onZoomChange() {
    const newZoom = this.map.getZoom();
    this.state.currentZoom = newZoom;

    // Auto-switch to tactical on high zoom (optional feature)
    // Disabled by default - requires manual location selection
    /*
    if (newZoom >= this.config.tacticalZoomThreshold && this.state.mode === 'world') {
      // Find nearest location and enter tactical view
      // This would require location proximity check
    }
    */
  }

  /**
   * Add location marker to map
   * @param {Object} location - Location data
   * @param {Function} onClick - Click handler
   */
  addLocationMarker(location, onClick) {
    const icon = L.divIcon({
      className: 'location-marker',
      html: `
        <div class="location-portal-marker">
          <div class="portal-ring"></div>
          <div class="portal-ring-inner"></div>
          <div class="portal-center"></div>
        </div>
      `,
      iconSize: [60, 60],
      iconAnchor: [30, 30] // Center the icon
    });

    // Create tactical briefing tooltip (on hover, above all tokens)
    const tooltipContent = `
      <div class="tactical-briefing">
        <div class="briefing-header">${location.title}</div>
        <div class="briefing-description">${location.description}</div>
        <div class="briefing-hint">Click to enter tactical view</div>
      </div>
    `;

    const marker = L.marker([location.lat, location.lng], { icon })
      .bindTooltip(tooltipContent, {
        sticky: false,
        className: 'briefing-tooltip',
        offset: [0, -40],
        direction: 'top'
      })
      .addTo(this.layers.markers);

    if (onClick) {
      marker.on('click', () => onClick(location));
    }

    // Add portal marker styles
    this._injectPortalStyles();

    return marker;
  }

  /**
   * Add character token marker (world map)
   * @param {Object} token - Token data
   * @param {boolean} draggable - Whether token is draggable
   * @param {Function} onDragEnd - Drag end handler
   */
  addTokenMarker(token, draggable = false, onDragEnd = null) {
    if (!token.gps || !token.gps.lat || !token.gps.lng) {
      console.warn('Token missing GPS coordinates:', token);
      return null;
    }

    const marker = L.marker([token.gps.lat, token.gps.lng], {
      icon: L.icon({
        iconUrl: token.icon,
        iconSize: [40, 40],
        className: 'character-marker'
      }),
      draggable
    }).addTo(this.layers.markers);

    if (onDragEnd && draggable) {
      marker.on('dragend', (e) => {
        const newPos = e.target.getLatLng();
        onDragEnd(token, newPos);
      });
    }

    return marker;
  }

  /**
   * Clear all markers
   */
  clearMarkers() {
    this.layers.markers.clearLayers();
  }

  /**
   * Pan camera to location
   * @param {number} lat
   * @param {number} lng
   * @param {number} zoom
   */
  panTo(lat, lng, zoom = null) {
    if (this.state.cameraLocked) return;

    this.map.setView([lat, lng], zoom || this.state.currentZoom, {
      animate: true,
      duration: 0.5
    });
  }

  /**
   * Set view bounds
   * @param {Array} bounds - [[south, west], [north, east]]
   */
  fitBounds(bounds) {
    if (this.state.cameraLocked) return;

    this.map.fitBounds(bounds, {
      padding: [50, 50],
      animate: true
    });
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (event === 'modeChange') {
      this.listeners.onModeChange = callback;
    } else if (event === 'locationEnter') {
      this.listeners.onLocationEnter = callback;
    } else if (event === 'locationExit') {
      this.listeners.onLocationExit = callback;
    }
  }

  /**
   * Inject portal marker styles
   * @private
   */
  _injectPortalStyles() {
    if (document.getElementById('portal-marker-styles')) return;

    const style = document.createElement('style');
    style.id = 'portal-marker-styles';
    style.textContent = `
      .location-portal-marker {
        position: relative;
        width: 60px;
        height: 60px;
        cursor: pointer;
      }

      .portal-ring {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 50px;
        height: 50px;
        border: 3px solid #c5a959;
        border-radius: 50%;
        box-shadow: 0 0 15px rgba(197, 169, 89, 0.6);
        animation: portal-pulse 2s ease-in-out infinite;
      }

      .portal-ring-inner {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 35px;
        height: 35px;
        border: 2px solid rgba(197, 169, 89, 0.6);
        border-radius: 50%;
        animation: portal-pulse-inner 2s ease-in-out infinite reverse;
      }

      .portal-center {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, #c5a959, #8b7355);
        border: 2px solid #000;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(197, 169, 89, 0.8),
                    inset 0 0 5px rgba(0, 0, 0, 0.5);
      }

      .location-portal-marker:hover .portal-ring {
        width: 55px;
        height: 55px;
        box-shadow: 0 0 25px rgba(197, 169, 89, 1);
      }

      .location-portal-marker:hover .portal-center {
        background: radial-gradient(circle, #FFD700, #c5a959);
        box-shadow: 0 0 20px rgba(255, 215, 0, 1),
                    inset 0 0 5px rgba(0, 0, 0, 0.5);
      }

      @keyframes portal-pulse {
        0%, 100% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        50% {
          opacity: 0.7;
          transform: translate(-50%, -50%) scale(1.05);
        }
      }

      @keyframes portal-pulse-inner {
        0%, 100% {
          opacity: 0.8;
          transform: translate(-50%, -50%) scale(1);
        }
        50% {
          opacity: 0.5;
          transform: translate(-50%, -50%) scale(0.95);
        }
      }

      /* Tactical Briefing Tooltip Styles (above all tokens) */
      .briefing-tooltip {
        background: rgba(26, 20, 16, 0.95) !important;
        backdrop-filter: blur(10px);
        border: 2px solid #c5a959 !important;
        border-radius: 8px !important;
        padding: 0 !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8) !important;
        z-index: 6000 !important;
      }

      .tactical-briefing {
        padding: 12px 16px;
        min-width: 220px;
        font-family: 'Cinzel', serif;
      }

      .briefing-header {
        font-size: 1rem;
        font-weight: bold;
        color: #c5a959;
        letter-spacing: 1.5px;
        margin-bottom: 8px;
        text-align: center;
        border-bottom: 1px solid rgba(197, 169, 89, 0.3);
        padding-bottom: 6px;
      }

      .briefing-description {
        font-size: 0.8rem;
        color: #e2d1b3;
        line-height: 1.4;
        margin-bottom: 8px;
      }

      .briefing-hint {
        font-size: 0.7rem;
        color: #8b7355;
        font-style: italic;
        text-align: center;
        margin-top: 8px;
        padding-top: 6px;
        border-top: 1px solid rgba(197, 169, 89, 0.2);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Notify mode change listeners
   * @private
   */
  _notifyModeChange(mode) {
    if (this.listeners.onModeChange) {
      this.listeners.onModeChange(mode, this.state);
    }
  }

  /**
   * Get current map state
   * @returns {Object}
   */
  getState() {
    return {
      mode: this.state.mode,
      activeLocation: this.state.activeLocation,
      cameraLocked: this.state.cameraLocked,
      zoom: this.state.currentZoom,
      center: this.map.getCenter()
    };
  }

  /**
   * Get Leaflet map instance
   * @returns {L.Map}
   */
  getMap() {
    return this.map;
  }

  /**
   * Destroy map engine
   */
  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
