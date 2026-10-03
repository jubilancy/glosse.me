/*! Guestbook embed. Usage:
 *  <div id="glosse-guestbook"></div>
 *  <script src="https://YOUR-WORKER/embed.js" async></script>
 *  Optional attributes on the script tag: data-target="#css-selector", data-theme="light|dark".
 *  It drops an auto-resizing iframe into the div (iframe = no CSS clashes with the host page). */
(() => {
  const s = document.currentScript;
  if (!s) return;
  const origin = new URL(s.src).origin; // the Worker serving this file also serves the guestbook
  let host = document.querySelector(s.dataset.target || "#glosse-guestbook");
  if (!host) { host = document.createElement("div"); s.after(host); } // no div? make one right here

  const q = new URLSearchParams({ embed: "1" });
  if (s.dataset.theme) q.set("theme", s.dataset.theme);

  const f = document.createElement("iframe");
  f.src = `${origin}/?${q}`;
  f.title = "Guestbook";
  f.loading = "lazy";
  f.style.cssText = "width:100%;height:520px;border:0;display:block";
  host.append(f);

  // the page inside reports its height whenever it changes
  addEventListener("message", (e) => {
    if (e.source === f.contentWindow && e.data?.type === "glosse-guestbook:height") f.style.height = `${e.data.height}px`;
  });
})();
