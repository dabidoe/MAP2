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

    // Lazy loading state
    this.renderedCount = 0;
    this.batchSize = 20; // Render 20 items at a time
    this.isLoadingMore = false;

    // Filter state
    this.filters = {
      level: 'all',     // 'all' or specific level (0-9)
      class: 'all',     // 'all' or specific class name
      school: 'all',    // 'all' or specific school name
      search: ''        // search query
    };

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
   * Load spells from individual folder files using manifest
   * @private
   */
  async _loadSpells() {
    try {
      console.log('⚡ Loading spell index (lightweight, fast)...');

      const indexResponse = await fetch('/data/spells/spell-index.json');
      if (!indexResponse.ok) {
        throw new Error(`Failed to load spell index: ${indexResponse.status}`);
      }

      const index = await indexResponse.json();

      console.log(`✅ Loaded ${index.length} spells from index (fast!)`);

      this.spells = index;
      this.filteredSpells = [...this.spells];

      if (this.spells.length > 0) {
        console.log('📊 Index loaded:', this.spells.length, 'spells');
        console.log('💡 Full spell data will load on-demand when cards open');
      }
    } catch (error) {
      console.error('❌ Failed to load spell index:', error);
      this.spells = [];
      this.filteredSpells = [];
    }
  }

  /**
   * Lazy load full spell data when needed (card open)
   * @private
   */
  async _loadFullSpell(path) {
    try {
      console.log(`📖 Loading full spell data: ${path}`);
      const response = await fetch(`/data/spells/${path}`);
      if (!response.ok) {
        throw new Error(`Failed to load spell: ${response.status}`);
      }

      const fullSpell = await response.json();
      console.log(`✅ Loaded full data for: ${fullSpell.name}`);
      return fullSpell;
    } catch (error) {
      console.error(`❌ Failed to load full spell from ${path}:`, error);
      return null;
    }
  }

  /**
   * Normalize spell data from different formats
   * @private
   */
  _normalizeSpellData(spellData) {
    // Handle two formats: simple flat format and complex nested format
    const isComplexFormat = spellData.system !== undefined;

    if (isComplexFormat) {
      // Complex format (e.g., Mage Armor)
      const system = spellData.system;
      const components = system.components || {};

      // Build components string
      let componentsStr = '';
      if (components.vocal) componentsStr += 'V';
      if (components.somatic) componentsStr += (componentsStr ? ', ' : '') + 'S';
      if (components.material) {
        componentsStr += (componentsStr ? ', ' : '') + 'M';
        if (components.materialDescription) {
          componentsStr += ` (${components.materialDescription})`;
        }
      }

      // Map abbreviated school names to full names
      const schoolMap = {
        'abj': 'Abjuration',
        'con': 'Conjuration',
        'div': 'Divination',
        'enc': 'Enchantment',
        'evo': 'Evocation',
        'ill': 'Illusion',
        'nec': 'Necromancy',
        'trs': 'Transmutation'
      };

      return {
        _id: spellData._id,
        id: spellData._id?.$oid,
        name: spellData.name,
        level: system.level ?? null,
        description: system.description?.value || '',
        school: schoolMap[system.school] || system.school || 'Unknown',
        icon: spellData.img,
        video: spellData.video,
        castingTime: system.activation ? `${system.activation.cost} ${system.activation.type}` : 'Unknown',
        range: system.range?.units || 'Unknown',
        components: componentsStr || 'Unknown',
        duration: system.duration ? `${system.duration.value || ''} ${system.duration.units || ''}`.trim() : 'Unknown',
        damage: system.damage,
        isPublic: spellData.flags?.mythos?.isPublic
      };
    } else {
      // Simple format (from SPELLS_MASTER.json)
      return {
        _id: spellData._id,
        id: spellData._id?.$oid || spellData.id,
        name: spellData.name,
        level: spellData.level ?? null,
        description: spellData.description || '',
        school: spellData.school || 'Unknown',
        icon: spellData.icon,
        video: spellData.video,
        iconStatus: spellData.iconStatus,
        castingTime: spellData.castingTime || 'Unknown',
        range: spellData.range || 'Unknown',
        components: spellData.components || 'Unknown',
        duration: spellData.duration || 'Unknown',
        damage: spellData.damage,
        isPublic: spellData.isPublic,
        classes: spellData.classes,
        ritual: spellData.ritual,
        higherLevels: spellData.higherLevels,
        source: spellData.source
      };
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
        this.filters.search = e.target.value;
        this._applyFilters();
        this._sortSpells();
        this._renderSpellList();
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

    // Setup filter dropdowns
    this._setupFilterDropdowns();
  }

  /**
   * Setup filter dropdown controls
   * @private
   */
  _setupFilterDropdowns() {
    const searchContainer = this.elements.grimoirePanel?.querySelector('.grimoire-search');
    if (!searchContainer) return;

    // Check if controls already exist
    if (searchContainer.querySelector('.grimoire-filter-dropdowns')) return;

    // Get unique values from spells for filter options
    const levels = ['all', ...new Set(this.spells.map(s => s.level).filter(l => l !== null && l !== undefined).sort((a, b) => a - b))];
    const classes = ['all', ...new Set(this.spells.filter(s => s.classes).flatMap(s => s.classes).sort())];
    const schools = ['all', ...new Set(this.spells.map(s => s.school).filter(s => s).sort())];

    const filterDropdowns = document.createElement('div');
    filterDropdowns.className = 'grimoire-filter-dropdowns';

    filterDropdowns.innerHTML = `
      <div class="filter-dropdown-group">
        <label class="filter-dropdown-label">Level:</label>
        <select class="filter-dropdown" id="grimoire-level-filter">
          ${levels.map(level => `<option value="${level}">${level === 'all' ? 'All Levels' : `Level ${level}`}</option>`).join('')}
        </select>
      </div>
      <div class="filter-dropdown-group">
        <label class="filter-dropdown-label">Class:</label>
        <select class="filter-dropdown" id="grimoire-class-filter">
          ${classes.map(cls => `<option value="${cls}">${cls === 'all' ? 'All Classes' : cls}</option>`).join('')}
        </select>
      </div>
      <div class="filter-dropdown-group">
        <label class="filter-dropdown-label">School:</label>
        <select class="filter-dropdown" id="grimoire-school-filter">
          ${schools.map(school => `<option value="${school}">${school === 'all' ? 'All Schools' : school}</option>`).join('')}
        </select>
      </div>
    `;

    searchContainer.appendChild(filterDropdowns);

    // Add event listeners
    const levelFilter = document.getElementById('grimoire-level-filter');
    const classFilter = document.getElementById('grimoire-class-filter');
    const schoolFilter = document.getElementById('grimoire-school-filter');

    if (levelFilter) {
      levelFilter.addEventListener('change', (e) => {
        this.filters.level = e.target.value;
        this._applyFilters();
        this._sortSpells();
        this._renderSpellList();
      });
    }

    if (classFilter) {
      classFilter.addEventListener('change', (e) => {
        this.filters.class = e.target.value;
        this._applyFilters();
        this._sortSpells();
        this._renderSpellList();
      });
    }

    if (schoolFilter) {
      schoolFilter.addEventListener('change', (e) => {
        this.filters.school = e.target.value;
        this._applyFilters();
        this._sortSpells();
        this._renderSpellList();
      });
    }
  }

  /**
   * Apply all active filters to spell list
   * @private
   */
  _applyFilters() {
    // Start with all spells
    this.filteredSpells = [...this.spells];

    // Apply search filter
    if (this.filters.search.trim()) {
      const q = this.filters.search.toLowerCase();
      this.filteredSpells = this.filteredSpells.filter(spell => {
        return (
          spell.name?.toLowerCase().includes(q) ||
          spell.description?.toLowerCase().includes(q) ||
          spell.level?.toString().includes(q) ||
          spell.school?.toLowerCase().includes(q)
        );
      });
    }

    // Apply level filter
    if (this.filters.level !== 'all') {
      const targetLevel = parseInt(this.filters.level);
      this.filteredSpells = this.filteredSpells.filter(spell => spell.level === targetLevel);
    }

    // Apply class filter
    if (this.filters.class !== 'all') {
      this.filteredSpells = this.filteredSpells.filter(spell =>
        spell.classes && spell.classes.includes(this.filters.class)
      );
    }

    // Apply school filter
    if (this.filters.school !== 'all') {
      this.filteredSpells = this.filteredSpells.filter(spell => spell.school === this.filters.school);
    }
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

    const isVisible = this.elements.grimoirePanel.style.display === 'flex';

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

    // Show grimoire (use flex since grimoire-panel uses flexbox)
    this.elements.grimoirePanel.style.display = 'flex';

    // BUGFIX: Reset filtered spells from full spell list before filtering
    // This ensures we start fresh when switching panels
    this.filteredSpells = [...this.spells];

    // Apply filters and render
    this._applyFilters();
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
   * Render spell list with lazy loading
   * @private
   */
  _renderSpellList() {
    if (!this.elements.spellList) {
      console.error('Spell list element not found!');
      return;
    }

    // Clear list and reset counter
    this.elements.spellList.innerHTML = '';
    this.renderedCount = 0;

    if (this.filteredSpells.length === 0) {
      this.elements.spellList.innerHTML = '<p style="padding: 20px; color: #8b7355; text-align: center;">No spells found</p>';
      console.warn('No spells to display');
      return;
    }

    console.log(`Lazy loading ${this.filteredSpells.length} spells (${this.batchSize} at a time)`);

    // Render first batch immediately
    this._renderSpellBatch();

    // Setup scroll listener for lazy loading
    this._setupLazyLoading();
  }

  /**
   * Render a batch of spells
   * @private
   */
  _renderSpellBatch() {
    if (this.renderedCount >= this.filteredSpells.length) {
      return; // All spells rendered
    }

    const endIndex = Math.min(this.renderedCount + this.batchSize, this.filteredSpells.length);
    const batch = this.filteredSpells.slice(this.renderedCount, endIndex);

    batch.forEach(spell => {
      const item = document.createElement('div');
      item.className = 'spell-list-item';

      // Add class for missing icon spells
      if (spell.iconStatus === 'missing') {
        item.classList.add('spell-missing-icon');
      }

      // Get level color
      const levelColor = this._getLevelColor(spell.level);

      item.innerHTML = `
        <div class="spell-list-item-icon">
          ${spell.icon ? `<img src="${spell.icon}" alt="${spell.name}" />` : '<div class="spell-icon-placeholder">?</div>'}
          ${spell.iconStatus === 'missing' ? '<div class="icon-missing-badge">📌</div>' : ''}
        </div>
        <div class="spell-list-item-content">
          <div class="spell-list-item-name">${spell.name || 'Unknown Spell'}${spell.iconStatus === 'missing' ? ' <span class="missing-tag">NEEDS ICON</span>' : ''}</div>
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

    this.renderedCount = endIndex;
    console.log(`✅ Rendered ${this.renderedCount} / ${this.filteredSpells.length} spells`);
  }

  /**
   * Setup lazy loading on scroll
   * @private
   */
  _setupLazyLoading() {
    if (!this.elements.spellList) return;

    // Remove old listener if exists
    if (this._scrollHandler) {
      this.elements.spellList.removeEventListener('scroll', this._scrollHandler);
    }

    // Create new scroll handler
    this._scrollHandler = () => {
      if (this.isLoadingMore || this.renderedCount >= this.filteredSpells.length) {
        return;
      }

      const scrollTop = this.elements.spellList.scrollTop;
      const scrollHeight = this.elements.spellList.scrollHeight;
      const clientHeight = this.elements.spellList.clientHeight;

      // Load more when user is 200px from bottom
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        this.isLoadingMore = true;
        this._renderSpellBatch();
        this.isLoadingMore = false;
      }
    };

    this.elements.spellList.addEventListener('scroll', this._scrollHandler);
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
   * Show spell card modal (lazy load full spell data)
   * @private
   */
  async _showSpellCard(spell) {
    if (!this.elements.spellCardModal || !this.elements.spellCardContainer) return;

    // Show modal immediately with loading state
    this.elements.spellCardModal.style.display = 'flex';
    this.elements.spellCardContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: #c5a959;">Loading spell data...</div>';

    // Lazy load full spell data if we only have index entry
    let fullSpell = spell;
    if (spell._path) {
      fullSpell = await this._loadFullSpell(spell._path);
      if (!fullSpell) {
        this.elements.spellCardContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: #ff6464;">Failed to load spell data</div>';
        return;
      }
    }

    // Render spell card with full data
    this._renderSpellCard(fullSpell);

    // Expand console when viewing spell
    this._expandConsole();
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

    // Render icon stack (either iconLayers or single icon)
    const iconStack = this._renderIconStack(spell);
    container.appendChild(iconStack);

    // Render content
    const content = document.createElement('div');
    content.className = 'spell-card-content';

    const displayLevel = spell.level !== undefined && spell.level !== null ? spell.level : '?';

    content.innerHTML = `
      <div class="spell-card-header">
        <div>
          <div class="spell-card-title">
            ${spell.name || 'Unknown Spell'}
            ${spell.ritual ? '<span class="ritual-badge">🕯️ Ritual</span>' : ''}
          </div>
          <div class="spell-card-level">Level ${displayLevel} ${spell.school || ''}</div>
          ${spell.classes && spell.classes.length ? `
          <div class="spell-card-classes">
            ${spell.classes.map(cls => `<span class="class-badge">${cls}</span>`).join(' ')}
          </div>
          ` : ''}
        </div>
        <button class="close-btn" onclick="document.getElementById('spell-card-modal').style.display='none'">✕</button>
      </div>

      <div class="spell-card-description-container">
        <div class="spell-card-description">
          ${spell.description || 'No description available.'}
        </div>
      </div>

      ${spell.higherLevels ? `
      <div class="spell-card-higher-levels">
        <strong>At Higher Levels:</strong> ${spell.higherLevels}
      </div>
      ` : ''}

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
          <div class="spell-card-meta-value">
            ${spell.components || 'Unknown'}
            ${spell.componentsDetail?.material && spell.componentsDetail?.materialsNeeded?.length ?
              `<div class="material-components">${spell.componentsDetail.materialsNeeded.join(', ')}</div>` : ''}
          </div>
        </div>
        <div class="spell-card-meta-item">
          <div class="spell-card-meta-label">Duration</div>
          <div class="spell-card-meta-value">${spell.duration || 'Unknown'}</div>
        </div>
        ${spell.damage ? `
        <div class="spell-card-meta-item">
          <div class="spell-card-meta-label">Damage/Healing</div>
          <div class="spell-card-meta-value">${spell.damage}</div>
        </div>
        ` : ''}
      </div>
    `;

    container.appendChild(content);
  }

  /**
   * Render icon stack from video, iconLayers, or fallback to single icon
   * @private
   */
  _renderIconStack(spell) {
    const stack = document.createElement('div');
    stack.className = 'spell-card-icon-stack';

    console.log('Rendering spell visual for:', spell.name, 'video:', spell.video, 'icon:', spell.icon);

    // Show loading placeholder initially
    if (!spell.video && !spell.icon) {
      stack.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #8b7355; font-size: 3rem;">✨</div>`;
      return stack;
    }

    // Priority 1: Video (if available)
    if (spell.video) {
      // Check if it's a Bunny CDN embed URL (iframe) or direct video URL
      const isBunnyEmbed = spell.video.includes('player.mediadelivery.net/embed');

      if (isBunnyEmbed) {
        // Bunny CDN iframe embed
        const iframe = document.createElement('iframe');
        iframe.src = spell.video;
        iframe.className = 'spell-card-video-iframe';
        iframe.loading = 'lazy';
        iframe.allow = 'autoplay';
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';

        iframe.onload = () => {
          console.log('✅ Successfully loaded Bunny video embed:', spell.name);
        };

        iframe.onerror = () => {
          console.error('❌ Failed to load Bunny video embed:', spell.video);
          // Fallback to icon if video fails
          if (spell.icon) {
            stack.innerHTML = '';
            const img = document.createElement('img');
            img.src = spell.icon;
            img.className = 'spell-card-icon-layer';
            img.style.position = 'absolute';
            img.style.top = '50%';
            img.style.left = '50%';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.transform = 'translate(-50%, -50%)';
            stack.appendChild(img);
          } else {
            stack.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #8b7355;">Failed to load video</div>`;
          }
        };

        stack.appendChild(iframe);
      } else {
        // Direct video URL (old format)
        const video = document.createElement('video');
        video.src = spell.video;
        video.className = 'spell-card-video';
        video.loop = true;
        video.autoplay = true;
        video.muted = true;
        video.style.position = 'absolute';
        video.style.top = '50%';
        video.style.left = '50%';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        video.style.transform = 'translate(-50%, -50%)';

        // Add error handling
        video.onerror = () => {
          console.error('❌ Failed to load spell video:', spell.video);
          // Fallback to icon if video fails
          if (spell.icon) {
            stack.innerHTML = '';
            const img = document.createElement('img');
            img.src = spell.icon;
            img.className = 'spell-card-icon-layer';
            img.style.position = 'absolute';
            img.style.top = '50%';
            img.style.left = '50%';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.transform = 'translate(-50%, -50%)';
            stack.appendChild(img);
          } else {
            stack.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #8b7355;">Failed to load video</div>`;
          }
        };

        video.onloadeddata = () => {
          console.log('✅ Successfully loaded spell video:', spell.name);
        };

        stack.appendChild(video);
      }

      return stack;
    }

    // Priority 2: Single icon (pre-composed image - faster, no flashing)
    if (spell.icon) {
      const img = document.createElement('img');
      img.src = spell.icon;
      img.className = 'spell-card-icon-layer';
      img.style.position = 'absolute';
      img.style.top = '50%';
      img.style.left = '50%';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.transform = 'translate(-50%, -50%)';

      // Add load success handler
      img.onload = () => {
        console.log('✅ Successfully loaded spell icon:', spell.name);
      };

      // Add error handling
      img.onerror = () => {
        console.error('❌ Failed to load spell icon:', spell.icon);
        stack.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #8b7355; flex-direction: column; gap: 10px;">
          <div>Failed to load icon</div>
          <div style="font-size: 0.7rem; opacity: 0.6;">${spell.icon}</div>
        </div>`;
      };

      stack.appendChild(img);
    } else if (spell.iconLayers && Array.isArray(spell.iconLayers) && spell.iconLayers.length > 0) {
      // Priority 3: Icon Layers (fallback if no single icon available)
      console.log('Using icon layers for:', spell.name);
      spell.iconLayers.forEach((layer, index) => {
        const img = this._createIconLayer(layer, index);
        if (img) stack.appendChild(img);
      });
    } else {
      // No icon or video available
      console.warn('No icon or video available for spell:', spell.name);
      stack.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #8b7355;">No visual available</div>';
    }

    return stack;
  }

  /**
   * Create icon layer from iconLayer data
   * Handles format: ["hash${metadata}"] where metadata is JSON string
   * @private
   * @param {Array} layerArray - Array with hash+metadata string
   * @param {number} index - Layer index for z-index
   */
  _createIconLayer(layerArray, index) {
    if (!layerArray || layerArray.length === 0) return null;

    try {
      // Extract the first item from the layer array
      const layerString = layerArray[0];
      if (!layerString) return null;

      // Split by ${ to separate hash from metadata
      const dollarSignIndex = layerString.indexOf('${');
      const hash = dollarSignIndex !== -1
        ? layerString.substring(0, dollarSignIndex)
        : layerString;

      // Parse metadata if present
      let metadata = {};
      if (dollarSignIndex !== -1) {
        try {
          const metadataStr = layerString.substring(dollarSignIndex + 1);
          metadata = JSON.parse(metadataStr);
        } catch (e) {
          console.warn('Failed to parse layer metadata:', e);
        }
      }

      const img = document.createElement('img');
      img.className = 'spell-card-icon-layer';
      img.src = `https://statsheet-cdn.b-cdn.net/images/${hash}.png`;

      // Apply positioning from metadata
      const position = metadata.position ? metadata.position.split(',').map(parseFloat) : [0.5, 0.5];
      const scale = metadata.scale ? metadata.scale.split(',').map(parseFloat) : [1, 1];
      const rotation = metadata.rotation || 0;

      // Convert position (0-1 range) to percentage
      const leftPercent = position[0] * 100;
      const topPercent = position[1] * 100;

      img.style.position = 'absolute';
      img.style.left = `${leftPercent}%`;
      img.style.top = `${topPercent}%`;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      img.style.transform = `translate(-50%, -50%) scale(${scale[0]}, ${scale[1]}) rotate(${rotation}deg)`;
      img.style.zIndex = index;

      // Add error handling
      img.onerror = () => {
        console.error('❌ Failed to load icon layer:', img.src);
      };

      img.onload = () => {
        console.log('✅ Loaded icon layer:', hash);
      };

      return img;
    } catch (error) {
      console.error('Failed to parse icon layer:', layerArray, error);
      return null;
    }
  }
}
