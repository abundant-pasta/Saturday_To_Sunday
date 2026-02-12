#!/usr/bin/env python3
"""
Add Tier 1 College Legends - Elite players with limited NFL careers
"""
import requests
import os
import sys
from datetime import datetime, timezone
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

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

# NEW TIER 1 COLLEGE LEGENDS
TIER_1_LEGENDS = [
    # Ultimate Saturday to Sunday players - legends who never played NFL
    {"name": "Tommie Frazier", "team": "Legend", "position": "QB", "college": "Nebraska", "tier": 1, "rating": 99,
     "notes": "2x National Champion (1994-95), never played NFL, destroyed Florida 62-24"},
    
    {"name": "Jason White", "team": "Legend", "position": "QB", "college": "Oklahoma", "tier": 1, "rating": 99,
     "notes": "2003 Heisman winner, 2x finalist, never played NFL"},
    
    # Heisman winners with limited NFL success
    {"name": "Eddie George", "team": "Legend", "position": "RB", "college": "Ohio State", "tier": 1, "rating": 99,
     "notes": "1995 Heisman winner, NFL was decent but college legend"},
    
    {"name": "Ricky Williams", "team": "Legend", "position": "RB", "college": "Texas", "tier": 1, "rating": 99,
     "notes": "1998 Heisman, NCAA rushing records, wedding dress"},
    
    # Other college icons
    {"name": "Major Harris", "team": "Legend", "position": "QB", "college": "West Virginia", "tier": 1, "rating": 99,
     "notes": "1989 Heisman finalist, led WVU to title game, minimal NFL"},
    
    {"name": "Chris Leak", "team": "Legend", "position": "QB", "college": "Florida", "tier": 1, "rating": 95,
     "notes": "2006 National Champion QB (with Tebow), minimal NFL"},
    
    # Consider upgrading existing players from Tier 2 to Tier 1
    # These would be done via UPDATE queries, not inserts
]

def find_photo_url(player_name, position, college):
    """Try to find a working photo URL from multiple sources"""
    print(f"  🔍 Searching for photo: {player_name}...")
    
    name_clean = player_name.lower().replace("'", "").replace(".", "").replace(" jr", "").replace(" iii", "")
    name_parts = name_clean.split()
    
    if len(name_parts) < 2:
        print(f"  ⚠️  Cannot parse name: {player_name}")
        return None
    
    first = name_parts[0]
    last = name_parts[-1]
    
    # === SOURCE 1: ESPN NFL ===
    espn_attempts = [
        f"https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/{last}{first[0]}.png",
        f"https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/{first[0]}{last}.png",
    ]
    
    for url in espn_attempts:
        try:
            response = requests.head(url, headers=HEADERS, timeout=3)
            if response.status_code == 200:
                print(f"    ✓ Found: ESPN NFL")
                return url
        except:
            continue
    
    # === SOURCE 2: Pro Football Reference ===
    pfr_attempts = [
        f"https://www.pro-football-reference.com/req/202106291/images/headshots/{last[:4].capitalize()}{first[:2].capitalize()}00.jpg",
        f"https://www.pro-football-reference.com/req/202106291/images/headshots/{last[:4].capitalize()}{first[:2].capitalize()}01.jpg",
    ]
    
    for url in pfr_attempts:
        try:
            response = requests.head(url, headers=HEADERS, timeout=3)
            if response.status_code == 200:
                print(f"    ✓ Found: Pro Football Reference")
                return url
        except:
            continue
    
    # === SOURCE 3: Wikipedia ===
    wiki_search_url = f"https://en.wikipedia.org/w/api.php"
    wiki_params = {
        "action": "query",
        "format": "json",
        "titles": player_name,
        "prop": "pageimages",
        "pithumbsize": 500
    }
    
    try:
        response = requests.get(wiki_search_url, params=wiki_params, headers=HEADERS, timeout=5)
        data = response.json()
        pages = data.get("query", {}).get("pages", {})
        
        for page_id, page_data in pages.items():
            if "thumbnail" in page_data:
                wiki_url = page_data["thumbnail"]["source"]
                print(f"    ✓ Found: Wikipedia")
                return wiki_url
    except:
        pass
    
    print(f"    ❌ No photo found for {player_name}")
    return None

def main():
    print("=" * 80)
    print("🏆 ADDING TIER 1 COLLEGE LEGENDS")
    print("=" * 80)
    
    # Get existing players
    existing = supabase.table('players').select("name").execute()
    existing_names = {row['name'] for row in existing.data}
    
    added_count = 0
    skipped_count = 0
    no_photo_count = 0
    no_photo_players = []
    
    for i, player in enumerate(TIER_1_LEGENDS, 1):
        player_name = player['name']
        
        # Check for duplicate
        if player_name in existing_names:
            print(f"{i}. ⏭️  Skipping {player_name} (already in database)")
            skipped_count += 1
            continue
        
        # Find photo
        photo_url = find_photo_url(player_name, player['position'], player['college'])
        
        if not photo_url:
            # Add with NULL photo
            print(f"{i}. ⚠️  Adding {player_name} with NULL photo")
            no_photo_players.append(player_name)
            no_photo_count += 1
        
        # Prepare player data
        player_data = {
            "name": player_name,
            "team": player['team'],
            "position": player['position'],
            "college": player['college'],
            "image_url": photo_url,
            "tier": player['tier'],
            "rating": player['rating'],
            "sport": "football",
            "added_to_db": datetime.now(timezone.utc).isoformat()
        }
        
        # Insert into database
        try:
            supabase.table('players').insert(player_data).execute()
            status = "✅" if photo_url else "⚠️"
            print(f"{i}. {status} Added {player_name} - {player['college']} (Tier {player['tier']})")
            added_count += 1
        except Exception as e:
            print(f"{i}. ❌ Error adding {player_name}: {e}")
    
    # Summary
    print("\n" + "=" * 80)
    print("✅ COMPLETE!")
    print("=" * 80)
    print(f"Added:   {added_count} Tier 1 legends")
    print(f"Skipped: {skipped_count} (already in database)")
    if no_photo_count > 0:
        print(f"NULL photos: {no_photo_count} players")
        print("\nPlayers needing photos:")
        for name in no_photo_players:
            print(f"  - {name}")
    print("=" * 80)

if __name__ == "__main__":
    main()
