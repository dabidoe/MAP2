/**
 * CharacterSheet Component
 * Tabbed interface with Google Drive-style list items
 */

export class CharacterSheet {
  constructor(grimoire = null) {
    this.character = null;
    this.activeTab = 'combat';
    this.activeSubtab = null;
    this.expandedItems = new Set();
    this.grimoire = grimoire;

    this.elements = {};
    this._init();
  }

  _init() {
    this._createHTML();
    this._attachEventListeners();
  }

  _createHTML() {
    const modal = document.createElement('div');
    modal.id = 'character-sheet-modal-new';
    modal.className = 'character-sheet-modal';

    modal.innerHTML = `
      <div class="character-sheet-container">
        <div class="sheet-header">
          <div class="sheet-header-left">
            <img id="sheet-portrait" class="sheet-portrait" src="" alt="Character" />
            <div class="sheet-character-info">
              <h2 id="sheet-name">Character Name</h2>
              <p id="sheet-details">Level 1 Human Fighter</p>
            </div>
          </div>
          <button id="sheet-close" class="sheet-close-btn">✕</button>
        </div>

        <div class="sheet-tabs">
          <button class="sheet-tab active" data-tab="combat">Combat</button>
          <button class="sheet-tab" data-tab="spells">Spells</button>
          <button class="sheet-tab" data-tab="abilities">Abilities</button>
          <button class="sheet-tab" data-tab="traits">Traits</button>
          <button class="sheet-tab" data-tab="feats">Feats</button>
          <button class="sheet-tab" data-tab="inventory">Inventory</button>
        </div>

        <div id="sheet-subtabs" class="sheet-subtabs"></div>

        <div class="sheet-content">
          <div id="tab-combat" class="sheet-tab-panel active"></div>
          <div id="tab-spells" class="sheet-tab-panel"></div>
          <div id="tab-abilities" class="sheet-tab-panel"></div>
          <div id="tab-traits" class="sheet-tab-panel"></div>
          <div id="tab-feats" class="sheet-tab-panel"></div>
          <div id="tab-inventory" class="sheet-tab-panel"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.elements.modal = modal;
  }

  _attachEventListeners() {
    // Close button
    document.getElementById('sheet-close')?.addEventListener('click', () => this.close());

    // Tab switching
    document.querySelectorAll('.sheet-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this._switchTab(tabName);
      });
    });

    // Close on outside click
    this.elements.modal.addEventListener('click', (e) => {
      if (e.target === this.elements.modal) this.close();
    });
  }

  _switchTab(tabName) {
    this.activeTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.sheet-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update panels
    document.querySelectorAll('.sheet-tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });

    // Show/hide subtabs
    const subtabsContainer = document.getElementById('sheet-subtabs');
    if (tabName === 'spells') {
      this._renderSpellSubtabs();
      subtabsContainer.classList.add('active');
    } else {
      subtabsContainer.classList.remove('active');
    }
  }

  _renderSpellSubtabs() {
    const subtabsContainer = document.getElementById('sheet-subtabs');
    const levels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    subtabsContainer.innerHTML = levels.map(level =>
      `<button class="sheet-subtab ${level === 0 ? 'active' : ''}" data-level="${level}">
        ${level === 0 ? 'Cantrips' : `Level ${level}`}
      </button>`
    ).join('');

    // Attach subtab listeners
    document.querySelectorAll('.sheet-subtab').forEach(subtab => {
      subtab.addEventListener('click', (e) => {
        document.querySelectorAll('.sheet-subtab').forEach(st => st.classList.remove('active'));
        e.target.classList.add('active');
        this.activeSubtab = e.target.dataset.level;
        this._renderSpells();
      });
    });

    this.activeSubtab = '0';
    this._renderSpells();
  }

  _renderSpells() {
    const panel = document.getElementById('tab-spells');
    if (!this.character?.spellbook) {
      panel.innerHTML = '<p style="color: #8B7355; padding: 20px;">No spells available</p>';
      return;
    }

    const level = this.activeSubtab || '0';
    const levelKey = level === '0' ? 'L0' : `L${level}`;
    const characterSpells = this.character.spellbook[levelKey] || [];

    // Lookup full spell data from Grimoire
    const spells = characterSpells.map(charSpell => {
      // If grimoire is available, try to find the full spell data
      if (this.grimoire && this.grimoire.spells) {
        const spellName = typeof charSpell === 'string' ? charSpell : charSpell.name;
        const fullSpell = this.grimoire.spells.find(s => s.name === spellName);

        if (fullSpell) {
          return fullSpell;
        }
      }
      // Fallback to character spell data
      return typeof charSpell === 'string' ? { name: charSpell } : charSpell;
    });

    panel.innerHTML = `<div class="sheet-item-list">
      ${spells.map((spell, idx) => this._renderSpellItem(spell, idx)).join('')}
    </div>`;

    // Attach click handlers for toggle
    panel.querySelectorAll('.sheet-item').forEach((item, idx) => {
      item.addEventListener('click', () => this._toggleItem(`spell-${level}-${idx}`));
    });

    // Attach cast button handlers
    panel.querySelectorAll('.sheet-cast-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card from closing
        const spellName = btn.dataset.spell;
        const damage = btn.dataset.damage;
        this._castSpell(spellName, damage);
      });
    });
  }

  _renderSpellItem(spell, idx) {
    const itemId = `spell-${this.activeSubtab}-${idx}`;
    const expanded = this.expandedItems.has(itemId);

    // Safely extract spell properties
    const name = spell?.name || 'Unnamed Spell';
    const icon = spell?.icon || null;
    const damage = spell?.damage || '';
    const castingTime = spell?.castingTime || '';
    const description = spell?.description || spell?.summary || '';
    const school = spell?.school || '';
    const range = spell?.range || 'N/A';
    const duration = spell?.duration || 'N/A';
    const components = spell?.components || 'N/A';

    return `
      <div>
        <div class="sheet-item" data-item="${itemId}">
          <div class="sheet-item-icon">${icon ? `<img src="${icon}" alt="${name}" />` : '🔮'}</div>
          <div class="sheet-item-name">${name}</div>
          <div class="sheet-item-roll">${damage || castingTime}</div>
          <div class="sheet-item-description">${description.substring(0, 80)}${description.length > 80 ? '...' : ''}</div>
        </div>
        ${expanded ? `
          <div class="sheet-item-card">
            <div class="sheet-item-card-header">
              <div class="sheet-item-card-icon">${icon ? `<img src="${icon}" alt="${name}" />` : '<div style="font-size:40px;display:flex;align-items:center;justify-content:center;height:100%;">🔮</div>'}</div>
              <div class="sheet-item-card-header-text">
                <div class="sheet-item-card-title">${name}</div>
                <div class="sheet-item-card-subtitle">${school}${school && castingTime ? ' • ' : ''}${castingTime}</div>
                ${damage ? `<div style="color:#FF6B6B;font-weight:700;font-size:16px;margin-top:8px;">${damage}</div>` : ''}
              </div>
            </div>
            <div class="sheet-item-card-body">
              <p><strong>Casting Time:</strong> ${castingTime}</p>
              <p><strong>Range:</strong> ${range}</p>
              <p><strong>Duration:</strong> ${duration}</p>
              <p><strong>Components:</strong> ${components}</p>
              ${description ? `<p style="margin-top:12px;font-style:italic;">${description}</p>` : ''}
            </div>
            <div class="sheet-item-card-actions">
              <button class="sheet-cast-btn" data-spell="${name}" data-damage="${damage}">✨ Cast Spell</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  _toggleItem(itemId) {
    if (this.expandedItems.has(itemId)) {
      this.expandedItems.delete(itemId);
    } else {
      this.expandedItems.add(itemId);
    }
    this._renderContent();
  }

  _castSpell(spellName, damage) {
    console.log(`Casting spell: ${spellName}`);

    // Emit spell cast event
    const event = new CustomEvent('castSpell', {
      detail: {
        spell: spellName,
        damage: damage,
        character: this.character?.name
      }
    });
    window.dispatchEvent(event);
  }

  open(character) {
    this.character = character;
    this._populateHeader();
    this._renderContent();
    this.elements.modal.classList.add('active');
  }

  close() {
    this.elements.modal.classList.remove('active');
    this.character = null;
    this.expandedItems.clear();
  }

  _populateHeader() {
    document.getElementById('sheet-portrait').src = this.character.icon || '';
    document.getElementById('sheet-name').textContent = this.character.name || 'Unknown';
    document.getElementById('sheet-details').textContent =
      `Level ${this.character.level || 1} ${this.character.race || ''} ${this.character.class || ''}`.trim();
  }

  _renderContent() {
    switch (this.activeTab) {
      case 'spells':
        this._renderSpells();
        break;
      case 'combat':
        this._renderCombat();
        break;
      case 'abilities':
        this._renderAbilities();
        break;
      case 'traits':
        this._renderTraits();
        break;
      case 'feats':
        this._renderFeats();
        break;
      case 'inventory':
        this._renderInventory();
        break;
    }
  }

  _renderCombat() {
    const panel = document.getElementById('tab-combat');
    const items = [];

    // Add weapons from hotbar
    if (this.character?.hotbar) {
      Object.values(this.character.hotbar).forEach(item => {
        if (item.type === 'weapon' || item.type === 'attack') {
          items.push({ ...item, category: 'weapon' });
        }
      });
    }

    panel.innerHTML = `<div class="sheet-item-list">
      ${items.map((item, idx) => this._renderGenericItem(item, `combat-${idx}`)).join('')}
    </div>`;

    panel.querySelectorAll('.sheet-item').forEach((el, idx) => {
      el.addEventListener('click', () => this._toggleItem(`combat-${idx}`));
    });
  }

  _renderAbilities() {
    const panel = document.getElementById('tab-abilities');
    const abilities = this.character?.abilities || [];

    panel.innerHTML = `<div class="sheet-item-list">
      ${abilities.map((ab, idx) => this._renderGenericItem(ab, `ability-${idx}`)).join('')}
    </div>`;

    panel.querySelectorAll('.sheet-item').forEach((el, idx) => {
      el.addEventListener('click', () => this._toggleItem(`ability-${idx}`));
    });
  }

  _renderTraits() {
    const panel = document.getElementById('tab-traits');
    const traits = this.character?.traits || [];

    panel.innerHTML = `<div class="sheet-item-list">
      ${traits.map((trait, idx) => this._renderGenericItem(trait, `trait-${idx}`)).join('')}
    </div>`;

    panel.querySelectorAll('.sheet-item').forEach((el, idx) => {
      el.addEventListener('click', () => this._toggleItem(`trait-${idx}`));
    });
  }

  _renderFeats() {
    const panel = document.getElementById('tab-feats');
    const feats = this.character?.feats || [];

    panel.innerHTML = `<div class="sheet-item-list">
      ${feats.length ? feats.map((feat, idx) => this._renderGenericItem(feat, `feat-${idx}`)).join('') : '<p style="color: #8B7355; padding: 20px;">No feats</p>'}
    </div>`;

    panel.querySelectorAll('.sheet-item').forEach((el, idx) => {
      el.addEventListener('click', () => this._toggleItem(`feat-${idx}`));
    });
  }

  _renderInventory() {
    const panel = document.getElementById('tab-inventory');
    panel.innerHTML = '<p style="color: #8B7355; padding: 20px;">Inventory coming soon</p>';
  }

  _renderGenericItem(item, itemId) {
    const expanded = this.expandedItems.has(itemId);

    return `
      <div>
        <div class="sheet-item" data-item="${itemId}">
          <div class="sheet-item-icon">${item.icon ? `<img src="${item.icon}" alt="${item.name}" />` : '⚡'}</div>
          <div class="sheet-item-name">${item.name || 'Unnamed'}</div>
          <div class="sheet-item-roll">${item.roll || item.damage || ''}</div>
          <div class="sheet-item-description">${(item.description || item.summary || '').substring(0, 80)}...</div>
        </div>
        ${expanded ? `
          <div class="sheet-item-card">
            <div class="sheet-item-card-header">
              <div class="sheet-item-card-icon">${item.icon ? `<img src="${item.icon}" alt="${item.name}" />` : '⚡'}</div>
              <div>
                <div class="sheet-item-card-title">${item.name}</div>
                <div style="font-size:11px;color:#B8956A;">${item.type || ''} ${item.source ? `• ${item.source}` : ''}</div>
              </div>
            </div>
            <div class="sheet-item-card-body">
              <p>${item.description || item.summary || 'No description available'}</p>
              ${item.mechanics ? `<p style="margin-top:12px;"><strong>Mechanics:</strong> ${JSON.stringify(item.mechanics)}</p>` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}
