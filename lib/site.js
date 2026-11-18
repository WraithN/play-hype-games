'use strict';

/** 前台页面渲染 */

const { esc, jsonLd, fmtDate, icon, layout, gameCard, sectionHead, pagination, thumbBox, heroBlock, hypeTabs } = require('./render');
const { collectTags } = require('./store');
const copy = require('./copy');
const blog = require('./blog');

const PAGE_SIZE = 24;

function published(games) {
  return games.filter((g) => g.status === 'published');
}

function byNewest(a, b) {
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
}

function byTrending(a, b) {
  // heat 优先（后台可手动调），相同再看浏览量
  const ha = Number(a.heat) || 0;
  const hb = Number(b.heat) || 0;
  if (hb !== ha) return hb - ha;
  return (Number(b.views) || 0) - (Number(a.views) || 0);
}

function catName(settings, slug) {
  const c = settings.categories.find((x) => x.slug === slug);
  return c ? c.name : 'Games';
}

function paginate(list, page) {
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page || 1), totalPages);
  return {
    items: list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    page: current,
    totalPages
  };
}

/* ---------------- 首页 ---------------- */

function homePage(games, settings, posts) {
  const live = published(games);
  const newest = [...live].sort(byNewest);
  const trending = [...live].sort(byTrending);
  const hero = trending[0] || newest[0];
  const tags = collectTags(games).slice(0, 10);
  const latestPosts = (posts || []).filter((p) => p.status === 'published').sort(blog.byPublishDate).slice(0, 3);

  const body = `
${heroBlock(settings)}
${hypeTabs(settings, 'home')}

<section class="hsection">
  <div class="hwrap">
    ${sectionHead('Trending now', 'Popular this week', '/trending', 'See more')}
    <div class="hgrid">${trending.slice(0, 12).map((g) => gameCard(g)).join('')}</div>
  </div>
</section>

<section class="hsection">
  <div class="hwrap">
    ${sectionHead('New releases', 'Fresh this week', '/new', 'All new games')}
    <div class="hgrid">${newest.slice(0, 12).map((g) => gameCard(g)).join('')}</div>
  </div>
</section>

${
  latestPosts.length
    ? `<section class="hsection">
  <div class="hwrap">
    ${sectionHead('Journal', 'What we are playing', '/blog', 'All articles')}
    <div class="post-list post-list-compact">${latestPosts.map(blog.postCard).join('')}</div>
  </div>
</section>`
    : ''
}
`;

  return layout({
    settings,
    body,
    canonical: settings.domain + '/',
    active: 'home',
    bodyClass: 'hype hype-home',
    head: jsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: settings.siteName,
      url: settings.domain,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${settings.domain}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    })
  });
}

/* ---------------- 列表页（new / trending / category / tag / search） ---------------- */

function listPage(opts) {
  const { games, settings, title, kicker, description, list, baseUrl, page, active, head } = opts;
  const p = paginate(list, page);
  const intro = copy.listIntro(baseUrl) || (active ? copy.categoryIntro(active) : null);
  const faq = active ? copy.categoryFaq(active) : null;

  const introBlock = intro
    ? `<section class="hype-intro">
  <div class="wrap">
    <div class="intro-card">
      <h2>${esc(intro.title)}</h2>
      ${intro.paras.map((t) => `<p>${esc(t)}</p>`).join('')}
      ${
        intro.bullets && intro.bullets.length
          ? `<h3>Worth knowing</h3><ul>${intro.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`
          : ''
      }
      ${
        faq
          ? `<h3>Common questions</h3><div class="faq-list">${faq
              .map((f) => `<div class="faq-item"><h4>${esc(f.q)}</h4><p>${esc(f.a)}</p></div>`)
              .join('')}</div>`
          : ''
      }
    </div>
  </div>
</section>`
    : '';

  const faqLd = faq
    ? jsonLd({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a }
        }))
      })
    : '';

  const body = `
<section class="page-hero">
  <div class="wrap">
    <div class="kicker">${esc(kicker)}</div>
    <h1>${esc(title)}</h1>
    ${description ? `<p>${esc(description)}</p>` : ''}
    <div class="page-count">${list.length} ${list.length === 1 ? 'game' : 'games'}</div>
  </div>
</section>

${hypeTabs(settings, active)}

<section class="section">
  <div class="wrap">
    ${
      p.items.length
        ? `<div class="game-grid">${p.items.map((g) => gameCard(g)).join('')}</div>`
        : `<div class="empty"><strong>No games here yet</strong>New titles get published every day. Check back soon.</div>`
    }
    ${pagination(baseUrl, p.page, p.totalPages)}
  </div>
</section>
${introBlock}`;

  return layout({ settings, body, canonical: settings.domain + baseUrl, active, head: (head || '') + faqLd, title, description, bodyClass: 'hype hype-list' });
}

