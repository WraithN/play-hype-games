/* RarePop — pop-culture rare-answer game page + method page. */
const fs = require('fs');
const path = require('path');
const { esc, jsonLd, layout } = require('./render');

let cache = null;

function packs() {
  if (cache) return cache;
  const file = path.join(__dirname, '..', 'data', 'rarity', 'packs.json');
  cache = JSON.parse(fs.readFileSync(file, 'utf8'));
  return cache;
}

const TIER_LABEL = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary'
};

function ringBand(tier) {
  if (tier === 'legendary') return 'Ring 8 · VOID 08';
  if (tier === 'epic') return 'Ring 7 · DEEP 07';
  if (tier === 'rare') return 'Rings 5–6 · FAR 05–06';
  if (tier === 'uncommon') return 'Rings 3–4 · MID 03–04';
  return 'Rings 1–2 · NEAR 01–02';
}

function pctShare(tier) {
  if (tier === 'legendary') return 'least-viewed 15%';
  if (tier === 'epic') return 'next 20% (15–35%)';
  if (tier === 'rare') return 'next 25% (35–60%)';
  if (tier === 'uncommon') return 'next 20% (60–80%)';
  return 'most-viewed 20%';
}

function breadcrumb(settings, items) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: settings.domain + it.path
    }))
  };
  return {
    html: `<nav class="breadcrumb">${items
      .map((it, i) =>
        i === items.length - 1
          ? `<span>${esc(it.name)}</span>`
          : `<a href="${esc(it.path)}">${esc(it.name)}</a><span class="sep">/</span>`
      )
      .join('')}</nav>`,
    json
  };
}

function rarePopPage(settings) {
  const data = packs();
  const prompts = data.themes.reduce((n, t) => n + t.questions.length, 0);
  const answers = data.themes.reduce(
    (n, t) => n + t.questions.reduce((m, q) => m + q.answers.length, 0),
    0
  );
  const bc = breadcrumb(settings, [
    { name: 'Home', path: '/' },
    { name: 'RarePop', path: '/rarepop' }
  ]);

  const faq = [
    {
      q: 'Is RarePop free?',
      a: 'Yes. It runs in the browser with no account, no download and no purchase. Every run is ten random prompts; play as often as you like.'
    },
    {
      q: 'How long is a run?',
      a: 'Ten jumps. There is no timer: a wrong answer just plays the jump prep and shows a Void card, then you try the same prompt again. After the tenth discovery the mission report shows your total distance, jumps, farthest ring and rank.'
    },
    {
      q: 'What does the hint cost?',
      a: 'Free, once per prompt. It resets on the next prompt.'
    },
    {
      q: 'What happens if I misspell an answer?',
      a: 'Exact names and common aliases are matched locally. Anything else goes to a server-side fuzzy pass that maps nicknames, translations and typos onto one exact answer from the list; a miss just shakes the ship and you retry.'
    },
    {
      q: 'Is RarePop affiliated with Krillion or Rarefind?',
      a: 'No. It is an original Play Hype game in the same rare-answer family — scoring answers by how obscure they are is the shared genre, not the product.'
    }
  ];

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: 'RarePop',
      url: `${settings.domain}/rarepop`,
      description:
        'A pop-culture rare-answer game: ten jumps, no timer, and the rarer your answer the farther the ship travels.',
      genre: ['Trivia', 'Puzzle', 'Pop culture'],
      gamePlatform: 'Web browser',
      applicationCategory: 'Game',
      operatingSystem: 'Any',
      playMode: 'SinglePlayer',
      inLanguage: 'en',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@type': 'Organization', name: settings.siteName, url: settings.domain + '/' }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a }
      }))
    },
    bc.json
  ];

  const body = `
<div class="wrap">
  ${bc.html}
  <header class="rt-hero">
    <div class="rt-hero-copy">
      <div class="kicker">Pop-culture arcade</div>
      <h1>RarePop</h1>
      <p class="rt-lead">Ten jumps. No timer. The rarer your answer, the farther the ship goes.</p>
      <p>Name something that fits the prompt; your answer is ranked by how obscure it is, and the ship jumps to the ring that matches its rarity. Common answers stay in the near rings. Legendary answers reach the outer void. Eight rings, from NEAR 01 to VOID 08. A wrong answer just shakes the ship and you try again. A hint is free, once per prompt.</p>
      <div class="rt-stats">
        <span><b>${data.themes.length}</b> categories</span>
        <span><b>${prompts}</b> prompts</span>
        <span><b>${answers}</b> accepted answers</span>
        <span><b>10</b> jumps</span>
      </div>
    </div>
  </header>

  <div class="rt-frame">
    <iframe src="/assets/games/rarepop/index.html" title="RarePop — pop-culture rare-answer game" loading="lazy" allowfullscreen allow="fullscreen; autoplay"></iframe>
  </div>
  <p class="rt-frame-note">Free browser game, no download. Sound plays after your first tap; use your browser's fullscreen for a larger view.</p>

  <section class="rt-prose">
    <h2>How a run works</h2>
    <ul>
      <li><b>Movies, music, games and anime.</b> Prompts are drawn from all four categories.</li>
      <li><b>Type an answer.</b> Exact names and aliases match locally; nicknames and typos get a server-side second pass.</li>
      <li><b>The ring decides the distance.</b> Common answers stay in the near rings; Legendary answers reach the outer void.</li>
      <li><b>Ten jumps.</b> No timer. Every answer runs the jump-prep sequence; a miss shows a Void card and the same prompt stays playable.</li>
      <li><b>One hint per prompt.</b> Free, and it resets on the next prompt.</li>
    </ul>
    <p>Rarity comes from English Wikipedia pageviews (December 2024 – October 2025), ranked inside each prompt’s closed answer list. There is no live polling and no hidden difficulty. <a href="/rarepop/method?v=1">The method page</a> lists the limits.</p>
  </section>

  <section class="rt-prose">
    <h2>RarePop questions</h2>
    ${faq
      .map((f) => `<details class="rt-faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
      .join('')}
  </section>

  <p class="rt-muted rt-foot">RarePop is an original Play Hype game. It is not affiliated with Krillion, Rarefind or any other daily trivia game.</p>
