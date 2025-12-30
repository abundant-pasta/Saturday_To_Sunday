import nfl_data_py as nfl
import pandas as pd
import json

# Run this via: python scripts/seed_players.py

def generate_player_data():
    print("🏈 Fetching NFL data... this may take a moment.")
    
    # 1. Get Roster Data (includes College, Headshots, Years of Exp)
    roster = nfl.import_seasonal_rosters([2024]) 
    
    # 2. Get Seasonal Stats
    weekly = nfl.import_weekly_data([2024])
    
    # Aggregate stats
    stats = weekly.groupby('player_id').agg({
        'fantasy_points_ppr': 'sum',
        'attempts': 'sum',
        'carries': 'sum', 
        'targets': 'sum'
    }).reset_index()

    # Merge Roster with Stats
    df = roster.merge(stats, on='player_id', how='left')
    df['fantasy_points_ppr'] = df['fantasy_points_ppr'].fillna(0)

    # 3. Define Tier Logic
    def determine_tier(row):
        # TIER 1: Superstars (High Fantasy Points or 8+ year vets)
        if row['fantasy_points_ppr'] > 180 or (row['years_exp'] > 8 and row['status'] == 'ACT'):
            return 1
        # TIER 2: Solid Starters (Decent points or >3 years exp)
        if row['fantasy_points_ppr'] > 70 or row['years_exp'] > 3:
            return 2
        # TIER 3: The Sickos (Everyone else)
        return 3

    # Filter for Active players only
    active_df = df[df['status'] == 'ACT'].copy()
    active_df['tier'] = active_df.apply(determine_tier, axis=1)

    # Clean Output
    output_df = active_df[[
        'player_name', 'team', 'position', 'college', 'headshot_url', 'tier'
    ]].rename(columns={'player_name': 'name', 'headshot_url': 'image_url'})

    # Remove players with no college data
    output_df = output_df.dropna(subset=['college'])
    
    players_json = output_df.to_dict(orient='records')

    with open('players.json', 'w') as f:
        json.dump(players_json, f, indent=2)
    
    print(f"✅ Seeding complete: {len(players_json)} players saved to players.json")

if __name__ == "__main__":
    generate_player_data()