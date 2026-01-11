# Missing Spell Icons Report

Generated: 2026-01-11

## Summary

- **Total Spells in Grimoire:** 401
- **Spells with Icons:** 73 (18%)
- **Spells Missing Icons:** 328 (82%)

All missing spells have been imported from the D&D 5e SRD with:
- ✅ Complete spell data (description, components, damage, etc.)
- 📌 Placeholder icon with "Icon Missing" text
- 🏷️ Tagged with `"iconStatus": "missing"` field

## Visual Indicators

The Grimoire now shows missing icons with:
- **Red pin badge (📌)** on spell icon in list
- **"NEEDS ICON" tag** next to spell name
- **Red border** on spell list item
- **Red hover effect** to easily spot them

## How to Add Icons

### Option 1: Manual Midjourney Generation
1. Open Grimoire in game
2. Look for spells with "NEEDS ICON" tag
3. Generate art in Midjourney using spell description
4. Update the JSON file with new icon URL
5. Remove `"iconStatus": "missing"` field

### Option 2: Batch Script (Future)
A script can be created to:
- Read spell descriptions
- Generate Midjourney prompts
- Batch process all missing icons

### Example: Updating a Spell Icon

**File:** `/data/spells/level_1/hex.json`

```json
{
  "name": "Hex",
  "icon": "https://via.placeholder.com/512/1a1a1a/ffffff?text=Icon+Missing",
  "iconStatus": "missing"
}
```

**After adding icon:**

```json
{
  "name": "Hex",
  "icon": "https://statsheet-cdn.b-cdn.net/images/your-new-hex-icon.png"
}
```

## Breakdown by Level

| Level | Total Spells | Missing Icons |
|-------|--------------|---------------|
| 0 (Cantrip) | 30 | ~15 |
| 1st | 62 | ~40 |
| 2nd | 79 | ~60 |
| 3rd | 57 | ~45 |
| 4th | 39 | ~38 |
| 5th | 46 | ~45 |
| 6th | 38 | ~37 |
| 7th | 21 | ~20 |
| 8th | 18 | ~17 |
| 9th | 17 | ~16 |

## Sample Missing Spells (Level 1)

- Floating Disk (Tenser's)
- Searing Smite
- Color Spray
- Ensnaring Strike
- Beast Bond
- Ice Knife
- Thunderous Smite
- Dissonant Whispers
- Wrathful Smite
- Compelled Duel
- Divine Favor
- Heroism
- Hex
- Hunter's Mark

## Notes

- All spells retain full SRD data
- Placeholder icons are served via placeholder.com
- No functionality is blocked - spells can be used immediately
- Icon generation can be done gradually over time
- Existing 73 spells with custom art remain unchanged

## Import Script

To re-run the import or check for updates:

```bash
node scripts/import-missing-spells.js
```

The script will:
- Compare current spells to SRD
- Only add NEW missing spells
- Update the spell manifest automatically
- Not overwrite existing spells
