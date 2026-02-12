#!/usr/bin/env python3
"""
Sync tier changes from players.csv to Supabase
"""
import csv
import os
from supabase import create_client, Client

# Load Supabase credentials
try:
    from scripts.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
except ImportError:
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Missing Supabase credentials. Check scripts/config.py or environment variables.")

# Connect to Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
print(f"✅ Connected to Supabase: {SUPABASE_URL}")

# Read players from CSV
players_to_update = []

with open('players.csv', 'r') as f:
    reader = csv.reader(f)
    next(reader)  # Skip header
    
    for row in reader:
        if len(row) < 11:
            continue
        
        try:
            players_to_update.append({
                'id': int(row[0]),
                'name': row[1],
                'tier': int(row[6]),
                'sport': row[10].strip()
            })
        except:
            continue

print(f"\n📊 Found {len(players_to_update)} players in CSV")

# Update Supabase in batches
BATCH_SIZE = 100
updated_count = 0
error_count = 0

print(f"\n🔄 Syncing tier changes to Supabase...")

for i in range(0, len(players_to_update), BATCH_SIZE):
    batch = players_to_update[i:i+BATCH_SIZE]
    
    for player in batch:
        try:
            # Update tier for this player
            result = supabase.table('players').update({
                'tier': player['tier']
            }).eq('id', player['id']).execute()
            
            updated_count += 1
            
            # Show progress every 100 players
            if updated_count % 100 == 0:
                print(f"  ✓ Updated {updated_count}/{len(players_to_update)} players...")
                
        except Exception as e:
            error_count += 1
            print(f"  ✗ Error updating {player['name']} (ID: {player['id']}): {e}")

# Final summary
print("\n" + "=" * 80)
print("SYNC COMPLETE")
print("=" * 80)
print(f"✅ Successfully updated: {updated_count} players")
if error_count > 0:
    print(f"⚠️  Errors encountered: {error_count}")
else:
    print("🎉 No errors!")
print("=" * 80)
