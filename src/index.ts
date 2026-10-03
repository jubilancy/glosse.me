// Guestbook Worker: GET/POST /api/entries on one D1 table. Static files come from public/.
import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  DB: D1Database;
  IP_SALT?: string; // secret: salt for hashing IPs (required to accept posts)
  TURNSTILE_SECRET?: string; // secret: if set, posts must carry a valid Turnstile token
  TURNSTILE_SITEKEY?: string; // public var: lets the page render the widget
};

// The pickers. Served to the frontend via GET so there is one source of truth.
const COLORS = ["#ff9aa2", "#ffdf6b", "#b5ead7", "#9fd3ff", "#d4b8ff", "#ffb86b", "#f4f1de", "#c7f464"];
const STAMPS = ["⭐", "💀", "🌸", "🍄", "🔮", "🐸", "🪐", "🧿", "🍒", "🦋", "🛸", "📼", "🌙", "🐙", "👾", "🥀"];
const LIMITS = { name: 40, message: 500, website: 200, maxUrls: 2, rateSeconds: 60 };

// Origins allowed to call the API from a browser: eliana.lol, glosse.me and their subdomains.
const ALLOWED_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*(eliana\.lol|glosse\.me)$/i;

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", cors({
  origin: (origin) => (ALLOWED_ORIGIN.test(origin) ? origin : null),
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type"],
  maxAge: 86400,
}));

// ---- helpers ---------------------------------------------------------------

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Strip control chars (keeping \n), normalise, trim.
const clean = (v: unknown) =>
  (typeof v === "string" ? v : "").normalize("NFC").replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim();

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Returns a normalised http(s) URL, "" if none given, or null if invalid.
function parseWebsite(raw: string): string | null {
  if (!raw) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return null;
    return u.href.length <= LIMITS.website ? u.href : null;
  } catch {
    return null;
  }
}

async function turnstileOk(secret: string, token: string, ip: string) {
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    return ((await r.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}

// ---- GET /api/entries?cursor=&limit= ---------------------------------------
// Approved entries, newest first. `cursor` is the last id you saw; `next` is the cursor for more.
app.get("/api/entries", async (c) => {
  const limit = Math.min(Math.max(parseInt(c.req.query("limit") ?? "", 10) || 20, 1), 50);
  const cursorRaw = parseInt(c.req.query("cursor") ?? "", 10);
  const cursor = Number.isFinite(cursorRaw) && cursorRaw > 0 ? cursorRaw : Number.MAX_SAFE_INTEGER;

  const { results } = await c.env.DB.prepare(
    `SELECT id, name, message, website, stamp, color, created_at FROM entries
     WHERE approved = 1 AND id < ?1 ORDER BY id DESC LIMIT ?2`,
  ).bind(cursor, limit + 1).all<{ id: number }>(); // one extra row tells us if there's another page

  const more = results.length > limit;
  const entries = results.slice(0, limit);
  c.header("Cache-Control", "public, max-age=30");
  return c.json({
    entries,
    next: more ? entries[entries.length - 1].id : null,
    // picker options + limits are sent once, with the first page
    ...(c.req.query("cursor")
      ? {}
      : { config: { colors: COLORS, stamps: STAMPS, limits: LIMITS, turnstile: c.env.TURNSTILE_SECRET ? c.env.TURNSTILE_SITEKEY || null : null } }),
  });
});

// ---- POST /api/entries -----------------------------------------------------
// Always inserts with approved = 0. You approve by hand in the D1 console.
app.post("/api/entries", async (c) => {
  if (!c.env.IP_SALT) return c.json({ error: "server is missing IP_SALT" }, 500);

  const raw = await c.req.text();
  if (raw.length > 4096) return c.json({ error: "too big" }, 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return c.json({ error: "bad json" }, 400); }
  if (!body || typeof body !== "object") return c.json({ error: "bad json" }, 400);

  // Honeypot: real people never see this field. Pretend success so bots learn nothing.
  if (clean(body.homepage)) return c.json({ ok: true, pending: true }, 201);

  const name = clean(body.name).replace(/\s+/g, " ");
  const message = clean(body.message).replace(/\n{3,}/g, "\n\n");
  const website = parseWebsite(clean(body.website));
  const stamp = clean(body.stamp);
  const color = clean(body.color).toLowerCase();

  if (!name || name.length > LIMITS.name) return c.json({ error: `name: 1–${LIMITS.name} characters` }, 400);
  if (!message || message.length > LIMITS.message) return c.json({ error: `message: 1–${LIMITS.message} characters` }, 400);
  if (website === null) return c.json({ error: "that website doesn't look like a link" }, 400);
  if (!STAMPS.includes(stamp)) return c.json({ error: "pick a stamp" }, 400);
  if (!COLORS.includes(color)) return c.json({ error: "pick a color" }, 400);

  // Link filter: more than 2 URLs in the text = spam.
  const urls = `${name} ${message}`.match(/(https?:\/\/|www\.)\S+/gi) ?? [];
  if (urls.length > LIMITS.maxUrls) return c.json({ error: `max ${LIMITS.maxUrls} links per message` }, 400);

  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";

  // Optional Turnstile: only enforced when the secret exists.
  if (c.env.TURNSTILE_SECRET) {
    const token = clean(body.turnstile);
    if (!token || !(await turnstileOk(c.env.TURNSTILE_SECRET, token, ip))) {
      return c.json({ error: "human check failed, try again" }, 403);
    }
  }

  // Rate limit via the table itself: the INSERT only happens if this ip_hash has no row in the
  // last 60s. One statement, so two simultaneous requests can't both slip through.
  const ipHash = await sha256Hex(`${c.env.IP_SALT}:${ip}`);
  const res = await c.env.DB.prepare(
    `INSERT INTO entries (name, message, website, stamp, color, ip_hash)
     SELECT ?1, ?2, ?3, ?4, ?5, ?6
     WHERE NOT EXISTS (SELECT 1 FROM entries WHERE ip_hash = ?6 AND created_at > unixepoch() - ?7)`,
  ).bind(escapeHtml(name), escapeHtml(message), website ? escapeHtml(website) : null, stamp, color, ipHash, LIMITS.rateSeconds).run();

  if (!res.meta.changes) {
    c.header("Retry-After", String(LIMITS.rateSeconds));
    return c.json({ error: "easy there, one note per minute" }, 429);
  }
  return c.json({ ok: true, pending: true }, 201);
});

app.notFound((c) => c.json({ error: "not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "something broke" }, 500);
});

export default app;
