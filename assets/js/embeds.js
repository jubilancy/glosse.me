// Progressive embeds for posts: click-to-play YouTube, Bluesky posts, GitHub repo cards, ListenBrainz.
// Every embed ships as a plain link first, so nothing breaks if a request fails.
(function () {
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function json(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }
  function ago(iso) {
    return typeof timeAgo === 'function' ? timeAgo(iso) : new Date(iso).toLocaleDateString();
  }

  // YouTube: load the player only after a click, so nothing tracks you before then.
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.yt-facade');
    if (!b) return;
    var f = document.createElement('iframe');
    var start = b.getAttribute('data-start');
    f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(b.getAttribute('data-yt')) +
      '?autoplay=1&rel=0' + (start ? '&start=' + encodeURIComponent(start) : '');
    f.title = 'youtube video';
    f.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    f.allowFullscreen = true;
    b.replaceWith(f);
  });

  // Bluesky post
  Array.prototype.forEach.call(document.querySelectorAll('.embed-bsky'), function (box) {
    var handle = box.getAttribute('data-handle');
    var rkey = box.getAttribute('data-rkey');
    var api = 'https://public.api.bsky.app/xrpc/';
    var did = /^did:/.test(handle)
      ? Promise.resolve(handle)
      : json(api + 'com.atproto.identity.resolveHandle?handle=' + encodeURIComponent(handle)).then(function (d) { return d.did; });
    did.then(function (id) {
      return json(api + 'app.bsky.feed.getPosts?uris=' + encodeURIComponent('at://' + id + '/app.bsky.feed.post/' + rkey));
    }).then(function (data) {
      var p = data.posts && data.posts[0];
      if (!p) return;
      var a = el('a', 'bsky-card');
      a.href = box.querySelector('a').href;
      a.rel = 'noopener';
      var head = el('span', 'bsky-head');
      if (p.author.avatar) {
        var av = el('img', 'bsky-avatar');
        av.src = p.author.avatar; av.alt = ''; av.loading = 'lazy'; av.referrerPolicy = 'no-referrer';
        head.appendChild(av);
      }
      head.appendChild(el('span', 'bsky-name', p.author.displayName || p.author.handle));
      head.appendChild(el('span', 'bsky-handle', '@' + p.author.handle));
      a.appendChild(head);
      a.appendChild(el('span', 'bsky-text', p.record.text || ''));
      var imgs = p.embed && p.embed.images;
      if (imgs && imgs.length) {
        var row = el('span', 'bsky-imgs');
        imgs.slice(0, 4).forEach(function (im) {
          var i = el('img');
          i.src = im.thumb; i.alt = im.alt || ''; i.loading = 'lazy'; i.referrerPolicy = 'no-referrer';
          row.appendChild(i);
        });
        a.appendChild(row);
      }
      a.appendChild(el('span', 'bsky-foot',
        ago(p.record.createdAt) + ' · ' + (p.likeCount || 0) + ' likes · ' + (p.repostCount || 0) + ' reposts · ' + (p.replyCount || 0) + ' replies'));
      box.textContent = '';
      box.appendChild(a);
    }).catch(function () {});
  });

  // ListenBrainz: now playing / latest listen, recent listens, top artists + tracks, daily activity.
  // Public API, no key. Each request fails on its own, so a missing block is just left out.
  var LB_RANGES = { this_week: 'this week', week: 'last week', this_month: 'this month', month: 'last month',
                    this_year: 'this year', year: 'last year', all_time: 'all time' };
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function lbCover(m, cls) {
    var meta = m && m.mbid_mapping;
    if (!meta || !meta.caa_id || !UUID.test(meta.caa_release_mbid || '')) return el('span', cls + ' lb-nocover');
    var i = el('img', cls);
    i.src = 'https://coverartarchive.org/release/' + meta.caa_release_mbid + '/' + parseInt(meta.caa_id, 10) + '-250.jpg';
    i.alt = ''; i.loading = 'lazy'; i.referrerPolicy = 'no-referrer';
    i.onerror = function () { i.replaceWith(el('span', cls + ' lb-nocover')); };
    return i;
  }
  function lbBars(title, rows, label) {
    var sec = el('div', 'lb-sec');
    sec.appendChild(el('span', 'lb-h', title));
    var max = rows.reduce(function (n, r) { return Math.max(n, r.count); }, 1);
    rows.forEach(function (r) {
      var row = el('span', 'lb-bar');
      var fill = el('i'); fill.style.width = Math.max(4, Math.round(100 * r.count / max)) + '%';
      row.appendChild(fill);
      var txt = el('span', 'lb-bar-text');
      txt.appendChild(el('span', 'lb-bar-name', r.name));
      if (r.sub) txt.appendChild(el('span', 'lb-sub', r.sub));
      row.appendChild(txt);
      row.appendChild(el('span', 'lb-n', String(r.count)));
      sec.appendChild(row);
    });
    return sec;
  }
  Array.prototype.forEach.call(document.querySelectorAll('.embed-lb'), function (box) {
    var user = box.getAttribute('data-user');
    var wanted = box.getAttribute('data-range');
    var api = 'https://api.listenbrainz.org/1/';
    var u = encodeURIComponent(user);
    function get(path) { return json(api + path).then(function (d) { return d.payload; }).catch(function () { return null; }); }
    function stats(kind, range, n) { return get('stats/user/' + u + '/' + kind + '?count=' + n + '&range=' + range); }

    // this_* ranges are empty at the start of a period, so fall back to the last full one
    var range = wanted || 'this_month';
    var fallback = { this_month: 'month', this_week: 'week', this_year: 'year' }[range];
    stats('artists', range, 5).then(function (a) {
      if (!wanted && fallback && !(a && a.artists && a.artists.length)) { range = fallback; return stats('artists', range, 5); }
      return a;
    }).then(function (artists) {
      return Promise.all([
        artists,
        stats('recordings', range, 5),
        stats('listening-activity', range, 0),
        get('user/' + u + '/listen-count'),
        get('user/' + u + '/playing-now'),
        get('user/' + u + '/listens?count=6')
      ]);
    }).then(function (r) {
      var artists = r[0], tracks = r[1], activity = r[2], total = r[3], now = r[4], recent = r[5];
      var current = now && now.listens && now.listens[0];
      var listens = (recent && recent.listens) || [];
      if (!current && !listens.length && !(artists && artists.artists)) return;

      var card = el('div', 'lb-card');
      var head = el('a', 'lb-head');
      head.href = box.querySelector('a').href; head.rel = 'noopener';
      head.appendChild(el('span', 'lb-user', user));
      head.appendChild(el('span', 'lb-site', 'on listenbrainz'));
      if (total) head.appendChild(el('span', 'lb-total', total.count.toLocaleString() + ' listens'));
      card.appendChild(head);

      // now playing, else the latest listen
      var hero = current || listens[0];
      if (hero) {
        var t = hero.track_metadata;
        var np = el('div', 'lb-now');
        np.appendChild(lbCover(t, 'lb-cover-lg'));
        var info = el('span', 'lb-now-info');
        info.appendChild(el('span', 'lb-badge', current ? '▶ playing now' : 'last played ' + ago(new Date(hero.listened_at * 1000).toISOString())));
        info.appendChild(el('span', 'lb-track', t.track_name));
        info.appendChild(el('span', 'lb-sub', t.artist_name + (t.release_name ? ' · ' + t.release_name : '')));
        np.appendChild(info);
        card.appendChild(np);
      }

      var rest = (current ? listens : listens.slice(1)).slice(0, 5);
      if (rest.length) {
        var rec = el('div', 'lb-sec');
        rec.appendChild(el('span', 'lb-h', 'recent'));
        rest.forEach(function (l) {
          var t = l.track_metadata;
          var row = el('span', 'lb-recent');
          row.appendChild(lbCover(t, 'lb-cover'));
          var txt = el('span', 'lb-recent-text');
          txt.appendChild(el('span', 'lb-bar-name', t.track_name));
          txt.appendChild(el('span', 'lb-sub', t.artist_name));
          row.appendChild(txt);
          row.appendChild(el('span', 'lb-n', ago(new Date(l.listened_at * 1000).toISOString())));
          rec.appendChild(row);
        });
        card.appendChild(rec);
      }

      var label = LB_RANGES[range] || range;
      var cols = el('div', 'lb-cols');
      if (artists && artists.artists && artists.artists.length) {
        cols.appendChild(lbBars('top artists · ' + label, artists.artists.map(function (a) {
          return { name: a.artist_name, count: a.listen_count };
        })));
      }
      if (tracks && tracks.recordings && tracks.recordings.length) {
        cols.appendChild(lbBars('top tracks · ' + label, tracks.recordings.map(function (x) {
          return { name: x.track_name, sub: x.artist_name, count: x.listen_count };
        })));
      }
      if (cols.childNodes.length) card.appendChild(cols);

      var days = activity && activity.listening_activity;
      if (days && days.length > 1) {
        var act = el('div', 'lb-sec');
        var sum = days.reduce(function (n, d) { return n + d.listen_count; }, 0);
        // the activity endpoint's ranges cover a different span than the stats ones, so label by the days it returned
        act.appendChild(el('span', 'lb-h', 'activity · ' + days.length + ' days · ' + sum.toLocaleString() + ' listens'));
        var chart = el('span', 'lb-chart');
        var peak = days.reduce(function (n, d) { return Math.max(n, d.listen_count); }, 1);
        days.forEach(function (d) {
          var b = el('i');
          b.style.height = Math.max(2, Math.round(100 * d.listen_count / peak)) + '%';
          b.title = d.time_range + ': ' + d.listen_count;
          chart.appendChild(b);
        });
        act.appendChild(chart);
        card.appendChild(act);
      }

      box.textContent = '';
      box.appendChild(card);
    }).catch(function () {});
  });

  // GitHub repo card
  Array.prototype.forEach.call(document.querySelectorAll('.embed-gh'), function (box) {
    var repo = box.getAttribute('data-repo');
    json('https://api.github.com/repos/' + repo).then(function (r) {
      var a = el('a', 'gh-card');
      a.href = r.html_url; a.rel = 'noopener';
      a.appendChild(el('span', 'gh-name', r.full_name));
      if (r.description) a.appendChild(el('span', 'gh-desc', r.description));
      var bits = ['★ ' + r.stargazers_count];
      if (r.language) bits.push(r.language);
      bits.push('updated ' + ago(r.pushed_at));
      a.appendChild(el('span', 'gh-foot', bits.join(' · ')));
      box.textContent = '';
      box.appendChild(a);
    }).catch(function () {});
  });
})();
