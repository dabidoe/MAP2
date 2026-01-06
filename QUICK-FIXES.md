# Quick Fixes Applied

## 1. Attack Logic Fixed
**Before**: Weapons just rolled damage
**After**: 
- Roll d20+STR to-hit
- Then roll damage
- Spells/abilities just roll their effect

## 2. Icon Debugging Added
- Console logs icon URLs
- Changed to `background-size: contain` for better display
- Validates URL starts with 'http'

## Test
1. Click weapon → See to-hit roll, then damage
2. Check console for icon URL logs
3. If icons still don't show, check CORS/network tab
