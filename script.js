/* ---------- Theme toggle ---------- */
(function () {
  var btn = document.getElementById('themeBtn');
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  btn.addEventListener('click', function () {
    var root = document.documentElement;
    var current = root.getAttribute('data-theme') || (mq.matches ? 'dark' : 'light');
    root.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
    window.dispatchEvent(new Event('themechange'));
  });
  if (mq.addEventListener) mq.addEventListener('change', function () { window.dispatchEvent(new Event('themechange')); });
})();

/* ---------- Hero: fingerprint that scans ---------- */
(function () {
  var hero = document.getElementById('hero');
  var cv = document.getElementById('print');
  var ctx = cv.getContext('2d');
  var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var TAU = Math.PI * 2;
  var RINGS = 34, PTS = 240, SKIP = 3;
  var w = 0, h = 0, dpr = 1, cx = 0, cy = 0, rx = 0, ry = 0;
  var rings = [];
  var colors = { ridge: 'rgba(26,20,70,.4)', scan: '#E8443A' };
  var focus = { x: 0, y: 0 }, target = { x: 0, y: 0 };
  var pointer = false, startT = null, visible = true, rafId = null;

  function readColors() {
    var s = getComputedStyle(document.documentElement);
    colors.ridge = s.getPropertyValue('--ridge').trim() || colors.ridge;
    colors.scan = s.getPropertyValue('--scan').trim() || colors.scan;
    if (reduceMq.matches) draw(1);
  }

  function build() {
    rings = [];
    for (var i = SKIP; i <= RINGS; i++) {
      var r = i / RINGS;
      var arr = new Float32Array((PTS + 1) * 4);
      for (var j = 0; j <= PTS; j++) {
        var th = (j / PTS) * TAU;
        var wob = 1 + 0.06 * Math.sin(3 * th + i * 0.35) + 0.035 * Math.sin(5 * th - i * 0.2);
        var sx = Math.sin(r * 2.2) * rx * 0.12;
        var x = cx + rx * r * wob * Math.cos(th) + sx;
        var y = cy + ry * r * 1.08 * wob * Math.sin(th) - r * ry * 0.05;
        var dx = x - cx, dy = y - cy, len = Math.hypot(dx, dy) || 1;
        arr[j * 4] = x; arr[j * 4 + 1] = y; arr[j * 4 + 2] = dx / len; arr[j * 4 + 3] = dy / len;
      }
      rings.push(arr);
    }
  }

  function resize() {
    var rect = hero.getBoundingClientRect();
    w = rect.width; h = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var narrow = w < 760;
    if (narrow) { cx = w * 0.5; cy = h * 0.72; ry = Math.min(h * 0.26, w * 0.52); }
    else { cx = w * 0.7; cy = h * 0.5; ry = Math.min(h * 0.46, w * 0.6); }
    rx = ry * 0.74;
    focus.x = target.x = cx; focus.y = target.y = cy - ry * 0.2;
    build();
    draw(startT === null || reduceMq.matches ? 1 : progress(performance.now()));
  }

  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function progress(now) { return ease(Math.min(1, (now - startT) / 2200)); }

  function draw(p) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var count = Math.max(0, Math.floor(p * rings.length));
    if (!count) return;
    var sig = ry * 0.16, amp = 9, denom = 2 * sig * sig;
    var path = new Path2D();
    for (var k = 0; k < count; k++) {
      var a = rings[k];
      for (var j = 0; j <= PTS; j++) {
        var x = a[j * 4], y = a[j * 4 + 1];
        var dx = x - focus.x, dy = y - focus.y;
        var g = Math.exp(-(dx * dx + dy * dy) / denom) * amp;
        var px = x + a[j * 4 + 2] * g, py = y + a[j * 4 + 3] * g;
        if (j === 0) path.moveTo(px, py); else path.lineTo(px, py);
      }
    }
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 1.02, ry * 1.02, 0, 0, TAU);
    ctx.clip();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = colors.ridge;
    ctx.stroke(path);
    var band = Math.max(26, ry * 0.09);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, focus.y - band, w, band * 2);
    ctx.clip();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = colors.scan;
    ctx.stroke(path);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(cx - rx * 1.1, focus.y);
    ctx.lineTo(cx + rx * 1.1, focus.y);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = colors.scan;
    ctx.stroke();
    ctx.restore();
  }

  function frame(now) {
    rafId = null;
    if (startT === null) startT = now;
    if (pointer) { target.x = pointer.x; target.y = pointer.y; }
    else {
      target.x = cx + Math.sin(now / 2600) * rx * 0.25;
      target.y = cy + Math.sin(now / 2200) * ry * 0.85;
    }
    focus.x += (target.x - focus.x) * 0.08;
    focus.y += (target.y - focus.y) * 0.08;
    draw(progress(now));
    if (visible && !reduceMq.matches) rafId = requestAnimationFrame(frame);
  }
  function kick() { if (!rafId && visible && !reduceMq.matches) rafId = requestAnimationFrame(frame); }

  hero.addEventListener('pointermove', function (e) {
    var rect = hero.getBoundingClientRect();
    pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  });
  hero.addEventListener('pointerleave', function () { pointer = false; });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; kick(); }).observe(hero);
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero); else window.addEventListener('resize', resize);
  window.addEventListener('themechange', readColors);
  if (reduceMq.addEventListener) reduceMq.addEventListener('change', function () { startT = performance.now() - 5000; resize(); kick(); });

  readColors();
  resize();
  if (reduceMq.matches) { startT = performance.now() - 5000; draw(1); } else { startT = null; kick(); }
})();

