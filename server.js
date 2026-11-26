'use strict';

/**
 * PlayHypeGames — 零依赖站点服务
 * 启动：node server.js
 * 前台 /  后台 /admin
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const store = require('./lib/store');
const site = require('./lib/site');
const admin = require('./lib/admin');
const blog = require('./lib/blog');
const md = require('./lib/markdown');
const feeds = require('./lib/feeds');
const copy = require('./lib/copy');
const seo = require('./lib/seo');
const authors = require('./lib/authors');
const rarepop = require('./lib/rarepop');
const external = require('./lib/external');
const judge = require('./lib/judge');
const lore = require('./lib/lore');

// 默认 4180：避开 3000/8080 这类常被本机其他服务占用的端口
const PORT = Number(process.env.PORT) || 4180;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

/* ---------------- 浏览量缓冲 ---------------- */

const pendingViews = new Map();

function flushViews() {
  if (pendingViews.size === 0) return;
  const snapshot = new Map(pendingViews);
  pendingViews.clear();
  try {
    store.addViews(snapshot);
  } catch (err) {
    console.error('[views] 落盘失败：', err.message);
  }
}

setInterval(flushViews, 60 * 1000);
process.on('exit', flushViews);
process.on('SIGINT', () => {
  flushViews();
  process.exit(0);
});
process.on('SIGTERM', () => {
  flushViews();
  process.exit(0);
});

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

/* ---------------- 基础工具 ---------------- */

function send(res, status, body, headers) {
  const h = { 'Content-Type': 'text/html; charset=utf-8', ...(headers || {}) };
  let buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body == null ? '' : body));

  if (status === 200) {
    if (!h['Cache-Control']) h['Cache-Control'] = 'public, max-age=0, s-maxage=300, stale-while-revalidate=600';
    h['CDN-Cache-Control'] = 'public, max-age=300';
    h['Cloudflare-CDN-Cache-Control'] = 'public, max-age=300';
    const etag = `"${crypto.createHash('sha1').update(buf).digest('base64url').slice(0, 20)}"`;
    h.ETag = etag;
    const req = res.req;
    if (req && req.headers['if-none-match'] === etag) {
      res.writeHead(304, h);
      res.end();
      return;
    }
    const type = String(h['Content-Type'] || '');
    const acceptsGzip = req && /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
    if (buf.length > 1024 && acceptsGzip && /^(text\/|application\/(json|xml|javascript))/i.test(type)) {
      buf = zlib.gzipSync(buf, { level: 6 });
      h['Content-Encoding'] = 'gzip';
      h.Vary = 'Accept-Encoding';
    }
  }

  h['Content-Length'] = buf.length;
  res.writeHead(status, h);
  res.end(buf);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 5 * 1024 * 1024) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const raw = await readBody(req);
  if (!raw.trim()) return {};
  const ct = String(req.headers['content-type'] || '');
  if (ct.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  try {
    return JSON.parse(raw);
  } catch {
    return Object.fromEntries(new URLSearchParams(raw));
  }
}

function parseCookies(req) {
  const list = String(req.headers.cookie || '').split(';').map((s) => s.trim());
  const out = {};
  list.forEach((pair) => {
    const i = pair.indexOf('=');
    if (i > 0) out[pair.slice(0, i)] = decodeURIComponent(pair.slice(i + 1));
  });
  return out;
}

/* ---------------- 认证 ---------------- */

const SESSION_COOKIE = 'ph_admin';

function tokenFor(settings) {
  return crypto
    .createHmac('sha256', 'playhypegames-session')
    .update(`${settings.adminUser || ''}:${settings.adminPassword}`)
    .digest('hex')
    .slice(0, 32);
}

function isLoggedIn(req, settings) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return false;
  const expected = tokenFor(settings);
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

/* ---------------- 静态资源 ---------------- */

function serveStatic(req, res, urlPath) {
  const rel = urlPath.replace(/^\/assets\//, '');
  const abs = path.resolve(PUBLIC_DIR, rel);
  if (!abs.startsWith(PUBLIC_DIR + path.sep)) {
    send(res, 403, 'Forbidden');
    return true;
  }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return false;

  const stat = fs.statSync(abs);
  const ext = path.extname(abs).toLowerCase();
  const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Last-Modified': stat.mtime.toUTCString(),
    ETag: etag,
    'Cache-Control':
      ext === '.html'
        ? 'public, max-age=0, must-revalidate'
        : ext === '.woff2' || ext === '.ttf'
          ? 'public, max-age=31536000, immutable'
          : ext === '.css' || ext === '.js'
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=2592000'
  };
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    res.end();
    return true;
  }
  res.writeHead(200, headers);
  fs.createReadStream(abs).pipe(res);
  return true;
}

/* ---------------- 前台 ---------------- */

