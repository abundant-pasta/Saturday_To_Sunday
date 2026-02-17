import csv
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Missing Supabase credentials in .env.local")

# Configuration
TABLE = "players"
INPUT_FILE = "no_photo_players_fixed.csv"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    players = []
    with open(INPUT_FILE, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        players = list(reader)

    print(f"Updating {len(players)} players in Supabase...")

    success_count = 0
    fail_count = 0

    for i, p in enumerate(players):
        pid = p['id']
        name = p['name']
        sport = p['sport']
        image_url = p['image_url']

        print(f"[{i+1}/{len(players)}] Updating {name} (ID: {pid})...")
        
        try:
            # Prepare update data
            update_data = {
                "sport": sport
            }
            # Only update image_url if it's not empty
            if image_url:
                update_data["image_url"] = image_url

            resp = supabase.table(TABLE).update(update_data).eq("id", pid).execute()
            
            if resp.data:
                print(f"  -> SUCCESS: Sport set to {sport}" + (f", Image updated" if image_url else ""))
                success_count += 1
            else:
                print(f"  -> FAILED: No data returned (might not exist)")
                fail_count += 1
        except Exception as e:
            print(f"  -> ERROR: {e}")
            fail_count += 1

    print(f"\nUpdate Complete!")
    print(f"Total Attempted: {len(players)}")
    print(f"Successful Updates: {success_count}")
    print(f"Failed Updates: {fail_count}")

if __name__ == "__main__":
    main()
