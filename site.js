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

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
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
