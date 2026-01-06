This summary and documentation outline the transition from a "static-bloat" system to a "Dynamic JIT (Just-In-Time)" HUD architecture for the **Statsheet** VTT.

### Executive Summary

We are moving away from massive JSON files that contain every spell description (which drains tokens and causes AI lag) to a **Hotbar/HUD System**. This system uses a **3x3 Grid** of icons that act as "pointers" to a master library. The interface remains lean, but the full power of the "Bells and Whistles" (flavor text, links, and complex rules) is only "loaded" when a player hovers or clicks.

---

## Documentation: HUD System vs. Legacy "Static-Bloat"

### 1. The Legacy System ("Bullshit Buttons")

In the old version, every character sheet carried the full weight of their library.

* **Structure:** One massive JSON file containing Name, Description, Flavor, and Mechanics for every single known spell.
* **The Problem:** If a Level 20 Wizard has 40 spells, the AI has to "read" all 40 every single time a player sends a message. This burns through token limits and makes the AI slower and more prone to "hallucinating" or forgetting current HP.
* **Interaction:** Buttons are often just static links or text dumps that don't change based on the situation.

### 2. The New Hotbar System (The "Dynamic HUD")

This mimics high-end VTTs (like Foundry or BG3) by using a **Reference-Based Grid**.

#### **A. The 3x3 Interaction Model**

When a player selects a token (like George Washington), a 9-slot grid appears:

* **Slot 1 & 2:** Default Melee and Ranged attacks.
* **Slots 3-8:** "Prepared" or "Favorite" actions (spells, smites, heals).
* **Slot 9:** The "Spellbook/More" toggle.

#### **B. The Hover & Click Logic**

To save on processing power, the HUD uses three layers of data:

1. **The Icon (Visual):** A simple image path.
2. **The Hover (2s Delay):** A "Mini-Manifest" that shows a 1-line summary (e.g., `"1d8+5 Heal"`). This tells the player enough to act without loading the whole rulebook.
3. **The Click (Execution):** The AI follows a `ref` path (e.g., `spells/L1/bless.json`) to pull the full cinematic description and "Bells and Whistles" only at the moment of casting.

#### **C. The "Tree Branch" (Slot 9)**

Clicking the "Spellbook" icon re-skins the 3x3 grid. It opens a "folder" view:

* **Layer 1:** Shows "Level 1," "Level 2," "Level 3."
* **Layer 2:** Shows icons for all spells in that level.
* **Layer 3:** Clicking a new spell "Maps" it to one of your 1-8 HUD slots for the current session.

---

### Comparison Table

| Feature | Legacy "Static" JSON | New HUD System |
| --- | --- | --- |
| **Token Usage** | Extremely High (re-reads everything) | Ultra-Low (only reads the "Pointers") |
| **Speed** | Slow (AI must parse a wall of text) | Instant (AI has 1-line summaries ready) |
| **Organization** | Cluttered / Hard to find spells | Clean 3x3 Grid with Tooltips |
| **Scalability** | Breaks with high-level Wizards | Handles 1,000+ spells effortlessly |
| **UI Interaction** | Text-heavy lists | Hover-over explanations & Links |

### Next Steps for Implementation

1. **Standardize the `ref` paths:** Ensure all spells are in a `/spells/L#/` folder structure.
2. **Create the HUD-Overlay JSON:** A tiny file for each character that just tracks which 9 icons are currently "active."
3. **Set the AI System Prompt:** Instruct the AI to use the `desc` for quick results and the `ref` for "Cinematic" results.

**Would you like me to generate the first "Master Folder" for Washington's Level 1 spells so we can test the /cast select logic?**
