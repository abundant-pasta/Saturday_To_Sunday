#!/usr/bin/env python3
"""
Add missing Heisman Top 5 Finalists (1994-2024)
Ensures comprehensive coverage of all Heisman finalists from last 30 years
"""
import requests, os, sys
from datetime import datetime, timezone
from supabase import create_client, Client

try:
    sys.path.append('scripts')
    from config import SUPABASE_URL as FILE_URL, SUPABASE_SERVICE_ROLE_KEY as FILE_KEY
    SUPABASE_URL, SUPABASE_KEY = FILE_URL, FILE_KEY
except:
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
HEADERS = {"User-Agent": "Mozilla/5.0"}

# HEISMAN TOP 5 FINALISTS 1994-2024 (Likely missing ones - winners/top finalists)
HEISMAN_FINALISTS =  [
    # 1994 - Already have Rashaan Salaam, Ki-Jana Carter
    {"name": "Steve McNair", "pos": "QB", "college": "Alcorn State", "tier": 1, "rating": 95, "year": 1994},
    {"name": "Kerry Collins", "pos": "QB", "college": "Penn State", "tier": 2, "rating": 88, "year": 1994},
    {"name": "Jay Barker", "pos": "QB", "college": "Alabama", "tier": 3, "rating": 75, "year": 1994},
    
    # 1995 - Have Eddie George, Tommie Frazier, Danny Wuerffel, Troy Davis
    {"name": "Darnell Autry", "pos": "RB", "college": "Northwestern", "tier": 3, "rating": 75, "year": 1995},
    
    # 1996 - Have Danny Wuerffel, Troy Davis
    {"name": "Jake Plummer", "pos": "QB", "college": "Arizona State", "tier": 2, "rating": 88, "year": 1996},
    {"name": "Orlando Pace", "pos": "OL", "college": "Ohio State", "tier": 1, "rating": 95, "year": 1996},
    {"name": "Warrick Dunn", "pos": "RB", "college": "Florida State", "tier": 2, "rating": 92, "year": 1996},
    
    # 1997 - Have Charles Woodson, Peyton Manning, Randy Moss, Curtis Enis, Ricky Williams
    {"name": "Ryan Leaf", "pos": "QB", "college": "Washington State", "tier": 2, "rating": 88, "year": 1997},
    
    # 1998 - Have Ricky Williams
    {"name": "Michael Bishop", "pos": "QB", "college": "Kansas State", "tier": 3, "rating": 75, "year": 1998},
    {"name": "Cade McNown", "pos": "QB", "college": "UCLA", "tier": 3, "rating": 75, "year": 1998},
    {"name": "Tim Couch", "pos": "QB", "college": "Kentucky", "tier": 2, "rating": 88, "year": 1998},
    {"name": "Donovan McNabb", "pos": "QB", "college": "Syracuse", "tier": 1, "rating": 95, "year": 1998},
    
    # 1999 - Have Ron Dayne, Drew Brees
    {"name": "Joe Hamilton", "pos": "QB", "college": "Georgia Tech", "tier": 3, "rating": 75, "year": 1999},
    {"name": "Michael Vick", "pos": "QB", "college": "Virginia Tech", "tier": 1, "rating": 99, "year": 1999},
    {"name": "Chad Pennington", "pos": "QB", "college": "Marshall", "tier": 3, "rating": 75, "year": 1999},
    
    # 2000 - Have Chris Weinke, Drew Brees, LaDainian Tomlinson
    {"name": "Josh Heupel", "pos": "QB", "college": "Oklahoma", "tier": 3, "rating": 75, "year": 2000},
    {"name": "Damien Anderson", "pos": "RB", "college": "Northwestern", "tier": 3, "rating": 70, "year": 2000},
    
    # 2001 - Have Eric Crouch, Ken Dorsey
    {"name": "Rex Grossman", "pos": "QB", "college": "Florida", "tier": 2, "rating": 88, "year": 2001},
    {"name": "Joey Harrington", "pos": "QB", "college": "Oregon", "tier": 2, "rating": 88, "year": 2001},
    {"name": "David Carr", "pos": "QB", "college": "Fresno State", "tier": 2, "rating": 85, "year": 2001},
    
    # 2002
    {"name": "Carson Palmer", "pos": "QB", "college": "USC", "tier": 1, "rating": 99, "year": 2002},
    {"name": "Brad Banks", "pos": "QB", "college": "Iowa", "tier": 3, "rating": 75, "year": 2002},
    {"name": "Larry Johnson", "pos": "RB", "college": "Penn State", "tier": 2, "rating": 88, "year": 2002},
    {"name": "Willis McGahee", "pos": "RB", "college": "Miami", "tier": 2, "rating": 92, "year": 2002},
    
    # 2003 - Have Jason White, Larry Fitzgerald, Eli Manning
    {"name": "Chris Perry", "pos": "RB", "college": "Michigan", "tier": 3, "rating": 75, "year": 2003},
    {"name": "Darren Sproles", "pos": "RB", "college": "Kansas State", "tier": 2, "rating": 88, "year": 2003},
    
    # 2004 - Have Matt Leinart, Adrian Peterson, Jason White, Reggie Bush
    {"name": "Alex Smith", "pos": "QB", "college": "Utah", "tier": 2, "rating": 88, "year": 2004},
    
    # 2005 - Have Reggie Bush, Vince Young, Matt Leinart
    {"name": "Brady Quinn", "pos": "QB", "college": "Notre Dame", "tier": 2, "rating": 88, "year": 2005},
    {"name": "Michael Robinson", "pos": "QB", "college": "Penn State", "tier": 3, "rating": 75, "year": 2005},
    
    # 2006 - Have Troy Smith, Darren McFadden, Brady Quinn, Michael Hart
    {"name": "Steve Slaton", "pos": "RB", "college": "West Virginia", "tier": 3, "rating": 75, "year": 2006},
    
    # 2007-2024 most are likely already in database (recent players)
    # Adding a few that might be missing
    {"name": "Collin Klein", "pos": "QB", "college": "Kansas State", "tier": 2, "rating": 88, "year": 2012},
    {"name": "Marqise Lee", "pos": "WR", "college": "USC", "tier": 3, "rating": 75, "year": 2012},
    {"name": "Jordan Lynch", "pos": "QB", "college": "Northern Illinois", "tier": 3, "rating": 75, "year": 2013},
    {"name": "Andre Williams", "pos": "RB", "college": "Boston College", "tier": 3, "rating": 75, "year": 2013},
    {"name": "Melvin Gordon", "pos": "RB", "college": "Wisconsin", "tier": 2, "rating": 92, "year": 2014},
    {"name": "Amari Cooper", "pos": "WR", "college": "Alabama", "tier": 1, "rating": 95, "year": 2014},
    {"name": "Trevone Boykin", "pos": "QB", "college": "TCU", "tier": 3, "rating": 75, "year": 2014},
    {"name": "Christian McCaffrey", "pos": "RB", "college": "Stanford", "tier": 1, "rating": 99, "year": 2015},
    {"name": "Deshaun Watson", "pos": "QB", "college": "Clemson", "tier": 1, "rating": 99, "year": 2015},
    {"name": "Keenan Reynolds", "pos": "QB", "college": "Navy", "tier": 3, "rating": 75, "year": 2015},
    {"name": "Lamar Jackson", "pos": "QB", "college": "Louisville", "tier": 1, "rating": 99, "year": 2016},
    {"name": "Dede Westbrook", "pos": "WR", "college": "Oklahoma", "tier": 3, "rating": 75, "year": 2016},
    {"name": "Jabrill Peppers", "pos": "DB", "college": "Michigan", "tier": 2, "rating": 88, "year": 2016},
    {"name": "Bryce Love", "pos": "RB", "college": "Stanford", "tier": 3, "rating": 75, "year": 2017},
    {"name": "Dwayne Haskins", "pos": "QB", "college": "Ohio State", "tier": 2, "rating": 92, "year": 2018},
    {"name": "Will Grier", "pos": "QB", "college": "West Virginia", "tier": 3, "rating": 75, "year": 2018},
    {"name": "Gardner Minshew", "pos": "QB", "college": "Washington State", "tier": 3, "rating": 75, "year": 2018},
    {"name": "Joe Burrow", "pos": "QB", "college": "LSU", "tier": 1, "rating": 99, "year": 2019},
    {"name": "Chase Young", "pos": "DL", "college": "Ohio State", "tier": 1, "rating": 95, "year": 2019},
    {"name": "Jonathan Taylor", "pos": "RB", "college": "Wisconsin", "tier": 2, "rating": 92, "year": 2019},
    {"name": "DeVonta Smith", "pos": "WR", "college": "Alabama", "tier": 1, "rating": 99, "year": 2020},
    {"name": "Trevor Lawrence", "pos": "QB", "college": "Clemson", "tier": 1, "rating": 99, "year": 2020},
    {"name": "Mac Jones", "pos": "QB", "college": "Alabama", "tier": 2, "rating": 92, "year": 2020},
    {"name": "Kyle Trask", "pos": "QB", "college": "Florida", "tier": 2, "rating": 88, "year": 2020},
    {"name": "Najee Harris", "pos": "RB", "college": "Alabama", "tier": 2, "rating": 92, "year": 2020},
    {"name": "Bryce Young", "pos": "QB", "college": "Alabama", "tier": 1, "rating": 99, "year": 2021},
    {"name": "Aidan Hutchinson", "pos": "DL", "college": "Michigan", "tier": 1, "rating": 95, "year": 2021},
    {"name": "Kenny Pickett", "pos": "QB", "college": "Pitt", "tier": 2, "rating": 88, "year": 2021},
    {"name": "C.J. Stroud", "pos": "QB", "college": "Ohio State", "tier": 1, "rating": 99, "year": 2021},
    {"name": "Will Anderson Jr.", "pos": "LB", "college": "Alabama", "tier": 1, "rating": 95, "year": 2021},
    {"name": "Caleb Williams", "pos": "QB", "college": "USC", "tier": 1, "rating": 99, "year": 2022},
    {"name": "Max Duggan", "pos": "QB", "college": "TCU", "tier": 2, "rating": 88, "year": 2022},
    {"name": "Stetson Bennett", "pos": "QB", "college": "Georgia", "tier": 3, "rating": 75, "year": 2022},
    {"name": "Hendon Hooker", "pos": "QB", "college": "Tennessee", "tier": 3, "rating": 75, "year": 2022},
    {"name": "Jayden Daniels", "pos": "QB", "college": "LSU", "tier": 1, "rating": 99, "year": 2023},
    {"name": "Michael Penix Jr.", "pos": "QB", "college": "Washington", "tier": 2, "rating": 92, "year": 2023},
    {"name": "Bo Nix", "pos": "QB", "college": "Oregon", "tier": 2, "rating": 92, "year": 2023},
    {"name": "Marvin Harrison Jr.", "pos": "WR", "college": "Ohio State", "tier": 1, "rating": 95, "year": 2023},
    {"name": "Jordan Travis", "pos": "QB", "college": "Florida State", "tier": 3, "rating": 75, "year": 2023},
    {"name": "Travis Hunter", "pos": "DB", "college": "Colorado", "tier": 1, "rating": 99, "year": 2024},
    {"name": "Ashton Jeanty", "pos": "RB", "college": "Boise State", "tier": 1, "rating": 95, "year": 2024},
    {"name": "Dillon Gabriel", "pos": "QB", "college": "Oregon", "tier": 2, "rating": 92, "year": 2024},
    {"name": "Cam Ward", "pos": "QB", "college": "Miami", "tier": 2, "rating": 92, "year": 2024},
    {"name": "Cam Skattebo", "pos": "RB", "college": "Arizona State", "tier": 3, "rating": 75, "year": 2024},
]

