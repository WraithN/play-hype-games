'use strict';

/**
 * Builds data/game-meta.json from the catalogue, audit data and a small rubric.
 *
 * These are editorial estimates, not measured playtests. The rubric is
 * intentionally coarse: session length, pace, relaxation, focus, learning
 * effort, replay value, input methods and device hints.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const games = require(path.join(ROOT, 'data/games.json'));
const auditData = require(path.join(ROOT, 'data/game-audits.json'));
const OUT = path.join(ROOT, 'data/game-meta.json');

const auditBySlug = new Map((auditData.results || []).map((row) => [row.slug, row]));

const BASE = {
  'io-games': { session: '2-5', pace: 'frantic', relax: 2, focus: 3, learn: 2, replay: 4 },
  'idle-games': { session: '15+', pace: 'calm', relax: 5, focus: 2, learn: 1, replay: 4 },
  'action-games': { session: '2-5', pace: 'frantic', relax: 2, focus: 3, learn: 2, replay: 3 },
  'strategy-games': { session: '5-15', pace: 'steady', relax: 3, focus: 4, learn: 3, replay: 3 },
  '2-player-games': { session: '2-5', pace: 'steady', relax: 3, focus: 3, learn: 2, replay: 4 }
};

const SESSION = {
  'spotless': '15+',
  'bricks-breakers-infinity': '5-15',
  'splash-rush': '5-15',
  'sink-hole': '5-15',
  'crazy-lumberjack-cut-them-all': '5-15',
  'only-up-parkour-2': '5-15',
  'steal-my-egg': '5-15',
  'break-and-steal-my-egg': '5-15',
  'break-a-lucky-egg-brainrots': '5-15',
  'soul-hunter': '5-15',
  'cute-cat-sort-puzzle': '5-15',
  'klondike-solitaire-game': '15+',
  'field-of-dreams-simulation-adventure': '15+',
  'idle-blocks-tycoon': '15+',
  'thecheesiestclicker': '15+',
  'castle-wars-legacy': '5-15',
  'would-you-rather': '5-15',
  'game-of-goose-2': '15+',
  'blumgi-merge-online': '5-15',
  'bolts-and-nuts-online': '5-15',
  'marble-match-origin': '5-15',
  'treasure-of-alognov': '15+',
  'state-wars': '5-15',
  'grind-io': '5-15',
  'armed-forces-io': '5-15',
  'cobraz-io': '5-15',
  'guerrillas-io': '5-15',
  'duckling-rush-io': '2-5',
  'survivalpixel-io': '2-5',
  'find-67-in-brainrot-world': '2-5',
  'colors-matching': '2-5',
  'imposter-duck-online': '5-15',
  'yolk-ops-egg-arena': '2-5',
  'block-team-deathmatch': '2-5',
  'obbloxgun-io-3d-fps-shooter': '2-5',
  'rocketcar-cup': '2-5',
  'speen': '2-5',
  'growwars-io': '2-5',
  'game-of-goose-2': '15+',
  'balloons-pop': '2-5',
  'connect-fruits': '5-15',
  'bingo-real': '5-15'
};

const PACES = {
  'grimace-matching': 'steady',
  'klondike-solitaire-game': 'calm',
  'bolts-and-nuts-online': 'steady',
  'cute-cat-sort-puzzle': 'calm',
  'merge-room': 'calm',
  'astro-merge': 'steady',
  'blumgi-merge-online': 'steady',
  'find-67-in-brainrot-world': 'calm',
  'treasure-of-alognov': 'steady',
  'field-of-dreams-simulation-adventure': 'calm',
  'bricks-breakers-infinity': 'steady',
  'spotless': 'calm',
  'would-you-rather': 'calm',
  'game-of-goose-2': 'calm',
  'balloons-pop': 'calm',
  'connect-fruits': 'calm',
  'bingo-real': 'calm',
  'colors-matching': 'calm'
};

const SCORES = {
  'klondike-solitaire-game': { relax: 5, focus: 3, learn: 1, replay: 4 },
  'bolts-and-nuts-online': { relax: 3, focus: 5, learn: 3, replay: 3 },
  'cute-cat-sort-puzzle': { relax: 5, focus: 3, learn: 1, replay: 3 },
  'merge-room': { relax: 5, focus: 2, learn: 1, replay: 3 },
  'grimace-matching': { relax: 4, focus: 3, learn: 1, replay: 3 },
  'spotless': { relax: 5, focus: 2, learn: 1, replay: 4 },
  'field-of-dreams-simulation-adventure': { relax: 5, focus: 2, learn: 2, replay: 3 },
  'would-you-rather': { relax: 5, focus: 1, learn: 1, replay: 2 },
  'game-of-goose-2': { relax: 4, focus: 2, learn: 1, replay: 3 },
  'bricks-breakers-infinity': { relax: 3, focus: 3, learn: 1, replay: 3 },
  'castle-wars-legacy': { relax: 2, focus: 4, learn: 4, replay: 3 },
  'state-wars': { relax: 3, focus: 4, learn: 3, replay: 3 },
  'treasure-of-alognov': { relax: 3, focus: 4, learn: 3, replay: 2 },
  'only-up-parkour-2': { relax: 1, focus: 4, learn: 3, replay: 2 },
  'soul-hunter': { relax: 2, focus: 3, learn: 2, replay: 2 },
  'splash-rush': { relax: 2, focus: 3, learn: 2, replay: 3 },
  'survivalpixel-io': { relax: 2, focus: 3, learn: 2, replay: 3 },
  'balloons-pop': { relax: 4, focus: 1, learn: 1, replay: 3 },
  'colors-matching': { relax: 4, focus: 2, learn: 1, replay: 3 },
  'connect-fruits': { relax: 4, focus: 3, learn: 1, replay: 3 },
  'bingo-real': { relax: 4, focus: 2, learn: 1, replay: 3 }
};

function inputSet(game, audit) {
  const text = String(game.controls || '').toLowerCase();
  const inputs = new Set();
  if (/mouse|click|left-click/.test(text)) inputs.add('mouse');
  if (/wasd|arrow|keyboard|space|shift|tab|enter|\br\b/.test(text) || (audit && audit.keyboardCode)) inputs.add('keyboard');
  if (/touch|tap|mobile|joystick|swipe|drag/.test(text) || (audit && audit.touchCode)) inputs.add('touch');
  if (/gamepad|controller|joypad/.test(text)) inputs.add('gamepad');
  if (!inputs.size) inputs.add('mouse');
  return [...inputs];
}

const out = {};
for (const game of games.filter((g) => g.status === 'published')) {
  const base = BASE[game.category] || BASE['action-games'];
  const audit = auditBySlug.get(game.slug);
  const session = SESSION[game.slug] || base.session;
  const pace = PACES[game.slug] || base.pace;
  const scores = { ...base, ...(SCORES[game.slug] || {}) };
  const inputs = inputSet(game, audit);
  const devices = ['desktop'];
  if (inputs.includes('touch')) devices.push('mobile');
  if (audit && audit.viewport && audit.payload && audit.payload.bytes < 1024 * 1024) devices.push('chromebook');

  out[game.slug] = {
    session,
    pace,
    relax: scores.relax,
    focus: scores.focus,
    learn: scores.learn,
    replay: scores.replay,
    inputs,
    devices,
    ...(audit && audit.generator ? { engine: audit.generator } : {}),
    estimate: true
  };
}

const payload = {
  generatedAt: new Date().toISOString(),
  rubric:
    'Editorial estimates, not measured playtests. Session is a typical sitting; pace is the intended rhythm; relax/focus/learn/replay are 1–5 editor scores. Inputs come from publisher controls plus static audit evidence. Chromebook appears only when the embed declares a viewport and the initial payload is under 1 MB.',
  games: out
};

fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
console.log('wrote', OUT, Object.keys(out).length, 'games');
