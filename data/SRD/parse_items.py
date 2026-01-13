import json
import os

# 1. Load the main JSON file
# Make sure items-srd.json is in the same folder!
try:
    with open('items-srd.json', 'r') as f:
        items = json.load(f)
except FileNotFoundError:
    print("Error: items-srd.json not found in this folder.")
    exit()

# 2. Base directory for organization
base_dir = "organized_items"

# 3. Process each item from your file
for item in items:
    # Use category for folder names (e.g., weapon, armor, potion)
    category = item.get('category', 'misc').lower().replace(' ', '_')
    item_id = item.get('id', 'unknown_item')
    
    # Create the folder path (e.g., organized_items/weapon/)
    folder_path = os.path.join(base_dir, category)
    os.makedirs(folder_path, exist_ok=True)
    
    # Save the individual item JSON (e.g., organized_items/weapon/longsword.json)
    file_path = os.path.join(folder_path, f"{item_id}.json")
    with open(file_path, 'w') as out_file:
        json.dump(item, out_file, indent=2)

print(f"✅ Success! All items organized into folders under '{base_dir}/'")