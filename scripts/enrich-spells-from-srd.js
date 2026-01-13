/**
 * Enrich Spell Data from SRD
 * Merges spells-srd.json (mechanics) with existing spell files (flavor + icons)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRD_PATH = path.join(__dirname, '../data/SRD/spells-srd.json');
const SPELLS_DIR = path.join(__dirname, '../data/spells');

function loadSRD() {
  console.log('📖 Loading spells-srd.json...');
  const srdData = JSON.parse(fs.readFileSync(SRD_PATH, 'utf-8'));
  console.log(`✅ Loaded ${srdData.length} spells from SRD\n`);
  return srdData;
}

function loadExistingSpells() {
  console.log('📂 Loading existing spell files...');
  const spells = {};

  const levelFolders = fs.readdirSync(SPELLS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('level_'))
    .map(dirent => dirent.name);

  for (const folder of levelFolders) {
    const folderPath = path.join(SPELLS_DIR, folder);
    const files = fs.readdirSync(folderPath)
      .filter(file => file.endsWith('.json') && file !== 'spell-manifest.json');

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      try {
        const spell = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        spells[spell.name] = {
          ...spell,
          _filePath: filePath,
          _folder: folder
        };
      } catch (err) {
        console.warn(`⚠️  Failed to load ${file}:`, err.message);
      }
    }
  }

  console.log(`✅ Loaded ${Object.keys(spells).length} existing spell files\n`);
  return spells;
}

function normalizeLevel(level) {
  // SRD uses "cantrip" and "1", "2", etc.
  // We use 0 for cantrips, 1-9 for levels
  if (level === 'cantrip') return 0;
  return parseInt(level);
}

function enrichSpells(srdSpells, existingSpells) {
  console.log('🔄 Enriching spell data...\n');

  let matched = 0;
  let notFound = 0;
  let updated = 0;

  for (const srdSpell of srdSpells) {
    const existing = existingSpells[srdSpell.name];

    if (!existing) {
      console.log(`❌ Not found in current data: ${srdSpell.name}`);
      notFound++;
      continue;
    }

    matched++;

    // Build enriched spell data
    const enriched = {
      _id: existing._id || { $oid: `new-${Date.now()}-${matched}` },
      name: srdSpell.name,
      level: normalizeLevel(srdSpell.level),

      // Keep custom flavor text if it exists, otherwise use SRD description
      flavorText: existing.description || null,
      description: srdSpell.description,

      // SRD mechanical data
      school: srdSpell.school.charAt(0).toUpperCase() + srdSpell.school.slice(1),
      classes: srdSpell.classes || [],
      ritual: srdSpell.ritual || false,

      castingTime: srdSpell.casting_time,
      range: srdSpell.range,
      components: srdSpell.components?.raw || 'Unknown',
      duration: srdSpell.duration,

      // Component details
      componentsDetail: {
        verbal: srdSpell.components?.verbal || false,
        somatic: srdSpell.components?.somatic || false,
        material: srdSpell.components?.material || false,
        materialsNeeded: srdSpell.components?.materials_needed || []
      },

      // Higher level casting
      higherLevels: srdSpell.higher_levels || null,

      // Keep existing visual assets
      icon: existing.icon || null,
      iconStatus: existing.iconStatus || (existing.icon ? 'ready' : 'placeholder'),
      video: existing.video || null,

      // Damage info (keep existing if present, otherwise null)
      damage: existing.damage || null,

      // Tags
      tags: srdSpell.tags || []
    };

    // Write enriched spell back to file
    try {
      fs.writeFileSync(
        existing._filePath,
        JSON.stringify(enriched, null, 2),
        'utf-8'
      );
      updated++;

      if (updated % 50 === 0) {
        console.log(`  ✓ Updated ${updated} spells...`);
      }
    } catch (err) {
      console.error(`❌ Failed to write ${srdSpell.name}:`, err.message);
    }
  }

  console.log(`\n✅ Enrichment complete!`);
  console.log(`   Matched: ${matched}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Not found: ${notFound}`);

  if (notFound > 0) {
    console.log(`\n💡 ${notFound} spells from SRD not found in current data`);
    console.log(`   These are additional spells you could add later.`);
  }
}

// Run enrichment
console.log('🏰 War Room 1776 - Spell Data Enrichment\n');
console.log('═══════════════════════════════════════\n');

const srdSpells = loadSRD();
const existingSpells = loadExistingSpells();
enrichSpells(srdSpells, existingSpells);

console.log('\n═══════════════════════════════════════');
console.log('✨ Done! Spells are now enriched with SRD data.');
console.log('   Refresh your app to see: classes, ritual flags, and more!\n');
