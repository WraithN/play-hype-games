'use strict';

/**
 * Cold-fetch audit for the 20 most exposed game embeds.
 *
 * This does NOT play the game. It measures the embed document and its initial
 * runtime payload with no browser cache, and records static evidence for
 * viewport/touch/keyboard support. Results are written to data/game-audits.json.
 *
 * Run: node scripts/audit-games.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const games = require(path.join(ROOT, 'data/games.json'));
const OUT = path.join(ROOT, 'data/game-audits.json');
const UA = 'PlayHypeGamesAudit/1.0 (+https://www.playhypegames.com)';

function byNewest(a, b) {
  const da = new Date(a.createdAt || 0).getTime() || 0;
  const db = new Date(b.createdAt || 0).getTime() || 0;
  if (db !== da) return db - da;
  return (Number(b.id) || 0) - (Number(a.id) || 0);
}

async function timedFetch(url, maxBytes = 3 * 1024 * 1024) {
  const start = performance.now();
  const res = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': UA } });
  const buf = Buffer.from(await res.arrayBuffer());
  const ms = Math.round(performance.now() - start);
  return {
    status: res.status,
    contentType: res.headers.get('content-type') || '',
    ms,
    bytes: buf.length,
    text: buf.length <= maxBytes ? buf.toString('utf8') : ''
  };
}

function absolute(base, href) {
  try {
    return new URL(href, base).toString();
  } catch {
    return '';
  }
}

function scan(text) {
  const keys = [...new Set(text.match(/\b(Key[A-Z]|Arrow(?:Up|Down|Left|Right)|Space|Shift(?:Left|Right)|Escape|Enter)\b/g) || [])];
  const touch = ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointermove', 'ontouchstart']
    .filter((token) => text.toLowerCase().includes(token));
  return {
    keyboardTokens: keys.slice(0, 30),
    keyboardCode: keys.length > 0 || /\bkeydown\b/i.test(text),
    touchTokens: touch,
    touchCode: touch.length > 0
  };
}

async function auditGame(game) {
  const html = await timedFetch(game.embedUrl);
  const viewport = /<meta[^>]+name=["']viewport["'][^>]*content=["']([^"']+)["']/i.exec(html.text);
  const generator = /<meta[^>]+name=["']generator["'][^>]*content=["']([^"']+)["']/i.exec(html.text);
  const scriptUrls = [...html.text.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
    .map((m) => absolute(game.embedUrl, m[1]))
    .filter(Boolean)
    .slice(0, 4);

  const assets = [];
  let payloadMs = html.ms;
  let payloadBytes = html.bytes;
  let codeText = html.text;

  for (const url of scriptUrls) {
    try {
      const asset = await timedFetch(url);
      assets.push({ url, status: asset.status, ms: asset.ms, bytes: asset.bytes });
      payloadMs += asset.ms;
      payloadBytes += asset.bytes;
      codeText += `\n${asset.text}`;
    } catch (err) {
      assets.push({ url, error: err.message });
    }
  }

  // Construct exports load data.json separately; include it in the payload.
  if (/data\.json/i.test(codeText)) {
    const dataUrl = absolute(game.embedUrl, 'data.json');
    try {
      const data = await timedFetch(dataUrl, 5 * 1024 * 1024);
      if (data.status === 200) {
        assets.push({ url: dataUrl, status: data.status, ms: data.ms, bytes: data.bytes });
        payloadMs += data.ms;
        payloadBytes += data.bytes;
        codeText += `\n${data.text.slice(0, 200000)}`;
      }
    } catch (err) {
      assets.push({ url: dataUrl, error: err.message });
    }
  }

  const signals = scan(codeText);
  return {
    slug: game.slug,
    title: game.title,
    embedUrl: game.embedUrl,
    checkedAt: new Date().toISOString(),
    document: { status: html.status, ms: html.ms, bytes: html.bytes },
    payload: { ms: payloadMs, bytes: payloadBytes },
    viewport: viewport ? viewport[1] : '',
    generator: generator ? generator[1] : '',
    assets,
    keyboardCode: signals.keyboardCode,
    keyboardTokens: signals.keyboardTokens,
    touchCode: signals.touchCode,
    touchTokens: signals.touchTokens
  };
}

(async () => {
  const top = games.filter((g) => g.status === 'published').sort(byNewest).slice(0, 20);
  const results = [];
  for (const game of top) {
    try {
      results.push(await auditGame(game));
      console.log('audited', game.slug);
    } catch (err) {
      results.push({ slug: game.slug, title: game.title, embedUrl: game.embedUrl, error: err.message });
      console.error('failed', game.slug, err.message);
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  fs.writeFileSync(
    OUT,
    JSON.stringify({ generatedAt: new Date().toISOString(), method: 'cold fetch, no browser cache', results }, null, 2)
  );
  console.log('wrote', OUT, results.length);
})();
