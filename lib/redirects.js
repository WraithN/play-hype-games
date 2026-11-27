'use strict';

/* ============================================================
   路径级 301 重定向（data/redirects.json）
   - 用于页面收敛：把旧 URL 永久指向新的主页面
   - 与文章 aliases 不同，目标可以是任意路径（例如 /game/<slug>）
   - 只接受站内绝对路径，避免开放重定向
   ============================================================ */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'redirects.json');

let cache = null;
let mtime = -1;

function list() {
  try {
    const st = fs.statSync(FILE);
    if (cache && st.mtimeMs === mtime) return cache;
    const raw = fs.readFileSync(FILE, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : [];
    cache = (Array.isArray(parsed) ? parsed : [])
      .filter((r) => r && /^\/[a-z0-9/_-]+$/i.test(String(r.from || '')) && /^\/[a-z0-9/_-]+$/i.test(String(r.to || '')))
      .map((r) => ({
        from: String(r.from).replace(/\/+$/, '') || '/',
        to: String(r.to),
        reason: String(r.reason || '').slice(0, 200)
      }));
    mtime = st.mtimeMs;
    return cache;
  } catch (err) {
    if (cache) return cache;
    if (err.code !== 'ENOENT') console.error('[redirects] 读取失败：', err.message);
    cache = [];
    return cache;
  }
}

/** 返回目标路径，找不到返回 '' */
function lookup(pathname) {
  const p = String(pathname || '').replace(/\/+$/, '') || '/';
  const hit = list().find((r) => r.from === p);
  return hit ? hit.to : '';
}

module.exports = { list, lookup };
