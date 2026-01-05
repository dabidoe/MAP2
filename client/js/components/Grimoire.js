/**
 * Grimoire - Spell Database and Card Renderer
 * Manages the spell library, search, and spell card rendering
 */

export class Grimoire {
  constructor() {
    this.spells = [];
    this.filteredSpells = [];

    // DOM elements
    this.elements = {
      grimoireBtn: document.getElementById('sidebar-grimoire'),
      grimoirePanel: document.getElementById('sidebar-grimoire-panel'),
      closeGrimoire: document.getElementById('close-grimoire'),
      searchInput: document.getElementById('grimoire-search-input'),
      spellList: document.getElementById('grimoire-spell-list'),
      spellCardModal: document.getElementById('spell-card-modal'),
      spellCardContainer: document.getElementById('spell-card-container'),

      // Console elements
      commandConsole: document.getElementById('command-console'),
      consoleResizeHandle: document.getElementById('console-resize-handle'),
      chatInput: document.getElementById('chat-input')
    };

    // Console resize state
    this.consoleResize = {
      isResizing: false,
      startY: 0,
      startHeight: 0,
      minHeight: 80,
      maxHeight: window.innerHeight * 0.5 // 50vh
    };

    this._init();
  }

  /**
   * Initialize Grimoire
   * @private
   */
  async _init() {
    // Load spells
    await this._loadSpells();

    // Setup event listeners
    this._setupEventListeners();

    // Setup console resize
    this._setupConsoleResize();

    console.log('✅ Grimoire initialized');
  }

  /**
   * Load spells from JSON
   * @private
   */
  async _loadSpells() {
    try {
      console.log('Fetching spells from /data/CharacterFoundryWeb.spells.json...');
      const response = await fetch('/data/CharacterFoundryWeb.spells.json');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const allSpells = await response.json();
      console.log('Raw spell data loaded:', allSpells.length, 'total spells');
      console.log('First spell:', allSpells[0]);

      // Use all spells if isPublic field doesn't exist, otherwise filter
      this.spells = allSpells.filter(spell => {
        // If isPublic field exists, use it; otherwise treat as public
        return spell.isPublic === undefined || spell.isPublic === true;
      });

      this.filteredSpells = [...this.spells];

      console.log(`✅ Loaded ${this.spells.length} spells from CharacterFoundryWeb database`);
      if (this.spells.length > 0) {
        console.log('Sample spell:', this.spells[0].name, '- Icon:', this.spells[0].icon);
      }
    } catch (error) {
      console.error('❌ Failed to load spells:', error);
      this.spells = [];
      this.filteredSpells = [];
    }
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Grimoire button - toggle panel
    if (this.elements.grimoireBtn) {
      this.elements.grimoireBtn.addEventListener('click', () => {
        this._toggleGrimoire();
      });
    }

    // Close button
    if (this.elements.closeGrimoire) {
      this.elements.closeGrimoire.addEventListener('click', () => {
        this._hideGrimoire();
      });
    }

    // Search input
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('input', (e) => {
        this._searchSpells(e.target.value);
      });
    }

    // Modal close on background click
    if (this.elements.spellCardModal) {
      this.elements.spellCardModal.addEventListener('click', (e) => {
        if (e.target === this.elements.spellCardModal) {
          this._hideSpellCard();
        }
      });
    }

