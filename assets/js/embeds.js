// Progressive embeds for posts: click-to-play YouTube, Bluesky posts, GitHub repo cards.
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
