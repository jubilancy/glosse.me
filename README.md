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

---

# Guestbook (Cloudflare Worker)

A tiny guestbook: one Worker ([Hono](https://hono.dev/)), one D1 table, two API routes, static page + embed script.
It lives beside the Jekyll site but is deployed separately by Cloudflare Workers Builds (the Jekyll build ignores these files).

```
wrangler.jsonc      config: D1 binding, assets dir, vars
schema.sql          the one table
src/index.ts        GET + POST /api/entries
public/index.html   the guestbook page
public/embed.js     one-tag embed
```

## Setup (dashboard, in order)

No `wrangler login` needed anywhere.

1. **Create the D1 database.** [Cloudflare dashboard](https://dash.cloudflare.com/) → *Storage & Databases* → *D1 SQL Database* → *Create*. Name it `guestbook`.
2. **Copy its Database ID** (shown on the database's page) and paste it over `PASTE-YOUR-D1-DATABASE-ID-HERE` in `wrangler.jsonc`. Commit and push (Codespaces or the GitHub web editor both work).
3. **Create the table.** D1 → `guestbook` → *Console* tab → paste all of `schema.sql` → *Execute*. (If the console balks at several statements, run them one at a time.)
4. **Connect the repo.** *Workers & Pages* → *Create* → import from Git → pick `jubilancy/glosse.me` and your production branch (`main`; merge the guestbook branch first). Settings:
   - **Worker name: `glosse-guestbook`.** It must match `name` in `wrangler.jsonc` or the build fails.
   - Build command: *(empty)*. Deploy command: `npx wrangler deploy`. Root directory: `/`.
5. **Set the secret `IP_SALT`.** Worker → *Settings* → *Variables and Secrets* (the runtime one, not the *Build* section) → *Add* → type **Secret**, name `IP_SALT`, value any long random string (a password generator is fine). Without it, posting returns a 500 on purpose. Save and deploy.
6. **Done.** Open `https://glosse-guestbook.<your-subdomain>.workers.dev`.

### Optional: Turnstile

1. Dashboard → *Turnstile* → *Add widget*. Hostname: the Worker's hostname (`glosse-guestbook.<your-subdomain>.workers.dev`, plus a custom domain if you add one). The widget renders inside the guestbook page, so embeds on other sites need no extra hostnames.
2. Put the **site key** in `wrangler.jsonc` → `vars.TURNSTILE_SITEKEY`, commit, push.
3. Add the **secret key** as a Worker secret named `TURNSTILE_SECRET` (same place as `IP_SALT`).

If `TURNSTILE_SECRET` isn't set, verification is skipped entirely.

## Moderating

New entries arrive with `approved = 0`. Use D1 → `guestbook` → *Console*:

```sql
-- what's waiting?
SELECT id, name, stamp, message, website, datetime(created_at,'unixepoch') AS at
FROM entries WHERE approved = 0 ORDER BY id;

-- approve
UPDATE entries SET approved = 1 WHERE id = 12;
UPDATE entries SET approved = 1 WHERE id IN (12, 13);
UPDATE entries SET approved = 1 WHERE approved = 0;     -- everything pending

-- hide again / delete
UPDATE entries SET approved = 0 WHERE id = 12;
DELETE FROM entries WHERE id = 12;
DELETE FROM entries WHERE approved = 0 AND created_at < unixepoch() - 7*86400;  -- stale pending

-- delete everything from one poster
DELETE FROM entries WHERE ip_hash = (SELECT ip_hash FROM entries WHERE id = 12);

-- optional privacy tidy: the rate limit only needs the last minute of hashes
UPDATE entries SET ip_hash = '-' WHERE created_at < unixepoch() - 86400;
```

The public feed is cached for 30 s, so an approval can take that long to show.

## Embedding

On any site (an iframe is injected, so your CSS and mine can't collide; it resizes itself):

```html
<div id="glosse-guestbook"></div>
<script src="https://glosse-guestbook.<your-subdomain>.workers.dev/embed.js" async></script>
```

Script-tag options: `data-target="#other-div"` and `data-theme="light"` or `"dark"` (default follows the visitor's system). If the host page sets a `frame-src` CSP, allow the Worker's origin.

## API

- `GET /api/entries?limit=20&cursor=<id>` → `{ entries: [{id,name,message,website,stamp,color,created_at}], next }`. Approved only, newest first; pass `next` back as `cursor`. The first page also carries `config` (pickers, limits). Text fields are **HTML-escaped**. CORS is open to `eliana.lol`, `glosse.me` and their subdomains (edit `ALLOWED_ORIGIN` in `src/index.ts`).
- `POST /api/entries` JSON `{name, message, website?, stamp, color, homepage?, turnstile?}` → `201`, `400` (validation / >2 links), `403` (Turnstile), `429` (one per `ip_hash` per minute). `homepage` is the honeypot: leave it empty.

Local dev: `npm install`, then `npx wrangler d1 execute DB --local --file=schema.sql` and `npx wrangler dev --local --var IP_SALT:anything`.
