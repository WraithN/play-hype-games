'use strict';

/** 渲染层：所有 HTML 模板集中在这里，方便统一改视觉。 */

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonLd(obj) {
  // 避免 </script> 提前闭合
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/* ---------------- 图标（内联 SVG，保持风格统一） ---------------- */

const ICON_PATHS = {
  io: '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"/><path d="M12 8v8M8 12h8"/>',
  idle: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  action: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>',
  strategy: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  '2p': '<circle cx="9" cy="8" r="3"/><circle cx="16" cy="10" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14 20c0-2.4 1.6-4.4 4-4.8"/>',
  chromebook: '<rect x="3" y="5" width="18" height="11" rx="1.5"/><path d="M2 19h20"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
  flame: '<path d="M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-1.6.6-2.8 1.6-4 .6 1.6 1.2 2.2 2 2.6-.4-2.4.4-4.6 1.4-7.6Z"/>',
  spark: '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M18.4 5.6l-4.2 4.2M9.8 14.2l-4.2 4.2"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  play: '<path d="M8 5 19 12 8 19Z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};

function icon(name, size) {
  const s = size || 18;
  const body = ICON_PATHS[name] || ICON_PATHS.grid;
  return `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/* ---------------- 站点外壳 ---------------- */

function layout(opts) {
  const s = opts.settings;
  const canonical = opts.canonical || s.domain;
  const title = opts.title ? `${opts.title} | ${s.siteName}` : `${s.siteName} — ${s.tagline}`;
  const desc = opts.description || s.description;
  const ogImage = opts.ogImage || `${s.domain}/assets/og-default.png`;
  const defaultOg = !opts.ogImage;
  const ga4 = /^G-[A-Z0-9]{4,}$/i.test(String(s.ga4Id || '').trim()) ? String(s.ga4Id).trim() : '';
  const gsv = String(s.googleSiteVerification || '').replace(/[^A-Za-z0-9_-]/g, '');

  const navItems = [
    { href: '/', label: 'Home', key: 'home' },
    { href: '/new', label: 'New Games', key: 'new' },
    { href: '/trending', label: 'Trending', key: 'trending' },
    ...s.categories.slice(0, 5).map((c) => ({
      href: `/category/${c.slug}`,
      label: c.name.replace(' Games', ''),
      key: c.slug
    }))
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${esc(opts.robots || 'index,follow,max-image-preview:large')}">
${gsv ? `<meta name="google-site-verification" content="${esc(gsv)}">` : ''}
${opts.noCanonical ? '' : `<link rel="canonical" href="${esc(canonical)}">`}
<meta property="og:site_name" content="${esc(s.siteName)}">
<meta property="og:type" content="${esc(opts.ogType || 'website')}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
${defaultOg ? '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="PLAY HYPE GAMES — free browser games">' : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
${ogImage ? `<meta name="twitter:image" content="${esc(ogImage)}">` : ''}
<link rel="preconnect" href="https://img.gamemonetize.com" crossorigin>
${opts.preloadImage ? `<link rel="preload" as="image" href="${esc(opts.preloadImage)}" fetchpriority="high">` : ''}
<link rel="icon" href="/assets/favicon.svg?v=3" type="image/svg+xml" sizes="any">
<link rel="icon" href="/assets/favicon-32.png?v=3" sizes="32x32" type="image/png">
<link rel="icon" href="/assets/favicon-192.png?v=3" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png?v=3">
<script>
(function(){try{var t=localStorage.getItem('ph-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();
</script>
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/baloo-2-latin.woff2" crossorigin>
<link rel="stylesheet" href="/assets/style.css?v=16">
<link rel="stylesheet" href="/assets/hype.css?v=16">
${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${s.domain}/#organization`,
    name: s.siteName,
    alternateName: ['PlayHypeGames', 'Play Hype', 'Play Hype Games'],
    url: `${s.domain}/`,
    description: s.description,
    email: s.contactEmail,
    disambiguatingDescription:
      'Independent browser-game directory. Not affiliated with any iOS game studio, app publisher or other company that may use a similar name.',
    knowsAbout: ['Browser games', 'HTML5 games', 'Free online games'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: s.contactEmail,
      url: `${s.domain}/contact`,
      availableLanguage: 'English'
    }
  })}
