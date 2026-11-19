'use strict';

/**
 * 外部游戏目录同步（零依赖）。
 *
 * 设计意图：不猜各家私有 API 的字段，而是给一个「端点 + 数组路径 + 字段别名」的通用适配器。
 * 你在后台填好 endpoint（有的库需要 API key），同步时按别名表自动认字段。
 * 拉回来的游戏一律进 draft，人工确认后再发布 —— 避免库里有问题的条目自动上线。
 */

const store = require('./store');

const PROVIDERS = {
  gameMonetize: {
    label: 'GameMonetize',
    hint: 'RSS Feed 页生成：Format=JSON、Category=All（生成 category=1）、每页 100。category 只认数字 ID，填别的值会返回空数组。',
    endpointPlaceholder: 'https://gamemonetize.com/feed.php?format=0&category=1&num=100&page=1',
    needsKey: false
  },
  gameDistribution: {
    label: 'GameDistribution',
    hint: 'Publisher 后台 → DGI / catalog，取 JSON 端点。常见字段：title / url / image / category。',
    endpointPlaceholder: 'https://api.gamedistribution.com/v2/games?...',
    needsKey: true
  },
  gamePix: {
    label: 'GamePix',
    hint: 'Affiliate 后台的 games feed。常见字段：name / gameUrl / image。',
    endpointPlaceholder: 'https://api.gamepix.com/v1/games?...',
    needsKey: true
  },
  generic: {
    label: 'Custom JSON',
    hint: '任意返回 JSON 数组的地址。用于自建 catalog 或第三方 broker。',
    endpointPlaceholder: 'https://example.com/games.json',
    needsKey: false
  }
};

const DEFAULT_FEEDS = {
  gameMonetize: { enabled: false, endpoint: '', apiKey: '', listPath: '', limit: 30, maxAgeDays: 0, defaultCategory: 'action-games', skipBrandIp: true },
  gameDistribution: { enabled: false, endpoint: '', apiKey: '', listPath: '', limit: 30, maxAgeDays: 0, defaultCategory: '', skipBrandIp: true },
  gamePix: { enabled: false, endpoint: '', apiKey: '', listPath: '', limit: 30, maxAgeDays: 0, defaultCategory: '', skipBrandIp: true },
  generic: { enabled: false, endpoint: '', apiKey: '', listPath: '', limit: 30, maxAgeDays: 0, defaultCategory: '', skipBrandIp: true }
};

/* 字段别名：按优先级从高到低尝试 */
const ALIASES = {
  title: ['title', 'name', 'gameName', 'game_title'],
  embedUrl: ['embedUrl', 'embed_url', 'gameUrl', 'game_url', 'url', 'iframeUrl', 'iframe_url', 'link'],
  thumb: ['thumb', 'thumbnail', 'image', 'imageUrl', 'image_url', 'cover', 'img', 'banner'],
  description: ['description', 'desc', 'summary', 'shortDescription'],
  category: ['category', 'genre', 'categories', 'gameCategory'],
  tags: ['tags', 'keywords', 'labels'],
  externalId: ['id', 'gameId', 'game_id', 'externalId', 'slug'],
  releasedAt: ['publishedAt', 'published_at', 'releaseDate', 'release_date', 'date', 'createdAt', 'addedAt']
};

function getFeeds(settings) {
  const saved = (settings && settings.feeds) || {};
  const out = {};
  Object.keys(DEFAULT_FEEDS).forEach((k) => {
    out[k] = { ...DEFAULT_FEEDS[k], ...(saved[k] || {}) };
  });
  return out;
}

/**
 * 品牌 IP 关键词。命中的条目不导入 —— 分发库里大量存在大厂 IP 的网页移植版，
 * 这些不是授权移植，多数是第三方上传的仿制版本。新站早期被 DMCA 或商标投诉，
 * 代价远高于多上几十款小游戏。
 */
