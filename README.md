# glosse.me

Personal site, built with Jekyll using a custom theme that lives in this repo.
Astro Nano–inspired: monospace type, light/dark toggle, narrow column. Live data
(GitHub, Bluesky) is still fetched client-side, so nothing needs API keys.

## Workflow

Edit content or data, push to `main`, done. GitHub Actions
(`.github/workflows/deploy.yml`) builds Jekyll and deploys `_site/` to Cloudflare
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

### One-time setup

Repo **Settings → Secrets and variables → Actions**:
- secrets `CLOUDFLARE_API_TOKEN` (Pages:Edit) and `CLOUDFLARE_ACCOUNT_ID`
- optional variable `CLOUDFLARE_PROJECT` (defaults to `glosse-me`)

In Cloudflare, switch the Pages project to *Direct Upload* / disable its own git
build so it doesn't double-deploy.

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
├── _includes/        head, header, footer, contact-list, load-more
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
