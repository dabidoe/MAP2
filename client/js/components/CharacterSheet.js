/**
 * CharacterSheet - Clean, spacious design
 */

export class CharacterSheet {
  constructor(grimoire = null, dashboard = null) {
    this.character = null;
    this.grimoire = grimoire;
    this.dashboard = dashboard;
    this.spellSlots = {};
    this.activeSpellTab = 0;

    this.elements = {};
    this._init();
  }

  _init() {
    this._createHTML();
    this._attachEventListeners();
  }

  _createHTML() {
    const modal = document.createElement('div');
    modal.className = 'character-sheet-modal';

    modal.innerHTML = `
      <div class="character-sheet-container">
        <!-- Header -->
        <div class="sheet-header">
          <button class="sheet-header-close">✕</button>
          <h1 class="sheet-title" id="sheet-title">Character Name</h1>
          <div class="sheet-subtitle" id="sheet-subtitle"></div>
        </div>

        <!-- Content -->
        <div class="sheet-content">
          <div class="sheet-grid">
            <!-- Left Column -->
            <div class="sheet-col-left" id="sheet-col-left"></div>

            <!-- Center Column -->
            <div class="sheet-col-center" id="sheet-col-center"></div>

            <!-- Right Column -->
            <div class="sheet-col-right" id="sheet-col-right"></div>
          </div>
        </div>

        <!-- Dice Roller -->
        <div class="dice-roller" id="dice-roller"></div>
      </div>
    `;

    document.body.appendChild(modal);
    this.elements.modal = modal;
  }

  _attachEventListeners() {
    this.elements.modal.querySelector('.sheet-header-close').addEventListener('click', () => this.close());
  }

  open(character) {
    this.character = character;
    this._initializeSpellSlots();
    this._populateHeader();
    this._renderLeftColumn();
    this._renderCenterColumn();
    this._renderRightColumn();
    this.elements.modal.classList.add('active');
  }

  close() {
    this.elements.modal.classList.remove('active');
    this.character = null;
    this.spellSlots = {};
    this.activeSpellTab = 0;
  }

  _initializeSpellSlots() {
    const slots = this.character?.spells?.slots || [];
    this.spellSlots = {};

    slots.forEach(slot => {
      this.spellSlots[slot.level] = {
        max: slot.total,
        used: slot.used || 0
      };
    });
  }

  _populateHeader() {
    document.getElementById('sheet-title').textContent = this.character.name || 'Character';

    const classDisplay = this.character.subclass
      ? `${this.character.class || 'Unknown'} (${this.character.subclass})`
      : (this.character.class || 'Unknown');

    const subtitleHTML = `
      <span class="sheet-subtitle-race">${this.character.race || 'Unknown'}</span>
      <span class="sheet-subtitle-dot"></span>
      <span class="sheet-subtitle-class">${classDisplay}</span>
      <span class="sheet-subtitle-dot"></span>
      <span class="sheet-subtitle-level">LEVEL ${this.character.level || 1}</span>
    `;
    document.getElementById('sheet-subtitle').innerHTML = subtitleHTML;
  }