const BRAND_RISK = [
  'super mario', 'mario bros', 'wario', 'minecraft', 'mine-craft', 'minescraft',
  'among us', 'subway surfers', 'candy crush', 'temple run', 'papaya',
  'sonic', 'poppy playtime', 'huggy wuggy', 'cuphead', 'friday night funkin',
  'talking tom', 'bitlife', 'homescapes', 'gardenscapes', 'fishdom', 'township',
  'paper.io', 'paper io', 'roblox', 'pokemon', 'spider man', 'spiderman',
  'batman', 'squid game', 'baldi', 'golf battle', 'golf king', 'tiles hop',
  'brain test', 'bowmasters', 'street fighter', 'zelda', 'angry birds',
  'plants vs zombies', 'cut the rope', 'hill climb', 'fireboy', 'watergirl',
  'red ball', 'car eats car', 'hunter assassin', 'brawl stars', 'clash of clans',
  'clash royale', 'hay day', 'zumba', 'bentley', 'ferrari', 'lamborghini',
  'cybertruck', 'miraculous', 'ladybug', 'fall guys', 'fortnite', 'gta ',
  'grand theft auto', 'real racing', 'need for speed', 'plants vs'
];

/** 返回命中的品牌关键词，未命中返回空字符串。
 *  只看标题：描述里常见 "paper.io-style"、"like Minecraft" 这类类比写法，
 *  拿描述一起判断会把原创竞技类游戏误杀。侵权风险首先体现在标题与素材上。
 */
function brandHit(title) {
  const hay = String(title || '').toLowerCase();
  for (const kw of BRAND_RISK) {
    if (hay.includes(kw)) return kw;
  }
  return '';
}

