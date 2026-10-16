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

/* ---------- Contact form ---------- */
(function () {
  var EMAIL = 'nuyraswan@gmail.com';
  // Optional: to have messages land in your inbox without opening the visitor's email app,
  // create a free form at formspree.io (or a similar service) and paste its URL here.
  var FORM_ENDPOINT = '';

  var form = document.getElementById('contactForm');
  var status = document.getElementById('formStatus');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('cfName').value.trim();
    var from = document.getElementById('cfEmail').value.trim();
    var msg = document.getElementById('cfMsg').value.trim();
    if (!name || !from || !msg) { status.textContent = 'Please fill in all three fields.'; return; }

    if (FORM_ENDPOINT) {
      status.textContent = 'Sending...';
      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: from, message: msg })
      }).then(function (r) {
        if (!r.ok) throw new Error('failed');
        form.reset();
        status.textContent = 'Thanks, ' + name + '. Your message has been sent.';
      }).catch(function () {
        status.textContent = 'That did not send. Please email ' + EMAIL + ' directly.';
      });
      return;
    }

    var subject = 'Portfolio message from ' + name;
    var body = msg + '\n\n' + name + '\n' + from;
    window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    status.textContent = 'Your email app should open with the message ready to send. If nothing opens, email ' + EMAIL + ' directly.';
  });
})();

