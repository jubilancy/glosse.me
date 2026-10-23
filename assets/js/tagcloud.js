// Word Cloud 2.0: the tag links on /tags/ become words on a slowly spinning sphere (SVG).
// The mouse steers it: move left or right to spin that way, up or down to tilt. Touch drags.
// Hovering or focusing a word pauses it. Reduced-motion visitors keep the plain links.
(function () {
  var nav = document.getElementById('tagCloud');
  if (!nav) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var all = Array.prototype.slice.call(nav.querySelectorAll('a'));
  if (all.length < 3) return;

  // Links arrive most-used first. Keep the busiest ones (the full list is below the cloud) and
  // deal them around the sphere so the big words don't bunch together.
  var narrow = nav.clientWidth < 480;
  var cap = Math.min(all.length, narrow ? 18 : 32);
  var stride = Math.round(cap * 0.382) || 1;
  while (gcd(stride, cap) !== 1) stride++;
  var links = [];
  for (var k = 0; k < cap; k++) links[(k * stride) % cap] = all[k];

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  var NS = 'http://www.w3.org/2000/svg';
  var SIZE = narrow ? 420 : 600, C = SIZE / 2, R = narrow ? 105 : 190, D = 3 * R;
  var max = +nav.getAttribute('data-max') || 1;

  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + SIZE + ' ' + SIZE);
  svg.setAttribute('class', 'tag-cloud-svg');

  // Spread the words evenly over a sphere (Fibonacci lattice).
  var n = links.length, golden = Math.PI * (3 - Math.sqrt(5));
  var words = links.map(function (a, i) {
    var count = +a.getAttribute('data-n') || 1;
    var y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
    var r = Math.sqrt(1 - y * y), th = golden * i;
    var label = a.textContent.trim();
    var short = label.length > (narrow ? 14 : 18) ? label.slice(0, narrow ? 13 : 17) + '…' : label;

    var link = document.createElementNS(NS, 'a');
    link.setAttribute('href', a.getAttribute('href'));
    var text = document.createElementNS(NS, 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', (12 + 10 * Math.sqrt((count - 1) / Math.max(1, max - 1))).toFixed(1));
    text.textContent = short;
    var title = document.createElementNS(NS, 'title');
    title.textContent = label + ' (' + count + ')';
    link.appendChild(text);
    link.appendChild(title);
    svg.appendChild(link);
    return { link: link, text: text, x: Math.cos(th) * r * R, y: y * R, z: Math.sin(th) * r * R };
  });

  nav.textContent = '';
  nav.classList.add('is-live');
  nav.appendChild(svg);

  var vx = 0, vy = 0;                 // current spin (radians per frame)
  var tx = 0.0018, ty = 0.004;        // where the spin is easing to
  var paused = false, visible = true, dragging = false, lastX = 0, lastY = 0;

  function rotate(ax, ay) {
    var sx = Math.sin(ax), cx = Math.cos(ax), sy = Math.sin(ay), cy = Math.cos(ay);
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      var y1 = w.y * cx - w.z * sx, z1 = w.y * sx + w.z * cx;     // tilt around x
      var x2 = w.x * cy + z1 * sy, z2 = -w.x * sy + z1 * cy;      // spin around y
      w.x = x2; w.y = y1; w.z = z2;
    }
  }

  function draw() {
    for (var i = 0; i < words.length; i++) {
      var w = words[i], s = D / (D - w.z);
      w.link.setAttribute('transform', 'translate(' + (C + w.x * s).toFixed(1) + ' ' + (C + w.y * s).toFixed(1) + ') scale(' + s.toFixed(3) + ')');
      w.text.style.opacity = (0.22 + 0.78 * (w.z + R) / (2 * R)).toFixed(2);
    }
  }

  function frame() {
    if (visible && !paused) {
      vx += (tx - vx) * 0.06;
      vy += (ty - vy) * 0.06;
      rotate(vx, vy);
      draw();
    }
    requestAnimationFrame(frame);
  }

  function steer(e) {
    var box = svg.getBoundingClientRect();
    var px = (e.clientX - box.left) / box.width - 0.5, py = (e.clientY - box.top) / box.height - 0.5;
    ty = px * 0.05;
    tx = -py * 0.05;
  }

  svg.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse') { steer(e); return; }
    if (!dragging) return;
    ty = Math.max(-0.08, Math.min(0.08, (e.clientX - lastX) * 0.004));
    tx = 0;
    vy = ty;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  svg.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  function release() { dragging = false; tx = 0.0018; ty = 0.004; }
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);
  svg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { tx = 0.0018; ty = 0.004; } });

  // Hovering or tabbing to a word holds the sphere still so it can be clicked.
  svg.addEventListener('pointerover', function (e) { if (e.pointerType === 'mouse' && e.target.closest('a')) paused = true; });
  svg.addEventListener('pointerout', function (e) { if (e.pointerType === 'mouse' && e.target.closest('a')) paused = false; });
  svg.addEventListener('focusin', function () { paused = true; });
  svg.addEventListener('focusout', function () { paused = false; });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(svg);
  }

  rotate(0.3, 0);
  draw();
  requestAnimationFrame(frame);
})();
