/**
 * HotbarUI Component
 * Dynamic 3x3 action grid with hover cards
 * Implements the "Just-In-Time" reference system
 */

export class HotbarUI {
  constructor(gameState, dashboard, grimoire = null) {
    this.gameState = gameState;
    this.dashboard = dashboard;
    this.grimoire = grimoire;
    this.currentCharacter = null;
    this.hoverTimeout = null;
    this.hoverCard = null;

    // Type to border color mapping
    this.typeColors = {
      weapon: '#8B0000',      // Dark red
      ability: '#FFD700',     // Gold
      spell: '#4169E1',       // Royal blue
      trait: '#32CD32',       // Lime green
      feat: '#9370DB',        // Medium purple
      attack: '#DC143C',      // Crimson
      menu: '#708090'         // Slate gray
    };

    this.elements = {
      container: null,
      portrait: null,
      characterName: null,
      hpCurrent: null,
      hpMax: null,
      ac: null,
      initiative: null,
      grid: null,
      hoverCard: null
    };

    this._init();
  }

  /**
   * Initialize component
   */
  _init() {
    this._createHTML();
    this._attachEventListeners();
    console.log('✅ HotbarUI initialized');
  }

  /**
   * Create HTML structure
   */
  _createHTML() {
    // Create main container
    const container = document.createElement('div');
    container.id = 'hotbar-ui';
    container.className = 'hotbar-ui';
    container.style.display = 'none'; // Hidden until character selected

    container.innerHTML = `
      <button class="hotbar-close-btn" id="hotbar-close-btn" title="Close">✕</button>
      <div class="hotbar-header">
        <div class="character-portrait-container">
          <img id="hotbar-portrait" class="character-portrait" src="" alt="Character" />
        </div>
        <div class="character-info">
          <div class="character-name" id="hotbar-character-name">Select Character</div>
          <div class="character-stats">
            <div class="stat-group">
              <span class="stat-label">HP:</span>
              <span class="stat-value"><span id="hotbar-hp-current">0</span>/<span id="hotbar-hp-max">0</span></span>
            </div>
            <div class="stat-group">
              <span class="stat-label">AC:</span>
              <span class="stat-value" id="hotbar-ac">0</span>
            </div>
            <div class="stat-group">
              <span class="stat-label">INIT:</span>
              <span class="stat-value" id="hotbar-initiative">+0</span>
            </div>
          </div>
        </div>
      </div>

      <div class="hotbar-grid" id="hotbar-grid">
        ${this._generateGridSlots()}
      </div>

      <button class="hotbar-view-sheet-btn" id="hotbar-view-sheet-btn">📋 View Full Sheet</button>

      <!-- Hover Card (hidden by default) -->
      <div id="hotbar-hover-card" class="hotbar-hover-card" style="display: none;">
        <div class="hover-card-header">
          <div class="hover-card-icon"></div>
          <div class="hover-card-title"></div>
        </div>
        <div class="hover-card-roll"></div>
        <div class="hover-card-summary"></div>
        <div class="hover-card-footer">Click for details</div>
      </div>
    `;

    document.body.appendChild(container);

    // Store element references
    this.elements.container = container;
    this.elements.portrait = document.getElementById('hotbar-portrait');
    this.elements.characterName = document.getElementById('hotbar-character-name');
    this.elements.hpCurrent = document.getElementById('hotbar-hp-current');
    this.elements.hpMax = document.getElementById('hotbar-hp-max');
    this.elements.ac = document.getElementById('hotbar-ac');
    this.elements.initiative = document.getElementById('hotbar-initiative');
    this.elements.grid = document.getElementById('hotbar-grid');
    this.elements.hoverCard = document.getElementById('hotbar-hover-card');
  }

  /**
   * Generate 3x3 grid slots
   */
  _generateGridSlots() {
    let html = '';
    for (let i = 1; i <= 9; i++) {
      html += `
        <div class="hotbar-slot" data-slot="${i}">
          <div class="slot-frame">
            <div class="slot-content">
              <div class="slot-icon"></div>
              <div class="slot-name">Empty</div>
            </div>
          </div>
        </div>
      `;
    }
    return html;
  }

