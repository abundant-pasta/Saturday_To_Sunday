#!/usr/bin/env python3
"""
Add College Football Stars to Database
Adds 60+ college football legends (Heisman winners, finalists, memorable players) to Supabase
"""
import requests
import time
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
    print("✅ Loaded credentials from scripts/config.py")
except ImportError:
    print("⚠️  scripts/config.py not found. Using Environment Variables.")
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Missing credentials. Check scripts/config.py or env vars.")
    exit()

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- CONFIGURATION ---
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

# --- COLLEGE FOOTBALL STARS DATA ---
COLLEGE_STARS = [
    # === HEISMAN WINNERS (Tier 1  & 2) ===
    {"name": "Tim Tebow", "team": "Legend", "position": "QB", "college": "Florida", "tier": 1, "rating": 99},
    {"name": "Archie Griffin", "team": "Legend", "position": "RB", "college": "Ohio State", "tier": 1, "rating": 99},
    {"name": "Johnny Manziel", "team": "Legend", "position": "QB", "college": "Texas A&M", "tier": 2, "rating": 92},
    {"name": "Matt Leinart", "team": "Legend", "position": "QB", "college": "USC", "tier": 1, "rating": 99},
    {"name": "Charlie Ward", "team": "Legend", "position": "QB", "college": "Florida State", "tier": 1, "rating": 99},
    {"name": "Robert Griffin III", "team": "Legend", "position": "QB", "college": "Baylor", "tier": 2, "rating": 92},
    {"name": "Troy Smith", "team": "Legend", "position": "QB", "college": "Ohio State", "tier": 2, "rating": 92},
    {"name": "Danny Wuerffel", "team": "Legend", "position": "QB", "college": "Florida", "tier": 2, "rating": 92},
    {"name": "Eric Crouch", "team": "Legend", "position": "QB", "college": "Nebraska", "tier": 3, "rating": 75},
    {"name": "Desmond Howard", "team": "Legend", "position": "WR", "college": "Michigan", "tier": 2, "rating": 92},
    {"name": "Ron Dayne", "team": "Legend", "position": "RB", "college": "Wisconsin", "tier": 2, "rating": 92},
    {"name": "Rashaan Salaam", "team": "Legend", "position": "RB", "college": "Colorado", "tier": 3, "rating": 75},
    {"name": "Gino Torretta", "team": "Legend", "position": "QB", "college": "Miami", "tier": 3, "rating": 75},
    {"name": "Ty Detmer", "team": "Legend", "position": "QB", "college": "BYU", "tier": 2, "rating": 92},
    {"name": "Andre Ware", "team": "Legend", "position": "QB", "college": "Houston", "tier": 3, "rating": 75},
    {"name": "Chris Weinke", "team": "Legend", "position": "QB", "college": "Florida State", "tier": 3, "rating": 75},
    {"name": "Sam Bradford", "team": "Legend", "position": "QB", "college": "Oklahoma", "tier": 2, "rating": 92},
    {"name": "Mark Ingram", "team": "Legend", "position": "RB", "college": "Alabama", "tier": 2, "rating": 92},
    
    # === HEISMAN FINALISTS & ELITE COLLEGE QBs (Tier 2-3) ===
    {"name": "Colt McCoy", "team": "Legend", "position": "QB", "college": "Texas", "tier": 2, "rating": 92},
    {"name": "Case Keenum", "team": "Legend", "position": "QB", "college": "Houston", "tier": 3, "rating": 75},
    {"name": "Graham Harrell", "team": "Legend", "position": "QB", "college": "Texas Tech", "tier": 3, "rating": 75},
    {"name": "JaMarcus Russell", "team": "Legend", "position": "QB", "college": "LSU", "tier": 2, "rating": 92},
    {"name": "Matt Flynn", "team": "Legend", "position": "QB", "college": "LSU", "tier": 3, "rating": 75},
    {"name": "AJ McCarron", "team": "Legend", "position": "QB", "college": "Alabama", "tier": 2, "rating": 92},
    {"name": "Jake Coker", "team": "Legend", "position": "QB", "college": "Alabama", "tier": 3, "rating": 75},
    {"name": "Cardale Jones", "team": "Legend", "position": "QB", "college": "Ohio State", "tier": 3, "rating": 75},
    {"name": "Braxton Miller", "team": "Legend", "position": "QB", "college": "Ohio State", "tier": 3, "rating": 75},
    {"name": "Terrelle Pryor", "team": "Legend", "position": "QB", "college": "Ohio State", "tier": 3, "rating": 75},
    {"name": "Christian Ponder", "team": "Legend", "position": "QB", "college": "Florida State", "tier": 3, "rating": 75},
    {"name": "Kellen Moore", "team": "Legend", "position": "QB", "college": "Boise State", "tier": 2, "rating": 92},
    {"name": "Colin Kaepernick", "team": "Legend", "position": "QB", "college": "Nevada", "tier": 2, "rating": 92},
    {"name": "Pat White", "team": "Legend", "position": "QB", "college": "West Virginia", "tier": 3, "rating": 75},
    {"name": "Colt Brennan", "team": "Legend", "position": "QB", "college": "Hawaii", "tier": 3, "rating": 75},
    {"name": "Dennis Dixon", "team": "Legend", "position": "QB", "college": "Oregon", "tier": 3, "rating": 75},
    {"name": "Chase Daniel", "team": "Legend", "position": "QB", "college": "Missouri", "tier": 3, "rating": 75},
    {"name": "Ken Dorsey", "team": "Legend", "position": "QB", "college": "Miami", "tier": 3, "rating": 75},
    {"name": "Brandon Weeden", "team": "Legend", "position": "QB", "college": "Oklahoma State", "tier": 3, "rating": 75},
    {"name": "Brad Smith", "team": "Legend", "position": "QB", "college": "Missouri", "tier": 3, "rating": 75},
    {"name": "Seneca Wallace", "team": "Legend", "position": "QB", "college": "Iowa State", "tier": 3, "rating": 75},
    
    # === RUNNING BACKS (Tier 2-3) ===
    {"name": "Trent Richardson", "team": "Legend", "position": "RB", "college": "Alabama", "tier": 2, "rating": 92},
    {"name": "Montee Ball", "team": "Legend", "position": "RB", "college": "Wisconsin", "tier": 3, "rating": 75},
    {"name": "Darren McFadden", "team": "Legend", "position": "RB", "college": "Arkansas", "tier": 2, "rating": 92},
    {"name": "Shonn Greene", "team": "Legend", "position": "RB", "college": "Iowa", "tier": 3, "rating": 75},
    {"name": "Michael Hart", "team": "Legend", "position": "RB", "college": "Michigan", "tier": 3, "rating": 75},
    {"name": "Knowshon Moreno", "team": "Legend", "position": "RB", "college": "Georgia", "tier": 3, "rating": 75},
    {"name": "Toby Gerhart", "team": "Legend", "position": "RB", "college": "Stanford", "tier": 3, "rating": 75},
    {"name": "Beanie Wells", "team": "Legend", "position": "RB", "college": "Ohio State", "tier": 3, "rating": 75},
    {"name": "Troy Davis", "team": "Legend", "position": "RB", "college": "Iowa State", "tier": 3, "rating": 75},
    
    # === WIDE RECEIVERS (Tier 2-3) ===
    {"name": "Michael Crabtree", "team": "Legend", "position": "WR", "college": "Texas Tech", "tier": 2, "rating": 92},
    {"name": "Dwayne Jarrett", "team": "Legend", "position": "WR", "college": "USC", "tier": 3, "rating": 75},
    {"name": "Braylon Edwards", "team": "Legend", "position": "WR", "college": "Michigan", "tier": 3, "rating": 75},
    {"name": "Justin Blackmon", "team": "Legend", "position": "WR", "college": "Oklahoma State", "tier": 2, "rating": 92},
    {"name": "Tavon Austin", "team": "Legend", "position": "WR", "college": "West Virginia", "tier": 3, "rating": 75},
    
    # === DEFENSIVE PLAYERS (Tier 2-3) ===
    {"name": "Manti Te'o", "team": "Legend", "position": "LB", "college": "Notre Dame", "tier": 2, "rating": 92},
    {"name": "Rolando McClain", "team": "Legend", "position": "LB", "college": "Alabama", "tier": 3, "rating": 75},
    {"name": "Vontaze Burfict", "team": "Legend", "position": "LB", "college": "Arizona State", "tier": 3, "rating": 75},
    {"name": "Taylor Mays", "team": "Legend", "position": "DB", "college": "USC", "tier": 3, "rating": 75},
]

