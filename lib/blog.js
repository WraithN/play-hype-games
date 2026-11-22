'use strict';

/** 前台：Journal（博客）索引页与文章页 */

const { esc, jsonLd, fmtDate, icon, layout, gameCard, hueOf } = require('./render');
const md = require('./markdown');
const authors = require('./authors');

function authorFor(post) {
  if (!post) return null;
  return (post.authorSlug && authors.get(post.authorSlug)) || authors.byName(post.author) || null;
}

function byPublishDate(a, b) {
  return new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0);
}

function livePosts(posts) {
  return posts.filter((p) => p.status === 'published' && p.slug);
}

/** 文章卡片：无封面时用稳定渐变色块，避免破图 */
function postCard(post) {
  const hue = hueOf({ slug: post.slug });
  const date = fmtDate(post.publishedAt || post.updatedAt);
  const mins = md.readMinutes(post.body);

  const cover = post.cover
    ? `<div class="pc-cover"><img src="${esc(post.cover)}" alt="${esc(post.title)}" loading="lazy" decoding="async"></div>`
    : `<div class="pc-cover pc-cover-gen" style="--h:${hue}">
        <span class="pc-mark" aria-hidden="true">${esc(post.title.trim().charAt(0).toUpperCase())}</span>
        <span class="pc-kicker">Journal</span>
      </div>`;

  return `<a class="post-card" href="/blog/${esc(post.slug)}">
  ${cover}
  <div class="pc-body">
    <div class="pc-meta">
      <time datetime="${esc(date)}">${esc(date)}</time>
      <span class="pc-dot"></span>
      <span>${mins} min read</span>
    </div>
    <h2 class="pc-title">${esc(post.title)}</h2>
    <p class="pc-excerpt">${esc(post.excerpt || md.plain(post.body).slice(0, 160))}</p>
    <span class="pc-more">Read article ${icon('arrow', 14)}</span>
  </div>
</a>`;
}

/* ---------------- /blog 索引 ---------------- */

function blogIndexPage(posts, settings, page) {
  const list = livePosts(posts).sort(byPublishDate);
  const head = jsonLd({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${settings.siteName} Journal`,
    url: `${settings.domain}/blog`,
    description: 'What we are playing, what we added this week, and how we decide what stays on the site.',
    blogPost: list.slice(0, 10).map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      datePublished: fmtDate(p.publishedAt || p.updatedAt),
      url: `${settings.domain}/blog/${p.slug}`,
      author: authorFor(p)
        ? { '@type': 'Person', name: authorFor(p).name, url: `${settings.domain}/author/${authorFor(p).slug}` }
        : { '@type': 'Organization', name: p.author || settings.siteName }
    }))
  });

  const body = `
<section class="blog-hero">
  <div class="wrap">
    <div class="kicker">Journal</div>
    <h1 class="blog-h1">Notes from the arcade</h1>
    <p class="blog-sub">What we are playing this week, what just went live, and how we decide which games stay. Written by the people who maintain the list.</p>
  </div>
</section>

<section class="blog-section">
  <div class="wrap">
    <div class="post-list">
      ${list.map(postCard).join('') || '<div class="empty">No posts published yet.</div>'}
    </div>
  </div>
</section>
`;

  return layout({
    settings,
    body,
    title: 'Journal',
    description:
      'Weekly notes on browser games: new additions, what we dropped, and the rules we use to decide what gets listed.',
    canonical: `${settings.domain}/blog`,
    bodyClass: 'hype hype-list hype-blog',
    head
  });
}

/* ---------------- /blog/:slug ---------------- */

function blogPostPage(post, posts, games, settings) {
  const list = livePosts(posts).sort(byPublishDate);
  const index = list.findIndex((p) => p.slug === post.slug);
  const newer = index > 0 ? list[index - 1] : null;
  const older = index >= 0 && index < list.length - 1 ? list[index + 1] : null;

  const date = fmtDate(post.publishedAt || post.updatedAt);
  const url = `${settings.domain}/blog/${post.slug}`;
  const author = authorFor(post);

  // 关联游戏：优先用手填的 relatedGames，其次按标签匹配
  const byId = new Map(games.map((g) => [Number(g.id), g]));
  const picked = (post.relatedGames || []).map((id) => byId.get(Number(id))).filter(Boolean);
  const related = picked.length
    ? picked
    : games
        .filter((g) => g.status === 'published' && (g.tags || []).some((t) => (post.tags || []).includes(t)))
        .slice(0, 4);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || md.plain(post.body).slice(0, 160),
    datePublished: fmtDate(post.publishedAt || post.updatedAt),
    dateModified: fmtDate(post.updatedAt || post.publishedAt),
    author: author
      ? {
          '@type': 'Person',
          '@id': `${settings.domain}/author/${author.slug}#person`,
          name: author.name,
          url: `${settings.domain}/author/${author.slug}`,
          description: author.bio
        }
      : { '@type': 'Organization', name: post.author || settings.siteName, url: `${settings.domain}/editorial-policy` },
    publisher: { '@type': 'Organization', name: settings.siteName, url: settings.domain },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url
  };
  if (post.cover) schema.image = post.cover;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: settings.domain + '/' },
      { '@type': 'ListItem', position: 2, name: 'Journal', item: settings.domain + '/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: url }
    ]
  };

  const body = `
<div class="wrap">
  <article class="post-page">
    <nav class="post-crumbs" aria-label="Breadcrumb">
      <a href="/">Home</a><span>/</span><a href="/blog">Journal</a>
    </nav>

    <header class="post-head">
      <div class="kicker">Journal</div>
      <h1 class="post-h1">${esc(post.title)}</h1>
      <div class="post-meta">
        <time datetime="${esc(date)}">${esc(date)}</time>
        <span class="pc-dot"></span>
        <span>${md.readMinutes(post.body)} min read</span>
        <span class="pc-dot"></span>
        ${author ? `<a href="/author/${esc(author.slug)}" rel="author">${esc(author.name)}</a>` : `<a href="/editorial-policy">${esc(post.author || settings.siteName)}</a>`}
      </div>
    </header>

    <div class="post-body">${md.render(post.body)}</div>

    ${
      author
        ? `<aside class="author-box">
      <div class="author-avatar" aria-hidden="true">${esc(author.name.charAt(0))}</div>
      <div class="author-box-body">
        <a class="author-name" href="/author/${esc(author.slug)}" rel="author">${esc(author.name)}</a>
        <span class="author-role">${esc(author.role || 'Editor')}</span>
        <p>${esc(author.bio || '')}</p>
      </div>
    </aside>`
        : ''
    }

    ${
      related.length
        ? `<section class="post-games">
      <h2 class="post-h2">Play something from this article</h2>
      <div class="hgrid">${related.slice(0, 4).map((g) => gameCard(g)).join('')}</div>
    </section>`
        : ''
    }

    <footer class="post-foot">
      <div class="post-tags">${(post.tags || [])
        .map((t) => `<span class="tag-capsule">${esc(t)}</span>`)
        .join('')}</div>
      <div class="post-nav">
        ${newer ? `<a class="pn-link" href="/blog/${esc(newer.slug)}"><span>Newer</span><strong>${esc(newer.title)}</strong></a>` : ''}
        ${older ? `<a class="pn-link pn-next" href="/blog/${esc(older.slug)}"><span>Older</span><strong>${esc(older.title)}</strong></a>` : ''}
      </div>
    </footer>
  </article>
</div>
`;

  return layout({
    settings,
    body,
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || md.plain(post.body).slice(0, 160),
    canonical: url,
    ogType: 'article',
    ogImage: post.cover || '',
    bodyClass: 'hype hype-static hype-post',
    head: jsonLd(schema) + jsonLd(breadcrumb)
  });
}

