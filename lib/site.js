'use strict';

/** 前台页面渲染 */

const { esc, jsonLd, fmtDate, icon, layout, gameCard, sectionHead, pagination, thumbBox, heroBlock, hypeTabs } = require('./render');
const { collectTags } = require('./store');
const copy = require('./copy');
const blog = require('./blog');
const seo = require('./seo');
const editorial = require('./editorial');
const authors = require('./authors');

const PAGE_SIZE = 24;

function published(games) {
  return games.filter((g) => g.status === 'published');
}

function byNewest(a, b) {
  const da = new Date(a.createdAt || 0).getTime() || 0;
  const db = new Date(b.createdAt || 0).getTime() || 0;
  if (db !== da) return db - da;
  /* 同一次 feed 导入的几十条 created 是同一个毫秒，只比时间会退回数组顺序，
     再按 id 倒序兜一层，保证"新的在前"是真的 */
  return (Number(b.id) || 0) - (Number(a.id) || 0);
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
  const current = Math.min(Math.max(1, Math.floor(Number(page) || 1)), totalPages);
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
    ${sectionHead('Latest additions', 'New in the catalogue', '/new', 'All new games')}
    <div class="hgrid">${newest.slice(0, 12).map((g) => gameCard(g)).join('')}</div>
  </div>
</section>

<section class="hsection">
  <div class="hwrap">
    ${sectionHead('More to play', 'Keep scrolling', '/categories', 'Browse categories')}
    <div class="hgrid">${newest.slice(12, 24).map((g) => gameCard(g)).join('')}</div>
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
    title: 'Free Browser Games — Play Online',
    description: 'Play free browser games online with no download or install. Find new, trending, action, idle, .io and 2-player games at PLAY HYPE GAMES.',
    preloadImage: '/assets/pad.webp',
    active: 'home',
    bodyClass: 'hype hype-home',
    head: jsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: settings.siteName,
      url: settings.domain,
      inLanguage: 'en',
      publisher: { '@id': `${settings.domain}/#organization` },
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
  const { games, settings, title, kicker, description, list, baseUrl, page, active, head, noindex, heroText } = opts;
  const p = paginate(list, page);
  const tagText = active === 'tag' ? seo.tagIntro(baseUrl.split('/').pop(), settings) : '';
  const intro = tagText ? { title: `Explore ${title}`, paras: [tagText] } : copy.listIntro(baseUrl) || (active ? copy.categoryIntro(active) : null);
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

  const listLd = p.items.length
    ? jsonLd({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: p.items.map((g, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: seo.cleanText(g.title),
          url: `${settings.domain}/game/${g.slug}`
        }))
      })
    : '';

  const body = `
<section class="page-hero">
  <div class="wrap">
    <div class="kicker">${esc(kicker)}</div>
    <h1>${esc(title)}</h1>
    ${(heroText !== undefined ? heroText : description) ? `<p>${esc(heroText !== undefined ? heroText : description)}</p>` : ''}
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

  const pageCanonical = p.page > 1 ? `${settings.domain}${baseUrl}${baseUrl.includes('?') ? '&' : '?'}page=${p.page}` : settings.domain + baseUrl;
  return layout({ settings, body, canonical: pageCanonical, active, head: `${head || ''}${listLd}${faqLd}`, robots: noindex ? 'noindex,follow' : '', title, description, bodyClass: 'hype hype-list' });
}

/* ---------------- 分类总览 ---------------- */

function categoriesPage(games, settings) {
  const live = published(games);
  const intro = copy.listIntro('/categories');
  const counts = new Map();
  live.forEach((g) => counts.set(g.category, (counts.get(g.category) || 0) + 1));

  const cards = settings.categories
    .map((c) => {
      const n = c.slug === 'chromebook-games' ? live.length : counts.get(c.slug) || 0;
      return `<a class="cat-card" href="/category/${esc(c.slug)}">
  <h2>${esc(c.name)}</h2>
  <p>${esc(c.short || '')}</p>
  <span>${n} ${n === 1 ? 'game' : 'games'}</span>
