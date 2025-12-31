import pandas as pd
import nfl_data_py as nfl
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

# --- ERA CONFIGURATION ---
START_YEAR = 2000
END_YEAR = 2014

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def seed_2000s_legends():
    print(f"📚 Downloading NFL Data ({START_YEAR}-{END_YEAR})...")
    years = list(range(START_YEAR, END_YEAR + 1))
    
    # 1. Fetch Data
    print("   ...fetching stats")
    stats_df = nfl.import_seasonal_data(years)
    
    print("   ...fetching rosters")
    roster_df = nfl.import_seasonal_rosters(years)
    
    # 2. Merge for Headshots & Names
    print("   ...merging datasets")
    df = stats_df.merge(roster_df, on=['player_id', 'season'], suffixes=('', '_roster'))
    
    # 3. Define "Legend" Thresholds for the 2000s
    # slightly adjusted for that era's game style
    star_qbs = df[ (df['passing_yards'] >= 4000) | (df['passing_tds'] >= 28) ]
    star_rbs = df[ (df['rushing_yards'] >= 1200) | (df['rushing_tds'] >= 12) ]
    star_wrs = df[ (df['receiving_yards'] >= 1200) | (df['receiving_tds'] >= 10) ]
    
    # 4. Combine & Deduplicate
    legends_df = pd.concat([star_qbs, star_rbs, star_wrs])
    
    # Sort by season descending (so we get them in their prime/latest teams)
    legends_df = legends_df.sort_values(by='season', ascending=False)
    
    # Use roster name if available
    if 'player_name' not in legends_df.columns:
        if 'player_name_roster' in legends_df.columns:
            legends_df['player_name'] = legends_df['player_name_roster']

    # Keep only one version of each legend
    legends_df = legends_df.drop_duplicates(subset=['player_name'])
    
    print(f"🔍 Found {len(legends_df)} legends from the 2000s.")

    count = 0
    for _, row in legends_df.iterrows():
        # Clean up image
        image = row.get('headshot_url', row.get('headshot_url_roster'))
        if not image or str(image) == 'nan':
            continue

        # Clean up team
        team = row.get('team', row.get('recent_team', 'FA'))

        payload = {
            "name": row['player_name'],
            "team": team,
            "position": row['position'],
            "college": row.get('college', 'Unknown'), 
            "image_url": image,
            "tier": 1,        # Legend status
            "rating": 95      # Very high rating
        }

        try:
            # Check if they exist (don't overwrite if they are already there)
            existing = supabase.table('players').select('id').eq('name', payload['name']).execute()
            
            if not existing.data:
                supabase.table('players').insert(payload).execute()
                print(f"✅ Added Legend: {payload['name']} ({row['season']})")
                count += 1
            else:
                # If they exist (maybe as a generic player), UPGRADE them to Legend status
                supabase.table('players').update({
                    'rating': 95, 
                    'tier': 1,
                    'image_url': image # Update image to prime year if needed
                }).eq('name', payload['name']).execute()
                print(f"⚡ Upgraded to Legend: {payload['name']}")
                
        except Exception as e:
            pass
            
    print(f"\n🏆 Success! Injected {count} new legends.")

if __name__ == "__main__":
    seed_2000s_legends()