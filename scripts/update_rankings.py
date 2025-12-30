import os
import time
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# Try importing Supabase, handle error gracefully if missing
try:
    from supabase import create_client, Client
except ImportError:
    print("CRITICAL ERROR: 'supabase' library not found.")
    print("Run this command in your terminal: pip install supabase")
    exit()

# 1. Setup Supabase
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, '../web/.env.local')
load_dotenv(env_path)

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not url or not key:
    print(f"Error: Could not find API keys in {env_path}")
    print("Make sure your .env.local file exists and has the keys.")
    exit()

supabase: Client = create_client(url, key)

def fetch_top_players():
    print("Fetching Top Players from Pro-Football-Reference (2023 AV)...")
    
    target_url = "https://www.pro-football-reference.com/years/2023/approxval.htm"
    
    # 2. THE FIX: Use a "Real Browser" User-Agent to avoid 429/403 blocks
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    try:
        response = requests.get(target_url, headers=headers)
    except Exception as e:
        print(f"Network error: {e}")
        return []
    
    if response.status_code != 200:
        print(f"Failed to fetch PFR. Status Code: {response.status_code}")
        print("They might be blocking this IP temporarily.")
        return []

    soup = BeautifulSoup(response.content, 'html.parser')
    table = soup.find('table', {'id': 'av'})
    
    updates = []
    
    if not table:
        print("Could not find the stats table.")
        return []

    rows = table.find('tbody').find_all('tr')
    print(f"Processing {len(rows)} rows...")

    for row in rows:
        if 'class' in row.attrs and 'thead' in row.attrs['class']:
            continue
            
        name_cell = row.find('td', {'data-stat': 'player'})
        av_cell = row.find('td', {'data-stat': 'av'})
        
        if not name_cell or not av_cell:
            continue
            
        name = name_cell.get_text().strip()
        clean_name = name.replace('*', '').replace('+', '').strip()
        
        try:
            av = int(av_cell.get_text())
        except:
            continue

        # We only care about players with a decent rating (AV >= 4)
        if av >= 4:
            updates.append({'username': clean_name, 'rating': av})

    return updates

def update_database(player_list):
    print(f"Found {len(player_list)} ranked players. Updating database...")
    
    count = 0
    # Batch these for speed? For now, simple loop is safer to debug.
    for p in player_list:
        try:
            # FIX: Use .table() to avoid SyntaxError with reserved keywords
            response = (
                supabase.table('players')
                .update({'rating': p['rating']})
                .eq('name', p['username'])
                .execute()
            )
            
            # Count successful updates
            if response.data and len(response.data) > 0:
                print(f"Updated {p['username']} -> Rating: {p['rating']}")
                count += 1
                
        except Exception as e:
            # Ignore errors for players not in our DB
            pass
        
    print(f"Done! Updated ratings for {count} players.")

if __name__ == "__main__":
    top_players = fetch_top_players()
    if top_players:
        update_database(top_players)
    else:
        print("No players found to update.")