  _renderLeftColumn() {
    const container = document.getElementById('sheet-col-left');
    const feats = this.character?.feats || [];

    container.innerHTML = `
      ${this._renderCombatStats()}
      ${this._renderStatBlock()}
      ${this._renderSkills()}

      ${feats.length > 0 ? `
        <div class="cs-section">
          <h3 class="cs-section-title">ABILITIES</h3>
          <div class="cs-scrollable-content">
            ${feats.map(feat => `
              <div class="cs-ability-card">
                ${feat.icon ? `<img src="${feat.icon}" class="cs-ability-icon" alt="${feat.name}" />` : ''}
                <div class="cs-ability-info">
                  <div class="cs-ability-name">${feat.name}</div>
                  ${feat.summary ? `<div class="cs-ability-summary">${feat.summary}</div>` : ''}
                  ${feat.description ? `<div class="cs-ability-desc">${feat.description}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;

    // Attach click handlers
    document.querySelectorAll('.stat-box').forEach(box => {
      box.addEventListener('click', () => {
        const stat = box.dataset.stat;
        const modifier = box.dataset.modifier;
        this._rollDice(`1d20${modifier}`, `${stat} Check`);
      });
    });

    document.querySelectorAll('.skill-item').forEach(item => {
      item.addEventListener('click', () => {
        const skill = item.dataset.skill;
        const modifier = item.dataset.modifier;
        this._rollDice(`1d20${modifier}`, skill);
      });
    });

    const initiativeBox = document.getElementById('initiative-box');
    if (initiativeBox) {
      initiativeBox.addEventListener('click', () => {
        const modifier = initiativeBox.dataset.modifier;
        this._rollDice(`1d20${modifier}`, 'Initiative');
      });
    }
  }

  _renderCombatStats() {
    const hp = this.character?.hp || { current: 0, max: 0 };
    const ac = this.character?.ac || 0;
    const dex = this.character?.attributes?.dex || 10;
    const initiative = Math.floor((dex - 10) / 2);
    const formatMod = (mod) => mod >= 0 ? `+${mod}` : `${mod}`;

    return `
      <div class="cs-section">
        <h3 class="cs-section-title">COMBAT STATS</h3>
        <div class="cs-hp-display">
          <div class="cs-hp-label">Hit Points</div>
          <div class="cs-hp-value">${hp.current} / ${hp.max}</div>
          <div class="cs-hp-bar">
            <div class="cs-hp-fill" style="width: ${(hp.current / hp.max) * 100}%"></div>
          </div>
        </div>
        <div class="cs-stat-row">
          <div class="cs-stat-box">
            <div class="cs-stat-label">AC</div>
            <div class="cs-stat-value">${ac}</div>
          </div>
          <div class="cs-stat-box cs-clickable" id="initiative-box" data-modifier="${formatMod(initiative)}">
            <div class="cs-stat-label">INIT</div>
            <div class="cs-stat-value">${formatMod(initiative)}</div>
          </div>
        </div>
      </div>
    `;
  }

  _renderSpellSlotsTracker() {
    const levels = Object.keys(this.spellSlots).map(Number).sort((a, b) => a - b);
    if (levels.length === 0) return '';

    return `
      <div class="cs-section">
        <h3 class="cs-section-title">SPELL SLOTS</h3>
        ${levels.map(level => {
          const slots = this.spellSlots[level];
          const available = slots.max - slots.used;
          return `
            <div class="cs-slot-row">
              <div class="cs-slot-label">Level ${level}</div>
              <div class="cs-slot-count">${available} / ${slots.max}</div>
              <div class="cs-slot-dots">
                ${Array.from({ length: slots.max }).map((_, index) => {
                  const isUsed = index < slots.used;
                  return `<div class="spell-slot-dot ${isUsed ? 'used' : 'available'}" data-level="${level}" data-index="${index}"></div>`;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  _renderStatBlock() {
    const attrs = this.character?.attributes || {};
    const getMod = (score) => Math.floor((score - 10) / 2);
    const formatMod = (mod) => mod >= 0 ? `+${mod}` : `${mod}`;

    const stats = [
      { label: 'STR', value: attrs.str || 10 },
      { label: 'DEX', value: attrs.dex || 10 },
      { label: 'CON', value: attrs.con || 10 },
      { label: 'INT', value: attrs.int || 10 },
      { label: 'WIS', value: attrs.wis || 10 },
      { label: 'CHA', value: attrs.cha || 10 }
    ];

    return `
      <div class="cs-section">
        <h3 class="cs-section-title">ABILITY SCORES</h3>
        <div class="cs-ability-grid">
          ${stats.map(stat => {
            const modifier = getMod(stat.value);
            return `
              <div class="stat-box" data-stat="${stat.label}" data-modifier="${formatMod(modifier)}">
                <div class="stat-label">${stat.label}</div>
                <div class="stat-value">${stat.value}</div>
                <div class="stat-modifier">${formatMod(modifier)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  _renderSkills() {
    const skills = this.character?.skills || [];
    const formatMod = (mod) => mod >= 0 ? `+${mod}` : `${mod}`;

    return `
      <div class="cs-section">
        <h3 class="cs-section-title">SKILLS</h3>
        <div class="cs-skill-list">
          ${skills.map(skill => `
            <div class="skill-item" data-skill="${skill.name}" data-modifier="${formatMod(skill.modifier)}">
              <span class="skill-prof">${skill.proficient ? '◆' : '○'}</span>
              <span class="skill-name">${skill.name}</span>
              <span class="skill-mod">${formatMod(skill.modifier)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  _renderCenterColumn() {
    const container = document.getElementById('sheet-col-center');
    const spells = this._getSpellsByLevel();
    const levels = Object.keys(spells).map(Number).sort((a, b) => a - b);

    console.log('Rendering center column. Levels:', levels);
    console.log('Active spell tab:', this.activeSpellTab);

    const hasSpells = levels.length > 0;

    // Set active tab to first available level if not set
    if (hasSpells && !levels.includes(this.activeSpellTab)) {
      this.activeSpellTab = levels[0];
      console.log('Setting active tab to first level:', this.activeSpellTab);
    }

    const activeSpells = hasSpells ? (spells[this.activeSpellTab] || []) : [];
    const activeSlots = hasSpells ? this.spellSlots[this.activeSpellTab] : null;
    console.log('Spells for active tab:', activeSpells.length, activeSpells);

    container.innerHTML = `
      ${hasSpells ? `
        <div class="cs-section">
          <h3 class="cs-section-title">SPELLS</h3>
          <div class="cs-spell-tabs">
            ${levels.map(level => {
              const slots = this.spellSlots[level];
              const slotDisplay = slots ? `<div class="cs-tab-slots">${Array.from({ length: slots.max }).map((_, i) =>
                `<div class="cs-tab-dot ${i < slots.used ? 'used' : ''}"></div>`
              ).join('')}</div>` : '';

              return `
                <button class="cs-spell-tab ${this.activeSpellTab === level ? 'active' : ''}" data-level="${level}">
                  <span>${level === 0 ? 'Cantrips' : `Level ${level}`}</span>
                  ${slotDisplay}
                </button>
              `;
            }).join('')}
          </div>

          ${activeSlots ? `
            <div class="cs-slot-row-inline">
              <div class="cs-slot-label">Level ${this.activeSpellTab}</div>
              <div class="cs-slot-count">${activeSlots.max - activeSlots.used} / ${activeSlots.max}</div>
              <div class="cs-slot-dots">
                ${Array.from({ length: activeSlots.max }).map((_, index) => {
                  const isUsed = index < activeSlots.used;
                  return `<div class="spell-slot-dot ${isUsed ? 'used' : 'available'}" data-level="${this.activeSpellTab}" data-index="${index}"></div>`;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <div class="cs-spell-list">
            ${activeSpells.map(spell => this._renderSpellCard(spell)).join('')}
          </div>
        </div>
      ` : ''}

      ${this._renderSavingThrows()}

      ${this._renderInventory()}
    `;

    // Attach tab handlers
    document.querySelectorAll('.cs-spell-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeSpellTab = parseInt(tab.dataset.level);
        this._renderCenterColumn();
      });
    });

    // Attach spell slot dot handlers
    document.querySelectorAll('.spell-slot-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const level = parseInt(dot.dataset.level);
        const index = parseInt(dot.dataset.index);
        this._toggleSpellSlot(level, index);
      });
    });

    // Attach cast button handlers
    document.querySelectorAll('.spell-cast-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const spellName = btn.dataset.spellName;
        const diceExpr = btn.dataset.dice;
        const spellLevel = parseInt(btn.dataset.spellLevel);

        // Output spell cast to console
        if (this.dashboard) {
          let message = `✨ ${this.character.name} casts ${spellName}`;

          if (diceExpr) {
            message += ` (${diceExpr})`;
          }

          this.dashboard.addConsoleMessage('action', message);

          // Roll damage if applicable
          if (diceExpr) {
            this._rollDice(diceExpr, `${spellName} Damage`);
          }
        }

        // Use spell slot
        if (spellLevel > 0 && this.spellSlots[spellLevel]) {
          const slots = this.spellSlots[spellLevel];
          if (slots.used < slots.max) {
            slots.used++;
            this._renderCenterColumn();
          }
        }
      });
    });

    // Attach saving throw handlers
    document.querySelectorAll('.save-box').forEach(box => {
      box.addEventListener('click', () => {
        const save = box.dataset.save;
        const modifier = box.dataset.modifier;
        this._rollDice(`1d20${modifier}`, `${save} Save`);
      });
    });

    // Attach inventory add item handler
    const addItemBtn = document.getElementById('add-item-btn');
    const newItemInput = document.getElementById('new-item-input');
    if (addItemBtn && newItemInput) {
      addItemBtn.addEventListener('click', () => {
        const itemName = newItemInput.value.trim();
        if (itemName) {
          if (!this.character.inventory) {
            this.character.inventory = { weapons: [], armor: [], items: [] };
          }
          if (!this.character.inventory.items) {
            this.character.inventory.items = [];
          }
          this.character.inventory.items.push({ name: itemName, quantity: 1 });
          newItemInput.value = '';
          this._renderCenterColumn();
        }
      });

      newItemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          addItemBtn.click();
        }
      });
    }
  }

  _getSpellsByLevel() {
    const knownSpells = this.character?.spells?.known || [];
    const spellsByLevel = {};

    console.log('Character known spells:', knownSpells);
    console.log('Grimoire has spells:', this.grimoire?.spells?.length);

    knownSpells.forEach(spellRef => {
      const spellId = spellRef.spellId?.$oid || spellRef.spellId;
      console.log('Looking for spell ID:', spellId);

      if (!spellId || !this.grimoire?.spells) {
        console.warn('Missing spell ID or grimoire');
        return;
      }

      const spell = this.grimoire.spells.find(s => {
        const sid = s._id?.$oid || s._id || s.spellId?.$oid || s.spellId || s.id;
        if (sid === spellId) {
          console.log('FOUND spell match:', s.name, sid);
          return true;
        }
        return false;
      });

      if (spell) {
        const level = spell.level ?? 0;
        if (!spellsByLevel[level]) {
          spellsByLevel[level] = [];
        }
        spellsByLevel[level].push({
          ...spell,
          prepared: spellRef.prepared
        });
        console.log('Added spell to level', level, ':', spell.name);
      } else {
        console.error('SPELL NOT FOUND for ID:', spellId);
      }
    });

    console.log('Final spellsByLevel:', spellsByLevel);
    return spellsByLevel;
  }

  _renderSpellCard(spell) {
    const diceExpr = this._parseFormula(spell.damage || '');
    const level = spell.level ?? 0;

    return `
      <div class="cs-spell-card">
        ${spell.icon ? `<img src="${spell.icon}" class="cs-spell-icon" alt="${spell.name}" />` : ''}
        <div class="cs-spell-info">
          <div class="cs-spell-name">${spell.name || 'Unknown Spell'}</div>
          <div class="cs-spell-meta">${spell.school || 'Unknown'} • ${spell.castingTime || '—'}</div>
          <div class="cs-spell-details">
            <div><strong>Range:</strong> ${spell.range || '—'}</div>
            <div><strong>Duration:</strong> ${spell.duration || '—'}</div>
            ${spell.damage ? `<div><strong>Damage:</strong> ${spell.damage}</div>` : ''}
          </div>
          <div class="cs-spell-desc">${spell.description || 'No description.'}</div>
          <button class="spell-cast-btn" data-spell-name="${spell.name}" data-dice="${diceExpr}" data-spell-level="${level}">
            ⚡ ${diceExpr ? `Cast (${diceExpr})` : 'Cast'}
          </button>
        </div>
      </div>
    `;
  }

  _renderSavingThrows() {
    const attrs = this.character?.attributes || {};
    const level = this.character?.level || 1;
    const charClass = this.character?.class?.toLowerCase() || '';

    // Calculate proficiency bonus based on level
    const profBonus = Math.floor((level - 1) / 4) + 2;

    const getMod = (score) => Math.floor((score - 10) / 2);
    const formatMod = (mod) => mod >= 0 ? `+${mod}` : `${mod}`;

    // Determine proficient saves based on class
    const proficientSaves = this._getSavingThrowProficiencies(charClass);

    const saves = [
      { label: 'STR', value: attrs.str || 10, proficient: proficientSaves.includes('str') },
      { label: 'DEX', value: attrs.dex || 10, proficient: proficientSaves.includes('dex') },
      { label: 'CON', value: attrs.con || 10, proficient: proficientSaves.includes('con') },
      { label: 'INT', value: attrs.int || 10, proficient: proficientSaves.includes('int') },
      { label: 'WIS', value: attrs.wis || 10, proficient: proficientSaves.includes('wis') },
      { label: 'CHA', value: attrs.cha || 10, proficient: proficientSaves.includes('cha') }
    ];

    return `
      <div class="cs-section">
        <h3 class="cs-section-title">SAVING THROWS</h3>
        <div class="cs-saves-grid">
          ${saves.map(save => {
            const baseMod = getMod(save.value);
            const totalMod = save.proficient ? baseMod + profBonus : baseMod;
            return `
              <div class="save-box cs-clickable" data-save="${save.label}" data-modifier="${formatMod(totalMod)}">
                <div class="save-label">${save.label}${save.proficient ? ' ◆' : ''}</div>
                <div class="save-value">${formatMod(totalMod)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  _getSavingThrowProficiencies(charClass) {
    // D&D 5e saving throw proficiencies by class
    const proficiencies = {
      'barbarian': ['str', 'con'],
      'bard': ['dex', 'cha'],
      'cleric': ['wis', 'cha'],
      'druid': ['int', 'wis'],
      'fighter': ['str', 'con'],
      'monk': ['str', 'dex'],
      'paladin': ['wis', 'cha'],
      'ranger': ['str', 'dex'],
      'rogue': ['dex', 'int'],
      'sorcerer': ['con', 'cha'],
      'warlock': ['wis', 'cha'],
      'wizard': ['int', 'wis']
    };

    return proficiencies[charClass] || [];
  }

  _renderInventory() {
    const inventory = this.character?.inventory || { weapons: [], armor: [], items: [] };
    const weapons = inventory.weapons || [];
    const armor = inventory.armor || [];
    const items = inventory.items || [];

    return `
      <div class="cs-section">
        <h3 class="cs-section-title">INVENTORY</h3>

        ${weapons.length > 0 ? `
          <div class="cs-inventory-category">
            <div class="cs-inventory-label">Weapons</div>
            ${weapons.map(weapon => `
              <div class="cs-inventory-item">
                <div class="cs-inventory-item-name">${weapon.name}${weapon.equipped ? ' <span style="color: #00f0ff;">(Equipped)</span>' : ''}</div>
                ${weapon.damage ? `<div class="cs-inventory-item-detail">Damage: ${weapon.damage}</div>` : ''}
                ${weapon.properties ? `<div class="cs-inventory-item-detail">${weapon.properties}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${armor.length > 0 ? `
          <div class="cs-inventory-category">
            <div class="cs-inventory-label">Armor</div>
            ${armor.map(armorItem => `
              <div class="cs-inventory-item">
                <div class="cs-inventory-item-name">${armorItem.name}${armorItem.equipped ? ' <span style="color: #00f0ff;">(Equipped)</span>' : ''}</div>
                ${armorItem.ac ? `<div class="cs-inventory-item-detail">AC: ${armorItem.ac}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${items.length > 0 ? `
          <div class="cs-inventory-category">
            <div class="cs-inventory-label">Items</div>
            ${items.map(item => `
              <div class="cs-inventory-item">
                <div class="cs-inventory-item-name">${item.name}${item.quantity ? ` (×${item.quantity})` : ''}</div>
                ${item.description ? `<div class="cs-inventory-item-detail">${item.description}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="cs-inventory-add">
          <input type="text" class="cs-inventory-input" id="new-item-input" placeholder="Add new item..." />
          <button class="cs-inventory-add-btn" id="add-item-btn">+ Add Item</button>
        </div>
      </div>
    `;
  }

  _renderRightColumn() {
    const container = document.getElementById('sheet-col-right');
    const traits = this.character?.passiveTraits || [];

    container.innerHTML = `
      <div class="cs-section">
        <img src="${this.character?.icon || ''}" alt="${this.character?.name || 'Character'}" class="cs-portrait" />
      </div>

      ${(this.character?.profile?.backstory || this.character?.background || this.character?.profile?.personality || this.character?.personality || this.character?.profile?.behavior || this.character?.behavior) ? `
        <div class="cs-section">
          <h3 class="cs-section-title">CHARACTER PROFILE</h3>
          <div class="cs-profile">
            <div class="cs-profile-row">
              <span class="cs-profile-label">Alignment:</span>
              <span class="cs-profile-value">${this.character?.alignment || 'Neutral'}</span>
            </div>
            ${this.character?.profile?.backstory || this.character?.background ? `
              <div class="cs-profile-text">
                <strong>Background:</strong> ${this.character?.profile?.backstory || this.character?.background}
              </div>
            ` : ''}
            ${this.character?.profile?.personality || this.character?.personality ? `
              <div class="cs-profile-text">
                <strong>Personality:</strong> ${this.character?.profile?.personality || this.character?.personality}
              </div>
            ` : ''}
            ${this.character?.profile?.behavior || this.character?.behavior ? `
              <div class="cs-profile-text">
                <strong>Behavior:</strong> ${this.character?.profile?.behavior || this.character?.behavior}
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}

      ${traits.length > 0 ? `
        <div class="cs-section">
          <h3 class="cs-section-title">PASSIVE TRAITS</h3>
          <div class="cs-scrollable-content">
            ${traits.map(trait => `
              <div class="cs-ability-card">
                ${trait.icon ? `<img src="${trait.icon}" class="cs-ability-icon" alt="${trait.name}" />` : ''}
                <div class="cs-ability-info">
                  <div class="cs-ability-name">${trait.name}</div>
                  ${trait.summary ? `<div class="cs-ability-summary">${trait.summary}</div>` : ''}
                  ${trait.description ? `<div class="cs-ability-desc">${trait.description}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }

  _toggleSpellSlot(level, index) {
    const slots = this.spellSlots[level];
    if (!slots) return;

    if (index < slots.used) {
      slots.used = index;
    } else {
      slots.used = index + 1;
    }

    this._renderCenterColumn();
  }

  /**
   * Get spellcasting modifier for character based on class
   */
  _getSpellcastingModifier() {
    if (!this.character || !this.character.attributes) return 0;

    const charClass = this.character.class?.toLowerCase() || '';
    const attrs = this.character.attributes;

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
    const attrs = this.character?.attributes || {};
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

  _extractDiceExpression(damageString) {
    if (!damageString) return '';
    const match = damageString.match(/(\d+d\d+(?:\s*\+\s*\d+)?)/i);
    return match ? match[1].replace(/\s/g, '') : '';
  }

  _rollDice(expression, context = '') {
    const match = expression.match(/(\d+)d(\d+)(?:([+-])(\d+))?/i);
    if (!match) return;

    const [, numDice, dieSize, operator, modifierNum] = match;
    const rolls = [];
    let total = 0;

    for (let i = 0; i < parseInt(numDice); i++) {
      const roll = Math.floor(Math.random() * parseInt(dieSize)) + 1;
      rolls.push(roll);
      total += roll;
    }

    let modifier = 0;
    if (modifierNum) {
      modifier = parseInt(modifierNum);
      if (operator === '-') modifier = -modifier;
      total += modifier;
    }

    // Show visual dice result popup
    this._showDiceResult({ expression, rolls, modifier, total, context });

    // Also output to command terminal
    if (this.dashboard) {
      const rollBreakdown = rolls.length > 1
        ? `[${rolls.join(', ')}]${modifier !== 0 ? ` ${modifier >= 0 ? '+' : ''}${modifier}` : ''} = `
        : '';
      this.dashboard.addConsoleMessage('action', `🎲 ${context}: ${rollBreakdown}${total}`);
    }
  }

  _showDiceResult(result) {
    const container = document.getElementById('dice-roller');
    container.innerHTML = `
      <div class="dice-result-card">
        <div class="dice-result-context">${result.context || result.expression}</div>
        <div class="dice-result-total">${result.total}</div>
        <div class="dice-result-breakdown">
          ${result.rolls.map(roll => `<div class="dice-individual">${roll}</div>`).join('')}
          ${result.modifier !== 0 ? `<div style="padding: 0 12px; font-family: 'Courier New', monospace; color: #00f0ff; font-size: 14px; font-weight: 700;">${result.modifier > 0 ? '+' : ''}${result.modifier}</div>` : ''}
        </div>
      </div>
    `;

    setTimeout(() => {
      container.innerHTML = '';
    }, 3000);
  }
}
