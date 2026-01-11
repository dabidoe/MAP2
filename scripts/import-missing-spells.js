#!/usr/bin/env node

/**
 * Import Missing Spells from SRD
 * Compares SRD spells to current spell files and generates missing ones with placeholder icons
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const SRD_FILE = path.join(DATA_DIR, 'SRD/spells-srd.json');
const SPELLS_DIR = path.join(DATA_DIR, 'spells');
const MANIFEST_FILE = path.join(SPELLS_DIR, 'spell-manifest.json');

// Placeholder icon for missing spells
const PLACEHOLDER_ICON = 'https://via.placeholder.com/512/1a1a1a/ffffff?text=Icon+Missing';

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
 * Map SRD level format to numeric level
 */
function mapLevel(level) {
  if (level === 'cantrip') return 0;
  return parseInt(level);
}

/**
 * Load all existing spell names from data/spells
 */
function loadExistingSpells() {
  const existingSpells = new Set();

  const levels = [0, 1, 2, 3, 9];

  for (const level of levels) {
    const levelDir = path.join(SPELLS_DIR, `level_${level}`);
    if (fs.existsSync(levelDir)) {
      const files = fs.readdirSync(levelDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(levelDir, file);
            const spell = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (spell.name) {
              existingSpells.add(spell.name.toLowerCase());
            }
          } catch (error) {
            console.error(`Error reading ${file}:`, error.message);
          }
        }
      }
    }
  }

  return existingSpells;
}

/**
 * Extract damage formula from SRD description
 */
function extractDamage(description) {
  // Look for damage patterns like "1d6 acid damage", "2d8 fire damage", etc.
  const damageMatch = description.match(/(\d+d\d+(?:\s*\+\s*\d+)?)\s+(\w+)\s+damage/i);
  if (damageMatch) {
    return `${damageMatch[1]} ${damageMatch[2]}`;
  }

  // Look for healing patterns
  const healingMatch = description.match(/(\d+d\d+(?:\s*\+\s*(?:your\s+)?spellcasting\s+modifier)?)\s+hit\s+points?/i);
  if (healingMatch) {
    return `${healingMatch[1]} healing`;
  }

  return null;
}

/**
 * Convert SRD spell to our format
 */
function convertSRDSpell(srdSpell) {
  const level = mapLevel(srdSpell.level);
  const damage = extractDamage(srdSpell.description);

  // Generate ObjectId-like string (not a real MongoDB ObjectId, just a placeholder)
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const randomHex = Math.random().toString(16).substring(2, 18);
  const oid = (timestamp + randomHex).padEnd(24, '0').substring(0, 24);

  return {
    _id: { $oid: oid },
    name: srdSpell.name,
    level: level,
    description: srdSpell.description,
    castingTime: srdSpell.casting_time,
    range: srdSpell.range,
    components: srdSpell.components.raw,
    duration: srdSpell.duration,
    damage: damage,
    school: srdSpell.school.charAt(0).toUpperCase() + srdSpell.school.slice(1),
    icon: PLACEHOLDER_ICON,
    iconStatus: 'missing',
    isPublic: true,
    classes: srdSpell.classes,
    ritual: srdSpell.ritual,
    higherLevels: srdSpell.higher_levels || null,
    source: 'SRD 5.1'
  };
}

/**
 * Main import function
 */
function importMissingSpells() {
  console.log('🔍 Loading SRD spells...');
  const srdSpells = JSON.parse(fs.readFileSync(SRD_FILE, 'utf8'));
  console.log(`   Found ${srdSpells.length} spells in SRD`);

  console.log('\n🔍 Loading existing spells...');
  const existingSpells = loadExistingSpells();
  console.log(`   Found ${existingSpells.size} existing spells`);

  console.log('\n🔍 Finding missing spells...');
  const missingSpells = srdSpells.filter(spell =>
    !existingSpells.has(spell.name.toLowerCase())
  );
  console.log(`   Found ${missingSpells.length} missing spells`);

  if (missingSpells.length === 0) {
    console.log('\n✅ All SRD spells are already imported!');
    return;
  }

  console.log('\n📝 Creating spell files...');
  let created = 0;

  for (const srdSpell of missingSpells) {
    const spell = convertSRDSpell(srdSpell);
    const level = spell.level;
    const filename = toKebabCase(spell.name) + '.json';
    const levelDir = path.join(SPELLS_DIR, `level_${level}`);

    // Create level directory if it doesn't exist
    if (!fs.existsSync(levelDir)) {
      fs.mkdirSync(levelDir, { recursive: true });
      console.log(`   Created directory: level_${level}/`);
    }

    const filePath = path.join(levelDir, filename);

    // Write spell file
    fs.writeFileSync(filePath, JSON.stringify(spell, null, 2));
    console.log(`   ✓ Created: level_${level}/${filename}`);
    created++;
  }

  console.log(`\n✅ Created ${created} new spell files`);

  // Update manifest
  console.log('\n📝 Updating spell manifest...');
  updateManifest();

  console.log('\n✅ Import complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   SRD Spells: ${srdSpells.length}`);
  console.log(`   Existing: ${existingSpells.size}`);
  console.log(`   Added: ${created}`);
  console.log(`   Total: ${existingSpells.size + created}`);
}

/**
 * Update spell manifest with all spell files
 */
function updateManifest() {
  const manifest = {};
  const levels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  for (const level of levels) {
    const levelDir = path.join(SPELLS_DIR, `level_${level}`);
    if (fs.existsSync(levelDir)) {
      const files = fs.readdirSync(levelDir)
        .filter(file => file.endsWith('.json'))
        .sort();
      manifest[`level_${level}`] = files;
    }
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log('   ✓ Updated spell-manifest.json');
}

// Run the import
try {
  importMissingSpells();
} catch (error) {
  console.error('\n❌ Error during import:', error);
  process.exit(1);
}
