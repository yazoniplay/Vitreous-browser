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
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'Vitreous', url: 'https://github.com/yazoniplay/Vitreous-browser' },
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
    dynamicTheme: false, dynamicIntensity: 18,
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
    startClock: false, clock24: true, startGreeting: false, userName: '', tileSize: 108, startWidgets: true, siteIcons: true,
    bookmarks: DEFAULT_BOOKMARKS, spaces: DEFAULT_SPACES,
    /* behavior */
    search: 'ddg', engines: [], newTabMode: 'start', homepage: '',
    /* privacy */
    trackers: true, https: true, fingerprint: true, dnt: true,
    /* advanced */
    css: '', keys: DEFAULT_KEYS, widgets: [], commands: [],
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
    iconSize: [14, 26], iconStroke: [10, 30], sideWidth: [200, 380], tabWidth: [110, 320], addrWidth: [360, 1100], tileSize: [80, 160], fontScale: [50, 150], dynamicIntensity: [0, 30],
  };
  const FONTS = {
    system: 'Inter, "SF Pro Display", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
    inter: 'Inter, system-ui, sans-serif',
    serif: '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
    mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    rounded: 'ui-rounded, "SF Pro Rounded", "Varela Round", Nunito, system-ui, sans-serif',
  };
  const WIDGET_TYPES = {
    clock: ['Clock', 'clock'], calendar: ['Calendar', 'calendar'], notes: ['Notes', 'note'], todo: ['To-do', 'check'],
    countdown: ['Countdown', 'flag'], timer: ['Timer', 'timer'], weather: ['Weather', 'sun'],
  };
  const TOGGLES = [['motion', 'Animations'], ['lowfx', 'Low-Spec Mode'], ['collapsed', 'Compact sidebar'], ['hoverExpand', 'Expand sidebar on hover'],
    ['favs', 'Tab icons'], ['siteIcons', 'Site icons'], ['showHome', 'Home button'], ['shield', 'Privacy shield button'], ['startHint', 'Start page hint'], ['startWidgets', 'Start page widgets']];
  const CMD_KINDS = ['url', 'newtab', 'action', 'toggle'];
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
  const INTERNAL = ['vitreous://newtab', 'vitreous://settings', 'vitreous://blank', 'vitreous://error'];

  /* ---------- state ---------- */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let S = clone(DEFAULTS);
  let tabs = [];
  let activeId = null;
  let ws = 'personal';
  let viewKey = '';
  let loadTimer = 0;
  let hasSavedState = false;
  let autoLowSpecNotice = false;
  let engineThemeColor = '';
  let lastFailedUrl = '';

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
    if (u === 'vitreous://error') return 'Site unreachable';
    if (t.titleOverride) return t.titleOverride;
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
    const cleanUrl = (u) => (typeof u === 'string' && /^(https?:\/\/|vitreous:\/\/(newtab|settings))/i.test(u) ? u.slice(0, 500) : '');
    if (Array.isArray(src.widgets)) {
      const seenW = new Set();
      out.widgets = src.widgets.slice(0, 12).map((w) => {
        if (!w || !/^[\w-]{1,24}$/.test(w.id) || !(w.type in WIDGET_TYPES) || seenW.has(w.id)) return null;
        seenW.add(w.id);
        const d = w.data && typeof w.data === 'object' ? w.data : {}, o = widgetDefaults(w.type);
        if (w.type === 'notes') o.text = str(d.text, 5000);
        else if (w.type === 'todo' && Array.isArray(d.items)) o.items = d.items.slice(0, 50).filter((x) => x && typeof x.t === 'string').map((x) => ({ t: x.t.slice(0, 120), d: x.d === true }));
        else if (w.type === 'countdown') { o.label = str(d.label, 40); o.date = /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : ''; }
        else if (w.type === 'timer') { o.mins = Math.min(180, Math.max(1, Math.round(+d.mins) || 25)); o.left = Math.min(o.mins * 60, Math.max(0, +d.left || o.mins * 60)); }
        else if (w.type === 'weather') { o.place = str(d.place, 60); o.lat = clampN(d.lat, [-90, 90]); o.lon = clampN(d.lon, [-180, 180]); o.unit = d.unit === 'f' ? 'f' : 'c'; }
        return { id: w.id, type: w.type, data: o };
      }).filter(Boolean);
    }
    if (Array.isArray(src.commands)) {
      out.commands = src.commands.slice(0, 30).map((c) => {
        if (!c || !CMD_KINDS.includes(c.kind) || !/^[\w-]{1,24}$/.test(c.id)) return null;
        let t = '';
        if (c.kind === 'url' || c.kind === 'newtab') t = cleanUrl(c.target);
        else if (c.kind === 'action') t = c.target in DEFAULT_KEYS ? c.target : '';
        else t = TOGGLES.some((x) => x[0] === c.target) ? c.target : '';
        return t ? { id: c.id, name: str(c.name, 40) || 'Command', kind: c.kind, target: t } : null;
      }).filter(Boolean);
    }
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
      hasSavedState = true;
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
    t.titleOverride = '';
    t.errorMessage = '';
    if (u !== 'vitreous://error') lastFailedUrl = '';
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
    b.dataset.dynamicTheme = S.dynamicTheme ? '1' : '0';
    b.dataset.tabs = S.tabs;
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
    r.setProperty('--dynamic-color', engineThemeColor || S.accent);
    r.setProperty('--dynamic-intensity', String(S.dynamicTheme ? S.dynamicIntensity : 0));
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
    paintFav(ff, urlOf(t), letter);
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

  function errorPage() {
    const retry = () => {
      const target = lastFailedUrl || 'https://example.com';
      navigate(cur(), target);
    };
    return h('div', { class: 'error-page' },
      h('div', { class: 'error-mark' }, ico('cloud')),
      h('h1', { text: 'Site unreachable' }),
      h('p', { text: cur()?.errorMessage || 'Vitreous could not complete this navigation. Check the address or your connection, then try again.' }),
      h('div', { class: 'btns' }, btn('Retry', retry), btn('Back to start', () => navigate(cur(), 'vitreous://newtab'))));
  }

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
    else if (u === 'vitreous://error') { v.append(errorPage()); setTimeout(loadEnd, 160); }
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

  /* ---------- site icons ---------- */
  const badIcons = new Set();
  const hostOf = (u) => { try { return new URL(u).host; } catch { return ''; } };
  function paintFav(el, url, letter) {
    const bad = badIcons.has(hostOf(url));
    const key = [url, letter, S.siteIcons, bad].join('|');
    if (el.dataset.k === key) return;
    el.dataset.k = key;
    el.replaceChildren(); el.className = el.className.replace(/\b(has-img|has-ico|logo)\b/g, '').trim(); el.textContent = '';
    if (url === 'vitreous://settings') { el.classList.add('has-ico'); el.append(ico('gear')); return; }
    if (url === 'vitreous://blank') { el.classList.add('has-ico'); el.append(ico('circle')); return; }
    if (url === 'vitreous://newtab') { el.classList.add('has-img', 'logo'); el.append(h('img', { src: 'assets/vitreous-mark.svg', alt: '' })); return; }
    let src = '';
    try { const u = new URL(url); if (/^https?:$/.test(u.protocol)) src = u.origin + '/favicon.ico'; } catch { /* letter */ }
    if (S.siteIcons && src && !bad) {
      const img = h('img', { src, alt: '', referrerpolicy: 'no-referrer', loading: 'lazy' });
      img.addEventListener('error', () => { badIcons.add(hostOf(url)); el.dataset.k = ''; paintFav(el, url, letter); });
      img.addEventListener('load', () => { if (img.naturalWidth < 2) img.dispatchEvent(new Event('error')); });
      el.classList.add('has-img'); el.append(img);
      return;
    }
    el.textContent = letter;
  }

  /* ---------- widgets ---------- */
  const widgetDefaults = (t) => ({
    notes: { text: '' }, todo: { items: [] }, countdown: { label: '', date: '' }, timer: { mins: 25, left: 1500 },
    weather: { place: '', lat: 0, lon: 0, unit: 'c' },
  }[t] || {});
  const newWidget = (type) => ({ id: 'w' + uid(), type, data: widgetDefaults(type) });
  const timers = new Map(); /* id -> { running, end }, survives leaving the start page */
  const weatherCache = new Map();
  const WX = (code) => (code === 0 ? ['Clear', 'sun'] : code <= 2 ? ['Partly cloudy', 'partly'] : code === 3 ? ['Overcast', 'cloud']
    : code === 45 || code === 48 ? ['Fog', 'fog'] : (code >= 51 && code <= 67) || (code >= 80 && code <= 82) ? ['Rain', 'rain']
      : (code >= 71 && code <= 77) || code === 85 || code === 86 ? ['Snow', 'snow'] : code >= 95 ? ['Thunderstorm', 'storm'] : ['Cloudy', 'cloud']);
  const dayName = (iso) => { try { return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' }); } catch { return ''; } };

  function wClock() {
    const t = h('div', { class: 'w-big' }), d = h('div', { class: 'w-sub' });
    const tick = () => { t.textContent = clockText(); d.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }); };
    tick();
    const iv = setInterval(() => { if (!t.isConnected) clearInterval(iv); else tick(); }, 1000);
    return h('div', {}, t, d);
  }
  function wCalendar() {
    const ref = new Date(); ref.setDate(1);
    const title = h('strong'), grid = h('div', { class: 'cal-g' });
    const draw = () => {
      title.textContent = ref.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const first = (ref.getDay() + 6) % 7, dim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
      const now = new Date();
      const cells = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => h('span', { class: 'dow', text: x }));
      for (let i = 0; i < first; i++) cells.push(h('span'));
      for (let d = 1; d <= dim; d++) cells.push(h('span', { class: now.getDate() === d && now.getMonth() === ref.getMonth() && now.getFullYear() === ref.getFullYear() ? 'today' : '', text: String(d) }));
      grid.replaceChildren(...cells);
    };
    draw();
    const step = (n) => () => { ref.setMonth(ref.getMonth() + n); draw(); };
    return h('div', {}, h('div', { class: 'cal-h' }, title, h('span', { class: 'sp' }), ibtn('left', 'Previous month', step(-1)), ibtn('right', 'Next month', step(1))), grid);
  }
  function wNotes(w) {
    let t = 0;
    const ta = h('textarea', { class: 'w-notes', placeholder: 'Write something…', maxlength: 5000, 'aria-label': 'Notes', text: w.data.text, spellcheck: 'false',
      oninput: () => { w.data.text = ta.value; clearTimeout(t); t = setTimeout(save, 400); } });
    ta.addEventListener('blur', () => { clearTimeout(t); save(); });
    return ta;
  }
  function wTodo(w) {
    const list = h('div', { class: 'todo' });
    const draw = () => {
      list.replaceChildren(...w.data.items.map((it, i) => h('div', { class: 'todo-i' + (it.d ? ' done' : '') },
        h('button', { class: 'w-chk', 'aria-pressed': String(it.d), 'aria-label': 'Done', onclick: () => { it.d = !it.d; save(); draw(); } }, ico('check')),
        h('span', { text: it.t }),
        h('button', { class: 'x-mini', 'aria-label': 'Delete', title: 'Delete', onclick: () => { w.data.items.splice(i, 1); save(); draw(); } }, ico('x')))));
    };
    draw();
    const inp = h('input', { type: 'text', placeholder: 'Add a task', maxlength: 120, 'aria-label': 'New task',
      onkeydown: (e) => { if (e.key === 'Enter' && inp.value.trim()) { if (w.data.items.length >= 50) { toast('Limit of 50 tasks'); return; } w.data.items.push({ t: inp.value.trim(), d: false }); inp.value = ''; save(); draw(); } } });
    return h('div', { class: 'w-col' }, inp, list);
  }
  function wCountdown(w) {
    const out = h('div', { class: 'w-big' }), sub = h('div', { class: 'w-sub' });
    const show = () => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(w.data.date)) { out.textContent = '—'; sub.textContent = 'Pick a date'; return; }
      const days = Math.round((new Date(w.data.date + 'T00:00:00') - new Date(new Date().toDateString())) / 864e5);
      out.textContent = String(Math.abs(days));
      sub.textContent = (days === 0 ? 'Today' : (Math.abs(days) === 1 ? 'day' : 'days') + (days > 0 ? ' to go' : ' ago')) + (w.data.label ? ' · ' + w.data.label : '');
    };
    show();
    const lab = h('input', { type: 'text', value: w.data.label, placeholder: 'Event name', maxlength: 40, 'aria-label': 'Event name', oninput: () => { w.data.label = lab.value; save(); show(); } });
    const dt = h('input', { type: 'date', value: w.data.date, 'aria-label': 'Date', oninput: () => { w.data.date = dt.value; save(); show(); } });
    return h('div', { class: 'w-col' }, out, sub, lab, dt);
  }
  function wTimer(w) {
    const d = w.data, st = timers.get(w.id) || { running: false, end: 0 };
    timers.set(w.id, st);
    if (st.running) d.left = Math.max(0, (st.end - Date.now()) / 1000);
    if (st.running && d.left <= 0) st.running = false;
    const disp = h('div', { class: 'w-big' });
    const fmt = (s) => pad2(Math.floor(s / 60)) + ':' + pad2(Math.floor(s % 60));
    const show = () => { disp.textContent = fmt(Math.max(0, Math.ceil(d.left))); };
    const go = h('button', { class: 'btn' });
    const sync = () => { go.replaceChildren(ico(st.running ? 'pause' : 'play'), h('span', { text: st.running ? 'Pause' : 'Start' })); };
    show(); sync();
    go.addEventListener('click', () => {
      if (st.running) { st.running = false; d.left = Math.max(0, (st.end - Date.now()) / 1000); save(); }
      else { if (d.left <= 0) d.left = d.mins * 60; st.end = Date.now() + d.left * 1000; st.running = true; }
      sync(); show();
    });
    const iv = setInterval(() => {
      if (!disp.isConnected) { clearInterval(iv); return; }
      if (!st.running) return;
      d.left = Math.max(0, (st.end - Date.now()) / 1000); show();
      if (d.left <= 0) { st.running = false; sync(); save(); toast('Timer finished'); }
    }, 1000);
    const mins = h('input', { type: 'number', min: 1, max: 180, value: d.mins, 'aria-label': 'Minutes', style: 'width:70px',
      onchange: () => { d.mins = Math.min(180, Math.max(1, Math.round(+mins.value) || 25)); mins.value = d.mins; if (!st.running) { d.left = d.mins * 60; show(); } save(); } });
    return h('div', { class: 'w-col' }, disp, h('div', { class: 'w-row' }, go, ibtn('reset', 'Reset', () => { st.running = false; d.left = d.mins * 60; show(); sync(); save(); }), mins, h('span', { class: 'w-sub', text: 'min' })));
  }
  function wWeather(w) {
    const d = w.data, box = h('div', { class: 'w-col' });
    const ask = (msg) => {
      const inp = h('input', { type: 'text', placeholder: 'City', maxlength: 60, 'aria-label': 'City', value: d.place });
      const find = async () => {
        const q = inp.value.trim(); if (!q) return;
        box.replaceChildren(h('div', { class: 'w-sub', text: 'Searching…' }));
        try {
          const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=' + encodeURIComponent(q));
          const j = await r.json(); const p = j.results && j.results[0];
          if (!p || !Number.isFinite(+p.latitude)) { ask('No match for “' + q + '”'); return; }
          d.place = [p.name, p.country].filter(Boolean).join(', ').slice(0, 60); d.lat = +p.latitude; d.lon = +p.longitude; save(); load2();
        } catch { ask('Couldn’t reach the weather service'); }
      };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') find(); });
      box.replaceChildren(h('div', { class: 'w-sub', text: msg || 'Choose a city. Weather comes from Open-Meteo.' }), inp, h('div', { class: 'w-row' }, btn('Show weather', find)));
    };
    async function load2() {
      if (!d.place) { ask(); return; }
      box.replaceChildren(h('div', { class: 'w-sub', text: 'Loading…' }));
      const key = [d.lat, d.lon, d.unit].join();
      try {
        let c = weatherCache.get(key);
        if (!c || Date.now() - c.t > 6e5) {
          const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${d.lat}&longitude=${d.lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4&temperature_unit=${d.unit === 'f' ? 'fahrenheit' : 'celsius'}`);
          if (!r.ok) throw new Error('bad');
          c = { t: Date.now(), j: await r.json() }; weatherCache.set(key, c);
        }
        const j = c.j, cur0 = j.current, dl = j.daily;
        const [label, icn] = WX(+cur0.weather_code);
        box.replaceChildren(
          h('div', { class: 'wx-main' }, ico(icn), h('div', { class: 'w-big', text: Math.round(+cur0.temperature_2m) + '°' }), h('div', { class: 'w-sub', text: label })),
          h('div', { class: 'w-sub', text: d.place }),
          h('div', { class: 'wx-days' }, [1, 2, 3].map((i) => h('div', {}, h('span', { text: dayName(dl.time[i]) }), ico(WX(+dl.weather_code[i])[1]), h('b', { text: Math.round(+dl.temperature_2m_max[i]) + '°' }), h('span', { text: Math.round(+dl.temperature_2m_min[i]) + '°' })))),
          h('div', { class: 'w-row' }, btn(d.unit === 'f' ? '°F' : '°C', () => { d.unit = d.unit === 'f' ? 'c' : 'f'; save(); load2(); }), btn('Change city', () => ask())));
      } catch {
        box.replaceChildren(h('div', { class: 'w-sub', text: 'Couldn’t load the weather. Check your connection.' }), h('div', { class: 'w-row' }, btn('Retry', load2), btn('Change city', () => ask())));
      }
    }
    load2();
    return box;
  }
  const WIDGET_VIEW = { clock: wClock, calendar: wCalendar, notes: wNotes, todo: wTodo, countdown: wCountdown, timer: wTimer, weather: wWeather };

  function widgetCard(w, onRemove) {
    const [name, icn] = WIDGET_TYPES[w.type];
    const card = h('div', { class: 'widget glass', 'data-type': w.type },
      h('div', { class: 'w-head' }, ico(icn), h('span', { text: name }),
        h('button', { class: 'x-mini', title: 'Remove widget', 'aria-label': 'Remove ' + name, onclick: () => { onRemove(); card.remove(); } }, ico('x'))),
      WIDGET_VIEW[w.type](w));
    return card;
  }
  function widgetsBlock() {
    const box = h('div', { class: 'widgets rise', style: '--i:9' });
    const menu = h('div', { class: 'w-menu', hidden: true }, Object.entries(WIDGET_TYPES).map(([t, [n, i]]) => h('button', {
      class: 'btn', onclick: () => {
        if (S.widgets.length >= 12) { toast('Limit of 12 widgets'); return; }
        const w = newWidget(t); S.widgets.push(w); save();
        box.insertBefore(widgetCard(w, () => { S.widgets = S.widgets.filter((x) => x !== w); save(); }), bar);
        menu.hidden = true;
      } }, ico(i), h('span', { text: n }))));
    const bar = h('div', { class: 'w-add' }, h('button', { class: 'btn', onclick: () => { menu.hidden = !menu.hidden; } }, ico('plus'), h('span', { text: 'Add widget' })), menu);
    S.widgets.forEach((w) => box.append(widgetCard(w, () => { S.widgets = S.widgets.filter((x) => x !== w); save(); })));
    box.append(bar);
    return box;
  }

  /* ---------- start page ---------- */
  const pad2 = (x) => String(x).padStart(2, '0');
  function clockText() {
    const d = new Date(); let hr = d.getHours();
    if (S.clock24) return pad2(hr) + ':' + pad2(d.getMinutes());
    const ap = hr >= 12 ? ' PM' : ' AM'; hr = hr % 12 || 12;
    return hr + ':' + pad2(d.getMinutes()) + ap;
  }
  const GREETINGS = {
    night: ['Good night', 'Still up?', 'Burning the midnight oil?'],
    morning: ['Good morning', 'Rise and shine', 'Morning', 'Fresh start today'],
    afternoon: ['Good afternoon', 'Hope your day is going well', 'Afternoon'],
    evening: ['Good evening', 'Winding down?', 'Evening'],
    any: ['Welcome back', 'Hello there', 'Hey', 'Good to see you', 'Ready when you are', 'What are we exploring today?', 'Nice to see you', 'Hi'],
  };
  function greetText() {
    const hr = new Date().getHours();
    const part = hr < 5 ? 'night' : hr < 12 ? 'morning' : hr < 18 ? 'afternoon' : 'evening';
    const pool = [...GREETINGS[part], ...GREETINGS.any];
    let last = ''; try { last = sessionStorage.getItem('vitreous.greet') || ''; } catch { /* no storage */ }
    const opts = pool.filter((g) => g !== last);
    const g = opts[Math.floor(Math.random() * opts.length)];
    try { sessionStorage.setItem('vitreous.greet', g); } catch { /* no storage */ }
    const n = S.userName.trim();
    if (!n) return g;
    return g.endsWith('?') ? `${n}, ${g[0].toLowerCase()}${g.slice(1)}` : `${g}, ${n}`;
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
    if (S.startTiles) {
      const tiles = h('div', rise('tiles'));
      const drawTiles = () => {
        tiles.replaceChildren(...S.bookmarks.map((b, i) => {
          const fav = h('span', { class: 'fav', 'aria-hidden': 'true' });
          paintFav(fav, b.url, (b.name[0] || '?').toUpperCase());
          return h('div', { class: 'tile-wrap' },
            h('button', { class: 'tile', onclick: () => navigate(cur(), b.url) }, fav, b.name),
            h('button', { class: 'tile-x', title: 'Remove', 'aria-label': 'Remove ' + b.name, onclick: () => { S.bookmarks.splice(i, 1); save(); drawTiles(); } }, ico('x')));
        }), h('div', { class: 'tile-wrap' }, h('button', { class: 'tile add', onclick: addForm }, h('span', { class: 'fav' }, ico('plus')), 'Add')));
      };
      const addForm = () => {
        const n = h('input', { type: 'text', placeholder: 'Name', maxlength: 40, 'aria-label': 'Name' });
        const u = h('input', { type: 'text', placeholder: 'https://…', maxlength: 500, spellcheck: 'false', 'aria-label': 'Address' });
        const ok = () => {
          let v = u.value.trim(); if (!v) return;
          if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
          try { v = new URL(v).href; } catch { toast('That is not a valid address'); return; }
          if (S.bookmarks.length >= 24) { toast('Limit of 24 bookmarks'); return; }
          S.bookmarks.push({ name: n.value.trim() || hostOf(v).replace(/^www\./, ''), url: v }); save(); drawTiles();
        };
        [n, u].forEach((x) => x.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); else if (e.key === 'Escape') drawTiles(); }));
        tiles.replaceChildren(h('div', { class: 'tile-form' }, n, u, btn('Add', ok), btn('Cancel', drawTiles)));
        n.focus();
      };
      drawTiles();
      kids.push(tiles);
    }
    if (S.startHint) {
      const hint = h('p', rise('hint'), h('kbd', { text: keyText(S.keys.palette) }), ' palette  ·  ', h('kbd', { text: keyText(S.keys.newTab) }), ' new tab  ·  ', h('kbd', { text: keyText(S.keys.sidebar) }), ' sidebar',
        h('button', { class: 'x-mini', title: 'Hide this hint', 'aria-label': 'Hide hint', onclick: () => { set('startHint', false); hint.remove(); } }, ico('x')));
      kids.push(hint);
    }
    return h('div', { class: 'page' }, h('div', { class: 'start' }, kids), S.startWidgets ? widgetsBlock() : null);
  }

  /* ---------- settings page ---------- */
  function dropdown(options, value, onChange, label = 'Choose an option') {
    const current = () => options.find((x) => String(x[0]) === String(value))?.[1] || label;
    const wrap = h('div', { class: 'dropdown' });
    const trigger = h('button', { type: 'button', class: 'drop-trigger', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': label },
      h('span', { class: 'drop-value', text: current() }), ico('down'));
    const menu = h('div', { class: 'drop-menu', role: 'listbox', hidden: true, 'aria-label': label });
    const close = () => { menu.hidden = true; wrap.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); };
    const draw = () => {
      menu.replaceChildren(...options.map(([v, name]) => h('button', {
        type: 'button', class: 'drop-option', role: 'option', 'aria-selected': String(String(v) === String(value)), text: name,
        onclick: () => { value = v; trigger.querySelector('.drop-value').textContent = name; onChange(v); draw(); close(); trigger.focus(); },
      })));
    };
    draw();
    trigger.addEventListener('click', () => {
      const opening = menu.hidden;
      menu.hidden = !opening;
      wrap.classList.toggle('open', opening);
      trigger.setAttribute('aria-expanded', String(opening));
    });
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); menu.hidden = false; wrap.classList.add('open'); trigger.setAttribute('aria-expanded', 'true');
        menu.querySelector('[aria-selected="true"]')?.focus();
      } else if (e.key === 'Escape') close();
    });
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); trigger.focus(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); const items = [...menu.querySelectorAll('button')]; const i = items.indexOf(document.activeElement);
        items[Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))) ]?.focus();
      }
    });
    wrap.addEventListener('focusout', (e) => { if (!wrap.contains(e.relatedTarget)) close(); });
    wrap.append(trigger, menu);
    return wrap;
  }
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
  const ibtn = (name, label, fn, cls = '') => { const b = h('button', { class: 'btn ibtn ' + cls, title: label, 'aria-label': label, onclick: fn }); b.append(ico(name)); return b; };
  const btn = (label, fn, cls = '') => h('button', { class: 'btn ' + cls, text: label, onclick: fn });
  const row = (label, sub, control, cls = '') => h('div', { class: 'row ' + cls }, h('div', {}, label, sub ? h('small', { text: sub }) : null), control);
  const ICONS = {
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
    drop: '<path d="M12 3s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.2 12 3 12 3z"/>',
    type: '<path d="M5 19l7-14 7 14M8 14h8"/>',
    layout: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
    tabs: '<rect x="3" y="7" width="18" height="12" rx="3"/><path d="M3 11h18M7 7V5h5v2"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.2-4.2"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="3"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7.5 14h9"/>',
    code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    bookmark: '<path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    circle: '<circle cx="12" cy="12" r="7"/>',
    command: '<path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/>',
    grid: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    up: '<path d="M6 14l6-6 6 6"/>', down: '<path d="M6 10l6 6 6-6"/>', left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    note: '<path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M8.5 13h7M8.5 17h5"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 3h5"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>', pause: '<path d="M8 5v14M16 5v14"/>', reset: '<path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    cloud: '<path d="M6.5 18a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6-1.3A4.4 4.4 0 0 1 17 18z"/>',
    partly: '<circle cx="8" cy="8" r="2.5"/><path d="M8 2.5v1M2.5 8h1M4.1 4.1l.7.7M11.9 4.1l-.7.7"/><path d="M8 20a3.5 3.5 0 0 1-.4-7A5 5 0 0 1 17 12a3.8 3.8 0 0 1 0 8z"/>',
    rain: '<path d="M6.5 15a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6-1.3A4.4 4.4 0 0 1 17 15z"/><path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5"/>',
    snow: '<path d="M6.5 15a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6-1.3A4.4 4.4 0 0 1 17 15z"/><path d="M8 18.5h.01M12 20h.01M16 18.5h.01M10 22h.01M14 22h.01"/>',
    storm: '<path d="M6.5 14a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6-1.3A4.4 4.4 0 0 1 17 14z"/><path d="M12.5 14l-2.5 4h3l-2 4"/>',
    fog: '<path d="M4 9h16M6 13h12M4 17h16"/>',
  };
  const ico = (n) => { const t = document.createElement('template'); t.innerHTML = `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true">${ICONS[n]}</svg>`; return t.content.firstChild; };
  const GROUP_ICON = { appearance: 'palette', wallpaper: 'image', glass: 'drop', type: 'type', layout: 'layout', tabs: 'tabs', spaces: 'layers', toolbar: 'sliders', start: 'home', widgets: 'grid', search: 'search', privacy: 'shield', shortcuts: 'keyboard', palette: 'command', advanced: 'code' };
  const SECTIONS = [
    ['appearance', 'Appearance', 'palette', 'Themes, colors, wallpaper, glass and fonts', ['appearance', 'wallpaper', 'glass', 'type']],
    ['layout', 'Layout and tabs', 'layout', 'Sidebar, tab style, density and spaces', ['layout', 'tabs', 'spaces']],
    ['toolbar', 'Toolbar', 'sliders', 'Buttons and the address bar', ['toolbar']],
    ['start', 'Start page', 'home', 'Greeting, shortcuts and widgets on a new tab', ['start', 'widgets']],
    ['search', 'Search and startup', 'search', 'Search engines, new tabs and homepage', ['search']],
    ['privacy', 'Privacy and security', 'shield', 'Tracking, HTTPS and fingerprinting', ['privacy']],
    ['shortcuts', 'Shortcuts and palette', 'keyboard', 'Keyboard bindings and your own palette commands', ['shortcuts', 'palette']],
    ['advanced', 'Advanced', 'code', 'Custom CSS, backup and reset', ['advanced']],
  ];
  let lastSection = 'appearance';
  let settingsGoto = null;
  const group = (id, title, i, ...kids) => h('div', { class: 'group rise', style: `--i:${Math.min(i, 5)}`, id: 'grp-' + id }, h('h3', {}, ico(GROUP_ICON[id]), title), ...kids);

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
    root.classList.toggle('searching', !!q);
    root.querySelectorAll('.sec').forEach((sec) => {
      const has = !!sec.querySelector('.group:not(.hidden-row)');
      sec.classList.toggle('hidden-row', !has);
      const nb = root.querySelector(`.set-nav [data-sec="${sec.dataset.sec}"]`);
      if (nb) nb.classList.toggle('dim', !!q && !has);
    });
    $('.nores', root).hidden = any;
  }

  function settingsPage() {
    let gi = 0;

    /* engines */
    const engineBox = h('div'), engineEd = h('div', { class: 'ed' });
    const drawEngines = () => {
      const sel = dropdown(Object.entries(allEngines()).map(([k, v]) => [k, v[0]]), S.search, (v) => set('search', v), 'Search engine');
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
        return h('div', { class: 'er' }, n, u, ibtn('up', 'Move up', mv(-1)), ibtn('down', 'Move down', mv(1)), ibtn('x', 'Remove', () => { S.bookmarks.splice(i, 1); save(); drawBm(); }, 'danger'));
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

    /* widgets list */
    const wBox = h('div', { class: 'ed' });
    const drawW = () => {
      wBox.replaceChildren(...S.widgets.map((w, i) => {
        const mv = (d) => () => { const j = i + d; if (j < 0 || j >= S.widgets.length) return; [S.widgets[i], S.widgets[j]] = [S.widgets[j], S.widgets[i]]; save(); drawW(); };
        return h('div', { class: 'er' }, ico(WIDGET_TYPES[w.type][1]), h('span', { text: WIDGET_TYPES[w.type][0], style: 'flex:1' }),
          ibtn('up', 'Move up', mv(-1)), ibtn('down', 'Move down', mv(1)), ibtn('x', 'Remove', () => { S.widgets.splice(i, 1); save(); drawW(); }, 'danger'));
      }), h('div', { class: 'btns' }, Object.entries(WIDGET_TYPES).map(([t, [n, ic]]) => h('button', {
        class: 'btn', onclick: () => { if (S.widgets.length >= 12) { toast('Limit of 12 widgets'); return; } S.widgets.push(newWidget(t)); save(); drawW(); },
      }, ico(ic), h('span', { text: n })))));
    };
    /* custom palette commands */
    const cmdBox = h('div', { class: 'ed' });
    const drawCmds = () => {
      cmdBox.replaceChildren(...S.commands.map((cm, i) => {
        const name = h('input', { type: 'text', value: cm.name, maxlength: 40, 'aria-label': 'Command name', style: 'max-width:170px', oninput: () => { cm.name = name.value || 'Command'; save(); } });
        const kind = dropdown([['url', 'Open address'], ['newtab', 'Open in new tab'], ['action', 'Run action'], ['toggle', 'Toggle setting']], cm.kind, (v) => { cm.kind = v; cm.target = v === 'action' ? 'newTab' : v === 'toggle' ? 'motion' : 'https://example.com'; save(); drawCmds(); }, 'Command type');
        let target;
        if (cm.kind === 'action' || cm.kind === 'toggle') {
          const opts = cm.kind === 'action' ? actions().map(([id, l]) => [id, l]) : TOGGLES;
          target = dropdown(opts, cm.target, (v) => { cm.target = v; save(); }, 'Command target');
        } else {
          target = h('input', { type: 'text', value: cm.target, maxlength: 500, spellcheck: 'false', 'aria-label': 'Address',
            onchange: () => { let v = target.value.trim(); if (!/^(https?:\/\/|vitreous:\/\/(newtab|settings))/i.test(v)) v = 'https://' + v; try { new URL(v); cm.target = v; save(); } catch { toast('That is not a valid address'); } target.value = cm.target; } });
        }
        return h('div', { class: 'er' }, name, kind, target, ibtn('x', 'Remove', () => { S.commands.splice(i, 1); save(); drawCmds(); }, 'danger'));
      }), h('div', { class: 'btns' }, btn('Add command', () => {
        if (S.commands.length >= 30) { toast('Limit of 30 commands'); return; }
        S.commands.push({ id: 'c' + uid(), name: 'My command', kind: 'url', target: 'https://example.com' }); save(); drawCmds();
      })));
    };
    drawW(); drawCmds();

    const wallFile = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: () => { uploadWallpaper(wallFile.files[0]); wallFile.value = ''; } });
    const importFile = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: () => { importSettings(importFile.files[0]); importFile.value = ''; } });
    const css = h('textarea', { spellcheck: 'false', 'aria-label': 'Custom CSS', placeholder: '/* Style any part of the interface, e.g. */\n.sidebar { border-radius: 8px; }', text: S.css, oninput: () => set('css', css.value.slice(0, 20000)) });

    const search = h('input', { type: 'search', placeholder: 'Search settings', 'aria-label': 'Search settings' });
    drawEngines(); drawBm(); drawSpaces(); drawKeys();
    const auroraSw = swatches(Object.keys(AURORA), 'aurora', (k) => (k === 'custom' ? 'conic-gradient(#ff5e62, #ffd93b, #2fd180, #2b7fff, #b57bff, #ff5e62)' : `linear-gradient(135deg, ${AURORA[k].join(',')})`));

    const page = h('div', { class: 'settings' },
      h('h2', { class: 'rise', style: '--i:0', text: 'Settings' }),
      h('p', { class: 'rise', style: '--i:1', text: 'Every surface of Vitreous is adjustable. Changes apply instantly.' }),

      group('appearance', 'Colors and theme', gi++,
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
        row('Low-Spec Mode', 'Disables blur, glow, cursor spotlight and transitions for slower devices', toggle('lowfx')),
        row('Match browser theme to website', 'Uses the rendering engine theme-color signal when available', toggle('dynamicTheme')),
        row('Website theme intensity', 'How strongly the website color tints the glass', range('dynamicIntensity', 0, 30, '%'))),

      group('type', 'Typography', gi++,
        row('Font', null, (() => { return dropdown([['system', 'Default (Inter / system)'], ['inter', 'Inter'], ['serif', 'Serif'], ['mono', 'Monospace'], ['rounded', 'Rounded'], ['custom', 'Custom…']], S.font, (v) => set('font', v), 'Font'); })()),
        row('Custom font name', 'Any font installed on your device. Pick “Custom…” above', text('fontCustom', 'e.g. Fira Sans', '200px', 60, () => { if (S.fontCustom.trim() && S.font !== 'custom') set('font', 'custom'); })),
        row('Interface size', 'Scales the whole interface', range('fontScale', 50, 150, '%'))),

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
        row('Show tab icons', null, toggle('favs')),
        row('Site icons', 'Load each site’s own icon straight from that site. Off shows a letter badge', toggle('siteIcons')),
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
        row('Shortcut hint', 'Can also be dismissed with the × on the start page', toggle('startHint')),
        row('Widgets', null, toggle('startWidgets')),
        h('div', { class: 'row' }, h('div', {}, 'Bookmarks', h('small', { text: 'Shown as tiles and in the command palette. You can also remove or add tiles right on the start page' }))),
        bmBox),

      group('widgets', 'Widgets', gi++, h('div', { class: 'warn', text: 'Widgets show on the start page. You can also add or remove them there. The weather widget contacts open-meteo.com only when you add it.' }), wBox),

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

      group('palette', 'Command palette', gi++, h('div', { class: 'warn', text: 'Add your own entries to the palette (Ctrl K by default): open a site, run any action, or flip a setting.' }), cmdBox),

      group('advanced', 'Advanced', gi++,
        h('div', { class: 'row col' }, h('div', {}, 'Custom CSS', h('small', { text: 'Applied on top of everything else. Variables like --accent, --radius and --blur are available.' })), css),
        row('Back up settings', 'Export to a file, or load one from another device', h('div', { class: 'btns' }, importFile, btn('Export', exportSettings), btn('Import…', () => importFile.click()))),
        row('Reset all settings', 'Restores every default. Tabs stay open', btn('Reset…', () => { if (confirm('Reset every setting to its default?')) { setWall(''); replaceSettings(clone(DEFAULTS)); toast('Settings reset'); } }, 'danger'))),

      h('div', { class: 'nores', hidden: true, text: 'No settings match your search.' }));

    /* split the cards into sections, with a left nav like a real browser */
    const noRes = $('.nores', page);
    const nav = h('nav', { class: 'set-nav', 'aria-label': 'Settings sections' });
    const main = h('div', { class: 'set-main' });
    const root = h('div', { class: 'settings' },
      h('div', { class: 'set-head' }, h('h2', { text: 'Settings' }), search),
      h('div', { class: 'set-layout' }, nav, main));
    const select = (id, scroll) => {
      lastSection = id;
      root.querySelectorAll('.sec').forEach((x) => x.classList.toggle('on', x.dataset.sec === id));
      nav.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.sec === id)));
      if (search.value) { search.value = ''; filterSettings(root, ''); }
      const pg = root.closest('.page'); if (pg && scroll !== false) pg.scrollTop = 0;
    };
    SECTIONS.forEach(([id, label, ic, sub, gs]) => {
      nav.append(h('button', { 'data-sec': id, onclick: () => select(id) }, ico(ic), h('span', { text: label })));
      const sec = h('section', { class: 'sec', 'data-sec': id }, h('div', { class: 'sec-head' }, h('div', { class: 'sec-ico' }, ico(ic)), h('div', {}, h('h2', { text: label }), h('p', { text: sub }))));
      gs.forEach((g) => sec.append(page.querySelector('#grp-' + g)));
      main.append(sec);
    });
    main.append(noRes);
    select(SECTIONS.some((x) => x[0] === lastSection) ? lastSection : 'appearance', false);
    settingsGoto = (anchor) => {
      const el = document.getElementById(anchor);
      const sec = el && el.closest('.sec');
      if (!sec) return;
      select(sec.dataset.sec, false);
      el.scrollIntoView({ behavior: motionOn() ? 'smooth' : 'auto', block: 'start' });
    };
    search.addEventListener('input', () => filterSettings(root, search.value));
    return h('div', { class: 'page' }, root);
  }

  /* ---------- palette ---------- */
  const pal = $('#pal'), palInput = $('#palInput'), palList = $('#palList');
  let palItems = [], palSel = 0;

  function commands() {
    const c = actions().map(([id, label, fn]) => [label, S.keys[id] ? keyText(S.keys[id]) : '', fn]);
    c.push(
      ['Toggle animations', '', () => set('motion', !S.motion)],
      ['Toggle Low-Spec Mode', '', () => set('lowfx', !S.lowfx)],
      ['Test dynamic theme color', '', () => {
        if (!S.dynamicTheme) set('dynamicTheme', true);
        const hex = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
        window.vitreousEngine.onThemeColorChange(hex);
        toast('Mock website theme: ' + hex);
      }],
      ['Simulate engine title update', '', () => { window.vitreousEngine.onTitleChange('Vitreous Engine Demo'); toast('Mock engine title received'); }],
      ['Simulate engine load state', '', () => { window.vitreousEngine.onLoadStateChange('loading'); setTimeout(() => window.vitreousEngine.onLoadStateChange('complete'), 900); toast('Mock engine load started'); }],
      ['Preview site error page', '', () => { lastFailedUrl = urlOf(cur()); window.vitreousEngine.onError('Mock navigation failure'); }],
      ['Toggle top / side tab layout', '', () => set('tabs', S.tabs === 'top' ? 'side' : 'top')],
      ['Export settings', '', () => { openSettings('grp-advanced'); }],
    );
    S.commands.forEach((cm) => c.push([cm.name, 'custom', () => {
      if (cm.kind === 'url') navigate(cur(), cm.target);
      else if (cm.kind === 'newtab') newTab(cm.target);
      else if (cm.kind === 'action') { const a = actions().find((x) => x[0] === cm.target); a && a[2](); }
      else if (cm.kind === 'toggle') { set(cm.target, !S[cm.target]); toast((TOGGLES.find((x) => x[0] === cm.target) || [0, cm.target])[1] + (S[cm.target] ? ' on' : ' off')); }
    }]));
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

  /* Stable UI-facing adapter. A native CEF host can call these same hooks later. */
  window.vitreousEngine = {
    onThemeColorChange(hexCode) {
      if (!isHex(hexCode)) return false;
      engineThemeColor = hexCode;
      apply();
      return true;
    },
    onLoadStateChange(state) {
      if (state === 'loading') loadStart();
      else if (state === 'complete' || state === 'error') loadEnd();
      return true;
    },
    onTitleChange(title) {
      const t = cur();
      if (!t || typeof title !== 'string') return false;
      t.titleOverride = title.slice(0, 120);
      renderTabs(); renderToolbar(); save();
      return true;
    },
    onError(message) {
      const t = cur();
      if (!t) return false;
      lastFailedUrl = urlOf(t);
      t.errorMessage = String(message || 'Navigation failed').slice(0, 240);
      t.hist[t.i] = 'vitreous://error';
      t.titleOverride = '';
      render();
      return true;
    },
  };

  /* ---------- native-feeling context menus ---------- */
  const contextMenu = h('div', { class: 'context-menu glass', hidden: true, role: 'menu' });
  document.body.append(contextMenu);
  const hideContextMenu = () => { contextMenu.hidden = true; };
  function openContextMenu(e, entries) {
    e.preventDefault();
    contextMenu.replaceChildren(...entries.map(([label, action, disabled]) => h('button', {
      type: 'button', role: 'menuitem', class: 'context-item', text: label, disabled: !!disabled,
      onclick: () => { hideContextMenu(); action(); },
    })));
    contextMenu.hidden = false;
    const x = Math.min(e.clientX, innerWidth - 210);
    const y = Math.min(e.clientY, innerHeight - Math.min(entries.length * 38 + 12, 220));
    contextMenu.style.left = Math.max(8, x) + 'px';
    contextMenu.style.top = Math.max(8, y) + 'px';
  }
  document.addEventListener('contextmenu', (e) => {
    const tab = e.target.closest && e.target.closest('.tab');
    const link = e.target.closest && e.target.closest('a[href]');
    if (tab) {
      const id = tab.dataset.id;
      openContextMenu(e, [
        ['Activate tab', () => activate(id)],
        ['Close tab', () => closeTab(id)],
        ['Close other tabs', () => {
          tabs = tabs.filter((t) => t.ws !== ws || t.id === id);
          activeId = id; render();
        }],
        ['New tab', () => newTab()],
      ]);
      return;
    }
    if (link) {
      const href = link.href;
      openContextMenu(e, [
        ['Open link in new tab', () => newTab(href)],
        ['Open link in this tab', () => navigate(cur(), href)],
      ]);
      return;
    }
    if (e.target.closest && e.target.closest('.viewport')) {
      openContextMenu(e, [
        ['New tab', () => newTab()],
        ['Reload page', () => { cur().reload++; render(); }],
        ['Back', () => go(-1)],
        ['Open settings', () => openSettings()],
      ]);
    }
  });
  document.addEventListener('pointerdown', (e) => { if (!contextMenu.contains(e.target)) hideContextMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideContextMenu(); });

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
    if (typeof anchor === 'string') setTimeout(() => settingsGoto && settingsGoto(anchor), 120);
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
    if (spot || !motionOn() || document.body.dataset.fx === 'low') return;
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
  if (!hasSavedState && Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 4) {
    S.lowfx = true;
    autoLowSpecNotice = true;
  }
  buildSpaces();
  apply();
  if (!tabs.length) tabs.push({ id: uid(), ws, hist: ['vitreous://newtab'], i: 0, reload: 0 });
  if (!tabs.some((t) => t.id === activeId)) { const g = wsTabs(); activeId = (g[0] || tabs[0]).id; ws = cur().ws; }
  render();
  if (autoLowSpecNotice) setTimeout(() => toast('Low-Spec Mode enabled for this device. You can turn it off in Settings → Glass.'), 500);
})();