def find_photo_url(player_name, position, college):
    """
    Try to find a working photo URL for the player from multiple sources.
    Priority: ESPN NFL > Sports Reference > Wikipedia > College Athletic Sites
    """
    print(f"  🔍 Searching for photo: {player_name}...")
    
    # Clean name for URL construction
    name_clean = player_name.lower().replace("'", "").replace(".", "").replace(" jr", "").replace(" iii", "")
    name_parts = name_clean.split()
    
    if len(name_parts) < 2:
        print(f"  ⚠️  Cannot parse name: {player_name}")
        return None
    
    first = name_parts[0]
    last = name_parts[-1]
    
    # === SOURCE 1: ESPN NFL Headshots ===
    # Try various ESPN ID formats (they use player IDs, but we can try common patterns)
    espn_attempts = [
        f"https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/{last}{first[0]}.png",
        f"https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/{first[0]}{last}.png",
        f"https://a.espncdn.com/i/headshots/nfl/players/full/{last}{first}.png",
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
    # Format: https://www.pro-football-reference.com/req/202106291/images/headshots/{LastFi00_YYYY}.jpg
    # Example: Matt Leinart born 1983 -> LeinMa00_1983.jpg or LeinMa00.jpg
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
    
    # === SOURCE 3: Wikipedia/Wikimedia Commons ===
    # Search Wikipedia for player and extract image
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
    
    # === SOURCE 4: College Sports Reference ===
    # Format similar to PFR but for college
    cfb_attempts = [
        f"https://www.sports-reference.com/cfb/players/{last}-{first}-1.jpg",
        f"https://www.sports-reference.com/cfb/players/{last}-{first}.jpg",
    ]
    
    for url in cfb_attempts:
        try:
            response = requests.head(url, headers=HEADERS, timeout=3)
            if response.status_code == 200:
                print(f"    ✓ Found: CFB Sports Reference")
                return url
        except:
            continue
    
    # === SOURCE 5: Basketball Reference (for two-sport athletes like Charlie Ward) ===
    if position == "QB":  # Some QBs played basketball
        bbr_attempts = [
            f"https://www.basketball-reference.com/req/202106291/images/headshots/{last[:5].lower()}{first[:2].lower()}01.jpg",
        ]
        
        for url in bbr_attempts:
            try:
                response = requests.head(url, headers=HEADERS, timeout=3)
                if response.status_code == 200:
                    print(f"    ✓ Found: Basketball Reference")
                    return url
            except:
                continue
    
    # If we get here, we couldn't find a photo
    print(f"    ❌ No photo found for {player_name}")
    return None


def main(test_mode=False):
    print("=" * 80)
    print("🏈 ADDING COLLEGE FOOTBALL STARS TO DATABASE")
    print("=" * 80)
    
    # Get existing players
    existing = supabase.table('players').select("name").execute()
    existing_names = {row['name'] for row in existing.data}
    print(f"📊 Current database has {len(existing_names)} players")
    
    # Filter players to add
    players_to_process = COLLEGE_STARS[:5] if test_mode else COLLEGE_STARS
    print(f"\n🎯 Processing {len(players_to_process)} college stars...")
    if test_mode:
        print("   (TEST MODE - only first 5 players)\n")
    
    # Process each player
    added_count = 0
    skipped_count = 0
    error_count = 0
    no_photo_players = []
    
    for i, player in enumerate(players_to_process, 1):
        player_name = player['name']
        
        # Check for duplicate
        if player_name in existing_names:
            print(f"{i:2d}. ⏭️  Skipping {player_name} (already in database)")
            skipped_count += 1
            continue
        
        # Find photo
        photo_url = find_photo_url(player_name, player['position'], player['college'])
        
        # Skip if no photo found
        if not photo_url:
            print(f"{i:2d}. ⏭️  Skipping {player_name} (no photo found)")
            no_photo_players.append(player_name)
            skipped_count += 1
            continue
        
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
            "added_to_db": datetime.now().isoformat()
        }
        
        # Insert into database
        try:
            supabase.table('players').insert(player_data).execute()
            print(f"{i:2d}. ✅ Added {player_name} - {player['college']} (Tier {player['tier']})")
            added_count += 1
            
            # Brief delay to avoid rate limiting
            time.sleep(0.1)
            
        except Exception as e:
            print(f"{i:2d}. ❌ Error adding {player_name}: {e}")
            error_count += 1
    
    # Summary
    print("\n" + "=" * 80)
    print("✅ COMPLETE!")
    print("=" * 80)
    print(f"Added:   {added_count} players")
    print(f"Skipped: {skipped_count} players (duplicates or no photos)")
    if error_count > 0:
        print(f"Errors:  {error_count} players")
    
    # Report players without photos
    if no_photo_players:
        print("\n" + "=" * 80)
        print("⚠️  PLAYERS WITHOUT PHOTOS (need manual photo URLs):")
        print("=" * 80)
        for name in no_photo_players:
            print(f"  - {name}")
        print("\n💡 Tip: You can manually find photos and re-run with updated URLs")
    
    print("=" * 80)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Add college football stars to database")
    parser.add_argument("--test", action="store_true", help="Test mode - only add first 5 players")
    args = parser.parse_args()
    
    main(test_mode=args.test)
