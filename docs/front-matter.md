# Front matter

Every key is optional unless noted. Empty values (`author:`) are ignored.

## Posts (any top-level folder, e.g. `explore/`, `thoughts/`)

Drop a markdown file in a folder and push. No front matter is needed: the build (`_plugins/sections.rb`) fills everything in.

| Key | What it does | If missing |
|---|---|---|
| `title` | Post title | First `# heading` (removed from the body), else the filename |
| `description` | Meta description and list blurb | First paragraph |
| `date` | Post date. A future date hides the post until that day (the daily rebuild publishes it) | `created`, then a `YYYY-MM-DD-` filename prefix, then the file's first git commit |
| `created` | Alias for `date` (`date` wins if both are set) | |
| `updated` | Shows "updated …". Hidden if within 2 days of the date | Last git commit |
| `tags: [a, b]` | Builds `/tags/` and `/tags/<tag>/`; tags link from the post | none |
| `category` | Groups the post on `/categories/` under this name instead of its folder | The folder |
| `source` | URL of the original (for clippings), shown as a link to its domain | none |
| `author` | Shown as "by …" | none |
| `published` | The original's publish date, shown as "originally …". `published: false` hides the post | none |
| `draft: true` | Not published | |
| `layout` | Override the post layout | `post` |
| `changefreq` | `<changefreq>` in `sitemap.xml` | by layout (posts `monthly`) |
| `priority` | `<priority>` in `sitemap.xml`, 0.0 to 1.0 | by layout (posts `0.6`) |

Notes:

- A filename starting with `_` is never published.
- `README.md` files and anything in `sections_ignore` (`_config.yml`, which includes `content/`) are not sections.
- Relative images and links work, and Liquid (`{{ }}`) in posts is left alone.
- A clipper template with an empty `published:` is fine. Only an explicit `published: false` hides a page (`_plugins/published_key.rb`).

Example clipping:

```yaml
---
title: "James Howell's Lexicon Tetraglotton (1660) frontispiece"
source: "https://leme.library.utoronto.ca/howell/"
author:
published:
created: 2026-10-07
description:
category:
tags:
  - "clippings"
  - "awesome"
---
```

### Section intro (`<folder>/index.md`, optional)

| Key | What it does |
|---|---|
| `title` | Section title (else the folder name) |
| `lede` | Intro line (else `description`) |
| `description` | Meta description |

`_data/sections.yml` can also set `title`, `lede`, `description` and `nav` per section, and takes precedence.

## One-off pages (`content/`, plus `index.html`)

`content/name.md` is served at `/name/`. A page that sets its own `permalink:` is left alone.

| Key | What it does |
|---|---|
| `layout` | `page` (default for most), `prose`, `art`, `reading`, `collection`, `default` |
| `title` | Page `<h1>` |
| `lede` | Intro paragraph under the title (`page` layout) |
| `description` | Meta description |
| `scripts: [/assets/js/x.js]` | Page-specific JS, loaded by the default layout |
| `inline_script` | Inline JS block (supported, currently unused) |
| `permalink` | Override the URL |
| `changefreq`, `priority` | `sitemap.xml` hints (default `monthly` / `0.8`; home is `daily` / `1.0`) |

### Data-only pages (`layout: collection`)

| Key | What it does |
|---|---|
| `data` | Name of a file in `_data/` |
| `display` | `shelf`, `gallery` or `list` |

`/greenhouse/` is `_data/greenhouse.yml` rendered as shelves.

## Set by the build (don't write these)

`date`/`updated` (computed), `section`, `section_title`, `entries`, `newer`, `older`, `groups`, `tag_list`, `published_on`.

## Embeds in the body

A URL alone on its own line becomes an embed: YouTube, Vimeo, Spotify, SoundCloud, CodePen, Bluesky posts, GitHub repo cards, ListenBrainz profiles (`https://listenbrainz.org/user/name/`, optional `?range=this_week|week|this_month|month|this_year|year|all_time`), IIIF manifests (`…/manifest.json`, shown in Mirador), images, video and audio files. Any other page that advertises oEmbed becomes its player (an iframe) or photo; anything else becomes a link card.