/* ---------------- 游戏详情 ---------------- */

function gamePage(game, games, settings, related) {
  const url = `${settings.domain}/game/${game.slug}`;
  const sections = game.content && String(game.content).trim().length > 120 ? [] : copy.gameSections(game);
  const tagList = (game.tags || []).map((t) => ({
    slug: String(t).toLowerCase(),
    label: t
  }));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.title,
    description: game.seoDescription || game.description || '',
    url,
    ...(game.thumb ? { image: game.thumb } : {}),
    applicationCategory: 'Game',
    gamePlatform: 'Web Browser',
    operatingSystem: 'ChromeOS, Windows, macOS, Android, iOS',
    playMode: game.category === '2-player-games' ? 'MultiPlayer' : 'SinglePlayer',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    ...(game.rating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: game.rating,
            bestRating: 5,
            ratingCount: Math.max(20, (Number(game.views) || 0))
          }
        }
      : {})
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: settings.domain + '/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: catName(settings, game.category),
        item: `${settings.domain}/category/${game.category}`
      },
      { '@type': 'ListItem', position: 3, name: game.title, item: url }
    ]
  };

  const body = `
<div class="wrap">
  <nav class="breadcrumb">
    <a href="/">Home</a><span class="sep">/</span>
    <a href="/category/${esc(game.category)}">${esc(catName(settings, game.category))}</a>
    <span class="sep">/</span><span>${esc(game.title)}</span>
  </nav>

  <div class="game-head">
    <h1>${esc(game.title)}</h1>
    <div class="game-sub">
      <span class="pill pill-accent">${esc(catName(settings, game.category))}</span>
      ${game.rating ? `<span class="pill">Rating ${esc(game.rating)}</span>` : ''}
      <span class="pill">No download</span>
      <span class="pill">Works on Chromebook</span>
    </div>
  </div>

  <div class="player-frame">
    ${
      game.embedUrl
        ? `<iframe src="${esc(game.embedUrl)}" title="${esc(game.title)}" loading="lazy" allowfullscreen allow="autoplay; fullscreen; gamepad"></iframe>`
        : `<div class="player-fallback">Game embed not configured yet.<br>Add the iframe URL in the admin panel.</div>`
    }
    <div class="player-bar">
      <span class="hint">${esc(game.source || 'Embedded game')} &middot; runs in your browser</span>
      <div class="actions">
        <a class="btn btn-ghost" href="/game/${esc(game.slug)}" style="padding:7px 14px;font-size:13px">${icon('clock', 14)} Restart</a>
      </div>
    </div>
  </div>

  <div class="game-layout">
    <div class="game-main">
      <div class="prose">
        <h2>About ${esc(game.title)}</h2>
        <p>${esc(game.description || '')}</p>
        ${game.content || ''}
        ${sections
          .map(
            (s) => `<h2>${esc(s.h)}</h2>
        ${s.paras.map((t) => `<p>${esc(t)}</p>`).join('')}
        ${
          s.bullets && s.bullets.length
            ? `<h3>Tips</h3><ul>${s.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`
            : ''
        }`
          )
          .join('')}
      </div>

      ${
        tagList.length
          ? `<h2 style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:var(--h-fg-dim);margin:26px 0 10px">Tags</h2>
      <div class="tag-list">${tagList.map((t) => `<a class="tag-chip" href="/tag/${encodeURIComponent(t.slug)}">${esc(t.label)}</a>`).join('')}</div>`
          : ''
      }
    </div>

    <aside class="game-side">
      <div class="info-box">
        <h3>Game info</h3>
        <div class="info-row"><span>Category</span><strong><a href="/category/${esc(game.category)}">${esc(catName(settings, game.category))}</a></strong></div>
        <div class="info-row"><span>Platform</span><strong>Browser</strong></div>
        <div class="info-row"><span>Players</span><strong>${game.category === '2-player-games' ? '2 Player' : 'Single'}</strong></div>
        <div class="info-row"><span>Source</span><strong>${esc(game.source || 'Web embed')}</strong></div>
        <div class="info-row"><span>Added</span><strong>${esc(fmtDate(game.createdAt))}</strong></div>
      </div>

      ${
        related.length
          ? `<div class="info-box" style="margin-top:14px">
        <h3>Related games</h3>
        <div class="side-list">
          ${related
            .map(
              (r) => `<a class="side-item" href="/game/${esc(r.slug)}">
            ${thumbBox(r, 'thumb-1x1')}
            <div class="side-item-text"><strong>${esc(r.title)}</strong><span>${esc((r.tags || [])[0] || catName(settings, r.category))}</span></div>
          </a>`
            )
            .join('')}
        </div>
      </div>`
          : ''
      }
    </aside>
  </div>
</div>

${
  related.length
    ? `<section class="section section-alt">
  <div class="wrap">
    ${sectionHead('You may also like', 'More games like this', `/category/${game.category}`, 'View category')}
    <div class="game-grid">${related.map((r) => gameCard(r)).join('')}</div>
  </div>
