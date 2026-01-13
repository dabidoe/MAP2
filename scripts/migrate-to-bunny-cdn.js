/**
 * Migrate Spell Data to New Bunny CDN
 * - Updates video URLs to Bunny Stream embeds
 * - Optionally updates icon URLs to new mythos CDN
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPELLS_DIR = path.join(__dirname, '../data/spells');
const BUNNY_LIBRARY_ID = '578953'; // Your Bunny Stream library ID
const OLD_CDN = 'https://statsheet-cdn.b-cdn.net';
const NEW_CDN = 'https://mythos-cdn.b-cdn.net';

// Video ID mapping: spell name -> Bunny video ID
// Add your spell-to-video-id mappings here
const VIDEO_MAPPINGS = {
  // Example:
  // "Fireball": "f1ab439d-67fd-40b1-ba7d-41a869442bfb",
  // "Magic Missile": "b2d71a08-9be6-43cc-9214-b914d8eb5b06",
  // Add more mappings as you upload videos
};

/**
 * Load all spell files from level folders
 */
function loadAllSpells() {
  const spells = [];

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
        spells.push({
          ...spell,
          _filePath: filePath,
          _fileName: file
        });
      } catch (err) {
        console.warn(`⚠️  Failed to load ${file}:`, err.message);
      }
    }
  }

  return spells;
}

/**
 * Update video URLs with Bunny Stream embeds
 */
function updateVideoURLs(spells, dryRun = true) {
  let updated = 0;
  let skipped = 0;

  for (const spell of spells) {
    const videoId = VIDEO_MAPPINGS[spell.name];

    if (videoId) {
      const newVideoUrl = `https://player.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}`;

      if (spell.video !== newVideoUrl) {
        console.log(`\n📹 ${spell.name}`);
        console.log(`   Old: ${spell.video || '(none)'}`);
        console.log(`   New: ${newVideoUrl}`);

        if (!dryRun) {
          spell.video = newVideoUrl;
          const { _filePath, _fileName, ...spellData } = spell;
          fs.writeFileSync(_filePath, JSON.stringify(spellData, null, 2), 'utf-8');
        }

        updated++;
      }
    } else {
      skipped++;
    }
  }

  return { updated, skipped };
}

/**
 * Update icon URLs from old CDN to new CDN
 */
function updateIconURLs(spells, dryRun = true) {
  let updated = 0;

  for (const spell of spells) {
    if (spell.icon && spell.icon.startsWith(OLD_CDN)) {
      const newIconUrl = spell.icon.replace(OLD_CDN, NEW_CDN);

      console.log(`\n🖼️  ${spell.name}`);
      console.log(`   Old: ${spell.icon}`);
      console.log(`   New: ${newIconUrl}`);

      if (!dryRun) {
        spell.icon = newIconUrl;
        const { _filePath, _fileName, ...spellData } = spell;
        fs.writeFileSync(_filePath, JSON.stringify(spellData, null, 2), 'utf-8');
      }

      updated++;
    }
  }

  return { updated };
}

/**
 * List spells without video mappings
 */
function listSpellsWithoutVideos(spells) {
  const withoutVideo = spells
    .filter(spell => !VIDEO_MAPPINGS[spell.name] && !spell.video)
    .map(spell => spell.name)
    .sort();

  if (withoutVideo.length > 0) {
    console.log('\n📝 Spells without video mappings:');
    console.log('─'.repeat(50));
    withoutVideo.forEach((name, index) => {
      console.log(`${index + 1}. ${name}`);
    });
    console.log(`\nTotal: ${withoutVideo.length} spells`);
  }

  return withoutVideo;
}

/**
 * Main migration function
 */
function migrate(options = {}) {
  const {
    updateVideos = false,
    updateIcons = false,
    dryRun = true,
    listMissing = false
  } = options;

  console.log('\n🏰 War Room 1776 - Bunny CDN Migration\n');
  console.log('═'.repeat(50));
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '✏️  LIVE UPDATE'}`);
  console.log('═'.repeat(50));

  const spells = loadAllSpells();
  console.log(`\n✅ Loaded ${spells.length} spells`);

  if (listMissing) {
    listSpellsWithoutVideos(spells);
    return;
  }

  if (updateVideos) {
    console.log('\n📹 Updating video URLs...');
    console.log('─'.repeat(50));
    const { updated, skipped } = updateVideoURLs(spells, dryRun);
    console.log(`\n✅ Videos: ${updated} updated, ${skipped} skipped`);
  }

  if (updateIcons) {
    console.log('\n🖼️  Updating icon URLs...');
    console.log('─'.repeat(50));
    const { updated } = updateIconURLs(spells, dryRun);
    console.log(`\n✅ Icons: ${updated} updated`);
  }

  if (dryRun) {
    console.log('\n💡 This was a dry run. Run with --live to apply changes.');
  } else {
    console.log('\n✅ Migration complete!');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  updateVideos: args.includes('--videos'),
  updateIcons: args.includes('--icons'),
  dryRun: !args.includes('--live'),
  listMissing: args.includes('--list-missing')
};

// Show help if no options provided
if (args.length === 0 || args.includes('--help')) {
  console.log(`
🏰 War Room 1776 - Bunny CDN Migration Script

Usage:
  node migrate-to-bunny-cdn.js [options]

Options:
  --videos        Update video URLs to Bunny Stream embeds
  --icons         Update icon URLs from old CDN to new CDN
  --live          Apply changes (default is dry-run)
  --list-missing  List spells without video mappings
  --help          Show this help message

Examples:
  # Dry run - see what would change
  node migrate-to-bunny-cdn.js --videos

  # Apply video URL updates
  node migrate-to-bunny-cdn.js --videos --live

  # Update both videos and icons
  node migrate-to-bunny-cdn.js --videos --icons --live

  # List spells that need video IDs
  node migrate-to-bunny-cdn.js --list-missing

Notes:
  - Edit VIDEO_MAPPINGS in this file to add spell-to-video-id mappings
  - Always run without --live first to preview changes
  - Icon migration will update all icons from statsheet-cdn to mythos-cdn
`);
  process.exit(0);
}

// Run migration
migrate(options);
