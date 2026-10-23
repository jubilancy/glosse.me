// Footnote previews: hover or focus a footnote number to read the note in place.
// Touch and no-JS still jump to the note at the bottom of the page.
(function () {
  var refs = document.querySelectorAll('.prose a.footnote');
  if (!refs.length) return;

  var pop = document.createElement('div');
  pop.className = 'fn-pop';
  pop.id = 'fnPop';
  pop.setAttribute('role', 'tooltip');
  pop.hidden = true;
  document.body.appendChild(pop);

  var current = null, timer = null;

  function noteFor(link) {
    var li = document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1)));
    if (!li) return null;
    var clone = li.cloneNode(true);
    var back = clone.querySelectorAll('.reversefootnote');
    for (var i = 0; i < back.length; i++) back[i].remove();
    return clone.innerHTML;
  }

  function show(link) {
    clearTimeout(timer);
    var html = noteFor(link);
    if (!html) return;
    if (current) current.removeAttribute('aria-describedby');
    current = link;
    link.setAttribute('aria-describedby', 'fnPop');
    pop.innerHTML = html;
    pop.hidden = false;
    var r = link.getBoundingClientRect();
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    var top = r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8;
    pop.style.left = left + window.scrollX + 'px';
    pop.style.top = top + window.scrollY + 'px';
  }

  function hide(delay) {
    clearTimeout(timer);
    timer = setTimeout(function () {
      pop.hidden = true;
      if (current) current.removeAttribute('aria-describedby');
      current = null;
    }, delay);
  }

  refs.forEach(function (link) {
    link.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') show(link); });
    link.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hide(150); });
    link.addEventListener('focus', function () { show(link); });
    link.addEventListener('blur', function () { hide(0); });
  });
  pop.addEventListener('pointerenter', function () { clearTimeout(timer); });
  pop.addEventListener('pointerleave', function () { hide(150); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(0); });
})();
