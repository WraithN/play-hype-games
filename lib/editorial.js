'use strict';

/** Loads the hand-written game notes and the cold-fetch audit results once per process. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function readJson(rel, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[editorial]', rel, err.message);
    return fallback;
  }
}

const editorial = readJson('data/editorial.json', { games: {} });
const audits = readJson('data/game-audits.json', { results: [] });
const auditBySlug = new Map((audits.results || []).map((row) => [row.slug, row]));

function get(slug) {
  return {
    notes: (editorial.games || {})[slug] || null,
    audit: auditBySlug.get(slug) || null
  };
}

module.exports = { get };
