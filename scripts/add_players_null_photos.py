#!/usr/bin/env python3
"""
Add college stars with missing photos (photo URLs set to null for manual addition)
"""
import os
import sys
from datetime import datetime
from supabase import create_client, Client

# --- SETUP CREDENTIALS ---
try:
    sys.path.append('scripts')
    from config import SUPABASE_URL as FILE_URL, SUPABASE_SERVICE_ROLE_KEY as FILE_KEY
    SUPABASE_URL = FILE_URL
    SUPABASE_KEY = FILE_KEY
except ImportError:
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Players that were skipped due to missing photos
PLAYERS_WITHOUT_PHOTOS = [
    {"name": "Eric Crouch", "team": "Legend", "position": "QB", "college": "Nebraska", "tier": 3, "rating": 75},
    {"name": "Rashaan Salaam", "team": "Legend", "position": "RB", "college": "Colorado", "tier": 3, "rating": 75},
    {"name": "Mark Ingram", "team": "Legend", "position": "RB", "college": "Alabama", "tier": 2, "rating": 92},
    {"name": "Matt Flynn", "team": "Legend", "position": "QB", "college": "LSU", "tier": 3, "rating": 75},
    {"name": "AJ McCarron", "team": "Legend", "position": "QB", "college": "Alabama", "tier": 2, "rating": 92},
    {"name": "Pat White", "team": "Legend", "position": "QB", "college": "West Virginia", "tier": 3, "rating": 75},
    {"name": "Brad Smith", "team": "Legend", "position": "QB", "college": "Missouri", "tier": 3, "rating": 75},
    {"name": "Michael Hart", "team": "Legend", "position": "RB", "college": "Michigan", "tier": 3, "rating": 75},
    {"name": "Manti Te'o", "team": "Legend", "position": "LB", "college": "Notre Dame", "tier": 2, "rating": 92},
]

def main():
    print("=" * 80)
    print("🏈 ADDING PLAYERS WITH NULL PHOTOS (for manual photo addition)")
    print("=" * 80)
    
    added_count = 0
    
    for i, player in enumerate(PLAYERS_WITHOUT_PHOTOS, 1):
        player_name = player['name']
        
        # Prepare player data with NULL photo
        player_data = {
            "name": player_name,
            "team": player['team'],
            "position": player['position'],
            "college": player['college'],
            "image_url": None,  # NULL photo - user will add manually
            "tier": player['tier'],
            "rating": player['rating'],
            "sport": "football",
            "added_to_db": datetime.now().isoformat()
        }
        
        # Insert into database
        try:
            supabase.table('players').insert(player_data).execute()
            print(f"{i}. ✅ Added {player_name} - {player['college']} (Tier {player['tier']}) [Photo: NULL]")
            added_count += 1
        except Exception as e:
            print(f"{i}. ❌ Error adding {player_name}: {e}")
    
    # Summary
    print("\n" + "=" * 80)
    print(f"✅ Added {added_count} players with NULL photos")
    print("💡 You can now manually add photo URLs in Supabase!")
    print("=" * 80)

if __name__ == "__main__":
    main()
