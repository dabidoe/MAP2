/**
 * Generate Item Manifest
 * Scans data/items/ folders and creates item-manifest.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ITEMS_DIR = path.join(__dirname, '../data/items');
const MANIFEST_PATH = path.join(ITEMS_DIR, 'item-manifest.json');

// Emoji mappings for item categories
const EMOJI_MAP = {
  weapon: '⚔️',
  armor: '🛡️',
  shield: '🛡️',
  potion: '🧪',
  scroll: '📜',
  wand: '🪄',
  ring: '💍',
  amulet: '📿',
  gear: '🎒',
  tool: '🔧',
  wondrous: '✨'
};

function scanItemsDirectory() {
  const manifest = {};

  try {
    // Read all category folders in data/items/
    const categories = fs.readdirSync(ITEMS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`Found ${categories.length} item categories:`, categories);

    // For each category, list all JSON files
    for (const category of categories) {
      const categoryPath = path.join(ITEMS_DIR, category);
      const files = fs.readdirSync(categoryPath)
        .filter(file => file.endsWith('.json'));

      if (files.length > 0) {
        manifest[category] = files;
        console.log(`  ${category}: ${files.length} items`);
      }
    }

    // Write manifest
    fs.writeFileSync(
      MANIFEST_PATH,
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );

    console.log(`\n✅ Item manifest generated: ${MANIFEST_PATH}`);
    console.log(`📦 Total items: ${Object.values(manifest).flat().length}`);

    return manifest;
  } catch (error) {
    console.error('❌ Failed to generate item manifest:', error);
    process.exit(1);
  }
}

function addEmojiPlaceholders() {
  console.log('\n📝 Adding emoji placeholders to items...');

  const categories = fs.readdirSync(ITEMS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  let updatedCount = 0;

  for (const category of categories) {
    const categoryPath = path.join(ITEMS_DIR, category);
    const files = fs.readdirSync(categoryPath)
      .filter(file => file.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      try {
        const item = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Add emoji placeholder if icon field doesn't exist
        if (!item.icon) {
          item.icon = EMOJI_MAP[category] || '📦';
          item.iconStatus = 'placeholder';

          fs.writeFileSync(filePath, JSON.stringify(item, null, 2), 'utf-8');
          updatedCount++;
        }
      } catch (error) {
        console.error(`  ⚠️ Failed to update ${file}:`, error.message);
      }
    }
  }

  console.log(`✅ Updated ${updatedCount} items with emoji placeholders`);
}

// Run the generator
console.log('🏰 Generating Item Manifest for War Room 1776...\n');
const manifest = scanItemsDirectory();
addEmojiPlaceholders();
console.log('\n✨ Done!');
