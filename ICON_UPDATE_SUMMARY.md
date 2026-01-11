# Spell Icon Update Summary

Generated: 2026-01-11 16:50

## 📊 Current Status

| Category | Count | Percentage |
|----------|-------|------------|
| **Total Spells** | 401 | 100% |
| **With Custom Icons** | 73 | 18% |
| **With IconLayers** | 121 | 30% |
| **Still Missing Icons** | 224 | 56% |
| **Total With Artwork** | **194** | **48%** |

## ✅ What Was Done

### 1. Imported SPELLSWITHICONS.json
- **Source:** `/SPELLSWITHICONS.json`
- **Spells in file:** 371
- **Successfully matched:** 121
- **Not found:** 157 (different spell names between systems)
- **Skipped:** 93 (test spells or already had custom icons)

### 2. Updated Spell Files
All matched spells now have:
- ✅ `iconLayers` array with layer GUIDs
- ✅ Removed `iconStatus: "missing"` field
- ✅ Removed placeholder icon URLs
- ✅ Ready for Grimoire rendering

### 3. Icon Format Support
The Grimoire now supports **three icon formats**:

**1. IconLayers (Layered Icons)**
```json
"iconLayers": [
  {
    "guid": "af9bfe83-6bb3-4611-abdf-fe8b26a2bc81",
    "json": "{}"
  },
  {
    "guid": "9cc98269-9d62-493f-86c2-80e0dddb599d",
    "json": "{}"
  }
]
```
- Used for: 121 newly added spells
- Renders: Multiple layers composited together
- Icon path: `/icons/{guid}.png`

**2. Single Icon URL**
```json
"icon": "https://statsheet-cdn.b-cdn.net/images/8cae366b-76fc-4f81-b121-ddd999426609.png"
```
- Used for: 73 original custom spells
- Renders: Direct image from CDN

**3. Video (NEW)**
```json
"video": "/path/to/spell-animation.mp4"
```
- Priority: Video > IconLayers > Icon
- Renders: Looping video with fallback to icon

## 🎯 Notable Spells Updated

### Popular Warlock Spells
- ✅ **Hex** - Curse with bonus damage (4 layers)
- ✅ **Eldritch Blast** - Signature attack (4 layers)
- ✅ **Hellish Rebuke** - Fire retaliation

### Essential Cleric Spells
- ✅ **Spiritual Weapon** - Floating attack
- ✅ **Spirit Guardians** - AoE protection
- ✅ **Revivify** - Resurrection
- ✅ **Prayer of Healing** - Group heal

### Druid Nature Magic
- ✅ **Moonbeam** - Radiant beam
- ✅ **Call Lightning** - Storm strikes
- ✅ **Entangle** - Root enemies
- ✅ **Speak with Animals** - Animal communication

### Wizard Control
- ✅ **Counterspell** - Magic negation
- ✅ **Haste** - Speed boost
- ✅ **Slow** - Time manipulation
- ✅ **Confusion** - Mind chaos

### Paladin Smites
- ✅ **Searing Smite** - Fire weapon
- ✅ **Thunderous Smite** - Thunder strike
- ✅ **Wrathful Smite** - Frightening blow
- ✅ **Blinding Smite** - Light burst

## 🔧 Technical Notes

### Known Issue: Malformed GUIDs
Some iconLayer GUIDs have extra JSON data appended:
```
"b0c56c91-1fc9-43c1-875d-cbc179eafd1d${\"position\":\"0.5,0.5\",\"rotation\":0.0,...}"
```

This is from the source data. The Grimoire's icon layer renderer should handle this by:
1. Extracting just the GUID portion (before the `${`)
2. Using the GUID to load `/icons/{guid}.png`
3. Falling back gracefully if image doesn't load

### Icon Storage
IconLayers expect icons at: `/icons/{guid}.png`

You may need to:
1. Extract the icon files from your character builder
2. Place them in `/client/icons/` or `/public/icons/`
3. Update the Grimoire path in `_createIconLayer()` if needed

## 📝 Remaining Work

### 224 Spells Still Need Icons

**Breakdown by Level:**
- Level 0: ~15 cantrips
- Level 1: ~20 spells
- Level 2: ~40 spells
- Level 3: ~30 spells
- Levels 4-9: ~119 high-level spells

**Options:**
1. **Manual Addition:** Update JSON files with icon URLs as you generate them
2. **Batch IconLayers:** Add more spells to SPELLSWITHICONS.json and re-run merge
3. **Midjourney Script:** Create automation for missing spells

### Sample Spells Still Missing Icons

**Level 1:**
- Ice Knife
- Beast Bond
- Catapult
- Earth Tremor
- Absorb Elements

**Level 2:**
- Darkvision
- Detect Thoughts
- Enhance Ability
- Enlarge/Reduce
- Find Steed

**Level 3+:**
- Fireball ✅ (has custom icon already)
- Lightning Bolt
- Vampiric Touch
- Wall of Fire
- Arcane Eye

## 🔄 Scripts Available

### Merge Additional Icons
```bash
# Add more spells to SPELLSWITHICONS.json, then run:
node scripts/merge-spell-icons.js
```

### Check Icon Status
```bash
# Count spells with missing icons:
grep -r '"iconStatus": "missing"' data/spells --include="*.json" | wc -l

# List spells with iconLayers:
grep -r '"iconLayers"' data/spells --include="*.json" | wc -l
```

## 🎨 Visual Indicators in Grimoire

Spells still missing icons show:
- 📌 **Red pin badge** on icon
- **"NEEDS ICON" tag** in red
- **Red border** on list item
- **Red hover effect**

Spells with icons (URL or layers):
- ✨ **No badge**
- **Normal gold styling**
- **Full icon display**

---

**Next Steps:**
1. Verify iconLayer images exist in `/icons/` folder
2. Test Grimoire rendering with new iconLayers
3. Continue adding icons to remaining 224 spells
4. Consider video support for animated spell effects
