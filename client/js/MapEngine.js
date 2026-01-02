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
        <div class="location-marker-inner"
             style="background:#c5a959; border:2px solid #000; width:16px; height:16px;
                    border-radius:50%; box-shadow: 0 0 10px rgba(0,0,0,0.5); cursor:pointer;">
        </div>
      `,
      iconSize: [16, 16]
    });

    const marker = L.marker([location.lat, location.lng], { icon })
      .bindTooltip(`<b>${location.title}</b><br>${location.description}`, {
        sticky: true,
        className: 'location-tooltip'
      })
      .addTo(this.layers.markers);

    if (onClick) {
      marker.on('click', () => onClick(location));
    }

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
