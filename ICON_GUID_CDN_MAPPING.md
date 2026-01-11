# Icon GUID and CDN Mapping

## Current Situation

### Two Icon Systems in Use

**1. Direct CDN URLs (Original 73 Spells)**
```json
{
  "name": "Fireball",
  "icon": "https://statsheet-cdn.b-cdn.net/images/8cae366b-76fc-4f81-b121-ddd999426609.png"
}
```
- Format: Direct HTTPS URL to your BunnyCDN
- Used by: Original custom spells
- Pros: Simple, fast, already hosted
- Cons: Requires manual URL creation

**2. IconLayers with GUIDs/Hashes (New 121 Spells from SPELLSWITHICONS.json)**
```json
{
  "name": "Hex",
  "iconLayers": [
    {
      "guid": "b0c56c91-1fc9-43c1-875d-cbc179eafd1d",
      "json": "{}"
    },
    {
      "guid": "84d56081-098d-4bab-8ff6-296909666c12",
      "json": "{}"
    }
  ]
}
```
- Format: Array of layer objects with GUID identifiers
- Used by: Spells imported from character builder/IconSmith
- Pros: Supports multi-layer compositing
- Cons: Requires icon files to be served somewhere

## The GUID Question

**Current Code Path:**
```javascript
// From Grimoire.js _createIconLayer()
img.src = `/icons/${cleanGuid}.png`;
```

This expects local files at: `/icons/b0c56c91-1fc9-43c1-875d-cbc179eafd1d.png`

### Option 1: CDN Mapping (IF your IconSmith exports to CDN)

If your character builder/IconSmith system uploads these GUIDs to your BunnyCDN:

```javascript
// Update Grimoire.js line 730:
img.src = `https://statsheet-cdn.b-cdn.net/icons/${cleanGuid}.png`;
```

**Pros:**
- Fast loading from CDN
- No local storage needed
- Consistent with existing icon system

**Cons:**
- Requires all GUID icons to be uploaded to CDN
- Need to verify CDN path structure

### Option 2: Local Icon Storage

If the icons are local files that need to be served:

**A. Create /client/icons/ folder:**
```bash
mkdir -p client/icons
# Copy all icon files there
```

**B. Update server to serve icons:**
```javascript
// In server/index.js (already done for SPELL_VIDEOS):
app.use('/icons', express.static(path.join(__dirname, '../client/icons')));
```

**Pros:**
- Full control over icon files
- No CDN dependencies
- Works offline

**Cons:**
- Larger repository size
- Need to manage icon files locally

### Option 3: Hybrid System (RECOMMENDED)

Use CDN for iconLayers if available, fall back to local:

```javascript
_createIconLayer(layer, index) {
  if (!layer.guid) return null;

  try {
    let cleanGuid = layer.guid;
    const dollarSignIndex = cleanGuid.indexOf('${');
    if (dollarSignIndex !== -1) {
      cleanGuid = cleanGuid.substring(0, dollarSignIndex);
    }

    const transform = layer.json ? JSON.parse(layer.json) : {};

    const img = document.createElement('img');
    img.className = 'spell-card-icon-layer';

    // Try CDN first
    img.src = `https://statsheet-cdn.b-cdn.net/icons/${cleanGuid}.png`;

    // Fallback to local on error
    img.onerror = () => {
      img.src = `/icons/${cleanGuid}.png`;

      // Final fallback: show placeholder
      img.onerror = () => {
        console.warn('Icon not found:', cleanGuid);
        // Could show a placeholder or hide the layer
      };
    };

    // ... rest of transform code
    return img;
  } catch (error) {
    console.error('Failed to create icon layer:', layer, error);
    return null;
  }
}
```

## Checking Your Setup

### To determine which option to use:

**1. Check if icons are on your CDN:**
```bash
# Test a GUID from your data:
curl -I "https://statsheet-cdn.b-cdn.net/icons/b0c56c91-1fc9-43c1-875d-cbc179eafd1d.png"
```

If you get a 200 response → Use Option 1 (CDN)
If you get a 404 response → Use Option 2 (Local) or Option 3 (Hybrid)

**2. Check if you have local icon files:**
```bash
find /Users/deastridge/Documents/MAP2-1 -name "*.png" | grep -i icon
```

### Current GUIDs in Your Data

Sample GUIDs from your Hex spell:
- `b0c56c91-1fc9-43c1-875d-cbc179eafd1d`
- `84d56081-098d-4bab-8ff6-296909666c12`
- `095ce5ea-a726-46c0-a834-24082f389546`
- `19b991ce-7ef1-4640-93fb-15e4932dea14`

These look like UUIDs from an icon management system.

## Implementation Steps

### If Using CDN (Option 1):

1. Verify icons are uploaded to CDN
2. Update Grimoire.js line 730:
   ```javascript
   img.src = `https://statsheet-cdn.b-cdn.net/icons/${cleanGuid}.png`;
   ```

### If Using Local (Option 2):

1. Create `/client/icons/` directory
2. Copy all icon files there (named by GUID)
3. Add to server/index.js:
   ```javascript
   app.use('/icons', express.static(path.join(__dirname, '../client/icons')));
   ```

### If Using Hybrid (Option 3):

1. Implement the CDN-first-with-fallback code above
2. Create `/client/icons/` for fallback files
3. Add server route for /icons/

## Current Status

✅ **Videos:** Configured and working
- 33 spell videos linked
- Server route added: `/SPELL_VIDEOS`
- Videos will play in Grimoire spell cards

🔧 **IconLayers:** Needs configuration
- 121 spells have iconLayers
- Currently set to: `/icons/${guid}.png`
- **Action needed:** Choose Option 1, 2, or 3 above

## Summary

**Question:** "Can you figure out that the GUID links to the CDN URL?"

**Answer:** The GUIDs *could* map to CDN URLs if your IconSmith/character builder uploads them there. The pattern would be:

```
GUID: b0c56c91-1fc9-43c1-875d-cbc179eafd1d
→ CDN: https://statsheet-cdn.b-cdn.net/icons/b0c56c91-1fc9-43c1-875d-cbc179eafd1d.png
```

But we need to verify this works. Test with curl or browser, then update the code accordingly.

**Recommended Next Steps:**
1. Test if icons are on CDN with the GUID pattern
2. If yes → Update Grimoire.js to use CDN path
3. If no → Set up local icon storage or upload to CDN
4. Consider hybrid approach for reliability
