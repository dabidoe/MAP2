/**
 * Generate Video Mappings from CSV/Text
 * Helps create the VIDEO_MAPPINGS object for migrate-to-bunny-cdn.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse CSV file with spell names and video IDs
 * Expected format: SpellName,VideoID or SpellName\tVideoID
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const mappings = {};

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.startsWith('#')) continue;

    // Split by comma or tab
    const parts = line.includes(',')
      ? line.split(',').map(s => s.trim())
      : line.split('\t').map(s => s.trim());

    if (parts.length >= 2) {
      const spellName = parts[0].replace(/"/g, ''); // Remove quotes
      const videoId = parts[1].replace(/"/g, '');

      // Extract video ID from full URL if provided
      const videoIdMatch = videoId.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
      mappings[spellName] = videoIdMatch ? videoIdMatch[1] : videoId;
    }
  }

  return mappings;
}

/**
 * Generate JavaScript object code for VIDEO_MAPPINGS
 */
function generateMappingsCode(mappings) {
  const entries = Object.entries(mappings)
    .map(([name, id]) => `  "${name}": "${id}"`)
    .join(',\n');

  return `const VIDEO_MAPPINGS = {\n${entries}\n};`;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
🎥 Generate Video Mappings

Usage:
  node generate-video-mappings.js <input-file> [--output <file>]

Input file formats supported:
  CSV:  Fireball,f1ab439d-67fd-40b1-ba7d-41a869442bfb
  TSV:  Fireball	f1ab439d-67fd-40b1-ba7d-41a869442bfb
  URLs: Fireball,https://player.mediadelivery.net/embed/578953/f1ab439d-67fd-40b1-ba7d-41a869442bfb

Example input file (video-mappings.csv):
  Fireball,f1ab439d-67fd-40b1-ba7d-41a869442bfb
  Magic Missile,b2d71a08-9be6-43cc-9214-b914d8eb5b06
  Cure Wounds,a1b2c3d4-e5f6-7890-abcd-ef1234567890

Output:
  - Prints JavaScript object to console
  - Use --output to save to a file
  - Copy/paste into migrate-to-bunny-cdn.js VIDEO_MAPPINGS

Examples:
  node generate-video-mappings.js video-mappings.csv
  node generate-video-mappings.js video-mappings.txt --output mappings.js
`);
    process.exit(0);
  }

  const inputFile = args[0];
  const outputFile = args.includes('--output')
    ? args[args.indexOf('--output') + 1]
    : null;

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`);
    process.exit(1);
  }

  console.log(`📖 Reading: ${inputFile}\n`);

  try {
    const mappings = parseCSV(inputFile);
    const code = generateMappingsCode(mappings);

    console.log('✅ Generated mappings:\n');
    console.log('─'.repeat(60));
    console.log(code);
    console.log('─'.repeat(60));
    console.log(`\n📊 Total: ${Object.keys(mappings).length} video mappings`);

    if (outputFile) {
      fs.writeFileSync(outputFile, code, 'utf-8');
      console.log(`\n💾 Saved to: ${outputFile}`);
    } else {
      console.log('\n💡 Copy the code above and paste it into migrate-to-bunny-cdn.js');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