  /**
   * Attach event listeners
   */
  _attachEventListeners() {
    // Subscribe to game state
    this.gameState.on('tokenSelect', (token) => {
      this._onCharacterSelect(token);
    });

    this.gameState.on('charactersLoaded', () => {
      if (this.currentCharacter) {
        this._refreshCharacter();
      }
    });

    // Close button
    document.getElementById('hotbar-close-btn')?.addEventListener('click', () => {
      this.hide();
    });

    // View full sheet button
    document.getElementById('hotbar-view-sheet-btn')?.addEventListener('click', () => {
      this._openCharacterSheet();
    });
  }

  /**
   * Open character sheet modal
   */
  _openCharacterSheet() {
    if (!this.currentCharacter) return;

    // Trigger new tabbed character sheet
    const event = new CustomEvent('openCharacterSheet', {
      detail: { character: this.currentCharacter }
    });
    window.dispatchEvent(event);
  }

  /**
   * Handle character selection
   */
  async _onCharacterSelect(token) {
    if (!token) {
      this.hide();
      return;
    }

    console.log('Hotbar: Loading character', token.name);

    // Fetch character data with expanded references
    try {
      const response = await fetch(`/api/characters/name/${encodeURIComponent(token.name)}?expand=true`);
      if (!response.ok) {
        console.warn('Character not found:', token.name);
        return;
      }

      const character = await response.json();
      this.currentCharacter = character;
      this._renderCharacter(character);
      this.show();

    } catch (error) {
      console.error('Failed to load character:', error);
    }
  }

  /**
   * Render character to hotbar
   */
  _renderCharacter(character) {
    // Update portrait
    if (character.icon) {
      this.elements.portrait.src = character.icon;
      this.elements.portrait.style.display = 'block';
    }

    // Update name
    this.elements.characterName.textContent = character.name || 'Unknown';

    // Update stats
    this.elements.hpCurrent.textContent = character.hp?.current || 0;
    this.elements.hpMax.textContent = character.hp?.max || 0;
    this.elements.ac.textContent = character.ac || 0;
    this.elements.initiative.textContent = character.initiative >= 0
      ? `+${character.initiative}`
      : character.initiative;

    // Use existing hotbar or generate default
    const hotbar = character.hotbar || this._generateDefaultHotbar(character);

    // Render hotbar slots
    this._renderHotbar(hotbar);
  }

  /**
   * Generate default hotbar based on character class and abilities
   */
  _generateDefaultHotbar(character) {
    console.log('Generating default hotbar for:', character.name);
    const hotbar = {};
    const strMod = character.attributes?.str ? Math.floor((character.attributes.str - 10) / 2) : 0;
    const dexMod = character.attributes?.dex ? Math.floor((character.attributes.dex - 10) / 2) : 0;

    // Slot 1: Melee Attack
    hotbar[1] = {
      name: character.class === 'Fighter' ? 'Longsword' : 'Melee Attack',
      type: 'weapon',
      icon: null, // Will show emoji fallback
      roll: `1d8+${strMod}`,
      summary: 'Standard melee weapon attack'
    };

    // Slot 2: Ranged Attack
    hotbar[2] = {
      name: character.class === 'Fighter' || character.class === 'Ranger' ? 'Longbow' : 'Ranged Attack',
      type: 'weapon',
      icon: null, // Will show emoji fallback
      roll: `1d8+${dexMod}`,
      summary: 'Standard ranged weapon attack'
    };

    // Slots 3-9: Fill with abilities, feats, and spells
    let slotIndex = 3;

    // Add feats first
    if (character.feats && Array.isArray(character.feats)) {
      for (const feat of character.feats.slice(0, 3)) {
        if (slotIndex > 9) break;
        hotbar[slotIndex] = {
          name: feat.name,
          type: 'feat',
          icon: feat.icon || null,
          roll: '',
          summary: feat.summary || feat.description || '',
          description: feat.description
        };
        slotIndex++;
      }
    }

    // Add abilities
    if (character.abilities && Array.isArray(character.abilities)) {
      for (const ability of character.abilities) {
        if (slotIndex > 9) break;
        hotbar[slotIndex] = {
          name: ability.name,
          type: 'ability',
          icon: ability.icon || null,
          roll: ability.mechanics?.damage || '',
          summary: ability.summary || ability.description || '',
          description: ability.description
        };
        slotIndex++;
      }
    }

    // Add spells (if spellcaster)
    if (character.spellbook) {
      const spellLevels = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
      for (const level of spellLevels) {
        if (slotIndex > 9) break;
        const spells = character.spellbook[level];
        if (spells && spells.length > 0) {
          const charSpell = spells[0];

          // Character spell is already expanded by server API
          let spellData = charSpell;

          // Try grimoire lookup for better data if needed
          if (this.grimoire && this.grimoire.spells && this.grimoire.spells.length > 0) {
            const spellName = typeof charSpell === 'string' ? charSpell : charSpell.name;
            const fullSpell = this.grimoire.spells.find(s => s.name === spellName);
            if (fullSpell) {
              console.log(`Found ${spellName} in Grimoire with icon:`, fullSpell.icon);
              spellData = fullSpell;
            } else {
              console.warn(`Spell ${spellName} not found in Grimoire (${this.grimoire.spells.length} spells loaded)`);
            }
          } else {
            console.warn('Grimoire not available or spells not loaded');
          }

          hotbar[slotIndex] = {
            name: spellData.name || 'Unknown Spell',
            type: 'spell',
            icon: spellData.icon || null,
            roll: spellData.damage || '',
            summary: spellData.summary || spellData.description || '',
            description: spellData.description || ''
          };
          slotIndex++;
        }
      }
    }

    // Add passive traits to remaining slots
    if (character.passiveTraits && Array.isArray(character.passiveTraits)) {
      for (const trait of character.passiveTraits) {
        if (slotIndex > 9) break;
        hotbar[slotIndex] = {
          name: trait.name,
          type: 'trait',
          icon: trait.icon || null,
          roll: '',
          summary: trait.summary || trait.description || '',
          description: trait.description
        };
        slotIndex++;
      }
    }

    console.log('Generated hotbar:', hotbar);
    return hotbar;
  }

