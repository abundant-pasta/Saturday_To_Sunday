#!/usr/bin/env python3
"""
Preview or insert curated, well-known players.

Default behavior is a dry run against the local players.csv snapshot.
Use --apply to insert only the missing names into Supabase.
"""

from __future__ import annotations

import argparse
import ast
import csv
import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import requests
from supabase import Client, create_client


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CATALOG_PATH = Path(__file__).resolve().with_name("well_known_players_catalog.json")
DEFAULT_CSV_PATH = ROOT / "players.csv"
WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
HEADERS = {"User-Agent": "SaturdayToSunday/1.0"}
REPO_SCRIPT_SOURCES = [
    ROOT / "scripts" / "add_80s_90s_legends.py",
    ROOT / "scripts" / "add_alltime_greats.py",
    ROOT / "scripts" / "add_college_stars.py",
    ROOT / "scripts" / "add_heisman_finalists.py",
    ROOT / "scripts" / "add_players_null_photos.py",
    ROOT / "scripts" / "add_tier1_legends.py",
    ROOT / "scripts" / "seed_legends.py",
    ROOT / "scripts" / "seed_ol.py",
    ROOT / "scripts" / "seed_pro_bowlers.py",
    ROOT / "scripts" / "add_survival_players_batch1.ts",
    ROOT / "scripts" / "add_survival_players_batch2.ts",
    ROOT / "scripts" / "add_survival_players_batch3.ts",
    ROOT / "scripts" / "add_survival_players_batch4.ts",
    ROOT / "scripts" / "add_survival_players_batch5.ts",
    ROOT / "scripts" / "add_survival_players_batch6.ts",
    ROOT / "scripts" / "add_survival_players_batch7.ts",
    ROOT / "scripts" / "add_survival_players_batch8.ts",
]


@dataclass(frozen=True)
class CatalogPlayer:
    name: str
    team: str
    position: str
    college: str
    tier: int
    rating: int
    sport: str
    game_mode: str = "daily"
    image_url: str | None = None

    @property
    def key(self) -> tuple[str, str]:
        return normalize_key(self.name, self.sport)


def normalize_key(name: str, sport: str) -> tuple[str, str]:
    return (name.strip().lower(), sport.strip().lower())


def has_usable_college(player: CatalogPlayer) -> bool:
    return bool(player.college and player.college.strip().lower() not in {"unknown", "n/a", "na", "none"})


def load_json_catalog(path: Path, sport_filter: str) -> list[CatalogPlayer]:
    with path.open(encoding="utf-8") as f:
        raw_players = json.load(f)

    players = [CatalogPlayer(**row) for row in raw_players]
    if sport_filter == "all":
        return players
    return [player for player in players if player.sport == sport_filter]


def _get_constant(node: ast.AST) -> str | int | None:
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub) and isinstance(node.operand, ast.Constant):
        if isinstance(node.operand.value, (int, float)):
            return -node.operand.value
    return None


def _parse_python_dict_list(path: Path) -> list[CatalogPlayer]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    players: list[CatalogPlayer] = []

    for node in ast.walk(tree):
        if not isinstance(node, ast.Assign) or not isinstance(node.value, ast.List):
            continue

        targets = [target.id for target in node.targets if isinstance(target, ast.Name)]
        target_name = targets[0] if targets else ""

        for element in node.value.elts:
            if isinstance(element, ast.Dict):
                values: dict[str, object] = {}
                for key_node, value_node in zip(element.keys, element.values):
                    key = _get_constant(key_node)
                    if not isinstance(key, str):
                        continue
                    values[key] = _get_constant(value_node)

                required = {"name", "team", "position", "college", "tier"}
                if not required.issubset(values):
                    continue

                sport = str(values.get("sport") or "football")
                players.append(
                    CatalogPlayer(
                        name=str(values["name"]),
                        team=str(values["team"]),
                        position=str(values["position"]),
                        college=str(values["college"]),
                        tier=int(values["tier"]),
                        rating=int(values.get("rating") or 0),
                        sport=sport,
                        game_mode=str(values.get("game_mode") or "daily"),
                        image_url=str(values["image_url"]) if values.get("image_url") else None,
                    )
                )
            elif isinstance(element, ast.Constant) and isinstance(element.value, str) and target_name == "ol_stars":
                players.append(
                    CatalogPlayer(
                        name=element.value,
                        team="Legend",
                        position="OL",
                        college="Unknown",
                        tier=1,
                        rating=95,
                        sport="football",
                        game_mode="daily",
                    )
                )

    return players