    // Chat input focus - expand console
    if (this.elements.chatInput) {
      this.elements.chatInput.addEventListener('focus', () => {
        this._expandConsole();
      });
    }
  }

  /**
   * Setup console resize functionality
   * @private
   */
  _setupConsoleResize() {
    if (!this.elements.consoleResizeHandle || !this.elements.commandConsole) return;

    this.elements.consoleResizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.consoleResize.isResizing = true;
      this.consoleResize.startY = e.clientY;
      this.consoleResize.startHeight = this.elements.commandConsole.offsetHeight;

      // Disable transition during resize
      this.elements.commandConsole.style.transition = 'none';

      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.consoleResize.isResizing) return;

      const deltaY = this.consoleResize.startY - e.clientY;
      let newHeight = this.consoleResize.startHeight + deltaY;

      // Constrain height
      newHeight = Math.max(this.consoleResize.minHeight, newHeight);
      newHeight = Math.min(this.consoleResize.maxHeight, newHeight);

      this.elements.commandConsole.style.height = `${newHeight}px`;
    });

    document.addEventListener('mouseup', () => {
      if (!this.consoleResize.isResizing) return;

      this.consoleResize.isResizing = false;

      // Re-enable transition
      this.elements.commandConsole.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  /**
   * Expand console to 35vh
   * @private
   */
  _expandConsole() {
    if (!this.elements.commandConsole) return;
    this.elements.commandConsole.classList.add('expanded');
  }

  /**
   * Collapse console to 80px
   * @private
   */
  _collapseConsole() {
    if (!this.elements.commandConsole) return;
    this.elements.commandConsole.classList.remove('expanded');
  }

  /**
   * Toggle Grimoire panel
   * @private
   */
  _toggleGrimoire() {
    if (!this.elements.grimoirePanel) return;

    const isVisible = this.elements.grimoirePanel.style.display === 'block';

    if (isVisible) {
      this._hideGrimoire();
    } else {
      this._showGrimoire();
    }
  }

  /**
   * Show Grimoire panel
   * @private
   */
  _showGrimoire() {
    if (!this.elements.grimoirePanel) return;

    // Hide other panels
    const allPanels = document.querySelectorAll('.sidebar-panel');
    allPanels.forEach(panel => panel.style.display = 'none');

    // Show grimoire
    this.elements.grimoirePanel.style.display = 'block';

    // Render spell list
    this._renderSpellList();
  }

  /**
   * Hide Grimoire panel
   * @private
   */
  _hideGrimoire() {
    if (!this.elements.grimoirePanel) return;
    this.elements.grimoirePanel.style.display = 'none';
  }

  /**
   * Search spells
   * @private
   */
  _searchSpells(query) {
    if (!query.trim()) {
      this.filteredSpells = [...this.spells];
    } else {
      const q = query.toLowerCase();
      this.filteredSpells = this.spells.filter(spell => {
        return (
          spell.name?.toLowerCase().includes(q) ||
          spell.description?.toLowerCase().includes(q) ||
          spell.level?.toString().includes(q)
        );
      });
    }

    this._renderSpellList();
  }

  /**
   * Render spell list
   * @private
   */
  _renderSpellList() {
    if (!this.elements.spellList) {
      console.error('Spell list element not found!');
      return;
    }

    console.log(`Rendering ${this.filteredSpells.length} spells to list`);

    this.elements.spellList.innerHTML = '';

    if (this.filteredSpells.length === 0) {
      this.elements.spellList.innerHTML = '<p style="padding: 20px; color: #8b7355; text-align: center;">No spells found</p>';
      console.warn('No spells to display');
      return;
    }

    this.filteredSpells.forEach(spell => {
      const item = document.createElement('div');
      item.className = 'spell-list-item';

      item.innerHTML = `
        <div class="spell-list-item-name">${spell.name || 'Unknown Spell'}</div>
        <div class="spell-list-item-level">Level ${spell.level || '?'} ${spell.school || ''}</div>
      `;

      item.addEventListener('click', () => {
        console.log('Spell clicked:', spell.name);
        this._showSpellCard(spell);
      });

      this.elements.spellList.appendChild(item);
    });

    console.log('✅ Spell list rendered');
  }

  /**
   * Show spell card modal
   * @private
   */
  _showSpellCard(spell) {
    if (!this.elements.spellCardModal || !this.elements.spellCardContainer) return;

    // Render spell card
    this._renderSpellCard(spell);

    // Expand console when viewing spell
    this._expandConsole();

    // Show modal
    this.elements.spellCardModal.style.display = 'flex';
  }

  /**
   * Hide spell card modal
   * @private
   */
  _hideSpellCard() {
    if (!this.elements.spellCardModal) return;
    this.elements.spellCardModal.style.display = 'none';
  }

  /**
   * Render spell card with IconSmith layer support
   * @private
   */
  _renderSpellCard(spell) {
    if (!this.elements.spellCardContainer) return;

    const container = this.elements.spellCardContainer;
    container.innerHTML = '';

    // Create card structure
    const card = document.createElement('div');
    card.style.position = 'relative';
    card.style.width = '100%';
    card.style.height = '100%';

    // Render icon stack (either iconLayers or single icon)
    const iconStack = this._renderIconStack(spell);
    card.appendChild(iconStack);

    // Render content
    const content = document.createElement('div');
    content.className = 'spell-card-content';

    content.innerHTML = `
      <div class="spell-card-header">
        <div>
          <div class="spell-card-title">${spell.name || 'Unknown Spell'}</div>
          <div class="spell-card-level">Level ${spell.level || '?'} ${spell.school || ''}</div>
        </div>
        <button class="close-btn" onclick="document.getElementById('spell-card-modal').style.display='none'">✕</button>
      </div>

      <div class="spell-card-description">
        ${spell.description || 'No description available.'}
      </div>

      <div class="spell-card-meta">
        <div class="spell-card-meta-item">
          <div class="spell-card-meta-label">Casting Time</div>
          <div class="spell-card-meta-value">${spell.castingTime || 'Unknown'}</div>
        </div>
        <div class="spell-card-meta-item">
          <div class="spell-card-meta-label">Range</div>
          <div class="spell-card-meta-value">${spell.range || 'Unknown'}</div>
        </div>
        <div class="spell-card-meta-item">
          <div class="spell-card-meta-label">Components</div>
          <div class="spell-card-meta-value">${spell.components || 'Unknown'}</div>
        </div>
        <div class="spell-card-meta-item">
          <div class="spell-card-meta-label">Duration</div>
          <div class="spell-card-meta-value">${spell.duration || 'Unknown'}</div>
        </div>
      </div>
    `;

    card.appendChild(content);
    container.appendChild(card);
  }

  /**
   * Render icon stack from iconLayers or fallback to single icon
   * @private
   */
  _renderIconStack(spell) {
    const stack = document.createElement('div');
    stack.className = 'spell-card-icon-stack';

    console.log('Rendering spell icon for:', spell.name, 'icon URL:', spell.icon);

    // Check if spell has iconLayers (master format)
    if (spell.iconLayers && Array.isArray(spell.iconLayers) && spell.iconLayers.length > 0) {
      // Render layered composite
      spell.iconLayers.forEach((layer, index) => {
        const img = this._createIconLayer(layer, index);
        if (img) stack.appendChild(img);
      });
    } else if (spell.icon) {
      // Fallback to single icon
      const img = document.createElement('img');
      img.src = spell.icon;
      img.className = 'spell-card-icon-layer';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.transform = 'translate(-50%, -50%)';

      // Add error handling
      img.onerror = () => {
        console.error('Failed to load spell icon:', spell.icon);
        stack.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #8b7355; flex-direction: column; gap: 10px;">
          <div>Failed to load icon</div>
          <div style="font-size: 0.7rem; opacity: 0.6;">${spell.icon}</div>
        </div>`;
      };

      img.onload = () => {
        console.log('Successfully loaded spell icon:', spell.name);
      };

      stack.appendChild(img);
    } else {
      // No icon available
      console.warn('No icon available for spell:', spell.name);
      stack.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #8b7355;">No icon available</div>';
    }

    return stack;
  }

  /**
   * Create icon layer from iconLayer data
   * @private
   * @param {Object} layer - Layer data with GUID and JSON transform
   * @param {number} index - Layer index for z-index
   */
  _createIconLayer(layer, index) {
    if (!layer.guid) return null;

    try {
      // Parse JSON string for transform data
      const transform = layer.json ? JSON.parse(layer.json) : {};

      const img = document.createElement('img');
      img.className = 'spell-card-icon-layer';
      img.src = `/icons/${layer.guid}.png`; // Assuming icons are stored in /icons/

      // Apply transform
      const scale = transform.scale || 1;
      const rotation = transform.rotation || 0;
      const posX = transform.positionX || 0;
      const posY = transform.positionY || 0;

      img.style.transform = `
        translate(-50%, -50%)
        translate(${posX}px, ${posY}px)
        rotate(${rotation}deg)
        scale(${scale})
      `;

      img.style.zIndex = index;

      return img;
    } catch (error) {
      console.error('Failed to parse icon layer:', layer, error);
      return null;
    }
  }
}
