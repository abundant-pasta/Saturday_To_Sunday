import os
import time
import re
import requests
import urllib.parse
from io import BytesIO
from PIL import Image
from supabase import create_client, Client
from dotenv import load_dotenv
from bs4 import BeautifulSoup

# Load environment variables
load_dotenv(".env.local")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Missing Supabase credentials in .env.local")

# Configuration
TABLE = "players"
SPORT = "basketball"
POLL_DELAY_SEC = 0.3
DEBUG = True

# --- HTTP SESSION CONFIG ---
session = requests.Session()
session.headers.update({
    "User-Agent": "SaturdayToSundayBot/1.0 (https://playsaturdaytosunday.com; contact@yourdomain.com)",
    "Accept": "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
})

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def normalize_name(name: str) -> str:
    """Removes suffixes like Jr., III, etc. for better search matching."""
    return re.sub(r"\s+(Jr\.|Sr\.|II|III|IV|V)$", "", name).strip()

def looks_like_image_bytes(b: bytes) -> bool:
    """
    CRITICAL: Verifies magic numbers for image formats.
    If the response starts with '<!DOC' or '{' (HTML/JSON), this returns False.
    This solves the 'a.espn' white-screen issue.
    """
    if b.startswith(b"\x89PNG\r\n\x1a\n"): return True
    if b.startswith(b"\xff\xd8"): return True  # JPEG
    if b.startswith(b"RIFF") and b[8:12] == b"WEBP": return True
    if b.startswith(b"GIF87a") or b.startswith(b"GIF89a"): return True
    return False

def fetch_image_bytes(url: str) -> bytes | None:
    """Downloads image bytes with validation."""
    if not url or url == 'i' or not url.startswith('http'):
        return None
    try:
        r = session.get(url, timeout=10, allow_redirects=True)
        if r.status_code != 200:
            return None
        
        content = r.content
        # If it's HTML (like the ESPN error page), the bytes won't match image signatures
        if not content or not looks_like_image_bytes(content[:32]):
            return None
            
        return content
    except Exception:
        return None

def url_is_good_image(url: str) -> bool:
    """Validates that a URL leads to a real, usable image file."""
    content = fetch_image_bytes(url)
    if content is None:
        return False
        
    try:
        img = Image.open(BytesIO(content))
        img.verify()
        # Filter out tiny placeholders or transparent 1x1 pixels
        if img.size[0] < 10 or img.size[1] < 10:
            return False
        return True
    except:
        return False

# --- SEARCH LOGIC (WIKI + BBR) ---

def wikipedia_search_title(query: str) -> str | None:
    params = {"action": "query", "list": "search", "srsearch": query, "format": "json", "utf8": 1, "srlimit": 1}
    try:
        r = session.get("https://en.wikipedia.org/w/api.php", params=params, timeout=10)
        data = r.json()
        hits = data.get("query", {}).get("search", [])
        return hits[0].get("title") if hits else None
    except: return None

def wikipedia_thumbnail_url(title: str) -> str | None:
    params = {"action": "query", "titles": title, "prop": "pageimages", "pithumbsize": 800, "format": "json"}
    try:
        r = session.get("https://en.wikipedia.org/w/api.php", params=params, timeout=10)
        data = r.json()
        pages = data.get("query", {}).get("pages", {})
        for _pid, page in pages.items():
            thumb = page.get("thumbnail", {})
            return thumb.get("source")
    except: return None

def bbr_headshot_from_name(name: str) -> str | None:
    q = urllib.parse.quote(name)
    search_url = f"https://www.basketball-reference.com/search/search.fcgi?search={q}"
    try:
        r = session.get(search_url, timeout=12)
        soup = BeautifulSoup(r.text, "html.parser")
        link = soup.select_one('div.search-item-name a[href^="/players/"]') or soup.select_one('a[href^="/players/"]')
        if not link: return None
        player_id = link.get("href").split("/")[-1].replace(".html", "")
        headshot = f"https://www.basketball-reference.com/req/202106291/images/headshots/{player_id}.jpg"
        if url_is_good_image(headshot): return headshot
    except: pass
    return None

def find_best_photo_url(player_name: str) -> str | None:
    q = normalize_name(player_name)
    title = wikipedia_search_title(f"{q} basketball player")
    if title:
        thumb_url = wikipedia_thumbnail_url(title)
        if thumb_url and url_is_good_image(thumb_url): return thumb_url
    return bbr_headshot_from_name(q)

# --- MAIN EXECUTION ---

def main():
    # Fetch ALL basketball players
    resp = (
        supabase.table(TABLE)
        .select("id,name,image_url")
        .eq("sport", SPORT)
        .execute()
    )
    
    players = resp.data or []
    print(f"Loaded {len(players)} total {SPORT} players. Auditing photos...")

    updates = 0
    for p in players:
        pid, name, current_url = p["id"], p["name"], p.get("image_url")

        # 1. Audit current photo
        # Is it null? Is it just 'i'? Does it fail the image-bytes check (ghost screen)?
        is_bad = False
        if not current_url or current_url == 'i':
            is_bad = True
        elif not url_is_good_image(current_url):
            is_bad = True

        if not is_bad:
            if DEBUG: print(f"[KEEP] {name} has a valid photo.")
            continue

        # 2. Fix bad photo
        print(f"[FIXING] {name} (Photo was missing, placeholder, or 'a.espn' ghost)")
        new_url = find_best_photo_url(name)
        
        if new_url:
            try:
                supabase.table(TABLE).update({"image_url": new_url}).eq("id", pid).execute()
                updates += 1
                print(f"  └─> [SUCCESS] Updated to: {new_url}")
            except Exception as e:
                print(f"  └─> [ERR] DB Update failed: {e}")
        else:
            print(f"  └─> [FAILED] No replacement found.")
        
        time.sleep(POLL_DELAY_SEC)

    print(f"\nAudit & Repair Complete.")
    print(f"Total Players Audited: {len(players)}")
    print(f"Photos Repaired: {updates}")

if __name__ == "__main__":
    main()