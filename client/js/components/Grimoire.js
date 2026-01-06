/**
 * Grimoire - Spell Database and Card Renderer
 * Manages the spell library, search, and spell card rendering
 */

export class Grimoire {
  constructor() {
    this.spells = [];
    this.filteredSpells = [];
    this.sortBy = 'level'; // 'level' or 'name'
    this.sortOrder = 'asc'; // 'asc' or 'desc'

    // DOM elements
    this.elements = {
      grimoireBtn: document.getElementById('sidebar-grimoire'),
      grimoirePanel: document.getElementById('sidebar-grimoire-panel'),
      closeGrimoire: document.getElementById('close-grimoire'),
      searchInput: document.getElementById('grimoire-search-input'),
      spellList: document.getElementById('grimoire-spell-list'),
      spellCardModal: document.getElementById('spell-card-modal'),
      spellCardContainer: document.getElementById('spell-card-container'),
      sortByLevel: null, // Will be created dynamically
      sortByName: null,  // Will be created dynamically

      // Console elements
      commandConsole: document.getElementById('command-console'),
      consoleExpandBtn: document.getElementById('console-expand-btn'),
      chatInput: document.getElementById('chat-input')
    };

    // Console expansion state
    this.consoleExpanded = false;

    this._init();
  }

  /**
   * Initialize Grimoire
   * @private
   */
  async _init() {
    // Ensure grimoire panel is closed on load
    if (this.elements.grimoirePanel) {
      this.elements.grimoirePanel.style.display = 'none';
    }

    // Ensure console starts at correct height (in case of cache issues)
    if (this.elements.commandConsole) {
      this.elements.commandConsole.style.height = '200px';
    }

    // Load spells
    await this._loadSpells();

    // Setup event listeners
    this._setupEventListeners();

    // Setup console expand button
    this._setupConsoleExpand();

    console.log('✅ Grimoire initialized');
  }

