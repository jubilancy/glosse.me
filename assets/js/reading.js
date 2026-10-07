// /reading/: filter the river by feed. Works without JS (everything just shows).
(function () {
  var chips = document.getElementById('sourceChips');
  var river = document.getElementById('river');
  if (!chips || !river) return;

  function apply(slug) {
    Array.prototype.forEach.call(river.children, function (li) {
      li.hidden = !!slug && li.getAttribute('data-source') !== slug;
    });
    Array.prototype.forEach.call(chips.querySelectorAll('.chip'), function (c) {
      c.setAttribute('aria-pressed', String(c.getAttribute('data-source') === slug));
    });
    try { history.replaceState(null, '', slug ? '#' + slug : location.pathname); } catch (e) {}
  }

  chips.addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (b) apply(b.getAttribute('data-source'));
  });
  if (location.hash.length > 1) apply(decodeURIComponent(location.hash.slice(1)));
})();