/* ---------------- /author/:slug ---------------- */

function authorPage(slug, posts, settings) {
  const author = authors.get(slug);
  if (!author) return null;

  const mine = livePosts(posts)
    .filter((p) => {
      const a = authorFor(p);
      return a && a.slug === author.slug;
    })
    .sort(byPublishDate);
  const url = `${settings.domain}/author/${author.slug}`;
  const sameAs = Array.isArray(author.sameAs) ? author.sameAs : [];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      '@id': `${url}#person`,
      name: author.name,
      url,
      description: author.bio || '',
      jobTitle: author.role || 'Editor',
      ...(sameAs.length ? { sameAs } : {}),
      ...(Array.isArray(author.knowsAbout) && author.knowsAbout.length ? { knowsAbout: author.knowsAbout } : {})
    }
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: settings.domain + '/' },
      { '@type': 'ListItem', position: 2, name: 'Journal', item: `${settings.domain}/blog` },
      { '@type': 'ListItem', position: 3, name: author.name, item: url }
    ]
  };

  const body = `
<section class="author-hero">
  <div class="wrap author-hero-inner">
    <div class="author-avatar author-avatar-lg" aria-hidden="true">${esc(author.name.charAt(0))}</div>
    <div class="author-hero-text">
      <div class="kicker">${esc(author.role || 'Editor')}</div>
      <h1>${esc(author.name)}</h1>
      <p>${esc(author.bio || '')}</p>
      <div class="author-links">
        ${sameAs
          .map(
            (link) =>
              `<a href="${esc(link)}" rel="me noopener">${esc(/github\.com/i.test(link) ? 'GitHub' : 'Profile')}</a>`
          )
          .join('')}
        <a href="/editorial-policy">Editorial policy</a>
      </div>
    </div>
  </div>
</section>

<section class="blog-section">
  <div class="wrap">
    <h2 class="author-section-title">Articles by ${esc(author.name)}</h2>
    <div class="post-list">
      ${mine.map(postCard).join('') || '<div class="empty">No articles published yet.</div>'}
    </div>
  </div>
</section>`;

  return layout({
    settings,
    body,
    title: `${author.name} — ${author.role || 'Editor'}`,
    description: author.bio || `Articles by ${author.name} on ${settings.siteName}.`,
    canonical: url,
    bodyClass: 'hype hype-static hype-blog',
    head: jsonLd(schema) + jsonLd(breadcrumb)
  });
}

/* ---------------- RSS ---------------- */

function rss(posts, settings) {
  const list = livePosts(posts).sort(byPublishDate).slice(0, 20);
  const items = list
    .map((p) => {
      const date = new Date(p.publishedAt || p.updatedAt || Date.now()).toUTCString();
      return `<item>
<title>${esc(p.title)}</title>
<link>${esc(settings.domain)}/blog/${esc(p.slug)}</link>
<guid isPermaLink="true">${esc(settings.domain)}/blog/${esc(p.slug)}</guid>
<pubDate>${date}</pubDate>
<description>${esc(p.excerpt || md.plain(p.body).slice(0, 200))}</description>
</item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>${esc(settings.siteName)} Journal</title>
<link>${esc(settings.domain)}/blog</link>
<description>What we are playing, what we added, and how we choose what stays.</description>
<language>en</language>
${items}
</channel>
</rss>`;
}

module.exports = { blogIndexPage, blogPostPage, authorPage, rss, livePosts, byPublishDate, postCard };
