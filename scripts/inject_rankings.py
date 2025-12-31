import os
from supabase import create_client, Client
from dotenv import load_dotenv

# 1. Setup Supabase
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, '../web/.env.local')
load_dotenv(env_path)

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")

# --- IMPORTANT: PASTE YOUR SERVICE ROLE KEY HERE ---
# The Anon key blocked us. This key bypasses RLS permissions.
key = "xxx" 

if key == "PASTE_YOUR_SERVICE_ROLE_KEY_HERE":
    print("❌ STOP: You need to paste your Service Role Key into the script on line 14!")
    print("Go to Supabase Dashboard -> Project Settings -> API -> service_role key")
    exit()

supabase: Client = create_client(url, key)

# 2. The List of Stars
stars = [
    # Quarterbacks
    "Patrick Mahomes", "Lamar Jackson", "Josh Allen", "Joe Burrow", "Jalen Hurts",
    "Justin Herbert", "Trevor Lawrence", "Dak Prescott", "C.J. Stroud", "Aaron Rodgers",
    "Matthew Stafford", "Jared Goff", "Jordan Love", "Brock Purdy", "Kirk Cousins",
    
    # Running Backs
    "Christian McCaffrey", "Derrick Henry", "Saquon Barkley", "Bijan Robinson", 
    "Jonathan Taylor", "Breece Hall", "Travis Etienne Jr.", "Jahmyr Gibbs", "Nick Chubb",
    
    # Wide Receivers
    "Justin Jefferson", "Tyreek Hill", "CeeDee Lamb", "Ja'Marr Chase", "A.J. Brown",
    "Amon-Ra St. Brown", "Davante Adams", "Stefon Diggs", "Mike Evans", "Deebo Samuel",
    "Cooper Kupp", "Garrett Wilson", "Puka Nacua", "DeVonta Smith", "D.K. Metcalf",
    
    # Tight Ends
    "Travis Kelce", "George Kittle", "Mark Andrews", "Sam LaPorta", "T.J. Hockenson",
    
    # O-Line
    "Trent Williams", "Penei Sewell", "Lane Johnson", "Jason Kelce", "Zack Martin",
    
    # Defense
    "T.J. Watt", "Myles Garrett", "Nick Bosa", "Micah Parsons", "Maxx Crosby",
    "Chris Jones", "Aaron Donald", "Aidan Hutchinson", "Danielle Hunter", "Khalil Mack",
    "Fred Warner", "Roquan Smith", "Sauce Gardner", "Patrick Surtain II", "Jalen Ramsey",
    "Minkah Fitzpatrick", "Derwin James", "Kyle Hamilton", "Antoine Winfield Jr."
]

def inject_stars():
    # Diagnostic Check: Verify connection and data
    print("Checking database connection...")
    test = supabase.table('players').select('name').limit(1).execute()
    if not test.data:
        print("❌ Error: Connected, but 'players' table appears empty.")
        return
    print(f"✅ Connection successful. Found sample player: {test.data[0]['name']}")
    print(f"Injecting Star Power for {len(stars)} players...")
    
    count = 0
    for name in stars:
        try:
            response = (
                supabase.table('players')
                .update({'rating': 99})
                .ilike('name', f"%{name}%") 
                .execute()
            )
            
            if response.data and len(response.data) > 0:
                print(f"✅ Promoted: {response.data[0]['name']}")
                count += 1
            else:
                # Fallback: Try strict matching if fuzzy match fails
                pass 
                
        except Exception as e:
            print(f"Error on {name}: {e}")

    print(f"\nSUCCESS: {count} players are now ranked as Stars (Rating 99).")

if __name__ == "__main__":
    inject_stars()