# glosse.me

Personal site, built with Jekyll using a custom theme that lives in this repo.
Astro Nano–inspired: monospace type, light/dark toggle, narrow column. Live data
(GitHub, Bluesky) is still fetched client-side, so nothing needs API keys.

## Workflow

Edit content or data, push to `main`, done. GitHub Actions
(`.github/workflows/deploy.yml`) builds Jekyll and deploys `_site/` to GitHub
Pages; pull requests only build, and a daily cron rebuilds.

| I want to… | Edit |
|---|---|
| add/reorder a nav link | `_data/navigation.yml` |
| add a subdomain | `_data/sites.yml` (home + about update together) |
| change contact links | `_data/contact.yml` |
| change footer links | `_data/social.yml` |
| change GitHub/Bluesky handle, favicon, title | `_config.yml` |
| change pinned repos / gist | `_data/stats.yml` |
| change colors | `_sass/glosse.scss` (`:root` and `[data-theme="dark"]`) |
| write a new page | new `name/index.md` with `layout: page` and a `title` (add it to the nav) |

Footer, header, `<head>`/OG tags, active-nav state and the sitemap are generated —
never edit them per page. Page-specific JS goes in `assets/js/` and is loaded with
`scripts: [/assets/js/thing.js]` in front matter.

### Fun stuff

- **`~` terminal** — press `~` (or click the `~` in the footer) on any page. `ls`, `cd projects`, `ls notes` (live from Bluesky), `theme dark`, `help`. It reads the nav and sites from `_data`, so new pages appear automatically. Code: `assets/js/terminal.js`.
- **Build stamp** — footer line ("9 pages · 94 KB · built 3 hours ago"), filled in by `_plugins/build_stamp.rb`.
- **/ask/** — the form opens a pre-filled GitHub issue (label `ask`, template `.github/ISSUE_TEMPLATE/ask.md`). Answer it with a comment and **close** the issue: the workflow re-runs, `.github/scripts/fetch-ama.sh` writes `_data/ama.json` (only closed issues with a comment from you), and the Q&A appears. Close as *not planned* to decline a question. Nothing is published until you answer.
- **Data-only pages** — a page with only front matter: `layout: collection`, `data: <file in _data>`, `display: shelf | gallery | list`. `/greenhouse/` is `_data/greenhouse.yml` rendered as shelves; add a pot by adding a line. `/webgarden.html` is this site's own 250×250 pot for other people's greenhouses.

### Adding content

Make a top-level folder, drop markdown files in it, push. That's it.

```
thoughts/
  2026-10-07-first-note.md     # date from the filename
  another.md                   # date from git history
  index.md                     # optional: intro text for /thoughts/
  _wip.md                      # leading _ = never published
```

The build (`_plugins/sections.rb`) generates, per folder: post pages at `/thoughts/<slug>/`, an index at `/thoughts/` (newest first), prev/next links, Atom feeds (`/feed.xml` for everything, `/thoughts/feed.xml` per section), a header link, and a `~` terminal entry (`ls thoughts`, `cd thoughts/first-note`).

- **No front matter needed.** Title = first `# heading` (else the filename), description = first paragraph, date = `YYYY-MM-DD-` filename prefix, else `date:`, else the file's first git commit. Optional front matter: `title`, `description`, `date`, `updated`, `tags: [a, b]`, `draft: true`.
- **Scheduling:** a post with an explicit future date stays hidden until that day; the daily rebuild publishes it.
- **Relative images and links work:** `![](pic.png)` and `[other](other-note.md)` are rewritten to the right URLs. Liquid (`{{ }}`) in posts is left alone.
- **Header/terminal:** new sections join the header automatically. Set `auto_nav: false` in `_config.yml` for terminal-only, or add `_data/sections.yml` (`thoughts: { title: "my thoughts", lede: "…", nav: false }`) to customise one. Add a section to `_data/navigation.yml` yourself to control its position.
- **Not a section:** folders with only an `index.*` (about, notes, projects…), `README.md` files, and anything in `sections_ignore` (`_config.yml`).

### Reading, art and embeds

All three are filled in at **build time** (no keys, no CORS proxy, nothing for visitors to wait on) and refreshed by the daily deploy. A site that is down on build day just shows as a plain link; it never breaks the build. `GLOSSE_OFFLINE=1 bundle exec jekyll serve` skips the network and uses the local cache (`.jekyll-cache/glosse/`, 6h).

- **`/reading/`: feeds you adore.** List them in `_data/feeds.yml` (`name`, `url`, optional `note`). `url` can be the feed or just the site (the feed is auto-discovered). The page shows one newest-first river with filter chips; `/reading/feeds.opml` exports the list.
- **`/art/`: art viewer.** Paste links into `_data/art.yml`. Title, artist, date, medium, credit and image are looked up from each link: the Met, the Art Institute of Chicago and Wikimedia Commons file pages via their open APIs, anything else via its Open Graph / schema.org tags, or a direct image URL. Add `note:` for a caption, or `title:`/`artist:`/`date:`/`image:` to override. Click a piece to open it large; arrow keys move, `/art/#3` deep-links.
- **Embeds, in any markdown file.** Put a URL alone on its own line: YouTube (click-to-play, nothing loads until you click), Vimeo, Spotify, SoundCloud, CodePen, Bluesky posts, GitHub repo cards, images, video/audio files; any other URL becomes a link card (title, blurb, image). A URL inside a sentence, or `[text](url)`, stays a normal link.
- `reading` and `art` are in the `~` terminal (`ls reading`, `ls art`). They're `nav: false` in `_data/navigation.yml`; flip that to put them in the header.

### One-time setup

1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Custom domain**: `glosse.me` (the `CNAME` file is already in the repo). Tick *Enforce HTTPS* once the cert is issued.

DNS needs no changes: `glosse.me` and `www` are already CNAMEs to `jubilancy.github.io` in Cloudflare.

### Local preview

```
bundle install
bundle exec jekyll serve
```

## Layout

```
.
├── _config.yml
├── _data/            navigation, sites, contact, social, stats
├── _layouts/         default, page, prose
├── _includes/        head, header, footer, contact-list, load-more, list, gallery, shelf
├── _plugins/         build_stamp.rb
├── _sass/glosse.scss theme tokens + all styles
├── assets/css/main.scss
├── assets/js/        site.js (theme toggle, helpers) + per-page scripts
├── index.html, about/, contact/, projects/, stats/, notes/, changelog/
└── .github/workflows/deploy.yml
```

## Pages


| Path | What it does |
|---|---|
| `/` | Home. Intro, subdomain links, live preview of recent repos + notes. |
| `/projects/` | Every public GitHub repo for `jubilancy`, fetched live, sorted by last push. |
| `/stats/` | github-stats-extended cards (overview, languages, pinned repo). |
| `/notes/` | Microblog mirrored from Bluesky `@basedgirl.bsky.social`. |
| `/about/` | Bio. |
| `/contact/` | Ways to reach you. |

## Live data

Both feeds are client-side fetches against public, no-auth endpoints — nothing to
configure, no API keys, no tokens in the repo.

**GitHub** — `api.github.com/users/jubilancy/repos?sort=pushed`
Unauthenticated requests are capped at 60/hour per IP. If a visitor hits that cap,
the page shows a fallback link to GitHub instead of an error.

**Bluesky** — `public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed`
Public AppView endpoint, no auth. Replies are filtered out; reposts are labeled.
Link facets and image embeds render inline. "Load more" pages through the cursor.
