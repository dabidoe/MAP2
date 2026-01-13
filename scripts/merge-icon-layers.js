/**
 * Merge Icon Layers from StatSheetRebuild
 * Updates existing spells with new CDN icons and iconLayers data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NEW_SPELLS_PATH = path.join(__dirname, '../data/spells/StatSheetRebuild.CFSpell.json');
const SPELLS_DIR = path.join(__dirname, '../data/spells');

function loadNewSpellData() {
  console.log('📖 Loading StatSheetRebuild.CFSpell.json...');
  const data = JSON.parse(fs.readFileSync(NEW_SPELLS_PATH, 'utf-8'));
  console.log(`✅ Loaded ${data.length} spells with icon data\n`);

  // Create lookup by spell name
  const lookup = {};
  for (const spell of data) {
    if (spell.name && spell.iconLayers && spell.iconLayers.length > 0) {
      // Extract the hash from iconLayers (ignore metadata after $)
      const layerData = spell.iconLayers[0][0] || '';
      const hash = layerData.split('$')[0]; // Remove metadata

      if (hash && hash.length > 10) {
        lookup[spell.name] = {
          hash: hash,
          iconLayers: spell.iconLayers,
          iconUrl: `https://statsheet-cdn.b-cdn.net/images/${hash}.png`
        };
      }
    }
  }

  console.log(`📊 ${Object.keys(lookup).length} spells have valid icon data\n`);
  return lookup;
}

function loadExistingSpells() {
  const spells = {};

  const levelFolders = fs.readdirSync(SPELLS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('level_'))
    .map(dirent => dirent.name);

  for (const folder of levelFolders) {
    const folderPath = path.join(SPELLS_DIR, folder);
    const files = fs.readdirSync(folderPath)
      .filter(file => file.endsWith('.json') && file !== 'spell-manifest.json' && file !== 'StatSheetRebuild.CFSpell.json');

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      try {
        const spell = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        spells[spell.name] = {
          ...spell,
          _filePath: filePath
        };
      } catch (err) {
        console.warn(`⚠️  Failed to load ${file}:`, err.message);
      }
    }
  }

  console.log(`✅ Loaded ${Object.keys(spells).length} existing spell files\n`);
  return spells;
}

function mergeIcons() {
  console.log('🏰 War Room 1776 - Merge Icon Layers\n');
  console.log('═══════════════════════════════════════\n');

  const newIconData = loadNewSpellData();
  const existingSpells = loadExistingSpells();

  let matched = 0;
  let updated = 0;
  let skipped = 0;

  for (const [spellName, iconData] of Object.entries(newIconData)) {
    const existing = existingSpells[spellName];

    if (!existing) {
      console.log(`⚠️  "${spellName}" not found in existing spells`);
      skipped++;
      continue;
    }

    matched++;

    // Check if we need to update
    const needsUpdate = existing.icon !== iconData.iconUrl || !existing.iconLayers;

    if (needsUpdate) {
      // Update spell with new icon data
      existing.icon = iconData.iconUrl;
      existing.iconStatus = 'ready';
      existing.iconLayers = iconData.iconLayers;

      // Write back to file
      try {
        const { _filePath, ...spellData } = existing;
        fs.writeFileSync(
          _filePath,
          JSON.stringify(spellData, null, 2),
          'utf-8'
        );
        updated++;

        if (updated % 50 === 0) {
          console.log(`  ✓ Updated ${updated} spells...`);
        }
      } catch (err) {
        console.error(`❌ Failed to update ${spellName}:`, err.message);
      }
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ Icon merge complete!`);
  console.log(`   Matched: ${matched}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`\n✨ Spells now have updated CDN icons and iconLayers!\n`);
}

mergeIcons();