</a>`;
    })
    .join('');

  const body = `
<section class="page-hero">
  <div class="wrap">
    <div class="kicker">Browse</div>
    <h1>All categories</h1>
    <p>Every genre we cover, from fast .io arenas to relaxed idle builders.</p>
    <div class="page-count">${settings.categories.length} categories</div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="cat-grid">${cards}</div>
    ${
      intro
        ? `<div class="hype-intro" style="padding-left:0;padding-right:0">
      <div class="intro-card">
        <h2>${esc(intro.title)}</h2>
        ${intro.paras.map((t) => `<p>${esc(t)}</p>`).join('')}
      </div>
    </div>`
        : ''
    }
  </div>
</section>`;

  return layout({
    settings,
    body,
    title: 'All categories',
    description: seo.description(
      `${intro ? intro.paras[0] : ''} Browse ${settings.categories.length} categories, including .io, idle, action, strategy and 2-player games.`,
      'Browse every browser game category on PLAY HYPE GAMES.',
      200
    ),
    canonical: `${settings.domain}/categories`,
    active: 'home',
    bodyClass: 'hype hype-list'
  });
}

/* ---------------- 游戏详情 ---------------- */

function fmtMs(ms) {
  if (!Number.isFinite(ms)) return 'n/a';
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function fmtBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'n/a';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function editorNotes(notes, audit) {
  const log = audit
    ? `<h3>Test log</h3>
      <div class="test-log">
        <div><span>Embed document</span><strong>${fmtMs(audit.document && audit.document.ms)} · ${fmtBytes(audit.document && audit.document.bytes)}</strong></div>
        <div><span>Initial payload</span><strong>${fmtMs(audit.payload && audit.payload.ms)} · ${fmtBytes(audit.payload && audit.payload.bytes)}</strong></div>
        <div><span>Mobile viewport</span><strong>${audit.viewport ? 'Declared' : 'Not declared'}</strong></div>
        <div><span>Touch input</span><strong>${audit.touchCode ? 'Hooks found' : 'Not detected'}</strong></div>
        <div><span>Keyboard input</span><strong>${audit.keyboardCode ? 'Hooks found' : 'Not detected'}</strong></div>
      </div>
      <p class="test-method">Cold fetch from our editorial machine on ${esc(notes.reviewedAt)}. “Initial payload” covers the embed HTML, the scripts linked from it and data.json where present. This is a lab measurement, not field data. Controls are publisher-stated; the input scan only confirms that keyboard or touch hooks exist in the fetched files, not that every listed key works.</p>`
    : `<p class="test-method">No automated audit is attached to this page yet.</p>`;

  return `<section class="editor-notes">
  <div class="en-top"><h2>Editor's notes</h2><span>Reviewed ${esc(notes.reviewedAt)}</span></div>
  <p class="en-lede">${esc(notes.why)}</p>
  <h3>How a session plays out</h3>
  <p>${esc(notes.loop)}</p>
  ${notes.check ? `<h3>What to check</h3>\n  <p>${esc(notes.check)}</p>` : ''}
  <h3>Who it suits</h3>
  <p>${esc(notes.fit)}</p>
  <h3>Verdict</h3>
  <p>${esc(notes.verdict)}</p>
  ${log}