  /**
   * Render hotbar grid
   */
  _renderHotbar(hotbar) {
    if (!hotbar) {
      console.warn('No hotbar data for character');
      return;
    }

    const slots = this.elements.grid.querySelectorAll('.hotbar-slot');

    slots.forEach((slotElement, index) => {
      const slotNumber = index + 1;
      const slotData = hotbar[slotNumber];

      if (!slotData) {
        // Empty slot
        this._renderEmptySlot(slotElement);
        return;
      }

      this._renderFilledSlot(slotElement, slotData, slotNumber);
    });
  }

  /**
   * Render empty slot
   */
  _renderEmptySlot(slotElement) {
    const frame = slotElement.querySelector('.slot-frame');
    const icon = slotElement.querySelector('.slot-icon');
    const name = slotElement.querySelector('.slot-name');

    frame.style.borderColor = '#333';
    icon.style.backgroundImage = '';
    icon.textContent = '';
    name.textContent = 'Empty';

    slotElement.classList.remove('filled');
    slotElement.dataset.type = '';
  }

  /**
   * Render filled slot
   */
  _renderFilledSlot(slotElement, slotData, slotNumber) {
    const frame = slotElement.querySelector('.slot-frame');
    const icon = slotElement.querySelector('.slot-icon');
    const name = slotElement.querySelector('.slot-name');

    // Set border color based on type
    const borderColor = this.typeColors[slotData.type] || '#888';
    frame.style.borderColor = borderColor;

    // Set icon using img tag (like Grimoire)
    const iconUrl = slotData.icon;
    console.log(`Slot ${slotNumber} (${slotData.name}) icon:`, iconUrl);
    if (iconUrl && iconUrl.startsWith('http')) {
      icon.innerHTML = `<img src="${iconUrl}" alt="${slotData.name}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />`;
    } else {
      icon.innerHTML = '';
      icon.textContent = this._getTypeEmoji(slotData.type);
    }

    // Set name
    name.textContent = slotData.name || 'Unknown';

    // Add filled class
    slotElement.classList.add('filled');
    slotElement.dataset.type = slotData.type;
    slotElement.dataset.slot = slotNumber;

    // Attach hover and click handlers
    this._attachSlotHandlers(slotElement, slotData);
  }

  /**
   * Attach hover and click handlers to slot
   */
  _attachSlotHandlers(slotElement, slotData) {
    // Mouse enter - start hover timer
    slotElement.onmouseenter = (e) => {
      this._startHoverTimer(e, slotData);
    };

    // Mouse leave - cancel hover timer and hide card
    slotElement.onmouseleave = () => {
      this._cancelHoverTimer();
      this._hideHoverCard();
    };

    // Click - execute action
    slotElement.onclick = () => {
      this._executeSlotAction(slotData);
    };
  }

