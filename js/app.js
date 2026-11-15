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
  const DEFAULT_SPACES = [
    { id: 'personal', name: 'Personal', color: '#5aa9ff' },
    { id: 'work', name: 'Work', color: '#b57bff' },
    { id: 'build', name: 'Build', color: '#0ea5a0' },
  ];
  const DEFAULT_BOOKMARKS = [
    { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
    { name: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
    { name: 'Ladybird', url: 'https://ladybird.org' },
    { name: 'Vitreous repo', url: 'https://github.com/yazoniplay/Vitreous-browser' },
  ];
  const DEFAULT_KEYS = {
    newTab: 'Alt+KeyT', closeTab: 'Alt+KeyW', focusAddr: 'Alt+KeyL', sidebar: 'Alt+KeyB', settings: 'Alt+Comma',
    palette: 'Ctrl+KeyK', reload: 'Alt+KeyR', back: 'Alt+ArrowLeft', forward: 'Alt+ArrowRight',
    nextTab: 'Alt+ArrowDown', prevTab: 'Alt+ArrowUp', home: 'Alt+KeyH', theme: '', layout: '',
  };
  const DEFAULTS = {
    /* appearance */
    theme: 'dark', accent: '#5aa9ff', aurora: 'prism', auroraCustom: ['#5aa9ff', '#b57bff', '#0ea5a0'],
    wallMode: 'none', wallUrl: '', wallDim: 25, wallBlur: 0, blobs: 100, blobSpeed: 100,
    /* glass */
    blur: 28, tint: 14, radius: 22, saturate: 180, rim: 100, shadow: 100, border: 1, lowfx: false, motion: true,
    /* type */
    font: 'system', fontCustom: '', fontScale: 100,
    /* layout */
    density: 'cozy', gap: 8, iconSize: 18, iconStroke: 18, brand: 'vitreous',
    tabs: 'side', collapsed: false, hoverExpand: true, sideWidth: 252, sideSide: 'left',
    /* tabs */
    tabShape: 'round', tabWidth: 200, favs: true, closeBtn: 'hover',
    /* toolbar */
    navBtns: true, shield: true, lock: true, showHome: false, addrWidth: 680, addrShape: 'pill', addrAlign: 'center',
    /* start page */
    startLogo: true, startTitle: 'vitreous', startSearch: true, startTiles: true, startHint: true,
    startClock: false, clock24: true, startGreeting: false, userName: '', tileSize: 108,
    bookmarks: DEFAULT_BOOKMARKS, spaces: DEFAULT_SPACES,
    /* behavior */
    search: 'ddg', engines: [], newTabMode: 'start', homepage: '',
    /* privacy */
    trackers: true, https: true, fingerprint: true, dnt: true,
    /* advanced */
    css: '', keys: DEFAULT_KEYS,
  };
  const ENUMS = {
    theme: ['dark', 'light', 'midnight', 'auto'], wallMode: ['none', 'url', 'upload'],
    font: ['system', 'inter', 'serif', 'mono', 'rounded', 'custom'], density: ['compact', 'cozy', 'roomy'],
    tabs: ['side', 'top'], sideSide: ['left', 'right'], tabShape: ['round', 'flat', 'underline'],
    closeBtn: ['hover', 'always', 'never'], addrShape: ['pill', 'round', 'square'], addrAlign: ['center', 'left'],
    newTabMode: ['start', 'blank', 'home'],
  };
  const RANGES = {
    wallDim: [0, 85], wallBlur: [0, 40], blobs: [0, 150], blobSpeed: [0, 300], blur: [0, 60], tint: [2, 40], radius: [4, 36],
    saturate: [100, 260], rim: [0, 100], shadow: [0, 100], border: [0, 3], fontScale: [80, 140], gap: [0, 18],
    iconSize: [14, 26], iconStroke: [10, 30], sideWidth: [200, 380], tabWidth: [110, 320], addrWidth: [360, 1100], tileSize: [80, 160],
  };
  const FONTS = {
    system: 'Inter, "SF Pro Display", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
    inter: 'Inter, system-ui, sans-serif',
    serif: '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
    mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    rounded: 'ui-rounded, "SF Pro Rounded", "Varela Round", Nunito, system-ui, sans-serif',
  };
  const DENSITY = { compact: 32, cozy: 38, roomy: 46 };
  const ENGINES = {
    ddg: ['DuckDuckGo', 'https://duckduckgo.com/?q='],
    brave: ['Brave Search', 'https://search.brave.com/search?q='],
    startpage: ['Startpage', 'https://www.startpage.com/do/search?q='],
    ecosia: ['Ecosia', 'https://www.ecosia.org/search?q='],
    google: ['Google', 'https://www.google.com/search?q='],
    bing: ['Bing', 'https://www.bing.com/search?q='],
    qwant: ['Qwant', 'https://www.qwant.com/?q='],
    youtube: ['YouTube', 'https://www.youtube.com/results?search_query='],
    github: ['GitHub', 'https://github.com/search?q='],
    wiki: ['Wikipedia', 'https://en.wikipedia.org/w/index.php?search='],
  };
  const AURORA = {
    prism: ['#5aa9ff', '#b57bff', '#0ea5a0'],
    ember: ['#ff7a45', '#ff4f9a', '#ffc247'],
    forest: ['#2fd180', '#0ea5a0', '#b4e33d'],
    mono: ['#9aa3b5', '#e6e9f2', '#6b7385'],
    ocean: ['#2b7fff', '#00c2d1', '#6a5cff'],
    sunset: ['#ff5e62', '#ff9966', '#8e54e9'],
    sakura: ['#ff9ac1', '#c8a2ff', '#ffd3a5'],
    neon: ['#00f5a0', '#ff2bd6', '#00b7ff'],
    graphite: ['#3a4256', '#556078', '#2a3040'],
    custom: null,
  };
  const ACCENTS = ['#5aa9ff', '#b57bff', '#0ea5a0', '#ff6b9a', '#ffb340', '#ff5a5a', '#34d399', '#e5e7eb'];
  const auroraOf = () => (S.aurora === 'custom' ? S.auroraCustom : AURORA[S.aurora] || AURORA.prism);
  const allEngines = () => {
    const o = { ...ENGINES };
    S.engines.forEach((e) => { o[e.id] = [e.name, e.url]; });
    return o;
  };
  const engineUrl = (q) => {
    const e = allEngines()[S.search] || ENGINES.ddg;
    const enc = encodeURIComponent(q);
    return e[1].includes('%s') ? e[1].replace('%s', enc) : e[1] + enc;
  };
  const INTERNAL = ['vitreous://newtab', 'vitreous://settings', 'vitreous://blank'];

  /* ---------- state ---------- */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let S = clone(DEFAULTS);
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
    return engineUrl(s);
  }

  const cur = () => tabs.find((t) => t.id === activeId);
  const urlOf = (t) => t.hist[t.i];
  const wsTabs = () => tabs.filter((t) => t.ws === ws);

  function titleOf(t) {
    const u = urlOf(t);
    if (u === 'vitreous://newtab') return 'New tab';
    if (u === 'vitreous://settings') return 'Settings';
    if (u === 'vitreous://blank') return 'Blank';
    try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; }
  }
  function favLetter(t) {
    const u = urlOf(t);
    if (u === 'vitreous://newtab') return 'V';
    if (u === 'vitreous://settings') return '•';
    if (u === 'vitreous://blank') return '○';
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
  const WALL_KEY = KEY + '.wall';
  const isHex = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
  const clampN = (v, [lo, hi]) => Math.min(hi, Math.max(lo, Number.isFinite(+v) ? +v : lo));
  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

  /* turn any untrusted object (storage, imported file) into valid settings */
  function sanitize(src) {
    src = src && typeof src === 'object' ? src : {};
    const out = clone(DEFAULTS);
    for (const k of Object.keys(DEFAULTS)) {
      const d = DEFAULTS[k], v = src[k];
      if (v === undefined) continue;
      if (typeof d === 'boolean') { if (typeof v === 'boolean') out[k] = v; }
      else if (typeof d === 'number') { if (RANGES[k]) out[k] = clampN(v, RANGES[k]); }
      else if (typeof d === 'string') { if (ENUMS[k]) { if (ENUMS[k].includes(v)) out[k] = v; } else if (typeof v === 'string') out[k] = v.slice(0, k === 'css' ? 20000 : 200); }
    }
    out.accent = isHex(src.accent) ? src.accent : DEFAULTS.accent;
    out.aurora = typeof src.aurora === 'string' && Object.hasOwn(AURORA, src.aurora) ? src.aurora : DEFAULTS.aurora;
    if (out.homepage && !/^https?:\/\//i.test(out.homepage)) out.homepage = '';
    if (Array.isArray(src.auroraCustom) && src.auroraCustom.length === 3 && src.auroraCustom.every(isHex)) out.auroraCustom = src.auroraCustom.slice();
    if (/^https?:\/\//i.test(out.wallUrl) === false) out.wallUrl = '';
    if (Array.isArray(src.spaces)) {
      const seen = new Set();
      const sp = src.spaces.filter((x) => x && /^[\w-]{1,24}$/.test(x.id) && !seen.has(x.id) && seen.add(x.id))
        .slice(0, 8).map((x) => ({ id: x.id, name: str(x.name, 24) || 'Space', color: isHex(x.color) ? x.color : '#5aa9ff' }));
      if (sp.length) out.spaces = sp;
    }
    if (Array.isArray(src.bookmarks)) {
      out.bookmarks = src.bookmarks.filter((x) => x && typeof x.url === 'string' && /^https?:\/\//i.test(x.url)).slice(0, 24)
        .map((x) => ({ name: str(x.name, 40) || str(x.url, 40), url: x.url.slice(0, 500) }));
    }
    if (Array.isArray(src.engines)) {
      out.engines = src.engines.filter((x) => x && /^[\w-]{1,24}$/.test(x.id) && !(x.id in ENGINES) && /^https?:\/\//i.test(String(x.url)))
        .slice(0, 10).map((x) => ({ id: x.id, name: str(x.name, 30) || 'Custom', url: x.url.slice(0, 400) }));
    }
    const allE = { ...ENGINES }; out.engines.forEach((e) => { allE[e.id] = 1; });
    if (!allE[out.search]) out.search = typeof src.search === 'string' && allE[src.search] ? src.search : 'ddg';
    if (src.keys && typeof src.keys === 'object') {
      for (const id of Object.keys(DEFAULT_KEYS)) {
        const v = src.keys[id];
        if (v === '' || (typeof v === 'string' && /^((Ctrl|Alt|Shift)\+)+[A-Za-z0-9]+$/.test(v) && /(Ctrl|Alt)\+/.test(v))) out.keys[id] = v;
      }
    }
    return out;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ S, tabs, activeId, ws })); } catch { /* storage unavailable */ }
  }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!raw) return;
      S = sanitize(raw.S);
      if (S.spaces.some((x) => x.id === raw.ws)) ws = raw.ws; else ws = S.spaces[0].id;
      if (Array.isArray(raw.tabs)) {
        tabs = raw.tabs
          .filter((t) => t && Array.isArray(t.hist) && t.hist.length && S.spaces.some((x) => x.id === t.ws))
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
  const newTabUrl = () => (S.newTabMode === 'blank' ? 'vitreous://blank' : S.newTabMode === 'home' && S.homepage ? S.homepage : 'vitreous://newtab');
  function newTab(url = newTabUrl(), space = ws) {
    const t = { id: uid(), ws: space, hist: [normalize(url)], i: 0, reload: 0 };
    tabs.push(t);
    ws = space;
    activeId = t.id;
    render();
    if (['vitreous://newtab', 'vitreous://blank'].includes(urlOf(t))) focusAddr();
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
      else { newTab(undefined, t.ws); return; }
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
    else { newTab(undefined, id); return; }
    render();
  }

  /* ---------- appearance ---------- */
  function apply() {
    const b = document.body;
    const dark = S.theme === 'auto' ? matchMedia('(prefers-color-scheme: dark)').matches : S.theme !== 'light';
    b.dataset.theme = dark ? 'dark' : 'light';
    b.dataset.oled = S.theme === 'midnight' ? '1' : '0';
    b.dataset.motion = S.motion ? 'on' : 'off';
    b.dataset.fx = S.lowfx ? 'low' : 'high';
    b.dataset.side = S.sideSide;
    b.dataset.hover = S.hoverExpand ? '1' : '0';
    b.dataset.navbtns = S.navBtns ? '1' : '0';
    b.dataset.shield = S.shield ? '1' : '0';
    b.dataset.lock = S.lock ? '1' : '0';
    b.dataset.home = S.showHome ? '1' : '0';
    b.dataset.addralign = S.addrAlign;
    b.dataset.favs = S.favs ? '1' : '0';
    b.dataset.close = S.closeBtn;
    b.dataset.tabshape = S.tabShape;
    b.dataset.blobsStill = S.blobSpeed === 0 ? '1' : '0';
    const wall = S.wallMode === 'url' ? S.wallUrl : S.wallMode === 'upload' ? wallData() : '';
    b.dataset.wall = wall ? '1' : '0';
    $('#wall').style.backgroundImage = wall ? `url("${wall.replace(/["\\\n\r]/g, (c) => encodeURIComponent(c))}")` : '';
    const r = document.documentElement.style;
    r.setProperty('--accent', S.accent);
    r.setProperty('--blur', S.blur + 'px');
    r.setProperty('--tint', String(S.tint / 100));
    r.setProperty('--radius', S.radius + 'px');
    r.setProperty('--sat', S.saturate + '%');
    r.setProperty('--rim-a', String(S.rim / 100));
    r.setProperty('--shadow-a', String(S.shadow / 100));
    r.setProperty('--bw', S.border + 'px');
    r.setProperty('--fs', String(S.fontScale / 100));
    r.setProperty('--gap', S.gap + 'px');
    r.setProperty('--icon', S.iconSize + 'px');
    r.setProperty('--stroke', String(S.iconStroke / 10));
    r.setProperty('--tab-h', DENSITY[S.density] + 'px');
    r.setProperty('--tab-w', S.tabWidth + 'px');
    r.setProperty('--side-w', S.sideWidth + 'px');
    r.setProperty('--addr-w', S.addrWidth + 'px');
    r.setProperty('--addr-r', S.addrShape === 'pill' ? '999px' : S.addrShape === 'round' ? '14px' : '4px');
    r.setProperty('--tile-w', S.tileSize + 'px');
    r.setProperty('--blob-mul', String(S.blobs / 100));
    r.setProperty('--blob-dur', (S.blobSpeed ? 26 * 100 / S.blobSpeed : 26) + 's');
    r.setProperty('--wall-blur', S.wallBlur + 'px');
    r.setProperty('--wall-dim', String(S.wallDim / 100));
    const fam = S.font === 'custom' && S.fontCustom.trim()
      ? `"${S.fontCustom.trim().replace(/["\;{}<>]/g, '')}", ${FONTS.system}` : FONTS[S.font] || FONTS.system;
    r.setProperty('--font', fam);
    const [a, c, d] = auroraOf();
    r.setProperty('--b1', a); r.setProperty('--b2', c); r.setProperty('--b3', d);
    $('#main').dataset.tabs = S.tabs;
    $('#sidebar').dataset.hideTabs = S.tabs === 'top' ? '1' : '0';
    $('#sideWrap').dataset.rail = S.tabs === 'top' || S.collapsed ? '1' : '0';
    const bn = $('.brand-name'); if (bn.textContent !== S.brand) bn.textContent = S.brand;
    $('#userCss').textContent = S.css;
    placeIndicators();
    setTimeout(placeIndicators, 60);
  }
  /* uploaded wallpaper lives in its own storage slot so settings stay small */
  let wallCache = null;
  function wallData() { if (wallCache === null) { try { wallCache = localStorage.getItem(WALL_KEY) || ''; } catch { wallCache = ''; } } return wallCache; }
  function setWall(dataUrl) { wallCache = dataUrl; try { dataUrl ? localStorage.setItem(WALL_KEY, dataUrl) : localStorage.removeItem(WALL_KEY); } catch { toast('Image too large to store'); wallCache = ''; return false; } return true; }
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
      ind.style.width = act.offsetWidth + 'px';
      ind.style.height = act.offsetHeight + 'px';
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
    else if (u === 'vitreous://blank') { v.append(h('div', { class: 'page' })); setTimeout(loadEnd, 120); }
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
  const pad2 = (x) => String(x).padStart(2, '0');
  function clockText() {
    const d = new Date(); let hr = d.getHours();
    if (S.clock24) return pad2(hr) + ':' + pad2(d.getMinutes());
    const ap = hr >= 12 ? ' PM' : ' AM'; hr = hr % 12 || 12;
    return hr + ':' + pad2(d.getMinutes()) + ap;
  }
  function greetText() {
    const hr = new Date().getHours();
    const g = hr < 5 ? 'Good night' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    return S.userName.trim() ? g + ', ' + S.userName.trim() : g;
  }
  function startPage() {
    const input = h('input', {
      type: 'text', placeholder: 'Search or enter address', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Search',
      onkeydown: (e) => { if (e.key === 'Enter' && input.value.trim()) navigate(cur(), input.value); },
    });
    let n = 0;
    const rise = (cls = '') => ({ class: ('rise ' + cls).trim(), style: `--i:${n++}` });
    const kids = [];
    if (S.startGreeting) kids.push(h('p', { ...rise('greeting'), text: greetText() }));
    if (S.startClock) {
      const c = h('div', { ...rise('clock'), text: clockText() });
      const iv = setInterval(() => { if (!c.isConnected) clearInterval(iv); else c.textContent = clockText(); }, 5000);
      kids.push(c);
    }
    if (S.startLogo) kids.push(h('img', { ...rise(), src: 'assets/vitreous-mark.svg', alt: 'Vitreous' }));
    if (S.startTitle.trim()) kids.push(h('h1', { ...rise(), text: S.startTitle }));
    if (S.startSearch) kids.push(h('label', rise('address'), input));
    if (S.startTiles && S.bookmarks.length) {
      kids.push(h('div', { class: 'tiles' }, S.bookmarks.map((b) => h('button', { ...rise('tile'), onclick: () => navigate(cur(), b.url) },
        h('span', { class: 'fav', text: (b.name[0] || '?').toUpperCase(), 'aria-hidden': 'true' }), b.name))));
    }
    if (S.startHint) {
      kids.push(h('p', rise('hint'), h('kbd', { text: keyText(S.keys.palette) }), ' palette  ·  ', h('kbd', { text: keyText(S.keys.newTab) }), ' new tab  ·  ', h('kbd', { text: keyText(S.keys.sidebar) }), ' sidebar'));
    }
    return h('div', { class: 'page' }, h('div', { class: 'start' }, kids));
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
  function toggle(key, after) {
    const s = h('button', {
      class: 'switch', role: 'switch', 'aria-checked': String(!!S[key]),
      onclick: () => { set(key, !S[key]); s.setAttribute('aria-checked', String(!!S[key])); after && after(); },
    });
    return s;
  }
  function range(key, min, max, fmt, step = 1) {
    const f = typeof fmt === 'function' ? fmt : (v) => v + fmt;
    const out = h('span', { text: f(S[key]), style: 'min-width:52px;text-align:right;color:var(--muted);font-size:13px' });
    const r = h('input', {
      type: 'range', min, max, step, value: S[key], 'aria-label': key,
      oninput: () => { set(key, +r.value); out.textContent = f(+r.value); },
    });
    return h('div', { style: 'display:flex;align-items:center;gap:12px' }, r, out);
  }
  function swatches(items, key, bg, extraFn) {
    const wrap = h('div', { class: 'swatches' });
    const mark = () => wrap.querySelectorAll('.sw').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.val === String(S[key]))));
    items.forEach((val) => {
      wrap.append(h('button', {
        class: 'sw', style: `background:${bg(val)}`, 'data-val': String(val), 'aria-label': String(val), 'aria-pressed': String(S[key] === val),
        onclick: () => { set(key, val); mark(); },
      }));
    });
    wrap.mark = mark;
    if (extraFn) wrap.append(extraFn(mark));
    return wrap;
  }
  function colorInput(get, put, label) {
    const i = h('input', { type: 'color', value: get(), 'aria-label': label, oninput: () => put(i.value) });
    return i;
  }
  function text(key, ph, width, max = 60, after) {
    const i = h('input', {
      type: 'text', value: S[key], placeholder: ph || '', maxlength: max, spellcheck: 'false', 'aria-label': key,
      oninput: () => { set(key, i.value); after && after(); },
    });
    if (width) i.style.width = width;
    return i;
  }
  const btn = (label, fn, cls = '') => h('button', { class: 'btn ' + cls, text: label, onclick: fn });
  const row = (label, sub, control, cls = '') => h('div', { class: 'row ' + cls }, h('div', {}, label, sub ? h('small', { text: sub }) : null), control);
  const group = (id, title, i, ...kids) => h('div', { class: 'group rise', style: `--i:${Math.min(i, 5)}`, id: 'grp-' + id }, h('h3', { text: title }), ...kids);

  /* ----- settings: replace everything in one go (import / reset) ----- */
  function replaceSettings(next) {
    S = next;
    const fb = S.spaces[0].id;
    tabs.forEach((t) => { if (!S.spaces.some((x) => x.id === t.ws)) t.ws = fb; });
    if (!S.spaces.some((x) => x.id === ws)) ws = fb;
    const g = wsTabs();
    if (!g.some((t) => t.id === activeId)) { if (g.length) activeId = g[0].id; else { newTab(undefined, ws); } }
    wallCache = null;
    buildSpaces(); apply(); viewKey = ''; render();
  }
  function exportSettings() {
    const blob = new Blob([JSON.stringify({ vitreous: 2, settings: S }, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'vitreous-settings.json' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }
  function importSettings(file) {
    if (!file) return;
    if (file.size > 2e6) { toast('That file is too large'); return; }
    file.text().then((t) => {
      let o; try { o = JSON.parse(t); } catch { toast('Not a valid settings file'); return; }
      const next = sanitize(o && o.settings ? o.settings : o);
      if (next.css.trim() && !confirm('This file includes custom CSS that will run in the browser UI. Only continue if you trust where it came from.')) return;
      replaceSettings(next); toast('Settings imported');
    });
  }
  function uploadWallpaper(file) {
    if (!file || !/^image\//.test(file.type)) { toast('Choose an image file'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1920 / Math.max(img.width, img.height));
      const c = h('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      if (setWall(c.toDataURL('image/jpeg', 0.82))) { set('wallMode', 'upload'); toast('Wallpaper set'); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('Could not read that image'); };
    img.src = url;
  }

  function filterSettings(root, q) {
    q = q.trim().toLowerCase();
    let any = false;
    root.querySelectorAll('.group').forEach((g) => {
      const titleHit = !q || g.querySelector('h3').textContent.toLowerCase().includes(q);
      let vis = 0;
      g.querySelectorAll('.row, .ed, .warn').forEach((r) => {
        const m = titleHit || r.textContent.toLowerCase().includes(q);
        r.classList.toggle('hidden-row', !m);
        if (m) vis++;
      });
      g.classList.toggle('hidden-row', vis === 0);
      if (vis) any = true;
    });
    $('.nores', root).hidden = any;
  }

  function settingsPage() {
    let gi = 0;

    /* engines */
    const engineBox = h('div'), engineEd = h('div', { class: 'ed' });
    const drawEngines = () => {
      const sel = h('select', { 'aria-label': 'Search engine', onchange: () => set('search', sel.value) },
        Object.entries(allEngines()).map(([k, v]) => h('option', { value: k, text: v[0], selected: S.search === k })));
      engineBox.replaceChildren(row('Search engine', 'Used by the address bar and start page', sel));
      engineEd.replaceChildren(
        ...S.engines.map((e) => h('div', { class: 'er' }, h('span', { text: e.name, style: 'width:110px;font-size:13px' }), h('span', { text: e.url, style: 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:12px' }),
          btn('Remove', () => { S.engines = S.engines.filter((x) => x.id !== e.id); if (S.search === e.id) S.search = 'ddg'; save(); drawEngines(); }, 'danger'))),
        (() => {
          const n = h('input', { type: 'text', placeholder: 'Name', maxlength: 30, style: 'width:120px;flex:none' });
          const u = h('input', { type: 'text', placeholder: 'https://example.com/search?q=%s', maxlength: 400, spellcheck: 'false' });
          return h('div', { class: 'er' }, n, u, btn('Add engine', () => {
            if (!n.value.trim() || !/^https?:\/\//i.test(u.value.trim())) { toast('Enter a name and an http(s) URL (use %s for the query)'); return; }
            if (S.engines.length >= 10) { toast('Limit of 10 custom engines'); return; }
            S.engines.push({ id: 'e' + uid(), name: n.value.trim(), url: u.value.trim() }); save(); drawEngines();
          }));
        })());
    };

    /* bookmarks */
    const bmBox = h('div', { class: 'ed' });
    const drawBm = () => {
      bmBox.replaceChildren(...S.bookmarks.map((b, i) => {
        const n = h('input', { type: 'text', value: b.name, maxlength: 40, 'aria-label': 'Name', style: 'max-width:170px', oninput: () => { b.name = n.value; save(); } });
        const u = h('input', {
          type: 'url', value: b.url, maxlength: 500, 'aria-label': 'URL', spellcheck: 'false',
          onchange: () => { let v = u.value.trim(); if (!/^https?:\/\//i.test(v)) v = 'https://' + v; try { b.url = new URL(v).href; save(); } catch { toast('That is not a valid URL'); } u.value = b.url; },
        });
        const mv = (d) => () => { const j = i + d; if (j < 0 || j >= S.bookmarks.length) return; [S.bookmarks[i], S.bookmarks[j]] = [S.bookmarks[j], S.bookmarks[i]]; save(); drawBm(); };
        return h('div', { class: 'er' }, n, u, btn('↑', mv(-1)), btn('↓', mv(1)), btn('Remove', () => { S.bookmarks.splice(i, 1); save(); drawBm(); }, 'danger'));
      }), h('div', { class: 'btns' }, btn('Add bookmark', () => {
        if (S.bookmarks.length >= 24) { toast('Limit of 24 bookmarks'); return; }
        S.bookmarks.push({ name: 'New bookmark', url: 'https://example.com' }); save(); drawBm();
      }), btn('Restore defaults', () => { S.bookmarks = clone(DEFAULT_BOOKMARKS); save(); drawBm(); })));
    };

    /* spaces */
    const spBox = h('div', { class: 'ed' });
    const drawSpaces = () => {
      spBox.replaceChildren(...S.spaces.map((sp) => {
        const c = h('input', { type: 'color', value: sp.color, 'aria-label': 'Color', oninput: () => { sp.color = c.value; buildSpaces(); save(); } });
        const n = h('input', { type: 'text', value: sp.name, maxlength: 24, 'aria-label': 'Name', oninput: () => { sp.name = n.value || 'Space'; buildSpaces(); save(); } });
        return h('div', { class: 'er' }, c, n, btn('Delete', () => {
          if (S.spaces.length < 2) { toast('Keep at least one space'); return; }
          if (!confirm(`Delete “${sp.name}”? Its tabs move to another space.`)) return;
          const fb = S.spaces.find((x) => x.id !== sp.id).id;
          tabs.forEach((t) => { if (t.ws === sp.id) t.ws = fb; });
          S.spaces = S.spaces.filter((x) => x.id !== sp.id);
          if (ws === sp.id) ws = fb;
          const g = wsTabs(); if (!g.some((t) => t.id === activeId) && g.length) activeId = g[0].id;
          buildSpaces(); drawSpaces(); render();
        }, 'danger'));
      }), h('div', { class: 'btns' }, btn('Add space', () => {
        if (S.spaces.length >= 8) { toast('Limit of 8 spaces'); return; }
        S.spaces.push({ id: 's' + uid(), name: 'New space', color: ACCENTS[S.spaces.length % ACCENTS.length] });
        buildSpaces(); save(); drawSpaces();
      })));
    };

    /* shortcuts */
    const keyBox = h('div');
    const drawKeys = () => {
      keyBox.replaceChildren(...actions().map(([id, label]) => {
        const b = h('button', { class: 'keybtn', text: keyText(S.keys[id]) });
        b.addEventListener('click', () => {
          if (recording) return;
          recording = true; b.classList.add('rec'); b.textContent = 'Press keys…  Esc cancels, ⌫ clears';
          const done = () => { if (!recording) return; recording = false; removeEventListener('keydown', on, true); b.removeEventListener('blur', done); b.classList.remove('rec'); b.textContent = keyText(S.keys[id]); };
          const on = (e) => {
            if (/^(Control|Alt|Shift|Meta)(Left|Right)$/.test(e.code)) return;
            e.preventDefault(); e.stopPropagation();
            if (e.key === 'Escape') { done(); return; }
            if (e.key === 'Backspace' || e.key === 'Delete') { S.keys[id] = ''; save(); done(); return; }
            const c = combo(e);
            if (!c) { toast('Include Ctrl or Alt'); return; }
            Object.keys(S.keys).forEach((k) => { if (k !== id && S.keys[k] === c) { S.keys[k] = ''; toast('Moved from “' + (actions().find((a) => a[0] === k) || [0, k])[1] + '”'); } });
            S.keys[id] = c; save(); done(); drawKeys();
          };
          addEventListener('keydown', on, true);
          b.addEventListener('blur', done);
        });
        return h('div', { class: 'row' }, h('div', { text: label }), b);
      }), h('div', { class: 'row' }, h('div', { text: 'Reset all shortcuts' }), btn('Reset', () => { S.keys = { ...DEFAULT_KEYS }; save(); drawKeys(); })));
    };

    const wallFile = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: () => { uploadWallpaper(wallFile.files[0]); wallFile.value = ''; } });
    const importFile = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: () => { importSettings(importFile.files[0]); importFile.value = ''; } });
    const css = h('textarea', { spellcheck: 'false', 'aria-label': 'Custom CSS', placeholder: '/* Style any part of the interface, e.g. */\n.sidebar { border-radius: 8px; }', text: S.css, oninput: () => set('css', css.value.slice(0, 20000)) });

    const search = h('input', { type: 'search', placeholder: 'Search settings', 'aria-label': 'Search settings' });
    const groups = [['appearance', 'Appearance'], ['wallpaper', 'Wallpaper'], ['glass', 'Glass'], ['type', 'Typography'], ['layout', 'Layout'], ['tabs', 'Tabs'], ['toolbar', 'Toolbar'], ['spaces', 'Spaces'], ['start', 'Start page'], ['search', 'Search & behavior'], ['privacy', 'Privacy'], ['shortcuts', 'Shortcuts'], ['advanced', 'Advanced']];
    const goto = (id) => { const g = document.getElementById('grp-' + id); g && g.scrollIntoView({ behavior: motionOn() ? 'smooth' : 'auto', block: 'start' }); };

    drawEngines(); drawBm(); drawSpaces(); drawKeys();
    const auroraSw = swatches(Object.keys(AURORA), 'aurora', (k) => (k === 'custom' ? 'conic-gradient(#ff5e62, #ffd93b, #2fd180, #2b7fff, #b57bff, #ff5e62)' : `linear-gradient(135deg, ${AURORA[k].join(',')})`));

    const page = h('div', { class: 'settings' },
      h('h2', { class: 'rise', style: '--i:0', text: 'Settings' }),
      h('p', { class: 'rise', style: '--i:1', text: 'Every surface of Vitreous is adjustable. Changes apply instantly.' }),
      h('div', { class: 'set-tools' }, search, h('div', { class: 'chips' }, groups.map(([id, t]) => h('button', { text: t, onclick: () => goto(id) })))),

      group('appearance', 'Appearance', gi++,
        row('Theme', 'Midnight is true black for OLED screens', seg([['dark', 'Dark'], ['light', 'Light'], ['midnight', 'Midnight'], ['auto', 'Auto']], 'theme')),
        row('Accent', 'Pick a preset or any color', swatches(ACCENTS, 'accent', (c) => c, (mark) => colorInput(() => S.accent, (v) => { set('accent', v); mark(); }, 'Custom accent'))),
        row('Background glow', 'Colors of the soft light behind the glass', auroraSw),
        row('Custom glow colors', 'Choosing a color switches the glow to Custom', h('div', { style: 'display:flex;gap:8px' }, [0, 1, 2].map((i) => colorInput(() => S.auroraCustom[i], (v) => { S.auroraCustom[i] = v; set('aurora', 'custom'); auroraSw.mark(); }, 'Glow color ' + (i + 1))))),
        row('Glow intensity', null, range('blobs', 0, 150, '%')),
        row('Glow drift speed', '0% freezes the glow', range('blobSpeed', 0, 300, '%')),
        row('Browser name', 'Shown at the top of the sidebar', text('brand', 'vitreous', '180px', 24))),

      group('wallpaper', 'Wallpaper', gi++,
        row('Wallpaper', 'Sits behind the glass and glow', seg([['none', 'None'], ['url', 'Image URL'], ['upload', 'Upload']], 'wallMode')),
        row('Image URL', 'https links only', h('input', { type: 'text', value: S.wallUrl, placeholder: 'https://…/photo.jpg', spellcheck: 'false', maxlength: 400, 'aria-label': 'Wallpaper URL', oninput: function () { if (/^https?:\/\//i.test(this.value.trim()) || !this.value.trim()) { S.wallUrl = this.value.trim(); if (S.wallUrl) S.wallMode = 'url'; apply(); save(); } } })),
        row('Upload image', 'Stored on this device only, scaled to fit', h('div', { class: 'btns' }, wallFile, btn('Choose image…', () => wallFile.click()), btn('Remove', () => { setWall(''); if (S.wallMode === 'upload') set('wallMode', 'none'); toast('Wallpaper removed'); }, 'danger'))),
        row('Dim', null, range('wallDim', 0, 85, '%')),
        row('Blur', null, range('wallBlur', 0, 40, 'px'))),

      group('glass', 'Glass', gi++,
        row('Glass blur', null, range('blur', 0, 60, 'px')),
        row('Glass tint', null, range('tint', 2, 40, '%')),
        row('Saturation', 'How vivid the background looks through glass', range('saturate', 100, 260, '%')),
        row('Edge highlight', null, range('rim', 0, 100, '%')),
        row('Shadow strength', null, range('shadow', 0, 100, '%')),
        row('Border width', null, range('border', 0, 3, 'px')),
        row('Corner radius', null, range('radius', 4, 36, 'px')),
        row('Animations', 'Background drift, transitions and effects', toggle('motion')),
        row('Low-power glass', 'Turns off blur for older GPUs and battery saving', toggle('lowfx'))),

      group('type', 'Typography', gi++,
        row('Font', null, (() => { const s = h('select', { 'aria-label': 'Font', onchange: () => set('font', s.value) }, [['system', 'Default (Inter / system)'], ['inter', 'Inter'], ['serif', 'Serif'], ['mono', 'Monospace'], ['rounded', 'Rounded'], ['custom', 'Custom…']].map(([v, l]) => h('option', { value: v, text: l, selected: S.font === v }))); return s; })()),
        row('Custom font name', 'Any font installed on your device. Pick “Custom…” above', text('fontCustom', 'e.g. Fira Sans', '200px', 60, () => { if (S.fontCustom.trim() && S.font !== 'custom') set('font', 'custom'); })),
        row('Interface size', 'Scales the whole interface', range('fontScale', 80, 140, '%'))),

      group('layout', 'Layout', gi++,
        row('Density', 'Height of tabs and rows', seg([['compact', 'Compact'], ['cozy', 'Cozy'], ['roomy', 'Roomy']], 'density')),
        row('Spacing', 'Gap between panels', range('gap', 0, 18, 'px')),
        row('Icon size', null, range('iconSize', 14, 26, 'px')),
        row('Icon stroke', null, range('iconStroke', 10, 30, (v) => (v / 10).toFixed(1), 1)),
        row('Tab layout', 'Vertical tabs live in the sidebar', seg([['side', 'Side'], ['top', 'Top']], 'tabs')),
        row('Sidebar', 'Compact shows icons and expands on hover', seg([[false, 'Pinned'], [true, 'Compact']], 'collapsed')),
        row('Expand compact sidebar on hover', null, toggle('hoverExpand')),
        row('Sidebar width', null, range('sideWidth', 200, 380, 'px')),
        row('Sidebar side', null, seg([['left', 'Left'], ['right', 'Right']], 'sideSide'))),

      group('tabs', 'Tabs', gi++,
        row('Tab style', null, seg([['round', 'Rounded'], ['flat', 'Flat'], ['underline', 'Underline']], 'tabShape')),
        row('Top tab width', 'Applies when tabs are on top', range('tabWidth', 110, 320, 'px')),
        row('Show favicons', null, toggle('favs')),
        row('Close button', null, seg([['hover', 'On hover'], ['always', 'Always'], ['never', 'Hidden']], 'closeBtn'))),

      group('toolbar', 'Toolbar & address bar', gi++,
        row('Back, forward and reload buttons', null, toggle('navBtns')),
        row('Home button', 'Opens your homepage, or the start page', toggle('showHome')),
        row('Privacy shield button', null, toggle('shield')),
        row('Lock icon in address bar', null, toggle('lock')),
        row('Address bar width', null, range('addrWidth', 360, 1100, 'px')),
        row('Address bar shape', null, seg([['pill', 'Pill'], ['round', 'Rounded'], ['square', 'Square']], 'addrShape')),
        row('Address text', null, seg([['center', 'Centered'], ['left', 'Left']], 'addrAlign'))),

      group('spaces', 'Spaces', gi++, spBox),

      group('start', 'Start page', gi++,
        row('Logo', null, toggle('startLogo')),
        row('Title', 'Leave empty to hide', text('startTitle', 'vitreous', '200px', 40)),
        row('Greeting', null, toggle('startGreeting')),
        row('Your name', 'Used in the greeting', text('userName', 'Optional', '180px', 30)),
        row('Clock', null, toggle('startClock')),
        row('24-hour clock', null, toggle('clock24')),
        row('Search box', null, toggle('startSearch')),
        row('Bookmark tiles', null, toggle('startTiles')),
        row('Tile size', null, range('tileSize', 80, 160, 'px')),
        row('Shortcut hint', null, toggle('startHint')),
        h('div', { class: 'row' }, h('div', {}, 'Bookmarks', h('small', { text: 'Shown as tiles and in the command palette' }))),
        bmBox),

      group('search', 'Search & behavior', gi++,
        engineBox, engineEd,
        row('New tabs open', null, seg([['start', 'Start page'], ['blank', 'Blank'], ['home', 'Homepage']], 'newTabMode')),
        row('Homepage', 'http(s) address, used by the home button and new tabs', (() => {
          const i = h('input', { type: 'text', value: S.homepage, placeholder: 'https://…', spellcheck: 'false', maxlength: 300, 'aria-label': 'Homepage',
            onchange: () => { let v = i.value.trim(); if (v && !/^https?:\/\//i.test(v)) v = 'https://' + v; try { if (v) v = new URL(v).href; set('homepage', v); } catch { toast('That is not a valid URL'); } i.value = S.homepage; } });
          return i;
        })())),

      group('privacy', 'Privacy', gi++,
        row('Block trackers and ads', null, toggle('trackers')),
        row('HTTPS-only', 'Upgrade http:// addresses to https://', toggle('https')),
        row('Fingerprint resistance', null, toggle('fingerprint')),
        row('Send Do Not Track', null, toggle('dnt')),
        h('div', { class: 'warn', text: 'Prototype note: HTTPS-only and the search engine already work. Tracker blocking, fingerprint resistance and Do Not Track switch on once the engine layer is connected.' })),

      group('shortcuts', 'Shortcuts', gi++, h('div', { class: 'warn', text: 'Click a shortcut, then press the new keys. Shortcuts need Ctrl or Alt.' }), keyBox),

      group('advanced', 'Advanced', gi++,
        h('div', { class: 'row col' }, h('div', {}, 'Custom CSS', h('small', { text: 'Applied on top of everything else. Variables like --accent, --radius and --blur are available.' })), css),
        row('Back up settings', 'Export to a file, or load one from another device', h('div', { class: 'btns' }, importFile, btn('Export', exportSettings), btn('Import…', () => importFile.click()))),
        row('Reset all settings', 'Restores every default. Tabs stay open', btn('Reset…', () => { if (confirm('Reset every setting to its default?')) { setWall(''); replaceSettings(clone(DEFAULTS)); toast('Settings reset'); } }, 'danger'))),

      h('div', { class: 'nores', hidden: true, text: 'No settings match your search.' }));

    search.addEventListener('input', () => filterSettings(page, search.value));
    return h('div', { class: 'page' }, page);
  }

  /* ---------- palette ---------- */
  const pal = $('#pal'), palInput = $('#palInput'), palList = $('#palList');
  let palItems = [], palSel = 0;

  function commands() {
    const c = actions().map(([id, label, fn]) => [label, S.keys[id] ? keyText(S.keys[id]) : '', fn]);
    c.push(
      ['Toggle animations', '', () => set('motion', !S.motion)],
      ['Toggle low-power glass', '', () => set('lowfx', !S.lowfx)],
      ['Toggle top / side tab layout', '', () => set('tabs', S.tabs === 'top' ? 'side' : 'top')],
      ['Export settings', '', () => { openSettings('grp-advanced'); }],
    );
    S.spaces.forEach((s) => c.push(['Space: ' + s.name, 'space', () => switchSpace(s.id)]));
    S.bookmarks.forEach((b) => c.push(['Open: ' + b.name, 'bookmark', () => navigate(cur(), b.url)]));
    tabs.forEach((t) => c.push(['Tab: ' + titleOf(t), (S.spaces.find((s) => s.id === t.ws) || S.spaces[0]).name, () => activate(t.id)]));
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
  function goHome() { navigate(cur(), S.homepage || 'vitreous://newtab'); }
  function stepTab(d) {
    const g = wsTabs(); if (g.length < 2) return;
    const i = g.findIndex((t) => t.id === activeId);
    activate(g[(i + d + g.length) % g.length].id);
  }
  let toastT = 0;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ---------- rebindable shortcuts ---------- */
  let recording = false;
  const actions = () => [
    ['newTab', 'New tab', () => newTab()],
    ['closeTab', 'Close tab', () => closeTab(activeId)],
    ['focusAddr', 'Focus address bar', focusAddr],
    ['sidebar', 'Compact / pin sidebar', toggleSidebar],
    ['settings', 'Open settings', () => openSettings()],
    ['palette', 'Command palette', () => (pal.classList.contains('open') ? closePal() : openPal())],
    ['reload', 'Reload', () => { cur().reload++; render(); }],
    ['back', 'Back', () => go(-1)],
    ['forward', 'Forward', () => go(1)],
    ['nextTab', 'Next tab', () => stepTab(1)],
    ['prevTab', 'Previous tab', () => stepTab(-1)],
    ['home', 'Go home', goHome],
    ['theme', 'Toggle dark / light', () => set('theme', document.body.dataset.theme === 'dark' ? 'light' : 'dark')],
    ['layout', 'Toggle tab layout (side / top)', () => set('tabs', S.tabs === 'top' ? 'side' : 'top')],
  ];
  const KEYNAMES = { Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
  const keyText = (c) => (c ? c.split('+').map((p) => KEYNAMES[p] || p.replace(/^Key|^Digit/, '')).join(' ') : 'Unbound');
  function combo(e) {
    if (/^(Control|Alt|Shift|Meta)(Left|Right)$/.test(e.code)) return '';
    if (!(e.ctrlKey || e.metaKey || e.altKey)) return '';
    return [e.ctrlKey || e.metaKey ? 'Ctrl' : '', e.altKey ? 'Alt' : '', e.shiftKey ? 'Shift' : '', e.code].filter(Boolean).join('+');
  }
  function openSettings(anchor) {
    const t = cur();
    if (urlOf(t) !== 'vitreous://settings') navigate(t, 'vitreous://settings');
    if (typeof anchor === 'string') setTimeout(() => { const g = document.getElementById(anchor); g && g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
  }

  /* ---------- wiring ---------- */
  function buildSpaces() {
    $('#spaces').replaceChildren(...S.spaces.map((sp) => h('button', {
      class: 'space', 'data-id': sp.id, title: sp.name, 'aria-pressed': String(sp.id === ws), onclick: () => switchSpace(sp.id),
    }, h('span', { class: 'dot', style: `background:${sp.color};color:${sp.color}` }), h('span', { class: 'sl', text: sp.name }))));
  }

  $('#newTab').addEventListener('click', () => newTab());
  $('#sideNewTab').addEventListener('click', () => newTab());
  $('#back').addEventListener('click', () => go(-1));
  $('#forward').addEventListener('click', () => go(1));
  $('#reload').addEventListener('click', () => { cur().reload++; render(); });
  $('#home').addEventListener('click', goHome);
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
    if (recording) return;
    if (e.key === 'Escape' && pal.classList.contains('open')) { closePal(); return; }
    const c = combo(e);
    if (!c) return;
    const hit = actions().find(([id]) => S.keys[id] && S.keys[id] === c);
    if (hit) { e.preventDefault(); hit[2](); }
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
  buildSpaces();
  apply();
  if (!tabs.length) tabs.push({ id: uid(), ws, hist: ['vitreous://newtab'], i: 0, reload: 0 });
  if (!tabs.some((t) => t.id === activeId)) { const g = wsTabs(); activeId = (g[0] || tabs[0]).id; ws = cur().ws; }
  render();
})();
