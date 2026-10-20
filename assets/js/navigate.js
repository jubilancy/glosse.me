// Search on /navigate/: filters /search.json (pages, posts, tags) as you type.
(function () {
  var input = document.getElementById('navSearch');
  var results = document.getElementById('navResults');
  var cloud = document.getElementById('navCloud');
  var index = null;

  function load() {
    if (index) return Promise.resolve(index);
    return fetch('/search.json').then(function (r) { return r.json(); })
      .then(function (d) { index = d; return d; })
      .catch(function () { index = []; return index; });
  }

  function show(q) {
    q = q.trim().toLowerCase();
    results.innerHTML = '';
    results.hidden = !q;
    cloud.hidden = !!q;
    if (!q) return;
    var hits = index.filter(function (i) { return i.title.toLowerCase().indexOf(q) !== -1; }).slice(0, 12);
    if (!hits.length) {
      var none = document.createElement('li');
      none.className = 'kind';
      none.textContent = 'nothing found';
      results.appendChild(none);
      return;
    }
    hits.forEach(function (h) {
      var li = document.createElement('li'), a = document.createElement('a'), k = document.createElement('span');
      a.href = h.url;
      a.textContent = h.title;
      k.className = 'kind';
      k.textContent = h.kind;
      a.appendChild(k);
      li.appendChild(a);
      results.appendChild(li);
    });
  }

  input.addEventListener('input', function () { load().then(function () { show(input.value); }); });
  input.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var first = results.querySelector('a');
    if (first) location.href = first.href;
  });
})();
