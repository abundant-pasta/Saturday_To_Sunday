import os
from supabase import create_client, Client
from dotenv import load_dotenv

# 1. Setup Supabase
current_dir = os.path.dirname(os.path.abspath(__file__))
# Note: We are looking for .env.local in the root now, or you can hardcode keys for the script
load_dotenv(os.path.join(current_dir, '../.env.local')) 

url = "xxx"
key = "xxx"

# If dotenv fails, paste your Service Role Key here for the script to work
# key = "PASTE_SERVICE_ROLE_KEY_HERE"

if not url or not key:
    print("❌ Error: Missing API Keys. Check your .env.local path.")
    exit()

supabase: Client = create_client(url, key)

# 2. The Legends Data
# We manually define them because they aren't in the 2024 roster API.
legends = [
    {
        "name": "Tom Brady",
        "team": "Patriots / Bucs",
        "position": "QB",
        "college": "Michigan",
        "image_url": "https://static.www.nfl.com/image/private/f_auto,q_auto/league/n7f1k3v2u4v1y2v1y2v1",
        "tier": 1,
        "rating": 99
    },
    {
        "name": "Peyton Manning",
        "team": "Colts / Broncos",
        "position": "QB",
        "college": "Tennessee",
        "image_url": "https://static.www.nfl.com/image/private/f_auto,q_auto/league/os341818181818181818", 
        "tier": 1,
        "rating": 99
    },
    {
        "name": "Jerry Rice",
        "team": "49ers",
        "position": "WR",
        "college": "Mississippi Valley State",
        "image_url": "https://static.www.nfl.com/image/private/f_auto,q_auto/league/m6m6m6m6m6m6m6m6m6m6", # Generic placeholder often works, but let's use a real one if possible
        "tier": 1,
        "rating": 99
    },
    {
        "name": "Randy Moss",
        "team": "Vikings",
        "position": "WR",
        "college": "Marshall",
        "image_url": "https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/1433.png",
        "tier": 1,
        "rating": 99
    },
    {
        "name": "Barry Sanders",
        "team": "Lions",
        "position": "RB",
        "college": "Oklahoma State",
        "image_url": "https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/60.png",
        "tier": 1,
        "rating": 99
    },
    {
        "name": "Sean Taylor",
        "team": "Redskins",
        "position": "S",
        "college": "Miami (FL)",
        "image_url": "https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/5529.png",
        "tier": 1,
        "rating": 99
    },
    {
        "name": "Calvin Johnson",
        "team": "Lions",
        "position": "WR",
        "college": "Georgia Tech",
        "image_url": "https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/10452.png",
        "tier": 1,
        "rating": 99
    },
    {
        "name": "Marshawn Lynch",
        "team": "Seahawks",
        "position": "RB",
        "college": "California",
        "image_url": "https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/10456.png",
        "tier": 1,
        "rating": 95
    },
    {
        "name": "Ed Reed",
        "team": "Ravens",
        "position": "S",
        "college": "Miami (FL)",
        "image_url": "https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/3547.png",
        "tier": 1,
        "rating": 99
    },
     {
        "name": "Michael Vick",
        "team": "Falcons",
        "position": "QB",
        "college": "Virginia Tech",
        "image_url": "https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/2549.png",
        "tier": 1,
        "rating": 95
    }
]

def seed_legends():
    print(f"🏈 Preparing to inject {len(legends)} legends...")
    
    for player in legends:
        # Check if player exists to avoid duplicates
        existing = supabase.table('players').select('id').eq('name', player['name']).execute()
        
        if existing.data and len(existing.data) > 0:
            print(f"⚠️  Skipping {player['name']} (Already exists)")
            continue
            
        # Insert
        try:
            supabase.table('players').insert(player).execute()
            print(f"✅ Added Legend: {player['name']}")
        except Exception as e:
            print(f"❌ Error adding {player['name']}: {e}")

if __name__ == "__main__":
    seed_legends()