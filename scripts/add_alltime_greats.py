#!/usr/bin/env python3
"""
Add remaining all-time college greats (NFL successful players welcome)
"""
import requests
import os
import sys
from datetime import datetime, timezone
from supabase import create_client, Client

try:
    sys.path.append('scripts')
    from config import SUPABASE_URL as FILE_URL, SUPABASE_SERVICE_ROLE_KEY as FILE_KEY
    SUPABASE_URL = FILE_URL
    SUPABASE_KEY = FILE_KEY
except:
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

HEADERS = {"User-Agent": "Mozilla/5.0"}

# ALL-TIME GREATS (Mix of eras, checking for missing ones)
ALLTIME_GREATS = [
    # 1970s-1980s Legends
    {"name": "Roger Staubach", "team": "Legend", "position": "QB", "college": "Navy", "tier": 1, "rating": 99},
    {"name": "Jim Plunkett", "team": "Legend", "position": "QB", "college": "Stanford", "tier": 1, "rating": 95},
    {"name": "Billy Sims", "team": "Legend", "position": "RB", "college": "Oklahoma", "tier": 1, "rating": 95},
    {"name": "Archie Manning", "team": "Legend", "position": "QB", "college": "Ole Miss", "tier": 1, "rating": 95},
    
    # 1990s-2000s Stars
    {"name": "Emmitt Smith", "team": "Legend", "position": "RB", "college": "Florida", "tier": 1, "rating": 99},
    {"name": "Philip Rivers", "team": "Legend", "position": "QB", "college": "NC State", "tier": 1, "rating": 95},
    {"name": "Eli Manning", "team": "Legend", "position": "QB", "college": "Ole Miss", "tier": 1, "rating": 95},
    {"name": "Adrian Peterson", "team": "Legend", "position": "RB", "college": "Oklahoma", "tier": 1, "rating": 99},
    {"name": "Ed Reed", "team": "Legend", "position": "DB", "college": "Miami", "tier": 1, "rating": 99},
    {"name": "Warren Sapp", "team": "Legend", "position": "DL", "college": "Miami", "tier": 1, "rating": 99},
    {"name": "Terrell Owens", "team": "Legend", "position": "WR", "college": "Chattanooga", "tier": 1, "rating": 95},
    {"name": "Calvin Johnson", "team": "Legend", "position": "WR", "college": "Georgia Tech", "tier": 1, "rating": 99},
    {"name": "Larry Fitzgerald", "team": "Legend", "position": "WR", "college": "Pittsburgh", "tier": 1, "rating": 99},
    {"name": "LaDainian Tomlinson", "team": "Legend", "position": "RB", "college": "TCU", "tier": 1, "rating": 99},
    {"name": "Reggie White", "team": "Legend", "position": "DL", "college": "Tennessee", "tier": 1, "rating": 99},
    
    # 2010s Stars
    {"name": "Saquon Barkley", "team": "Legend", "position": "RB", "college": "Penn State", "tier": 1, "rating": 95},
    {"name": "Jalen Hurts", "team": "Legend", "position": "QB", "college": "Alabama", "tier": 1, "rating": 95},
    {"name": "Tua Tagovailoa", "team": "Legend", "position": "QB", "college": "Alabama", "tier": 1, "rating": 92},
    {"name": "Justin Fields", "team": "Legend", "position": "QB", "college": "Ohio State", "tier": 1, "rating": 92},
    {"name": "Ezekiel Elliott", "team": "Legend", "position": "RB", "college": "Ohio State", "tier": 1, "rating": 95},
]

def find_photo_url(player_name, position, college):
    """Find photo from ESPN, Pro Football Reference, or Wikipedia"""
    print(f"  🔍 {player_name}...")
    
    name_clean = player_name.lower().replace("'", "").replace(".", "").replace(" jr", "").replace(" iii", "")
    name_parts = name_clean.split()
    if len(name_parts) < 2:
        return None
    
    first = name_parts[0]
    last = name_parts[-1]
    
    # ESPN
    for url in [
        f"https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/{last}{first[0]}.png",
        f"https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/{first[0]}{last}.png",
    ]:
        try:
            if requests.head(url, headers=HEADERS, timeout=3).status_code == 200:
                print(f"    ✓ ESPN")
                return url
        except:
            pass
    
    # Pro Football Reference
    for url in [
        f"https://www.pro-football-reference.com/req/202106291/images/headshots/{last[:4].capitalize()}{first[:2].capitalize()}00.jpg",
        f"https://www.pro-football-reference.com/req/202106291/images/headshots/{last[:4].capitalize()}{first[:2].capitalize()}01.jpg",
    ]:
        try:
            if requests.head(url, headers=HEADERS, timeout=3).status_code == 200:
                print(f"    ✓ PFR")
                return url
        except:
            pass
    
    # Wikipedia
    try:
        wiki_params = {"action": "query", "format": "json", "titles": player_name, "prop": "pageimages", "pithumbsize": 500}
        data = requests.get("https://en.wikipedia.org/w/api.php", params=wiki_params, headers=HEADERS, timeout=5).json()
        for page_data in data.get("query", {}).get("pages", {}).values():
            if "thumbnail" in page_data:
                print(f"    ✓ Wikipedia")
                return page_data["thumbnail"]["source"]
    except:
        pass
    
    print(f"    ❌ No photo")
    return None

def main():
    print("=" * 80)
    print("🏈 ADDING ALL-TIME COLLEGE GREATS")
    print("=" * 80)
    
    existing = supabase.table('players').select("name").execute()
    existing_names = {row['name'] for row in existing.data}
    
    added = 0
    skipped = 0
    no_photo = []
    
    for i, player in enumerate(ALLTIME_GREATS, 1):
        name = player['name']
        
        if name in existing_names:
            print(f"{i}. ⏭️  {name} (already in DB)")
            skipped += 1
            continue
        
        photo = find_photo_url(name, player['position'], player['college'])
        if not photo:
            no_photo.append(name)
        
        data = {
            "name": name,
            "team": player['team'],
            "position": player['position'],
            "college": player['college'],
            "image_url": photo,
            "tier": player['tier'],
            "rating": player['rating'],
            "sport": "football",
            "added_to_db": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            supabase.table('players').insert(data).execute()
            status = "✅" if photo else "⚠️"
            print(f"{i}. {status} Added {name} - {player['college']} (Tier {player['tier']})")
            added += 1
        except Exception as e:
            print(f"{i}. ❌ Error: {e}")
    
    print("\n" + "=" * 80)
    print(f"✅ Added: {added} | Skipped: {skipped} | NULL photos: {len(no_photo)}")
    if no_photo:
        print("\nPlayers needing photos:")
        for n in no_photo:
            print(f"  - {n}")
    print("=" * 80)

if __name__ == "__main__":
    main()
