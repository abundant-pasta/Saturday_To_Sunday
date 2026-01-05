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
    print("❌ Error: Missing credentials.")
    exit()

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- 2. CONFIGURATION ---
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
NFL_TEAMS_API = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=35"

POS_MAP = {
    'OT': 'OL', 'G': 'OL', 'C': 'OL', 'OG': 'OL',
    'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 
    'OLB': 'LB', 'ILB': 'LB', 'LB': 'LB',
    'CB': 'DB', 'S': 'DB', 'FS': 'DB', 'SS': 'DB', 'DB': 'DB'
}

# --- 3. TARGET LIST (104 Unique Names) ---
TARGET_BATCH_3 = {
    # QBs
    "Daniel Jones", "Gardner Minshew", "Bo Nix", "J.J. McCarthy", "Michael Penix Jr", "Jacoby Brissett",
    
    # RBs
    "AJ Dillon", "Alexander Mattison", "Keaton Mitchell", "Rico Dowdle", "J.K. Dobbins", "Jonathon Brooks", 
    "Trey Benson", "Blake Corum", "Chase Brown", "Roschon Johnson", "Ty Chandler", "Justice Hill",
    
    # WRs
    "Elijah Moore", "Rashod Bateman", "Darnell Mooney", "Khalil Shakir", "Wan'Dale Robinson", "Demario Douglas", 
    "Josh Palmer", "Michael Wilson", "Roman Wilson", "Xavier Worthy", "Brian Thomas Jr", "Keon Coleman", 
    "Ladd McConkey", "Adonai Mitchell", "Ricky Pearsall", "Xavier Legette", "Jalen McMillan", "Troy Franklin", 
    "Quentin Johnston",
    
    # TEs
    "Noah Fant", "Taysom Hill", "Cade Otton", "Chig Okonkwo", "Michael Mayer", "Tyler Higbee",
    "Gerald Everett", "Juwan Johnson", "Dawson Knox", "Jonnu Smith", "Ben Sinnott",
    
    # OL
    "Taylor Decker", "Orlando Brown Jr.", "Robert Hunt", "Kevin Dotson",
    
    # DL/Edge
    "Jonathan Greenard", "Bryce Huff", "Chase Young", "Grady Jarrett", "Kenny Clark", "Vita Vea", 
    "DeForest Buckner", "Grover Stewart", "Javon Kinlaw", "Samson Ebukam", "Uchenna Nwosu", "Odafe Oweh", 
    "Greg Rousseau", "Ed Oliver", "Travon Walker", "Carl Granderson", "BJ Ojulari", "Lukas Van Ness", "Byron Young",
    
    # LBs
    "Matt Milano", "Tremaine Edmunds", "Kyzir White", "Drue Tranquill", "Jordyn Brooks", "Jerome Baker", 
    "Shaq Thompson", "Frankie Luvu", "Devin Lloyd", "Quay Walker", "Pete Werner", "Willie Gay Jr.", 
    "Josey Jewell", "Ivan Pace Jr.", "Jack Campbell",
    
    # DBs
    "Kyle Dugger", "Jabrill Peppers", "Julian Blackmon", "C.J. Gardner-Johnson", "Jaire Alexander", 
    "Carlton Davis", "Kendall Fuller", "Kenny Moore II", "Taron Johnson", "Rasul Douglas", "Paulson Adebo", 
    "Tyson Campbell", "Kyler Gordon", "Camryn Bynum", "Grant Delpit", "Andre Cisco", "Kerby Joseph", "Reed Blankenship"
}

# Mapping for tricky names (Target Name -> [List of searchable substrings])
FUZZY_MATCHES = {
    "J.J. McCarthy": ["McCarthy", "J.J."],
    "Michael Penix Jr": ["Penix"],
    "C.J. Gardner-Johnson": ["Gardner-Johnson", "Ceedy Duce"],
    "Kenneth Walker III": ["Kenneth Walker"], # Just in case
    "Brian Thomas Jr": ["Brian Thomas"],
    "Marvin Harrison Jr.": ["Marvin Harrison"],
    "Bo Nix": ["Bo Nix"],
    "Wan'Dale Robinson": ["Wan'Dale", "Wandale"],
    "Chig Okonkwo": ["Chigoziem Okonkwo", "Chig"],
    "J.K. Dobbins": ["Dobbins", "J.K."],
    "Orlando Brown Jr.": ["Orlando Brown"]
}

def get_batch_3_players():
    print("🏈 Scanning NFL rosters for Batch 3...")
    
    resp = requests.get(NFL_TEAMS_API, headers=HEADERS).json()
    teams = resp['sports'][0]['leagues'][0]['teams']
    
    found_players = []
    
    # Convert set to list so we can modify it safely or just check against it
    remaining_targets = TARGET_BATCH_3.copy()

    for item in teams:
        team_id = item['team']['id']
        team_abbr = item['team']['abbreviation']
        
        roster_url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{team_id}/roster"
        roster_resp = requests.get(roster_url, headers=HEADERS).json()
        
        for group in roster_resp.get('athletes', []):
            for athlete in group.get('items', []):
                name = athlete.get('displayName', '')
                
                # 1. Direct Match
                match_name = None
                if name in remaining_targets:
                    match_name = name
                
                # 2. Fuzzy Match (if direct failed)
                if not match_name:
                    for target, search_terms in FUZZY_MATCHES.items():
                        if target in remaining_targets:
                            if any(term.lower() in name.lower() for term in search_terms):
                                match_name = target
                                break
                
                if match_name:
                    # Found one!
                    pid = athlete.get('id')
                    raw_pos = athlete.get('position', {}).get('abbreviation', 'UNK')
                    headshot = f"https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/{pid}.png&w=350&h=254"

                    found_players.append({
                        "name": match_name, # Use our clean name
                        "team": team_abbr,
                        "position": POS_MAP.get(raw_pos, raw_pos),
                        "college": "Unknown",
                        "image_url": headshot,
                        "rating": 88, # Slightly lower default for Batch 3 (Tier 2/3 potential) or keep 90
                        "tier": 1
                    })
                    
                    if match_name in remaining_targets:
                        remaining_targets.remove(match_name)

    return found_players, remaining_targets

def main():
    print(f"🚀 Starting Batch 3 Injection...")
    
    # 1. Get current DB names to prevent dupes
    existing = supabase.table('players').select("name").execute()
    existing_names = {row['name'] for row in existing.data}
    
    # 2. Find players
    players_to_add, missing = get_batch_3_players()
    
    print(f"✅ Found {len(players_to_add)} matches.")
    if missing:
        print(f"⚠️  Missing {len(missing)}: {missing}")

    # 3. Insert
    count = 0
    for p in players_to_add:
        if p['name'] in existing_names:
            print(f"Skipping {p['name']} (Already in DB)")
            continue

        try:
            supabase.table('players').insert(p).execute()
            print(f"  ✅ Inserted: {p['name']} ({p['team']})")
            count += 1
            time.sleep(0.1)
        except Exception as e:
            print(f"  ❌ Error inserting {p['name']}: {e}")

    print(f"\n🎉 Done! Added {count} new players.")

if __name__ == "__main__":
    main()