/* ---------- Ask-about-Nuyra chatbot (answers from the facts on this site) ---------- */
(function () {
  var root = document.getElementById('ask');
  var launch = document.getElementById('askLaunch');
  var panel = document.getElementById('askPanel');
  var closeBtn = document.getElementById('askClose');
  var box = document.getElementById('askMessages');
  var chips = document.getElementById('askSuggest');
  var form = document.getElementById('askForm');
  var input = document.getElementById('askInput');
  if (!root) return;

  var EMAIL = 'nuyraswan@gmail.com';
  var L = {
    mail: { label: 'Email Nuyra', href: 'mailto:' + EMAIL },
    form: { label: 'Contact form', href: '#contact' },
    github: { label: 'GitHub', href: 'https://github.com/NuyraSwanson' },
    linkedin: { label: 'LinkedIn', href: 'https://www.linkedin.com/in/nuyra-swanson-301621322/' },
    work: { label: 'See her work', href: '#work' },
    skills: { label: 'See her skills', href: '#skills' },
    tonewise: { label: 'ToneWise code', href: 'https://github.com/NuyraSwanson/ToneWise' },
    tonelive: { label: 'Open ToneWise', href: 'https://tonewise.ai.studio/' },
    care: { label: 'Visit CareConnect', href: 'https://care-connect-delta-puce.vercel.app/' },
    enrol: { label: 'Enrollment system code', href: 'https://github.com/NuyraSwanson/EnrollmentSystem' }
  };

  var skillMap = [
    ['Java and Java Swing', /\bjava\b|swing/], ['HTML', /\bhtml\b/], ['CSS', /\bcss\b/], ['JavaScript', /\b(javascript|js)\b/],
    ['SQL', /\bsql\b/], ['MySQL', /mysql/], ['JDBC database integration', /jdbc/], ['SQL database design', /database design|data model/],
    ['Visual Studio Code', /vs ?code|visual studio/], ['NetBeans', /netbeans/], ['IntelliJ IDEA', /intellij/], ['MySQL Workbench', /workbench/],
    ['Git and GitHub', /\bgit\b|github/], ['Spring Boot', /spring/], ['REST API integration', /\brest\b/],
    ['Client-server architecture', /client.?server/], ['Input validation', /validation/], ['Secure coding practices', /secure cod/],
    ['Object-oriented programming', /\boop\b|object.?oriented/]
  ];
  var otherTech = /\b(python|react|angular|vue|php|c#|c\+\+|node|docker|aws|azure|kotlin|swift|flutter|power ?bi|excel|tableau|django|laravel|golang|rust|ruby|typescript|vb\.?net|tailwind|vite|agile)\b/;

  var intents = [
    { re: /^(hi|hello|hey|sawubona|molo|howzit|good (morning|afternoon|evening))\b/,
      a: { t: 'Hi! I can tell you about Nuyra\'s studies, projects and skills, and how to reach her. What would you like to know?' } },
    { re: /\b(thanks|thank you|cheers|appreciate)\b/,
      a: { t: 'You\'re welcome! If you\'d like to speak to Nuyra directly, the contact form is further down this page.', l: [L.form] } },
    { re: /(are you (a |an )?(bot|ai|human|real|robot)|who (made|built|created) you|are you chatgpt|are you claude)/,
      a: { t: 'I\'m a small assistant built into this site. I answer from what\'s published here, so for anything else it\'s best to contact Nuyra directly.', l: [L.form, L.mail] } },
    { re: /(how|what).*(site|website|page).*(built|made|coded|written)|built this (site|website)/,
      a: { t: 'This site is hand-built with HTML, CSS and JavaScript, with no frameworks.' } },
    { re: /github/, a: { t: 'Nuyra\'s code is on GitHub, including ToneWise and EnrollmentSystem.', l: [L.github] } },
    { re: /linkedin/, a: { t: 'You can find Nuyra on LinkedIn here.', l: [L.linkedin] } },
    { re: /\b(cv|resume|résumé|curriculum)\b/,
      a: { t: 'A CV isn\'t available to download on this site. You can ask Nuyra for one by email.', l: [L.mail, L.form] } },
    { re: /(hire|hiring|available|availability|looking for|open to|opportunit|vacanc|employ|job|work with (you|her)|work together)/,
      a: { t: 'Nuyra is finishing her final year and is open to conversations about what comes next. Email her or send a message through the contact form.', l: [L.mail, L.form] } },
    { re: /(contact|e-?mail|reach|get in touch|message|phone|number|call|whatsapp)/,
      a: { t: 'You can email Nuyra at ' + EMAIL + ', send a message with the contact form on this page, or message her on LinkedIn. No phone number is listed here.', l: [L.mail, L.form, L.linkedin] } },
    { re: /(attendance|iot|biometric|fingerprint)/,
      a: { t: 'The IoT biometric attendance system is a fingerprint-based attendance system on IoT hardware. Someone places a finger on the reader, the device identifies them, and their attendance is logged automatically.', l: [L.work] } },
    { re: /(mzansi|travel)/,
      a: { t: 'Mzansi Travel is an AI chatbot for exploring South Africa. You ask in plain language and get ideas for where to go, when to travel and how to spend your days.', l: [L.work] } },
    { re: /(care ?connect|healthcare|health|medical|emergency|first responder)/,
      a: { t: 'CareConnect is a healthcare and emergency access web app. You can book appointments online and reach first responders with one tap. It\'s live on the web.', l: [L.care, L.work] } },
    { re: /(flowdesk|saas|booking|dashboard)/,
      a: { t: 'FlowDesk is a modern SaaS platform that helps service-based businesses manage bookings, customers, staff, services and daily operations from one dashboard.', l: [L.work] } },
    { re: /(tone ?wise|sentiment|vader|roberta|ocr)/,
      a: { t: 'ToneWise is an in-browser sentiment analysis tool for reviews and comments. It uses VADER and a local RoBERTa transformer, with OCR intake and zero-server privacy.', l: [L.tonelive, L.tonewise] } },
    { re: /(enrol|student management|swing|client.?server)/,
      a: { t: 'The Student Enrollment Management System is a role-based client-server app for students and administrators, built with Java and Java Swing. It enables module enrollment and administrative management functions, with a database and role-based access control.', l: [L.enrol] } },
    { re: /(project|portfolio|built|build|made|chatbot|apps?)\b/,
      a: { t: 'Nuyra\'s projects include an IoT biometric attendance system, the Mzansi Travel AI chatbot, FlowDesk (a SaaS platform for service businesses), CareConnect (a healthcare and emergency access app), ToneWise (a sentiment analysis tool) and a Student Enrollment Management System.', l: [L.work, L.github] } },
    { re: /(skill|tech stack|stack|technolog|language|framework|tools|proficient|good at|experience with|know)/,
      a: { t: 'Programming languages: Java and Java Swing, HTML, CSS, JavaScript and SQL. Databases: MySQL, SQL database design, JDBC integration, and data capturing, modelling and management. Tools: VS Code, NetBeans, IntelliJ IDEA, MySQL Workbench, Git and GitHub. Technologies: client-server architecture, input validation, secure coding, REST API integration, object-oriented programming and Spring Boot.', l: [L.skills] } },
    { re: /(capaciti|data academy|data analyst|internship|currently work|current job|what does she do)/,
      a: { t: 'Nuyra is a data analyst intern in the Data Academy at Capaciti, alongside her final year of studies.' } },
    { re: /(study|studying|student|cput|universit|degree|school|education|qualification|course|graduat|application development|final year)/,
      a: { t: 'Nuyra is in her final year of Application Development at CPUT.' } },
    { re: /(where.*(live|based|stay)|based|location|city|relocat|remote)/,
      a: { t: 'Her location isn\'t listed on this site. You can ask her directly.', l: [L.mail, L.form] } },
    { re: /(who is|about (nuyra|her)|tell me about|introduce|background|nuyra)/,
      a: { t: 'Nuyra Swanson is a final-year Application Development student at CPUT and a data analyst intern in the Data Academy at Capaciti. She enjoys solving problems and building solutions to real-world problems.', l: [L.work] } }
  ];

  function answer(q) {
    var text = q.toLowerCase();
    // Questions about a specific skill
    var found = [];
    skillMap.forEach(function (s) { if (s[1].test(text)) found.push(s[0]); });
    if (found.length && /(know|use|uses|skill|experience|can she|does she|proficient|work with|familiar|have)/.test(text)) {
      return { t: 'Yes, ' + found.join(', ') + (found.length > 1 ? ' are' : ' is') + ' on Nuyra\'s skills list.', l: [L.skills] };
    }
    if (!found.length && otherTech.test(text) && /(know|use|uses|skill|experience|can she|does she|proficient|work with|familiar|have)/.test(text)) {
      return { t: 'That isn\'t on the skills list published here. She may still have experience with it, so it\'s worth asking her directly.', l: [L.form, L.mail] };
    }
    for (var i = 0; i < intents.length; i++) { if (intents[i].re.test(text)) return intents[i].a; }
    if (found.length) return { t: 'Nuyra lists ' + found.join(', ') + ' among her skills.', l: [L.skills] };
    return { t: 'I don\'t have an answer to that. I only know what\'s on this site, but Nuyra can answer directly.', l: [L.form, L.mail] };
  }

  var suggestions = ['Who is Nuyra?', 'What projects has she built?', 'What are her skills?', 'How can I contact her?'];
  var busy = false;

  function add(role, text, links) {
    var d = document.createElement('div');
    d.className = 'msg ' + role;
    var p = document.createElement('p'); p.textContent = text; d.appendChild(p);
    if (links && links.length) {
      var row = document.createElement('div'); row.className = 'msg-links';
      links.forEach(function (l) {
        var a = document.createElement('a'); a.textContent = l.label; a.href = l.href;
        if (/^https?:/.test(l.href)) { a.target = '_blank'; a.rel = 'noopener'; }
        row.appendChild(a);
      });
      d.appendChild(row);
    }
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
    return d;
  }

  function ask(q) {
    q = q.trim();
    if (!q || busy) return;
    busy = true;
    chips.hidden = true;
    add('user', q);
    var t = document.createElement('div');
    t.className = 'msg bot';
    t.innerHTML = '<span class="typing" aria-label="Typing"><i></i><i></i><i></i></span>';
    box.appendChild(t);
    box.scrollTop = box.scrollHeight;
    var a = answer(q);
    setTimeout(function () { t.remove(); add('bot', a.t, a.l); busy = false; }, 650);
  }

  function renderChips() {
    chips.innerHTML = '';
    suggestions.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = s;
      b.addEventListener('click', function () { ask(s); });
      chips.appendChild(b);
    });
  }

  function open() {
    panel.hidden = false; root.classList.add('open'); launch.setAttribute('aria-expanded', 'true');
    if (!box.children.length) add('bot', 'Hi, I\'m here to answer questions about Nuyra. Pick a question below or type your own.');
    input.focus();
  }
  function close() {
    panel.hidden = true; root.classList.remove('open'); launch.setAttribute('aria-expanded', 'false');
    launch.focus();
  }

  launch.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  panel.addEventListener('click', function (e) {
    var a = e.target.closest('.msg-links a');
    if (a && a.getAttribute('href').charAt(0) === '#') panel.hidden = true, root.classList.remove('open'), launch.setAttribute('aria-expanded', 'false');
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value; input.value = '';
    ask(v);
  });
  renderChips();
})();