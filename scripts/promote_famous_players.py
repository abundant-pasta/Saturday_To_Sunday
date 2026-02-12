#!/usr/bin/env python3
"""
Promote well-known players to higher tiers based on recognition/fame
Not based on rating, but on actual cultural impact and recognition
"""
import os, sys
from supabase import create_client

sys.path.append('scripts')
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# TIER 2 → TIER 1 (Hall of Famers, Cultural Icons, Widely Recognized Stars)
TIER2_TO_TIER1 = [
    "Terrell Owens",         # HOF, huge personality, "TO" 
    "Warren Sapp",           # HOF, very recognizable
    "Shannon Sharpe",        # HOF, now famous TV personality on Undisputed/First Take
    "Steve McNair",          # Co-MVP, Heisman finalist, tragic story - very well-known
    "Curtis Martin",         # HOF RB
    "Priest Holmes",         # Dominant fantasy football era, very popular
    "Shaun Alexander",       # NFL MVP, rushing champion
    "Chad Johnson",          # "Ochocinco" - huge personality, very famous
    "Hines Ward",            # Super Bowl MVP, Steelers legend
    "Plaxico Burress",       # Super Bowl catch, famous name
    "Maurice Jones-Drew",    # Fantasy football legend "MJD"
    "Warrick Dunn",          # Popular player, great story
    "Steve Slaton",          # Actually maybe not - remove
    "Amari Cooper",          # Current star, very well-known
    "Darren Sproles",        # Fan favorite, long career
    "Rodney Peete",          # Well-known QB, married to Holly Robinson Peete
    "Jim McMahon",           # Super Bowl winner, 85 Bears legend
    "Major Applewhite",      # Actually college-only fame - maybe not
]

# TIER 3 → TIER 2 (Notable players with good recognition)
TIER3_TO_TIER2 = [
    "Jeff Garcia",           # Pro Bowl QB, well-known
    "Rich Gannon",           # MVP winner
    "Marion Barber III",     # Popular Cowboys RB
    "Brandon Jacobs",        # Giants Super Bowl RB
    "Steve Slaton",          # Had some Houston fame
    "Elvis Dumervil",        # Good pass rusher, recognizable name
    "Nnamdi Asomugha",       # Shutdown corner, big contract fame
    "Dallas Clark",          # Colts TE, Peyton's target
    "Asante Samuel",         # Patriots/Eagles CB, well-known
    "Willie Parker",         # "Fast Willie" Steelers RB
    "Bob Sanders",           # Colts S, defensive player of year
]

print("=" * 80)
print("PROMOTING WELL-KNOWN PLAYERS BASED ON RECOGNITION")
print("=" * 80)

promoted_2_to_1 = 0
promoted_3_to_2 = 0

print("\nTIER 2 → TIER 1 (Fame/Recognition based):")
for name in TIER2_TO_TIER1:
    try:
        # Check current tier
        result = supabase.table('players').select('name,tier').eq('name', name).eq('sport', 'football').execute()
        if result.data and len(result.data) > 0:
            current_tier = result.data[0]['tier']
            if current_tier == 2:
                # Promote to Tier 1
                supabase.table('players').update({'tier': 1}).eq('name', name).eq('sport', 'football').execute()
                print(f"  ✅ {name:30s} (Tier 2 → Tier 1)")
                promoted_2_to_1 += 1
            elif current_tier == 1:
                print(f"  ⏭️  {name:30s} (already Tier 1)")
            else:
                print(f"  ⚠️  {name:30s} (currently Tier {current_tier})")
        else:
            print(f"  ❌ {name:30s} (not found)")
    except Exception as e:
        print(f"  ❌ {name:30s} (error: {e})")

print("\nTIER 3 → TIER 2 (Notable players):")
for name in TIER3_TO_TIER2:
    try:
        result = supabase.table('players').select('name,tier').eq('name', name).eq('sport', 'football').execute()
        if result.data and len(result.data) > 0:
            current_tier = result.data[0]['tier']
            if current_tier == 3:
                supabase.table('players').update({'tier': 2}).eq('name', name).eq('sport', 'football').execute()
                print(f"  ✅ {name:30s} (Tier 3 → Tier 2)")
                promoted_3_to_2 += 1
            elif current_tier == 2:
                print(f"  ⏭️  {name:30s} (already Tier 2)")
            else:
                print(f"  ⚠️  {name:30s} (currently Tier {current_tier})")
        else:
            print(f"  ❌ {name:30s} (not found)")
    except Exception as e:
        print(f"  ❌ {name:30s} (error: {e})")

print("\n" + "=" * 80)
print(f"✅ Promoted {promoted_2_to_1} players from Tier 2 → Tier 1")
print(f"✅ Promoted {promoted_3_to_2} players from Tier 3 → Tier 2")
print("=" * 80)

# Show new distribution
print("\nNEW TIER DISTRIBUTION:")
for tier in [1, 2, 3]:
    result = supabase.table('players').select('id', count='exact').eq('sport', 'football').eq('tier', tier).execute()
    print(f"  Tier {tier}: {result.count} players")
