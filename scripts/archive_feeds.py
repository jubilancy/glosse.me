# /// script
# requires-python = ">=3.10"
# dependencies = ["feedparser", "pyyaml"]
# ///
"""Append new items from the feeds in _data/feeds.yml to _data/feed_archive.json.

A feed only holds its latest items; running this regularly builds up history.
Items are keyed by guid (falling back to link), so re-runs never duplicate.

    uv run scripts/archive_feeds.py [feeds.yml] [archive.json]

Each url in feeds.yml must be the feed itself (no auto-discovery here).
"""
import json
import sys
from pathlib import Path

import feedparser
import yaml

ROOT = Path(__file__).resolve().parent.parent
feeds_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "_data" / "feeds.yml"
archive_path = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "_data" / "feed_archive.json"

feeds = yaml.safe_load(feeds_path.read_text()) or []
if isinstance(feeds, dict):
    feeds = feeds.get("feeds", [])

archive = json.loads(archive_path.read_text()) if archive_path.exists() else {}

for f in feeds:
    url = f.get("url")
    if not url:
        continue
    parsed = feedparser.parse(url, agent="glosse.me feed archiver")
    if parsed.get("status", 200) >= 400 or (parsed.bozo and not parsed.entries):
        print(f"skip {url}: {parsed.get('bozo_exception') or parsed.get('status')}", file=sys.stderr)
        continue

    entry = archive.setdefault(url, {"name": f.get("name"), "items": {}})
    entry["name"] = f.get("name") or parsed.feed.get("title")
    new = 0
    for e in parsed.entries:
        key = e.get("id") or e.get("link")
        if not key or key in entry["items"]:
            continue
        entry["items"][key] = {
            "title": e.get("title"),
            "link": e.get("link"),
            "published": e.get("published") or e.get("updated"),
            "summary": e.get("summary"),
        }
        new += 1
    print(f"{f.get('name', url)}: +{new} ({len(entry['items'])} total)")

archive_path.write_text(json.dumps(archive, indent=2, ensure_ascii=False) + "\n")
