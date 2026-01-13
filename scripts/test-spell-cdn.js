/**
 * Test CDN URLs for a Single Spell
 * Quickly test video and icon URLs before bulk migration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPELLS_DIR = path.join(__dirname, '../data/spells');

/**
 * Find spell by name
 */
function findSpell(spellName) {
  const levelFolders = fs.readdirSync(SPELLS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('level_'))
    .map(dirent => dirent.name);

  for (const folder of levelFolders) {
    const folderPath = path.join(SPELLS_DIR, folder);
    const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      try {
        const spell = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (spell.name && spell.name.toLowerCase() === spellName.toLowerCase()) {
          return { ...spell, _filePath: filePath };
        }
      } catch (err) {
        // Skip invalid files
      }
    }
  }

  return null;
}

/**
 * Test a spell's CDN URLs
 */
function testSpell(spellName, options = {}) {
  const { videoId, iconUrl } = options;

  console.log('\n🧪 Testing Spell CDN URLs\n');
  console.log('═'.repeat(60));

  const spell = findSpell(spellName);

  if (!spell) {
    console.error(`❌ Spell not found: "${spellName}"`);
    console.log('\n💡 Try searching with exact spell name (case-insensitive)');
    return;
  }

  console.log(`✅ Found spell: ${spell.name}`);
  console.log(`📁 File: ${spell._filePath}`);
  console.log('─'.repeat(60));

  // Test current URLs
  console.log('\n📊 Current URLs:');
  console.log(`   Video: ${spell.video || '(none)'}`);
  console.log(`   Icon:  ${spell.icon || '(none)'}`);

  // Test new video URL
  if (videoId) {
    const newVideoUrl = `https://player.mediadelivery.net/embed/578953/${videoId}`;
    console.log('\n📹 Test Video URL:');
    console.log(`   ${newVideoUrl}`);
    console.log(`\n   To apply: Edit ${spell._filePath}`);
    console.log(`   Set "video": "${newVideoUrl}"`);
  }

  // Test new icon URL
  if (iconUrl) {
    console.log('\n🖼️  Test Icon URL:');
    console.log(`   ${iconUrl}`);
    console.log(`\n   To apply: Edit ${spell._filePath}`);
    console.log(`   Set "icon": "${iconUrl}"`);
  }

  // Generate test HTML
  if (videoId || iconUrl) {
    console.log('\n🌐 Test in Browser:');
    const testUrl = videoId
      ? `https://player.mediadelivery.net/embed/578953/${videoId}`
      : iconUrl;
    console.log(`   Open: ${testUrl}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Test complete\n');
}

/**
 * Main
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
🧪 Test Spell CDN URLs

Usage:
  node test-spell-cdn.js "<spell-name>" [options]

Options:
  --video <id>     Test with Bunny video ID
  --icon <url>     Test with icon URL

Examples:
  # Test spell with video
  node test-spell-cdn.js "Fireball" --video f1ab439d-67fd-40b1-ba7d-41a869442bfb

  # Test spell with icon
  node test-spell-cdn.js "Fireball" --icon https://mythos-cdn.b-cdn.net/images/abc123.png

  # Test both
  node test-spell-cdn.js "Fireball" \\
    --video f1ab439d-67fd-40b1-ba7d-41a869442bfb \\
    --icon https://mythos-cdn.b-cdn.net/images/abc123.png
`);
    process.exit(0);
  }

  const spellName = args[0];
  const options = {};

  if (args.includes('--video')) {
    options.videoId = args[args.indexOf('--video') + 1];
  }

  if (args.includes('--icon')) {
    options.iconUrl = args[args.indexOf('--icon') + 1];
  }

  testSpell(spellName, options);
}

main();