</div>`;

  return layout({
    settings,
    body,
    title: 'RarePop — the pop-culture rare-answer arcade game',
    description:
      'A free pop-culture rare-answer game: ten jumps, no timer, and the rarer your answer the farther the jump. Movies, music, games and anime.',
    canonical: `${settings.domain}/rarepop`,
    ogImage: `${settings.domain}/assets/og/rarepop.png`,
    bodyClass: 'hype hype-static hype-rarity',
    head: `<link rel="stylesheet" href="/assets/rarepop.css?v=1">${schema.map(jsonLd).join('')}`
  });
}

function methodPage(settings) {
  const data = packs();
  const bc = breadcrumb(settings, [
    { name: 'Home', path: '/' },
    { name: 'RarePop', path: '/rarepop' },
    { name: 'Method', path: '/rarepop/method' }
  ]);

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'RarePop method: how rarity tiers are calculated',
      url: `${settings.domain}/rarepop/method`,
      description:
        'How RarePop assigns Common, Uncommon, Rare, Epic and Legendary tiers, the pageview source, the answer sets and the limits of the method.',
      isPartOf: { '@type': 'WebSite', name: settings.siteName, url: settings.domain + '/' }
    },
    bc.json
  ];

  const body = `
<div class="wrap">
  ${bc.html}
  <header class="rt-hero">
    <div class="rt-hero-copy">
      <div class="kicker">RarePop · Method</div>
      <h1>How the tiers are calculated</h1>
      <p class="rt-lead">Public pageviews, percentile cuts, and a closed answer list. No live polling, no hidden difficulty.</p>
    </div>
  </header>

  <section class="rt-prose">
    <h2>1. The answer sets</h2>
    <p>Every prompt has a closed answer list: Pixar features, Ghibli films, Beatles albums, Grand Theft Auto entries, Call of Duty titles, Kanto gym leaders, Makoto Shinkai films. Each list is fixed, and the game only accepts answers on it.</p>
    <p>Names and common aliases are matched locally. If a player uses a nickname, abbreviation, translation or typo, a server-side pass asks an LLM to map it onto one exact item from that prompt’s list. The model never invents an answer: anything it returns is checked against the list before it counts.</p>
    <p>If an answer is rejected, it is because it is outside the set, not because a model guessed.</p>

    <h2>2. The familiarity signal</h2>
    <p>Each answer’s English Wikipedia article is queried through the Wikimedia Pageviews API: monthly, user access only (bots excluded), summed across <b>December 2024 – October 2025</b>. That number stands in for how often English-speaking players encounter the title — a public, reproducible familiarity proxy.</p>
    <p>It is not a poll of RarePop players, and it is not a measure of importance. A title can spike because of a release or an awards season; a niche game can be famous out of proportion to its sales. The game treats the number as a ranking signal, nothing more.</p>

    <h2>3. The percentile cut</h2>
    <p>Within each prompt, valid answers are sorted from least-viewed to most-viewed. Tiers are assigned by position in that list, not by an absolute view threshold — which guarantees that every prompt has answers at every tier.</p>
    <table class="rt-table">
      <thead><tr><th>Tier</th><th>Position in the prompt’s answer list</th><th>Jump distance</th></tr></thead>
      <tbody>
        ${data.tiers
          .map(
            (t) =>
              `<tr><td><span class="rt-tier" data-tier="${esc(t.key)}">${esc(TIER_LABEL[t.key])}</span></td><td>${pctShare(t.key)}</td><td>${ringBand(t.key)}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>
    <p>Each tier opens a band of the eight rings. Distances run from roughly 0.6 AU at NEAR 01 to about 5.1 AU at VOID 08; the exact planet is drawn from the unreached planets in that band.</p>
    <p>Because the cut is per prompt, the same title can sit in different tiers. A franchise entry that is Common on “name any film in the series” can be Legendary on a narrower prompt.</p>

    <h2>4. Run length, wrong answers and hint</h2>
    <p>A run is ten jumps. There is no timer and no lives: a wrong answer plays the same jump-prep sequence, then a Void card appears for a few seconds and the prompt stays on screen so you can try another name. Reusing an answer is allowed — it simply lands on a different planet.</p>
    <p>The hint is free once per prompt. It resets on the next prompt.</p>

    <h2>5. Known limits</h2>
    <ul>
      <li><b>Pageviews are not free association.</b> They measure lookups, so release news and awards seasons can move a title up.</li>
      <li><b>The snapshot is fixed.</b> Data was pulled ${esc(String(data.generatedAt).slice(0, 10))}; tiers will drift as pageviews change, and are rebuilt deliberately rather than daily.</li>
      <li><b>English Wikipedia skews.</b> Answers with large non-English readerships may look rarer than they are to a global audience.</li>
      <li><b>No player data is used.</b> A run is not a popularity contest, and results are not sent to a server.</li>
    </ul>
    <p class="rt-muted">Rebuild source: <code>scripts/build-rarity-packs.mjs</code> in the site repository. Questions, corrections or an answer you think is mis-tiered: <a href="mailto:${esc(settings.contactEmail)}">${esc(settings.contactEmail)}</a>.</p>
  </section>

  <p><a class="btn-ghost rt-back" href="/rarepop">← Back to RarePop</a></p>
</div>`;

  return layout({
    settings,
    body,
    title: 'RarePop method — how rarity tiers work',
    description:
      'The full method behind RarePop: the closed answer sets, Wikipedia pageview source, per-prompt percentile tiers, run length and hints, and known limits.',
    canonical: `${settings.domain}/rarepop/method`,
    ogImage: `${settings.domain}/assets/og/rarepop.png`,
    bodyClass: 'hype hype-static hype-rarity',
    head: `<link rel="stylesheet" href="/assets/rarepop.css?v=1">${schema.map(jsonLd).join('')}`
  });
}

function sitemapEntries(domain) {
  return [
    { loc: `${domain}/rarepop`, pri: '0.9', freq: 'daily' },
    { loc: `${domain}/rarepop/method`, pri: '0.5', freq: 'monthly' }
  ];
}

module.exports = { rarePopPage, methodPage, sitemapEntries, packs };
