/* Vitreous browser shell: UI prototype.
   Web content renders in a sandboxed iframe for now. The engine layer
   (Chromium or Gecko embed) replaces the iframe later; everything else
   here (tabs, spaces, settings, palette) is the real interface. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const h = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, '');
      else if (v !== false && v != null) n.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null) n.append(kid);
    return n;
  };
  const motionOn = () => document.body.dataset.motion !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- data ---------- */
  const KEY = 'vitreous.v2';
  const DEFAULTS = {
    theme: 'dark', tabs: 'side', accent: '#5aa9ff', blur: 28, tint: 14, radius: 22,
    aurora: 'prism', motion: true, lowfx: false, search: 'ddg',
    trackers: true, https: true, fingerprint: true, dnt: true, collapsed: false,
  };
  const ENGINES = {
    ddg: ['DuckDuckGo', 'https://duckduckgo.com/?q='],
    brave: ['Brave Search', 'https://search.brave.com/search?q='],
    startpage: ['Startpage', 'https://www.startpage.com/do/search?q='],
    ecosia: ['Ecosia', 'https://www.ecosia.org/search?q='],
  };
  const AURORA = {
    prism: ['#5aa9ff', '#b57bff', '#0ea5a0'],
    ember: ['#ff7a45', '#ff4f9a', '#ffc247'],
    forest: ['#2fd180', '#0ea5a0', '#b4e33d'],
    mono: ['#9aa3b5', '#e6e9f2', '#6b7385'],
  };
  const ACCENTS = ['#5aa9ff', '#b57bff', '#0ea5a0', '#ff6b9a', '#ffb340'];
  const SPACES = [
    { id: 'personal', name: 'Personal', color: '#5aa9ff' },
    { id: 'work', name: 'Work', color: '#b57bff' },
    { id: 'build', name: 'Build', color: '#0ea5a0' },
  ];
  const BOOKMARKS = [
    { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
    { name: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
    { name: 'Ladybird', url: 'https://ladybird.org' },
    { name: 'Vitreous repo', url: 'https://github.com/yazoniplay/Vitreous-browser' },
  ];
  const INTERNAL = ['vitreous://newtab', 'vitreous://settings'];

  /* ---------- state ---------- */
  let S = { ...DEFAULTS };
  let tabs = [];
  let activeId = null;
  let ws = 'personal';
  let viewKey = '';
  let loadTimer = 0;

  const uid = () => Math.random().toString(36).slice(2, 9);

  function normalize(input) {
    const s = String(input || '').trim();
    if (!s) return 'vitreous://newtab';
    if (/^vitreous:\/\//i.test(s)) {
      const k = s.toLowerCase();
      return INTERNAL.includes(k) ? k : 'vitreous://newtab';
    }
    if (/^https?:\/\//i.test(s)) {
      try {
        const u = new URL(s);
        if (S.https && u.protocol === 'http:' && !/^(localhost|127\.|\[::1\])/.test(u.hostname)) u.protocol = 'https:';
        return u.href;
      } catch { /* fall through to search */ }
    }
    if (/^localhost(:\d+)?([/?#].*)?$/i.test(s)) return 'http://' + s;
    const looksSchemed = /^[a-z][a-z0-9+.-]*:/i.test(s) && !/^[\w.-]+:\d+/.test(s);
    if (!looksSchemed && !/\s/.test(s) && /^[^\s/]+\.[a-z]{2,}(:\d+)?([/?#].*)?$/i.test(s)) {
      try { return new URL('https://' + s).href; } catch { /* search */ }
    }
    return ENGINES[S.search][1] + encodeURIComponent(s);
  }

  const cur = () => tabs.find((t) => t.id === activeId);
  const urlOf = (t) => t.hist[t.i];
  const wsTabs = () => tabs.filter((t) => t.ws === ws);

  function titleOf(t) {
    const u = urlOf(t);
    if (u === 'vitreous://newtab') return 'New tab';
    if (u === 'vitreous://settings') return 'Settings';
    try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; }
  }
  function favLetter(t) {
    const u = urlOf(t);
    if (u === 'vitreous://newtab') return 'V';
    if (u === 'vitreous://settings') return '•';
    return (titleOf(t)[0] || '?').toUpperCase();
  }
  function pretty(u) {
    if (INTERNAL.includes(u)) return '';
    try {
      const x = new URL(u);
      return x.hostname.replace(/^www\./, '') + (x.pathname === '/' ? '' : x.pathname) + x.search;
    } catch { return u; }
  }

  /* ---------- persistence ---------- */
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ S, tabs, activeId, ws })); } catch { /* storage unavailable */ }
  }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!raw) return;
      S = { ...DEFAULTS, ...(raw.S || {}) };
      if (!ENGINES[S.search]) S.search = 'ddg';
      if (!AURORA[S.aurora]) S.aurora = 'prism';
      if (S.tabs !== 'top' && S.tabs !== 'side') S.tabs = 'side';
      if (SPACES.some((x) => x.id === raw.ws)) ws = raw.ws;
      if (Array.isArray(raw.tabs)) {
        tabs = raw.tabs
          .filter((t) => t && Array.isArray(t.hist) && t.hist.length && SPACES.some((x) => x.id === t.ws))
          .map((t) => {
            const hist = t.hist.slice(-50).map((u) => normalize(String(u)));
            const i = Math.min(Math.max(+t.i || 0, 0), hist.length - 1);
            return { id: t.id && /^\w+$/.test(t.id) ? t.id : uid(), ws: t.ws, hist, i, reload: 0 };
          });
      }
      if (raw.activeId && tabs.some((t) => t.id === raw.activeId)) activeId = raw.activeId;
    } catch { /* corrupted state: start fresh */ }
  }

  /* ---------- tab actions ---------- */
  function newTab(url = 'vitreous://newtab', space = ws) {
    const t = { id: uid(), ws: space, hist: [normalize(url)], i: 0, reload: 0 };
    tabs.push(t);
    ws = space;
    activeId = t.id;
    render();
    if (urlOf(t) === 'vitreous://newtab') focusAddr();
  }
  function closeTab(id) {
    const t = tabs.find((x) => x.id === id);
    if (!t) return;
    const group = tabs.filter((x) => x.ws === t.ws);
    const pos = group.indexOf(t);
    tabs = tabs.filter((x) => x.id !== id);
    if (id === activeId) {
      const rest = tabs.filter((x) => x.ws === t.ws);
      if (rest.length) activeId = rest[Math.min(pos, rest.length - 1)].id;
      else { newTab('vitreous://newtab', t.ws); return; }
    }
    render();
  }
  function activate(id) {
    const t = tabs.find((x) => x.id === id);
    if (!t) return;
    activeId = id;
    ws = t.ws;
    render();
  }
  function navigate(t, input) {
    const u = normalize(input);
    t.hist = t.hist.slice(0, t.i + 1);
    if (t.hist[t.i] !== u) { t.hist.push(u); t.i++; }
    t.reload++;
    render();
  }
  function go(delta) {
    const t = cur();
    const n = t.i + delta;
    if (n < 0 || n >= t.hist.length) return;
    t.i = n;
    render();
  }
  function switchSpace(id) {
    if (id === ws) return;
    ws = id;
    const group = wsTabs();
    if (group.length) activeId = group[group.length - 1].id;
    else { newTab('vitreous://newtab', id); return; }
    render();
  }

  /* ---------- appearance ---------- */
  function apply() {
    const b = document.body;
    const dark = S.theme === 'auto' ? matchMedia('(prefers-color-scheme: dark)').matches : S.theme === 'dark';
    b.dataset.theme = dark ? 'dark' : 'light';
    b.dataset.motion = S.motion ? 'on' : 'off';
    b.dataset.fx = S.lowfx ? 'low' : 'high';
    const r = document.documentElement.style;
    r.setProperty('--accent', S.accent);
    r.setProperty('--blur', S.blur + 'px');
    r.setProperty('--tint', String(S.tint / 100));
    r.setProperty('--radius', S.radius + 'px');
    const [a, c, d] = AURORA[S.aurora];
    r.setProperty('--b1', a); r.setProperty('--b2', c); r.setProperty('--b3', d);
    $('#main').dataset.tabs = S.tabs;
    $('#sidebar').dataset.hideTabs = S.tabs === 'top' ? '1' : '0';
    $('#sideWrap').dataset.rail = S.tabs === 'top' || S.collapsed ? '1' : '0';
    placeIndicators();
  }
  const set = (k, v) => { S[k] = v; apply(); save(); };

  /* ---------- tabs rendering (keyed, animated) ---------- */
  function tabEl(t, side) {
    return h('div', {
      class: 'tab' + (side ? ' side' : ''), role: 'tab', tabindex: '0', 'data-id': t.id,
      onclick: () => activate(t.id),
      onauxclick: (e) => { if (e.button === 1) closeTab(t.id); },
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(t.id); } },
    },
      h('span', { class: 'fav', 'aria-hidden': 'true' }),
      h('span', { class: 't' }),
      h('span', {
        class: 'x', role: 'button', 'aria-label': 'Close tab', text: '×',
        onclick: (e) => { e.stopPropagation(); closeTab(t.id); },
      }));
  }
  function patchTab(n, t) {
    n.setAttribute('aria-selected', String(t.id === activeId));
    n.title = urlOf(t);
    const title = titleOf(t), letter = favLetter(t);
    const tt = n.querySelector('.t'), ff = n.querySelector('.fav');
    if (tt.textContent !== title) tt.textContent = title;
    if (ff.textContent !== letter) ff.textContent = letter;
  }
  function reconcile(list, items, side) {
    const ind = list.querySelector('.indicator');
    const existing = new Map([...list.querySelectorAll('.tab:not(.leave)')].map((n) => [n.dataset.id, n]));
    const keep = new Set(items.map((t) => t.id));
    existing.forEach((n, id) => {
      if (keep.has(id)) return;
      if (!motionOn() || list.offsetParent === null) { n.remove(); return; }
      n.classList.add('leave');
      n.addEventListener('animationend', () => n.remove(), { once: true });
      setTimeout(() => n.remove(), 450);
    });
    let prev = ind;
    items.forEach((t) => {
      let n = existing.get(t.id);
      if (!n) { n = tabEl(t, side); if (motionOn()) n.classList.add('enter'); }
      patchTab(n, t);
      if (prev.nextSibling !== n) list.insertBefore(n, prev.nextSibling);
      prev = n;
    });
  }

  function placeIndicators() {
    [$('#sideTabs'), $('#tabs')].forEach((list) => {
      const ind = list.querySelector('.indicator');
      const act = list.querySelector('.tab[aria-selected="true"]:not(.leave)');
      if (!act || list.offsetParent === null) { ind.style.opacity = '0'; return; }
      const side = list.id === 'sideTabs';
      ind.style.width = act.offsetWidth + 'px';
      ind.style.height = (side ? 38 : 34) + 'px';
      ind.style.transform = `translate(${act.offsetLeft}px, ${act.offsetTop}px)`;
      ind.style.opacity = '1';
      if (!list.classList.contains('ready')) requestAnimationFrame(() => requestAnimationFrame(() => list.classList.add('ready')));
    });
  }

  function renderTabs() {
    reconcile($('#tabs'), wsTabs(), false);
    reconcile($('#sideTabs'), wsTabs(), true);
    placeIndicators();
    setTimeout(placeIndicators, 320);
  }
  function renderSpaces() {
    document.querySelectorAll('.space').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === ws)));
  }

  function renderToolbar() {
    const t = cur();
    $('#back').disabled = t.i === 0;
    $('#forward').disabled = t.i >= t.hist.length - 1;
    const u = urlOf(t);
    const ai = $('#addr');
    if (document.activeElement !== ai) ai.value = pretty(u);
    $('.address .lock').style.opacity = u.startsWith('https://') ? '1' : '0.3';
    document.title = (titleOf(t) === 'New tab' ? '' : titleOf(t) + ' · ') + 'Vitreous';
  }

  /* ---------- loading indicator ---------- */
  const loadbar = () => $('#loadbar');
  function loadStart() { clearTimeout(loadTimer); const l = loadbar(); l.className = 'loadbar'; void l.offsetWidth; l.className = 'loadbar loading'; loadTimer = setTimeout(loadEnd, 9000); }
  function loadEnd() { clearTimeout(loadTimer); const l = loadbar(); if (l.classList.contains('loading')) l.className = 'loadbar finish'; }

  function renderViewport() {
    const t = cur();
    const u = urlOf(t);
    const key = t.id + '|' + u + '|' + t.reload;
    if (key === viewKey) return;
    viewKey = key;
    const v = $('#content');
    v.replaceChildren();
    loadStart();
    if (u === 'vitreous://newtab') { v.append(startPage()); setTimeout(loadEnd, 380); }
    else if (u === 'vitreous://settings') { v.append(settingsPage()); setTimeout(loadEnd, 380); }
    else {
      const frame = h('iframe', {
        src: u, title: titleOf(t), referrerpolicy: 'no-referrer',
        sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox',
        onload: loadEnd,
      });
      const chip = h('div', { class: 'chip glass', title: 'Many sites refuse to load inside a frame. The real engine has no such limit.' },
        h('span', { text: 'Embedded preview' }),
        h('a', { href: u, target: '_blank', rel: 'noopener noreferrer', text: 'Open in system browser ↗' }),
        h('button', {
          'aria-label': 'Dismiss', text: '×',
          onclick: () => { chip.classList.add('out'); setTimeout(() => chip.remove(), 260); },
        }));
      v.append(frame, chip);
    }
  }

  function render() {
    if (!cur()) { const t = { id: uid(), ws, hist: ['vitreous://newtab'], i: 0, reload: 0 }; tabs.push(t); activeId = t.id; }
    renderTabs(); renderSpaces(); renderToolbar(); renderViewport(); save();
  }

  /* ---------- start page ---------- */
  function startPage() {
    const input = h('input', {
      type: 'text', placeholder: 'Search or enter address', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Search',
      onkeydown: (e) => { if (e.key === 'Enter' && input.value.trim()) navigate(cur(), input.value); },
    });
    return h('div', { class: 'page' }, h('div', { class: 'start' },
      h('img', { class: 'rise', style: '--i:0', src: 'assets/vitreous-mark.svg', alt: 'Vitreous' }),
      h('h1', { class: 'rise', style: '--i:1', text: 'vitreous' }),
      h('label', { class: 'address rise', style: '--i:2' }, input),
      h('div', { class: 'tiles' }, BOOKMARKS.map((b, i) => h('button', { class: 'tile rise', style: `--i:${3 + i}`, onclick: () => navigate(cur(), b.url) },
        h('span', { class: 'fav', text: b.name[0], 'aria-hidden': 'true' }), b.name))),
      h('p', { class: 'hint rise', style: '--i:7' }, h('kbd', { text: 'Ctrl K' }), ' palette  ·  ', h('kbd', { text: 'Alt T' }), ' new tab  ·  ', h('kbd', { text: 'Alt B' }), ' sidebar')));
  }

  /* ---------- settings page ---------- */
  function seg(options, key, after) {
    const wrap = h('div', { class: 'seg', role: 'group' });
    options.forEach(([val, label]) => {
      const b = h('button', {
        'aria-pressed': String(S[key] === val), text: label,
        onclick: () => { set(key, val); wrap.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); after && after(); },
      });
      wrap.append(b);
    });
    return wrap;
  }
  function toggle(key) {
    const s = h('button', {
      class: 'switch', role: 'switch', 'aria-checked': String(!!S[key]),
      onclick: () => { set(key, !S[key]); s.setAttribute('aria-checked', String(!!S[key])); },
    });
    return s;
  }
  function range(key, min, max, unit) {
    const out = h('span', { text: S[key] + unit, style: 'min-width:48px;text-align:right;color:var(--muted);font-size:13px' });
    const r = h('input', {
      type: 'range', min, max, value: S[key], 'aria-label': key,
      oninput: () => { set(key, +r.value); out.textContent = r.value + unit; },
    });
    return h('div', { style: 'display:flex;align-items:center;gap:12px' }, r, out);
  }
  function swatches(items, key, bg) {
    const wrap = h('div', { class: 'swatches' });
    items.forEach((val) => {
      const b = h('button', {
        class: 'sw', style: `background:${bg(val)}`, 'aria-label': String(val), 'aria-pressed': String(S[key] === val),
        onclick: () => { set(key, val); wrap.querySelectorAll('.sw').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); },
      });
      wrap.append(b);
    });
    return wrap;
  }
  const row = (label, sub, control) => h('div', { class: 'row' }, h('div', {}, label, sub ? h('small', { text: sub }) : null), control);

  function settingsPage() {
    const engine = h('select', { 'aria-label': 'Search engine', onchange: () => set('search', engine.value) },
      Object.entries(ENGINES).map(([k, v]) => h('option', { value: k, text: v[0], selected: S.search === k })));
    return h('div', { class: 'page' }, h('div', { class: 'settings' },
      h('h2', { class: 'rise', style: '--i:0', text: 'Settings' }),
      h('p', { class: 'rise', style: '--i:1', text: 'Every surface of Vitreous is adjustable. Changes apply instantly.' }),

      h('div', { class: 'group rise', style: '--i:2', id: 'grp-appearance' }, h('h3', { text: 'Appearance' }),
        row('Theme', null, seg([['dark', 'Dark'], ['light', 'Light'], ['auto', 'Auto']], 'theme')),
        row('Tab layout', 'Vertical tabs live in the sidebar', seg([['side', 'Side'], ['top', 'Top']], 'tabs')),
        row('Sidebar', 'Compact shows icons and expands on hover', seg([[false, 'Pinned'], [true, 'Compact']], 'collapsed')),
        row('Accent', null, swatches(ACCENTS, 'accent', (c) => c)),
        row('Background', null, swatches(Object.keys(AURORA), 'aurora', (k) => `linear-gradient(135deg, ${AURORA[k].join(',')})`)),
        row('Glass blur', null, range('blur', 0, 60, 'px')),
        row('Glass tint', null, range('tint', 2, 40, '%')),
        row('Corner radius', null, range('radius', 6, 36, 'px')),
        row('Animations', 'Background drift, transitions and effects', toggle('motion')),
        row('Low-power glass', 'Turns off blur for older GPUs and battery saving', toggle('lowfx'))),

      h('div', { class: 'group rise', style: '--i:3', id: 'grp-privacy' }, h('h3', { text: 'Privacy' }),
        row('Block trackers and ads', null, toggle('trackers')),
        row('HTTPS-only', 'Upgrade http:// addresses to https://', toggle('https')),
        row('Fingerprint resistance', null, toggle('fingerprint')),
        row('Send Do Not Track', null, toggle('dnt')),
        row('Search engine', null, engine),
        h('div', { class: 'warn', text: 'Prototype note: HTTPS-only and the search engine already work. Tracker blocking, fingerprint resistance and Do Not Track switch on once the engine layer is connected.' })),

      h('div', { class: 'group rise', style: '--i:4' }, h('h3', { text: 'Shortcuts' }),
        h('div', { class: 'keys' },
          [['New tab', 'Alt T'], ['Close tab', 'Alt W'], ['Focus address bar', 'Alt L'], ['Compact / pin sidebar', 'Alt B'], ['Settings', 'Alt ,'], ['Command palette', 'Ctrl K']]
            .flatMap(([a, b]) => [h('span', { text: a }), h('kbd', { text: b })])))));
  }

  /* ---------- palette ---------- */
  const pal = $('#pal'), palInput = $('#palInput'), palList = $('#palList');
  let palItems = [], palSel = 0;

  function commands() {
    const c = [
      ['New tab', 'Alt T', () => newTab()],
      ['Close tab', 'Alt W', () => closeTab(activeId)],
      ['Reload', '', () => { cur().reload++; render(); }],
      ['Open settings', 'Alt ,', openSettings],
      ['Compact / pin sidebar', 'Alt B', toggleSidebar],
      ['Switch tab layout (side / top)', '', () => set('tabs', S.tabs === 'top' ? 'side' : 'top')],
      ['Switch theme (dark / light)', '', () => set('theme', document.body.dataset.theme === 'dark' ? 'light' : 'dark')],
    ];
    SPACES.forEach((s) => c.push(['Space: ' + s.name, 'space', () => switchSpace(s.id)]));
    BOOKMARKS.forEach((b) => c.push(['Open: ' + b.name, 'bookmark', () => navigate(cur(), b.url)]));
    tabs.forEach((t) => c.push(['Tab: ' + titleOf(t), SPACES.find((s) => s.id === t.ws).name, () => activate(t.id)]));
    return c;
  }
  function palRender() {
    const q = palInput.value.trim();
    const ql = q.toLowerCase();
    palItems = commands().filter(([n]) => !ql || n.toLowerCase().includes(ql));
    if (q) palItems.unshift(['Search or open “' + q + '”', 'Enter', () => navigate(cur(), q)]);
    palSel = Math.min(palSel, Math.max(palItems.length - 1, 0));
    palList.replaceChildren(...palItems.map(([n, hint], i) => h('button', {
      class: 'pal-item', style: `--i:${Math.min(i, 12)}`, 'aria-selected': String(i === palSel), onclick: () => runPal(i),
    }, h('span', { text: n }), h('span', { text: hint }))));
  }
  function palMark() { [...palList.children].forEach((b, i) => b.setAttribute('aria-selected', String(i === palSel))); }
  function runPal(i) { const it = palItems[i]; closePal(); if (it) it[2](); }
  function openPal() { pal.classList.add('open'); palInput.value = ''; palSel = 0; palRender(); setTimeout(() => palInput.focus(), 30); }
  function closePal() { pal.classList.remove('open'); palInput.blur(); }
  palInput.addEventListener('input', () => { palSel = 0; palRender(); });
  palInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); palSel = Math.min(palSel + 1, palItems.length - 1); palMark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(palSel - 1, 0); palMark(); }
    else if (e.key === 'Enter') { e.preventDefault(); runPal(palSel); }
    else if (e.key === 'Escape') closePal();
  });
  pal.addEventListener('mousedown', (e) => { if (e.target === pal) closePal(); });

  /* ---------- misc actions ---------- */
  function focusAddr() { const a = $('#addr'); a.focus(); a.select(); }
  function toggleSidebar() { set('collapsed', !S.collapsed); }
  function openSettings(anchor) {
    const t = cur();
    if (urlOf(t) !== 'vitreous://settings') navigate(t, 'vitreous://settings');
    if (typeof anchor === 'string') setTimeout(() => { const g = document.getElementById(anchor); g && g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
  }

  /* ---------- wiring ---------- */
  SPACES.forEach((s) => $('#spaces').append(h('button', {
    class: 'space', 'data-id': s.id, title: s.name, 'aria-pressed': String(s.id === ws), onclick: () => switchSpace(s.id),
  }, h('span', { class: 'dot', style: `background:${s.color};color:${s.color}` }), h('span', { class: 'sl', text: s.name }))));

  $('#newTab').addEventListener('click', () => newTab());
  $('#sideNewTab').addEventListener('click', () => newTab());
  $('#back').addEventListener('click', () => go(-1));
  $('#forward').addEventListener('click', () => go(1));
  $('#reload').addEventListener('click', () => { cur().reload++; render(); });
  $('#pin').addEventListener('click', toggleSidebar);
  $('#openSettings').addEventListener('click', () => openSettings());
  $('#shield').addEventListener('click', () => openSettings('grp-privacy'));
  $('#palBtn').addEventListener('click', openPal);
  $('#addr').addEventListener('focus', (e) => { const u = urlOf(cur()); e.target.value = INTERNAL.includes(u) ? '' : u; e.target.select(); });
  $('#addr').addEventListener('blur', renderToolbar);
  $('#addr').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) { navigate(cur(), e.target.value); e.target.blur(); }
    else if (e.key === 'Escape') e.target.blur();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') { e.preventDefault(); pal.classList.contains('open') ? closePal() : openPal(); return; }
    if (e.key === 'Escape' && pal.classList.contains('open')) { closePal(); return; }
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const map = { KeyT: () => newTab(), KeyW: () => closeTab(activeId), KeyL: focusAddr, KeyB: toggleSidebar, Comma: () => openSettings() };
    if (map[e.code]) { e.preventDefault(); map[e.code](); }
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.theme === 'auto') apply(); });

  /* glass spotlight follows the cursor */
  let spot = 0;
  document.addEventListener('pointermove', (e) => {
    if (spot || !motionOn()) return;
    spot = requestAnimationFrame(() => {
      spot = 0;
      const g = e.target.closest && e.target.closest('.glass');
      if (!g) return;
      const r = g.getBoundingClientRect();
      g.style.setProperty('--mx', e.clientX - r.left + 'px');
      g.style.setProperty('--my', e.clientY - r.top + 'px');
    });
  }, { passive: true });

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => placeIndicators());
    ro.observe($('#sideTabs')); ro.observe($('#tabs'));
  }
  addEventListener('resize', placeIndicators);

  /* ---------- boot ---------- */
  load();
  apply();
  if (!tabs.length) tabs.push({ id: uid(), ws, hist: ['vitreous://newtab'], i: 0, reload: 0 });
  if (!tabs.some((t) => t.id === activeId)) { const g = wsTabs(); activeId = (g[0] || tabs[0]).id; ws = cur().ws; }
  render();
})();