/** 取形如 a.b.0.c 的路径；空路径返回原对象 */
function pickPath(obj, path) {
  const p = String(path || '').trim();
  if (!p) return obj;
  return p.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function pickField(item, aliases) {
  for (const key of aliases) {
    const v = item[key];
    if (v != null && String(v).trim() !== '') return v;
  }
  return '';
}

/** 归一化 URL 用于去重：去协议、去 query 的差异太激进，这里只去尾部斜杠与大小写 */
function normUrl(u) {
  return String(u || '').trim().toLowerCase().replace(/\/+$/, '');
}

/** 把库的分类字符串映射到站内固定 slug，认不出就留空 */
function mapCategory(raw, settings, fallback) {
  const slug = String(raw || '').trim().toLowerCase();
  if (!slug) return fallback || '';
  const cats = (settings && settings.categories) || [];
  const hit = cats.find((c) => c.slug === slug || c.name.toLowerCase() === slug);
  if (hit) return hit.slug;

  const rules = [
    [/\.io|arena|battle royale|survival/, 'io-games'],
    [/idle|clicker|incremental|tycoon|farm/, 'idle-games'],
    [/action|shoot|runner|racing|arcade|platform/, 'action-games'],
    [/strateg|tower|puzzle|mahjong|match|card|board/, 'strategy-games'],
    [/2 player|2p|multiplayer|versus/, '2-player-games'],
    [/chromebook|school|office|browser/, 'chromebook-games']
  ];
  for (const [re, target] of rules) {
    if (re.test(slug)) return target;
  }
  return fallback || '';
}

function normaliseItem(item, cfg, settings) {
  if (!item || typeof item !== 'object') return null;

  const title = String(pickField(item, ALIASES.title) || '').trim();
  const embedUrl = String(pickField(item, ALIASES.embedUrl) || '').trim();
  if (!title || !embedUrl) return null;
  if (!/^https?:\/\//i.test(embedUrl)) return null;

  const tagsRaw = pickField(item, ALIASES.tags);
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw
    : String(tagsRaw || '').split(',').filter(Boolean);

  return {
    title,
    embedUrl,
    thumb: String(pickField(item, ALIASES.thumb) || '').trim(),
    description: String(pickField(item, ALIASES.description) || '').trim().slice(0, 200),
    category: mapCategory(pickField(item, ALIASES.category), settings, cfg.defaultCategory),
    tags,
    externalId: String(pickField(item, ALIASES.externalId) || '').trim(),
    releasedAt: String(pickField(item, ALIASES.releasedAt) || '').trim()
  };
}

async function fetchJson(endpoint, apiKey, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 20000);
  try {
    const headers = { Accept: 'application/json', 'User-Agent': 'PlayHypeGamesBot/1.0 (+https://playhypegames.com)' };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const res = await fetch(endpoint, { headers, signal: controller.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`Endpoint returned HTTP ${res.status}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Endpoint did not return JSON (check the URL and API key)');
    }
  } finally {
    clearTimeout(timer);
  }
}

function isFresh(releasedAt, maxAgeDays) {
  if (!maxAgeDays || maxAgeDays <= 0) return true;
  const t = new Date(releasedAt).getTime();
  if (Number.isNaN(t)) return true; // 没有日期的不过滤，交给人工看
  return Date.now() - t <= maxAgeDays * 86400000;
}

/** 构造一条站内记录，字段与 server.buildGameRecord 的输出保持一致 */
function makeRecord(n, games, settings) {
  const now = new Date().toISOString();
  return {
    id: store.nextId(games),
    title: n.title,
    slug: store.uniqueSlug(games, n.title, null),
    description: n.description,
    content: '',
    embedUrl: n.embedUrl,
    thumb: n.thumb,
    category: n.category || (settings.categories[0] || {}).slug || '',
    tags: (n.tags || [])
      .map((t) => String(t || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
      .filter(Boolean),
    rating: null,
    heat: 0,
    source: 'Feed sync',
    externalId: n.externalId,
    releasedAt: n.releasedAt,
    seoTitle: '',
    seoDescription: '',
    status: 'draft',
    featured: false,
    views: 0,
    createdAt: n.releasedAt && !Number.isNaN(new Date(n.releasedAt).getTime()) ? new Date(n.releasedAt).toISOString() : now,
    updatedAt: now
  };
}

/**
 * 执行一次同步。dryRun 只返回将要新增的数量，不落盘。
 * 返回：{ provider, fetched, accepted, added, skipped, errors, samples }
 */
async function sync(providerKey, settings, opts) {
  const o = opts || {};
  const feeds = getFeeds(settings);
  const cfg = feeds[providerKey];
  if (!cfg) throw new Error(`Unknown provider: ${providerKey}`);
  if (!cfg.endpoint) throw new Error('No endpoint configured for this provider');

  const raw = await fetchJson(cfg.endpoint, cfg.apiKey, o.timeoutMs);
  let arr = cfg.listPath ? pickPath(raw, cfg.listPath) : raw;
  if (!Array.isArray(arr)) {
    // 没配 listPath 或路径不对时，退一步找第一个数组字段
    const firstArray = Object.values(raw || {}).find((v) => Array.isArray(v));
    arr = Array.isArray(firstArray) ? firstArray : [];
  }

  const games = store.loadGames();
  const seenUrls = new Set(games.map((g) => normUrl(g.embedUrl)));
  const seenSlugs = new Set(games.map((g) => g.slug));
  const seenExternal = new Set(games.map((g) => String(g.externalId || '')).filter(Boolean));

  const errors = [];
  const created = [];
  const riskSamples = [];
  let accepted = 0;
  let skipped = 0;
  let riskSkipped = 0;

  const limit = Math.max(1, Math.min(Number(cfg.limit) || 30, 200));

  arr.slice(0, limit * 3).forEach((item, i) => {
    if (created.length >= limit) return;
    const n = normaliseItem(item, cfg, settings);
    if (!n) {
      skipped++;
      errors.push(`Item ${i + 1}: missing title or embed URL`);
      return;
    }
    const brand = brandHit(n.title, n.description);
    if (brand && cfg.skipBrandIp !== false) {
      riskSkipped++;
      riskSamples.push(`${n.title} (${brand})`);
      return;
    }
    if (!isFresh(n.releasedAt, Number(cfg.maxAgeDays) || 0)) {
      skipped++;
      return;
    }
    if (seenUrls.has(normUrl(n.embedUrl))) {
      skipped++;
      return;
    }
    if (n.externalId && seenExternal.has(n.externalId)) {
      skipped++;
      return;
    }

    const rec = makeRecord(n, [...games, ...created], settings);
    if (seenSlugs.has(rec.slug)) {
      skipped++;
      return;
    }
    seenSlugs.add(rec.slug);
    seenUrls.add(normUrl(n.embedUrl));
    if (n.externalId) seenExternal.add(n.externalId);
    created.push(rec);
    accepted++;
  });

  if (!o.dryRun && created.length) {
    store.saveGames([...games, ...created]);
  }

  return {
    provider: providerKey,
    fetched: arr.length,
    accepted,
    added: created.length,
    skipped,
    riskSkipped,
    riskSamples: riskSamples.slice(0, 8),
    errors: errors.slice(0, 8),
    samples: created.slice(0, 5).map((g) => ({ id: g.id, title: g.title, category: g.category }))
  };
}

module.exports = { PROVIDERS, DEFAULT_FEEDS, getFeeds, sync, mapCategory, normUrl, ALIASES, BRAND_RISK, brandHit };