function handleFront(req, res, url) {
  const settings = store.loadSettings();
  const games = store.loadGames();
  const posts = store.loadPosts();
  const pathname = decodeURIComponent(url.pathname.replace(/\/+$/, '') || '/');
  const page = Number(url.searchParams.get('page')) || 1;

  // 首页
  if (pathname === '/') {
    return send(res, 200, site.homePage(games, settings, posts));
  }

  // RarePop（自研游戏）
  if (pathname === '/rarepop/packs.json') {
    const file = path.join(__dirname, 'data', 'rarity', 'packs.json');
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate'
    });
    res.end(fs.readFileSync(file));
    return;
  }
  if (pathname === '/rarepop/method') {
    return send(res, 200, rarepop.methodPage(settings));
  }
  if (pathname === '/rarepop') {
    return send(res, 200, rarepop.rarePopPage(settings));
  }

  // Rarity Tower 已下线：旧链接 301 到 RarePop
  if (pathname === '/rarity-tower' || pathname.startsWith('/rarity-tower/')) {
    const loc = pathname === '/rarity-tower/method' ? '/rarepop/method' : '/rarepop';
    return send(res, 301, '', { Location: loc });
  }
  if (pathname.startsWith('/assets/games/rarity-tower')) {
    return send(res, 301, '', {
      Location: pathname.replace('/assets/games/rarity-tower', '/assets/games/rarepop')
    });
  }
  if (pathname === '/game/rarity-tower') {
    return send(res, 301, '', { Location: '/game/rarepop' });
  }

  // Journal 索引
  if (pathname === '/blog') {
    return send(res, 200, blog.blogIndexPage(posts, settings, page));
  }

  // 文章旧 URL 301：后台 aliases 维护，用于文章迁址/收编时保留权重与外链。
  // 必须在分区/Journal 文章路由之前检查，否则旧路径会被它们以 404 截走。
  const aliasTarget = blog
    .livePosts(posts)
    .find((p) => Array.isArray(p.aliases) && p.aliases.includes(pathname));
  if (aliasTarget) {
    return send(res, 301, '', { Location: blog.postPath(aliasTarget) });
  }

  // News / Codes / Modding / Guides 栏目与文章
  const sectionMatch = pathname.match(/^\/(news|codes|modding|guides)(?:\/([^/]+))?$/);
  if (sectionMatch) {
    const section = sectionMatch[1];
    if (!sectionMatch[2]) {
      return send(res, 200, blog.sectionIndexPage(section, posts, settings));
    }
    const slug = sectionMatch[2];
    const post = blog.livePosts(posts).find((p) => p.slug === slug && p.section === section);
    if (!post) return null;
    return send(res, 200, blog.blogPostPage(post, posts, games, settings));
  }

  // Journal 文章
  if (pathname.startsWith('/blog/')) {
    const slug = pathname.slice('/blog/'.length);
    const post = blog.livePosts(posts).find((p) => p.slug === slug);
    if (!post) return null;
    if (post.section) {
      return send(res, 301, '', { Location: blog.postPath(post) });
    }
    return send(res, 200, blog.blogPostPage(post, posts, games, settings));
  }

  // 作者页
  if (pathname.startsWith('/author/')) {
    const slug = pathname.slice('/author/'.length);
    if (slug === 'wraithn') {
      return send(res, 301, '', { Location: '/author/wangnan' });
    }
    const html = blog.authorPage(slug, posts, settings);
    if (!html) return null;
    return send(res, 200, html);
  }

  // RSS
  if (pathname === '/rss.xml') {
    return send(res, 200, blog.rss(posts, settings), {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    });
  }

  // 分类总览
  if (pathname === '/categories') {
    return send(res, 200, site.categoriesPage(games, settings));
  }

  // 游戏筛选器
  if (pathname === '/find') {
    const q = {};
    ['session', 'pace', 'input', 'device', 'replay', 'relax'].forEach((key) => {
      q[key] = url.searchParams.get(key) || '';
    });
    return send(res, 200, site.findPage(games, settings, q));
  }

  // 主题合集
  if (pathname === '/collections') {
    return send(res, 200, site.collectionsPage(games, settings));
  }
  if (pathname.startsWith('/collections/')) {
    const slug = pathname.slice('/collections/'.length);
    const html = site.collectionPage(slug, games, settings);
    if (!html) return null;
    return send(res, 200, html);
  }

  // 对比页
  if (pathname === '/compare') {
    const a = url.searchParams.get('a') || '';
    const b = url.searchParams.get('b') || '';
    if (a && b) {
      const curated = site.comparisonSlugFor(a, b);
      if (curated) return send(res, 301, '', { Location: `/compare/${curated}` });
      const html = site.compareDynamic(a, b, games, settings);
      if (!html) return null;
      return send(res, 200, html);
    }
    return send(res, 200, site.compareHubPage(games, settings));
  }
  if (pathname.startsWith('/compare/')) {
    const slug = pathname.slice('/compare/'.length);
    const html = site.comparePage(slug, games, settings);
    if (!html) return null;
    return send(res, 200, html);
  }

  // 最新
  if (pathname === '/new') {
    const live = [...site.published(games)].sort(site.byNewest);
    return send(
      res,
      200,
      site.listPage({
        games,
        settings,
        title: 'New games',
        kicker: 'Fresh this week',
        description: seo.introDescription(copy.listIntro('/new'), 'The newest browser games we have indexed, updated every day.'),
        list: live,
        baseUrl: '/new',
        page,
        active: 'new'
      })
    );
  }

  // 热门
  if (pathname === '/trending') {
    const live = [...site.published(games)].sort(site.byTrending);
    return send(
      res,
      200,
      site.listPage({
        games,
        settings,
        title: 'Trending games',
        kicker: 'Popular now',
        description: seo.introDescription(copy.listIntro('/trending'), 'What everyone is playing this week.'),
        list: live,
        baseUrl: '/trending',
        page,
        active: 'trending'
      })
    );
  }

  // 自研原创游戏（依据 badges 里的 original 角标，与卡片展示同源）
  if (pathname === '/originals') {
    const live = site
      .published(games)
      .filter((g) => Array.isArray(g.badges) && g.badges.includes('original'))
      .sort(site.byNewest);
    return send(
      res,
      200,
      site.listPage({
        games,
        settings,
        title: 'Original games',
        kicker: 'Made by Play Hype',
        description:
          'Games designed and built in-house by the Play Hype studio — original mechanics, no third-party feed listings.',
        heroText:
          'Every title on this page is designed and built in-house by the Play Hype studio rather than syndicated from a game feed. New experiments land here first; when one retires it leaves the catalogue cleanly.',
        list: live,
        baseUrl: '/originals',
        page,
        active: 'originals'
      })
    );
  }

  // 搜索
  if (pathname === '/search') {
    const q = String(url.searchParams.get('q') || '').trim();
    const ql = q.toLowerCase();
    const live = site.published(games).filter((g) => {
      if (!ql) return true;
      return (
        g.title.toLowerCase().includes(ql) ||
        (g.tags || []).some((t) => String(t).toLowerCase().includes(ql)) ||
        String(g.description || '').toLowerCase().includes(ql)
      );
    });
    return send(
      res,
      200,
      site.listPage({
        games,
        settings,
        title: q ? `Search: ${q}` : 'Search',
        kicker: 'Results',
        description: q ? `${live.length} games matching “${q}”.` : 'Type a game name or tag.',
        list: live,
        baseUrl: `/search?q=${encodeURIComponent(q)}`,
        page,
        active: 'search',
        query: q,
        noindex: true
      })
    );
  }

  // 分类页
  if (pathname.startsWith('/category/')) {
    const slug = pathname.slice('/category/'.length);
    const cat = settings.categories.find((c) => c.slug === slug);
    if (!cat) return null;
    // Chromebook 只是浏览器，站里每个 HTML5 游戏本来就都能在 ChromeOS 上跑。
    // 这页不该是"精选子集"，而是全站游戏换一个入口进来 —— 这个词在美国学校设备上搜索量很大
    const live =
      slug === 'chromebook-games'
        ? site.published(games).sort(site.byNewest)
        : slug === 'io-games'
          ? site.published(games).filter((g) => seo.gameTags(g).includes('io')).sort(site.byNewest)
          : site.published(games).filter((g) => g.category === slug).sort(site.byNewest);
    const introDesc = seo.introDescription(copy.categoryIntro(slug), '');
    const countLine = `${live.length} playable browser ${live.length === 1 ? 'game' : 'games'}, no download required.`;
    const categorySeo = seo.categorySeo(slug, live.length, cat.name, seo.description(`${introDesc} ${countLine}`, countLine, 200));
    return send(
      res,
      200,
      site.listPage({
        games,
        settings,
        title: categorySeo.title,
        seoTitle: categorySeo.seoTitle,
        kicker: 'Category',
        description: categorySeo.description,
        heroText: copy.categoryHero(slug) || cat.short || '',
        list: live,
        baseUrl: `/category/${slug}`,
        page,
        active: slug
      })
    );
  }

  // 标签页
  if (pathname.startsWith('/tag/')) {
    const slug = pathname.slice('/tag/'.length);
    const canonicalTag = seo.tagSlug(slug);
    // .io 的完整集合以分类页为准，避免 tag/category 两份相同列表
    if (canonicalTag === 'io') {
      return send(res, 301, '', { Location: '/category/io-games' });
    }
    const live = site
      .published(games)
      .filter((g) => seo.gameTags(g).includes(canonicalTag));
    if (!live.length) return null;
    const tag = { slug: canonicalTag, count: live.length };
    if (slug !== canonicalTag) {
      return send(res, 301, '', { Location: `/tag/${encodeURIComponent(canonicalTag)}${url.search}` });
    }
    const indexable = seo.tagIndexable(tag, settings);
    const label = seo.tagLabel(tag.slug);
    return send(
      res,
      200,
      site.listPage({
        games,
        settings,
        title: label,
        kicker: 'Tag',
        description: seo.tagDescription(tag.slug, label, live.length, settings),
        heroText: '',
        list: live,
        baseUrl: `/tag/${encodeURIComponent(tag.slug)}`,
        page,
        active: 'tag',
        noindex: !indexable
      })
    );
  }

  // 游戏详情
  // 外部单品导流页：不内嵌、不托管，仅原创介绍 + 官方站链接
  if (pathname.startsWith('/play/')) {
    const slug = pathname.slice('/play/'.length);
    const entry = external.find(slug);
    if (!entry) return null;
    return send(res, 200, external.externalPage(entry, settings));
  }

  if (pathname.startsWith('/game/')) {
    const slug = pathname.slice('/game/'.length);
    const game = games.find((g) => g.slug === slug);
    if (!game || (game.status !== 'published' && !isLoggedIn(req, settings))) return null;

    // 浏览量先记在内存，每 60 秒统一落盘（避免每个访客都重写数据文件）
    if (game.status === 'published') {
      pendingViews.set(game.id, (pendingViews.get(game.id) || 0) + 1);
    }

    const related = site
      .published(games)
      .filter((g) => g.id !== game.id && (g.category === game.category || (g.tags || []).some((t) => (game.tags || []).includes(t))))
      .sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))
      .slice(0, 4);

    return send(res, 200, site.gamePage(game, games, settings, related, posts));
  }

  // 游戏加载速度指数
  if (pathname === '/research/browser-game-load-times.csv') {
    return send(res, 200, site.loadTimeCsv(games), {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="playhypegames-load-times.csv"'
    });
  }
  if (pathname === '/research/browser-game-load-times') {
    return send(res, 200, site.loadTimeIndexPage(games, settings));
  }

  // 静态页
  if (['/about', '/privacy', '/terms', '/contact', '/editorial-policy'].includes(pathname)) {
    const html = site.staticPage(settings, pathname.slice(1));
    if (html) return send(res, 200, html);
  }

  // sitemap / robots
  if (pathname === '/sitemap.xml') {
    return send(res, 200, site.sitemap(games, settings, posts), {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    });
  }
  if (pathname === '/robots.txt') {
    return send(res, 200, site.robots(settings), { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  return null;
}

/* ---------------- 游戏数据构造 ---------------- */

function normaliseTags(input) {
  const raw = Array.isArray(input) ? input : String(input || '').split(',');
  const seen = new Set();
  const out = [];
  raw.forEach((t) => {
    const v = String(t || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!v || seen.has(v)) return;
    seen.add(v);
    out.push(v);
  });
  return out;
}

/* 卡片角标白名单：只接受 hot/new/original，输出按固定顺序，脏数据不入库 */
const ALLOWED_BADGES = ['hot', 'new', 'original'];
function normaliseBadges(input) {
  const raw = (Array.isArray(input) ? input : String(input || '').split(','))
    .map((b) => String(b || '').trim().toLowerCase());
  return ALLOWED_BADGES.filter((b) => raw.includes(b));
}

function buildGameRecord(payload, games, settings, existing) {
  const title = seo.cleanText(payload.title);
  if (!title) throw new Error('Title is required');

  const embedUrl = String(payload.embedUrl || '').trim();
  if (!embedUrl && !existing) throw new Error('Embed URL is required');
  // 自研游戏用站内相对路径（/assets/games/...），分发游戏是 http(s) 绝对地址
  if (embedUrl && !/^(https?:\/\/|\/)/i.test(embedUrl)) throw new Error('Embed URL must start with http://, https:// or /');

  const category = String(payload.category || '').trim() || (settings.categories[0] || {}).slug || '';
  if (category && !settings.categories.some((c) => c.slug === category)) {
    throw new Error(`Unknown category: ${category}`);
  }

  const slug = store.uniqueSlug(
    games,
    String(payload.slug || '').trim() || title,
    existing ? existing.id : null
  );

  const now = new Date().toISOString();
  return {
    id: existing ? existing.id : store.nextId(games),
    title,
    slug,
    description: String(payload.description || '').trim(),
    controls: String(payload.controls != null ? payload.controls : (existing && existing.controls) || '').trim(),
    content: String(payload.content || '').trim(),
    embedUrl,
    thumb: String(payload.thumb || '').trim(),
    category,
    tags: normaliseTags(payload.tags),
    badges: normaliseBadges(payload.badges),
    rating: payload.rating === '' || payload.rating == null ? null : Number(payload.rating),
    heat: payload.heat === '' || payload.heat == null
      ? (existing ? Number(existing.heat) || 0 : 0)
      : Number(payload.heat) || 0,
    source: String(payload.source || '').trim() || 'Web embed',
    seoTitle: String(payload.seoTitle || '').trim(),
    seoDescription: String(payload.seoDescription || '').trim(),
    status: payload.status === 'published' ? 'published' : 'draft',
    featured: Boolean(payload.featured),
    views: existing ? Number(existing.views) || 0 : 0,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };
}

/* ---------------- 文章数据构造 ---------------- */

function buildPostRecord(payload, posts, settings, existing) {
  const title = String(payload.title || '').trim();
  if (!title) throw new Error('Title is required');

  const body = String(payload.body || '').trim();
  if (!body) throw new Error('Article body is required');

  // 编辑时如果没传 slug，沿用原 slug，避免已发布文章的 URL 被标题带着变（旧链接会 404）
  const slug = store.uniquePostSlug(
    posts,
    String(payload.slug || '').trim() || (existing ? existing.slug : title),
    existing ? existing.id : null
  );

  // 关联游戏只接受真实存在的 id，避免正文里挂到不存在的卡片
  const games = store.loadGames();
  const relatedIds = (Array.isArray(payload.relatedGames) ? payload.relatedGames : String(payload.relatedGames || '').split(','))
    .map((v) => Number(String(v).trim()))
    .filter((n) => Number.isFinite(n) && games.some((g) => g.id === n));

  const now = new Date().toISOString();
  const publishedAt = String(payload.publishedAt || '').trim() || (existing ? existing.publishedAt : now.slice(0, 10));
  const authorSlug = String(
    payload.authorSlug != null ? payload.authorSlug : (existing && existing.authorSlug) || ''
  ).trim();
  const authorRecord = authorSlug ? authors.get(authorSlug) : null;
  const author =
    String(payload.author || '').trim() ||
    (authorRecord && authorRecord.name) ||
    (existing && existing.author) ||
    settings.siteName;
  const allowedSections = new Set(['', 'news', 'codes', 'modding', 'guides']);
  const requestedSection = String(
    payload.section != null ? payload.section : (existing && existing.section) || ''
  ).trim();
  const section = allowedSections.has(requestedSection) ? requestedSection : '';

  // FAQ / HowTo 条目：白名单字段 + 长度上限，防止脏数据进 JSON-LD；编辑时未传则沿用旧值
  const normalisePairs = (raw, keyA, keyB) =>
    Array.isArray(raw)
      ? raw
          .map((row) => ({
            [keyA]: String((row && row[keyA]) || '').trim(),
            [keyB]: String((row && row[keyB]) || '').trim()
          }))
          .filter((row) => row[keyA] && row[keyB])
          .slice(0, 20)
      : null;
  const incomingFaqs = normalisePairs(payload.faqs, 'q', 'a');
  const incomingHowto = Array.isArray(payload.howto)
    ? payload.howto
        .map((row) => ({
          name: String((row && row.name) || '').trim(),
          text: String((row && row.text) || '').trim()
        }))
        .filter((row) => row.name || row.text)
        .slice(0, 20)
    : null;
  const faqs = incomingFaqs || (existing && Array.isArray(existing.faqs) ? existing.faqs : []);
  const howto = incomingHowto || (existing && Array.isArray(existing.howto) ? existing.howto : []);

  // ItemList 条目：name + url（允许站内相对地址或 http/https 外链），用于榜单类文章
  const incomingItemList = Array.isArray(payload.itemList)
    ? payload.itemList
        .map((row) => ({
          name: String((row && row.name) || '').trim(),
          url: md.safeUrl(String((row && row.url) || '').trim())
        }))
        .filter((row) => row.name && row.url && row.url !== '#')
        .slice(0, 30)
    : null;
  const itemList =
    incomingItemList || (existing && Array.isArray(existing.itemList) ? existing.itemList : []);

  // 旧 URL 别名：只接受站内绝对路径，防协议注入
  const incomingAliases = Array.isArray(payload.aliases)
    ? [...new Set(payload.aliases.map((a) => String(a || '').trim()))]
        .filter((a) => /^\/[a-z0-9/_-]+$/i.test(a))
        .slice(0, 10)
    : null;
  const aliases = incomingAliases || (existing && Array.isArray(existing.aliases) ? existing.aliases : []);
  const lastChecked =
    String(payload.lastChecked != null ? payload.lastChecked : (existing && existing.lastChecked) || '')
      .trim()
      .slice(0, 10);

  return {
    id: existing ? existing.id : store.nextPostId(posts),
    title,
    slug,
    excerpt: String(payload.excerpt || '').trim(),
    body,
    cover: String(payload.cover || '').trim(),
    author,
    authorSlug,
    section,
    lastChecked,
    tags: normaliseTags(payload.tags),
    relatedGames: relatedIds,
    faqs,
    howto,
    itemList,
    aliases,
    seoTitle: String(payload.seoTitle || '').trim(),
    seoDescription: String(payload.seoDescription || '').trim(),
    noindex: Boolean(payload.noindex),
    status: payload.status === 'published' ? 'published' : 'draft',
    publishedAt,
    updatedAt: now
  };
}

/* ---------------- 批量导入解析 ---------------- */

function parseImportRows(raw, defaultCategory, publishState, games, settings) {
  const rows = String(raw || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const created = [];
  const errors = [];

  rows.forEach((line, index) => {
    let parts = line.split('|').map((s) => s.trim());
    if (parts.length < 2) parts = line.split('\t').map((s) => s.trim());

    let title = parts[0] || '';
    let embedUrl = parts[1] || '';
    let category = parts[2] || defaultCategory || '';
    let tags = parts[3] || '';

    // 只给了一个 URL：从路径推断标题
    if (parts.length === 1 && /^https?:\/\//i.test(parts[0])) {
      embedUrl = parts[0];
      const seg = embedUrl.split('/').filter(Boolean).pop() || 'game';
      title = seg.split('?')[0].replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      category = defaultCategory || '';
    }

    if (!title || !embedUrl) {
      errors.push(`Line ${index + 1}: missing title or URL`);
      return;
    }
    if (!settings.categories.some((c) => c.slug === category) && category) {
      errors.push(`Line ${index + 1}: unknown category "${category}", skipped`);
      return;
    }

    try {
      const draft = {
        title,
        embedUrl,
        category: category || (settings.categories[0] || {}).slug,
        tags,
        status: publishState === 'published' ? 'published' : 'draft',
        source: 'Bulk import'
      };
      // 用「已有 + 本轮新增」一起校验 slug 唯一
      created.push(buildGameRecord(draft, [...games, ...created], settings, null));
    } catch (err) {
      errors.push(`Line ${index + 1}: ${err.message}`);
    }
  });

  // 同批次内标题重复的直接跳过
  const seen = new Set();
  const unique = [];
  created.forEach((g) => {
    const key = g.title.toLowerCase();
    if (seen.has(key)) {
      errors.push(`Duplicate title skipped: ${g.title}`);
      return;
    }
    seen.add(key);
    unique.push(g);
  });

  return { created: unique, errors, skipped: rows.length - unique.length };
}

/* ---------------- API ---------------- */

async function handleApi(req, res, url, settings) {
  const pathname = url.pathname;
  if (!pathname.startsWith('/api/')) return false;

  // RarePop fuzzy judge（LLM 只在服务端调用，密钥不进前端）
  if (pathname === '/api/rarepop/judge' && req.method === 'POST') {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    if (!judge.allow(ip)) return sendJson(res, 429, { error: 'rate_limited' });
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (e) {
      return sendJson(res, 400, { error: 'bad_json' });
    }
    const theme = String(body.theme || '').slice(0, 40);
    const questionId = String(body.questionId || '').slice(0, 80);
    const answer = String(body.answer || '').slice(0, 80).trim();
    if (!answer) return sendJson(res, 200, { match: null, source: 'empty' });
    const result = await judge.judge({ theme, questionId, answer });
    return sendJson(res, 200, { match: result.match || null, source: result.source });
  }

  // RarePop planet lore（每次答对生成/缓存一个星球）
  if (pathname === '/api/rarepop/lore' && req.method === 'POST') {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    if (!judge.allow(ip)) return sendJson(res, 429, { error: 'rate_limited' });
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (e) {
      return sendJson(res, 400, { error: 'bad_json' });
    }
    const theme = String(body.theme || '').slice(0, 40);
    const questionId = String(body.questionId || '').slice(0, 80);
    const answer = String(body.answer || '').slice(0, 80).trim();
    if (!answer) return sendJson(res, 200, { name: null, desc: null, source: 'empty' });
    const out = await lore.lore({ theme, questionId, answer });
    return sendJson(res, 200, out);
  }

  // 登录
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const username = String(body.username || '');
    const password = String(body.password || '');
    // 统一报错，不透露是用户名还是密码错了
    if (username !== String(settings.adminUser || '') || password !== settings.adminPassword) {
      return send(res, 200, admin.loginPage(settings, 'Invalid username or password.'));
    }
    const token = tokenFor(settings);
    res.writeHead(302, {
      'Set-Cookie': `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
      Location: '/admin/dashboard'
    });
    res.end();
    return true;
  }

  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    res.writeHead(200, {
      'Set-Cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; Max-Age=0`,
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  // 其余 API 都要登录
  if (!isLoggedIn(req, settings)) {
    return sendJson(res, 401, { error: 'Not authenticated' });
  }

  const games = () => store.loadGames();

  // 批量导入（要放在 /games/:id 之前）
  if (pathname === '/api/admin/games/import' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const current = games();
    const result = parseImportRows(
      body.raw,
      body.defaultCategory || '',
      body.publish || 'draft',
      current,
      settings
    );
    store.saveGames([...current, ...result.created]);
    return sendJson(res, 200, {
      created: result.created.length,
      skipped: result.skipped,
      published: result.created.filter((g) => g.status === 'published').length,
      errors: result.errors
    });
  }

  // 列表
  if (pathname === '/api/admin/games' && req.method === 'GET') {
    return sendJson(res, 200, { games: games() });
  }

  // 新建
  if (pathname === '/api/admin/games' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const current = games();
    try {
      const record = buildGameRecord(body, current, settings, null);
      store.saveGames([...current, record]);
      return sendJson(res, 200, { ok: true, game: record });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 单条操作
  const idMatch = pathname.match(/^\/api\/admin\/games\/(\d+)(\/toggle)?$/);
  if (idMatch) {
    const id = Number(idMatch[1]);
    const isToggle = Boolean(idMatch[2]);
    const current = games();
    const existing = current.find((g) => g.id === id);
    if (!existing) return sendJson(res, 404, { error: 'Game not found' });

    if (isToggle && req.method === 'POST') {
      existing.status = existing.status === 'published' ? 'draft' : 'published';
      existing.updatedAt = new Date().toISOString();
      store.saveGames(current.map((g) => (g.id === id ? existing : g)));
      return sendJson(res, 200, { ok: true, status: existing.status });
    }

    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      try {
        const record = buildGameRecord(body, current, settings, existing);
        store.saveGames(current.map((g) => (g.id === id ? record : g)));
        return sendJson(res, 200, { ok: true, game: record });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (req.method === 'DELETE') {
      store.saveGames(current.filter((g) => g.id !== id));
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  // 分类
  if (pathname === '/api/admin/categories' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const name = String(body.name || '').trim();
    if (!name) return sendJson(res, 400, { error: 'Name is required' });
    const slug = store.slugify(body.slug || name);
    if (!slug) return sendJson(res, 400, { error: 'Invalid slug' });
    if (settings.categories.some((c) => c.slug === slug)) {
      return sendJson(res, 400, { error: 'Category already exists' });
    }
    settings.categories.push({ slug, name, short: name, icon: 'grid' });
    store.saveSettings({ categories: settings.categories });
    return sendJson(res, 200, { ok: true });
  }

  const catMatch = pathname.match(/^\/api\/admin\/categories\/([a-z0-9-]+)$/);
  if (catMatch) {
    const slug = catMatch[1];
    const cat = settings.categories.find((c) => c.slug === slug);
    if (!cat) return sendJson(res, 404, { error: 'Category not found' });

    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      cat.name = String(body.name || cat.name).trim();
      store.saveSettings({ categories: settings.categories });
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'DELETE') {
      settings.categories = settings.categories.filter((c) => c.slug !== slug);
      store.saveSettings({ categories: settings.categories });
      // 把该分类下的游戏改为未分类
      const all = games().map((g) => (g.category === slug ? { ...g, category: '' } : g));
      store.saveGames(all);
      return sendJson(res, 200, { ok: true });
    }
  }

  // 目录源：读配置
  if (pathname === '/api/admin/feeds' && req.method === 'GET') {
    return sendJson(res, 200, { providers: feeds.PROVIDERS, feeds: feeds.getFeeds(settings) });
  }

  // 目录源：保存配置
  if (pathname === '/api/admin/feeds' && req.method === 'PUT') {
    const body = await readJsonBody(req);
    const key = String(body.provider || '').trim();
    const all = feeds.getFeeds(settings);
    if (!all[key]) return sendJson(res, 400, { error: `Unknown provider: ${key}` });

    const patch = {};
    ['endpoint', 'apiKey', 'listPath', 'defaultCategory'].forEach((f) => {
      if (body[f] != null) patch[f] = String(body[f]).trim();
    });
    if (body.limit != null) patch.limit = Math.max(1, Math.min(Number(body.limit) || 30, 200));
    if (body.maxAgeDays != null) patch.maxAgeDays = Math.max(0, Number(body.maxAgeDays) || 0);
    if (body.enabled != null) patch.enabled = Boolean(body.enabled);
    if (body.skipBrandIp != null) patch.skipBrandIp = Boolean(body.skipBrandIp);

    all[key] = { ...all[key], ...patch };
    store.saveSettings({ feeds: all });
    return sendJson(res, 200, { ok: true, config: all[key] });
  }

  // 目录源：执行同步
  if (pathname === '/api/admin/feeds/sync' && req.method === 'POST') {
    const body = await readJsonBody(req);
    try {
      const result = await feeds.sync(String(body.provider || ''), settings, { dryRun: Boolean(body.dryRun) });
      return sendJson(res, 200, { ok: true, result });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 文章列表
  if (pathname === '/api/admin/posts' && req.method === 'GET') {
    return sendJson(res, 200, { posts: store.loadPosts() });
  }
  // Markdown 预览（编辑器实时预览用，不需要落盘）
  if (pathname === '/api/admin/posts/preview' && req.method === 'POST') {
    const body = await readJsonBody(req);
    return sendJson(res, 200, {
      html: md.render(body.body || ''),
      words: md.wordCount(body.body || ''),
      minutes: md.readMinutes(body.body || '')
    });
  }

  // 新建文章
  if (pathname === '/api/admin/posts' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const current = store.loadPosts();
    try {
      const record = buildPostRecord(body, current, settings, null);
      store.savePosts([...current, record]);
      return sendJson(res, 200, { ok: true, post: record });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 单篇操作
  const postMatch = pathname.match(/^\/api\/admin\/posts\/(\d+)(\/toggle)?$/);
  if (postMatch) {
    const id = Number(postMatch[1]);
    const isToggle = Boolean(postMatch[2]);
    const current = store.loadPosts();
    const existing = current.find((p) => p.id === id);
    if (!existing) return sendJson(res, 404, { error: 'Post not found' });

    if (isToggle && req.method === 'POST') {
      existing.status = existing.status === 'published' ? 'draft' : 'published';
      existing.updatedAt = new Date().toISOString();
      store.savePosts(current.map((p) => (p.id === id ? existing : p)));
      return sendJson(res, 200, { ok: true, status: existing.status });
    }

    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      try {
        const record = buildPostRecord(body, current, settings, existing);
        store.savePosts(current.map((p) => (p.id === id ? record : p)));
        return sendJson(res, 200, { ok: true, post: record });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (req.method === 'DELETE') {
      store.savePosts(current.filter((p) => p.id !== id));
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  // 站点设置
  if (pathname === '/api/admin/settings' && req.method === 'PUT') {
    const body = await readJsonBody(req);
    const patch = {};
    ['siteName', 'tagline', 'description', 'contactEmail', 'adsenseClient', 'adminUser', 'adminPassword', 'ga4Id', 'googleSiteVerification'].forEach((k) => {
      // 环境变量托管的字段不允许表单写回文件
      if (k === 'adminPassword' && process.env.ADMIN_PASSWORD) return;
      if (k === 'adminUser' && process.env.ADMIN_USERNAME) return;
      if (body[k] == null) return;
      if (k === 'ga4Id') patch[k] = String(body[k]).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      else if (k === 'googleSiteVerification') patch[k] = String(body[k]).trim().replace(/[^A-Za-z0-9_-]/g, '');
      else patch[k] = String(body[k]).trim();
    });
    if (body.domain && !process.env.SITE_DOMAIN) patch.domain = String(body.domain).trim().replace(/\/+$/, '');
    if (!patch.siteName) patch.siteName = settings.siteName;
    store.saveSettings(patch);
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: 'Unknown endpoint' });
}

/* ---------------- 后台页面路由 ---------------- */

function handleAdmin(req, res, url) {
  const pathname = url.pathname;
  if (!pathname.startsWith('/admin')) return false;

  const settings = store.loadSettings();

  if (pathname === '/admin' || pathname === '/admin/') {
    if (isLoggedIn(req, settings)) {
      res.writeHead(302, { Location: '/admin/dashboard' });
      res.end();
      return true;
    }
    return send(res, 200, admin.loginPage(settings, '')), true;
  }

  if (!isLoggedIn(req, settings)) {
    res.writeHead(302, { Location: '/admin' });
    res.end();
    return true;
  }

  const games = store.loadGames();
  const query = Object.fromEntries(url.searchParams.entries());

  if (pathname === '/admin/dashboard') {
    return send(res, 200, admin.dashboardPage(games, settings, query)), true;
  }

  if (pathname === '/admin/game/new') {
    return send(res, 200, admin.gameFormPage(null, settings)), true;
  }

  const editMatch = pathname.match(/^\/admin\/game\/(\d+)\/edit$/);
  if (editMatch) {
    const game = games.find((g) => g.id === Number(editMatch[1]));
    if (!game) {
      send(res, 404, 'Game not found');
      return true;
    }
    return send(res, 200, admin.gameFormPage(game, settings)), true;
  }

  if (pathname === '/admin/import') {
    const result =
      query.created != null
        ? {
            created: Number(query.created) || 0,
            skipped: Number(query.skipped) || 0,
            published: 0,
            errors: []
          }
        : null;
    return send(res, 200, admin.importPage(settings, result)), true;
  }

  if (pathname === '/admin/categories') {
    return send(res, 200, admin.categoriesPage(settings, games)), true;
  }

  if (pathname === '/admin/tags') {
    return send(res, 200, admin.tagsPage(settings, games)), true;
  }

  if (pathname === '/admin/posts') {
    return send(res, 200, admin.postsPage(store.loadPosts(), settings, query)), true;
  }

  if (pathname === '/admin/feeds') {
    return send(res, 200, admin.feedsPage(settings, games)), true;
  }

  if (pathname === '/admin/post/new') {
    return send(res, 200, admin.postFormPage(null, settings, games)), true;
  }

  const postEditMatch = pathname.match(/^\/admin\/post\/(\d+)\/edit$/);
  if (postEditMatch) {
    const post = store.loadPosts().find((p) => p.id === Number(postEditMatch[1]));
    if (!post) {
      send(res, 404, 'Post not found');
      return true;
    }
    return send(res, 200, admin.postFormPage(post, settings, games)), true;
  }

  if (pathname === '/admin/settings') {
    return send(res, 200, admin.settingsPage(settings)), true;
  }

  send(res, 404, 'Not found');
  return true;
}

/* ---------------- 启动 ---------------- */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    const settings = store.loadSettings();

    if (pathname.startsWith('/assets/')) {
      if (serveStatic(req, res, pathname)) return;
    }

    if (pathname.startsWith('/api/')) {
      const handled = await handleApi(req, res, url, settings);
      if (!handled && !res.writableEnded) sendJson(res, 404, { error: 'Unknown endpoint' });
      return;
    }

    if (pathname.startsWith('/admin')) {
      if (handleAdmin(req, res, url)) return;
    }

    handleFront(req, res, url);
    if (!res.writableEnded) {
      send(res, 404, site.notFoundPage(settings));
      return;
    }
  } catch (err) {
    console.error('[error]', req.method, pathname, err);
    if (!res.writableEnded) send(res, 500, 'Server error');
  }
});

function startServer(port, attempt) {
  const tryCount = attempt || 0;

  const onError = (err) => {
    if (err.code === 'EADDRINUSE' && tryCount < 10) {
      console.log(`  端口 ${port} 已被占用，改用 ${port + 1}`);
      startServer(port + 1, tryCount + 1);
      return;
    }
    console.error('[startup]', err.message);
    process.exit(1);
  };

  server.once('error', onError);
  server.listen(port, HOST, () => {
    server.removeListener('error', onError);
    const settings = store.loadSettings();
    const actual = server.address().port;
    console.log('');
    console.log('  PlayHypeGames 已启动');
    console.log(`  前台   http://localhost:${actual}`);
    console.log(`  后台   http://localhost:${actual}/admin`);
    console.log(`  域名   ${settings.domain}`);
    console.log('');
  });
}

startServer(PORT, 0);
