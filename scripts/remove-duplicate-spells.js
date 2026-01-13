/**
 * Remove Duplicate Spells
 * Finds duplicate spell files and removes incorrect versions based on SRD truth
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRD_PATH = path.join(__dirname, '../data/SRD/spells-srd.json');
const SPELLS_DIR = path.join(__dirname, '../data/spells');

function loadSRD() {
  const srdData = JSON.parse(fs.readFileSync(SRD_PATH, 'utf-8'));
  // Create lookup by spell name
  const lookup = {};
  for (const spell of srdData) {
    lookup[spell.name] = spell;
  }
  return lookup;
}

function normalizeLevel(level) {
  if (level === 'cantrip') return 0;
  return parseInt(level);
}

function findAllSpellFiles() {
  const spellsByName = {};

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

        if (!spellsByName[spell.name]) {
          spellsByName[spell.name] = [];
        }

        spellsByName[spell.name].push({
          name: spell.name,
          level: spell.level,
          school: spell.school,
          filePath: filePath,
          folder: folder
        });
      } catch (err) {
        console.warn(`⚠️  Failed to read ${file}:`, err.message);
      }
    }
  }

  return spellsByName;
}

function removeDuplicates() {
  console.log('🏰 War Room 1776 - Remove Duplicate Spells\n');
  console.log('═══════════════════════════════════════\n');

  const srdLookup = loadSRD();
  const allSpells = findAllSpellFiles();

  console.log(`📊 Found ${Object.keys(allSpells).length} unique spell names\n`);

  let duplicatesFound = 0;
  let filesDeleted = 0;

  for (const [spellName, instances] of Object.entries(allSpells)) {
    if (instances.length === 1) continue;

    duplicatesFound++;
    console.log(`\n🔍 Duplicate found: ${spellName} (${instances.length} versions)`);

    const srdSpell = srdLookup[spellName];
    if (!srdSpell) {
      console.log(`   ⚠️  Not in SRD, keeping all versions`);
      continue;
    }

    const correctLevel = normalizeLevel(srdSpell.level);
    console.log(`   ✓ SRD says: Level ${correctLevel}, School: ${srdSpell.school}`);

    // Find correct and incorrect versions
    // A version is correct if BOTH the level matches AND it's in the right folder
    const correctFolder = `level_${correctLevel}`;
    const correctVersions = instances.filter(inst =>
      inst.level === correctLevel && inst.folder === correctFolder
    );
    const incorrectVersions = instances.filter(inst =>
      inst.level !== correctLevel || inst.folder !== correctFolder
    );

    if (correctVersions.length === 0) {
      console.log(`   ⚠️  No correct version found! Keeping all.`);
      continue;
    }

    if (correctVersions.length > 1) {
      console.log(`   ⚠️  Multiple correct versions in same folder! Keeping all.`);
      continue;
    }

    // Delete incorrect versions
    for (const incorrect of incorrectVersions) {
      console.log(`   ❌ Deleting: ${incorrect.folder}/${path.basename(incorrect.filePath)} (Level ${incorrect.level})`);
      try {
        fs.unlinkSync(incorrect.filePath);
        filesDeleted++;
      } catch (err) {
        console.error(`   ⚠️  Failed to delete: ${err.message}`);
      }
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ Cleanup complete!`);
  console.log(`   Duplicates found: ${duplicatesFound}`);
  console.log(`   Files deleted: ${filesDeleted}`);
  console.log(`\n💡 Next step: Re-run spell manifest generator`);
  console.log(`   node scripts/generate-spell-manifest.js\n`);
}

removeDuplicates();
