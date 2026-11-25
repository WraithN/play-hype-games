'use strict';

/**
 * 数据层：JSON 文件存储（零依赖）。
 * 之后要换成 Postgres / Supabase，只需要替换本文件导出的读写函数，
 * 上层 render / admin / site 都只依赖这里的接口。
 */

const fs = require('fs');
const path = require('path');
const seo = require('./seo');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    console.error('[store] 读取失败，使用默认值：', file, err.message);
    return fallback;
  }
}

/** 原子写：先写临时文件再 rename，避免写一半进程被杀导致数据文件损坏 */
function writeJson(file, data) {
  ensureDataDir();
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

/* ---------------- 默认站点配置 ---------------- */

const DEFAULT_SETTINGS = {
  siteName: 'PLAY HYPE GAMES',
  domain: 'https://www.playhypegames.com',
  tagline: 'Play the Hype',
  description:
    'Play the hottest free browser games online. New .io, idle, action and 2-player games added every day. No download, no install.',
  adsenseClient: '',
  // 仅本地开发兜底；仓库公开，真实凭据只能走环境变量 ADMIN_USERNAME / ADMIN_PASSWORD
  adminUser: 'admin',
  adminPassword: 'dev-only-change-me',
  contactEmail: 'hello@playhypegames.com',
  ga4Id: '',
  googleSiteVerification: '',
  categories: [
    { slug: 'io-games', name: '.IO Games', short: 'Battle & survive', icon: 'io' },
    { slug: 'idle-games', name: 'Idle Games', short: 'Relaxed progression', icon: 'idle' },
    { slug: 'action-games', name: 'Action Games', short: 'Fast-paced arcade', icon: 'action' },
    { slug: 'strategy-games', name: 'Strategy Games', short: 'Plan & conquer', icon: 'strategy' },
    { slug: '2-player-games', name: '2 Player Games', short: 'Challenge a friend', icon: '2p' },
    { slug: 'chromebook-games', name: 'Chromebook Games', short: 'School & office ready', icon: 'chromebook' }
  ],
  updatedAt: new Date().toISOString()
};

function loadSettings() {
  const saved = readJson(SETTINGS_FILE, null);
  if (!saved) {
    writeJson(SETTINGS_FILE, DEFAULT_SETTINGS);
    return applyEnvOverrides({ ...DEFAULT_SETTINGS });
  }
  return applyEnvOverrides({ ...DEFAULT_SETTINGS, ...saved });
}

/**
 * 环境变量覆盖（部署平台用）：
 * - ADMIN_USERNAME / ADMIN_PASSWORD：后台用户名和密码，避免公开仓库里的默认凭据直接生效
 * - SITE_DOMAIN：站点域名，用于 sitemap / RSS / canonical
 */
function applyEnvOverrides(settings) {
  if (process.env.ADMIN_USERNAME) settings.adminUser = String(process.env.ADMIN_USERNAME);
  if (process.env.ADMIN_PASSWORD) settings.adminPassword = String(process.env.ADMIN_PASSWORD);
  if (process.env.SITE_DOMAIN) settings.domain = String(process.env.SITE_DOMAIN).replace(/\/+$/, '');
  if (process.env.GA4_ID) settings.ga4Id = String(process.env.GA4_ID).trim();
  if (process.env.GOOGLE_SITE_VERIFICATION) settings.googleSiteVerification = String(process.env.GOOGLE_SITE_VERIFICATION).trim();
  settings.domain = seo.canonicalDomain(settings.domain);
  return settings;
}

function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch, updatedAt: new Date().toISOString() };
  writeJson(SETTINGS_FILE, next);
  return next;
}

/* ---------------- 游戏数据 ---------------- */

// 内存缓存：避免每个请求都读盘 + JSON.parse 几千条数据
let gamesCache = null;
let gamesMtime = -1;

