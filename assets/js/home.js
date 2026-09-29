// Three most recently pushed repos.
fetch('https://api.github.com/users/' + GLOSSE.github + '/repos?sort=pushed&per_page=3')
  .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(function (repos) {
    var el = document.getElementById('repoPreview');
    if (!repos.length) { el.innerHTML = '<li class="state">No public repos yet.</li>'; return; }
    el.innerHTML = repos.map(function (repo) {
      return '<li class="repo">' +
        '<div class="repo-head">' +
          '<a class="repo-name" href="' + repo.html_url + '">' + repo.name + '</a>' +
          '<span class="repo-updated">' + timeAgo(repo.pushed_at) + '</span>' +
        '</div>' +
        (repo.description ? '<p class="repo-desc">' + escapeHtml(repo.description) + '</p>' : '') +
      '</li>';
    }).join('');
  })
  .catch(function () {
    document.getElementById('repoPreview').innerHTML =
      '<li class="state">Couldn\'t reach GitHub. <a href="https://github.com/' + GLOSSE.github + '">View repos directly</a>.</li>';
  });

// Two most recent Bluesky posts.
fetch('https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=' + GLOSSE.bluesky + '&limit=5&filter=posts_no_replies')
  .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(function (data) {
    var el = document.getElementById('notePreview');
    var items = (data.feed || []).filter(function (i) { return !i.reason; }).slice(0, 2);
    if (!items.length) { el.innerHTML = '<li class="state">No notes yet.</li>'; return; }
    el.innerHTML = items.map(function (item) {
      var post = item.post;
      var rkey = post.uri.split('/').pop();
      return '<li class="note">' +
        '<p class="note-text">' + escapeHtml(post.record.text || '') + '</p>' +
        '<div class="note-foot">' +
          '<span>' + timeAgo(post.record.createdAt) + '</span>' +
          '<a href="https://bsky.app/profile/' + GLOSSE.bluesky + '/post/' + rkey + '">on bluesky ↗</a>' +
        '</div>' +
      '</li>';
    }).join('');
  })
  .catch(function () {
    document.getElementById('notePreview').innerHTML =
      '<li class="state">Couldn\'t reach Bluesky. <a href="https://bsky.app/profile/' + GLOSSE.bluesky + '">View the feed directly</a>.</li>';
  });

// Last-touched stamp, pulled from the repo's most recent commit.
fetch('https://api.github.com/repos/' + GLOSSE.repo + '/commits/main')
  .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(function (commit) {
    var el = document.getElementById('lastCommit');
    if (!el) return;
    el.textContent = 'last touched ' + timeAgo(commit.commit.author.date);
    el.href = commit.html_url;
    el.title = commit.commit.message.split('\n')[0];
  })
  .catch(function () {
    var el = document.getElementById('lastCommit');
    if (el) el.textContent = 'view commits';
  });

