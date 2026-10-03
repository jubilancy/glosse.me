-- Guestbook schema. Paste into: Cloudflare dashboard → D1 → your database → Console.
CREATE TABLE IF NOT EXISTS entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,                        -- HTML-escaped, ≤ 40 chars
  message    TEXT    NOT NULL,                        -- HTML-escaped, ≤ 500 chars
  website    TEXT,                                    -- optional http(s) URL, escaped
  stamp      TEXT    NOT NULL,                        -- emoji sticker (allow-listed in src/index.ts)
  color      TEXT    NOT NULL,                        -- one of the preset hex values
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),  -- unix seconds
  approved   INTEGER NOT NULL DEFAULT 0,              -- you flip this to 1 by hand
  ip_hash    TEXT    NOT NULL                         -- salted SHA-256 of the IP, never the IP
);

-- public feed: approved entries, newest first (cursor = id)
CREATE INDEX IF NOT EXISTS idx_entries_feed ON entries (approved, id DESC);
-- rate limit lookup: "has this ip_hash posted in the last minute?"
CREATE INDEX IF NOT EXISTS idx_entries_rate ON entries (ip_hash, created_at);