def find_photo(name):
    """Quick photo search"""
    parts = name.lower().replace("'", "").replace(".", "").replace(" jr", "").split()
    if len(parts) < 2:
        return None
    first, last = parts[0], parts[-1]
    
    # Try ESPN
    for url in [f"https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/{last}{first[0]}.png",
                f"https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/{first[0]}{last}.png"]:
        try:
            if requests.head(url, headers=HEADERS, timeout=2).status_code == 200:
                return url
        except:
            pass
    
    # Try Wikipedia
    try:
        data = requests.get("https://en.wikipedia.org/w/api.php", params={
            "action": "query", "format": "json", "titles": name, "prop": "pageimages", "pithumbsize": 500
        }, headers=HEADERS, timeout=3).json()
        for page in data.get("query", {}).get("pages", {}).values():
            if "thumbnail" in page:
                return page["thumbnail"]["source"]
    except:
        pass
    return None

print("=" * 80)
print("🏆 ADDING MISSING HEISMAN TOP 5 FINALISTS (1994-2024)")
print("=" * 80)

existing = supabase.table('players').select("name").execute()
existing_names = {row['name'] for row in existing.data}

added = skipped = no_photo = 0
no_photo_list = []

for i, p in enumerate(HEISMAN_FINALISTS, 1):
    if p['name'] in existing_names:
        skipped += 1
        continue
    
    photo = find_photo(p['name'])
    if not photo:
        no_photo_list.append(p['name'])
        no_photo += 1
    
    try:
        supabase.table('players').insert({
            "name": p['name'], "team": "Legend", "position": p['pos'],
            "college": p['college'], "image_url": photo, "tier": p['tier'],
            "rating": p['rating'], "sport": "football",
            "added_to_db": datetime.now(timezone.utc).isoformat()
        }).execute()
        status = "✅" if photo else "⚠️"
        print(f"{added+1}. {status} {p['name']} - {p['college']} ({p['year']})")
        added += 1
    except Exception as e:
        if "duplicate" not in str(e).lower():
            print(f"❌ {p['name']}: {e}")

print("\n" + "=" * 80)
print(f"✅ Added: {added} | Skipped: {skipped} (already in DB) | NULL photos: {no_photo}")
if no_photo_list and no_photo <= 10:
    print("\nPlayers without photos:")
    for name in no_photo_list[:10]:
        print(f"  - {name}")
print("=" * 80)