${opts.head || ''}
${ga4 ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4)}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', '${ga4}', { anonymize_ip: true });
(function () {
  if (!window.gtag) return;
  var lcp = 0, cls = 0, inp = 0, sent = false;
  function safe(fn) { try { fn(); } catch (e) {} }
  safe(function () {
    new PerformanceObserver(function (list) {
      var e = list.getEntries(); lcp = e[e.length - 1].startTime || lcp;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  safe(function () {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) { if (!e.hadRecentInput) cls += e.value; });
    }).observe({ type: 'layout-shift', buffered: true });
  });
  safe(function () {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) { if (e.duration > inp) inp = e.duration; });
    }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
  });
  function send() {
    if (sent) return;
    sent = true;
    if (!lcp && !cls && !inp) return;
    gtag('event', 'web_vitals', {
      metric_lcp: Math.round(lcp),
      metric_cls: Math.round(cls * 1000) / 1000,
      metric_inp: Math.round(inp),
      page_path: location.pathname
    });
  }
  addEventListener('pagehide', send, { once: true });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') send();
  });
})();
</script>` : ''}
</head>
<body${opts.bodyClass ? ` class="${esc(opts.bodyClass)}"` : ''}>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">
      <span class="brand-mark">${icon('play', 15)}</span>
      <span class="brand-name">${esc(s.siteName)}</span>
    </a>
    <nav class="main-nav" aria-label="Main navigation">
      ${navItems
        .map(
          (n) =>
            `<a href="${n.href}" class="nav-item${opts.active === n.key ? ' is-active' : ''}">${esc(n.label)}</a>`
        )
        .join('')}
    </nav>
    <form class="search-form" action="/search" method="get" role="search">
      ${icon('search', 16)}
      <input type="search" name="q" placeholder="Search games" aria-label="Search games" value="${esc(opts.query || '')}">
    </form>
    <button class="theme-toggle" type="button" aria-label="Toggle dark mode" onclick="toggleTheme()">
      <svg class="ic-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 13.2A9 9 0 0 1 10.8 3a7.2 7.2 0 1 0 10.2 10.2Z"/></svg>
      <svg class="ic-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.4"/><path d="M12 2v2.6M12 19.4V22M2 12h2.6M19.4 12H22M4.9 4.9l1.9 1.9M17.2 17.2l1.9 1.9M19.1 4.9l-1.9 1.9M6.8 17.2l-1.9 1.9"/></svg>
    </button>
    <button class="nav-toggle" aria-label="Toggle navigation" onclick="document.body.classList.toggle('nav-open')">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>
<main id="main">
${opts.body}
</main>
<footer class="site-footer">
  <div class="wrap footer-inner">
    <div class="footer-col">
      <div class="brand brand-footer">
        <span class="brand-mark">${icon('play', 15)}</span>
        <span class="brand-name">${esc(s.siteName)}</span>
      </div>
      <p class="footer-note">Free browser games, updated daily. No download, no install, just play.</p>
    </div>
    <div class="footer-col">
      <h2>Explore</h2>
      <a href="/new">New Games</a>
      <a href="/trending">Trending</a>
      <a href="/find">Find a game</a>
      <a href="/collections">Collections</a>
      <a href="/compare">Compare</a>
      <a href="/news">News</a>
      <a href="/codes">Codes</a>
      <a href="/modding">Modding</a>
      <a href="/research/browser-game-load-times">Load-time index</a>
      <a href="/blog">Journal</a>
      <a href="/search?q=unblocked">Unblocked</a>
    </div>
    <div class="footer-col">
      <h2>Categories</h2>
      ${s.categories
        .slice(0, 4)
        .map((c) => `<a href="/category/${c.slug}">${esc(c.name)}</a>`)
        .join('')}
    </div>
    <div class="footer-col">
      <h2>Site</h2>
      <a href="/about">About</a>
      <a href="/editorial-policy">Editorial policy</a>
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms of Service</a>
      <a href="/contact">Contact</a>
    </div>
  </div>
  <div class="wrap footer-bottom">
    <span>&copy; ${new Date().getFullYear()} ${esc(s.siteName)}. All rights reserved.</span>
    <span>All games are property of their respective publishers.</span>
  </div>
</footer>
<script>
function toggleTheme(){
  var cur = document.documentElement.getAttribute('data-theme');
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var next = cur === 'dark' ? 'light' : (cur === 'light' ? 'dark' : (prefersDark ? 'light' : 'dark'));
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('ph-theme', next); } catch (e) {}
}
</script>
</body>
</html>`;
}

/* ---------------- 组件 ---------------- */

function thumbBox(game, sizeClass) {
  const cls = sizeClass || 'thumb-16x10';
  if (game.thumb) {
    return `<div class="thumb ${cls}" style="background-image:url('${esc(game.thumb)}')"></div>`;
  }
  return `<div class="thumb ${cls} thumb-gen" style="--h:${hueOf(game)}">
    <span class="thumb-letter">${esc((game.title || '?').trim().charAt(0).toUpperCase())}</span>
  </div>`;
}

