#!/usr/bin/env python3
"""
Fix timestamps for newly added college stars - convert to UTC
"""
import os
import sys
from datetime import datetime, timezone
from supabase import create_client, Client

# --- SETUP CREDENTIALS ---
try:
    sys.path.append('scripts')
    from config import SUPABASE_URL as FILE_URL, SUPABASE_SERVICE_ROLE_KEY as FILE_KEY
    SUPABASE_URL = FILE_URL
    SUPABASE_KEY = FILE_KEY
except ImportError:
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# All the players we just added
NEW_COLLEGE_STARS = [
    "Tim Tebow", "Archie Griffin", "Johnny Manziel", "Matt Leinart", "Charlie Ward",
    "Robert Griffin III", "Troy Smith", "Danny Wuerffel", "Desmond Howard", "Ron Dayne",
    "Gino Torretta", "Ty Detmer", "Andre Ware", "Chris Weinke", "Sam Bradford",
    "Colt McCoy", "Case Keenum", "Graham Harrell", "JaMarcus Russell", "Jake Coker",
    "Cardale Jones", "Braxton Miller", "Terrelle Pryor", "Christian Ponder", "Kellen Moore",
    "Colin Kaepernick", "Colt Brennan", "Dennis Dixon", "Chase Daniel", "Ken Dorsey",
    "Brandon Weeden", "Seneca Wallace", "Trent Richardson", "Montee Ball", "Shonn Greene",
    "Knowshon Moreno", "Toby Gerhart", "Beanie Wells", "Troy Davis", "Michael Crabtree",
    "Dwayne Jarrett", "Justin Blackmon", "Tavon Austin", "Rolando McClain", "Vontaze Burfict",
    "Taylor Mays", "Eric Crouch", "Rashaan Salaam", "Matt Flynn", "AJ McCarron",
    "Pat White", "Brad Smith", "Michael Hart", "Manti Te'o"
]

def main():
    print("=" * 80)
    print("🕐 FIXING TIMESTAMPS TO UTC")
    print("=" * 80)
    
    # Get current UTC time
    utc_now = datetime.now(timezone.utc).isoformat()
    
    updated_count = 0
    
    for player_name in NEW_COLLEGE_STARS:
        try:
            # Update the timestamp to UTC
            result = supabase.table('players').update({
                'added_to_db': utc_now
            }).eq('name', player_name).execute()
            
            if result.data:
                print(f"✅ Updated {player_name}")
                updated_count += 1
            else:
                print(f"⏭️  Skipped {player_name} (not found)")
                
        except Exception as e:
            print(f"❌ Error updating {player_name}: {e}")
    
    # Summary
    print("\n" + "=" * 80)
    print(f"✅ Updated {updated_count} player timestamps to UTC")
    print(f"🕐 UTC timestamp: {utc_now}")
    print("=" * 80)

if __name__ == "__main__":
    main()