</section>`;
}

function gamePage(game, games, settings, related) {
  const url = `${settings.domain}/game/${game.slug}`;
  const category = catName(settings, game.category);
  const metaDescription = seo.gameDescription(game, category);
  const review = editorial.get(game.slug);  // Do not manufacture controls, timings or strategy advice from a category template.
  // A game gets richer copy only after an editor supplies game.content.
  const sections = game.content && String(game.content).trim().length > 120 ? [] : [];
  const tagList = seo.gameTags(game).map((t) => ({
    slug: t,
    label: seo.tagLabel(t)
  }));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.title,
    description: metaDescription,
    url,
    ...(game.thumb ? { image: game.thumb } : {}),
    applicationCategory: 'Game',
    gamePlatform: 'Web Browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    ...(game.controls ? { gameTip: game.controls } : {}),
    ...(review.notes ? { dateModified: review.notes.reviewedAt } : {})
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
      <span class="pill">Browser game</span>
    </div>
  </div>

  <div class="player-frame">
    ${
      game.embedUrl
        ? `<iframe id="gameFrame" src="${esc(game.embedUrl)}" title="${esc(game.title)}" allowfullscreen allow="autoplay; fullscreen; gamepad"></iframe>
    <div class="player-load${game.thumb ? ' has-cover' : ''}" id="playerLoad" aria-live="polite"${game.thumb ? ` style="--pl-cover:url('${esc(game.thumb)}')"` : ''}>
      <div class="pl-inner">
        <span class="pl-spin" aria-hidden="true"></span>
        <b class="pl-title">Loading ${esc(game.title)}</b>
        <small class="pl-hint">Starting in your browser. The first load takes a few seconds.</small>
        <small class="pl-slow" hidden>Still loading. This one is heavy &mdash; hit Restart below, or try another game while it catches up.</small>
      </div>
    </div>`
        : `<div class="player-fallback">Game embed not configured yet.<br>Add the iframe URL in the admin panel.</div>`
    }
    <div class="player-bar">
      <span class="hint">${esc(game.source || 'Embedded game')} &middot; runs in your browser</span>
      <div class="actions">
        <button type="button" class="btn btn-ghost" id="restartGame" style="padding:7px 14px;font-size:13px">${icon('clock', 14)} Restart</button>
      </div>
    </div>
  </div>

  <script>
  (function () {
    var f = document.getElementById('gameFrame');
    var l = document.getElementById('playerLoad');
    if (!f || !l) return;
    var slow = l.querySelector('.pl-slow');
    var btn = document.getElementById('restartGame');
    var visible = true;
    function hide() { if (!visible) return; visible = false; l.classList.add('is-out'); }
    function reset() { visible = true; l.classList.remove('is-out'); if (slow) slow.hidden = true; }

    /* 跨域 iframe 读不到内部状态，只能用 load 事件加一段缓冲：
       Construct 导出的游戏 load 完之后 canvas 还要再起 2-3 秒，太早撤会看到黑屏 */
    f.addEventListener('load', function () { setTimeout(hide, 4200); });
    /* 16 秒还没起来就把话说清楚，别让人对着黑屏猜 */
    setTimeout(function () { if (visible && slow) slow.hidden = false; }, 16000);
    /* 兜底：再慢也不能一直盖着 */
    setTimeout(hide, 48000);

    if (btn) btn.addEventListener('click', function () { reset(); f.src = f.src; });
  })();
  </script>

  <div class="game-layout">
    <div class="game-main">
      <div class="prose">
        <h2>About ${esc(game.title)}</h2>
        <p>${esc(seo.gameSummary(game))}</p>
        ${review.notes ? editorNotes(review.notes, review.audit) : ''}
        ${game.controls ? `<h2>Controls</h2><p>${esc(game.controls)}</p><p class="source-note">Controls are the publisher's notes, not a first-hand playtest.</p>` : ''}
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
    description: metaDescription,
    ogType: 'article',
    ogImage: game.thumb || '',
    bodyClass: 'hype hype-game',
    head: `<link rel="preconnect" href="https://html5.gamemonetize.co" crossorigin>` + jsonLd(schema) + jsonLd(breadcrumbSchema)
  });
}

/* ---------------- 静态页 ---------------- */

