var REPO = GLOSSE.repo;
var API = 'https://api.github.com/repos/' + REPO + '/commits';
var page = 1;
var total = 0;
var PER_PAGE = 25;


function dayLabel(iso) {
  var d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderCommit(item) {
  var msg = item.commit.message.split('\n');
  var title = msg[0];
  var body = msg.slice(1).join('\n').trim();
  var authorName = item.commit.author ? item.commit.author.name : 'unknown';
  var shortSha = item.sha.slice(0, 7);

  return '<li class="repo">' +
    '<div class="repo-head">' +
      '<a class="repo-name" href="' + item.html_url + '">' + escapeHtml(title) + '</a>' +
      '<span class="repo-updated">' + timeAgo(item.commit.author.date) + '</span>' +
    '</div>' +
    (body ? '<p class="repo-desc">' + escapeHtml(body) + '</p>' : '') +
    '<div class="repo-meta">' +
      '<span>' + escapeHtml(authorName) + '</span>' +
      '<span>' + dayLabel(item.commit.author.date) + '</span>' +
      '<span><a href="' + item.html_url + '" style="color:inherit">' + shortSha + '</a></span>' +
    '</div>' +
  '</li>';
}

function load(append) {
  var url = API + '?sha=main&per_page=' + PER_PAGE + '&page=' + page;

  return fetch(url)
    .then(function (r) {
      if (r.status === 403) throw new Error('rate-limited');
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function (commits) {
      var list = document.getElementById('commitList');
      if (!append) list.innerHTML = '';

      if (!commits.length && !total) {
        list.innerHTML = '<li class="state">No commits yet.</li>';
        return;
      }

      list.insertAdjacentHTML('beforeend', commits.map(renderCommit).join(''));
      total += commits.length;
      document.getElementById('commitCount').textContent = total + ' commits';
      document.getElementById('loadMore').style.display =
        commits.length === PER_PAGE ? 'block' : 'none';
    })
    .catch(function (err) {
      if (!append) {
        var msg = err.message === 'rate-limited'
          ? 'GitHub is rate-limiting this network right now. Try again in a few minutes, or '
          : 'Couldn\'t reach GitHub. ';
        document.getElementById('commitList').innerHTML =
          '<li class="state">' + msg +
          '<a href="https://github.com/' + REPO + '/commits/main">view commits on GitHub</a>.</li>';
      }
    });
}

document.getElementById('loadMore').addEventListener('click', function () {
  page += 1;
  load(true);
});

load(false);
