'use strict';

/** 前台：Journal（博客）索引页与文章页 */

const { esc, jsonLd, fmtDate, icon, layout, gameCard, hueOf } = require('./render');
const md = require('./markdown');
const authors = require('./authors');

const SECTIONS = {
  news: {
    label: 'News',
    kicker: 'News',
    title: 'Game news & announcements',
    heading: 'Game news, without the filler',
    description: 'Confirmed game announcements, release details and the context behind them. We separate official statements from leaks and label both.'
  },
  codes: {
    label: 'Codes',
    kicker: 'Codes',
    title: 'Roblox codes & rewards',
    heading: 'Roblox codes, checked and dated',
    description: 'Active, unconfirmed and expired Roblox codes, with the source and the last check date. If a code is not confirmed, we say so.'
  },
  modding: {
    label: 'Modding',
    kicker: 'Modding',
    title: 'Modding & open-source ports',
    heading: 'Modding and open-source port notes',
    description: 'Technical project status, build requirements and open-source notes. No game files, cracked builds or download links.'
  }
};

function postSection(post) {
  const section = String((post && post.section) || '').trim();
  return SECTIONS[section] ? section : '';
}

function postPath(post) {
  const section = postSection(post);
  return section ? `/${section}/${post.slug}` : `/blog/${post.slug}`;
}

function sectionNav(active) {
  const items = [
    { key: 'news', href: '/news', label: 'News' },
    { key: 'codes', href: '/codes', label: 'Codes' },
    { key: 'modding', href: '/modding', label: 'Modding' },
    { key: 'collections', href: '/collections', label: 'Collections' },
    { key: 'compare', href: '/compare', label: 'Compare' },
    { key: 'journal', href: '/blog', label: 'Journal' }
  ];
  return `<nav class="channel-nav" aria-label="Content sections">${items
    .map(
      (item) =>
        `<a class="channel-pill${item.key === active ? ' is-active' : ''}" href="${item.href}">${item.label}</a>`
    )
    .join('')}</nav>`;
}

function authorFor(post) {
  if (!post) return null;
  return (post.authorSlug && authors.get(post.authorSlug)) || authors.byName(post.author) || null;
}

function personLd(author, settings) {
  return {
    '@type': 'Person',
    '@id': `${settings.domain}/author/${author.slug}#person`,
    name: author.name,
    url: `${settings.domain}/author/${author.slug}`,
    description: author.bio || '',
    jobTitle: author.role || 'Editor',
    ...(author.avatar ? { image: `${settings.domain}${author.avatar}` } : {}),
    ...(Array.isArray(author.sameAs) && author.sameAs.length ? { sameAs: author.sameAs } : {}),
    ...(author.worksFor
      ? { worksFor: { '@type': 'Organization', name: author.worksFor.name, url: author.worksFor.url } }
      : {}),
    ...(Array.isArray(author.knowsAbout) && author.knowsAbout.length ? { knowsAbout: author.knowsAbout } : {})
  };
}

function linkLabel(url) {
  if (/github\.com/i.test(url)) return 'GitHub';
  if (/make1day\.dev/i.test(url)) return 'make1day.dev';
  if (/uncorne\.com/i.test(url)) return 'Uncorne';
  return 'Profile';
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
  const section = postSection(post);
  const sectionLabel = section ? SECTIONS[section].label : 'Journal';

  const cover = post.cover
    ? `<div class="pc-cover"><img src="${esc(post.cover)}" alt="${esc(post.title)}" loading="lazy" decoding="async"></div>`
    : `<div class="pc-cover pc-cover-gen" style="--h:${hue}">
        <span class="pc-mark" aria-hidden="true">${esc(post.title.trim().charAt(0).toUpperCase())}</span>
        <span class="pc-kicker">${esc(sectionLabel)}</span>
      </div>`;

  return `<a class="post-card" href="${esc(postPath(post))}">
  ${cover}
  <div class="pc-body">
    <div class="pc-meta">
      <time datetime="${esc(date)}">${esc(date)}</time>
      <span class="pc-dot"></span>
      <span>${mins} min read</span>
      ${section ? `<span class="pc-dot"></span><span>${esc(sectionLabel)}</span>` : ''}
    </div>
    <h2 class="pc-title">${esc(post.title)}</h2>
    <p class="pc-excerpt">${esc(post.excerpt || md.plain(post.body).slice(0, 160))}</p>
    <span class="pc-more">Read article ${icon('arrow', 14)}</span>
  </div>
</a>`;
}

/* ---------------- /blog 索引 ---------------- */

