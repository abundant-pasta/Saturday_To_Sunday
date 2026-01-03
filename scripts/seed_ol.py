import os
import sys
import pandas as pd
import nfl_data_py as nfl
from supabase import create_client, Client

# --- SETUP: Import keys from your local config.py ---
# This adds the current directory (scripts/) to the search path
import pathlib
script_dir = pathlib.Path(__file__).parent.absolute()
sys.path.append(str(script_dir))

try:
    from config import SUPABASE_URL, SUPABASE_SERVICE_KEY
    # Validation
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError("Keys are empty in config.py")
        
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print(f"✅ Connection Authorized: {SUPABASE_URL}")
except ImportError:
    print("❌ Error: Could not find config.py in the scripts folder.")
    exit()
except ValueError as e:
    print(f"❌ Error: {e}")
    exit()

# 2. The 50+ Offensive Line Stars
ol_stars = [
    # --- Elite Tackles (OT) ---
    "Trent Williams", "Tyron Smith", "Lane Johnson", "Tristan Wirfs", "Penei Sewell", 
    "Laremy Tunsil", "Andrew Whitworth", "Jason Peters", "Joe Thomas", "David Bakhtiari", 
    "Ryan Ramczyk", "Terron Armstead", "Rashawn Slater", "Christian Darrisaw", "Jordan Mailata", 
    "Kolton Miller", "Orlando Brown Jr.", "Taylor Lewan", "Jake Matthews", "Ronnie Stanley", 
    "Mitchell Schwartz", "Eric Fisher", "Dion Dawkins", "Brian O'Neill", "Rob Havenstein", 
    "Duane Brown", "Morgan Moses", "Garett Bolles", "Jedrick Wills Jr.", "Kaleb McGary",

    # --- Elite Guards (G) ---
    "Zack Martin", "Quenton Nelson", "Joel Bitonio", "Marshal Yanda", "Chris Lindstrom", 
    "Brandon Brooks", "Elgton Jenkins", "Joe Thuney", "Wyatt Teller", "Shaq Mason", 
    "Ali Marpet", "David DeCastro", "Jahri Evans", "Richie Incognito", "Kevin Zeitler", 
    "Landon Dickerson", "Trey Smith", "Tyler Smith", "Michael Onwenu", "Teven Jenkins",
    "Rodger Saffold", "James Daniels", "Isaac Seumalo",

    # --- Elite Centers (C) ---
    "Jason Kelce", "Travis Frederick", "Maurkice Pouncey", "Rodney Hudson", "Frank Ragnow", 
    "Creed Humphrey", "Corey Linsley", "Alex Mack", "Nick Mangold", "Ryan Kalil", 
    "David Andrews", "Tyler Linderbaum", "Mitch Morse", "Ryan Kelly", "Erik McCoy",
    "Ben Jones", "J.C. Tretter"
]

def fetch_real_headshots():
    """
    Downloads NFL roster data from 2015-2024 to find real ESPN headshots.
    Returns a dictionary: { 'Player Name': 'https://espn...png' }
    """
    print("🏈 Downloading NFL Roster Data (2015-2024)... this takes ~10 seconds.")
    # We grab multiple years to ensure we catch retired legends like Joe Thomas/Yanda
    years = range(2015, 2025)
    
    try:
        df = nfl.import_seasonal_rosters(years)
    except Exception as e:
        print(f"⚠️  NFL Data Download Error: {e}")
        return {}
    
    # Sort by season descending so we grab the MOST RECENT headshot available
    df = df.sort_values(by='season', ascending=False)
    
    # Create a lookup dictionary
    headshot_map = {}
    
    for _, row in df.iterrows():
        name = row['player_name']
        url = row['headshot_url']
        
        # Only save if we haven't seen this player yet (keeps the most recent)
        if name not in headshot_map and pd.notna(url):
            headshot_map[name] = url
            
    print(f"✅ Indexed {len(headshot_map)} player headshots.")
    return headshot_map

def seed_ol_army():
    # 1. Get the real photos first
    headshot_lookup = fetch_real_headshots()
    
    print(f"\n🚀 Starting Injection of {len(ol_stars)} Offensive Linemen...")
    count_added = 0
    count_updated = 0
    count_missing_img = 0

    for name in ol_stars:
        # Check if we found a photo
        real_image = headshot_lookup.get(name)
        
        if not real_image:
            print(f"⚠️  No ESPN headshot found for {name}. Skipping to avoid placeholder.")
            count_missing_img += 1
            continue

        payload = {
            "name": name,
            "image_url": real_image,
            "rating": 95, 
            "tier": 1,
            "position": "OL",  # Defaulting to OL generic, or you can map specific positions
            "team": "Legend",
            "college": "Unknown" # You can add a college lookup if needed
        }

        try:
            # 2. Check if player exists
            existing = supabase.table('players').select('id').eq('name', name).execute()
            
            if not existing.data:
                # INSERT NEW
                supabase.table('players').insert(payload).execute()
                print(f"✨ Created: {name}")
                count_added += 1
            else:
                # UPDATE EXISTING (Force update rating/tier/image for these legends)
                supabase.table('players').update({
                    "rating": 95,
                    "image_url": real_image,
                    "tier": 1
                }).eq('name', name).execute()
                print(f"⚡ Updated: {name}")
                count_updated += 1
                
        except Exception as e:
            print(f"❌ Error processing {name}: {e}")

    print(f"\n🏆 OPERATION COMPLETE")
    print(f"   New Recruits: {count_added}")
    print(f"   Veterans Updated: {count_updated}")
    print(f"   Skipped (No Photo): {count_missing_img}")

if __name__ == "__main__":
    seed_ol_army()