def _parse_ts_batches(path: Path) -> list[CatalogPlayer]:
    text = path.read_text(encoding="utf-8")
    object_pattern = re.compile(r"\{(?P<body>.*?)\}", re.S)
    field_patterns = {
        "name": re.compile(r"name:\s*'((?:\\'|[^'])*)'"),
        "college": re.compile(r"college:\s*'((?:\\'|[^'])*)'"),
        "team": re.compile(r"team:\s*'((?:\\'|[^'])*)'"),
        "position": re.compile(r"position:\s*'((?:\\'|[^'])*)'"),
        "tier": re.compile(r"tier:\s*(\d+)"),
    }

    players: list[CatalogPlayer] = []
    for match in object_pattern.finditer(text):
        body = match.group("body")
        extracted: dict[str, str] = {}
        for field, pattern in field_patterns.items():
            field_match = pattern.search(body)
            if field_match:
                extracted[field] = field_match.group(1).replace("\\'", "'")

        required = {"name", "college", "team", "position", "tier"}
        if not required.issubset(extracted):
            continue

        players.append(
            CatalogPlayer(
                name=extracted["name"],
                college=extracted["college"],
                team=extracted["team"],
                position=extracted["position"],
                tier=int(extracted["tier"]),
                rating=0,
                sport="basketball",
                game_mode="survival",
            )
        )

    return players


def load_repo_catalog(sport_filter: str) -> list[CatalogPlayer]:
    catalog_by_key: dict[tuple[str, str], CatalogPlayer] = {}

    for path in REPO_SCRIPT_SOURCES:
        extracted = _parse_ts_batches(path) if path.suffix == ".ts" else _parse_python_dict_list(path)
        for player in extracted:
            if sport_filter != "all" and player.sport != sport_filter:
                continue
            catalog_by_key[player.key] = player

    return sorted(catalog_by_key.values(), key=lambda player: (player.sport, player.name))


def load_existing_from_csv(path: Path) -> set[tuple[str, str]]:
    if not path.exists():
        raise FileNotFoundError(f"Could not find CSV snapshot at {path}")

    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return {normalize_key(row["name"], row["sport"]) for row in reader if row.get("name") and row.get("sport")}


def load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        os.environ.setdefault(key, value)


def create_supabase() -> Client:
    load_env_file(ROOT / ".env.local")

    try:
        from scripts.config import SUPABASE_URL as CONFIG_URL, SUPABASE_SERVICE_ROLE_KEY as CONFIG_KEY
    except Exception:
        CONFIG_URL = None
        CONFIG_KEY = None

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or CONFIG_URL
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or CONFIG_KEY

    if not url or not key:
        raise RuntimeError("Missing Supabase credentials in .env.local, env vars, or scripts/config.py")

    return create_client(url, key)


def load_existing_from_supabase(client: Client, sport_filter: str) -> set[tuple[str, str]]:
    sports = [sport_filter] if sport_filter != "all" else ["football", "basketball"]
    existing: set[tuple[str, str]] = set()

    for sport in sports:
        response = client.table("players").select("name,sport").eq("sport", sport).execute()
        for row in response.data or []:
            if row.get("name") and row.get("sport"):
                existing.add(normalize_key(row["name"], row["sport"]))

    return existing


def find_missing(catalog: Iterable[CatalogPlayer], existing: set[tuple[str, str]]) -> list[CatalogPlayer]:
    return [player for player in catalog if player.key not in existing]


