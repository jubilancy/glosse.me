// Theme: system default, remembered per-visitor.
(function () {
  var root = document.documentElement;
  var stored = null;
  try { stored = localStorage.getItem('theme'); } catch (e) {}
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', stored || (prefersDark ? 'dark' : 'light'));
})();

document.addEventListener('DOMContentLoaded', function () {
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // Reading progress: a thin line that fills as you scroll. Hidden on short pages.
  var progress = document.getElementById('readProgress');
  if (progress) {
    var fill = progress.firstElementChild, ticking = false;
    var update = function () {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.hidden = max < window.innerHeight * 0.5;
      if (progress.hidden) return;
      fill.style.transform = 'scaleX(' + Math.min(1, Math.max(0, window.scrollY / max)) + ')';
    };
    var queue = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    update();
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  var built = document.querySelector('.built-when');
  if (built) {
    var ago = timeAgo(built.getAttribute('datetime'));
    if (ago) { built.title = built.textContent; built.textContent = ago; }
  }
});

// Shared helper: "3 days ago" style stamps.
function timeAgo(iso) {
  var then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  var secs = Math.floor((Date.now() - then) / 1000);
  var units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ];
  for (var i = 0; i < units.length; i++) {
    var n = Math.floor(secs / units[i][1]);
    if (n >= 1) return n + ' ' + units[i][0] + (n > 1 ? 's' : '') + ' ago';
  }
  return 'just now';
}

// Shared helper: escape untrusted text before it goes into innerHTML.
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
