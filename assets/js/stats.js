// Repoint every card's text/icon colors when the theme flips.
(function () {
  var root = document.documentElement;

  function retheme() {
    var dark = root.getAttribute('data-theme') === 'dark';
    var title = dark ? 'eaeaea' : '111111';
    var text  = dark ? '8a8a8a' : '6b7280';
    var icon  = dark ? 'eaeaea' : '111111';

    document.querySelectorAll('.theme-card').forEach(function (img) {
      var url = new URL(img.src);
      url.searchParams.set('title_color', title);
      url.searchParams.set('text_color', text);
      url.searchParams.set('icon_color', icon);
      url.searchParams.set('bg_color', '00000000');
      img.src = url.toString();
    });
  }

  retheme();

  var toggle = document.getElementById('themeToggle');
  if (toggle) toggle.addEventListener('click', function () { setTimeout(retheme, 0); });
})();
