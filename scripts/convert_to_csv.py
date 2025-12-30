import pandas as pd

# Load the JSON
df = pd.read_json('players.json')

# Save as CSV (without the index numbers)
df.to_csv('players.csv', index=False)

print("✅ Converted players.json to players.csv")