/* ---------- Demo 1: fingerprint reader ---------- */
(function () {
  var ns = 'http://www.w3.org/2000/svg';
  var g = document.getElementById('printRings');
  var dashes = [38, 9, 22, 7, 55, 10];
  for (var i = 1; i <= 10; i++) {
    var e = document.createElementNS(ns, 'ellipse');
    e.setAttribute('cx', 60); e.setAttribute('cy', 78);
    e.setAttribute('rx', (i * 5.2).toFixed(1)); e.setAttribute('ry', (i * 6.9).toFixed(1));
    e.setAttribute('stroke-dasharray', (dashes[i % 6] * (i % 2 ? 1 : 0.8)) + ' ' + (5 + (i % 3) * 2));
    e.setAttribute('stroke-dashoffset', i * 11);
    g.appendChild(e);
  }

  var btn = document.getElementById('printBtn');
  var status = document.getElementById('readerStatus');
  var list = document.getElementById('logList');
  var count = document.getElementById('presentCount');
  var names = ['Amahle', 'Kabelo', 'Lerato', 'Thando', 'Sizwe', 'Naledi'];
  var idx = 0, minutes = 7 * 60 + 56, present = 0, busy = false;

  function fmt(m) { var hh = Math.floor(m / 60), mm = m % 60; return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }

  btn.addEventListener('click', function () {
    if (busy) return;
    busy = true;
    btn.classList.remove('matched');
    btn.classList.add('scanning');
    status.textContent = 'Scanning...';
    setTimeout(function () {
      var name = names[idx % names.length];
      idx++;
      minutes += 2 + (idx * 3) % 4;
      present++;
      btn.classList.remove('scanning');
      btn.classList.add('matched');
      status.textContent = 'Match found: ' + name + '. Marked present.';
      var empty = list.querySelector('.empty');
      if (empty) empty.remove();
      var li = document.createElement('li');
      li.className = 'fresh';
      li.innerHTML = '<span>' + name + '</span><time>' + fmt(minutes) + '</time><span class="chip-ok">Present</span>';
      list.insertBefore(li, list.firstChild);
      while (list.children.length > 5) list.removeChild(list.lastChild);
      count.textContent = present + ' present';
      setTimeout(function () { btn.classList.remove('matched'); busy = false; }, 900);
    }, 1400);
  });
})();

/* ---------- Demo 2: chatbot preview ---------- */
(function () {
  var messages = document.getElementById('messages');
  var suggest = document.getElementById('suggest');
  var qa = [
    { q: 'Three days on the Garden Route', a: [
      'Base yourself in Plettenberg Bay or Knysna and let the coast set the pace.',
      'Day 1: walk the Tsitsikamma coast and cross the Storms River Mouth suspension bridge. Day 2: Knysna lagoon and the Featherbed Nature Reserve. Day 3: hike Robberg Nature Reserve and finish on the beach.' ] },
    { q: 'Best time for Kruger', a: [
      'The dry winter months, roughly May to September, are the best for game viewing.',
      'The bush is thinner and animals gather at waterholes, so sightings are easier. Mornings are cold, so pack layers.' ] },
    { q: 'A budget trip to Durban', a: [
      'Durban is easy on a budget. Stay near the beachfront, walk the Golden Mile promenade, and eat a bunny chow for a cheap and filling lunch.',
      'Save your spending for the Moses Mabhida Stadium sky car if you want the city view.' ] }
  ];
  var used = {}, busy = false;

  function add(role, paras) {
    var d = document.createElement('div');
    d.className = 'msg ' + role;
    (Array.isArray(paras) ? paras : [paras]).forEach(function (t) {
      var p = document.createElement('p'); p.textContent = t; d.appendChild(p);
    });
    messages.appendChild(d);
    messages.scrollTop = messages.scrollHeight;
    return d;
  }

  function renderChips() {
    suggest.innerHTML = '';
    var remaining = qa.filter(function (_, i) { return !used[i]; });
    if (!remaining.length) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = 'Start over';
      b.addEventListener('click', function () {
        used = {}; messages.innerHTML = '';
        add('bot', 'Sawubona! Where in South Africa are you headed? Pick a question below to see how I answer.');
        renderChips();
      });
      suggest.appendChild(b);
      return;
    }
    qa.forEach(function (item, i) {
      if (used[i]) return;
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = item.q;
      b.addEventListener('click', function () { ask(i); });
      suggest.appendChild(b);
    });
  }

  function ask(i) {
    if (busy) return;
    busy = true; used[i] = true;
    add('user', qa[i].q);
    Array.prototype.forEach.call(suggest.querySelectorAll('button'), function (b) { b.disabled = true; });
    var t = document.createElement('div');
    t.className = 'msg bot';
    t.innerHTML = '<span class="typing" aria-label="Mzansi Travel is typing"><i></i><i></i><i></i></span>';
    messages.appendChild(t);
    messages.scrollTop = messages.scrollHeight;
    setTimeout(function () {
      t.remove();
      add('bot', qa[i].a);
      busy = false;
      renderChips();
    }, 1000);
  }
  renderChips();
})();

