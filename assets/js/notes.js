var HANDLE = GLOSSE.bluesky;
var API = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed';
var cursor = null;
var total = 0;


// Bluesky facets carry link ranges as byte offsets into the UTF-8 text.
function renderText(record) {
  var text = record.text || '';
  var facets = record.facets || [];
  var links = facets.filter(function (f) {
    return (f.features || []).some(function (ft) {
      return ft.$type === 'app.bsky.richtext.facet#link';
    });
  });

  if (!links.length) return escapeHtml(text);

  var bytes = new TextEncoder().encode(text);
  var decoder = new TextDecoder();
  links.sort(function (a, b) { return a.index.byteStart - b.index.byteStart; });

  var out = '';
  var pos = 0;
  links.forEach(function (facet) {
    var uri = facet.features.find(function (f) {
      return f.$type === 'app.bsky.richtext.facet#link';
    }).uri;
    out += escapeHtml(decoder.decode(bytes.slice(pos, facet.index.byteStart)));
    var label = decoder.decode(bytes.slice(facet.index.byteStart, facet.index.byteEnd));
    out += '<a href="' + escapeHtml(uri) + '">' + escapeHtml(label) + '</a>';
    pos = facet.index.byteEnd;
  });
  out += escapeHtml(decoder.decode(bytes.slice(pos)));
  return out;
}

function renderImages(post) {
  var embed = post.embed;
  var images = null;

  if (embed && embed.$type === 'app.bsky.embed.images#view') images = embed.images;
  if (embed && embed.$type === 'app.bsky.embed.recordWithMedia#view' &&
      embed.media && embed.media.images) images = embed.media.images;

  if (!images || !images.length) return '';

  return '<div class="note-images">' + images.map(function (img) {
    return '<img src="' + escapeHtml(img.thumb) + '" alt="' +
           escapeHtml(img.alt || 'Image attached to post') + '" loading="lazy" />';
  }).join('') + '</div>';
}

function renderNote(item) {
  var post = item.post;
  var rkey = post.uri.split('/').pop();
  var url = 'https://bsky.app/profile/' + HANDLE + '/post/' + rkey;
  var reposted = item.reason && item.reason.$type === 'app.bsky.feed.defs#reasonRepost';

  var counts = [];
  if (post.replyCount) counts.push(post.replyCount + ' replies');
  if (post.repostCount) counts.push(post.repostCount + ' reposts');
  if (post.likeCount) counts.push(post.likeCount + ' likes');

  return '<li class="note">' +
    (reposted ? '<p class="repost-tag">reposted</p>' : '') +
    '<p class="note-text">' + renderText(post.record) + '</p>' +
    renderImages(post) +
    '<div class="note-foot">' +
      '<span>' + timeAgo(post.record.createdAt) +
        (counts.length ? ' · ' + counts.join(' · ') : '') + '</span>' +
      '<a href="' + url + '">reply on bluesky ↗</a>' +
    '</div>' +
  '</li>';
}

function load(append) {
  var url = API + '?actor=' + HANDLE + '&limit=25&filter=posts_no_replies' +
            (cursor ? '&cursor=' + encodeURIComponent(cursor) : '');

  return fetch(url)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      var list = document.getElementById('noteList');
      var items = data.feed || [];
      cursor = data.cursor || null;

      if (!append) list.innerHTML = '';
      if (!items.length && !total) {
        list.innerHTML = '<li class="state">No notes yet. First one\'s coming.</li>';
        return;
      }

      list.insertAdjacentHTML('beforeend', items.map(renderNote).join(''));
      total += items.length;
      document.getElementById('noteCount').textContent = total + ' posts';
      document.getElementById('loadMore').style.display = cursor ? 'block' : 'none';
    })
    .catch(function () {
      if (!append) {
        document.getElementById('noteList').innerHTML =
          '<li class="state">Couldn\'t reach Bluesky. ' +
          '<a href="https://bsky.app/profile/' + HANDLE + '">Read the feed there instead</a>.</li>';
      }
    });
}

document.getElementById('loadMore').addEventListener('click', function () { load(true); });
load(false);
