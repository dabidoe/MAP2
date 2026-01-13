# Bunny CDN Migration Guide

This guide helps you migrate your spell data to use the new Bunny CDN for videos and images.

## Overview

Your new Bunny CDN setup:
- **Video Library**: `https://player.mediadelivery.net/embed/578953/{video-id}`
- **Image CDN**: `https://mythos-cdn.b-cdn.net/images/{hash}.png`

Old CDN:
- **Image CDN**: `https://statsheet-cdn.b-cdn.net/images/{hash}.png`

## Migration Workflow

### Step 1: Create Video Mappings File

Create a CSV file with your spell names and Bunny video IDs.

**Format options:**

```csv
# Option 1: Just the video ID
Fireball,f1ab439d-67fd-40b1-ba7d-41a869442bfb
Magic Missile,b2d71a08-9be6-43cc-9214-b914d8eb5b06

# Option 2: Full embed URL (ID will be extracted)
Fireball,https://player.mediadelivery.net/embed/578953/f1ab439d-67fd-40b1-ba7d-41a869442bfb
Magic Missile,https://player.mediadelivery.net/embed/578953/b2d71a08-9be6-43cc-9214-b914d8eb5b06
```

Save this as `video-mappings.csv` in the `scripts/` folder.

### Step 2: Generate JavaScript Mappings

Run the generator script to convert your CSV into JavaScript code:

```bash
cd /Users/deastridge/Documents/MAP2-1
node scripts/generate-video-mappings.js scripts/video-mappings.csv
```

**Output:**
```javascript
const VIDEO_MAPPINGS = {
  "Fireball": "f1ab439d-67fd-40b1-ba7d-41a869442bfb",
  "Magic Missile": "b2d71a08-9be6-43cc-9214-b914d8eb5b06"
};
```

Copy this code and paste it into `scripts/migrate-to-bunny-cdn.js` at line 16 (replacing the existing `VIDEO_MAPPINGS = {}`).

### Step 3: Preview Changes (Dry Run)

Run the migration script in dry-run mode to see what will change:

```bash
# Preview video URL updates
node scripts/migrate-to-bunny-cdn.js --videos

# Preview icon URL updates
node scripts/migrate-to-bunny-cdn.js --icons

# Preview both
node scripts/migrate-to-bunny-cdn.js --videos --icons
```

**Example output:**
```
📹 Fireball
   Old: (none)
   New: https://player.mediadelivery.net/embed/578953/f1ab439d-67fd-40b1-ba7d-41a869442bfb

🖼️  Fireball
   Old: https://statsheet-cdn.b-cdn.net/images/abc123.png
   New: https://mythos-cdn.b-cdn.net/images/abc123.png

✅ Videos: 2 updated, 448 skipped
✅ Icons: 450 updated
```

### Step 4: Apply Changes (Live Update)

When you're ready to apply the changes, add the `--live` flag:

```bash
# Update video URLs only
node scripts/migrate-to-bunny-cdn.js --videos --live

# Update icon URLs only
node scripts/migrate-to-bunny-cdn.js --icons --live

# Update both videos and icons
node scripts/migrate-to-bunny-cdn.js --videos --icons --live
```

### Step 5: List Spells Without Videos

To see which spells still need video mappings:

```bash
node scripts/migrate-to-bunny-cdn.js --list-missing
```

**Output:**
```
📝 Spells without video mappings:
──────────────────────────────────────────────────
1. Acid Splash
2. Blade Ward
3. Chill Touch
...
Total: 448 spells
```

## Script Options

### `generate-video-mappings.js`

Converts CSV/TSV files into JavaScript mapping objects.

```bash
# Basic usage
node generate-video-mappings.js video-mappings.csv

# Save to file
node generate-video-mappings.js video-mappings.csv --output mappings.js

# Show help
node generate-video-mappings.js --help
```

### `migrate-to-bunny-cdn.js`

Applies CDN URL updates to spell JSON files.

```bash
# Dry run (preview changes)
node migrate-to-bunny-cdn.js --videos          # Preview video updates
node migrate-to-bunny-cdn.js --icons           # Preview icon updates
node migrate-to-bunny-cdn.js --videos --icons  # Preview both

# Live update (apply changes)
node migrate-to-bunny-cdn.js --videos --live
node migrate-to-bunny-cdn.js --icons --live
node migrate-to-bunny-cdn.js --videos --icons --live

# Utilities
node migrate-to-bunny-cdn.js --list-missing    # List spells without videos
node migrate-to-bunny-cdn.js --help            # Show help
```

## Quick Start Example

Here's a complete workflow:

```bash
# 1. Create your video mappings
cat > scripts/video-mappings.csv << EOF
Fireball,f1ab439d-67fd-40b1-ba7d-41a869442bfb
Magic Missile,b2d71a08-9be6-43cc-9214-b914d8eb5b06
Cure Wounds,a1b2c3d4-e5f6-7890-abcd-ef1234567890
EOF

# 2. Generate JavaScript mappings
node scripts/generate-video-mappings.js scripts/video-mappings.csv

# 3. Copy output and paste into migrate-to-bunny-cdn.js (line 16)
# Edit scripts/migrate-to-bunny-cdn.js and replace VIDEO_MAPPINGS

# 4. Preview changes
node scripts/migrate-to-bunny-cdn.js --videos

# 5. Apply changes
node scripts/migrate-to-bunny-cdn.js --videos --live

# 6. Verify in browser
# Open http://localhost:5001 and check spell cards
```

## Tips

1. **Start small**: Add 5-10 video mappings first, test them, then add more
2. **Always dry-run first**: Run without `--live` to preview changes
3. **Back up your data**: The scripts modify JSON files in place
4. **Check the browser**: After updating, refresh and test spell cards
5. **Incremental updates**: You can run the script multiple times as you add more videos

## Troubleshooting

**Video not loading?**
- Check the video ID is correct (UUID format)
- Verify the library ID (578953) is correct
- Check browser console for errors

**Icons not updating?**
- Make sure you've uploaded images to `mythos-cdn.b-cdn.net`
- Verify the hash/filename matches exactly
- Check browser network tab for 404 errors

**Script errors?**
- Ensure you're in the project root directory
- Check that spell JSON files are valid JSON
- Verify CSV format (comma or tab separated)

## Example Spell JSON After Migration

```json
{
  "_id": { "$oid": "..." },
  "name": "Fireball",
  "level": 3,
  "video": "https://player.mediadelivery.net/embed/578953/f1ab439d-67fd-40b1-ba7d-41a869442bfb",
  "icon": "https://mythos-cdn.b-cdn.net/images/abc123.png",
  "description": "A bright streak flashes...",
  ...
}
```

## Need Help?

- Check script output for error messages
- Use `--help` flag on any script
- Test with a single spell first before bulk updates