function loadGames() {
  try {
    const st = fs.statSync(GAMES_FILE);
    if (gamesCache && st.mtimeMs === gamesMtime) return gamesCache;
    const raw = fs.readFileSync(GAMES_FILE, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : [];
    gamesCache = Array.isArray(parsed) ? parsed : [];
    gamesMtime = st.mtimeMs;
    return gamesCache;
  } catch (err) {
    if (gamesCache) return gamesCache;
    if (err.code !== 'ENOENT') console.error('[store] 游戏数据读取失败：', err.message);
    gamesCache = [];
    return gamesCache;
  }
}

function saveGames(games) {
  writeJson(GAMES_FILE, games);
  gamesCache = games;
  try {
    gamesMtime = fs.statSync(GAMES_FILE).mtimeMs;
  } catch {
    gamesMtime = -1;
  }
  return games;
}

/** 累加浏览量，由 server 定时批量调用，避免每次访问都落盘 */
function addViews(viewMap) {
  if (!viewMap || viewMap.size === 0) return;
  const games = loadGames();
  let changed = false;
  viewMap.forEach((count, id) => {
    const game = games.find((g) => g.id === id);
    if (game) {
      game.views = (Number(game.views) || 0) + count;
      changed = true;
    }
  });
  if (changed) saveGames(games);
}

function nextId(games) {
  return games.reduce((max, g) => Math.max(max, Number(g.id) || 0), 0) + 1;
}

/* ---------------- 文章数据 ---------------- */

// 和游戏一样带 mtime 缓存：文章正文可能上万字，不必每个请求都 parse
let postsCache = null;
let postsMtime = -1;

function loadPosts() {
  try {
    const st = fs.statSync(POSTS_FILE);
    if (postsCache && st.mtimeMs === postsMtime) return postsCache;
    const raw = fs.readFileSync(POSTS_FILE, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : [];
    postsCache = Array.isArray(parsed) ? parsed : [];
    postsMtime = st.mtimeMs;
    return postsCache;
  } catch (err) {
    if (postsCache) return postsCache;
    if (err.code !== 'ENOENT') console.error('[store] 文章数据读取失败：', err.message);
    postsCache = [];
    return postsCache;
  }
}

function savePosts(posts) {
  writeJson(POSTS_FILE, posts);
  postsCache = posts;
  try {
    postsMtime = fs.statSync(POSTS_FILE).mtimeMs;
  } catch {
    postsMtime = -1;
  }
  return posts;
}

function nextPostId(posts) {
  return posts.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
}

/** 文章 slug 去重，和游戏共用 slugify 规则 */
function uniquePostSlug(posts, base, ignoreId) {
  let slug = slugify(base) || 'post';
  const taken = new Set(posts.filter((p) => p.id !== ignoreId).map((p) => p.slug));
  if (!taken.has(slug)) return slug;
  let i = 2;
  while (taken.has(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

/* ---------------- 工具 ---------------- */

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

/** 保证 slug 唯一，重复就加 -2 -3 */
function uniqueSlug(games, base, ignoreId) {
  let slug = slugify(base) || 'game';
  const taken = new Set(
    games.filter((g) => g.id !== ignoreId).map((g) => g.slug)
  );
  if (!taken.has(slug)) return slug;
  let i = 2;
  while (taken.has(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

/** 汇总所有已发布游戏的标签 */
function collectTags(games) {
  const map = new Map();
  games
    .filter((g) => g.status === 'published')
    .forEach((g) => {
      seo.gameTags(g).forEach((t) => {
        const key = t;
        if (!key) return;
        map.set(key, (map.get(key) || 0) + 1);
      });
    });
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug, count]) => ({ slug, count }));
}

module.exports = {
  ROOT,
  DATA_DIR,
  GAMES_FILE,
  SETTINGS_FILE,
  POSTS_FILE,
  loadSettings,
  saveSettings,
  loadGames,
  saveGames,
  addViews,
  nextId,
  loadPosts,
  savePosts,
  nextPostId,
  uniquePostSlug,
  slugify,
  uniqueSlug,
  collectTags,
  DEFAULT_SETTINGS
};