  /**
   * Start hover timer (2 seconds)
   */
  _startHoverTimer(event, slotData) {
    this._cancelHoverTimer();

    this.hoverTimeout = setTimeout(() => {
      this._showHoverCard(event, slotData);
    }, 500); // 500ms hover delay
  }

  /**
   * Cancel hover timer
   */
  _cancelHoverTimer() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
  }

  /**
   * Show hover card
   */
  _showHoverCard(event, slotData) {
    const card = this.elements.hoverCard;
    const iconEl = card.querySelector('.hover-card-icon');
    const titleEl = card.querySelector('.hover-card-title');
    const rollEl = card.querySelector('.hover-card-roll');
    const summaryEl = card.querySelector('.hover-card-summary');

    // Populate card with img tag
    const iconUrl = slotData.icon;
    if (iconUrl && iconUrl.startsWith('http')) {
      iconEl.innerHTML = `<img src="${iconUrl}" alt="${slotData.name}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />`;
    } else {
      iconEl.innerHTML = '';
      iconEl.textContent = this._getTypeEmoji(slotData.type);
    }

    titleEl.textContent = slotData.name;
    rollEl.textContent = slotData.roll || '';
    summaryEl.textContent = slotData.summary || slotData.description || 'Click for full details';

    // Position card near cursor
    const rect = event.target.closest('.hotbar-slot').getBoundingClientRect();
    card.style.left = `${rect.right + 10}px`;
    card.style.top = `${rect.top}px`;
    card.style.display = 'block';
  }

  /**
   * Hide hover card
   */
  _hideHoverCard() {
    this.elements.hoverCard.style.display = 'none';
  }

  /**
   * Execute slot action
   */
  _executeSlotAction(slotData) {
    if (slotData.type === 'menu') {
      this._openSpellbook();
      return;
    }

    const characterName = this.currentCharacter?.name || 'Character';

    if (!this.dashboard) {
      console.error('Dashboard not available');
      return;
    }

    console.log('Executing action:', slotData);

    // Weapon/Attack: Show to-hit and damage, but don't auto-roll
    if (slotData.type === 'weapon' || slotData.type === 'attack') {
      const attackMod = slotData.name.toLowerCase().includes('bow') || slotData.name.toLowerCase().includes('ranged')
        ? (this.currentCharacter?.attributes?.dex ? Math.floor((this.currentCharacter.attributes.dex - 10) / 2) : 0)
        : (this.currentCharacter?.attributes?.str ? Math.floor((this.currentCharacter.attributes.str - 10) / 2) : 0);

      this.dashboard._addConsoleMessage('action', `⚔️ ${characterName} attacks with ${slotData.name}!`);
      this.dashboard._addConsoleMessage('system', `To Hit: d20+${attackMod} | Damage: ${slotData.roll}`);
    }
    // Spell/Ability with roll
    else if (slotData.roll && slotData.roll.trim() !== '' && slotData.roll !== 'None') {
      this.dashboard._addConsoleMessage('action', `✨ ${characterName} casts ${slotData.name}!`);
      this.dashboard._rollDice(slotData.roll);
    }
    // No roll - just description
    else {
      this.dashboard._addConsoleMessage('action', `✨ ${characterName} activates ${slotData.name}!`);
      if (slotData.summary && slotData.summary.trim() !== '') {
        this.dashboard._addConsoleMessage('system', `📖 ${slotData.summary}`);
      }
    }
  }

  /**
   * Open spellbook menu
   */
  _openSpellbook() {
    console.log('Opening spellbook...');
    // TODO: Implement spellbook overlay
    alert('Spellbook functionality coming soon!');
  }

  /**
   * Get emoji for ability type
   */
  _getTypeEmoji(type) {
    const emojis = {
      weapon: '⚔️',
      ability: '✨',
      spell: '🔮',
      trait: '🛡️',
      feat: '⭐',
      attack: '💥',
      menu: '📖'
    };
    return emojis[type] || '❓';
  }

  /**
   * Refresh character data
   */
  async _refreshCharacter() {
    if (!this.currentCharacter) return;
    await this._onCharacterSelect({ name: this.currentCharacter.name });
  }

  /**
   * Show hotbar
   */
  show() {
    this.elements.container.style.display = 'block';
  }

  /**
   * Hide hotbar
   */
  hide() {
    this.elements.container.style.display = 'none';
    this.currentCharacter = null;
  }
}
