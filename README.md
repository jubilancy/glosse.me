# glosse.me

Personal site. Static HTML, no build step, no dependencies. Astro Nano–inspired:
monospace type, light/dark toggle, narrow column.

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

## Deploying to Cloudflare Pages

Drag-and-drop, or connect this repo:

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages**
2. Connect to Git, pick this repo
3. Build command: *(leave empty)* · Output directory: `/`
4. Deploy, then **Custom domains** → add `glosse.me`

Since `glosse.me` is already on Cloudflare DNS, the domain attaches without extra
DNS work.

## Customizing

- **Email** — `/contact/index.html` uses `hi@glosse.me`. Set that up via Cloudflare
  Email Routing, or swap in a real address.
- **Subdomain links** — home and about link to `feed.` / `tools.` / `gallery.` /
  `obscura.glosse.me`. Edit or remove as those move.
- **Colors** — all six theme values live at the top of `styles.css` in `:root` and
  `[data-theme="dark"]`. Change them there; the stats cards follow automatically.
- **Pinned repo** — `/stats/index.html` pins `jubilancy/tools`. Change the `repo=`
  param to pin something else, or duplicate the block for more.
- **Usernames** — GitHub handle appears as `USER` in `/projects/`, and Bluesky as
  `HANDLE` in `/notes/`.

## Files

```
.
├── index.html
├── styles.css        shared styles, all theme tokens
├── site.js           theme toggle, footer year, timeAgo()
├── projects/index.html
├── stats/index.html
├── notes/index.html
├── about/index.html
├── contact/index.html
├── robots.txt
└── sitemap.xml
```
