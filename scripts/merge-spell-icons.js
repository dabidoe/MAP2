#!/usr/bin/env node

/**
 * Merge Spell Icons from SPELLSWITHICONS.json
 * Updates individual spell files with iconLayers data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const ICONS_FILE = path.join(PROJECT_ROOT, 'SPELLSWITHICONS.json');
const SPELLS_DIR = path.join(PROJECT_ROOT, 'data/spells');

/**
 * Normalize spell name for matching
 */
function normalizeSpellName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convert spell name to kebab-case filename
 */
function toKebabCase(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Find spell file by name
 */
function findSpellFile(spellName) {
  const kebabName = toKebabCase(spellName);
  const levels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  for (const level of levels) {
    const levelDir = path.join(SPELLS_DIR, `level_${level}`);
    if (!fs.existsSync(levelDir)) continue;

    // Try exact kebab-case match
    const exactPath = path.join(levelDir, `${kebabName}.json`);
    if (fs.existsSync(exactPath)) {
      return exactPath;
    }

    // Try fuzzy match by reading all files
    const files = fs.readdirSync(levelDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const filePath = path.join(levelDir, file);
        const spell = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (normalizeSpellName(spell.name) === normalizeSpellName(spellName)) {
          return filePath;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }

  return null;
}

/**
 * Convert iconLayers format to our format
 */
function convertIconLayers(iconLayersData) {
  if (!iconLayersData || !Array.isArray(iconLayersData) || iconLayersData.length === 0) {
    return null;
  }

  // iconLayers is an array of arrays, where each inner array contains layer hashes
  // We need to convert to array of objects with guid and optional transform data
  const layers = [];

  for (const layerData of iconLayersData) {
    if (Array.isArray(layerData)) {
      // layerData is an array of hash strings
      for (const hash of layerData) {
        if (typeof hash === 'string' && hash.length > 0) {
          layers.push({
            guid: hash,
            json: JSON.stringify({})  // Empty transform for now
          });
        }
      }
    }
  }

  return layers.length > 0 ? layers : null;
}

/**
 * Main merge function
 */
function mergeSpellIcons() {
  console.log('🔍 Loading SPELLSWITHICONS.json...');

  if (!fs.existsSync(ICONS_FILE)) {
    console.error('❌ SPELLSWITHICONS.json not found!');
    process.exit(1);
  }

  const spellsWithIcons = JSON.parse(fs.readFileSync(ICONS_FILE, 'utf8'));
  console.log(`   Found ${spellsWithIcons.length} spells with icon data`);

  let updated = 0;
  let notFound = 0;
  let skipped = 0;
  const notFoundSpells = [];

  console.log('\n📝 Updating spell files...');

  for (const iconSpell of spellsWithIcons) {
    const spellName = iconSpell.name;

    // Skip test/invalid spells
    if (spellName.includes('XVAVA') || spellName.includes('VVV') || spellName.includes('qwd')) {
      skipped++;
      continue;
    }

    // Find the corresponding spell file
    const spellFilePath = findSpellFile(spellName);

    if (!spellFilePath) {
      notFound++;
      notFoundSpells.push(spellName);
      continue;
    }

    try {
      // Read existing spell data
      const spell = JSON.parse(fs.readFileSync(spellFilePath, 'utf8'));

      // Check if already has non-placeholder icon
      const hasRealIcon = spell.icon &&
        !spell.icon.includes('placeholder') &&
        !spell.iconStatus;

      if (hasRealIcon && !spell.iconLayers) {
        // Already has a good icon, don't overwrite
        skipped++;
        continue;
      }

      // Convert and add iconLayers
      const iconLayers = convertIconLayers(iconSpell.iconLayers);

      if (iconLayers && iconLayers.length > 0) {
        spell.iconLayers = iconLayers;

        // Remove placeholder icon if present
        if (spell.icon && spell.icon.includes('placeholder')) {
          delete spell.icon;
        }

        // Remove iconStatus field
        if (spell.iconStatus) {
          delete spell.iconStatus;
        }

        // Write updated spell file
        fs.writeFileSync(spellFilePath, JSON.stringify(spell, null, 2));
        console.log(`   ✓ Updated: ${spellName}`);
        updated++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`   ✗ Error updating ${spellName}:`, error.message);
    }
  }

  console.log(`\n✅ Merge complete!`);
  console.log(`\n📊 Summary:`);
  console.log(`   Total in SPELLSWITHICONS.json: ${spellsWithIcons.length}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Not found: ${notFound}`);
  console.log(`   Skipped: ${skipped}`);

  if (notFoundSpells.length > 0 && notFoundSpells.length < 20) {
    console.log(`\n⚠️  Spells not found in data/spells/:`);
    notFoundSpells.forEach(name => console.log(`   - ${name}`));
  }

  console.log(`\n💡 Tip: The Grimoire supports both formats:`);
  console.log(`   - iconLayers: Array of layer objects (now used for ${updated} spells)`);
  console.log(`   - icon: Single image URL (used for existing spells)`);
}

// Run the merge
try {
  mergeSpellIcons();
} catch (error) {
  console.error('\n❌ Error during merge:', error);
  process.exit(1);
}