function blogIndexPage(posts, settings, page) {
  const list = livePosts(posts).filter((p) => !postSection(p)).sort(byPublishDate);
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
      url: `${settings.domain}${postPath(p)}`,
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
    ${sectionNav('journal')}
  </div>
</section>

<section class="blog-section">
  <div class="wrap">
    <div class="post-list">
      ${list.map(postCard).join('') || '<div class="empty">No journal posts yet. Browse <a href="/news">News</a>, <a href="/codes">Codes</a> or <a href="/modding">Modding</a>.</div>'}
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

/* ---------------- /news, /codes, /modding ---------------- */

function sectionIndexPage(section, posts, settings) {
  const meta = SECTIONS[section];
  if (!meta) return null;
  const list = livePosts(posts).filter((p) => postSection(p) === section).sort(byPublishDate);
  const url = `${settings.domain}/${section}`;
  const head = jsonLd({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${meta.title} — ${settings.siteName}`,
    url,
    description: meta.description,
    blogPost: list.slice(0, 20).map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      datePublished: fmtDate(p.publishedAt || p.updatedAt),
      url: `${settings.domain}${postPath(p)}`
    }))
  });

  const body = `
<section class="blog-hero">
  <div class="wrap">
    <div class="kicker">${esc(meta.kicker)}</div>
    <h1 class="blog-h1">${esc(meta.heading)}</h1>
    <p class="blog-sub">${esc(meta.description)}</p>
    ${sectionNav(section)}
  </div>
</section>

<section class="blog-section">
  <div class="wrap">
    <div class="post-list">
      ${list.map(postCard).join('') || `<div class="empty">No ${esc(meta.label.toLowerCase())} posts yet. Check back soon.</div>`}
    </div>
  </div>
</section>`;

  return layout({
    settings,
    body,
    title: meta.title,
    description: meta.description,
    canonical: url,
    bodyClass: 'hype hype-list hype-blog',
    head
  });
}

function codeBlock(post) {
  const sets = post.codeSets;
  if (!sets) return '';
  const groups = [
    ['active', 'Active', sets.active || []],
    ['reported', 'Reported, not confirmed', sets.reported || []],
    ['expired', 'Expired', sets.expired || []]
  ];
  const row = (item, status) => `<div class="code-row">
  <div class="code-main"><code>${esc(item.code)}</code><span>${esc(item.reward || '')}</span>${item.source ? `<small>${esc(item.source)}</small>` : ''}</div>
  <button type="button" class="code-copy" data-copy-code="${esc(item.code)}" data-code-status="${esc(status)}" data-code-game="${esc(post.slug)}">Copy</button>
</div>`;
  const blocks = groups
    .filter(([, , items]) => items.length)
    .map(([status, label, items]) => `<h3 class="code-heading code-${status}">${esc(label)}</h3><div class="code-list">${items.map((item) => row(item, status)).join('')}</div>`)
    .join('');

  const empty = !(sets.active || []).length
    ? `<p class="code-note">No official codes are listed at the last check. Unconfirmed strings are kept separate below.</p>`
    : '';

  return `<section class="post-codes">
  <h2>Codes</h2>
  <p class="code-last">Last checked: ${esc(fmtDate(post.lastChecked))}. Codes are case-sensitive and can be retired without notice.</p>
  ${sets.note ? `<p class="code-note">${esc(sets.note)}</p>` : ''}
  ${empty}
  ${blocks || '<p class="code-note">No codes are listed.</p>'}
</section>`;
}

/* ---------------- /blog/:slug ---------------- */

function blogPostPage(post, posts, games, settings) {
  const section = postSection(post);
  const sectionMeta = section ? SECTIONS[section] : null;
  const sectionLabel = sectionMeta ? sectionMeta.label : 'Journal';
  const sectionHref = section ? `/${section}` : '/blog';
  const list = livePosts(posts).filter((p) => postSection(p) === section).sort(byPublishDate);
  const index = list.findIndex((p) => p.slug === post.slug);
  const newer = index > 0 ? list[index - 1] : null;
  const older = index >= 0 && index < list.length - 1 ? list[index + 1] : null;

  const date = fmtDate(post.publishedAt || post.updatedAt);
  const url = `${settings.domain}${postPath(post)}`;
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
      ? personLd(author, settings)
      : { '@type': 'Organization', name: post.author || settings.siteName, url: `${settings.domain}/editorial-policy` },
    publisher: { '@type': 'Organization', name: settings.siteName, url: settings.domain },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    ...(sectionMeta ? { articleSection: sectionLabel } : {})
  };
  if (post.cover) schema.image = post.cover;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: settings.domain + '/' },
      { '@type': 'ListItem', position: 2, name: sectionLabel, item: settings.domain + sectionHref },
      { '@type': 'ListItem', position: 3, name: post.title, item: url }
    ]
  };

  const faqs = Array.isArray(post.faqs) ? post.faqs.filter((f) => f && f.q && f.a) : [];
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
<div class="wrap">
  <article class="post-page">
    <nav class="post-crumbs" aria-label="Breadcrumb">
      <a href="/">Home</a><span>/</span><a href="${sectionHref}">${esc(sectionLabel)}</a>
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
        ${post.lastChecked ? `<span class="pc-dot"></span><span>Checked ${esc(fmtDate(post.lastChecked))}</span>` : ''}
      </div>
    </header>

    <div class="post-body">${md.render(post.body)}</div>

    ${
      faqs.length
        ? `<section class="post-faq">
      <h2 class="post-h2">Frequently asked questions</h2>
      <div class="faq-list">${faqs
          .map((f) => `<div class="faq-item"><h4>${esc(f.q)}</h4><p>${esc(f.a)}</p></div>`)
          .join('')}</div>
    </section>`
        : ''
    }

    ${
      post.lastChecked
        ? `<div class="post-check"><strong>Last checked:</strong> ${esc(fmtDate(post.lastChecked))}. ${
            section === 'codes'
              ? 'Codes change quickly; confirm the reward inside the official game before relying on it.'
              : 'Details can change; follow the linked source for the latest update.'
          }</div>`
        : ''
    }

    ${post.codeSets ? codeBlock(post) : ''}

    ${
      author
        ? `<aside class="author-box">
      <div class="author-avatar" aria-hidden="true">${
        author.avatar
          ? `<img src="${esc(author.avatar)}" alt="" width="48" height="48" loading="lazy">`
          : esc(author.name.charAt(0))
      }</div>
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
        ${newer ? `<a class="pn-link" href="${esc(postPath(newer))}"><span>Newer</span><strong>${esc(newer.title)}</strong></a>` : ''}
        ${older ? `<a class="pn-link pn-next" href="${esc(postPath(older))}"><span>Older</span><strong>${esc(older.title)}</strong></a>` : ''}
      </div>
    </footer>
  </article>
</div>
<script>
(function () {
  document.querySelectorAll('[data-copy-code]').forEach(function (button) {
    button.addEventListener('click', function () {
      var code = button.getAttribute('data-copy-code');
      var copied = function () {
        button.textContent = 'Copied';
        setTimeout(function () { button.textContent = 'Copy'; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(copied).catch(copied);
      } else {
        copied();
      }
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'code_copy', {
          code: code,
          code_status: button.getAttribute('data-code-status'),
          game_slug: button.getAttribute('data-code-game')
        });
      }
    });
  });
})();
</script>
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
    head: `<meta name="author" content="${esc(author ? author.name : post.author || settings.siteName)}">` + jsonLd(schema) + jsonLd(breadcrumb) + faqLd
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
  const longBio = Array.isArray(author.longBio) && author.longBio.length ? author.longBio : [author.bio || ''];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: personLd(author, settings)
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
    <div class="author-avatar author-avatar-lg" aria-hidden="true">${
      author.avatar
        ? `<img src="${esc(author.avatar)}" alt="" width="96" height="96">`
        : esc(author.name.charAt(0))
    }</div>
    <div class="author-hero-text">
      <div class="kicker">${esc(author.role || 'Editor')}</div>
      <h1>${esc(author.name)}</h1>
      <p class="author-affiliation">${esc(author.role || 'Editor')} · ${esc(settings.siteName)}</p>
      <div class="author-bio">${longBio.map((t) => `<p>${esc(t)}</p>`).join('')}</div>
      <div class="author-links">
        ${sameAs
          .map(
            (link) =>
              `<a href="${esc(link)}" rel="me noopener">${esc(linkLabel(link))}</a>`
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
    ogType: 'profile',
    ogImage: author.avatar ? `${settings.domain}${author.avatar}` : '',
    bodyClass: 'hype hype-static hype-blog',
    head: `<meta name="author" content="${esc(author.name)}">` + jsonLd(schema) + jsonLd(breadcrumb)
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
<link>${esc(settings.domain + postPath(p))}</link>
<guid isPermaLink="true">${esc(settings.domain + postPath(p))}</guid>
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

module.exports = { blogIndexPage, sectionIndexPage, blogPostPage, authorPage, rss, livePosts, byPublishDate, postCard, postPath, postSection, sectionNav, SECTIONS };