def fetch_wikipedia_image(player_name: str) -> str | None:
    try:
        response = requests.get(
            WIKIPEDIA_API,
            params={
                "action": "query",
                "format": "json",
                "titles": player_name,
                "prop": "pageimages",
                "pithumbsize": 500,
            },
            headers=HEADERS,
            timeout=5,
        )
        response.raise_for_status()
        pages = response.json().get("query", {}).get("pages", {})
        for page in pages.values():
            thumbnail = page.get("thumbnail")
            if thumbnail and thumbnail.get("source"):
                return thumbnail["source"]
    except Exception:
        return None
    return None


def print_summary(catalog: list[CatalogPlayer], missing: list[CatalogPlayer], source: str) -> None:
    print("=" * 80)
    print("WELL-KNOWN PLAYER AUDIT")
    print("=" * 80)
    print(f"Catalog players checked: {len(catalog)}")
    print(f"Missing from {source}: {len(missing)}")

    if not missing:
        print("\nNo gaps found in this catalog.")
        return

    print("\nMissing players:")
    for player in missing:
        print(
            f"- {player.name} | {player.sport} | {player.college} | "
            f"Tier {player.tier} | mode={player.game_mode}"
        )


def insert_players(client: Client, players: list[CatalogPlayer]) -> None:
    if not players:
        print("\nNothing to insert.")
        return

    inserted = 0
    skipped = 0

    for player in players:
        existing = (
            client.table("players")
            .select("id,name,sport")
            .eq("name", player.name)
            .eq("sport", player.sport)
            .limit(1)
            .execute()
        )
        if existing.data:
            print(f"[skip] {player.name} ({player.sport}) already exists in Supabase")
            skipped += 1
            continue

        image_url = player.image_url or fetch_wikipedia_image(player.name)
        payload = {
            "name": player.name,
            "team": player.team,
            "position": player.position,
            "college": player.college,
            "image_url": image_url,
            "tier": player.tier,
            "rating": player.rating,
            "sport": player.sport,
            "game_mode": player.game_mode,
            "added_to_db": datetime.now(timezone.utc).isoformat(),
        }

        client.table("players").insert(payload).execute()
        status = "with image" if image_url else "without image"
        print(f"[add]  {player.name} ({player.sport}) {status}")
        inserted += 1

    print("\nInsert summary:")
    print(f"- Inserted: {inserted}")
    print(f"- Skipped: {skipped}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Preview or insert curated well-known players.")
    parser.add_argument("--sport", choices=["football", "basketball", "all"], default="all")
    parser.add_argument(
        "--catalog-source",
        choices=["repo", "json"],
        default="repo",
        help="Use the repo's existing seed scripts or the small hand-curated JSON catalog.",
    )
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG_PATH)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV_PATH)
    parser.add_argument(
        "--include-unknown-colleges",
        action="store_true",
        help="Keep candidates whose college is missing or marked Unknown.",
    )
    parser.add_argument(
        "--source",
        choices=["csv", "supabase"],
        default="supabase",
        help="Where to compare existing names before reporting missing players.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Insert the missing players into Supabase after the audit.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    catalog = load_repo_catalog(args.sport) if args.catalog_source == "repo" else load_json_catalog(args.catalog, args.sport)
    if not args.include_unknown_colleges:
        catalog = [player for player in catalog if has_usable_college(player)]

    if args.source == "supabase" or args.apply:
        client = create_supabase()
        existing = load_existing_from_supabase(client, args.sport)
        source_label = "Supabase"
    else:
        client = None
        existing = load_existing_from_csv(args.csv)
        source_label = args.csv.name

    missing = find_missing(catalog, existing)
    print_summary(catalog, missing, source_label)

    if args.apply:
        if client is None:
            raise RuntimeError("Supabase client was not initialized for apply mode")
        print("\nApplying missing players to Supabase...")
        insert_players(client, missing)


if __name__ == "__main__":
    main()
