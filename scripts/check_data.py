import os
from supabase import create_client, Client
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(current_dir, '../web/.env.local'))

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
# Use the anon key is fine for reading
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") 

supabase: Client = create_client(url, key)

def check_stars():
    # Count how many players have a high rating
    response = supabase.table('players').select('*', count='exact').gt('rating', 50).execute()
    
    print(f"Total Players found with Rating > 50: {response.count}")
    
    if response.data:
        print("First 5 Stars found:")
        for p in response.data[:5]:
            print(f"- {p['name']} (Rating: {p['rating']})")
    else:
        print("❌ NO STARS FOUND. The injection script didn't work.")

if __name__ == "__main__":
    check_stars()