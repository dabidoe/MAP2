# War Room 1776 - Data Structure Guide

## Overview
This system uses a **reference-based architecture** to keep character files lean and token-efficient. Instead of embedding full descriptions inline, we use `ref` pointers to shared library files.

## Folder Structure

```
data/
├── abilities/
│   ├── class/
│   │   ├── barbarian/
│   │   ├── bard/
│   │   ├── cleric/
│   │   ├── druid/
│   │   ├── fighter/          ← Action Surge, Second Wind
│   │   ├── monk/
│   │   ├── paladin/          ← Divine Smite, Lay on Hands
│   │   ├── ranger/
│   │   ├── rogue/            ← Sneak Attack, Cunning Action
│   │   ├── sorcerer/
│   │   ├── warlock/
│   │   └── wizard/           ← Arcane Recovery
│   └── race/
│       ├── human/
│       ├── elf/
│       ├── dwarf/
│       ├── halfling/
│       ├── dragonborn/
│       ├── gnome/
│       ├── half-elf/
│       ├── half-orc/
│       └── tiefling/
│
├── traits/
│   ├── class/
│   │   ├── paladin/          ← Divine Health, Aura of Protection
│   │   ├── fighter/
│   │   └── ...
│   └── race/
│       ├── elf/              ← Darkvision, Fey Ancestry
│       ├── human/            ← Versatile
│       └── ...
│
├── feats/                    ← TRUE feats (Great Weapon Master, Lucky, etc.)
│
├── spells/
│   ├── level_0/              ← Cantrips
│   ├── level_1/              ← Bless, Cure Wounds, Command, etc.
│   ├── level_2/
│   ├── level_3/
│   └── ...
│
└── tokens/
    ├── party/                ← Player characters
    ├── npcs/                 ← Allied NPCs (Washington, Greene)
    └── beastiary/
        └── humanoids/        ← Enemies (Hessians, etc.)
```

## Terminology

### Abilities
**Class-specific powers** that define what a class can DO.
- **Paladin**: Divine Smite, Lay on Hands
- **Fighter**: Action Surge, Second Wind
- **Rogue**: Sneak Attack, Cunning Action
- **Wizard**: Arcane Recovery

Path: `abilities/class/{className}/{ability-name}.json`

### Traits
**Passive characteristics** from class or race.
- **Class Traits**: Divine Health (Paladin), Rage (Barbarian)
- **Race Traits**: Darkvision (Elf), Versatile (Human)

Paths:
- `traits/class/{className}/{trait-name}.json`
- `traits/race/{raceName}/{trait-name}.json`

### Feats
**Optional character upgrades** chosen at certain levels.
- Great Weapon Master
- Lucky
- Sharpshooter
- Alert

Path: `feats/{feat-name}.json`

### Spells
**Magic** organized by level.

Path: `spells/level_{N}/{spell-name}.json`

## Character File Structure

### Lean Character (george-washington.json)
```json
{
  "name": "George Washington",
  "class": "Paladin",
  "race": "Human",
  "level": 12,

  "hotbar": {
    "1": { "name": "Saber of Liberty", "type": "weapon", "roll": "1d8+3" },
    "3": { "name": "Divine Smite", "type": "ability", "ref": "abilities/class/paladin/divine-smite.json" },
    "5": { "name": "Cure Wounds", "type": "spell", "ref": "spells/level_1/cure-wounds.json" }
  },

  "traits": [
    { "ref": "traits/class/paladin/divine-health.json" },
    { "ref": "traits/class/paladin/aura-of-protection.json" },
    { "ref": "traits/race/human/versatile.json" }
  ],

  "abilities": [
    { "ref": "abilities/class/paladin/lay-on-hands.json" },
    { "ref": "abilities/class/paladin/divine-smite.json" }
  ],

  "feats": [
    { "ref": "feats/great-weapon-master.json" }
  ],

  "spellbook": {
    "L1": [
      { "name": "Cure Wounds", "ref": "spells/level_1/cure-wounds.json" },
      { "name": "Bless", "ref": "spells/level_1/bless.json" }
    ]
  }
}
```

## API Usage

### Get Characters (Lean - Default)
```bash
GET /api/characters
# Returns characters with refs as pointers
```

### Get Characters (Expanded - Full Details)
```bash
GET /api/characters?expand=true
# Resolves all refs and returns full data inline
```

### Example Ability File (divine-smite.json)
```json
{
  "id": "6956c8665648a6dce9f6fb19",
  "name": "Divine Smite",
  "description": "You call down a shard of star-fire to lash your weapon strike...",
  "summary": "Imbue a weapon blow with searing celestial force.",
  "icon": "https://statsheet-cdn.b-cdn.net/images/runware-1767295078363.png",
  "type": "bonus_action",
  "source": "paladin",
  "mechanics": {
    "damage": "2d8+1d8/slot",
    "damage_type": "radiant",
    "trigger": "on_hit"
  }
}
```

## Benefits

1. **Token Efficient**: Character files are ~90% smaller
2. **Reusable**: Divine Smite defined once, used by all Paladins
3. **Organized**: Clear separation of concerns
4. **Scalable**: Handles 1000+ spells without bloat
5. **Flexible**: Load lean (fast) or expanded (complete)

## Hotbar Types

- `weapon`: Physical attacks
- `ability`: Class abilities (Divine Smite, Sneak Attack)
- `spell`: Magic from spellbook
- `trait`: Passive features (Aura of Protection)
- `feat`: Optional upgrades (GWM, Lucky)
- `menu`: UI navigation (Spellbook button)
