/**
 * Generate Lightweight Spell Index
 * Creates a fast-loading index with minimal spell data for list display
 * Full spell data loaded on-demand when cards are opened
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPELLS_DIR = path.join(__dirname, '../data/spells');
const INDEX_PATH = path.join(SPELLS_DIR, 'spell-index.json');

function generateSpellIndex() {
  console.log('🏰 War Room 1776 - Generate Spell Index\n');
  console.log('═══════════════════════════════════════\n');

  const index = [];

  const levelFolders = fs.readdirSync(SPELLS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('level_'))
    .map(dirent => dirent.name)
    .sort();

  console.log(`📂 Scanning ${levelFolders.length} level folders...\n`);

  for (const folder of levelFolders) {
    const folderPath = path.join(SPELLS_DIR, folder);
    const files = fs.readdirSync(folderPath)
      .filter(file => file.endsWith('.json') &&
              file !== 'spell-manifest.json' &&
              file !== 'spell-index.json' &&
              file !== 'StatSheetRebuild.CFSpell.json');

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      try {
        const spell = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Create lightweight index entry - only data needed for list display
        const indexEntry = {
          name: spell.name,
          level: spell.level,
          school: spell.school,
          classes: spell.classes || [],
          ritual: spell.ritual || false,
          icon: spell.icon || null,
          iconStatus: spell.iconStatus || 'placeholder',

          // Store file path for lazy loading full data
          _path: `${folder}/${file}`
        };

        // IMPORTANT: Do NOT include video, description, or other heavy data
        // These will be loaded on-demand when spell card opens

        index.push(indexEntry);
      } catch (err) {
        console.warn(`⚠️  Failed to index ${file}:`, err.message);
      }
    }
  }

  // Sort by level, then name
  index.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return (a.name || '').localeCompare(b.name || '');
  });

  // Write index
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');

  console.log(`✅ Spell index generated: ${INDEX_PATH}`);
  console.log(`📊 ${index.length} spells indexed`);

  // Calculate size savings
  const indexSize = fs.statSync(INDEX_PATH).size;
  const indexKB = (indexSize / 1024).toFixed(2);
  console.log(`📦 Index size: ${indexKB} KB (lightweight!)`);

  console.log(`\n💡 Grimoire will now:`);
  console.log(`   1. Load index instantly (${indexKB} KB)`);
  console.log(`   2. Display spell list from index`);
  console.log(`   3. Fetch full spell data only when card opens`);
  console.log(`   4. Load videos only when card opens`);
  console.log(`\n✨ Done!\n`);
}

generateSpellIndex();
