var USER = GLOSSE.github;

var LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26', CSS: '#563d7c',
  Python: '#3572A5', Astro: '#ff5a03', Svelte: '#ff3e00', Vue: '#41b883',
  SCSS: '#c6538c', Shell: '#89e051', Ruby: '#701516', Go: '#00ADD8',
  Rust: '#dea584', Java: '#b07219', 'C#': '#178600', PHP: '#4F5D95',
  Nunjucks: '#3d8137', Liquid: '#67b8de', Handlebars: '#f7931e'
};


function renderRepo(repo) {
  var meta = [];

  if (repo.language) {
    var color = LANG_COLORS[repo.language] || 'var(--muted)';
    meta.push('<span><span class="dot" style="background:' + color + '"></span>' +
              escapeHtml(repo.language) + '</span>');
  }
  if (repo.stargazers_count) meta.push('<span>★ ' + repo.stargazers_count + '</span>');
  if (repo.forks_count) meta.push('<span>⑂ ' + repo.forks_count + '</span>');
  if (repo.homepage) {
    meta.push('<span><a href="' + escapeHtml(repo.homepage) + '" style="color:inherit">live ↗</a></span>');
  }
  if (repo.fork) meta.push('<span>fork</span>');
  if (repo.archived) meta.push('<span>archived</span>');

  return '<li class="repo">' +
    '<div class="repo-head">' +
      '<a class="repo-name" href="' + repo.html_url + '">' + escapeHtml(repo.name) + '</a>' +
      '<span class="repo-updated">' + timeAgo(repo.pushed_at) + '</span>' +
    '</div>' +
    (repo.description ? '<p class="repo-desc">' + escapeHtml(repo.description) + '</p>' : '') +
    (meta.length ? '<div class="repo-meta">' + meta.join('') + '</div>' : '') +
  '</li>';
}

fetch('https://api.github.com/users/' + USER + '/repos?sort=pushed&per_page=100&type=owner')
  .then(function (r) {
    if (r.status === 403) throw new Error('rate-limited');
    if (!r.ok) throw new Error(r.status);
    return r.json();
  })
  .then(function (repos) {
    var list = document.getElementById('repoList');
    var count = document.getElementById('repoCount');

    if (!repos.length) {
      list.innerHTML = '<li class="state">No public repositories yet.</li>';
      return;
    }

    count.textContent = repos.length + ' repositories';
    list.innerHTML = repos.map(renderRepo).join('');
  })
  .catch(function (err) {
    var msg = err.message === 'rate-limited'
      ? 'GitHub is rate-limiting this network right now. Try again in a few minutes, or '
      : 'Couldn\'t reach GitHub. ';
    document.getElementById('repoList').innerHTML =
      '<li class="state">' + msg +
      '<a href="https://github.com/' + USER + '?tab=repositories">browse the repos on GitHub</a>.</li>';
  });
