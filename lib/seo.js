'use strict';

// Shared rules for routes, internal links and sitemap eligibility.
const TAG_ALIASES = {
  'io-games': 'io', kid: 'kids', fruit: 'fruits', 'match-3': 'match3',
  '3d-games': '3d', '2d-games': '2d'
};

const TAG_LABELS = {
  io: '.io Games',
  '1-player': '1 Player Games',
  '2-player': '2 Player Games',
  '3d': '3D Games',
  '2d': '2D Games',
  html5: 'HTML5 Games',
  fps: 'FPS Games',
  kids: 'Kids Games',
  puzzle: 'Puzzle Games',
  multiplayer: 'Multiplayer Games'
};

function decodeEntities(value) {
  const named = {
    nbsp: ' ', mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
    rsquo: '\u2019', lsquo: '\u2018', ldquo: '\u201c', rdquo: '\u201d',
    quot: '"', apos: "'", lt: '<', gt: '>'
  };
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => named[name.toLowerCase()] ?? m)
    .replace(/&amp;/g, '&');
}

function cleanText(value) {
  return decodeEntities(String(value || '').replace(/<[^>]*>/g, ' ')).replace(/\bmiddot\b/gi, '\u00b7').replace(/\s+/g, ' ').trim();
}

function canonicalDomain(value) {
  const url = new URL(value || 'https://www.playhypegames.com');
  if (['playhypegames.com', 'www.playhypegames.com'].includes(url.hostname)) {
    return 'https://www.playhypegames.com';
  }
  return url.origin;
}

function tagSlug(value) {
  const slug = cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return TAG_ALIASES[slug] || slug;
}

function tagLabel(slug) {
  if (TAG_LABELS[slug]) return TAG_LABELS[slug];
  return String(slug || '').replace(/-/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function gameTags(game) {
  return [...new Set((game.tags || []).map(tagSlug).filter(Boolean))];
}

function tagIndexable(tag, settings) {
  const intro = cleanText((settings.tagIntros || {})[tag.slug] || TAG_INTROS[tag.slug]);
  // Larger archives stand on their own; 5–10 game tags need a written introduction.
  return tag.count >= 5 && (tag.count > 10 || intro.length >= 150);
}

function sentences(text) {
  return cleanText(text)
    .split(/(?<=[.!?])["')\]]?\s+(?=[A-Z0-9"\u201c'(])/)
    .map(cleanText)
    .filter(Boolean);
}

function description(value, fallback, max = 160) {
  const text = cleanText(value);
  const list = sentences(text);
  let result = '';
  for (const sentence of list) {
    const next = result ? `${result} ${sentence}` : sentence;
    if (next.length > max) break;
    result = next;
  }
  if (result) return result;
  const first = list[0] || text;
  if (!first) return cleanText(fallback);
  if (first.length <= max) return first;
  // Keep the opening clause as a finished sentence instead of cutting mid-word.
  const cut = first.slice(0, max - 1);
  const stop = Math.max(cut.lastIndexOf(', '), cut.lastIndexOf('; '), cut.lastIndexOf(': '));
  return `${(stop > max * 0.55 ? cut.slice(0, stop) : cut.replace(/\s+\S*$/, '')).replace(/[,;:.\s]+$/, '')}.`;
}

function gameDescription(game, categoryName) {
  const title = cleanText(game.title);
  const base = description(game.seoDescription || game.description, '');
  if (base.length >= 100) return base;
  const category = categoryName ? ` Listed in ${cleanText(categoryName)}.` : '';
  const extra = `Play ${title} free in your browser.${category} Check the in-game instructions for controls.`;
  return description(`${base} ${extra}`, base || `Play ${title} free in your browser.`, 170);
}

function gameSummary(game) {
  const text = cleanText(game.description);
  if (/[.!?]["')\]]?$/.test(text)) return text;
  const end = [...text.matchAll(/[.!?](?=\s|$)/g)].pop();
  return end ? text.slice(0, end.index + 1) : gameDescription(game);
}

const TAG_INTROS = {
  io: 'Browse arena, territory and growth games grouped under the .io tag. A .io label describes a style of browser game, not a guarantee of live multiplayer: some titles use computer opponents. Compare each game’s description before choosing between collecting, survival and combat. For a different pace, explore our action and strategy categories.',
  '1-player': 'Find browser games tagged for solo play, from collection challenges to puzzles and arcade runs. Solo play does not necessarily mean offline play: these embedded games still need access to the publisher’s servers. Use the game description to choose an objective, then check the instructions inside the game for its controls and save options.',
  action: 'This archive groups games tagged with action, including combat, movement and reflex challenges. Tags come from catalogue metadata and may overlap with other genres. Compare the objectives on each game page rather than assuming every title uses the same keyboard layout. For more choices, browse the dedicated action games category.',
  '3d': 'Explore browser games with a 3D tag, including arenas, racers and collection games. The tag describes presentation rather than a particular set of rules. Performance depends on the game build, graphics settings and your device; a 3D label is not a compatibility certification. Open a title to read its premise and use the in-game settings where available.',
  arcade: 'Arcade games focus on an immediate objective such as collecting objects, avoiding hazards or improving a score. This archive brings together titles with the arcade tag across several primary categories. Round length, difficulty and controls vary by game. Read the individual description to pick a challenge rather than relying on a single rule for the whole collection.',
  '2d': 'Browse games tagged with 2D presentation, from side-on challenges to top-down arenas. This tag groups visual styles rather than player counts or difficulty levels. A 2D game can still require substantial browser resources, and touch controls are not guaranteed. Check the title’s instructions before playing and explore its related games to find similar mechanics.',
  '2-player': 'This archive groups games that catalogue metadata marks for two players. Some titles are local matches on one keyboard, while others may describe online or team play, so check the individual game instructions before inviting someone to join. The tag does not certify that a game supports controllers, split-screen play or touch devices. Compare the description and related titles to find a format that fits your setup.',
  multiplayer: 'Browse games tagged as multiplayer. A multiplayer label can cover online matches, local two-player sessions or games that include computer-controlled opponents, so it does not by itself guarantee other people are online. Read each game’s description and in-game instructions for the actual mode, server behaviour and control scheme. For local play, our 2 Player category is a more specific starting point. If you are checking a school device, confirm that the network allows the game’s embed host before assuming the title is broken. Tags come from catalogue metadata, not from a live player-count check.',
  puzzle: 'Puzzle games ask you to read a board, plan a move and recover from mistakes. This archive collects titles tagged puzzle across sorting, matching, card and physics variants. Difficulty and session length differ widely, and a tag does not guarantee a tutorial or a hint system. Open a game to read its premise, then use the controls shown inside the build. Related titles are a quick way to compare rules.',
  kids: 'This archive groups games whose catalogue metadata carries a kids tag. The label is not an age rating and we do not claim that every game has been reviewed for a particular age group. Parents and teachers should check a game’s description and instructions before use, especially on shared school devices. For managed Chromebooks, also confirm that your network allows the game’s embed host.'
};

function tagIntro(slug, settings) {
  return cleanText((settings.tagIntros || {})[slug] || TAG_INTROS[slug] || '');
}

function introDescription(intro, fallback) {
  const paras = intro && Array.isArray(intro.paras) ? intro.paras : [];
  return description(paras[0], fallback, 200);
}

module.exports = { cleanText, decodeEntities, canonicalDomain, tagSlug, tagLabel, gameTags, tagIndexable, description, gameDescription, gameSummary, tagIntro, introDescription };
