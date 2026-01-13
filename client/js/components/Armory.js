/**
 * Armory - Item Database and Card Renderer
 * Manages the item library, search, filtering, and item card rendering
 */

export class Armory {
  constructor() {
    this.items = [];
    this.filteredItems = [];
    this.sortBy = 'category'; // 'category', 'name', 'rarity', 'value'
    this.sortOrder = 'asc'; // 'asc' or 'desc'

    // Filter state
    this.filters = {
      category: 'all',  // 'all', 'weapon', 'armor', etc.
      search: ''        // search query
    };

    // DOM elements
    this.elements = {
      armoryBtn: document.getElementById('sidebar-armory'),
      armoryPanel: document.getElementById('sidebar-armory-panel'),
      closeArmory: document.getElementById('close-armory'),
      searchInput: document.getElementById('armory-search-input'),
      itemList: document.getElementById('armory-item-list'),
      itemCardModal: document.getElementById('item-card-modal'),
      itemCardContainer: document.getElementById('item-card-container'),
      categoryFilter: null // Will be created dynamically
    };

    this._init();
  }

  /**
   * Initialize Armory
   * @private
   */
  async _init() {
    // Load items
    await this._loadItems();

    // Setup event listeners
    this._setupEventListeners();

    console.log('✅ Armory initialized');
  }