/* ---------- Demo 3: FlowDesk dashboard ---------- */
(function () {
  var panel = document.getElementById('flowPanel');
  var tabs = document.getElementById('flowTabs');
  var labels = ['Pending', 'Confirmed', 'Checked in'];
  var bookings = [
    { t: '09:00', s: 'Cut and style', c: 'Zanele P.', w: 'Ruan', st: 1 },
    { t: '10:30', s: 'Deep tissue massage', c: 'Michael T.', w: 'Aisha', st: 1 },
    { t: '12:00', s: 'Colour treatment', c: 'Naledi K.', w: 'Ruan', st: 0 },
    { t: '14:15', s: 'Beard trim', c: 'Sipho D.', w: 'Ruan', st: 0 }
  ];
  var customers = [
    ['Zanele P.', 'Regular since last year', '12 visits'],
    ['Michael T.', 'Last visit 3 weeks ago', '4 visits'],
    ['Naledi K.', 'Prefers morning slots', '7 visits'],
    ['Sipho D.', 'New this month', '2 visits']
  ];
  var staff = [
    ['Ruan', 'Stylist'], ['Aisha', 'Massage therapist'], ['Lindiwe', 'Front desk']
  ];
  var services = [
    ['Cut and style', '45 min', 'R250'],
    ['Deep tissue massage', '60 min', 'R450'],
    ['Colour treatment', '120 min', 'R900'],
    ['Beard trim', '20 min', 'R90']
  ];
  var current = 'bookings';

  function plain(rows) {
    return '<div class="rows">' + rows.map(function (r) {
      return '<div class="row plain"><div><div class="a">' + r[0] + '</div><div class="b">' + r[1] + '</div></div><div class="end">' + r[2] + '</div></div>';
    }).join('') + '</div>';
  }

  function render() {
    var html = '';
    if (current === 'bookings') {
      var inn = bookings.filter(function (b) { return b.st === 2; }).length;
      var pend = bookings.filter(function (b) { return b.st === 0; }).length;
      html = '<h4>Bookings</h4><p class="flow-sum" aria-live="polite">' + bookings.length + ' today, ' + inn + ' checked in, ' + pend + ' waiting for confirmation</p><div class="rows">' +
        bookings.map(function (b, i) {
          return '<div class="row"><span class="time">' + b.t + '</span><div><div class="a">' + b.s + '</div><div class="b">' + b.c + ' with ' + b.w + '</div></div>' +
            '<button type="button" class="status" data-i="' + i + '" data-s="' + b.st + '" aria-label="' + b.c + ', ' + labels[b.st] + '. Change status.">' + labels[b.st] + '</button></div>';
        }).join('') + '</div>';
    } else if (current === 'customers') {
      html = '<h4>Customers</h4><p class="flow-sum">' + customers.length + ' booked today</p>' + plain(customers);
    } else if (current === 'staff') {
      var rows = staff.map(function (s) {
        var n = bookings.filter(function (b) { return b.w === s[0]; }).length;
        return [s[0], s[1], n ? n + (n === 1 ? ' booking today' : ' bookings today') : 'No bookings'];
      });
      html = '<h4>Staff</h4><p class="flow-sum">' + staff.length + ' on shift</p>' + plain(rows);
    } else {
      html = '<h4>Services</h4><p class="flow-sum">' + services.length + ' bookable services</p>' + plain(services.map(function (s) { return [s[0], s[1], s[2]]; }));
    }
    panel.innerHTML = html;
  }

  function select(name) {
    current = name;
    Array.prototype.forEach.call(tabs.querySelectorAll('button'), function (b) {
      var on = b.dataset.tab === name;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      if (on) panel.setAttribute('aria-labelledby', b.id);
    });
    render();
  }

  tabs.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tab]');
    if (b) select(b.dataset.tab);
  });
  tabs.addEventListener('keydown', function (e) {
    var list = Array.prototype.slice.call(tabs.querySelectorAll('button'));
    var i = list.indexOf(document.activeElement);
    if (i < 0) return;
    var next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = list[(i + 1) % list.length];
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = list[(i - 1 + list.length) % list.length];
    if (next) { e.preventDefault(); next.focus(); select(next.dataset.tab); }
  });
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('.status');
    if (!b) return;
    var i = +b.dataset.i;
    bookings[i].st = (bookings[i].st + 1) % 3;
    render();
    var again = panel.querySelector('.status[data-i="' + i + '"]');
    if (again) again.focus();
  });
  render();
})();