# War Room 1776 - VTT Rules

## Data Architecture
- **SPELLS_MASTER.json**: Primary source of truth. Contains custom CDN icon links and Revolutionary War thematic descriptions.
- **data/SRD/**: Standard reference data. Do not use this to overwrite SPELLS_MASTER.
- **Falsy Check**: Spell levels can be 0 (Cantrips). Always use `??` (nullish coalescing) instead of `||` for level checks.

## Tech Stack
- **Server**: Node.js on Port 5001.
- **Database**: Proxied to an online MongoDB.
- **Client**: Vanilla JS/CSS with a "Parchment/War Room" aesthetic.

## Development Constraints
- Do not auto-commit (handled manually).
- Ignore `data/SRD/` for general logic questions to save tokens.