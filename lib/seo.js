'use strict';

// Shared rules for routes, internal links and sitemap eligibility.
const TAG_ALIASES = {
  'io-games': 'io',
  'onlinegames-io': 'io',
  onlinegamesio: 'io',
  kid: 'kids',
  fruit: 'fruits',
  'match-3': 'match3',
  '3d-games': '3d',
  '2d-games': '2d'
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

function isIoGame(game) {
  return game.category === 'io-games' || gameTags(game).includes('io');
}

/* 游戏名本身已以 io 结尾（Rolling Balls.io、Grab.io 等），不再叠加 "IO Game" 造成 io IO 重复 */
function titleEndsInIo(game) {
  return /\.?io$/i.test(cleanText(game.title).trim());
}

/* 详情页浏览器标题：手动 seoTitle 优先；否则按 io / 普通浏览器游戏套统一模板 */
function gameTitle(game) {
  if (game.seoTitle) return cleanText(game.seoTitle);
  const name = cleanText(game.title);
  if (!isIoGame(game)) return `${name} Browser Game — Play Online Free`;
  return titleEndsInIo(game) ? `${name} — Play Online Free` : `${name} IO Game — Play Online Free`;
}

/* 裁剪后尾部不允许残留的虚词或裸数字，避免出现 "through a." / "across eight." 这类残片 */
const STOP_TAIL = /\s+(a|an|the|and|or|but|to|of|in|on|at|by|for|with|from|into|through|as|is|are|your|you|it|its|this|that|\d+)$/i;

/* 在预算内裁剪：优先在逗号/分号/连词等子句边界断，退回词边界时清掉尾部虚词；过短则返回空串（整句舍弃） */
function clipToBudget(text, budget) {
  const t = cleanText(text);
  if (t.length <= budget) return t;
  const parts = t.split(/(?<=[,;:])\s+|\s+and\s+/i);
  let acc = '';
  for (const p of parts) {
    const cand = (acc ? `${acc} ${p}` : p).replace(/\s+/g, ' ').trim();
    if (cand.length <= budget) acc = cand;
    else break;
  }
  acc = acc.replace(/[,;:.\s]+$/, '');
  if (acc.length >= 25) return acc;
  let cut = t.slice(0, budget).replace(/\s+\S*$/, '');
  let prev;
  do {
    prev = cut;
    cut = cut.replace(STOP_TAIL, '');
  } while (cut !== prev);
  cut = cut.replace(/[,;:.\s]+$/, '');
  return cut.length >= 25 ? cut : '';
}

/* 关键词前缀和无下载后缀必须保住；feed 首句按剩余预算裁剪，塞不下才舍弃 */
function composeGameMeta(prefix, lead, suffix, max) {
  const budget = max - prefix.length - suffix.length - 2;
  if (lead) {
    const clipped = clipToBudget(lead, budget);
    // 统一尾部标点，避免源句自带 !/. 时拼出 "coins!." 或 "stronger.."
    if (clipped) return `${prefix} ${clipped.replace(/[.!?\s]+$/, '')}. ${suffix}`;
  }
  return description(`${prefix} ${suffix}`, prefix, max);
}

function gameDescription(game, categoryName) {
  const title = cleanText(game.title);
  // 手写 seoDescription 够长就直接用，短的仍然落回模板补全
  const custom = description(game.seoDescription || '', '');
  if (custom.length >= 100) return custom;
  const lead = sentences(description(game.description, ''))[0] || '';
  if (isIoGame(game)) {
    return composeGameMeta(
      `Play ${title} online free, a fun browser io game.`,
      lead,
      'No download required.',
      165
    );
  }
  const category = categoryName ? ` Listed in ${cleanText(categoryName)}.` : '';
  return composeGameMeta(
    `Play ${title} online free in your browser.`,
    lead,
    `${category} No download or install required.`.trim(),
    170
  );
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

const CATEGORY_SEO = {
  'io-games': (count) => ({
    title: 'Online IO Games — Play Free in Your Browser',
    seoTitle: 'Free Browser IO Games to Play Online — No Download',
    description: `Play ${count} free browser io games online, from arena battles to territory grabs and survival runs. Every online io game here loads in your browser with no download.`
  }),
  'idle-games': (count) => ({
    title: 'Idle Games',
    seoTitle: 'Free Idle Games — Play in Your Browser',
    description: `Play ${count} free idle and clicker games in your browser. Compare session length, progression and focus; no download or install.`
  }),
  'action-games': (count) => ({
    title: 'Action Games',
    seoTitle: 'Free Action Games — Play Online',
    description: `Play ${count} free action browser games, from survival arenas to shooters and arcade runs. No download; check controls and load times.`
  }),
  'strategy-games': (count) => ({
    title: 'Strategy Games',
    seoTitle: 'Free Strategy Games — Play Online',
    description: `Play ${count} free strategy and puzzle games in your browser. Compare focus, learning effort and session length; no download required.`
  }),
  '2-player-games': (count) => ({
    title: '2 Player Games',
    seoTitle: 'Free 2 Player Games — One Keyboard',
    description: `Play ${count} free two-player browser games for one keyboard or a shared screen. Check controls and modes; no download required.`
  }),
  'chromebook-games': (count) => ({
    title: 'Chromebook Games',
    seoTitle: 'Free Chromebook Games — Play Online',
    description: `Play ${count} free browser games on a Chromebook. No download; check the embed, controls and school-network limits before playing.`
  })
};

function categorySeo(slug, count, fallbackTitle, fallbackDescription) {
  const factory = CATEGORY_SEO[slug];
  if (factory) return factory(count);
  return { title: fallbackTitle, seoTitle: fallbackTitle, description: fallbackDescription };
}

const TAG_META = {  io: (n) => `${n} .io browser games: arena battles, territory grabs and growth games. Compare modes and controls on each page; no download required.`,
  '1-player': (n) => `${n} single-player browser games, from collection runs to puzzles and arcade challenges. Check each title's controls and mode; no download required.`,
  action: (n) => `${n} action browser games with combat, movement and reflex challenges. Compare objectives and controls on each game page; no download required.`,
  '3d': (n) => `${n} 3D browser games, including arenas, racers and collection titles. Check performance and controls on each game page; no download required.`,
  arcade: (n) => `${n} arcade browser games built around a quick objective and a score chase. Read each game's controls and round length; no download required.`,
  '2d': (n) => `${n} 2D browser games, from side-on challenges to top-down arenas. Compare rules and controls on each game page; no download required.`,
  '2-player': (n) => `${n} two-player browser games for one keyboard or a shared screen. Check controls and mode on each game page; no download required.`,
  multiplayer: (n) => `${n} multiplayer browser games, including online matches, local sessions and games with bots. Check the mode on each game page; no download required.`,
  puzzle: (n) => `${n} puzzle browser games across sorting, matching, card and physics variants. Check the rules and controls on each game page; no download required.`,
  kids: (n) => `${n} kids browser games from the catalogue, with simple and colourful titles. Parents and teachers should check each game before use; no download required.`
};

function tagDescription(slug, label, count, settings) {
  const custom = TAG_META[slug];
  if (custom) return description(custom(count), '', 160);
  const fallback = `${count} ${String(label || slug).toLowerCase()} to play in your browser.`;
  const base = description(tagIntro(slug, settings), '', 160);
  return base.length >= 110 ? base : description(`${fallback} ${base}`, fallback, 160);
}

function introDescription(intro, fallback) {
  const paras = intro && Array.isArray(intro.paras) ? intro.paras : [];
  return description(paras[0], fallback, 200);
}

module.exports = { cleanText, decodeEntities, canonicalDomain, tagSlug, tagLabel, gameTags, tagIndexable, description, gameDescription, gameTitle, gameSummary, isIoGame, titleEndsInIo, tagIntro, tagDescription, introDescription, categorySeo };
