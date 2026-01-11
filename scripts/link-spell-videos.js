#!/usr/bin/env node

/**
 * Link Spell Videos to Spell JSON Files
 * Matches video files to spells and adds video field
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const VIDEOS_DIR = path.join(PROJECT_ROOT, 'SPELL_VIDEOS');
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
 * Extract spell name from video filename
 * Format: "Spell_Name_Description_GUID_0.mp4"
 * The GUID uses hyphens, so we can use regex to find it
 */
function extractSpellNameFromVideo(filename) {
  // Remove the GUID pattern and everything after it
  // Pattern: _GUID-with-hyphens_0.mp4
  const withoutGuid = filename.replace(/_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_\d+\.mp4$/i, '');

  // Split by underscores and convert to space-separated
  const parts = withoutGuid.split('_');

  // The spell name is typically the first 2-4 words before "You" or other description words
  let spellNameParts = [];
  const stopWords = ['you', 'a', 'an', 'the', 'with', 'when', 'this', 'upon'];

  for (let i = 0; i < Math.min(parts.length, 6); i++) {
    const part = parts[i].toLowerCase();

    // Stop if we hit a common description start word
    if (stopWords.includes(part)) {
      break;
    }

    spellNameParts.push(parts[i]);
  }

  return spellNameParts.join(' ');
}

/**
 * Find spell file by name
 */
function findSpellFile(spellName) {
  const normalized = normalizeSpellName(spellName);
  const levels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  for (const level of levels) {
    const levelDir = path.join(SPELLS_DIR, `level_${level}`);
    if (!fs.existsSync(levelDir)) continue;

    const files = fs.readdirSync(levelDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const filePath = path.join(levelDir, file);
        const spell = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (normalizeSpellName(spell.name) === normalized) {
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
 * Main function to link videos
 */
function linkSpellVideos() {
  console.log('🎬 Scanning spell videos...');

  if (!fs.existsSync(VIDEOS_DIR)) {
    console.error('❌ SPELL_VIDEOS folder not found!');
    process.exit(1);
  }

  const videoFiles = fs.readdirSync(VIDEOS_DIR).filter(f => f.endsWith('.mp4'));
  console.log(`   Found ${videoFiles.length} video files`);

  let linked = 0;
  let notFound = 0;
  let skipped = 0;
  const notFoundSpells = [];

  console.log('\n📝 Linking videos to spells...');

  for (const videoFile of videoFiles) {
    const spellName = extractSpellNameFromVideo(videoFile);

    // Find the corresponding spell file
    const spellFilePath = findSpellFile(spellName);

    if (!spellFilePath) {
      notFound++;
      notFoundSpells.push({ video: videoFile, extracted: spellName });
      continue;
    }

    try {
      // Read existing spell data
      const spell = JSON.parse(fs.readFileSync(spellFilePath, 'utf8'));

      // Check if already has video
      if (spell.video) {
        skipped++;
        continue;
      }

      // Add video path (relative to client/public or served directory)
      spell.video = `/SPELL_VIDEOS/${videoFile}`;

      // Write updated spell file
      fs.writeFileSync(spellFilePath, JSON.stringify(spell, null, 2));
      console.log(`   ✓ Linked: ${spell.name} -> ${videoFile}`);
      linked++;
    } catch (error) {
      console.error(`   ✗ Error linking ${spellName}:`, error.message);
    }
  }

  console.log(`\n✅ Video linking complete!`);
  console.log(`\n📊 Summary:`);
  console.log(`   Total videos: ${videoFiles.length}`);
  console.log(`   Linked: ${linked}`);
  console.log(`   Not found: ${notFound}`);
  console.log(`   Skipped (already had video): ${skipped}`);

  if (notFoundSpells.length > 0 && notFoundSpells.length < 30) {
    console.log(`\n⚠️  Videos without matching spell files:`);
    notFoundSpells.forEach(({ video, extracted }) => {
      console.log(`   - ${video}`);
      console.log(`     Extracted name: "${extracted}"`);
    });
  }

  console.log(`\n💡 Note: Videos are now set to path /SPELL_VIDEOS/{filename}`);
  console.log(`   Make sure this folder is served by your Express server!`);
}

// Run the linking
try {
  linkSpellVideos();
} catch (error) {
  console.error('\n❌ Error during video linking:', error);
  process.exit(1);
}
