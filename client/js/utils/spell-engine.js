/**
 *Spell Engine - Data Processing Utility
 */

export const SpellEngine = {
    // Use Nullish Coalescing (??) to handle Level 0 (Cantrips) correctly
    getDisplayLevel: (level) => level ?? '?',
  
    // Pushes unknown levels to the back of the book (999)
    getSortLevel: (level) => (level !== undefined && level !== null ? level : 999),
  
    // Centralized Color Logic
    getLevelColor: (level) => {
      const colors = {
        0: 'rgba(139, 115, 85, 0.4)', // Brown - Cantrip
        1: 'rgba(76, 175, 80, 0.4)',  // Green
        // ... rest of your colors
      };
      return colors[level] || 'rgba(197, 169, 89, 0.3)';
    },
  
    // Optimized Search
    search: (spells, query) => {
      if (!query.trim()) return [...spells];
      const q = query.toLowerCase();
      return spells.filter(s => 
        s.name?.toLowerCase().includes(q) || 
        s.school?.toLowerCase().includes(q)
      );
    }
  };