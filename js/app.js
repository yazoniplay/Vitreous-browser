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
  const motionOn = () => document.body.dataset.motion !== 'off' && !(document.body.dataset.respectRm === '1' && matchMedia('(prefers-reduced-motion: reduce)').matches);

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
  const DL_STATES = ['done', 'progress', 'paused', 'failed', 'canceled'];
  const T0 = Date.now(), MIN = 60000, HOUR = 3600000, DAY = 86400000, MB = 1048576;
  const MOCK_HISTORY = [
    { u: 'https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter', t: 'backdrop-filter - CSS | MDN', ts: T0 - 6 * MIN },
    { u: 'https://developer.mozilla.org/en-US/docs/Web/CSS/color-mix', t: 'color-mix() - CSS | MDN', ts: T0 - 19 * MIN },
    { u: 'https://github.com/yazoniplay/Vitreous-browser', t: 'yazoniplay/Vitreous-browser', ts: T0 - 52 * MIN },
    { u: 'https://www.wikipedia.org', t: 'Wikipedia', ts: T0 - 2 * HOUR },
    { u: 'https://ladybird.org', t: 'Ladybird', ts: T0 - 3 * HOUR },
    { u: 'https://github.com', t: 'GitHub', ts: T0 - DAY - 40 * MIN },
    { u: 'https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver', t: 'ResizeObserver - Web APIs | MDN', ts: T0 - DAY - 2 * HOUR },
    { u: 'https://www.wikipedia.org/wiki/Glassmorphism', t: 'Glassmorphism - Wikipedia', ts: T0 - DAY - 5 * HOUR },
    { u: 'https://duckduckgo.com', t: 'DuckDuckGo', ts: T0 - 3 * DAY },
    { u: 'https://www.wikipedia.org/wiki/Web_browser', t: 'Web browser - Wikipedia', ts: T0 - 3 * DAY - HOUR },
    { u: 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment', t: 'CSS containment - CSS | MDN', ts: T0 - 6 * DAY },
  ];
  const MOCK_DOWNLOADS = [
    { id: 'dl1', name: 'vitreous-brand-kit.zip', url: 'https://example.com/files/vitreous-brand-kit.zip', size: 48 * MB, got: 19 * MB, state: 'progress', ts: T0 - 2 * MIN },
    { id: 'dl2', name: 'inter-variable.woff2', url: 'https://example.com/fonts/inter-variable.woff2', size: 348 * 1024, got: 348 * 1024, state: 'done', ts: T0 - 35 * MIN },
    { id: 'dl3', name: 'engine-notes.pdf', url: 'https://example.com/docs/engine-notes.pdf', size: Math.round(2.4 * MB), got: Math.round(2.4 * MB), state: 'done', ts: T0 - 3 * HOUR },
    { id: 'dl4', name: 'wallpaper-prism-4k.png', url: 'https://example.com/img/wallpaper-prism-4k.png', size: 12 * MB, got: 4 * MB, state: 'failed', ts: T0 - DAY - HOUR },
    { id: 'dl5', name: 'icons-glass.svg', url: 'https://example.com/icons/icons-glass.svg', size: 86 * 1024, got: 86 * 1024, state: 'done', ts: T0 - 2 * DAY },
  ];
  const MOCK_EXTENSIONS = [
    { id: 'glass-shield', name: 'Glass Shield', desc: 'Blocks ads and trackers with community filter lists.', ver: '2.4.1', on: true },
    { id: 'night-tint', name: 'Night Tint', desc: 'Warms page colors in the evening to reduce eye strain.', ver: '1.2.0', on: true },
    { id: 'reader-view', name: 'Reader View', desc: 'Strips pages down to clean, readable text.', ver: '3.0.2', on: false },
    { id: 'vault-lite', name: 'Vault Lite', desc: 'Local-only password manager with autofill.', ver: '0.9.7', on: true },
  ];
  const VERSION = '0.4.0 prototype';
  const DEFAULT_QUICK = [
    { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'MDN', url: 'https://developer.mozilla.org' },
    { name: 'YouTube', url: 'https://www.youtube.com' },
    { name: 'Twitter', url: 'https://twitter.com' },
    { name: 'Reddit', url: 'https://www.reddit.com' },
    { name: 'Hacker News', url: 'https://news.ycombinator.com' },
    { name: 'ChatGPT', url: 'https://chatgpt.com' },
  ];
  const DEFAULT_KEYS = {
    newTab: 'Alt+KeyT', closeTab: 'Alt+KeyW', focusAddr: 'Alt+KeyL', sidebar: 'Alt+KeyB', settings: 'Alt+Comma',
    palette: 'Ctrl+KeyK', reload: 'Alt+KeyR', back: 'Alt+ArrowLeft', forward: 'Alt+ArrowRight',
    nextTab: 'Alt+ArrowDown', prevTab: 'Alt+ArrowUp', home: 'Alt+KeyH', bookmark: 'Ctrl+KeyD', theme: '', layout: '',
  };
  const DEFAULTS = {
    /* appearance */
    theme: 'dark', accent: '#5aa9ff', aurora: 'prism', auroraCustom: ['#5aa9ff', '#b57bff', '#0ea5a0'],
    wallMode: 'none', wallUrl: '', wallDim: 25, wallBlur: 0, blobs: 100, blobSpeed: 100,
    /* glass */
    glassTransparency: 70, glassRefraction: 8, glassFrost: 0, lightDirection: 'top-left', breathingGlow: false, spotlightIntensity: 50, radius: 22, tabRadius: 22, panelRadius: 22, addrRadius: 22, addrPosition: 'center', rim: 100, shadow: 100, border: 1, lowfx: false, motion: true, respectReducedMotion: false,
    dynamicTheme: false, dynamicIntensity: 18,
    /* type */
    font: 'system', fontCustom: '', fontScale: 100,
    /* layout */
    density: 'cozy', gap: 8, iconSize: 18, iconStroke: 18, brand: 'vitreous',
    tabs: 'side', collapsed: true, hoverExpand: true, sideWidth: 252, sideSide: 'left',
    /* tabs */
    tabShape: 'rounded', tabWidth: 200, favs: true, closeBtn: 'hover',
    /* toolbar */
    btnBack: true, btnForward: true, btnReload: true, btnSidebar: false, btnPalette: false, btnSettings: false, bookmarkStar: true, bmBar: 'newtab', bmNames: true, toolbarPos: 'top', stripStyle: 'glass', tabFit: 'fit', shield: true, lock: true, showHome: false, addrWidth: 680, addrShape: 'pill', addrAlign: 'center',
    /* start page */
    startLogo: true, startTitle: 'vitreous', startSearch: true, startTiles: true, startHint: true,
    startClock: false, clock24: true, startGreeting: false, customGreeting: '', startLayout: 'centered', userName: '', tileSize: 108, startWidgets: true, siteIcons: true,
    bookmarks: DEFAULT_BOOKMARKS, quickLinks: DEFAULT_QUICK, spaces: DEFAULT_SPACES,
    history: MOCK_HISTORY, downloads: MOCK_DOWNLOADS,
    /* behavior */
    search: 'ddg', engines: [], newTabMode: 'start', homepage: '',
    startup: 'start', startupPages: [], suggest: true, searchSuggest: true,
    /* privacy and security (mock until the engine layer) */
    cookies: 'third', clearOnExit: false, blockPopups: true, permLocation: 'ask', permCamera: 'ask', permMic: 'ask', permNotify: 'block',
    safeBrowsing: 'standard', secureDns: true, dnsProvider: 'cloudflare', webrtc: 'public', gpc: true,
    /* downloads */
    dlDir: '~/Downloads', dlAsk: false, dlOpen: false, dlShelf: true, dlParallel: 3,
    /* languages and accessibility */
    lang: 'en-US', spellcheck: true, translate: true, pageZoom: 100, minFont: 0, highContrast: false, focusRing: false, caret: false,
    /* system */
    hwAccel: true, memorySaver: true, sleepAfter: '15', preload: true, bgRun: false, proxy: 'system', proxyAddr: '',
    extensions: MOCK_EXTENSIONS, extDev: false, channel: 'stable',
    /* privacy */
    trackers: true, https: true, fingerprint: true, dnt: true, saveHistory: true,
    /* advanced */
    css: '', keys: DEFAULT_KEYS, widgets: [], commands: [],
  };
  const ENUMS = {
    theme: ['dark', 'light', 'midnight', 'auto'], wallMode: ['none', 'url', 'upload'],
    font: ['system', 'inter', 'serif', 'mono', 'rounded', 'custom'], density: ['compact', 'cozy', 'roomy'],
    tabs: ['side', 'top'], sideSide: ['left', 'right'], tabShape: ['rounded', 'flat', 'pill', 'folder'], addrPosition: ['center', 'left', 'sidebar'], bmBar: ['never', 'newtab', 'always'], toolbarPos: ['top', 'bottom'], stripStyle: ['glass', 'float', 'compact'], tabFit: ['fit', 'fixed'],
    closeBtn: ['hover', 'always', 'never'], addrShape: ['pill', 'round', 'square'], addrAlign: ['center', 'left'],
    newTabMode: ['start', 'blank', 'home'], startup: ['start', 'restore', 'pages'], startLayout: ['centered', 'left', 'command'], lightDirection: ['top-left', 'top-right', 'center'],
    cookies: ['all', 'third', 'block'], permLocation: ['ask', 'allow', 'block'], permCamera: ['ask', 'allow', 'block'], permMic: ['ask', 'allow', 'block'], permNotify: ['ask', 'allow', 'block'],
    safeBrowsing: ['off', 'standard', 'enhanced'], dnsProvider: ['cloudflare', 'quad9', 'mullvad', 'nextdns'], webrtc: ['default', 'public', 'off'],
    lang: ['en-US', 'en-GB', 'sv-SE', 'de-DE', 'fr-FR', 'es-ES', 'pt-BR', 'ja-JP', 'zh-CN'], sleepAfter: ['5', '15', '30', '60'], proxy: ['system', 'none', 'manual'], channel: ['stable', 'beta', 'nightly'],
  };
  const RANGES = {
    tabRadius: [0, 36], panelRadius: [0, 36], addrRadius: [0, 36], wallDim: [0, 85], wallBlur: [0, 40], blobs: [0, 150], blobSpeed: [0, 300], glassTransparency: [0, 100], glassRefraction: [0, 20], glassFrost: [0, 100], radius: [4, 36],
    rim: [0, 100], shadow: [0, 100], border: [0, 3], fontScale: [80, 140], gap: [0, 18],
    dlParallel: [1, 8], pageZoom: [50, 300], minFont: [0, 24],
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
    rss: ['RSS Feed', 'rss'], sysstats: ['System', 'cpu'], quicklinks: ['Quick Links', 'grid'],
  };
  /* widget sizes on the start-page grid: sm = 1x1, md = 2x1, lg = 2x2 */
  const SIZE_LABEL = { sm: 'Small', md: 'Medium', lg: 'Large' };
  const SIZE_NEXT = { sm: 'md', md: 'lg', lg: 'sm' };
  const DEFAULT_SIZE = { clock: 'sm', calendar: 'md', notes: 'md', todo: 'md', countdown: 'sm', timer: 'sm', weather: 'md', rss: 'md', sysstats: 'md', quicklinks: 'md' };
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
  const INTERNAL = ['vitreous://newtab', 'vitreous://settings', 'vitreous://blank', 'vitreous://error', 'vitreous://downloads', 'vitreous://history', 'vitreous://bookmarks'];

  /* ---------- state ---------- */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let S = clone(DEFAULTS);
  let tabs = [];
  let stacks = [];
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
    if (u === 'vitreous://downloads') return 'Downloads';
    if (u === 'vitreous://history') return 'History';
    if (u === 'vitreous://bookmarks') return 'Bookmarks';
    if (t.titleOverride) return t.titleOverride;
    try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; }
  }
  function favLetter(t) {
    const u = urlOf(t);
    if (u === 'vitreous://newtab') return 'V';
    if (u === 'vitreous://settings') return '•';
    if (u === 'vitreous://blank') return '○';
    if (u === 'vitreous://downloads') return '↓';
    if (u === 'vitreous://history') return '◷';
    if (u === 'vitreous://bookmarks') return '★';
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
    if (Array.isArray(src.startupPages)) out.startupPages = src.startupPages.filter((x) => typeof x === 'string' && /^https?:\/\//i.test(x)).slice(0, 8).map((x) => x.slice(0, 500));
    if (Array.isArray(src.extensions)) {
      const seenE = new Set();
      out.extensions = src.extensions.filter((x) => x && /^[\w-]{1,32}$/.test(String(x.id)) && !seenE.has(x.id) && seenE.add(x.id)).slice(0, 30)
        .map((x) => ({ id: x.id, name: str(x.name, 40) || 'Extension', desc: str(x.desc, 140), ver: str(x.ver, 12), on: x.on === true }));
    }
    if (Array.isArray(src.history)) {
      out.history = src.history.filter((x) => x && typeof x.u === 'string' && /^https?:\/\//i.test(x.u) && Number.isFinite(+x.ts)).slice(0, 1000)
        .map((x) => ({ u: x.u.slice(0, 500), t: str(x.t, 120), ts: +x.ts }));
    }
    if (Array.isArray(src.downloads)) {
      const seenD = new Set();
      out.downloads = src.downloads.filter((x) => x && /^[\w-]{1,24}$/.test(String(x.id)) && !seenD.has(x.id) && seenD.add(x.id) && typeof x.url === 'string' && /^https?:\/\//i.test(x.url)).slice(0, 200)
        .map((x) => {
          const size = Math.max(0, Math.round(+x.size) || 0);
          return { id: x.id, name: str(x.name, 140) || 'download', url: x.url.slice(0, 500), size, got: Math.min(size, Math.max(0, Math.round(+x.got) || 0)), state: DL_STATES.includes(x.state) ? x.state : 'done', ts: Number.isFinite(+x.ts) ? +x.ts : Date.now() };
        });
    }
    if (Array.isArray(src.engines)) {
      out.engines = src.engines.filter((x) => x && /^[\w-]{1,24}$/.test(x.id) && !(x.id in ENGINES) && /^https?:\/\//i.test(String(x.url)))
        .slice(0, 10).map((x) => ({ id: x.id, name: str(x.name, 30) || 'Custom', url: x.url.slice(0, 400) }));
    }
    const allE = { ...ENGINES }; out.engines.forEach((e) => { allE[e.id] = 1; });
    if (!allE[out.search]) out.search = typeof src.search === 'string' && allE[src.search] ? src.search : 'ddg';
    const cleanUrl = (u) => (typeof u === 'string' && /^(https?:\/\/|vitreous:\/\/(newtab|settings|downloads|history|bookmarks))/i.test(u) ? u.slice(0, 500) : '');
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
        const size = Object.hasOwn(SIZE_LABEL, w.size) ? w.size : (DEFAULT_SIZE[w.type] || 'sm');
        return { id: w.id, type: w.type, size, data: o };
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

  let saveTimer = 0;
  function writeStore() {
    try { localStorage.setItem(KEY, JSON.stringify({ S, tabs, activeId, ws, stacks })); } catch { /* storage unavailable */ }
  }
  /* saves are batched: a burst of slider moves writes once, 300ms after the last change */
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { saveTimer = 0; writeStore(); }, 300); }
  function flushSave() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; writeStore(); } }
  addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!raw) return;
      hasSavedState = true;
      S = sanitize(raw.S);
      if (S.spaces.some((x) => x.id === raw.ws)) ws = raw.ws; else ws = S.spaces[0].id;
      if (Array.isArray(raw.stacks)) {
        stacks = raw.stacks
          .filter((x) => x && /^\w+$/.test(String(x.id)) && S.spaces.some((s) => s.id === x.ws))
          .map((x) => ({ id: String(x.id), name: String(x.name || 'Stack').slice(0, 24), color: /^#[0-9a-f]{6}$/i.test(x.color) ? x.color : '#5aa9ff', ws: x.ws, open: !!x.open }));
      }
      if (Array.isArray(raw.tabs)) {
        tabs = raw.tabs
          .filter((t) => t && Array.isArray(t.hist) && t.hist.length && S.spaces.some((x) => x.id === t.ws))
          .map((t) => {
            const hist = t.hist.slice(-50).map((u) => normalize(String(u)));
            const i = Math.min(Math.max(+t.i || 0, 0), hist.length - 1);
            return { id: t.id && /^\w+$/.test(t.id) ? t.id : uid(), ws: t.ws, hist, i, reload: 0, stack: typeof t.stack === 'string' ? t.stack : undefined };
          });
      }
      tabs.forEach((t) => { if (t.stack && !stacks.some((s) => s.id === t.stack)) delete t.stack; });
      if (raw.activeId && tabs.some((t) => t.id === raw.activeId)) activeId = raw.activeId;
    } catch { /* corrupted state: start fresh */ }
  }

  /* ---------- tab stacks and workspace management ---------- */
  const STACK_NAME = 'Stack';
  const chevIcon = () => { const t = document.createElement('template'); t.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>'; return t.content.firstChild; };
  const plusIcon = () => { const t = document.createElement('template'); t.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'; return t.content.firstChild; };
  const stackOf = (id) => stacks.find((x) => x.id === id);
  /* sidebar and top strip share one list: a stack header, then its tabs when it is open */
  function sideEntries() {
    const out = [];
    const group = wsTabs();
    const seen = new Set();
    group.forEach((t) => {
      const st = t.stack && stacks.find((x) => x.id === t.stack && x.ws === t.ws);
      if (!st) { out.push({ kind: 'tab', t }); return; }
      if (seen.has(st.id)) return;
      seen.add(st.id);
      out.push({ kind: 'stack', st });
      if (st.open) group.filter((x) => x.stack === st.id).forEach((x) => out.push({ kind: 'tab', t: x, inStack: st.id }));
    });
    stacks.filter((s) => s.ws === ws && !seen.has(s.id)).forEach((st) => out.push({ kind: 'stack', st }));
    return out;
  }
  function stackEl(st, side) {
    return h('div', {
      class: 'tab stack' + (side ? ' side' : ''), role: 'tab', tabindex: '0', 'data-key': 's:' + st.id, 'data-stack': st.id,
      onclick: () => toggleStack(st.id),
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStack(st.id); } },
    },
      h('span', { class: 'chev', 'aria-hidden': 'true' }, chevIcon()),
      h('span', { class: 'stack-ico', 'aria-hidden': 'true' }, ico('folder')),
      h('span', { class: 't' }),
      h('span', { class: 'count' }));
  }
  function patchStack(n, st) {
    const kids = wsTabs().filter((x) => x.stack === st.id);
    n.style.setProperty('--sc', st.color);
    n.setAttribute('aria-expanded', String(!!st.open));
    n.setAttribute('aria-selected', String(kids.some((x) => x.id === activeId)));
    const t = n.querySelector('.t'), c = n.querySelector('.count');
    if (t.textContent !== st.name) t.textContent = st.name;
    const label = kids.length ? kids.length + ' tab' + (kids.length === 1 ? '' : 's') : 'Empty';
    if (c.textContent !== label) c.textContent = label;
    n.title = st.name;
  }
  function toggleStack(id) { const st = stackOf(id); if (!st) return; st.open = !st.open; render(); }
  function newStackFrom(t) { const st = { id: uid(), name: STACK_NAME, color: ACCENTS[stacks.length % ACCENTS.length], ws: t.ws, open: true }; stacks.push(st); t.stack = st.id; render(); }
  function addToStack(t, st) { t.stack = st.id; render(); }
  function renameStack(id) { const st = stackOf(id); if (!st) return; const n = prompt('Stack name', st.name); if (n && n.trim()) { st.name = n.trim().slice(0, 24); render(); } }
  function cycleStackColor(id) { const st = stackOf(id); if (!st) return; st.color = ACCENTS[(ACCENTS.indexOf(st.color) + 1) % ACCENTS.length]; render(); }
  function ungroupStack(id) { tabs.forEach((t) => { if (t.stack === id) delete t.stack; }); stacks = stacks.filter((s) => s.id !== id); render(); }
  function closeStackTabs(id) { tabs.filter((t) => t.stack === id).forEach((t) => closeTab(t.id)); }
  /* dropping one tab on another makes (or joins) a stack; dropping on a header joins that stack */
  function stackDrop(srcId, target) {
    const src = tabs.find((t) => t.id === srcId);
    if (!src) return;
    const before = src.stack;
    if (target.dataset.stack) {
      const st = stackOf(target.dataset.stack);
      if (!st || st.ws !== src.ws) return;
      src.stack = st.id;
    } else {
      const dst = tabs.find((t) => t.id === target.dataset.id);
      if (!dst || dst.id === src.id || dst.ws !== src.ws) return;
      if (dst.stack) src.stack = dst.stack;
      else {
        const st = { id: uid(), name: STACK_NAME, color: ACCENTS[stacks.length % ACCENTS.length], ws: dst.ws, open: false };
        stacks.push(st); dst.stack = st.id; src.stack = st.id;
      }
    }
    render();
    const sid = src.stack || before;
    const sEl = sid && document.querySelector('[data-stack="' + sid + '"]');
    if (sEl) { sEl.classList.remove('stack-pop'); void sEl.offsetWidth; sEl.classList.add('stack-pop'); setTimeout(() => sEl.classList.remove('stack-pop'), 500); }
  }
  /* Stack drag follows the widget drag: the tab floats with a transform on every move,
     a placeholder keeps its slot, neighbours glide with flipAnimate, and the drop settles with a FLIP.
     While dragged the tab lives on document.body: .glass panels create a containing block for
     position:fixed and clip overflow, which would otherwise trap the tab inside the sidebar. */
  function bindStackDrag(n, id) {
    n.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || (e.target.closest && e.target.closest('.x'))) return;
      const x0 = e.clientX, y0 = e.clientY;
      const list = n.parentElement;
      const d = { active: false, over: null, ph: null, hint: null, tx: 0, ty: 0 };
      const showHint = (t) => {
        if (!d.hint) return;
        if (!t) { d.hint.classList.remove('on'); return; }
        d.hint.textContent = t.dataset.stack ? 'Add to stack' : 'Make a stack';
        const r = t.getBoundingClientRect();
        Object.assign(d.hint.style, { left: (r.left + r.width / 2) + 'px', top: (r.top + r.height / 2) + 'px' });
        d.hint.classList.add('on');
      };
      const move = (ev) => {
        if (!d.active) {
          if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
          activate();
        }
        d.tx = ev.clientX - x0; d.ty = ev.clientY - y0 - 6;
        n.style.transform = `translate(${d.tx}px, ${d.ty}px) scale(1.04)`;
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const hit = el && el.closest && el.closest('.tab');
        const next = hit && hit !== n && hit.parentElement === list ? hit : null;
        if (next !== d.over) {
          if (d.over) d.over.classList.remove('stack-target');
          d.over = next;
          if (next) next.classList.add('stack-target');
          showHint(next);
        }
      };
      function activate() {
        const r = n.getBoundingClientRect();
        d.active = true;
        d.ph = h('div', { class: 'tab-ph', 'aria-hidden': 'true' });
        d.ph.style.height = r.height + 'px';
        n.parentElement.insertBefore(d.ph, n);
        document.body.append(n);
        d.hint = h('div', { class: 'drop-hint', 'aria-hidden': 'true' });
        document.body.append(d.hint);
        Object.assign(n.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', zIndex: '60', pointerEvents: 'none' });
        n.classList.add('lifting', 'dragging');
        document.body.style.userSelect = 'none';
      }
      function clearStyles() {
        Object.assign(n.style, { position: '', left: '', top: '', width: '', height: '', margin: '', zIndex: '', transform: '', pointerEvents: '' });
        n.classList.remove('lifting', 'dragging');
        document.body.style.userSelect = '';
      }
      const up = () => {
        removeEventListener('pointermove', move);
        removeEventListener('pointerup', up);
        removeEventListener('pointercancel', up);
        if (!d.active) return;
        // swallow the click that follows a drag, but only for one click
        const eat = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
        n.addEventListener('click', eat, { capture: true, once: true });
        setTimeout(() => n.removeEventListener('click', eat, { capture: true }), 0);
        const target = d.over;
        if (d.over) d.over.classList.remove('stack-target');
        if (d.hint) { d.hint.remove(); d.hint = null; }
        const from = n.getBoundingClientRect();
        if (target) {
          // fly into the target tab; the tabs below glide up as this one leaves the list
          const tr = target.getBoundingClientRect();
          const dx = (tr.left + tr.width / 2) - (from.left + from.width / 2);
          const dy = (tr.top + tr.height / 2) - (from.top + from.height / 2);
          const others = [...list.querySelectorAll('.tab')].filter((x) => x !== n);
          const startT = `translate(${d.tx}px, ${d.ty}px) scale(1.04)`;
          n.classList.remove('lifting', 'dragging');
          document.body.style.userSelect = '';
          d.ph.remove();
          const anim = n.animate([
            { transform: startT, opacity: 1 },
            { transform: `translate(${d.tx + dx}px, ${d.ty + dy}px) scale(0.85)`, opacity: 0 },
          ], { duration: 240, easing: 'cubic-bezier(.4,0,.2,1)' });
          anim.onfinish = () => { n.remove(); flipAnimate(others, () => stackDrop(id, target)); };
        } else {
          // no target: put the tab back in its slot and settle it there, same as a widget drop
          clearStyles();
          d.ph.replaceWith(n);
          const to = n.getBoundingClientRect();
          const dx = from.left - to.left, dy = from.top - to.top;
          n.animate([
            { transform: `translate(${dx}px, ${dy}px) scale(1.04)` },
            { transform: 'translate(0px, 0px) scale(1)' },
          ], { duration: 320, easing: FLIP_EASE });
        }
      };
      addEventListener('pointermove', move);
      addEventListener('pointerup', up);
      addEventListener('pointercancel', up);
    });
  }
  function tabStackEntries(id) {
    const t = tabs.find((x) => x.id === id);
    if (!t) return [];
    const out = stacks.filter((s) => s.ws === t.ws).map((s) => [`Add to “${s.name}”`, () => addToStack(t, s), t.stack === s.id]);
    out.push(['New stack from tab', () => newStackFrom(t)]);
    if (t.stack) out.push(['Remove from stack', () => { delete t.stack; render(); }]);
    return out;
  }
  function renameSpace(id) { const sp = S.spaces.find((x) => x.id === id); if (!sp) return; const n = prompt('Workspace name', sp.name); if (n && n.trim()) { sp.name = n.trim().slice(0, 24); buildSpaces(); save(); } }
  function cycleSpaceColor(id) { const sp = S.spaces.find((x) => x.id === id); if (!sp) return; sp.color = ACCENTS[(ACCENTS.indexOf(sp.color) + 1) % ACCENTS.length]; buildSpaces(); save(); }
  function newWorkspace() {
    const n = prompt('Workspace name', 'Workspace');
    if (!n || !n.trim()) return;
    const sp = { id: uid(), name: n.trim().slice(0, 24), color: ACCENTS[S.spaces.length % ACCENTS.length] };
    S.spaces.push(sp);
    buildSpaces(); save();
    switchSpace(sp.id);
  }
  function deleteSpace(id) {
    const sp = S.spaces.find((x) => x.id === id);
    if (!sp || S.spaces.length < 2) return;
    if (!confirm(`Delete “${sp.name}” and close its tabs?`)) return;
    S.spaces = S.spaces.filter((x) => x.id !== id);
    tabs = tabs.filter((t) => t.ws !== id);
    stacks = stacks.filter((s) => s.ws !== id);
    if (ws === id) ws = S.spaces[0].id;
    buildSpaces();
    if (!wsTabs().length) { newTab(undefined, ws); return; }
    if (!tabs.some((t) => t.id === activeId)) activeId = wsTabs()[wsTabs().length - 1].id;
    render();
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
    recordVisit(u);
    render();
  }
  function recordVisit(u) {
    if (!S.saveHistory || !/^https?:\/\//i.test(u)) return;
    const now = Date.now(), dup = S.history.find((x) => x.u === u && now - x.ts < 30000);
    if (dup) { dup.ts = now; return; }
    S.history.unshift({ u, t: hostOf(u).replace(/^www\./, ''), ts: now });
    if (S.history.length > 1000) S.history.length = 1000;
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
    document.querySelectorAll('.tab-list').forEach((l) => { l.classList.add('ws-switch'); setTimeout(() => l.classList.remove('ws-switch'), 360); });
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
    b.dataset.respectRm = S.respectReducedMotion ? '1' : '0';
    b.dataset.pinned = S.tabs !== 'top' && !S.collapsed ? '1' : '0';
    b.dataset.dynamicTheme = S.dynamicTheme ? '1' : '0';
    b.dataset.tabs = S.tabs;
    b.dataset.side = S.sideSide;
    b.dataset.hover = S.hoverExpand ? '1' : '0';
    ['btnBack', 'btnForward', 'btnReload', 'btnSidebar', 'btnPalette', 'btnSettings', 'bookmarkStar', 'bmNames'].forEach((k) => { b.dataset[k] = S[k] ? '1' : '0'; });
    $('#main').dataset.toolbar = S.toolbarPos;
    $('#main').dataset.strip = S.stripStyle;
    $('#main').dataset.tabfit = S.tabFit;
    try { renderBookmarksBar(); } catch { /* bar not built yet */ }
    b.dataset.shield = S.shield ? '1' : '0';
    b.dataset.lock = S.lock ? '1' : '0';
    b.dataset.home = S.showHome ? '1' : '0';
    b.dataset.addralign = S.addrAlign;
    b.dataset.favs = S.favs ? '1' : '0';
    b.dataset.close = S.closeBtn;
    b.dataset.tabShape = S.tabShape;
    /* Crazy Animations: off in Low-Spec Mode, with animations off, or with the OS reduced-motion preference when respected */
    b.dataset.crazy = motionOn() ? '1' : '0';
    /* address bar position. 'sidebar' needs the sidebar tabs, so it falls back to the toolbar when tabs are on top. */
    const addrEl = $('.address');
    const inSide = S.addrPosition === 'sidebar' && S.tabs !== 'top';
    b.dataset.addrPos = inSide ? 'sidebar' : S.addrPosition === 'left' ? 'left' : 'center';
    if (addrEl) {
      if (inSide) { if (addrEl.nextElementSibling !== $('#sideNewTab')) $('#sidebar').insertBefore(addrEl, $('#sideNewTab')); }
      else if (addrEl.previousElementSibling !== $('.nav-l')) $('.nav-l').insertAdjacentElement('afterend', addrEl);
    }
    b.dataset.blobsStill = S.blobSpeed === 0 ? '1' : '0';
    const wall = S.wallMode === 'url' ? S.wallUrl : S.wallMode === 'upload' ? wallData() : '';
    b.dataset.wall = wall ? '1' : '0';
    $('#wall').style.backgroundImage = wall ? `url("${wall.replace(/["\\\n\r]/g, (c) => encodeURIComponent(c))}")` : '';
    const r = document.documentElement.style;
    r.setProperty('--accent', S.accent);
    r.setProperty('--dynamic-color', engineThemeColor || S.accent);
    r.setProperty('--dynamic-intensity', String(S.dynamicTheme ? S.dynamicIntensity : 0));
    /* glass transparency: 0 = solid panel, 100 = clear glass. Only the panel's relation to the background changes. */
    const gl = S.glassTransparency / 100;
    const tintV = String(0.30 - gl * 0.28);
    /* blur capped at 4px so clear glass shows the background, not a frosted version of it */
    /* Low-Spec forces blur off, but transparency (--glass-solid) still applies */
    r.setProperty('--blur', S.lowfx ? '0px' : (gl * 4) + 'px');
    /* living light: lighting direction sets the sheen angle and the drop-shadow offset */
    const LIGHT = { 'top-left': { a: 135, x: 6 }, 'top-right': { a: 225, x: -6 }, center: { a: 180, x: 0 } }[S.lightDirection] || { a: 135, x: 6 };
    r.setProperty('--sheen-angle', LIGHT.a + 'deg');
    r.setProperty('--shadow-x', LIGHT.x + 'px');
    /* cursor spotlight strength, 0-100% */
    r.setProperty('--spot-a', String(S.spotlightIntensity / 100));
    document.body.dataset.breathe = S.breathingGlow ? '1' : '0';
    /* refraction edge glow scales with transparency: zero on a solid panel, full strength on clear glass */
    r.setProperty('--refraction', (S.glassRefraction * gl) + 'px');
    /* frost texture: white fractal noise whose alpha follows the slider (0 = none, 100 = light grain) */
    const frostA = (S.glassFrost / 100 * 0.22).toFixed(3);
    const frostSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 ${frostA} 0'/></filter><rect width='160' height='160' filter='url(#n)'/></svg>`;
    r.setProperty('--frost-noise', `url("data:image/svg+xml,${encodeURIComponent(frostSvg)}")`);
    r.setProperty('--tint', tintV);
    r.setProperty('--sat', (100 + S.glassTransparency * 0.5) + '%');
    r.setProperty('--glass-solid', String(1 - gl));
    /* theme body rules set --tint on body, which would shadow the value above, so mirror it there */
    if (document.body) document.body.style.setProperty('--tint', tintV);
    r.setProperty('--radius', S.radius + 'px');
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
    r.setProperty('--radius-tabs', S.tabRadius + 'px');
    r.setProperty('--radius-panels', S.panelRadius + 'px');
    r.setProperty('--radius-addr', S.addrRadius + 'px');
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
  /* re-render the start page when a start-page setting changes while it is open */
  const refreshStart = () => { const t = cur(); if (t && urlOf(t) === 'vitreous://newtab') render(); };

  /* ---------- tabs rendering (keyed, animated) ---------- */
  function tabEl(t, side) {
    const n = h('div', {
      class: 'tab' + (side ? ' side' : ''), role: 'tab', tabindex: '0', 'data-id': t.id, 'data-key': t.id,
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
    bindStackDrag(n, t.id);
    return n;
  }
  function patchTab(n, t) {
    n.setAttribute('aria-selected', String(t.id === activeId));
    n.title = urlOf(t);
    const title = titleOf(t), letter = favLetter(t);
    const tt = n.querySelector('.t'), ff = n.querySelector('.fav');
    if (tt.textContent !== title) tt.textContent = title;
    paintFav(ff, urlOf(t), letter);
  }
  function reconcile(list, entries, side) {
    const ind = list.querySelector('.indicator');
    const keyOf = (e) => (e.kind === 'stack' ? 's:' + e.st.id : e.t.id);
    const existing = new Map([...list.querySelectorAll('.tab:not(.leave)')].map((n) => [n.dataset.key, n]));
    const keep = new Set(entries.map(keyOf));
    existing.forEach((n, key) => {
      if (keep.has(key)) return;
      if (!motionOn() || list.offsetParent === null) { n.remove(); return; }
      n.classList.add('leave');
      n.addEventListener('animationend', () => n.remove(), { once: true });
      setTimeout(() => n.remove(), 450);
    });
    let prev = ind;
    entries.forEach((e) => {
      let n = existing.get(keyOf(e));
      if (!n) { n = e.kind === 'stack' ? stackEl(e.st, side) : tabEl(e.t, side); if (motionOn()) n.classList.add('enter'); }
      if (e.kind === 'stack') patchStack(n, e.st);
      else { patchTab(n, e.t); n.classList.toggle('in-stack', !!e.inStack); }
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
    const entries = sideEntries();
    reconcile($('#tabs'), entries, false);
    reconcile($('#sideTabs'), entries, true);
    const tl = $('#tabs'), act = tl.querySelector('.tab[aria-selected="true"]:not(.leave)');
    if (act && tl.offsetParent !== null) {
      const l = act.offsetLeft, r = l + act.offsetWidth;
      if (l < tl.scrollLeft) tl.scrollLeft = Math.max(0, l - 8);
      else if (r > tl.scrollLeft + tl.clientWidth) tl.scrollLeft = r - tl.clientWidth + 8;
    }
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
    updateStar();
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


  /* ---------- library pages: history, bookmarks, downloads ---------- */
  let dlTimer = 0;
  const MAX_BM = 24;
  const hostName = (u) => hostOf(u).replace(/^www\./, '');
  const timeLabel = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const dayStart = (ts) => { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  function dayLabel(ts) {
    const k = dayStart(ts), y = new Date(); y.setDate(y.getDate() - 1);
    if (k === dayStart(Date.now())) return 'Today';
    if (k === dayStart(y.getTime())) return 'Yesterday';
    return new Date(ts).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }
  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    const u = ['KB', 'MB', 'GB']; let i = -1;
    do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
    return (n >= 100 ? n.toFixed(0) : n.toFixed(1)) + ' ' + u[i];
  }
  const toUrl = (v) => {
    v = String(v || '').trim();
    if (!v) return '';
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try { const u = new URL(v); return /^https?:$/.test(u.protocol) && (u.hostname.includes('.') || u.hostname === 'localhost') ? u.href : ''; } catch { return ''; }
  };
  const openUrl = (e, url) => { if (e.ctrlKey || e.metaKey || e.button === 1) newTab(url); else navigate(cur(), url); };
  const empty = (icon, msg) => h('div', { class: 'lib-empty' }, h('span', { class: 'lib-mark' }, ico(icon)), h('span', { text: msg }));
  const actBtn = (icon, label, fn) => h('button', { class: 'icon-btn lib-act', title: label, 'aria-label': label, onclick: (e) => { e.stopPropagation(); fn(e); } }, ico(icon));
  function favFor(url) {
    const el = h('span', { class: 'fav lib-fav', 'aria-hidden': 'true' });
    paintFav(el, url, (hostName(url)[0] || '?').toUpperCase());
    return el;
  }
  const rowMain = (url, title, sub, meta) => h('button', {
    class: 'lib-main', title: url, onclick: (e) => openUrl(e, url), onauxclick: (e) => { if (e.button === 1) openUrl(e, url); },
  }, favFor(url), h('span', { class: 'lib-text' }, h('span', { class: 'lib-name', text: title }), h('span', { class: 'lib-url', text: sub })),
  meta ? h('span', { class: 'lib-meta', text: meta }) : null);
  function libSearch(placeholder, onInput) {
    const input = h('input', { type: 'text', placeholder, spellcheck: 'false', autocomplete: 'off', 'aria-label': placeholder, oninput: () => onInput(input.value) });
    return h('label', { class: 'lib-search' }, ico('search'), input);
  }
  function dangerBtn(label, fn) {
    let armed = false, timer = 0;
    const text = h('span', { text: label });
    const reset = () => { armed = false; text.textContent = label; };
    return h('button', { class: 'btn danger', onclick: () => {
      if (!armed) { armed = true; text.textContent = 'Click again to confirm'; timer = setTimeout(reset, 3000); return; }
      clearTimeout(timer); reset(); fn();
    } }, ico('trash'), text);
  }
  const dayGroups = (items, rowFn) => {
    const m = new Map();
    items.forEach((x) => { const k = dayLabel(x.ts); if (!m.has(k)) m.set(k, []); m.get(k).push(x); });
    return [...m].map(([d, xs]) => h('section', { class: 'lib-group' }, h('h3', { class: 'lib-day', text: d }), h('div', { class: 'lib-card' }, xs.map(rowFn))));
  };
  function libPage(icon, title, sub, tools, body, banner) {
    return h('div', { class: 'page' }, h('div', { class: 'lib' },
      h('div', { class: 'lib-head rise', style: '--i:0' },
        h('div', { class: 'lib-title' }, h('span', { class: 'lib-mark' }, ico(icon)), h('div', {}, h('h2', { text: title }), sub)),
        h('div', { class: 'lib-tools' }, ...tools)),
      banner || null,
      h('div', { class: 'rise', style: '--i:2' }, body)));
  }

  function historyPage() {
    let q = '';
    const sub = h('span', { class: 'lib-sub' });
    const body = h('div');
    const draw = () => {
      const n = q.trim().toLowerCase();
      const items = S.history.filter((x) => !n || x.u.toLowerCase().includes(n) || (x.t || '').toLowerCase().includes(n)).sort((a, b) => b.ts - a.ts).slice(0, 400);
      sub.textContent = `${S.history.length} ${S.history.length === 1 ? 'visit' : 'visits'}${S.saveHistory ? '' : ' · not recording'}`;
      body.replaceChildren(...(items.length
        ? dayGroups(items, (x) => h('div', { class: 'lib-row' },
          rowMain(x.u, x.t || hostName(x.u), pretty(x.u), timeLabel(x.ts)),
          actBtn('ext', 'Open in new tab', () => newTab(x.u)),
          actBtn('x', 'Remove from history', () => { S.history = S.history.filter((y) => y !== x); save(); draw(); })))
        : [empty('clock', n ? 'No matches in your history.' : 'Nothing here yet. Pages you visit will show up here.')]));
    };
    draw();
    return libPage('clock', 'History', sub, [
      libSearch('Search history', (v) => { q = v; draw(); }),
      dangerBtn('Clear history', () => { S.history = []; save(); draw(); toast('History cleared'); }),
    ], body, S.saveHistory ? null : h('div', { class: 'lib-note', text: 'History is off, so new visits are not being saved. Turn it back on in Settings, under Privacy.' }));
  }

  function bookmarksPage() {
    let q = '', editing = null;
    const sub = h('span', { class: 'lib-sub' });
    const body = h('div');
    const nameIn = h('input', { class: 'lib-input', placeholder: 'Name', maxlength: '40', 'aria-label': 'Bookmark name' });
    const urlIn = h('input', { class: 'lib-input', placeholder: 'Address, e.g. example.com', 'aria-label': 'Bookmark address' });
    const addBtn = h('button', { class: 'btn', onclick: () => add() }, ico('plus'), h('span', { text: 'Add' }));
    function add() {
      if (S.bookmarks.length >= MAX_BM) return toast(`Bookmark limit reached (${MAX_BM})`);
      const u = toUrl(urlIn.value);
      if (!u) { urlIn.focus(); return toast('Enter a valid web address'); }
      S.bookmarks.push({ name: nameIn.value.trim().slice(0, 40) || hostName(u), url: u });
      nameIn.value = ''; urlIn.value = ''; save(); draw(); toast('Bookmark added');
    }
    [nameIn, urlIn].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); }));
    const move = (i, d) => { const j = i + d; if (j < 0 || j >= S.bookmarks.length) return; [S.bookmarks[i], S.bookmarks[j]] = [S.bookmarks[j], S.bookmarks[i]]; save(); draw(); };
    function editRow(b) {
      const nIn = h('input', { class: 'lib-input', value: b.name, maxlength: '40', 'aria-label': 'Name' });
      const uIn = h('input', { class: 'lib-input', value: b.url, 'aria-label': 'Address' });
      const done = () => {
        const u = toUrl(uIn.value);
        if (!u) { uIn.focus(); return toast('Enter a valid web address'); }
        b.name = nIn.value.trim().slice(0, 40) || hostName(u); b.url = u; editing = null; save(); draw();
      };
      const cancel = () => { editing = null; draw(); };
      [nIn, uIn].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); else if (e.key === 'Escape') cancel(); }));
      setTimeout(() => nIn.focus(), 0);
      return h('div', { class: 'lib-row lib-edit' }, nIn, uIn, btn('Save', done), btn('Cancel', cancel));
    }
    function draw() {
      const n = q.trim().toLowerCase();
      sub.textContent = `${S.bookmarks.length} of ${MAX_BM} saved`;
      addBtn.disabled = S.bookmarks.length >= MAX_BM;
      const rows = S.bookmarks.map((b, i) => [b, i]).filter(([b]) => !n || b.name.toLowerCase().includes(n) || b.url.toLowerCase().includes(n));
      body.replaceChildren(rows.length
        ? h('div', { class: 'lib-card' }, rows.map(([b, i]) => (b === editing ? editRow(b) : h('div', { class: 'lib-row' },
          rowMain(b.url, b.name, pretty(b.url), ''),
          !n && i > 0 ? actBtn('up', 'Move up', () => move(i, -1)) : null,
          !n && i < S.bookmarks.length - 1 ? actBtn('down', 'Move down', () => move(i, 1)) : null,
          actBtn('edit', 'Edit bookmark', () => { editing = b; draw(); }),
          actBtn('x', 'Delete bookmark', () => { S.bookmarks = S.bookmarks.filter((y) => y !== b); save(); draw(); })))))
        : empty('bookmark', n ? 'No bookmarks match your search.' : 'No bookmarks yet. Add one above.'));
    }
    draw();
    return libPage('bookmark', 'Bookmarks', sub, [libSearch('Search bookmarks', (v) => { q = v; draw(); })],
      body, h('div', { class: 'lib-add rise', style: '--i:1' }, nameIn, urlIn, addBtn));
  }

  function downloadsPage() {
    let q = '', saves = 0;
    const sub = h('span', { class: 'lib-sub' });
    const body = h('div');
    const refs = new Map();
    const pct = (x) => (x.size ? Math.min(100, Math.floor((x.got / x.size) * 100)) : 0);
    const status = (x) => ({
      done: `${fmtBytes(x.size)} · ${timeLabel(x.ts)}`,
      progress: `${pct(x)}% · ${fmtBytes(x.got)} of ${fmtBytes(x.size)}`,
      paused: `Paused · ${pct(x)}% of ${fmtBytes(x.size)}`,
      failed: 'Failed · connection lost',
      canceled: 'Canceled',
    }[x.state]);
    const ext = (n) => ((n.match(/\.([A-Za-z0-9]{1,5})$/) || [0, 'file'])[1]).toUpperCase();
    const setState = (x, s2) => { x.state = s2; save(); draw(); };
    const remove = (x) => { S.downloads = S.downloads.filter((y) => y !== x); save(); draw(); };
    function row(x) {
      const bar = h('i'), wrap = h('div', { class: 'dl-bar' }, bar), st = h('span', { class: 'lib-url' });
      const paint = () => {
        st.textContent = hostName(x.url) + ' · ' + status(x);
        st.classList.toggle('bad', x.state === 'failed');
        bar.style.width = pct(x) + '%';
        wrap.hidden = !(x.state === 'progress' || x.state === 'paused');
        wrap.classList.toggle('paused', x.state === 'paused');
      };
      const acts = x.state === 'progress' ? [actBtn('pause', 'Pause', () => setState(x, 'paused')), actBtn('x', 'Cancel download', () => setState(x, 'canceled'))]
        : x.state === 'paused' ? [actBtn('play', 'Resume', () => setState(x, 'progress')), actBtn('x', 'Cancel download', () => setState(x, 'canceled'))]
          : x.state === 'done' ? [actBtn('ext', 'Open source page', () => newTab(x.url)), actBtn('trash', 'Remove from list', () => remove(x))]
            : [actBtn('reset', 'Retry', () => { x.got = 0; setState(x, 'progress'); }), actBtn('trash', 'Remove from list', () => remove(x))];
      paint(); refs.set(x.id, paint);
      return h('div', { class: 'lib-row' },
        h('div', { class: 'lib-main static' }, h('span', { class: 'dl-type', text: ext(x.name) }),
          h('span', { class: 'lib-text' }, h('span', { class: 'lib-name', text: x.name }), st, wrap)),
        ...acts);
    }
    const section = (label, items) => h('section', { class: 'lib-group' }, h('h3', { class: 'lib-day', text: label }), h('div', { class: 'lib-card' }, items.map(row)));
    function draw() {
      const n = q.trim().toLowerCase();
      refs.clear();
      const items = S.downloads.filter((x) => !n || x.name.toLowerCase().includes(n) || x.url.toLowerCase().includes(n)).sort((a, b) => b.ts - a.ts);
      const active = items.filter((x) => x.state === 'progress' || x.state === 'paused');
      const rest = items.filter((x) => !active.includes(x));
      const nActive = S.downloads.filter((x) => x.state === 'progress').length;
      sub.textContent = `${S.downloads.length} ${S.downloads.length === 1 ? 'download' : 'downloads'}${nActive ? ` · ${nActive} active` : ''}`;
      body.replaceChildren(...(items.length
        ? [active.length ? section('Active', active) : null, ...dayGroups(rest, row)].filter(Boolean)
        : [empty('download', n ? 'No downloads match your search.' : 'No downloads yet. Files you download will show up here.')]));
    }
    draw();
    const page = libPage('download', 'Downloads', sub, [
      libSearch('Search downloads', (v) => { q = v; draw(); }),
      dangerBtn('Clear finished', () => { S.downloads = S.downloads.filter((x) => x.state === 'progress' || x.state === 'paused'); save(); draw(); toast('Finished downloads cleared'); }),
    ], body);
    /* mock engine: active downloads advance while this page is open */
    dlTimer = setInterval(() => {
      if (!page.isConnected) { clearInterval(dlTimer); return; }
      let finished = false;
      S.downloads.forEach((x) => {
        if (x.state !== 'progress') return;
        x.got = Math.min(x.size, x.got + Math.max(1, Math.round(x.size * (0.015 + Math.random() * 0.04))));
        if (x.got >= x.size) { x.state = 'done'; x.ts = Date.now(); finished = true; } else { const p = refs.get(x.id); if (p) p(); }
      });
      if (finished || ++saves % 5 === 0) save();
      if (finished) draw();
    }, 800);
    return page;
  }

  function renderViewport() {
    const t = cur();
    const u = urlOf(t);
    const key = t.id + '|' + u + '|' + t.reload;
    if (key === viewKey) return;
    viewKey = key;
    const v = $('#content');
    clearInterval(dlTimer);
    v.replaceChildren();
    loadStart();
    if (u === 'vitreous://newtab') { v.append(startPage()); setTimeout(loadEnd, 380); }
    else if (u === 'vitreous://blank') { v.append(h('div', { class: 'page' })); setTimeout(loadEnd, 120); }
    else if (u === 'vitreous://settings') { v.append(settingsPage()); setTimeout(loadEnd, 380); }
    else if (u === 'vitreous://error') { v.append(errorPage()); setTimeout(loadEnd, 160); }
    else if (u === 'vitreous://downloads') { v.append(downloadsPage()); setTimeout(loadEnd, 300); }
    else if (u === 'vitreous://history') { v.append(historyPage()); setTimeout(loadEnd, 300); }
    else if (u === 'vitreous://bookmarks') { v.append(bookmarksPage()); setTimeout(loadEnd, 300); }
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
    renderTabs(); renderSpaces(); renderToolbar(); renderBookmarksBar(); renderQuick(); renderViewport(); save();
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
    if (url === 'vitreous://downloads') { el.classList.add('has-ico'); el.append(ico('download')); return; }
    if (url === 'vitreous://history') { el.classList.add('has-ico'); el.append(ico('clock')); return; }
    if (url === 'vitreous://bookmarks') { el.classList.add('has-ico'); el.append(ico('bookmark')); return; }
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
  const newWidget = (type) => ({ id: 'w' + uid(), type, size: DEFAULT_SIZE[type] || 'sm', data: widgetDefaults(type) });
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
  function wRss() {
    const items = [
      ['Browsers tighten privacy defaults again', 'Tech Daily', '2h'],
      ['Why glass interfaces are harder than they look', 'Design Notes', '5h'],
      ['Open-source tools worth trying this month', 'Dev Weekly', '1d'],
    ];
    return h('div', { class: 'rss' }, items.map(([t, src, ago]) => h('button', { class: 'rss-item', type: 'button', title: t, onclick: () => toast('Sample feed. Live feeds come with the engine') },
      h('span', { class: 'rss-t', text: t }), h('span', { class: 'rss-m', text: src + ' · ' + ago }))));
  }
  function wSysStats(w) {
    const meter = (label, v) => {
      const fill = h('i'), val = h('span', { text: Math.round(v) + '%' });
      const el = h('div', { class: 'st-row' }, h('div', { class: 'st-h' }, h('span', { text: label }), val), h('div', { class: 'st-bar' }, fill));
      fill.style.width = v + '%';
      return { el, set: (x) => { fill.style.width = x + '%'; val.textContent = Math.round(x) + '%'; } };
    };
    const cpu = meter('CPU', 34), mem = meter('Memory', 58);
    const root = h('div', { class: 'sys' }, cpu.el, mem.el);
    let c = 34, m = 58;
    const walk = (x, spread) => Math.min(96, Math.max(4, x + (Math.random() - 0.5) * spread));
    const iv = setInterval(() => {
      if (!root.isConnected) { clearInterval(iv); return; }
      c = walk(c, 26); m = walk(m, 6);
      cpu.set(c); mem.set(m);
    }, 1800);
    return root;
  }
  function wQuickLinks() {
    const links = [['Wikipedia', 'https://www.wikipedia.org'], ['GitHub', 'https://github.com'], ['MDN', 'https://developer.mozilla.org'], ['YouTube', 'https://www.youtube.com'],
      ['Reddit', 'https://www.reddit.com'], ['Maps', 'https://www.openstreetmap.org'], ['Weather', 'https://open-meteo.com'], ['Hacker News', 'https://news.ycombinator.com']];
    return h('div', { class: 'ql' }, links.map(([n, u]) => {
      const fav = h('span', { class: 'fav', 'aria-hidden': 'true' });
      paintFav(fav, u, n[0]);
      return h('button', { class: 'ql-b', type: 'button', title: n, onclick: () => navigate(cur(), u) }, fav, h('span', { class: 'n', text: n }));
    }));
  }
  const WIDGET_VIEW = { clock: wClock, calendar: wCalendar, notes: wNotes, todo: wTodo, countdown: wCountdown, timer: wTimer, weather: wWeather,
    rss: wRss, sysstats: wSysStats, quicklinks: wQuickLinks };

  /* ---------- widget drag-and-drop ----------
     The dragged card is position:fixed and moved only with transform on every pointermove.
     Its CSS transition is switched off inline, so it can't lag behind the pointer.
     Other widgets glide with Web Animations API FLIP: measure, reorder, animate from the old spot to the new one. */
  const FLIP_EASE = 'cubic-bezier(.32, 1.1, .4, 1)';
  function flipAnimate(items, mutate) {
    const first = items.map((el) => el.getBoundingClientRect());
    mutate();
    items.forEach((el, i) => {
      if (!el.isConnected) return;
      const last = el.getBoundingClientRect();
      const dx = first[i].left - last.left, dy = first[i].top - last.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0px, 0px)' }], { duration: 420, easing: FLIP_EASE });
    });
  }
  function enableWidgetDrag(box) {
    let d = null;
    /* only switch places when the pointer is in the middle of a widget, so the layout can't ping-pong */
    const inZone = (r, x, y) => x > r.left + r.width * 0.3 && x < r.right - r.width * 0.3 && y > r.top + r.height * 0.3 && y < r.bottom - r.height * 0.3;

    box.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || d) return;
      const card = e.target.closest('.widget');
      if (!card || card.parentNode !== box || card.classList.contains('widget-ph')) return;
      if (e.target.closest('button, input, textarea, select, a, label, [contenteditable]')) return;
      const r = card.getBoundingClientRect();
      d = { card, id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, r, ox: e.clientX - r.left, oy: e.clientY - r.top, ph: null, over: null, active: false };
      addEventListener('pointermove', onMove);
      addEventListener('pointerup', onUp);
      addEventListener('pointercancel', onUp);
    });

    function endListeners() {
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerup', onUp);
      removeEventListener('pointercancel', onUp);
      document.body.style.userSelect = '';
    }

    function activate() {
      const { card, r } = d;
      const size = [...card.classList].find((c) => /^w-(sm|md|lg)$/.test(c)) || 'w-sm';
      const ph = h('div', { class: 'widget widget-ph ' + size, 'aria-hidden': 'true' });
      box.insertBefore(ph, card);
      d.ph = ph; d.active = true;
      /* no entry animation or CSS transition while dragged: both would make the card lag or re-run */
      card.style.animation = 'none';
      card.style.setProperty('transition', 'box-shadow .25s ease', 'important');
      Object.assign(card.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', zIndex: '60' });
      card.classList.add('dragging');
      document.body.style.userSelect = 'none';
    }

    function onMove(e) {
      if (!d || e.pointerId !== d.id) return;
      if (!d.active) {
        if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
        activate();
      }
      d.x = e.clientX; d.y = e.clientY;
      const { card, ph } = d;
      card.style.transform = `translate(${d.x - d.ox - d.r.left}px, ${d.y - d.oy - d.r.top - 8}px) scale(1.05)`;

      const hit = [...box.children].find((el) => el !== card && el !== ph && el.classList.contains('widget') && inZone(el.getBoundingClientRect(), d.x, d.y));
      if (!hit) { d.over = null; return; }
      if (hit === d.over) return;
      d.over = hit;
      const kids = [...box.children];
      const hitIsBefore = kids.indexOf(hit) < kids.indexOf(ph);
      const others = kids.filter((el) => el !== card && el !== ph);
      flipAnimate(others, () => box.insertBefore(ph, hitIsBefore ? hit : hit.nextSibling));
    }

    function onUp(e) {
      if (!d || e.pointerId !== d.id) return;
      const { card, ph, active } = d;
      endListeners();
      d = null;
      if (!active) return;

      const from = card.getBoundingClientRect();
      Object.assign(card.style, { position: '', left: '', top: '', width: '', height: '', margin: '', zIndex: '', transform: '', transition: '' });
      ph.replaceWith(card); /* the card takes the placeholder's grid cell */
      const to = card.getBoundingClientRect();
      const dx = from.left - to.left, dy = from.top - to.top;
      const anim = card.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(1.05)` },
        { transform: 'translate(0px, 0px) scale(1)' },
      ], { duration: 320, easing: FLIP_EASE });
      anim.onfinish = () => card.classList.remove('dragging');
      anim.oncancel = () => card.classList.remove('dragging');

      const ids = [...box.children].filter((el) => el.dataset.id).map((el) => el.dataset.id);
      const next = ids.map((id) => S.widgets.find((w) => w.id === id)).filter(Boolean);
      if (next.length === S.widgets.length) { S.widgets = next; save(); }
    }
  }

  /* glide one element from its measured old rect to its new layout position */
  function glide(el, dx, dy, dur = 520) {
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0px, 0px)' }], { duration: dur, easing: FLIP_EASE });
  }
  /* resize: the card springs to its new size (FLIP with scale), its content fades in,
     and every sibling glides to its new grid cell. Nothing snaps. */
  function resizeWidget(card, w, name, btn) {
    const next = SIZE_NEXT[w.size] || 'sm';
    const box = card.parentNode;
    const others = [...box.children].filter((el) => el !== card);
    const cardFirst = card.getBoundingClientRect();
    const firstOthers = others.map((el) => el.getBoundingClientRect());

    w.size = next; save();
    card.classList.remove('w-sm', 'w-md', 'w-lg');
    card.classList.add('w-' + next);
    card.dataset.size = next;
    btn.title = 'Resize: ' + SIZE_LABEL[next];
    btn.setAttribute('aria-label', 'Resize ' + name + ' (' + SIZE_LABEL[next] + ')');

    const cardLast = card.getBoundingClientRect();
    const sx = cardFirst.width / (cardLast.width || 1), sy = cardFirst.height / (cardLast.height || 1);
    const dx = cardFirst.left - cardLast.left, dy = cardFirst.top - cardLast.top;
    card.style.transformOrigin = '0 0';
    const grow = card.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
      { transform: 'translate(0px, 0px) scale(1, 1)' },
    ], { duration: 560, easing: FLIP_EASE });
    grow.onfinish = () => { card.style.transformOrigin = ''; };
    grow.oncancel = () => { card.style.transformOrigin = ''; };

    [...card.children].forEach((el) => {
      if (el.classList.contains('w-head') || el.classList.contains('w-resize')) return;
      el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
        { duration: 420, delay: 150, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' });
    });

    others.forEach((el, i) => {
      const f = firstOthers[i], l = el.getBoundingClientRect();
      glide(el, f.left - l.left, f.top - l.top);
    });
  }

  function widgetCard(w, onRemove) {
    const [name, icn] = WIDGET_TYPES[w.type];
    const card = h('div', { class: 'widget glass w-' + w.size, 'data-type': w.type, 'data-size': w.size, 'data-id': w.id },
      h('div', { class: 'w-head' }, ico(icn), h('span', { text: name }),
        h('button', { class: 'x-mini', title: 'Remove widget', 'aria-label': 'Remove ' + name, onclick: () => { onRemove(); card.remove(); } }, ico('x'))),
      WIDGET_VIEW[w.type](w),
      h('button', {
        class: 'w-resize', type: 'button', title: 'Resize: ' + SIZE_LABEL[w.size], 'aria-label': 'Resize ' + name + ' (' + SIZE_LABEL[w.size] + ')',
        onclick: (e) => { e.stopPropagation(); resizeWidget(card, w, name, e.currentTarget); },
      }, ico('resize')));
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
    enableWidgetDrag(box);
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
    const custom = (S.customGreeting || '').trim();
    if (custom) return custom;
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
    const cmd = S.startLayout === 'command';
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
    if (S.startTiles && !cmd) {
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
    if (S.startHint && !cmd) {
      const hint = h('p', rise('hint'), h('kbd', { text: keyText(S.keys.palette) }), ' palette  ·  ', h('kbd', { text: keyText(S.keys.newTab) }), ' new tab  ·  ', h('kbd', { text: keyText(S.keys.sidebar) }), ' sidebar',
        h('button', { class: 'x-mini', title: 'Hide this hint', 'aria-label': 'Hide hint', onclick: () => { set('startHint', false); hint.remove(); } }, ico('x')));
      kids.push(hint);
    }
    return h('div', { class: 'page start-page layout-' + S.startLayout }, h('div', { class: 'start' }, kids), S.startWidgets && !cmd ? widgetsBlock() : null);
  }

  /* ---------- settings page ---------- */
  function dropdown(options, value, onChange, label = 'Choose an option') {
    const current = () => options.find((x) => String(x[0]) === String(value))?.[1] || label;
    const wrap = h('div', { class: 'dropdown' });
    const trigger = h('button', { type: 'button', class: 'drop-trigger', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': label },
      h('span', { class: 'drop-value', text: current() }), ico('down'));
    const menu = h('div', { class: 'drop-menu', role: 'listbox', hidden: true, 'aria-label': label });
    const close = () => { menu.hidden = true; if (menu.parentNode !== wrap) wrap.append(menu); wrap.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); removeEventListener('scroll', close, true); removeEventListener('resize', close); };
    /* fixed positioning so the menu is never clipped by its settings card; flips upward near the bottom */
    const place = () => {
      const r = trigger.getBoundingClientRect(), below = innerHeight - r.bottom - 14, above = r.top - 14, up = below < 190 && above > below;
      Object.assign(menu.style, { position: 'fixed', left: r.left + 'px', right: 'auto', width: Math.max(r.width, 180) + 'px', maxHeight: Math.min(280, up ? above : below) + 'px', zIndex: '60',
        top: up ? 'auto' : r.bottom + 7 + 'px', bottom: up ? innerHeight - r.top + 7 + 'px' : 'auto', transformOrigin: up ? 'bottom center' : 'top center' });
    };
    const open = () => { menu.hidden = false; document.body.append(menu); place(); wrap.classList.add('open'); trigger.setAttribute('aria-expanded', 'true'); addEventListener('scroll', close, true); addEventListener('resize', close); };
    const draw = () => {
      menu.replaceChildren(...options.map(([v, name]) => h('button', {
        type: 'button', class: 'drop-option', role: 'option', 'aria-selected': String(String(v) === String(value)),
        onclick: () => { value = v; trigger.querySelector('.drop-value').textContent = name; onChange(v); draw(); close(); trigger.focus(); },
      }, h('span', { text: name }), ico('check'))));
    };
    draw();
    trigger.addEventListener('click', () => { if (menu.hidden) open(); else close(); });
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); if (menu.hidden) open();
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
    const away = (e) => { if (!wrap.contains(e.relatedTarget) && !menu.contains(e.relatedTarget)) close(); };
    wrap.addEventListener('focusout', away);
    menu.addEventListener('focusout', away);
    document.addEventListener('pointerdown', (e) => { if (!menu.hidden && !wrap.contains(e.target) && !menu.contains(e.target)) close(); });
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
  /* Liquid-glass slider: custom control (no native <input type=range>), pointer + keyboard + ARIA. */
  function glassSlider({ min, max, step = 1, value, label, onInput }) {
    const TW = 36; /* thumb width, must match --tw in CSS */
    const fill = h('div', { class: 'gs-fill' });
    const thumb = h('div', { class: 'gs-thumb' });
    const el = h('div', { class: 'gs', role: 'slider', tabindex: '0', 'aria-label': label, 'aria-valuemin': min, 'aria-valuemax': max },
      h('div', { class: 'gs-track' }, fill), thumb);
    let v = value, onThumb = false, dragTimer = 0;
    const snap = (x) => Math.min(max, Math.max(min, +(Math.round((x - min) / step) * step + min).toFixed(6)));
    const paint = () => {
      el.style.setProperty('--pf', String((v - min) / (max - min || 1)));
      el.setAttribute('aria-valuenow', String(v));
    };
    const put = (n) => { n = snap(n); if (n === v) return; v = n; paint(); onInput(v); };
    const fromX = (x) => {
      const r = el.getBoundingClientRect();
      return min + Math.min(1, Math.max(0, (x - r.left - TW / 2) / ((r.width - TW) || 1))) * (max - min);
    };
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      onThumb = thumb.contains(e.target);
      el.classList.add('active');
      if (onThumb) el.classList.add('dragging');
      else { put(fromX(e.clientX)); dragTimer = setTimeout(() => el.classList.add('dragging'), 220); } /* track tap: spring to it, then drag */
      el.focus({ preventScroll: true });
    });
    el.addEventListener('pointermove', (e) => { if (el.classList.contains('active')) put(fromX(e.clientX)); });
    const end = () => { clearTimeout(dragTimer); el.classList.remove('active', 'dragging'); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
    el.addEventListener('keydown', (e) => {
      const big = Math.max(step, (max - min) / 10);
      const d = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: big, PageDown: -big }[e.key];
      if (d !== undefined) { e.preventDefault(); put(v + d); }
      else if (e.key === 'Home') { e.preventDefault(); put(min); }
      else if (e.key === 'End') { e.preventDefault(); put(max); }
    });
    paint();
    return el;
  }
  function range(key, min, max, fmt, step = 1) {
    const f = typeof fmt === 'function' ? fmt : (v) => v + fmt;
    const out = h('span', { text: f(S[key]), class: 'gs-out' });
    const sl = glassSlider({
      min, max, step, value: S[key], label: key,
      onInput: (n) => { set(key, n); out.textContent = f(n); sl.setAttribute('aria-valuetext', f(n)); },
    });
    sl.setAttribute('aria-valuetext', f(S[key]));
    return h('div', { style: 'display:flex;align-items:center;gap:14px' }, sl, out);
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
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
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
    resize: '<path d="M19 9L9 19M19 14l-5 5"/>',
    rss: '<path d="M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8"/><circle cx="6" cy="18" r="1.6"/>',
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
    download: '<path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 20h14"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>', pause: '<path d="M8 5v14M16 5v14"/>', reset: '<path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    cloud: '<path d="M6.5 18a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6-1.3A4.4 4.4 0 0 1 17 18z"/>',
    partly: '<circle cx="8" cy="8" r="2.5"/><path d="M8 2.5v1M2.5 8h1M4.1 4.1l.7.7M11.9 4.1l-.7.7"/><path d="M8 20a3.5 3.5 0 0 1-.4-7A5 5 0 0 1 17 12a3.8 3.8 0 0 1 0 8z"/>',
    rain: '<path d="M6.5 15a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6-1.3A4.4 4.4 0 0 1 17 15z"/><path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5"/>',
    snow: '<path d="M6.5 15a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6-1.3A4.4 4.4 0 0 1 17 15z"/><path d="M8 18.5h.01M12 20h.01M16 18.5h.01M10 22h.01M14 22h.01"/>',
    storm: '<path d="M6.5 14a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6-1.3A4.4 4.4 0 0 1 17 14z"/><path d="M12.5 14l-2.5 4h3l-2 4"/>',
    fog: '<path d="M4 9h16M6 13h12M4 17h16"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.500 5.600 12 3z"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="3"/><rect x="9.500" y="9.500" width="5" height="5" rx="1"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
    puzzle: '<path d="M10 4a2 2 0 1 1 4 0v1.500h3.500a1 1 0 0 1 1 1V10H20a2 2 0 1 1 0 4h-1.500v4.500a1 1 0 0 1-1 1H14V18a2 2 0 1 0-4 0v1.500H6.500a1 1 0 0 1-1-1V14H4a2 2 0 1 1 0-4h1.500V6.500a1 1 0 0 1 1-1H10z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.500M12 7.500h.01"/>',
    power: '<path d="M12 3v8M6.500 6.500a8 8 0 1 0 11 0"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="3"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    access: '<circle cx="12" cy="5" r="1.800"/><path d="M5 9l7 1.500L19 9M12 10.500V15l-3 5M12 15l3 5"/>',
  };
  const ico = (n) => { const t = document.createElement('template'); t.innerHTML = `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true">${ICONS[n]}</svg>`; return t.content.firstChild; };
  const GROUP_ICON = { appearance: 'palette', wallpaper: 'image', glass: 'drop', physics: 'sliders', type: 'type', layout: 'layout', tabs: 'tabs', spaces: 'layers', toolbar: 'sliders', start: 'home', widgets: 'grid', search: 'search', privacy: 'shield',
    startup: 'power', addrbar: 'search', cookies: 'drop', perms: 'lock', secure: 'shield', clear: 'trash', dlset: 'download', lang: 'globe', a11y: 'access', perf: 'cpu', network: 'globe', extensions: 'puzzle', about: 'info', shortcuts: 'keyboard', palette: 'command', advanced: 'code' };
  const SECTIONS = [
    ['appearance', 'Appearance', 'palette', 'Themes, colors, wallpaper, glass, fonts, layout and toolbar', ['appearance', 'wallpaper', 'glass', 'physics', 'type', 'layout', 'tabs', 'toolbar', 'spaces']],
    ['startup', 'On Startup', 'power', 'What opens when Vitreous starts and on new tabs', ['startup', 'start', 'widgets']],
    ['search', 'Search Engine', 'search', 'Default and custom search engines, address bar suggestions', ['search', 'addrbar']],
    ['privacy', 'Privacy & Security', 'shield', 'Tracking, cookies, permissions, secure connections and clearing data', ['privacy', 'cookies', 'perms', 'secure', 'clear']],
    ['downloads', 'Downloads', 'download', 'Where files are saved and how downloads behave', ['dlset']],
    ['access', 'Languages & Accessibility', 'globe', 'Language, spell check, zoom, contrast, keyboard shortcuts', ['lang', 'a11y', 'shortcuts', 'palette']],
    ['system', 'System & Performance', 'cpu', 'Hardware, memory, network, backup and reset', ['perf', 'network', 'advanced']],
    ['extensions', 'Extensions', 'puzzle', 'Installed extensions and developer options', ['extensions']],
    ['about', 'About Vitreous', 'info', 'Version, updates and project information', ['about']],
  ];
  let lastSection = 'appearance';
  let settingsGoto = null;
  let switchTimer = 0;
  function panelSwitchFx() {
    const el = document.documentElement;
    el.dataset.switching = '1';
    clearTimeout(switchTimer);
    switchTimer = setTimeout(() => delete el.dataset.switching, 200);
  }
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

  const GLASS_DEFAULTS = { glassTransparency: 70, glassRefraction: 8, glassFrost: 0, lightDirection: 'top-left', breathingGlow: false, spotlightIntensity: 50, rim: 100, shadow: 100, border: 1, radius: 22 };
  const refreshSettings = () => { const t = cur(); if (t && urlOf(t) === 'vitreous://settings') render(); };
  function resetGlassPhysics() { Object.assign(S, GLASS_DEFAULTS); apply(); save(); toast('Glass Physics reset'); refreshSettings(); }

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
            onchange: () => { let v = target.value.trim(); if (!/^(https?:\/\/|vitreous:\/\/(newtab|settings|downloads|history|bookmarks))/i.test(v)) v = 'https://' + v; try { new URL(v); cm.target = v; save(); } catch { toast('That is not a valid address'); } target.value = cm.target; } });
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
    const ddrop = (key, opts, label) => dropdown(opts, S[key], (v) => set(key, v), label);
    const permOpts = [['ask', 'Ask'], ['allow', 'Allow'], ['block', 'Block']];
    const spBoxPages = h('div', { class: 'ed' });
    const drawPages = () => {
      spBoxPages.replaceChildren(...S.startupPages.map((u, i) => {
        const inp = h('input', { type: 'text', value: u, maxlength: 500, spellcheck: 'false', 'aria-label': 'Startup page',
          onchange: () => { const v = toUrl(inp.value); if (!v) { toast('Enter a valid web address'); inp.value = S.startupPages[i]; return; } S.startupPages[i] = v; save(); inp.value = v; } });
        return h('div', { class: 'er' }, inp, ibtn('x', 'Remove', () => { S.startupPages.splice(i, 1); save(); drawPages(); }, 'danger'));
      }), h('div', { class: 'btns' },
        btn('Add page', () => { if (S.startupPages.length >= 8) { toast('Limit of 8 pages'); return; } S.startupPages.push('https://example.com'); save(); drawPages(); }),
        btn('Use open tabs', () => { const us = tabs.map(urlOf).filter((u) => /^https?:\/\//i.test(u)).slice(0, 8); if (!us.length) { toast('No web pages are open'); return; } S.startupPages = us; save(); drawPages(); })));
    };
    const extBox = h('div', { class: 'ed' });
    const drawExt = () => {
      extBox.replaceChildren(...S.extensions.map((x) => {
        const sw = h('button', { class: 'switch', role: 'switch', 'aria-label': x.name, 'aria-checked': String(x.on), onclick: () => { x.on = !x.on; sw.setAttribute('aria-checked', String(x.on)); save(); } });
        return h('div', { class: 'er ext' }, h('span', { class: 'ext-ico', text: x.name[0].toUpperCase() }),
          h('div', { class: 'ext-meta' }, h('b', { text: x.name }), h('small', { text: `${x.desc} · v${x.ver}` })), sw,
          ibtn('x', 'Remove ' + x.name, () => { if (!confirm(`Remove “${x.name}”?`)) return; S.extensions = S.extensions.filter((y) => y !== x); save(); drawExt(); }, 'danger'));
      }), h('div', { class: 'btns' },
        btn('Browse extensions', () => toast('The extension store arrives with the engine layer')),
        S.extDev ? btn('Load unpacked…', () => toast('Unpacked extensions need the engine layer')) : null,
        S.extensions.length ? null : h('span', { class: 'lib-url', text: 'No extensions installed.' })));
    };
    drawPages(); drawExt();
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
        row('Animations', 'Background drift, transitions and effects', toggle('motion')),
        row('Follow system reduced-motion', 'Off by default. Turn on to let your OS "reduce animations" setting disable them', toggle('respectReducedMotion')),
        row('Low-Spec Mode', 'Optimizes performance for older hardware.', toggle('lowfx')),
        row('Match browser theme to website', 'Uses the rendering engine theme-color signal when available', toggle('dynamicTheme')),
        row('Website theme intensity', 'How strongly the website color tints the glass', range('dynamicIntensity', 0, 30, '%'))),

      group('physics', 'Glass Physics', gi++,
        h('div', { class: 'warn', text: 'Fine-tune the physical properties of the glass.' }),
        h('div', { class: 'tp-stage', 'aria-hidden': 'true' },
          h('div', { class: 'tp-preview glass' },
            h('strong', { text: 'Preview' }),
            h('span', { text: 'Changes apply live as you drag' }),
            h('i', { class: 'tp-swatch' }))),
        row('Glass transparency', 'How see-through the glass is. 0% is solid, 100% is clear glass.', range('glassTransparency', 0, 100, '%')),
        row('Refraction', 'Edge glow that simulates thick glass.', range('glassRefraction', 0, 20, 'px')),
        row('Frost Texture', 'Subtle grain that simulates frosted glass.', range('glassFrost', 0, 100, '%')),
        row('Lighting direction', 'Which way the glass catches light and throws its shadow', seg([['top-left', 'Top-Left'], ['top-right', 'Top-Right'], ['center', 'Center']], 'lightDirection')),
        row('Breathing glow', 'Background glow slowly pulses on a 6-second loop', toggle('breathingGlow')),
        row('Cursor spotlight', 'Strength of the light that follows the pointer over glass', range('spotlightIntensity', 0, 100, '%')),
        row('Edge highlight', null, range('rim', 0, 100, '%')),
        row('Shadow strength', null, range('shadow', 0, 100, '%')),
        row('Border width', null, range('border', 0, 3, 'px')),
        row('Corner radius', null, range('radius', 4, 36, 'px')),
        row('Reset', 'Restores every glass property above to its default', btn('Reset Glass Physics', resetGlassPhysics, 'danger'))),

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
        row('Sidebar side', null, seg([['left', 'Left'], ['right', 'Right']], 'sideSide')),
        row('Tab radius', 'Corner radius of tabs and their highlight', range('tabRadius', 0, 36, 'px')),
        row('Tab shape', 'Rounded, flat, pill or folder. The highlight follows the same shape', seg([['rounded', 'Rounded'], ['flat', 'Flat'], ['pill', 'Pill'], ['folder', 'Folder']], 'tabShape')),
        row('Panel radius', 'Corner radius of glass panels, sidebar and widgets', range('panelRadius', 0, 36, 'px')),
        row('Address bar radius', 'Corner radius of the address bar', range('addrRadius', 0, 36, 'px')),
        row('Address bar position', 'Top center, top left, or inside the sidebar (sidebar tabs only)', seg([['center', 'Top Center'], ['left', 'Top Left'], ['sidebar', 'In Sidebar']], 'addrPosition'))),

      group('tabs', 'Tabs', gi++,
        row('Top tab width', 'Applies when tabs are on top', range('tabWidth', 110, 320, 'px')),
        row('Tab bar style', 'Applies when tabs are on top', seg([['glass', 'Glass bar'], ['float', 'Floating'], ['compact', 'Compact']], 'stripStyle')),
        row('Tab sizing', 'Fit shares the bar between tabs. Fixed keeps one width and scrolls', seg([['fit', 'Fit'], ['fixed', 'Fixed']], 'tabFit')),
        row('Show tab icons', null, toggle('favs')),
        row('Site icons', 'Load each site’s own icon straight from that site. Off shows a letter badge', toggle('siteIcons')),
        row('Close button', null, seg([['hover', 'On hover'], ['always', 'Always'], ['never', 'Hidden']], 'closeBtn'))),

      group('toolbar', 'Toolbar & address bar', gi++,
        row('Back button', null, toggle('btnBack')),
        row('Forward button', null, toggle('btnForward')),
        row('Reload button', null, toggle('btnReload')),
        row('Sidebar button', 'Toggles the sidebar from the toolbar', toggle('btnSidebar')),
        row('Command palette button', null, toggle('btnPalette')),
        row('Settings button', null, toggle('btnSettings')),
        row('Bookmark star', 'Save the current page from the address bar', toggle('bookmarkStar')),
        row('Toolbar position', 'Bottom puts the address bar under the page', seg([['top', 'Top'], ['bottom', 'Bottom']], 'toolbarPos')),
        row('Bookmarks bar', null, seg([['never', 'Never'], ['newtab', 'New tab only'], ['always', 'Always']], 'bmBar')),
        row('Bookmark names', 'Off shows icons only', toggle('bmNames')),
        row('Home button', 'Opens your homepage, or the start page', toggle('showHome')),
        row('Privacy shield button', null, toggle('shield')),
        row('Lock icon in address bar', null, toggle('lock')),
        row('Address bar width', null, range('addrWidth', 360, 1100, 'px')),
        row('Address text', null, seg([['center', 'Centered'], ['left', 'Left']], 'addrAlign'))),

      group('spaces', 'Spaces', gi++, spBox),

      group('start', 'Start page', gi++,
        row('Logo', null, toggle('startLogo')),
        row('Title', 'Leave empty to hide', text('startTitle', 'vitreous', '200px', 40)),
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

      group('search', 'Search engines', gi++,
        engineBox, engineEd),

      group('privacy', 'Privacy', gi++,
        row('Block trackers and ads', null, toggle('trackers')),
        row('HTTPS-only', 'Upgrade http:// addresses to https://', toggle('https')),
        row('Fingerprint resistance', null, toggle('fingerprint')),
        row('Send Do Not Track', null, toggle('dnt')),
        row('Remember browsing history', 'Off stops new visits being saved to History', toggle('saveHistory')),
        h('div', { class: 'warn', text: 'Prototype note: HTTPS-only and the search engine already work. Tracker blocking, fingerprint resistance and Do Not Track switch on once the engine layer is connected.' })),

      group('shortcuts', 'Shortcuts', gi++, h('div', { class: 'warn', text: 'Click a shortcut, then press the new keys. Shortcuts need Ctrl or Alt.' }), keyBox),

      group('palette', 'Command palette', gi++, h('div', { class: 'warn', text: 'Add your own entries to the palette (Ctrl K by default): open a site, run any action, or flip a setting.' }), cmdBox),

      group('advanced', 'Advanced', gi++,
        h('div', { class: 'row col' }, h('div', {}, 'Custom CSS', h('small', { text: 'Applied on top of everything else. Variables like --accent, --radius and --blur are available.' })), css),
        row('Back up settings', 'Export to a file, or load one from another device', h('div', { class: 'btns' }, importFile, btn('Export', exportSettings), btn('Import…', () => importFile.click()))),
        row('Reset all settings', 'Restores every default. Tabs stay open', btn('Reset…', () => { if (confirm('Reset every setting to its default?')) { setWall(''); replaceSettings(clone(DEFAULTS)); toast('Settings reset'); } }, 'danger'))),


      group('startup', 'When Vitreous starts', gi++,
        row('Start page layout', 'Centered, left-aligned, or Command Mode: just the search box, no tiles or widgets', seg([['centered', 'Centered'], ['left', 'Left-aligned'], ['command', 'Command Mode']], 'startLayout', refreshStart)),
        row('Greeting', 'Shows a line above the start page', toggle('startGreeting', refreshStart)),
        row('Custom greeting', 'Leave empty for a random greeting that changes each session', text('customGreeting', 'e.g. Welcome back, Sam', '240px', 120, refreshStart)),
        row('On startup', 'Session restore and specific pages apply once the engine layer is connected', ddrop('startup', [['start', 'Open the start page'], ['restore', 'Continue where you left off'], ['pages', 'Open specific pages']], 'On startup')),
        spBoxPages,
        row('New tabs open', null, seg([['start', 'Start page'], ['blank', 'Blank'], ['home', 'Homepage']], 'newTabMode')),
        row('Homepage', 'http(s) address, used by the home button and new tabs', (() => {
          const i = h('input', { type: 'text', value: S.homepage, placeholder: 'https://…', spellcheck: 'false', maxlength: 300, 'aria-label': 'Homepage',
            onchange: () => { let v = i.value.trim(); if (v && !/^https?:\/\//i.test(v)) v = 'https://' + v; try { if (v) v = new URL(v).href; set('homepage', v); } catch { toast('That is not a valid URL'); } i.value = S.homepage; } });
          return i;
        })())),

      group('addrbar', 'Address bar', gi++,
        row('Address bar suggestions', 'Show matching bookmarks, history and commands as you type', toggle('suggest')),
        row('Search suggestions', 'Send what you type to the search engine to get suggestions', toggle('searchSuggest'))),

      group('cookies', 'Cookies and site data', gi++,
        row('Cookies', null, ddrop('cookies', [['all', 'Allow all cookies'], ['third', 'Block third-party cookies'], ['block', 'Block all cookies']], 'Cookies')),
        row('Clear cookies and site data when Vitreous closes', null, toggle('clearOnExit')),
        row('Block pop-ups and redirects', null, toggle('blockPopups'))),

      group('perms', 'Site permissions', gi++,
        row('Location', null, ddrop('permLocation', permOpts, 'Location')),
        row('Camera', null, ddrop('permCamera', permOpts, 'Camera')),
        row('Microphone', null, ddrop('permMic', permOpts, 'Microphone')),
        row('Notifications', null, ddrop('permNotify', permOpts, 'Notifications'))),

      group('secure', 'Security', gi++,
        row('Safe browsing', 'Warn about dangerous sites and downloads', ddrop('safeBrowsing', [['off', 'Off'], ['standard', 'Standard'], ['enhanced', 'Enhanced']], 'Safe browsing')),
        row('Use secure DNS', 'Encrypts the lookup of site addresses', toggle('secureDns')),
        row('DNS provider', null, ddrop('dnsProvider', [['cloudflare', 'Cloudflare'], ['quad9', 'Quad9'], ['mullvad', 'Mullvad'], ['nextdns', 'NextDNS']], 'DNS provider')),
        row('WebRTC IP handling', 'Stops sites learning your local network address', ddrop('webrtc', [['default', 'Default'], ['public', 'Public interface only'], ['off', 'Disable non-proxied UDP']], 'WebRTC')),
        row('Global Privacy Control', 'Tells sites not to sell or share your data', toggle('gpc'))),

      group('clear', 'Clear browsing data', gi++,
        row('Browsing history', 'Everything on the History page', dangerBtn('Clear', () => { S.history = []; save(); toast('History cleared'); })),
        row('Download list', 'Removes entries, not the files', dangerBtn('Clear', () => { S.downloads = S.downloads.filter((x) => x.state === 'progress' || x.state === 'paused'); save(); toast('Download list cleared'); })),
        row('Cookies and site data', null, dangerBtn('Clear', () => toast('Cookies cleared (mock until the engine layer)'))),
        row('Cached images and files', null, dangerBtn('Clear', () => toast('Cache cleared (mock until the engine layer)')))),

      group('dlset', 'Downloads', gi++,
        row('Location', 'Where files are saved', text('dlDir', '~/Downloads', '240px', 200)),
        row('Ask where to save each file', null, toggle('dlAsk')),
        row('Open files when they finish', null, toggle('dlOpen')),
        row('Show the Downloads page when one starts', null, toggle('dlShelf')),
        row('Simultaneous downloads', null, range('dlParallel', 1, 8, '')),
        row('Download list', 'Active, finished and failed downloads', btn('Open Downloads', () => navigate(cur(), 'vitreous://downloads')))),

      group('lang', 'Languages', gi++,
        row('Browser language', null, ddrop('lang', [['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['sv-SE', 'Svenska'], ['de-DE', 'Deutsch'], ['fr-FR', 'Français'], ['es-ES', 'Español'], ['pt-BR', 'Português (Brasil)'], ['ja-JP', '日本語'], ['zh-CN', '中文 (简体)']], 'Language')),
        row('Spell check', null, toggle('spellcheck')),
        row('Offer to translate pages', 'When a page is not in your language', toggle('translate'))),

      group('a11y', 'Accessibility', gi++,
        row('Default page zoom', null, range('pageZoom', 50, 300, '%', 10)),
        row('Minimum font size', '0 leaves sites in control', range('minFont', 0, 24, (v) => (v ? v + 'px' : 'None'))),
        row('High contrast', 'Stronger text and borders on pages', toggle('highContrast')),
        row('Always show focus outlines', null, toggle('focusRing')),
        row('Caret browsing', 'Move through pages with the keyboard cursor', toggle('caret')),
        row('Follow system reduced-motion', 'Respect your OS setting for animations', toggle('respectReducedMotion'))),

      group('perf', 'Performance', gi++,
        row('Hardware acceleration', 'Use the GPU when available', toggle('hwAccel')),
        row('Memory saver', 'Put tabs you are not using to sleep', toggle('memorySaver')),
        row('Sleep inactive tabs after', null, ddrop('sleepAfter', [['5', '5 minutes'], ['15', '15 minutes'], ['30', '30 minutes'], ['60', '1 hour']], 'Sleep after')),
        row('Preload pages', 'Speeds up navigation to pages you are likely to open', toggle('preload')),
        row('Keep running in the background', 'Lets downloads finish after the last window closes', toggle('bgRun')),
        row('Low-Spec Mode', 'Optimizes performance for older hardware.', toggle('lowfx')),
        row('Open tabs', null, h('span', { class: 'gs-out', text: `${tabs.length} open` }))),

      group('network', 'Network', gi++,
        row('Proxy', null, ddrop('proxy', [['system', 'Use system settings'], ['none', 'No proxy'], ['manual', 'Manual']], 'Proxy')),
        row('Proxy address', 'host:port, used when Proxy is Manual', text('proxyAddr', 'proxy.example.com:8080', '240px', 120))),

      group('extensions', 'Extensions', gi++,
        h('div', { class: 'warn', text: 'Preview list. Extensions run once the engine layer is connected.' }), extBox,
        row('Developer mode', 'Shows options for loading unpacked extensions', toggle('extDev', () => drawExt()))),

      group('about', 'About Vitreous', gi++,
        row('Version', null, h('span', { class: 'gs-out', text: VERSION })),
        row('Rendering engine', null, h('span', { class: 'gs-out', text: 'Mock engine (sandboxed preview)' })),
        row('Update channel', null, ddrop('channel', [['stable', 'Stable'], ['beta', 'Beta'], ['nightly', 'Nightly']], 'Update channel')),
        row('Updates', 'Last checked just now', (() => { const b = btn('Check for updates', () => { b.disabled = true; b.textContent = 'Checking…'; setTimeout(() => { b.disabled = false; b.textContent = 'Check for updates'; toast('Vitreous is up to date'); }, 900); }); return b; })()),
        row('Platform', null, h('span', { class: 'gs-out', text: (navigator.platform || 'Unknown').slice(0, 30) })),
        row('Usage data', 'Vitreous collects no analytics or crash reports', h('span', { class: 'gs-out', text: 'None' })),
        row('Source code', 'github.com/yazoniplay/Vitreous-browser', btn('Open', () => newTab('https://github.com/yazoniplay/Vitreous-browser')))),

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
      panelSwitchFx();
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
      ['Open History', '', () => navigate(cur(), 'vitreous://history')],
      ['Open Downloads', '', () => navigate(cur(), 'vitreous://downloads')],
      ['Open Bookmarks', '', () => navigate(cur(), 'vitreous://bookmarks')],
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
  /* ---------- pinned sites grid ---------- */
  function renderQuick() {
    const q = $('#quick');
    if (!q) return;
    $('#quickGrid').replaceChildren(...(S.quickLinks || []).filter((l) => l && l.url && l.name).map((l) => {
      const fav = h('span', { class: 'fav', 'aria-hidden': 'true' });
      paintFav(fav, l.url, (l.name[0] || '?').toUpperCase());
      return h('button', { type: 'button', class: 'pin', title: l.name + '  ·  ' + l.url, 'data-url': l.url, onclick: () => navigate(cur(), l.url) }, fav);
    }));
  }
  /* ---------- bookmark star and bookmarks bar ---------- */
  const sameUrl = (a, b) => { try { return new URL(a).href === new URL(b).href; } catch { return a === b; } };
  let bmBarKey = '';
  function renderBookmarksBar() {
    const bar = $('#bmbar');
    if (!bar) return;
    const t = cur(), u = t ? urlOf(t) : '';
    const show = S.bmBar === 'always' || (S.bmBar === 'newtab' && u === 'vitreous://newtab');
    bar.hidden = !show;
    if (!show) return;
    const key = JSON.stringify(S.bookmarks) + '|' + S.siteIcons;
    if (key === bmBarKey) return;
    bmBarKey = key;
    bar.replaceChildren(...(S.bookmarks.length ? S.bookmarks.map((b) => {
      const fav = h('span', { class: 'fav', 'aria-hidden': 'true' });
      paintFav(fav, b.url, (b.name[0] || '?').toUpperCase());
      return h('button', {
        class: 'bm', type: 'button', title: b.name + '  ·  ' + b.url, 'data-url': b.url,
        onclick: (e) => { if (e.ctrlKey || e.metaKey) newTab(b.url); else navigate(cur(), b.url); },
        onauxclick: (e) => { if (e.button === 1) { e.preventDefault(); newTab(b.url); } },
      }, fav, h('span', { class: 'n', text: b.name }));
    }) : [h('span', { class: 'bm-empty', text: 'Press the star in the address bar to bookmark a page' })]));
  }
  function updateStar() {
    const t = cur(), star = $('#bmStar');
    if (!t || !star) return;
    const u = urlOf(t), on = !INTERNAL.includes(u) && S.bookmarks.some((b) => sameUrl(b.url, u));
    star.classList.toggle('on', on);
    star.setAttribute('aria-pressed', String(on));
    star.title = on ? 'Remove bookmark' : 'Bookmark this page';
  }
  function toggleBookmark() {
    const t = cur(), u = urlOf(t);
    if (INTERNAL.includes(u)) { toast('Open a website to bookmark it'); return; }
    const i = S.bookmarks.findIndex((b) => sameUrl(b.url, u));
    if (i >= 0) { S.bookmarks.splice(i, 1); toast('Bookmark removed'); }
    else {
      if (S.bookmarks.length >= 24) { toast('Limit of 24 bookmarks'); return; }
      S.bookmarks.push({ name: titleOf(t).slice(0, 40) || hostOf(u), url: u });
      toast('Bookmarked');
    }
    save(); renderBookmarksBar(); updateStar();
  }
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
    const qlItem = e.target.closest && e.target.closest('.ql[data-url]');
    if (qlItem) {
      const url = qlItem.dataset.url;
      openContextMenu(e, [
        ['Open', () => navigate(cur(), url)],
        ['Open in new tab', () => newTab(url)],
        ['Remove from pinned', () => { S.quickLinks = S.quickLinks.filter((l) => l.url !== url); save(); renderQuick(); }],
      ]);
      return;
    }
    const bmItem = e.target.closest && e.target.closest('.bm[data-url]');
    if (bmItem) {
      const url = bmItem.dataset.url;
      openContextMenu(e, [
        ['Open', () => navigate(cur(), url)],
        ['Open in new tab', () => newTab(url)],
        ['Remove bookmark', () => { S.bookmarks = S.bookmarks.filter((b) => b.url !== url); save(); renderBookmarksBar(); updateStar(); }],
      ]);
      return;
    }
    const spaceBtn = e.target.closest && e.target.closest('.space[data-id]');
    if (spaceBtn) {
      const sid = spaceBtn.dataset.id;
      openContextMenu(e, [
        ['Rename', () => renameSpace(sid)],
        ['Change color', () => cycleSpaceColor(sid)],
        ['Delete', () => deleteSpace(sid), S.spaces.length < 2],
      ]);
      return;
    }
    const stackHead = e.target.closest && e.target.closest('.tab.stack');
    if (stackHead) {
      const sid = stackHead.dataset.stack;
      openContextMenu(e, [
        [stackOf(sid)?.open ? 'Collapse' : 'Expand', () => toggleStack(sid)],
        ['Rename stack', () => renameStack(sid)],
        ['Change color', () => cycleStackColor(sid)],
        ['Ungroup', () => ungroupStack(sid)],
        ['Close all tabs in stack', () => closeStackTabs(sid)],
      ]);
      return;
    }
    if (tab) {
      const id = tab.dataset.id;
      openContextMenu(e, [
        ...tabStackEntries(id),
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
    ['bookmark', 'Bookmark this page', toggleBookmark],
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
    }, h('span', { class: 'dot', style: `background:${sp.color};color:${sp.color}` }), h('span', { class: 'sl', text: sp.name }))),
    h('button', { type: 'button', class: 'space space-add', title: 'New workspace', 'aria-label': 'New workspace', onclick: newWorkspace }, plusIcon()));
  }

  const sideWrapEl = $('#sideWrap');
  sideWrapEl.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') document.body.classList.add('side-hot'); });
  sideWrapEl.addEventListener('pointerleave', () => document.body.classList.remove('side-hot'));
  $('#newTab').addEventListener('click', () => newTab());
  $('#sideNewTab').addEventListener('click', () => newTab());
  $('#back').addEventListener('click', () => go(-1));
  $('#forward').addEventListener('click', () => go(1));
  $('#reload').addEventListener('click', () => { cur().reload++; render(); });
  $('#home').addEventListener('click', goHome);
  $('#bmStar').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(); });
  $('#tbSidebar').addEventListener('click', toggleSidebar);
  $('#tbPalette').addEventListener('click', openPal);
  $('#tbSettings').addEventListener('click', () => openSettings());
  $('#pin').addEventListener('click', toggleSidebar);
  $('#openSettings').addEventListener('click', () => openSettings());
  $('#shield').addEventListener('click', () => openSettings('grp-privacy'));
  $('#palBtn').addEventListener('click', openPal);
  $('#addr').addEventListener('focus', (e) => { const u = urlOf(cur()); e.target.value = INTERNAL.includes(u) ? '' : u; e.target.select(); });
  $('#addr').addEventListener('blur', renderToolbar);
  $('#addrClear').addEventListener('mousedown', (e) => { e.preventDefault(); const i = $('#addr'); i.value = ''; i.dispatchEvent(new Event('input')); i.focus(); });
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

  /* ---------- Crazy Animations: ripple clicks, parallax background, magnetic close buttons ---------- */
  const crazyOn = () => motionOn();

  let parallaxFrame = 0;
  addEventListener('pointermove', (e) => {
    if (parallaxFrame) return;
    parallaxFrame = requestAnimationFrame(() => {
      parallaxFrame = 0;
      const root = document.documentElement.style;
      if (!crazyOn()) { root.setProperty('--parallax-x', '0px'); root.setProperty('--parallax-y', '0px'); return; }
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      root.setProperty('--parallax-x', (-nx * 14).toFixed(1) + 'px');
      root.setProperty('--parallax-y', (-ny * 10).toFixed(1) + 'px');
    });
  }, { passive: true });

  addEventListener('pointermove', (e) => {
    const on = crazyOn();
    document.querySelectorAll('.tab .x').forEach((x) => {
      if (!on) { if (x.style.translate) x.style.translate = ''; return; }
      const r = x.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < 40) x.style.translate = `${(dx / d * 4).toFixed(2)}px ${(dy / d * 4).toFixed(2)}px`;
      else if (x.style.translate) x.style.translate = '';
    });
  }, { passive: true });

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => placeIndicators());
    ro.observe($('#sideTabs')); ro.observe($('#tabs'));
  }
  addEventListener('resize', placeIndicators);

  /* ---------- boot ---------- */
  load();
  /* Low-Spec Mode is opt-in only. It used to switch on by itself for devices reporting <= 4 GB,
     which stripped the animations and glass. One-time reset for profiles where that already happened. */
  try {
    if (localStorage.getItem('vitreous.lowSpecNoticeShown') === '1' && localStorage.getItem('vitreous.lowSpecReset') !== '1') {
      S.lowfx = false;
      localStorage.setItem('vitreous.lowSpecReset', '1');
      save();
    }
  } catch { /* storage unavailable */ }
  buildSpaces();
  apply();
  if (!tabs.length) tabs.push({ id: uid(), ws, hist: ['vitreous://newtab'], i: 0, reload: 0 });
  if (!tabs.some((t) => t.id === activeId)) { const g = wsTabs(); activeId = (g[0] || tabs[0]).id; ws = cur().ws; }
  render();
  if (autoLowSpecNotice) {
    let noticeShown = false;
    try {
      noticeShown = localStorage.getItem('vitreous.lowSpecNoticeShown') === '1';
      if (!noticeShown) localStorage.setItem('vitreous.lowSpecNoticeShown', '1');
    } catch { /* show once per session if storage is unavailable */ }
    if (!noticeShown) setTimeout(() => toast('Low-Spec Mode enabled for this device. You can turn it off in Settings.'), 500);
    save();
  }
})();
