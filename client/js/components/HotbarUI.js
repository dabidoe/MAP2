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

      <div class="hotbar-buttons">
        <button class="hotbar-view-sheet-btn" id="hotbar-view-sheet-btn">📋 View Sheet</button>
        <button class="hotbar-customize-btn" id="hotbar-customize-btn">⚙️ Customize</button>
      </div>

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

    // Customize hotbar button
    document.getElementById('hotbar-customize-btn')?.addEventListener('click', () => {
      this._openCustomizeModal();
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
   * Open hotbar customization modal
   */
  _openCustomizeModal() {
    if (!this.currentCharacter) return;

    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'hotbar-customize-modal';
    modal.innerHTML = `
      <div class="customize-modal-content">
        <div class="customize-modal-header">
          <h2>Customize Hotbar - ${this.currentCharacter.name}</h2>
          <button class="customize-close-btn">✕</button>
        </div>
        <div class="customize-modal-body">
          <div class="customize-instructions">
            Click a hotbar slot, then select an ability or spell to assign
          </div>
          <div class="customize-hotbar-preview">
            ${Array.from({ length: 9 }).map((_, i) => {
              const slotNum = i + 1;
              const slotData = this._getCurrentHotbar()[slotNum];
              return `
                <div class="customize-slot" data-slot="${slotNum}">
                  <div class="customize-slot-number">${slotNum}</div>
                  <div class="customize-slot-content">
                    ${slotData ? `
                      ${slotData.icon ? `<img src="${slotData.icon}" alt="${slotData.name}" />` : this._getTypeEmoji(slotData.type)}
                      <div class="customize-slot-name">${slotData.name}</div>
                    ` : '<div class="empty-slot">Empty</div>'}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <div class="customize-available-actions">
            <h3>Available Actions</h3>
            <div class="customize-actions-grid">
              ${this._renderAvailableActions()}
            </div>
          </div>
        </div>
        <div class="customize-modal-footer">
          <button class="customize-reset-btn">Reset to Default</button>
          <button class="customize-save-btn">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Attach event listeners
    modal.querySelector('.customize-close-btn').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('.customize-save-btn').addEventListener('click', () => {
      this._saveCustomHotbar();
      modal.remove();
      this._refreshCharacter();
    });

    modal.querySelector('.customize-reset-btn').addEventListener('click', () => {
      this._resetHotbar();
      modal.remove();
      this._refreshCharacter();
    });

    // Handle slot selection
    let selectedSlot = null;
    modal.querySelectorAll('.customize-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        modal.querySelectorAll('.customize-slot').forEach(s => s.classList.remove('selected'));
        slot.classList.add('selected');
        selectedSlot = parseInt(slot.dataset.slot);
      });
    });

    // Handle action selection
    modal.querySelectorAll('.customize-action-item').forEach(action => {
      action.addEventListener('click', () => {
        if (selectedSlot) {
          this._assignActionToSlot(selectedSlot, JSON.parse(action.dataset.action));
          modal.remove();
          this._openCustomizeModal(); // Reopen to show updated hotbar
        } else {
          alert('Please select a hotbar slot first');
        }
      });
    });
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
   * Get current hotbar configuration (custom or default)
   */
  _getCurrentHotbar() {
    if (!this.currentCharacter) return {};

    // Check for custom hotbar in localStorage
    const customKey = `hotbar_${this.currentCharacter.name}`;
    const customHotbar = localStorage.getItem(customKey);

    if (customHotbar) {
      return JSON.parse(customHotbar);
    }

    // Fall back to default or character's hotbar
    return this.currentCharacter.hotbar || this._generateDefaultHotbar(this.currentCharacter);
  }

  /**
   * Render available actions for customization
   */
  _renderAvailableActions() {
    const actions = [];

    // Add abilities
    if (this.currentCharacter.abilities && Array.isArray(this.currentCharacter.abilities)) {
      this.currentCharacter.abilities.forEach(ability => {
        const abilityRoll = ability.mechanics?.damage || ability.damage || '';
        const parsedRoll = abilityRoll ? this._parseFormula(abilityRoll) : '';

        actions.push({
          name: ability.name,
          type: 'ability',
          icon: ability.icon,
          roll: parsedRoll || abilityRoll,
          summary: ability.summary || ability.description || '',
          description: ability.description
        });
      });
    }

    // Add spells
    if (this.currentCharacter.spells && this.currentCharacter.spells.known) {
      this.currentCharacter.spells.known.forEach(spellRef => {
        const spellId = spellRef.spellId?.$oid || spellRef.spellId;
        if (!spellId || !this.grimoire?.spells) return;

        const spell = this.grimoire.spells.find(s => {
          const sid = s._id?.$oid || s._id || s.spellId?.$oid || s.spellId || s.id;
          return sid === spellId;
        });

        if (spell) {
          const parsedRoll = spell.damage ? this._parseFormula(spell.damage) : '';
          actions.push({
            name: spell.name,
            type: 'spell',
            icon: spell.icon,
            roll: parsedRoll || spell.damage || '',
            summary: spell.summary || spell.description || '',
            description: spell.description
          });
        }
      });
    }

    // Add feats (optional)
    if (this.currentCharacter.feats && Array.isArray(this.currentCharacter.feats)) {
      this.currentCharacter.feats.forEach(feat => {
        actions.push({
          name: feat.name,
          type: 'feat',
          icon: feat.icon,
          roll: '',
          summary: feat.summary || feat.description || '',
          description: feat.description
        });
      });
    }

    return actions.map(action => `
      <div class="customize-action-item" data-action='${JSON.stringify(action)}'>
        <div class="action-icon">
          ${action.icon ? `<img src="${action.icon}" alt="${action.name}" />` : this._getTypeEmoji(action.type)}
        </div>
        <div class="action-info">
          <div class="action-name">${action.name}</div>
          <div class="action-type">${action.type}</div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Assign action to hotbar slot
   */
  _assignActionToSlot(slotNumber, action) {
    const customKey = `hotbar_${this.currentCharacter.name}`;
    const hotbar = this._getCurrentHotbar();
    hotbar[slotNumber] = action;
    localStorage.setItem(customKey, JSON.stringify(hotbar));
  }

  /**
   * Save custom hotbar
   */
  _saveCustomHotbar() {
    // Already saved via _assignActionToSlot
    console.log('Hotbar customization saved');
  }

  /**
   * Reset hotbar to default
   */
  _resetHotbar() {
    const customKey = `hotbar_${this.currentCharacter.name}`;
    localStorage.removeItem(customKey);
    console.log('Hotbar reset to default');
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

    // Use custom hotbar if exists, otherwise use default
    const hotbar = this._getCurrentHotbar();

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

    // Slots 3-9: Fill with abilities and spells
    let slotIndex = 3;

    // Add abilities first (active abilities with damage/effects)
    if (character.abilities && Array.isArray(character.abilities)) {
      for (const ability of character.abilities) {
        if (slotIndex > 9) break;

        // Parse formula for abilities too
        const abilityRoll = ability.mechanics?.damage || ability.damage || '';
        const parsedRoll = abilityRoll ? this._parseFormula(abilityRoll) : '';

        hotbar[slotIndex] = {
          name: ability.name,
          type: 'ability',
          icon: ability.icon || null,
          roll: parsedRoll || abilityRoll,
          summary: ability.summary || ability.description || '',
          description: ability.description
        };
        slotIndex++;
      }
    }

    // Add spells (fill remaining slots)
    if (character.spells && character.spells.known && character.spells.known.length > 0) {
      // Get remaining spell slots for hotbar
      const spellsToAdd = character.spells.known.slice(0, Math.min(7, 9 - slotIndex + 1));

      for (const spellRef of spellsToAdd) {
        if (slotIndex > 9) break;

        // Get spell ID from ObjectID reference
        const spellId = spellRef.spellId?.$oid || spellRef.spellId;

        if (!spellId) {
          console.warn('Spell reference missing ID');
          continue;
        }

        // Find spell in Grimoire by matching ObjectID
        let spellData = null;
        if (this.grimoire && this.grimoire.spells && this.grimoire.spells.length > 0) {
          spellData = this.grimoire.spells.find(s => {
            const sid = s._id?.$oid || s._id || s.spellId?.$oid || s.spellId || s.id;
            return sid === spellId;
          });

          if (!spellData) {
            console.warn(`Spell ${spellId} not found in Grimoire`);
            continue;
          }
        } else {
          console.warn('Grimoire not available');
          continue;
        }

        // Parse formula to replace text modifiers with actual values
        const parsedRoll = spellData.damage ? this._parseFormula(spellData.damage) : '';

        hotbar[slotIndex] = {
          name: spellData.name || 'Unknown Spell',
          type: 'spell',
          icon: spellData.icon || null,
          roll: parsedRoll || spellData.damage || '',
          summary: spellData.summary || spellData.description || '',
          description: spellData.description || ''
        };
        slotIndex++;
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
   * Get spellcasting modifier for character based on class
   */
  _getSpellcastingModifier() {
    if (!this.currentCharacter || !this.currentCharacter.attributes) return 0;

    const charClass = this.currentCharacter.class?.toLowerCase() || '';
    const attrs = this.currentCharacter.attributes;

    // Map class to spellcasting ability
    const spellcastingAbility = {
      'bard': 'cha',
      'cleric': 'wis',
      'druid': 'wis',
      'paladin': 'cha',
      'ranger': 'wis',
      'sorcerer': 'cha',
      'warlock': 'cha',
      'wizard': 'int',
      'artificer': 'int'
    }[charClass];

    if (!spellcastingAbility) return 0;

    const abilityScore = attrs[spellcastingAbility] || 10;
    return Math.floor((abilityScore - 10) / 2);
  }

  /**
   * Parse damage formula and replace text modifiers with actual values
   */
  _parseFormula(formulaString) {
    if (!formulaString || typeof formulaString !== 'string') return '';

    let formula = formulaString.trim();

    // Remove descriptive text like "healing", "damage", etc.
    formula = formula.replace(/\s*(healing|damage|fire|cold|lightning|poison|acid|psychic|necrotic|radiant|force|thunder).*$/i, '');

    // Replace "your spellcasting modifier" or "spellcasting modifier"
    const spellMod = this._getSpellcastingModifier();
    formula = formula.replace(/your\s+spellcasting\s+modifier/gi, spellMod.toString());
    formula = formula.replace(/spellcasting\s+modifier/gi, spellMod.toString());

    // Replace ability modifiers if present
    const attrs = this.currentCharacter?.attributes || {};
    const replacements = {
      'strength modifier': Math.floor((attrs.str - 10) / 2),
      'dexterity modifier': Math.floor((attrs.dex - 10) / 2),
      'constitution modifier': Math.floor((attrs.con - 10) / 2),
      'intelligence modifier': Math.floor((attrs.int - 10) / 2),
      'wisdom modifier': Math.floor((attrs.wis - 10) / 2),
      'charisma modifier': Math.floor((attrs.cha - 10) / 2),
      'str modifier': Math.floor((attrs.str - 10) / 2),
      'dex modifier': Math.floor((attrs.dex - 10) / 2),
      'con modifier': Math.floor((attrs.con - 10) / 2),
      'int modifier': Math.floor((attrs.int - 10) / 2),
      'wis modifier': Math.floor((attrs.wis - 10) / 2),
      'cha modifier': Math.floor((attrs.cha - 10) / 2)
    };

    for (const [text, value] of Object.entries(replacements)) {
      const regex = new RegExp(text, 'gi');
      formula = formula.replace(regex, value.toString());
    }

    // Clean up extra spaces around operators
    formula = formula.replace(/\s*\+\s*/g, '+').replace(/\s*-\s*/g, '-');

    // Extract just the dice formula (XdY±Z format)
    const match = formula.match(/(\d+d\d+(?:[+-]\d+)?)/i);
    return match ? match[1] : '';
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

    // Weapon/Attack: Roll to-hit and damage
    if (slotData.type === 'weapon' || slotData.type === 'attack') {
      const isRanged = slotData.name.toLowerCase().includes('bow') || slotData.name.toLowerCase().includes('ranged');
      const attackMod = isRanged
        ? (this.currentCharacter?.attributes?.dex ? Math.floor((this.currentCharacter.attributes.dex - 10) / 2) : 0)
        : (this.currentCharacter?.attributes?.str ? Math.floor((this.currentCharacter.attributes.str - 10) / 2) : 0);

      this.dashboard._addConsoleMessage('action', `⚔️ ${characterName} attacks with ${slotData.name}!`);

      // Roll to-hit
      const toHitRoll = `1d20${attackMod >= 0 ? '+' : ''}${attackMod}`;
      this.dashboard._rollDice(toHitRoll, 'To Hit');

      // Roll damage if available
      if (slotData.roll && slotData.roll.trim() !== '') {
        this.dashboard._rollDice(slotData.roll, 'Damage');
      }
    }
    // Special case: Lay on Hands (level-based healing pool)
    else if (slotData.type === 'ability' && slotData.name.toLowerCase().includes('lay on hands')) {
      const level = this.currentCharacter?.level || 1;
      const healingPool = level * 5;
      const defaultHeal = Math.min(10, healingPool); // Heal 10 HP by default or pool max

      this.dashboard._addConsoleMessage('action', `✨ ${characterName} uses ${slotData.name}!`);
      this.dashboard._addConsoleMessage('healing', `💚 Restores ${defaultHeal} HP (Pool: ${healingPool} HP available)`);
    }
    // Ability with roll/damage
    else if (slotData.type === 'ability' && slotData.roll && slotData.roll.trim() !== '' && slotData.roll !== 'None') {
      this.dashboard._addConsoleMessage('action', `✨ ${characterName} uses ${slotData.name}!`);
      const parsedFormula = this._parseFormula(slotData.roll);
      if (parsedFormula) {
        this.dashboard._rollDice(parsedFormula, slotData.name);
      } else {
        // If no dice formula found, just show the description
        if (slotData.summary) {
          this.dashboard._addConsoleMessage('system', `📖 ${slotData.summary}`);
        }
      }
    }
    // Spell with roll/damage
    else if (slotData.type === 'spell' && slotData.roll && slotData.roll.trim() !== '' && slotData.roll !== 'None') {
      this.dashboard._addConsoleMessage('action', `🔮 ${characterName} casts ${slotData.name}!`);
      const parsedFormula = this._parseFormula(slotData.roll);
      if (parsedFormula) {
        const isHealing = slotData.roll.toLowerCase().includes('healing');
        const label = isHealing ? `${slotData.name} Healing` : `${slotData.name} Damage`;
        this.dashboard._rollDice(parsedFormula, label);
      } else {
        // If no dice formula, just show effect description
        if (slotData.summary) {
          this.dashboard._addConsoleMessage('system', `📖 ${slotData.summary}`);
        }
      }
    }
    // Feat with roll/damage
    else if (slotData.type === 'feat' && slotData.roll && slotData.roll.trim() !== '' && slotData.roll !== 'None') {
      this.dashboard._addConsoleMessage('action', `⭐ ${characterName} uses ${slotData.name}!`);
      const parsedFormula = this._parseFormula(slotData.roll);
      if (parsedFormula) {
        this.dashboard._rollDice(parsedFormula, slotData.name);
      } else {
        if (slotData.summary) {
          this.dashboard._addConsoleMessage('system', `📖 ${slotData.summary}`);
        }
      }
    }
    // No roll - just activation with description
    else {
      const emoji = {
        'ability': '✨',
        'spell': '🔮',
        'feat': '⭐',
        'trait': '🛡️'
      }[slotData.type] || '✨';

      this.dashboard._addConsoleMessage('action', `${emoji} ${characterName} activates ${slotData.name}!`);
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
