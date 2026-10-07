// /art/: click a piece to open it large, with arrow keys / swipe-free buttons.
(function () {
  var grid = document.getElementById('artGrid');
  var dlg = document.getElementById('artDialog');
  if (!grid || !dlg || typeof dlg.showModal !== 'function') return;

  var links = Array.prototype.slice.call(grid.querySelectorAll('.art-open'));
  var cur = -1;
  var img = dlg.querySelector('.art-stage img');

  function set(sel, text) {
    var el = dlg.querySelector(sel);
    el.textContent = text || '';
    el.hidden = !text;
  }

  function show(i) {
    cur = (i + links.length) % links.length;
    var a = links[cur];
    var d = function (k) { return a.getAttribute('data-' + k) || ''; };
    img.src = d('image');
    img.alt = d('title');
    img.hidden = !d('image');
    set('.art-i-title', d('title'));
    set('.art-i-by', [d('artist'), d('date')].filter(Boolean).join(', '));
    set('.art-i-medium', d('medium'));
    set('.art-i-note', d('note'));
    set('.art-i-credit', d('credit'));
    var link = dlg.querySelector('.art-i-link');
    link.href = a.href;
    link.textContent = 'view at ' + (d('site') || 'source') + ' ↗';
    try { history.replaceState(null, '', '#' + (cur + 1)); } catch (e) {}
  }

  function open(i) {
    show(i);
    if (!dlg.open) dlg.showModal();
  }

  grid.addEventListener('click', function (e) {
    var a = e.target.closest('.art-open');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    open(links.indexOf(a));
  });
  dlg.querySelector('.art-close').addEventListener('click', function () { dlg.close(); });
  dlg.querySelector('.art-prev').addEventListener('click', function () { show(cur - 1); });
  dlg.querySelector('.art-next').addEventListener('click', function () { show(cur + 1); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () {
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  });
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') show(cur - 1);
    else if (e.key === 'ArrowRight') show(cur + 1);
  });

  var m = /^#(\d+)$/.exec(location.hash);
  if (m && links[+m[1] - 1]) open(+m[1] - 1);
})();