</section>`
    : ''
}
`;

  return layout({
    settings,
    body,
    canonical: url,
    title: game.seoTitle || game.title,
    description: game.seoDescription || game.description,
    ogType: 'article',
    ogImage: game.thumb || '',
    bodyClass: 'hype hype-game',
    head: jsonLd(schema) + jsonLd(breadcrumbSchema)
  });
}

/* ---------------- 静态页 ---------------- */

function staticPage(settings, slug) {
  const map = {
    about: {
      title: 'About',
      body: `<h1>About ${esc(settings.siteName)}</h1>
<p>${esc(settings.siteName)} is a curated directory of free browser games. We track new releases, group them by genre and tag, and keep every page light enough to open instantly on a laptop or a Chromebook.</p>
<h2>What we do</h2>
<ul>
<li>Collect and index playable browser games from licensed distribution partners.</li>
<li>Publish one clean landing page per game, with controls, genre and related titles.</li>
<li>Keep the catalogue fresh so new and trending titles show up the same day.</li>
</ul>
<h2>What we don't do</h2>
<p>We do not develop games and we do not host game files. Every game runs on its publisher's infrastructure and remains the property of its creator.</p>
<h2>Contact</h2>
<p>Questions, takedown requests or partnership enquiries: <a href="mailto:${esc(settings.contactEmail)}">${esc(settings.contactEmail)}</a></p>`
    },
    privacy: {
      title: 'Privacy Policy',
      body: `<h1>Privacy Policy</h1>
<p>Last updated: ${esc(new Date().toISOString().slice(0, 10))}</p>
<h2>Data we collect</h2>
<p>We use privacy-respecting analytics to count page views and understand which games are popular. We do not ask visitors to create an account.</p>
<h2>Cookies</h2>
<p>Third-party advertising and analytics providers may set cookies. You can block them in your browser settings without losing access to the games.</p>
<h2>Third-party embedding</h2>
<p>Games are embedded from distribution partners. Their own privacy policies apply while you play.</p>
<h2>Contact</h2>
<p><a href="mailto:${esc(settings.contactEmail)}">${esc(settings.contactEmail)}</a></p>`
    },
    terms: {
      title: 'Terms of Service',
      body: `<h1>Terms of Service</h1>
<p>By using ${esc(settings.siteName)} you agree to these terms.</p>
<h2>Use of the site</h2>
<p>The site is provided as-is for personal, non-commercial entertainment. Do not scrape, mirror or resell the catalogue.</p>
<h2>Third-party games</h2>
<p>Games are provided by their respective publishers. We make no warranty about availability, performance or content of third-party games.</p>
<h2>Changes</h2>
<p>We may update these terms. Continued use means acceptance of the updated version.</p>`
    },
    contact: {
      title: 'Contact',
      body: `<h1>Contact</h1>
<p>For game submissions, copyright takedown requests or advertising enquiries:</p>
<p><a href="mailto:${esc(settings.contactEmail)}">${esc(settings.contactEmail)}</a></p>
<p>We reply to takedown requests within 48 hours.</p>`
    }
  };
  const page = map[slug];
  if (!page) return null;

  return layout({
    settings,
    title: page.title,
    body: `<div class="wrap"><div class="static-page">${page.body}</div></div>`,
    canonical: `${settings.domain}/${slug}`,
    description: `${page.title} — ${settings.siteName}`,
    bodyClass: 'hype hype-static'
  });
}

