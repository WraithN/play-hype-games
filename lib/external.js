'use strict';

/* ============================================================
   外部单品导流页（/play/<slug>）
   - 这些游戏不在站内托管、不内嵌 iframe，页面只做原创介绍并跳转官方站
   - 数据独立于 games.json：不进可玩网格、不计浏览量、不进 RSS
   - 合规：VideoGame schema 用 sameAs 指向官方域，页面明确声明非附属关系
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { esc, jsonLd, layout, icon } = require('./render');
const md = require('./markdown');

const DATA_FILE = path.join(__dirname, '..', 'data', 'external-games.json');

let cache = null;
let mtime = -1;

function loadAll() {
  try {
    const st = fs.statSync(DATA_FILE);
    if (cache && st.mtimeMs === mtime) return cache;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed : [];
    mtime = st.mtimeMs;
    return cache;
  } catch (err) {
    if (cache) return cache;
    if (err.code !== 'ENOENT') console.error('[external] 数据读取失败：', err.message);
    cache = [];
    return cache;
  }
}

function published() {
  return loadAll().filter((e) => e && e.status === 'published' && e.slug && e.officialUrl);
}

function find(slug) {
  return published().find((e) => e.slug === slug) || null;
}

function byCategory(categorySlug) {
  return published().filter((e) => e.category === categorySlug);
}

function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return String(url || '').replace(/^https?:\/\//, '').split('/')[0];
  }
}

function externalPage(entry, settings) {
  const canonical = `${settings.domain}/play/${entry.slug}`;
  const pageTitle = entry.seoTitle || `${entry.title} — Play Free Online Browser Game`;
  const metaDescription = entry.seoDescription || md.plain(entry.intro || '').slice(0, 160);
  const host = entry.officialHost || hostOf(entry.officialUrl);
  const faqs = Array.isArray(entry.faqs) ? entry.faqs : [];
  const tags = Array.isArray(entry.tags) ? entry.tags : [];
  const bodyHtml = md.render(entry.body || '');

  const cta = `
  <div class="ext-cta">
    <a class="btn btn-primary ext-cta-btn" href="${esc(entry.officialUrl)}" target="_blank" rel="noopener">
      ${icon('play', 18)}<span>Play ${esc(entry.title)} on the official site</span>
    </a>
    <p class="ext-cta-note">Runs on <strong>${esc(host)}</strong> in a new tab. Free to play · no download · we do not host the game.</p>
  </div>`;

  const videoGameLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: entry.title,
    description: metaDescription,
    url: canonical,
    sameAs: entry.officialUrl,
    applicationCategory: 'Game',
    gamePlatform: 'Web Browser',
    operatingSystem: 'Any modern desktop web browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${settings.domain}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: '.IO Games',
        item: `${settings.domain}/category/${esc(entry.category || 'io-games')}`
      },
      { '@type': 'ListItem', position: 3, name: entry.title, item: canonical }
    ]
  };

  const faqLd = faqs.length
    ? jsonLd({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a }
        }))
      })
    : '';

  const body = `
<div class="wrap ext-page">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span class="sep">/</span>
    <a href="/category/${esc(entry.category || 'io-games')}">.IO Games</a>
    <span class="sep">/</span><span>${esc(entry.title)}</span>
  </nav>

  <header class="ext-head">
    <div class="kicker">${esc(entry.kicker || 'Official-site game')}</div>
    <h1>${esc(entry.title)}</h1>
    <div class="game-sub">
      <span class="pill pill-accent">Browser game</span>
      <span class="pill">No download</span>
      <span class="pill">Free to play</span>
      ${tags.map((t) => `<span class="pill">${esc(t)}</span>`).join('')}
    </div>
    <p class="ext-intro">${esc(entry.intro || '')}</p>
  </header>

  ${cta}

  <div class="post-body ext-body">${bodyHtml}</div>

  ${
    faqs.length
      ? `<section class="post-faq" id="faq">
    <h2 class="post-h2">Frequently asked questions</h2>
    <div class="faq-list">${faqs
        .map((f) => `<div class="faq-item"><h4>${esc(f.q)}</h4><p>${esc(f.a)}</p></div>`)
        .join('')}</div>
  </section>`
      : ''
  }

  ${cta}

  <p class="ext-affil">${esc(entry.title)} is operated by its own publisher on ${esc(host)}. PLAY HYPE GAMES is an independent directory and is not affiliated with, sponsored by, or endorsed by the game's publisher. All trademarks belong to their respective owners.</p>
  <p class="ext-back"><a href="/category/${esc(entry.category || 'io-games')}">← Browse all IO games</a></p>
</div>`;

  return layout({
    settings,
    body,
    canonical,
    title: pageTitle,
    description: metaDescription,
    ogType: 'website',
    bodyClass: 'hype hype-static hype-external',
    head: jsonLd(videoGameLd) + jsonLd(breadcrumbLd) + faqLd
  });
}

/* 分类页底部的"官方站导流"区块：卡片链接到站内 /play 落地页，不直接外跳 */
function officialLinksBlock(categorySlug) {
  const entries = byCategory(categorySlug);
  if (!entries.length) return '';
  return `
<section class="section section-alt ext-official-section">
  <div class="wrap">
    <h2 class="ext-official-title">More .io games on their official sites</h2>
    <p class="ext-official-intro">Popular .io titles we cover with honest guides instead of embeds. Each page explains the modes and controls, then links to the publisher's own site.</p>
    <div class="ext-official-grid">
      ${entries
        .map(
          (e) => `<a class="ext-official-card" href="/play/${esc(e.slug)}">
        <strong>${esc(e.title)}</strong>
        <span>${esc(hostOf(e.officialUrl))} · guide & official link</span>
      </a>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

function sitemapEntries(domain) {
  return published().map((e) => ({
    loc: `${domain}/play/${e.slug}`,
    pri: '0.6',
    freq: 'monthly',
    lastmod: String(e.updatedAt || e.publishedAt || '').slice(0, 10)
  }));
}

module.exports = { loadAll, published, find, byCategory, externalPage, officialLinksBlock, sitemapEntries };