  /**
   * Load items from individual folder files using manifest
   * @private
   */
  async _loadItems() {
    try {
      console.log('Loading items from data/items/ using manifest...');

      // Load the item manifest
      const manifestResponse = await fetch('/data/items/item-manifest.json');
      if (!manifestResponse.ok) {
        throw new Error(`Failed to load item manifest: ${manifestResponse.status}`);
      }

      const manifest = await manifestResponse.json();
      const allItems = [];

      // Load each item file listed in the manifest
      for (const [category, fileList] of Object.entries(manifest)) {
        for (const filename of fileList) {
          try {
            const itemResponse = await fetch(`/data/items/${category}/${filename}`);
            if (itemResponse.ok) {
              const itemData = await itemResponse.json();
              allItems.push(itemData);
            }
          } catch (err) {
            console.warn(`Failed to load ${category}/${filename}:`, err);
          }
        }
      }

      console.log('Raw item data loaded:', allItems.length, 'total items');

      this.items = allItems;
      this.filteredItems = [...this.items];

      console.log(`✅ Loaded ${this.items.length} items from data/items/ folders`);
      if (this.items.length > 0) {
        console.log('Sample item:', this.items[0].name, '- Category:', this.items[0].category, '- Icon:', this.items[0].icon);
      }
    } catch (error) {
      console.error('❌ Failed to load items:', error);
      this.items = [];
      this.filteredItems = [];
    }
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Armory button - toggle panel
    if (this.elements.armoryBtn) {
      this.elements.armoryBtn.addEventListener('click', () => {
        this._toggleArmory();
      });
    }

    // Close button
    if (this.elements.closeArmory) {
      this.elements.closeArmory.addEventListener('click', () => {
        this._hideArmory();
      });
    }

    // Search input
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this._applyFilters();
        this._sortItems();
        this._renderItemList();
      });
    }

    // Modal close on background click
    if (this.elements.itemCardModal) {
      this.elements.itemCardModal.addEventListener('click', (e) => {
        if (e.target === this.elements.itemCardModal) {
          this._hideItemCard();
        }
      });
    }

    // Setup category filters
    this._setupCategoryFilters();
  }

  /**
   * Setup category filter controls
   * @private
   */
  _setupCategoryFilters() {
    const searchContainer = this.elements.armoryPanel?.querySelector('.armory-search');
    if (!searchContainer) return;

    // Check if controls already exist
    if (searchContainer.querySelector('.armory-category-filters')) return;

    // Get unique categories from items
    const categories = ['all', ...new Set(this.items.map(item => item.category))];

    const filterControls = document.createElement('div');
    filterControls.className = 'armory-category-filters';

    const filterButtons = categories.map(cat => {
      const icon = this._getCategoryEmoji(cat);
      const label = cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1);
      const activeClass = cat === 'all' ? 'active' : '';
      return `<button class="category-btn ${activeClass}" data-category="${cat}">${icon} ${label}</button>`;
    }).join('');

    filterControls.innerHTML = `
      <div class="filter-label">Category:</div>
      <div class="filter-buttons">${filterButtons}</div>
    `;

    searchContainer.appendChild(filterControls);

    // Add event listeners to filter buttons
    filterControls.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        this.filters.category = category;

        // Update active state
        filterControls.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Re-filter and render
        this._applyFilters();
        this._sortItems();
        this._renderItemList();
      });
    });
  }

  /**
   * Get emoji for category
   * @private
   */
  _getCategoryEmoji(category) {
    const emojiMap = {
      all: '📦',
      weapon: '⚔️',
      armor: '🛡️',
      shield: '🛡️',
      potion: '🧪',
      scroll: '📜',
      wand: '🪄',
      ring: '💍',
      amulet: '📿',
      gear: '🎒',
      tool: '🔧',
      wondrous: '✨'
    };
    return emojiMap[category] || '📦';
  }

  /**
   * Toggle Armory panel
   * @private
   */
  _toggleArmory() {
    if (!this.elements.armoryPanel) return;

    const isVisible = this.elements.armoryPanel.style.display === 'flex';

    if (isVisible) {
      this._hideArmory();
    } else {
      this._showArmory();
    }
  }

  /**
   * Show Armory panel
   * @private
   */
  _showArmory() {
    if (!this.elements.armoryPanel) return;

    // Hide other panels
    const allPanels = document.querySelectorAll('.sidebar-panel');
    allPanels.forEach(panel => panel.style.display = 'none');

    // Show armory
    this.elements.armoryPanel.style.display = 'flex';

    // BUGFIX: Reset filtered items from full item list before filtering
    // This ensures we start fresh when switching panels
    this.filteredItems = [...this.items];

    // Apply filters and render
    this._applyFilters();
    this._sortItems();
    this._renderItemList();
  }

  /**
   * Hide Armory panel
   * @private
   */
  _hideArmory() {
    if (!this.elements.armoryPanel) return;
    this.elements.armoryPanel.style.display = 'none';
  }

  /**
   * Apply all active filters to item list
   * @private
   */
  _applyFilters() {
    // Start with all items
    this.filteredItems = [...this.items];

    // Apply search filter
    if (this.filters.search.trim()) {
      const q = this.filters.search.toLowerCase();
      this.filteredItems = this.filteredItems.filter(item => {
        return (
          item.name?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.rarity?.toLowerCase().includes(q)
        );
      });
    }

    // Apply category filter
    if (this.filters.category !== 'all') {
      this.filteredItems = this.filteredItems.filter(item =>
        item.category === this.filters.category
      );
    }
  }

  /**
   * Sort filtered items
   * @private
   */
  _sortItems() {
    this.filteredItems.sort((a, b) => {
      let comparison = 0;

      if (this.sortBy === 'category') {
        comparison = (a.category || '').localeCompare(b.category || '');
        // Secondary sort by name
        if (comparison === 0) {
          comparison = (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
        }
      } else if (this.sortBy === 'name') {
        comparison = (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
      } else if (this.sortBy === 'rarity') {
        const rarityOrder = { common: 1, uncommon: 2, rare: 3, 'very rare': 4, legendary: 5 };
        comparison = (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
      } else if (this.sortBy === 'value') {
        comparison = (a.value || 0) - (b.value || 0);
      }

      return this.sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Render item list
   * @private
   */
  _renderItemList() {
    if (!this.elements.itemList) {
      console.error('Item list element not found!');
      return;
    }

    console.log(`Rendering ${this.filteredItems.length} items to list`);

    this.elements.itemList.innerHTML = '';

    if (this.filteredItems.length === 0) {
      this.elements.itemList.innerHTML = '<p style="padding: 20px; color: #8b7355; text-align: center;">No items found</p>';
      console.warn('No items to display');
      return;
    }

    this.filteredItems.forEach(item => {
      const listItem = document.createElement('div');
      listItem.className = 'item-list-item';

      // Get rarity color
      const rarityColor = this._getRarityColor(item.rarity);

      listItem.innerHTML = `
        <div class="item-list-item-icon">
          ${item.icon || '📦'}
        </div>
        <div class="item-list-item-content">
          <div class="item-list-item-name">${item.name || 'Unknown Item'}</div>
          <div class="item-list-item-meta">
            <span class="item-rarity-badge" style="background: ${rarityColor};">${item.rarity || 'common'}</span>
            <span class="item-category">${item.category || 'misc'}</span>
            ${item.value ? `<span class="item-value">${item.value} gp</span>` : ''}
          </div>
        </div>
      `;

      listItem.addEventListener('click', () => {
        console.log('Item clicked:', item.name);
        this._showItemCard(item);
      });

      this.elements.itemList.appendChild(listItem);
    });

    console.log('✅ Item list rendered');
  }

  /**
   * Get color for rarity badge
   * @private
   */
  _getRarityColor(rarity) {
    const colors = {
      common: 'rgba(139, 115, 85, 0.4)',
      uncommon: 'rgba(76, 175, 80, 0.4)',
      rare: 'rgba(33, 150, 243, 0.4)',
      'very rare': 'rgba(156, 39, 176, 0.4)',
      legendary: 'rgba(255, 152, 0, 0.4)'
    };
    return colors[rarity] || colors.common;
  }

  /**
   * Show item card modal
   * @private
   */
  _showItemCard(item) {
    if (!this.elements.itemCardModal || !this.elements.itemCardContainer) return;

    // Render item card
    this._renderItemCard(item);

    // Show modal
    this.elements.itemCardModal.style.display = 'flex';
  }

  /**
   * Hide item card modal
   * @private
   */
  _hideItemCard() {
    if (!this.elements.itemCardModal) return;
    this.elements.itemCardModal.style.display = 'none';
  }

  /**
   * Render item card
   * @private
   */
  _renderItemCard(item) {
    if (!this.elements.itemCardContainer) return;

    const container = this.elements.itemCardContainer;
    container.innerHTML = '';

    // Render icon
    const iconDisplay = document.createElement('div');
    iconDisplay.className = 'item-card-icon-display';
    iconDisplay.innerHTML = `<div class="item-emoji">${item.icon || '📦'}</div>`;
    container.appendChild(iconDisplay);

    // Render content
    const content = document.createElement('div');
    content.className = 'item-card-content';

    // Build stats section based on item type
    let statsHtml = '';

    if (item.weapon) {
      statsHtml = `
        <div class="item-card-stats">
          <div class="item-card-stat-item">
            <div class="item-card-stat-label">Damage</div>
            <div class="item-card-stat-value">${item.weapon.damage} ${item.weapon.damageType}</div>
          </div>
          ${item.weapon.versatileDamage ? `
          <div class="item-card-stat-item">
            <div class="item-card-stat-label">Versatile</div>
            <div class="item-card-stat-value">${item.weapon.versatileDamage}</div>
          </div>
          ` : ''}
          <div class="item-card-stat-item">
            <div class="item-card-stat-label">Range</div>
            <div class="item-card-stat-value">${item.weapon.range || 'Melee'}</div>
          </div>
          ${item.weapon.properties?.length ? `
          <div class="item-card-stat-item full-width">
            <div class="item-card-stat-label">Properties</div>
            <div class="item-card-stat-value">${item.weapon.properties.join(', ')}</div>
          </div>
          ` : ''}
        </div>
      `;
    } else if (item.armor) {
      statsHtml = `
        <div class="item-card-stats">
          <div class="item-card-stat-item">
            <div class="item-card-stat-label">Armor Class</div>
            <div class="item-card-stat-value">${item.armor.ac}</div>
          </div>
          <div class="item-card-stat-item">
            <div class="item-card-stat-label">Type</div>
            <div class="item-card-stat-value">${item.armor.type}</div>
          </div>
          ${item.armor.stealthDisadvantage ? `
          <div class="item-card-stat-item">
            <div class="item-card-stat-label">Stealth</div>
            <div class="item-card-stat-value">Disadvantage</div>
          </div>
          ` : ''}
          ${item.armor.strengthRequired ? `
          <div class="item-card-stat-item">
            <div class="item-card-stat-label">Str Required</div>
            <div class="item-card-stat-value">${item.armor.strengthRequired}</div>
          </div>
          ` : ''}
        </div>
      `;
    }

    content.innerHTML = `
      <div class="item-card-header">
        <div>
          <div class="item-card-title">${item.name || 'Unknown Item'}</div>
          <div class="item-card-subtitle">${item.category || 'misc'} • ${item.rarity || 'common'}</div>
        </div>
        <button class="close-btn" onclick="document.getElementById('item-card-modal').style.display='none'">✕</button>
      </div>

      <div class="item-card-description">
        ${item.description || 'No description available.'}
      </div>

      ${statsHtml}

      <div class="item-card-meta">
        <div class="item-card-meta-item">
          <div class="item-card-meta-label">Weight</div>
          <div class="item-card-meta-value">${item.weight || 0} lbs</div>
        </div>
        <div class="item-card-meta-item">
          <div class="item-card-meta-label">Value</div>
          <div class="item-card-meta-value">${item.value || 0} gp</div>
        </div>
        ${item.slot ? `
        <div class="item-card-meta-item">
          <div class="item-card-meta-label">Slot</div>
          <div class="item-card-meta-value">${item.slot}</div>
        </div>
        ` : ''}
      </div>
    `;

    container.appendChild(content);
  }
}
