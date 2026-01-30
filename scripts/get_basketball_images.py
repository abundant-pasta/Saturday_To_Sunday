import requests

# The exact list of 140 new players we just added
TARGET_PLAYERS = [
    # T1
    "Victor Wembanyama", "John Havlicek", "Bob McAdoo", "Chris Paul", "Tim Hardaway",
    "Dennis Rodman", "Steve Francis", "LaMarcus Aldridge", "DeAndre Jordan", "Rajon Rondo",
    "Kyle Lowry", "Mike Conley", "Al Horford", "Marc Gasol", "Zach Randolph",
    "Antawn Jamison", "Jermaine O'Neal", "Elton Brand", "Metta World Peace", "Andrei Kirilenko",
    "Hal Greer", "Billy Cunningham", "Dave DeBusschere", "Bill Sharman", "Nate Thurmond",
    "Walt Bellamy", "Bob Lanier", "Dave Bing", "Lenny Wilkens", "Earl Monroe",
    "Dan Issel", "Adrian Dantley", "Dennis Johnson", "Gus Williams", "Joe Dumars",
    "Mark Price", "Brad Daugherty", "Glen Rice", "Latrell Sprewell", "Allan Houston",
    "Larry Johnson", "Detlef Schrempf", "Vlade Divac", "Drazen Petrovic", "Toni Kukoc",
    "Jamal Mashburn", "Glenn Robinson", "Vin Baker", "Antonio McDyess", "Shareef Abdur-Rahim",
    
    # T2
    "Paolo Banchero", "Chet Holmgren", "Scottie Barnes", "Cade Cunningham", "Franz Wagner",
    "Jalen Williams", "Evan Mobley", "Jarrett Allen", "LaMelo Ball", "Brandon Miller",
    "Miles Bridges", "Alperen Sengun", "Jalen Green", "Jabari Smith Jr.", "Dejounte Murray",
    "Herbert Jones", "Trey Murphy III", "Collin Sexton", "Walker Kessler", "Jordan Clarkson",
    "John Collins", "Anfernee Simons", "Jerami Grant", "Shaedon Sharpe", "Scoot Henderson",
    "Jonas Valanciunas", "Malcolm Brogdon", "Terry Rozier", "Jaime Jaquez Jr.", "Nikola Jovic",
    "Bennedict Mathurin", "Andrew Nembhard", "Aaron Nesmith", "Obi Toppin", "OG Anunoby",
    "Donte DiVincenzo", "Rudy Gobert", "Naz Reid", "Jaden McDaniels", "Grayson Allen",
    "Jusuf Nurkic", "Tyus Jones", "Austin Reaves", "D'Angelo Russell", "Jarred Vanderbilt",
    "Norman Powell", "Ivica Zubac", "Terance Mann", "Derrick Jones Jr.", "Bobby Portis",
    "Gary Trent Jr.", "Jalen Duren", "Jaden Ivey", "Ausar Thompson", "Isaiah Stewart",
    "Nikola Vucevic", "Coby White", "Josh Giddey", "Patrick Williams", "Ayo Dosunmu",
    
    # T3
    "Kentavious Caldwell-Pope", "Christian Braun", "Peyton Watson", "Julian Strawther", "Dario Saric",
    "Kristaps Porzingis", "Sam Hauser", "Luke Kornet", "Xavier Tillman", "Isaiah Hartenstein",
    "Lu Dort", "Cason Wallace", "Aaron Wiggins", "Jaylin Williams", "Kenrich Williams",
    "P.J. Washington", "Daniel Gafford", "Dereck Lively II", "Naji Marshall", "Maxi Kleber",
    "Spencer Dinwiddie", "Quentin Grimes", "Jeremy Sochan", "Keldon Johnson", "Devin Vassell",
    "Tre Jones", "Zach Collins", "Stephon Castle", "Julian Champagnie", "Malaki Branham"
]

def fetch_espn_images():
    print("-- CONNECTING TO ESPN API...")
    teams_url = "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=30"
    try:
        teams_data = requests.get(teams_url).json()
    except:
        print("-- ERROR: Could not connect to ESPN.")
        return

    player_map = {}
    print("-- SCANNING ROSTERS...")
    for sport in teams_data['sports']:
        for league in sport['leagues']:
            for team_entry in league['teams']:
                team_id = team_entry['team']['id']
                roster_url = f"http://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{team_id}/roster"
                roster_data = requests.get(roster_url).json()
                for athlete_entry in roster_data.get('athletes', []):
                    name = athlete_entry['fullName']
                    espn_id = athlete_entry['id']
                    image_url = f"https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/{espn_id}.png"
                    player_map[name] = image_url

    print("\n-- COPY THE SQL BELOW --\n")
    for target in TARGET_PLAYERS:
        if target in player_map:
            url = player_map[target]
            safe_name = target.replace("'", "''")
            print(f"UPDATE players SET image_url = '{url}' WHERE name = '{safe_name}';")
        else:
            # Simple fuzzy match for names like "P.J." vs "PJ"
            found = False
            for active_name, url in player_map.items():
                if target.replace('.', '') == active_name.replace('.', ''):
                    safe_name = target.replace("'", "''")
                    print(f"UPDATE players SET image_url = '{url}' WHERE name = '{safe_name}';")
                    found = True
                    break
            if not found:
                 print(f"-- NOTE: Could not find live image for {target} (Legend or Free Agent)")

if __name__ == "__main__":
    fetch_espn_images()