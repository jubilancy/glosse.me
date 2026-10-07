// Press ~ (or `) on any page for a tiny terminal that navigates the real site.
(function () {
  var FS = window.GLOSSE_FS || { pages: [], sites: [], contact: [], greenhouse: [], sections: {} };
  var G = window.GLOSSE || {};
  var root, out, input, prompt, opener;
  var history = [], hi = 0;

  function cwd() { return location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0]; }
  function findPage(name) {
    name = String(name || '').toLowerCase();
    return FS.pages.filter(function (p) { return p.name === name; })[0];
  }
  function findSite(name) {
    name = String(name || '').toLowerCase().replace(/\/$/, '');
    return FS.sites.filter(function (s) {
      return s.name === name || s.name.split('.')[0] === name;
    })[0];
  }
  function findEntry(path) {
    var sec = (FS.sections || {})[path.split('/')[0]] || [];
    return sec.filter(function (e) { return e.url === '/' + path + '/'; })[0];
  }
  function clean(a) { return String(a || '').replace(/^~?\/+|\/+$/g, '').toLowerCase(); }

  function build() {
    root = document.createElement('div');
    root.className = 'term';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'terminal');
    out = document.createElement('div');
    out.className = 'term-out';
    out.setAttribute('aria-live', 'polite');
    var form = document.createElement('form');
    form.className = 'term-form';
    prompt = document.createElement('label');
    prompt.className = 'term-prompt';
    input = document.createElement('input');
    input.type = 'text';
    input.id = 'termInput';
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    prompt.setAttribute('for', 'termInput');
    form.appendChild(prompt);
    form.appendChild(input);
    root.appendChild(out);
    root.appendChild(form);
    document.body.appendChild(root);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var cmd = input.value;
      input.value = '';
      echo(cmd);
      if (cmd.trim()) { history.push(cmd); hi = history.length; run(cmd.trim()); }
      out.scrollTop = out.scrollHeight;
    });
    input.addEventListener('keydown', onInputKey);
    root.addEventListener('click', function () { input.focus(); });
  }

  function label() { return 'eliana@glosse.me:~' + (cwd() ? '/' + cwd() : '') + '$'; }
  function line(text, href, cls) {
    var d = document.createElement('div');
    d.className = 'term-line' + (cls ? ' ' + cls : '');
    if (href) {
      var a = document.createElement('a');
      a.href = href;
      a.textContent = text;
      d.appendChild(a);
    } else {
      d.textContent = text;
    }
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  }
  function echo(cmd) { line(label() + ' ' + cmd, null, 'term-echo'); }

  function onInputKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hi > 0) { hi--; input.value = history[hi]; }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      hi = Math.min(hi + 1, history.length);
      input.value = history[hi] || '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      complete();
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      out.textContent = '';
    }
  }

  function complete() {
    var parts = input.value.split(/\s+/);
    var word = parts[parts.length - 1].toLowerCase();
    var pool = parts.length === 1
      ? ['help', 'ls', 'cd', 'pwd', 'whoami', 'theme', 'clear', 'exit']
      : FS.pages.map(function (p) { return p.name; })
          .concat(FS.sites.map(function (s) { return s.name.split('.')[0]; }));
    var hits = pool.filter(function (w) { return w.indexOf(word) === 0; });
    if (hits.length === 1) {
      parts[parts.length - 1] = hits[0];
      input.value = parts.join(' ') + (parts.length === 1 ? ' ' : '');
    } else if (hits.length > 1) {
      echo(input.value);
      line(hits.join('  '));
    }
  }

  function run(cmd) {
    var parts = cmd.split(/\s+/);
    var name = parts[0].toLowerCase();
    var arg = parts.slice(1).join(' ');
    switch (name) {
      case 'help':
        line('ls [dir]       list pages, or a section (try: ls notes)');
        line('cd <dir>       go to a page (try: cd projects, cd ..)');
        line('pwd, whoami, date, echo, clear');
        line('theme [light|dark]');
        line('exit           close (or press Esc)');
        line('tab completes · ↑ recalls history');
        break;
      case 'ls': case 'dir': ls(arg); break;
      case 'cd': case 'open': cd(arg); break;
      case 'pwd': line('/' + cwd()); break;
      case 'whoami': line('eliana'); break;
      case 'date': line(new Date().toString()); break;
      case 'echo': line(arg); break;
      case 'clear': case 'cls': out.textContent = ''; break;
      case 'theme': theme(arg); break;
      case 'exit': case 'quit': case 'q': close(); break;
      case 'sudo': line('nice try.'); break;
      case 'rm': line('this is a static site. nothing here to delete.'); break;
      case 'vim': case 'nano': case 'emacs': line('the only editor here is github.'); break;
      default: line(name + ': command not found. try help');
    }
  }

  function ls(arg) {
    var dir = arg ? clean(arg) : cwd();
    if (arg === '..' || arg === '~' || arg === '/') dir = '';
    if (!dir) {
      FS.pages.forEach(function (p) { line(p.name + '/', p.url); });
      FS.sites.forEach(function (s) { line(s.name + ' ↗', s.url); });
      return;
    }
    if (!findPage(dir)) { line('ls: ' + arg + ': no such directory'); return; }
    if (dir === 'notes') return liveNotes();
    if (dir === 'projects') return liveRepos();
    if (dir === 'changelog') return liveCommits();
    if (FS.sections && FS.sections[dir]) {
      FS.sections[dir].forEach(function (e) { line(e.date + '  ' + e.title, e.url); });
    } else if (dir === 'contact') {
      FS.contact.forEach(function (c) { line(c.label + '  ' + c.text, c.url); });
    } else if (dir === 'greenhouse') {
      FS.greenhouse.forEach(function (g) { line(g.name, g.url); });
    } else {
      line('(nothing to list) try: cd ' + dir);
    }
  }

  function cd(arg) {
    var dir = clean(arg);
    if (!arg || arg === '~' || arg === '/' || arg === '..') {
      if (location.pathname === '/') { line('already home'); return; }
      location.href = '/';
      return;
    }
    var page = findPage(dir);
    var site = findSite(dir);
    var entry = findEntry(dir);
    if (page) { location.href = page.url; }
    else if (entry) { location.href = entry.url; }
    else if (site) { location.href = site.url; }
    else { line('cd: ' + arg + ': no such directory'); }
  }

  function theme(arg) {
    var docEl = document.documentElement;
    var next = arg === 'light' || arg === 'dark' ? arg
      : (docEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    docEl.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    line('theme: ' + next);
  }

  function getJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }
  function failed() { line('could not reach the network right now.'); }

  function liveNotes() {
    line('fetching notes…');
    getJson('https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=' +
      encodeURIComponent(G.bluesky) + '&limit=10&filter=posts_no_replies')
      .then(function (data) {
        (data.feed || []).filter(function (i) { return !i.reason; }).forEach(function (i) {
          var rkey = i.post.uri.split('/').pop();
          var text = (i.post.record.text || '').replace(/\s+/g, ' ');
          line(timeAgo(i.post.record.createdAt) + '  ' + (text.length > 80 ? text.slice(0, 79) + '…' : text),
            'https://bsky.app/profile/' + G.bluesky + '/post/' + rkey);
        });
      }).catch(failed);
  }
  function liveRepos() {
    line('fetching repos…');
    getJson('https://api.github.com/users/' + G.github + '/repos?sort=pushed&per_page=15')
      .then(function (repos) {
        repos.forEach(function (r) { line(r.name + '  ' + timeAgo(r.pushed_at), r.html_url); });
      }).catch(failed);
  }
  function liveCommits() {
    line('fetching commits…');
    getJson('https://api.github.com/repos/' + G.repo + '/commits?per_page=10')
      .then(function (commits) {
        commits.forEach(function (c) {
          line(c.sha.slice(0, 7) + '  ' + c.commit.message.split('\n')[0], c.html_url);
        });
      }).catch(failed);
  }

  var lastFocus = null;
  function open() {
    if (!root) build();
    lastFocus = document.activeElement;
    prompt.textContent = label();
    root.hidden = false;
    if (!out.childNodes.length) line("hi. type help. (Esc to close)");
    input.focus();
  }
  function close() {
    if (root) root.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function toggle() { if (root && !root.hidden) close(); else open(); }

  function typing(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ||
      el.tagName === 'SELECT' || el.isContentEditable);
  }

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.key === '~' || e.key === '`') && !typing(document.activeElement)) {
      e.preventDefault();
      toggle();
    } else if (e.key === 'Escape' && root && !root.hidden) {
      close();
    }
  });

  opener = document.getElementById('termOpen');
  if (opener) opener.addEventListener('click', toggle);
})();