/* ---------------- 404 ---------------- */

function notFoundPage(settings) {
  const body = `
<div class="wrap">
  <div class="static-page" style="text-align:center">
    <div style="font-size:12px;letter-spacing:1.6px;font-weight:800;color:var(--h-fg-dim);text-transform:uppercase">Error 404</div>
    <h1 style="margin-top:10px">This page does not exist</h1>
    <p>The game or page you are looking for may have been removed, renamed, or the link is wrong.</p>
    <p style="margin-top:22px">
      <a href="/" style="display:inline-flex;align-items:center;height:46px;padding:0 26px;border-radius:99px;text-decoration:none;font-family:var(--h-font);font-weight:800;font-size:16px;color:#fff;background:linear-gradient(180deg,#ffe35c,#ffb81f 52%,#ff9421);box-shadow:0 5px 0 #e07a12,inset 0 2px 0 rgba(255,255,255,.7);text-shadow:0 2px 0 rgba(190,90,0,.45)">Back to games</a>
    </p>
  </div>
</div>`;
  return layout({
    settings,
    body,
    title: 'Page not found',
    description: 'This page does not exist on PLAY HYPE GAMES.',
    bodyClass: 'hype hype-static'
  });
}

/* ---------------- sitemap / robots ---------------- */

function sitemap(games, settings, posts) {
  const live = published(games).sort(byNewest);
  const articles = (posts || [])
    .filter((p) => p.status === 'published' && p.slug)
    .sort(blog.byPublishDate);
  const urls = [
    { loc: settings.domain + '/', pri: '1.0', freq: 'daily' },
    { loc: settings.domain + '/new', pri: '0.9', freq: 'daily' },
    { loc: settings.domain + '/trending', pri: '0.8', freq: 'daily' },
    { loc: settings.domain + '/blog', pri: '0.8', freq: 'weekly' },
    ...settings.categories.map((c) => ({
      loc: `${settings.domain}/category/${c.slug}`,
      pri: '0.7',
      freq: 'daily'
    })),
    ...collectTags(games)
      .slice(0, 300)
      .map((t) => ({ loc: `${settings.domain}/tag/${encodeURIComponent(t.slug)}`, pri: '0.5', freq: 'weekly' })),
    ...live.map((g) => ({
      loc: `${settings.domain}/game/${g.slug}`,
      pri: '0.8',
      freq: 'weekly',
      lastmod: (g.updatedAt || g.createdAt || '').slice(0, 10)
    })),
    ...articles.map((p) => ({
      loc: `${settings.domain}/blog/${p.slug}`,
      pri: '0.7',
      freq: 'monthly',
      lastmod: String(p.updatedAt || p.publishedAt || '').slice(0, 10)
    }))
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `<url><loc>${esc(u.loc)}</loc><changefreq>${u.freq}</changefreq><priority>${u.pri}</priority>${
      u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''
    }</url>`
  )
  .join('\n')}
</urlset>`;
}

function robots(settings) {
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${settings.domain}/sitemap.xml`;
}

module.exports = {
  homePage,
  listPage,
  gamePage,
  staticPage,
  notFoundPage,
  sitemap,
  robots,
  published,
  byNewest,
  byTrending,
  catName,
  paginate,
  PAGE_SIZE
};