function staticPage(settings, slug) {
  const meta = {
    about: 'About PLAY HYPE GAMES: an independent browser-game directory, how we source games, what we check, and how to reach us.',
    privacy: 'How PLAY HYPE GAMES handles analytics, cookies and third-party game embeds, and how to limit tracking in your browser.',
    terms: 'Terms for using PLAY HYPE GAMES, including third-party game embeds, acceptable use and changes to the catalogue.',
    contact: 'Contact PLAY HYPE GAMES for game submissions, corrections, takedowns, advertising and partnership enquiries.',
    'editorial-policy': 'How PLAY HYPE GAMES sources descriptions, labels tests, ranks trending titles and attributes Journal articles.'
  };
  const map = {
    about: {
      title: 'About',
      body: `<h1>About ${esc(settings.siteName)}</h1>
<p>${esc(settings.siteName)} is a curated directory of free browser games. We track new releases, group them by genre and tag, and keep every page light enough to open instantly on a laptop or a Chromebook.</p>
<p>${esc(settings.siteName)} is an independent browser-game directory. We do not develop or publish mobile apps, and we are not affiliated with any iOS game studio, app publisher or other company that may use a similar name.</p>
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
    },
    'editorial-policy': {
      title: 'Editorial policy',
      body: `<h1>Editorial policy</h1>
<p>PLAY HYPE GAMES is a browser-game directory. Games run in third-party embeds; we do not develop the games or control their servers.</p>
<h2>Where information comes from</h2>
<p>Catalogue descriptions and tags may be supplied by game distributors. They are not independent playtest reports. A listing does not certify device compatibility, multiplayer availability or rights ownership.</p>
<h2>Testing and corrections</h2>
<p>We only label controls, device support or loading times as tested when a specific check has been recorded. Missing testing information is not a promise that a feature works. Send a game URL and details of any error to <a href="mailto:${esc(settings.contactEmail)}">${esc(settings.contactEmail)}</a>.</p>
<h2>Rankings and ratings</h2>
<p>Trending uses an internal editorial heat score, with page views as a tie-breaker. It is not a verified count of players or a user review score. We do not convert page views into review counts.</p>
<h2>Journal authorship</h2>
<p>Journal articles carry a byline. Named authors have a profile page listing their role and work; the current editor is <a href="/author/wangnan">WangNan</a>. Articles bylined with the site name are organizational notes. We do not claim external expert credentials beyond what a profile states; corrections go to the contact address above.</p>
<h2>Independence and brand</h2>
<p>${esc(settings.siteName)} is an independent browser-game directory. It is not affiliated with any iOS game studio, app publisher or other company that may use a similar name. We do not develop or publish mobile apps, and we do not control third-party game embeds.</p>`
    }
  };
  const page = map[slug];
  if (!page) return null;

  return layout({
    settings,
    title: page.title,
    body: `<div class="wrap"><div class="static-page">${page.body}</div></div>`,
    canonical: `${settings.domain}/${slug}`,
    description: meta[slug] || `${page.title} — ${settings.siteName}`,
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
    noCanonical: true,
    robots: 'noindex,follow',
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
    ...['categories', 'about', 'contact', 'privacy', 'terms', 'editorial-policy'].map((slug) => ({ loc: `${settings.domain}/${slug}`, pri: '0.4', freq: 'monthly' })),
    ...settings.categories.map((c) => ({
      loc: `${settings.domain}/category/${c.slug}`,
      pri: '0.7',
      freq: 'daily'
    })),
    ...collectTags(games)
      .filter((t) => seo.tagIndexable(t, settings))
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
    })),
    ...authors
      .list()
      .filter((a) => articles.some((p) => p.authorSlug === a.slug))
      .map((a) => ({ loc: `${settings.domain}/author/${a.slug}`, pri: '0.5', freq: 'monthly' }))
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
  return `# Search and user-triggered AI crawlers are allowed.
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: Googlebot
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: Bingbot
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

# Model-training crawlers are not allowed to reuse the catalogue.
User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

Sitemap: ${settings.domain}/sitemap.xml`;
}

module.exports = {
  homePage,
  listPage,
  gamePage,
  staticPage,
  notFoundPage,
  categoriesPage,
  sitemap,
  robots,
  published,
  byNewest,
  byTrending,
  catName,
  paginate,
  PAGE_SIZE
};