/* 由 slug 稳定派生一个色相，保证同一款游戏每次颜色一致 */
function hueOf(game) {
  const key = String(game.slug || game.id || '0');
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
  return h;
}

/* 热度只是排序用的内部分，没有真实播放量可依据。
   低于 1000 一律不显示，否则整片卡片右下角挂着一排 0；
   够线也只给概数，不装作精确统计。 */
function fmtHeat(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

/* 卡片：封面图 + 标题叠层 + 标签 + 热度，无封面自动降级 */
function gameCard(game, opts) {
  const o = opts || {};
  const tag = (game.tags || [])[0] || (game.category || 'Game').replace('-games', '');
  const heat = Number(game.heat != null ? game.heat : game.views) || 0;
  const h = hueOf(game);

  const cover = game.thumb
    ? `<img src="${esc(game.thumb)}" alt="${esc(game.title)}" width="512" height="384" loading="lazy" decoding="async">`
    : `<span class="hcard-letter">${esc((game.title || '?').trim().charAt(0).toUpperCase())}</span>`;

  return `<a class="hcard${game.thumb ? '' : ' is-fallback'}" href="/game/${esc(game.slug)}" style="--h:${h}">
  <div class="hcover">${cover}</div>
  <div class="htitle">${esc(game.title)}</div>
  <span class="htag">${esc(tag)}</span>
  ${heat >= 1000 ? `<span class="hheat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c3.4 4.4 6 7 6 10.6A6 6 0 0 1 6 12.6C6 11 6.7 9.7 7.8 8.5c.5 1.6 1.1 2.3 2 2.9-.5-2.7.3-5.2 2.2-9.4z"/></svg>${fmtHeat(heat)}</span>` : ''}
</a>`;
}

/* 首页掌机 hero：机身是图片层，文字与按钮是 HTML 层 */
function heroBlock(settings) {
  return `<section class="hhero">
  <div class="hpad-wrap">
    <img class="hpad" src="/assets/pad.webp" alt="" width="880" height="587" fetchpriority="high" decoding="async">
    <div class="hscreen">
      <h1 class="hh1" aria-label="Play free browser games">PLAY FREE<br>BROWSER GAMES</h1>
      <div class="hsub">Free, instant, updated daily</div>
      <a class="hcta" href="/new">PLAY NOW<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11h13l-5-5 1.4-1.4L21 12l-7.6 7.4L12 18l5-5H4z"/></svg></a>
    </div>
  </div>
</section>`;
}

/* 首页分类胶囊条 */
function hypeTabs(settings, active) {
  const items = [
    { href: '/', label: 'ALL', key: 'home' },
    { href: '/new', label: 'NEW', key: 'new' },
    { href: '/trending', label: 'TRENDING', key: 'trending' },
    ...settings.categories.slice(0, 4).map((c) => ({
      href: `/category/${c.slug}`,
      label: c.name.replace(' Games', '').toUpperCase(),
      key: c.slug
    }))
  ];
  return `<div class="htabs">${items
    .map((t) => `<a class="htab${t.key === active ? ' is-active' : ''}" href="${t.href}">${esc(t.label)}</a>`)
    .join('')}</div>`;
}


function sectionHead(kicker, title, moreHref, moreLabel) {
  return `<div class="section-head">
  <div>
    <div class="kicker">${esc(kicker)}</div>
    <h2 class="section-title">${esc(title)}</h2>
  </div>
  ${moreHref ? `<a class="more-link" href="${moreHref}">${esc(moreLabel || 'View all')} ${icon('arrow', 15)}</a>` : ''}
</div>`;
}

function pagination(baseUrl, page, totalPages) {
  if (totalPages <= 1) return '';
  const items = [];
  const link = (p, label, disabled, current) =>
    `<a class="page-btn${current ? ' is-current' : ''}${disabled ? ' is-disabled' : ''}" href="${
      disabled ? '#' : `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}page=${p}`
    }">${label}</a>`;

  items.push(link(page - 1, 'Prev', page <= 1));
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let p = start; p <= end; p++) items.push(link(p, String(p), false, p === page));
  items.push(link(page + 1, 'Next', page >= totalPages));
  return `<nav class="pagination" aria-label="Pagination">${items.join('')}</nav>`;
}

module.exports = {
  esc, jsonLd, fmtDate, icon, layout, gameCard, sectionHead, pagination, thumbBox,
  hueOf, heroBlock, hypeTabs
};
