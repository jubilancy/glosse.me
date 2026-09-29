// Turns the form into a pre-filled "new issue" link on GitHub.
(function () {
  var form = document.getElementById('askForm');
  var text = document.getElementById('askText');
  var count = document.getElementById('askCount');
  if (!form || !text) return;

  text.addEventListener('input', function () {
    count.textContent = text.value.length + ' / 1000';
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = text.value.trim();
    if (!q) return;
    var title = 'ask: ' + (q.length > 70 ? q.slice(0, 67) + '…' : q).replace(/\s+/g, ' ');
    var url = 'https://github.com/' + form.getAttribute('data-repo') + '/issues/new' +
      '?template=ask.md&labels=ask&title=' + encodeURIComponent(title) +
      '&body=' + encodeURIComponent(q);
    window.open(url, '_blank', 'noopener');
  });
})();
