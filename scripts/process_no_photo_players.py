import csv
import os
import re
import time
import requests
import urllib.parse
from io import BytesIO
from PIL import Image
from bs4 import BeautifulSoup

# --- HTTP SESSION CONFIG ---
session = requests.Session()
session.headers.update({
    "User-Agent": "SaturdayToSundayBot/1.0 (https://playsaturdaytosunday.com; contact@yourdomain.com)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
})

INPUT_FILE = "no_photo_players.csv"
OUTPUT_FILE = "no_photo_players_fixed.csv"
POLL_DELAY_SEC = 0.5

def normalize_name(name: str) -> str:
    """Removes suffixes like Jr., III, etc."""
    return re.sub(r"\s+(Jr\.|Sr\.|II|III|IV|V)$", "", name).strip()

def looks_like_image_bytes(b: bytes) -> bool:
    if b.startswith(b"\x89PNG\r\n\x1a\n"): return True
    if b.startswith(b"\xff\xd8"): return True  # JPEG
    if b.startswith(b"RIFF") and b[8:12] == b"WEBP": return True
    if b.startswith(b"GIF87a") or b.startswith(b"GIF89a"): return True
    return False

def url_is_good_image(url: str) -> bool:
    if not url or url == 'i' or not url.startswith('http'):
        return False
    try:
        r = session.get(url, timeout=10, allow_redirects=True)
        if r.status_code != 200:
            return False
        content = r.content
        if not content or not looks_like_image_bytes(content[:32]):
            return False
        img = Image.open(BytesIO(content))
        img.verify()
        if img.size[0] < 10 or img.size[1] < 10:
            return False
        return True
    except:
        return False

def determine_sport_and_photo(name: str, position: str):
    """
    Returns (sport, photo_url)
    """
    q = normalize_name(name)
    pos = position.upper() if position else ""
    
    # Heuristics based on position
    football_positions = {'QB', 'RB', 'WR', 'TE', 'LT', 'LG', 'RG', 'RT', 'DE', 'DT', 'LB', 'CB', 'S', 'K', 'P', 'LS', 'HC', 'DL', 'FB', 'OT', 'OG', 'DB'}
    basketball_positions = {'G', 'F', 'PG', 'SG', 'SF', 'PF'}
    
    detected_sport = "football" # Default
    if any(p in pos for p in football_positions):
        detected_sport = "football"
    elif any(p in pos for p in basketball_positions):
        detected_sport = "basketball"
    # Note: 'C' is ambiguous, leave for search

    # 1. Wikipedia Search
    params = {
        "action": "query",
        "list": "search",
        "srsearch": f"{q} {detected_sport if detected_sport else 'player'}",
        "format": "json",
        "utf8": 1,
        "srlimit": 3
    }
    
    final_sport = detected_sport
    photo_url = None
    
    try:
        r = session.get("https://en.wikipedia.org/w/api.php", params=params, timeout=10)
        data = r.json()
        hits = data.get("query", {}).get("search", [])
        
        if hits:
            # If sport was ambiguous (e.g. 'C'), try to identify it
            if position.upper() == 'C' or not detected_sport:
                combined_text = " ".join([h.get("snippet", "") + h.get("title", "") for h in hits]).lower()
                if "basketball" in combined_text or "nba" in combined_text:
                    final_sport = "basketball"
                elif "football" in combined_text or "nfl" in combined_text:
                    final_sport = "football"
            
            # Try to get thumbnail from the first hit
            best_title = hits[0].get("title")
            thumb_params = {
                "action": "query",
                "titles": best_title,
                "prop": "pageimages",
                "pithumbsize": 800,
                "format": "json"
            }
            r_thumb = session.get("https://en.wikipedia.org/w/api.php", params=thumb_params, timeout=10)
            thumb_data = r_thumb.json()
            pages = thumb_data.get("query", {}).get("pages", {})
            for pid in pages:
                source = pages[pid].get("thumbnail", {}).get("source")
                if source:
                    photo_url = source
                    break
    except Exception as e:
        print(f"  [ERROR] Wiki search for {name}: {e}")

    # 2. If basketball, try BBRef for potentially better photo
    if final_sport == "basketball":
        try:
            safe_q = urllib.parse.quote(q)
            search_url = f"https://www.basketball-reference.com/search/search.fcgi?search={safe_q}"
            r_bbr = session.get(search_url, timeout=12)
            soup = BeautifulSoup(r_bbr.text, "html.parser")
            link = soup.select_one('div.search-item-name a[href^="/players/"]') or soup.select_one('a[href^="/players/"]')
            if link:
                player_id = link.get("href").split("/")[-1].replace(".html", "")
                bbr_headshot = f"https://www.basketball-reference.com/req/202106291/images/headshots/{player_id}.jpg"
                # If BBRef has a good one, use it over wiki
                if url_is_good_image(bbr_headshot):
                    photo_url = bbr_headshot
        except:
            pass
            
    return final_sport, photo_url

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    players = []
    with open(INPUT_FILE, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        players = list(reader)

    print(f"Processing {len(players)} players...")
    
    fieldnames = reader.fieldnames
    
    fixed_players = []
    for i, p in enumerate(players):
        name = p['name']
        position = p.get('position', '')
        print(f"[{i+1}/{len(players)}] Processing {name} ({position})...")
        
        # Determine sport and photo
        new_sport, new_photo = determine_sport_and_photo(name, position)
        
        # Log changes
        if new_sport != p['sport']:
            print(f"  -> Sport changed: {p['sport']} -> {new_sport}")
        if new_photo:
            print(f"  -> Found photo: {new_photo[:60]}...")
        else:
            print(f"  -> No photo found.")
            
        p['sport'] = new_sport
        p['image_url'] = new_photo if new_photo else ""
        
        fixed_players.append(p)
        time.sleep(POLL_DELAY_SEC)

    # Write fixed data
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(fixed_players)

    print(f"\nDone! Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
