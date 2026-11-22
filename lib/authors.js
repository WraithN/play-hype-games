'use strict';

const fs = require('fs');
const path = require('path');

let cache = null;

function list() {
  if (!cache) {
    try {
      const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'authors.json'), 'utf8');
      const parsed = JSON.parse(raw);
      cache = Array.isArray(parsed.authors) ? parsed.authors : [];
    } catch (err) {
      if (err.code !== 'ENOENT') console.error('[authors]', err.message);
      cache = [];
    }
  }
  return cache;
}

function get(slug) {
  return list().find((a) => a.slug === slug) || null;
}

function byName(name) {
  const needle = String(name || '').trim().toLowerCase();
  if (!needle) return null;
  return list().find((a) => a.name.toLowerCase() === needle) || null;
}

module.exports = { list, get, byName };