  /**
   * Load spells from individual JSON files
   * @private
   */
  async _loadSpells() {
    try {
      console.log('📚 Fetching spell file list from /api/spells/list...');

      // Get list of spell files organized by level
      const listResponse = await fetch('/api/spells/list');
      if (!listResponse.ok) {
        throw new Error(`HTTP error! status: ${listResponse.status}`);
      }

      const spellFilesByLevel = await listResponse.json();
      console.log('Spell files by level:', spellFilesByLevel);

      // Load all individual spell files
      const allSpells = [];
      for (const [level, files] of Object.entries(spellFilesByLevel)) {
        console.log(`Loading ${files.length} spells from level_${level}...`);

        for (const filename of files) {
          try {
            const spellResponse = await fetch(`/data/spells/level_${level}/${filename}`);
            if (spellResponse.ok) {
              const spell = await spellResponse.json();
              allSpells.push(spell);
            } else {
              console.warn(`Failed to load ${filename}:`, spellResponse.status);
            }
          } catch (fileError) {
            console.error(`Error loading ${filename}:`, fileError.message);
          }
        }
      }

      console.log('Raw spell data loaded:', allSpells.length, 'total spells');

      // Use all spells if isPublic field doesn't exist, otherwise filter
      this.spells = allSpells.filter(spell => {
        // If isPublic field exists, use it; otherwise treat as public
        return spell.isPublic === undefined || spell.isPublic === true;
      });

      this.filteredSpells = [...this.spells];

      console.log(`✅ Loaded ${this.spells.length} spells from individual files`);
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

    // Setup sort controls
    this._setupSortControls();
  }

  /**
   * Setup sorting controls
   * @private
   */
  _setupSortControls() {
    // Create sort controls if they don't exist
    const searchContainer = this.elements.grimoirePanel?.querySelector('.grimoire-search');
    if (!searchContainer) return;

    // Check if controls already exist
    if (searchContainer.querySelector('.grimoire-sort-controls')) return;

    const sortControls = document.createElement('div');
    sortControls.className = 'grimoire-sort-controls';
    sortControls.innerHTML = `
      <div class="sort-label">Sort by:</div>
      <button class="sort-btn active" data-sort="level">Level</button>
      <button class="sort-btn" data-sort="name">Name</button>
    `;

    searchContainer.appendChild(sortControls);

    // Add event listeners
    sortControls.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sortType = btn.dataset.sort;

        // Toggle order if clicking same button
        if (this.sortBy === sortType) {
          this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortBy = sortType;
          this.sortOrder = 'asc';
        }

        // Update active state
        sortControls.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Re-render list
        this._sortSpells();
        this._renderSpellList();
      });
    });
  }

  /**
   * Setup console expand/collapse button
   * @private
   */
  _setupConsoleExpand() {
    if (!this.elements.consoleExpandBtn) {
      console.error('Console expand button not found!');
      return;
    }
    if (!this.elements.commandConsole) {
      console.error('Command console not found!');
      return;
    }

    console.log('Setting up console expand button');

    this.elements.consoleExpandBtn.addEventListener('click', () => {
      console.log('Console expand button clicked');
      this.consoleExpanded = !this.consoleExpanded;

      if (this.consoleExpanded) {
        this.elements.commandConsole.classList.add('expanded');
        this.elements.consoleExpandBtn.title = 'Collapse Console';
        console.log('Console expanded');
      } else {
        this.elements.commandConsole.classList.remove('expanded');
        this.elements.consoleExpandBtn.title = 'Expand Console';
        console.log('Console collapsed');
      }
    });
  }

  /**
   * Expand console to 180px (~3 lines)
   * @private
   */
  _expandConsole() {
    if (!this.elements.commandConsole) return;
    this.elements.commandConsole.classList.add('expanded');
  }

  /**
   * Collapse console to 120px (default)
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

    // Sort and render spell list
    this._sortSpells();
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
          spell.level?.toString().includes(q) ||
          spell.school?.toLowerCase().includes(q)
        );
      });
    }

    this._sortSpells();
    this._renderSpellList();
  }

  /**
   * Sort filtered spells
   * @private
   */
  _sortSpells() {
    this.filteredSpells.sort((a, b) => {
      let comparison = 0;

      if (this.sortBy === 'level') {
        // Handle undefined/null levels - treat them as 999 so they sort to the end
        const levelA = a.level !== undefined && a.level !== null ? a.level : 999;
        const levelB = b.level !== undefined && b.level !== null ? b.level : 999;
        comparison = levelA - levelB;

        // If levels are equal, sort by name
        if (comparison === 0) {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          comparison = nameA.localeCompare(nameB);
        }
      } else if (this.sortBy === 'name') {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
      }

      return this.sortOrder === 'asc' ? comparison : -comparison;
    });
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

      // Get level color
      const levelColor = this._getLevelColor(spell.level);

      item.innerHTML = `
        <div class="spell-list-item-icon">
          ${spell.icon ? `<img src="${spell.icon}" alt="${spell.name}" />` : '<div class="spell-icon-placeholder">?</div>'}
        </div>
        <div class="spell-list-item-content">
          <div class="spell-list-item-name">${spell.name || 'Unknown Spell'}</div>
          <div class="spell-list-item-meta">
            <span class="spell-level-badge" style="background: ${levelColor};">Lv${spell.level !== undefined && spell.level !== null ? spell.level : '?'}</span>
            <span class="spell-school">${spell.school || 'Unknown'}</span>
          </div>
        </div>
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
   * Get color for spell level badge
   * @private
   */
  _getLevelColor(level) {
    const colors = {
      0: 'rgba(139, 115, 85, 0.4)',      // Brown - Cantrip
      1: 'rgba(76, 175, 80, 0.4)',       // Green
      2: 'rgba(33, 150, 243, 0.4)',      // Blue
      3: 'rgba(156, 39, 176, 0.4)',      // Purple
      4: 'rgba(255, 152, 0, 0.4)',       // Orange
      5: 'rgba(244, 67, 54, 0.4)',       // Red
      6: 'rgba(233, 30, 99, 0.4)',       // Pink
      7: 'rgba(103, 58, 183, 0.4)',      // Deep Purple
      8: 'rgba(63, 81, 181, 0.4)',       // Indigo
      9: 'rgba(255, 215, 0, 0.4)'        // Gold
    };
    return colors[level] || 'rgba(197, 169, 89, 0.3)';
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

    const displayLevel = spell.level !== undefined && spell.level !== null ? spell.level : '?';

    content.innerHTML = `
      <div class="spell-card-header">
        <div>
          <div class="spell-card-title">${spell.name || 'Unknown Spell'}</div>
          <div class="spell-card-level">Level ${displayLevel} ${spell.school || ''}</div>
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
        ${spell.damage ? `
        <div class="spell-card-meta-item spell-card-damage">
          <div class="spell-card-meta-label">Damage/Effect</div>
          <div class="spell-card-meta-value">${spell.damage}</div>
        </div>
        ` : ''}
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
