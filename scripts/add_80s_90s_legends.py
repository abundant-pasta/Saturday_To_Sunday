#!/usr/bin/env python3
"""
Add 1980s-1990s College Football Legends
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

# 1980s-1990s COLLEGE LEGENDS
RETRO_LEGENDS = [
    # === TIER 1 - ICONIC 80s/90s COLLEGE LEGENDS ===
    {"name": "Doug Flutie", "team": "Legend", "position": "QB", "college": "Boston College", "tier": 1, "rating": 99,
     "notes": "1984 Heisman, Hail Flutie miracle, CFL legend, limited NFL"},
    
    {"name": "Vinny Testaverde", "team": "Legend", "position": "QB", "college": "Miami", "tier": 1, "rating": 95,
     "notes": "1986 Heisman, National Champion, long NFL but college legend"},
    
    {"name": "Mike Rozier", "team": "Legend", "position": "RB", "college": "Nebraska", "tier": 1, "rating": 99,
     "notes": "1983 Heisman winner, better in college than NFL"},
    
    {"name": "George Rogers", "team": "Legend", "position": "RB", "college": "South Carolina", "tier": 1, "rating": 99,
     "notes": "1980 Heisman winner, college legend"},
    
    {"name": "Raghib Ismail", "team": "Legend", "position": "WR", "college": "Notre Dame", "tier": 1, "rating": 95,
     "notes": "Rocket Ismail, 1990 Heisman finalist, went to CFL"},
    
    {"name": "Brian Bosworth", "team": "Legend", "position": "LB", "college": "Oklahoma", "tier": 1, "rating": 95,
     "notes": "The Boz, 2x Butkus Award, larger than life, short NFL career"},
    
    # === TIER 2 - GREAT 80s/90s COLLEGE PLAYERS ===
    {"name": "Don McPherson", "team": "Legend", "position": "QB", "college": "Syracuse", "tier": 2, "rating": 92,
     "notes": "1987 Heisman finalist, undefeated season, never played NFL"},
    
    {"name": "Steve Walsh", "team": "Legend", "position": "QB", "college": "Miami", "tier": 2, "rating": 92,
     "notes": "2x National Champion (1987, 1989), limited NFL career"},
    
    {"name": "Rodney Peete", "team": "Legend", "position": "QB", "college": "USC", "tier": 2, "rating": 92,
     "notes": "1988 Heisman finalist, better in college"},
    
    {"name": "Jim McMahon", "team": "Legend", "position": "QB", "college": "BYU", "tier": 2, "rating": 92,
     "notes": "1980s BYU legend, won Super Bowl but college star"},
    
    {"name": "Major Applewhite", "team": "Legend", "position": "QB", "college": "Texas", "tier": 2, "rating": 88,
     "notes": "Late 90s Texas legend, minimal NFL"},
    
    {"name": "Ki-Jana Carter", "team": "Legend", "position": "RB", "college": "Penn State", "tier": 2, "rating": 92,
     "notes": "1994 Heisman finalist, #1 pick, injuries ruined NFL career"},
    
    {"name": "Napoleon Kaufman", "team": "Legend", "position": "RB", "college": "Washington", "tier": 2, "rating": 88,
     "notes": "1994 Heisman finalist, short NFL career"},
    
    {"name": "Lawrence Phillips", "team": "Legend", "position": "RB", "college": "Nebraska", "tier": 2, "rating": 88,
     "notes": "1995 college star, troubled NFL career"},
    
    {"name": "Steve Emtman", "team": "Legend", "position": "DL", "college": "Washington", "tier": 2, "rating": 92,
     "notes": "1991 Outland/Lombardi, #1 pick, injuries ended NFL career"},
    
    # === TIER 3 - SOLID 80s/90s PLAYERS ===
    {"name": "Curtis Enis", "team": "Legend", "position": "RB", "college": "Penn State", "tier": 3, "rating": 75,
     "notes": "1997 Doak Walker winner, brief NFL career"},
    
    {"name": "David Palmer", "team": "Legend", "position": "WR", "college": "Alabama", "tier": 3, "rating": 75,
     "notes": "1993 return specialist star, minimal NFL"},
]

def find_photo_url(player_name, position, college):
    """Try to find a working photo URL from multiple sources"""
    print(f"  🔍 Searching for photo: {player_name}...")
    
    name_clean = player_name.lower().replace("'", "").replace(".", "").replace(" jr", "").replace(" iii", "")
    name_parts = name_clean.split()
    
    if len(name_parts) < 2:
        return None
    
    first = name_parts[0]
    last = name_parts[-1]
    
    # === ESPN NFL ===
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
    
    # === Pro Football Reference ===
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
    
    # === Wikipedia ===
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
                print(f"    ✓ Found: Wikipedia")
                wiki_url = page_data["thumbnail"]["source"]
                return wiki_url
    except:
        pass
    
    print(f"    ❌ No photo found")
    return None

def main():
    print("=" * 80)
    print("🕰️  ADDING 1980s-1990s COLLEGE LEGENDS")
    print("=" * 80)
    
    existing = supabase.table('players').select("name").execute()
    existing_names = {row['name'] for row in existing.data}
    
    added_count = 0
    skipped_count = 0
    no_photo_count = 0
    no_photo_players = []
    
    for i, player in enumerate(RETRO_LEGENDS, 1):
        player_name = player['name']
        
        if player_name in existing_names:
            print(f"{i}. ⏭️  Skipping {player_name} (already in database)")
            skipped_count += 1
            continue
        
        photo_url = find_photo_url(player_name, player['position'], player['college'])
        
        if not photo_url:
            print(f"{i}. ⚠️  Adding {player_name} with NULL photo")
            no_photo_players.append(player_name)
            no_photo_count += 1
        
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
        
        try:
            supabase.table('players').insert(player_data).execute()
            status = "✅" if photo_url else "⚠️"
            print(f"{i}. {status} Added {player_name} - {player['college']} (Tier {player['tier']})")
            added_count += 1
        except Exception as e:
            print(f"{i}. ❌ Error adding {player_name}: {e}")
    
    print("\n" + "=" * 80)
    print("✅ COMPLETE!")
    print("=" * 80)
    print(f"Added:   {added_count} retro legends (80s/90s)")
    print(f"Skipped: {skipped_count}")
    if no_photo_count > 0:
        print(f"NULL photos: {no_photo_count} players")
        print("\nPlayers needing photos:")
        for name in no_photo_players:
            print(f"  - {name}")
    print("=" * 80)

if __name__ == "__main__":
    main()
