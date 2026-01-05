import requests
import time
import os
import sys
from supabase import create_client, Client

# --- 1. SETUP CREDENTIALS ---
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

# --- 2. CONFIGURATION ---
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Map easy names to ESPN Team IDs (roughly)
# We will actually just fetch ALL teams to be safe.
NFL_TEAMS_API = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=35"

POS_MAP = {
    'OT': 'OL', 'G': 'OL', 'C': 'OL', 'OG': 'OL',
    'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 
    'OLB': 'LB', 'ILB': 'LB', 'LB': 'LB',
    'CB': 'DB', 'S': 'DB', 'FS': 'DB', 'SS': 'DB', 'DB': 'DB'
}

# --- 3. TARGET LIST (Set of names we want) ---
# Using a set for O(1) lookups
TARGET_PLAYERS = {
    "Caleb Williams", "Jayden Daniels", "Drake Maye", "Anthony Richardson", "Will Levis", "Bryce Young",
    "Kenneth Walker III", "Isiah Pacheco", "De'Von Achane", "Zamir White", "Brian Robinson Jr", 
    "Tyjae Spears", "Jaylen Warren", "Zack Moss", "Jerome Ford", "Devin Singletary", "Khalil Herbert",
    "Tank Dell", "Rashee Rice", "DJ Moore", "Zay Flowers", "Marvin Harrison Jr.", "Rome Odunze", 
    "Jakobi Meyers", "Odell Beckham Jr", "Gabe Davis", "Christian Watson", "Jameson Williams", 
    "Jaxon Smith-Njigba", "Josh Downs", "Romeo Doubs", "Dontayvion Wicks", "Rashid Shaheed", "Curtis Samuel",
    "Trey McBride", "Dalton Kincaid", "Dallas Goedert", "Kyle Pitts", "Evan Engram", "David Njoku", 
    "Brock Bowers", "Dalton Schultz", "Cole Kmet", "Pat Freiermuth", "Hunter Henry", "Luke Musgrave", 
    "Tucker Kraft", "Isaiah Likely",
    "Joe Alt", "Olu Fashanu", "JC Latham", "Taliese Fuaga", "Andrew Thomas",
    "Aidan Hutchinson", "Josh Hines-Allen", "Trey Hendrickson", "Montez Sweat", "Brian Burns", 
    "Will Anderson Jr.", "Jaelan Phillips", "Rashan Gary", "Haason Reddick", "Jared Verse", 
    "Laiatu Latu", "Quinnen Williams", "Dexter Lawrence", "Jeffery Simmons", "Justin Madubuike", 
    "Derrick Brown", "Christian Wilkins", "Javon Hargrave", "Jermaine Johnson", "Boye Mafe", 
    "Jadeveon Clowney", "Za'Darius Smith", "Leonard Williams", "Christian Barmore", "Kobie Turner", 
    "Alim McNeill", "Jalen Carter", "Will McDonald IV",
    "Foyesade Oluokun", "Demario Davis", "Patrick Queen", "Dre Greenlaw", "Zaire Franklin", 
    "C.J. Mosley", "Quincy Williams", "Jeremiah Owusu-Koramoah", "T.J. Edwards", "Alex Singleton", "Bobby Okereke",
    "Patrick Surtain II", "Trent McDuffie", "DaRon Bland", "Charvarius Ward", "L'Jarius Sneed", 
    "Jaylon Johnson", "Denzel Ward", "Marlon Humphrey", "Derek Stingley Jr.", "Devon Witherspoon", 
    "Jessie Bates III", "Budda Baker", "Jevon Holland", "Talanoa Hufanga", "Quinyon Mitchell", 
    "Terrion Arnold", "Travis Hunter", "Marshon Lattimore", "Trevon Diggs", "Darius Slay", 
    "Kevin Byard", "Tyrann Mathieu", "Julian Love", "Xavier McKinney", "Geno Stone", "Riq Woolen", "Kamren Curl"
}

def get_all_nfl_players():
    """Fetches EVERY active player from ESPN by looping through team rosters."""
    print("🏈 Fetching all NFL rosters... (this takes ~10 seconds)")
    
    # 1. Get List of Teams
    resp = requests.get(NFL_TEAMS_API, headers=HEADERS).json()
    teams = resp['sports'][0]['leagues'][0]['teams']
    
    found_players = []

    for item in teams:
        team_id = item['team']['id']
        team_abbr = item['team']['abbreviation']
        
        # 2. Fetch Roster for each team
        roster_url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{team_id}/roster"
        roster_resp = requests.get(roster_url, headers=HEADERS).json()
        
        # 3. Parse Athletes
        for group in roster_resp.get('athletes', []):
            for athlete in group.get('items', []):
                name = athlete.get('displayName')
                
                # CHECK: Is this a player we want?
                if name in TARGET_PLAYERS:
                    pid = athlete.get('id')
                    raw_pos = athlete.get('position', {}).get('abbreviation', 'UNK')
                    
                    # Manual High-Res Headshot Construction
                    headshot = f"https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/{pid}.png&w=350&h=254"

                    player_obj = {
                        "name": name,
                        "team": team_abbr,
                        "position": POS_MAP.get(raw_pos, raw_pos),
                        "college": "Unknown", # Roster API doesn't always have college, usually fine to update later
                        "image_url": headshot,
                        "rating": 90,
                        "tier": 1
                    }
                    found_players.append(player_obj)
                    
                    # Remove from target list so we know who we found
                    TARGET_PLAYERS.remove(name)

    return found_players

def main():
    print(f"🚀 Starting Search for {len(TARGET_PLAYERS)} players...")
    
    # Check existing DB first
    existing = supabase.table('players').select("name").execute()
    existing_names = {row['name'] for row in existing.data}
    
    # 1. Scrape Roster Data
    players_to_add = get_all_nfl_players()
    
    print(f"✅ Found {len(players_to_add)} matches in rosters.")
    if len(TARGET_PLAYERS) > 0:
        print(f"⚠️  Could not find these {len(TARGET_PLAYERS)} names (check spelling):")
        print(TARGET_PLAYERS)

    # 2. Insert into Supabase
    count = 0
    for p in players_to_add:
        if p['name'] in existing_names:
            print(f"Skipping {p['name']} (Already in DB)")
            continue

        try:
            supabase.table('players').insert(p).execute()
            print(f"  ✅ Inserted: {p['name']} ({p['team']})")
            count += 1
        except Exception as e:
            print(f"  ❌ Error inserting {p['name']}: {e}")

    print(f"\n🎉 Done! Added {count} new players.")

if __name__ == "__main__":
    main()