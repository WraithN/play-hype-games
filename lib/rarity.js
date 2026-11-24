/* Rarity Tower — hub, theme pages and method page. */
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

function themeBySlug(slug) {
  return packs().themes.find((t) => t.slug === slug) || null;
}

const TIER_LABEL = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary'
};

const nf = new Intl.NumberFormat('en-US');

function pctShare(tier) {
  if (tier === 'legendary') return 'least-viewed 15%';
  if (tier === 'epic') return 'next 20% (15–35%)';
  if (tier === 'rare') return 'next 25% (35–60%)';
  if (tier === 'uncommon') return 'next 20% (60–80%)';
  return 'most-viewed 20%';
}

function rarest(theme, limit) {
  const seen = new Set();
  const all = [];
  theme.questions.forEach((q, i) => {
    for (const a of q.answers) {
      if (seen.has(a.code)) continue;
      seen.add(a.code);
      all.push({ ...a, prompt: q.prompt, floor: i + 1 });
    }
  });
  return all.sort((a, b) => a.views - b.views).slice(0, limit || 10);
}

function uniqueCountries(theme) {
  const s = new Set();
  theme.questions.forEach((q) => q.answers.forEach((a) => s.add(a.code)));
  return s.size;
}

function totalAnswers(theme) {
  return theme.questions.reduce((n, q) => n + q.answers.length, 0);
}

function gameFrame(theme, domain, title) {
  return `<div class="rt-frame">
  <iframe src="/assets/games/rarity-tower/index.html?theme=${esc(theme.slug)}"
    title="${esc(title)}"
    loading="lazy" allowfullscreen
    allow="fullscreen; autoplay"></iframe>
</div>
<p class="rt-frame-note">Free browser game, no download. The FULL button expands it; sound is off until you tap SND.</p>`;
}

function themeCard(t) {
  return `<a class="rt-card" href="/rarity-tower/${esc(t.slug)}">
  <span class="rt-card-tier">${t.floors} floors</span>
  <b>${esc(t.name)}</b>
  <span class="rt-card-tag">${esc(t.tagline)}</span>
  <span class="rt-card-meta">${t.questions.length} prompts · ${uniqueCountries(t)} countries</span>
</a>`;
}

function ladderRow(theme) {
  return `<div class="rt-ladder">${theme.ladder
    .map(
      (t, i) =>
        `<span data-tier="${esc(t)}"><b>F${i + 1}</b><i>${esc(TIER_LABEL[t])}+</i></span>`
    )
    .join('')}</div>`;
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

/* ---------------- hub ---------------- */

function hubPage(settings) {
  const data = packs();
  const world = themeBySlug('world');
  const bc = breadcrumb(settings, [
    { name: 'Home', path: '/' },
    { name: 'Rarity Tower', path: '/rarity-tower' }
  ]);

  const faq = [
    {
      q: 'Is Rarity Tower free to play?',
      a: 'Yes. It runs in the browser with no account, no download and no in-game purchase. The daily tower is the same for everyone; practice runs are unlimited.'
    },
    {
      q: 'How is an answer’s rarity decided?',
      a: 'Each valid answer is ranked by its English Wikipedia pageviews (monthly, user access, Dec 2024 – Oct 2025). The least-viewed answers inside that question are Legendary; the household names are Common. It is a public familiarity proxy, not a live poll.'
    },
    {
      q: 'Why did a correct country make me fall?',
      a: 'Because it was too obvious for that floor. Valid is not enough: every floor sets a minimum tier, and a Common answer on a floor that needs Uncommon or better collapses the slab.'
    },
    {
      q: 'Do territories count as countries?',
      a: 'No. The answer set is 194 states: UN members plus Taiwan, Kosovo, Palestine and the Holy See. Territories such as Puerto Rico, Greenland or Hong Kong are not accepted.'
    },
    {
      q: 'Is Rarity Tower the same as Krillion or Rarefind?',
      a: 'The loop is related — name a country, get scored on how rare your answer is — but this is an original game by Play Hype: you climb a tower instead of diving, and every floor has a pass mark. It is not affiliated with either game.'
    },
    {
      q: 'Can I play the same tower again?',
      a: 'Yes. Retry replays the same prompts; Practice Run reshuffles them. Daily runs are seeded by the date, so everyone sees the same order on the same day.'
    }
  ];

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: 'Rarity Tower',
      url: `${settings.domain}/rarity-tower`,
      description:
        'A daily country trivia game: seven floors, one country per floor, and only the rarer answers keep the slab standing.',
      genre: ['Trivia', 'Puzzle', 'Geography'],
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
      <div class="kicker">Daily country game</div>
      <h1>Rarity Tower</h1>
      <p class="rt-lead">Seven floors. One country per floor. The obvious answer is the trap.</p>
      <p>Each floor names a constraint — a region, a border, a population ceiling — and asks for a country that fits. Your answer is ranked by how obscure it is. Clear the floor’s minimum and the climber jumps; pick a country everyone would think of, and the slab collapses under you.</p>
      <div class="rt-stats">
        <span><b>${data.themes.length}</b> towers</span>
        <span><b>${data.answerCount}</b> countries</span>
        <span><b>${data.themes.reduce((n, t) => n + t.questions.length, 0)}</b> prompts</span>
        <span><b>~2 min</b> a run</span>
      </div>
    </div>
    ${ladderRow(world)}
  </header>

  ${gameFrame(world, settings.domain, 'Rarity Tower — play the daily country game')}

  <section class="rt-prose">
    <h2>How the climb works</h2>
    <p>Every floor asks for a country that satisfies a constraint. There is never one right answer — there are dozens. What separates them is how quickly they come to mind.</p>
    <ul>
      <li><b>Type a country.</b> Spelling and common aliases are matched (USA, UK, Holland, Burma, Czech Republic).</li>
      <li><b>Meet the floor’s minimum.</b> Floor 1 asks for Uncommon or better; later floors demand Rare and then Epic. The required tier is printed above the input.</li>
      <li><b>Climb or fall.</b> A passing answer jumps one floor and scores 10–100 points by tier. A too-common answer, a repeated country or a timeout ends the run.</li>
    </ul>
    <p>The answer pool is closed and checkable: 194 states, no territories. That means a wrong answer is usually a spelling problem, not a judgement call — and the game tells you when a territory does not count.</p>
  </section>

  <section>
    <div class="section-head">
      <div><div class="kicker">Pick a tower</div><h2>${data.themes.length} themed ladders</h2></div>
    </div>
    <div class="rt-grid">${data.themes.map(themeCard).join('')}</div>
  </section>

  <section class="rt-prose">
    <h2>What the tiers mean</h2>
    <p>Tiers are computed inside each question, not across the whole world. “Rare” means rarer than most valid answers to <em>that</em> prompt — so a tiny country can be Common on a microstate floor and Legendary on a “name any country” floor.</p>
    <table class="rt-table">
      <thead><tr><th>Tier</th><th>Where it sits</th><th>Points</th></tr></thead>
      <tbody>
        ${data.tiers
          .map(
            (t) =>
              `<tr><td><span class="rt-tier" data-tier="${esc(t.key)}">${esc(TIER_LABEL[t.key])}</span></td><td>${pctShare(t.key)}</td><td>${t.points}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>
    <p class="rt-muted">Source: English Wikipedia pageviews, monthly user access, summed Dec 2024 – Oct 2025. Data snapshot ${esc(String(data.generatedAt).slice(0, 10))}. <a href="/rarity-tower/method">Full method and limitations →</a></p>
  </section>

  <section class="rt-prose">
    <h2>Questions players ask</h2>
    ${faq
      .map(
        (f) => `<details class="rt-faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`
      )
      .join('')}
  </section>

  <p class="rt-muted rt-foot">Rarity Tower is an original game built by ${esc(settings.siteName)}. It is not affiliated with Krillion, Rarefind or any other daily trivia game. Country data: mledoze/countries and World Bank population; rarity: Wikimedia pageviews.</p>
</div>`;

  return layout({
    settings,
    body,
    title: 'Rarity Tower — the daily country-climbing game',
    description:
      'A free daily country trivia game: seven floors, one country per floor, and the obvious answers collapse. Rarity is scored from public Wikipedia pageviews.',
    canonical: `${settings.domain}/rarity-tower`,
    ogType: 'website',
    ogImage: `${settings.domain}/assets/og/rarity-tower.png`,
    bodyClass: 'hype hype-static hype-rarity',
    head: `<link rel="stylesheet" href="/assets/rarity.css?v=1">${schema.map(jsonLd).join('')}`
  });
}

/* ---------------- theme page ---------------- */

function themePage(settings, slug) {
  const theme = themeBySlug(slug);
  if (!theme) return null;
  const bc = breadcrumb(settings, [
    { name: 'Home', path: '/' },
    { name: 'Rarity Tower', path: '/rarity-tower' },
    { name: theme.name, path: `/rarity-tower/${theme.slug}` }
  ]);

  const rarestList = rarest(theme, 10);
  const countries = uniqueCountries(theme);
  const answers = totalAnswers(theme);
  const others = packs().themes.filter((t) => t.slug !== theme.slug);

  const faq = [
    {
      q: `How many countries count in the ${theme.name} tower?`,
      a: `The prompts in this tower draw from ${countries} countries. Territories are not accepted; the full answer set is the 194 states used across Rarity Tower.`
    },
    {
      q: `What is the rarest answer in the ${theme.name} tower?`,
      a: `${rarestList[0].name} (${TIER_LABEL[rarestList[0].tier]}) has the fewest English Wikipedia pageviews of any country used here: ${nf.format(rarestList[0].views)} views over the snapshot period.`
    },
    {
      q: `Is the ${theme.name} tower the same every day?`,
      a: `The prompts are fixed; the daily order is seeded by the date, so every player gets the same tower that day. Practice runs reshuffle the order.`
    }
  ];

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: `Rarity Tower: ${theme.name}`,
      url: `${settings.domain}/rarity-tower/${theme.slug}`,
      description: `A ${theme.floors}-floor country rarity game themed around ${theme.name.toLowerCase()}. ${theme.tagline}.`,
      genre: ['Trivia', 'Puzzle', 'Geography'],
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
      <div class="kicker">Rarity Tower · ${esc(theme.name)}</div>
      <h1>${esc(theme.name)} tower</h1>
      <p class="rt-lead">${esc(theme.tagline)}.</p>
      <p>${esc(theme.blurb)}</p>
      <div class="rt-stats">
        <span><b>${theme.floors}</b> floors</span>
        <span><b>${countries}</b> countries</span>
        <span><b>${answers}</b> valid answers</span>
      </div>
    </div>
    ${ladderRow(theme)}
  </header>

  ${gameFrame(theme, settings.domain, `Rarity Tower: ${theme.name} — play the country game`)}

  <section class="rt-prose">
    <h2>The ${theme.floors} floors</h2>
    <ol class="rt-floors">
      ${theme.questions
        .map(
          (q, i) =>
            `<li><span class="rt-fnum">F${i + 1}</span><div><b>${esc(q.prompt)}</b><small>${q.answers.length} valid answers · needs ${TIER_LABEL[theme.ladder[i]]}+</small></div></li>`
        )
        .join('')}
    </ol>
  </section>

  <section class="rt-prose">
    <h2>Rarest answers in this tower</h2>
    <p>Lowest English Wikipedia pageviews among the countries used here. These are the answers that keep a floor standing when the floor asks for Epic.</p>
    <table class="rt-table">
      <thead><tr><th>Country</th><th>Floor</th><th>Tier</th><th>Pageviews</th></tr></thead>
      <tbody>
        ${rarestList
          .map(
            (a) =>
              `<tr><td>${esc(a.name)}</td><td>F${a.floor}</td><td><span class="rt-tier" data-tier="${esc(a.tier)}">${esc(TIER_LABEL[a.tier])}</span></td><td>${nf.format(a.views)}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>
    <p class="rt-muted">Tiers are relative to each prompt, so the same country can sit in a different tier on a different floor. <a href="/rarity-tower/method">How it is calculated →</a></p>
  </section>

  <section class="rt-prose">
    <h2>${esc(theme.name)} tower: questions</h2>
    ${faq
      .map((f) => `<details class="rt-faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
      .join('')}
  </section>

  <section>
    <div class="section-head"><div><div class="kicker">Keep climbing</div><h2>Other towers</h2></div><a class="more-link" href="/rarity-tower">All towers →</a></div>
    <div class="rt-grid">${others.map(themeCard).join('')}</div>
  </section>
</div>`;

  return layout({
    settings,
    body,
    title: `Rarity Tower: ${theme.name} — daily country trivia`,
    description: `${theme.tagline}. Play the ${theme.name} tower: ${theme.floors} country prompts, ${countries} valid answers, and a rarity minimum on every floor. Free, no download.`,
    canonical: `${settings.domain}/rarity-tower/${theme.slug}`,
    ogType: 'website',
    ogImage: `${settings.domain}/assets/og/rarity-tower.png`,
    bodyClass: 'hype hype-static hype-rarity',
    head: `<link rel="stylesheet" href="/assets/rarity.css?v=1">${schema.map(jsonLd).join('')}`
  });
}

/* ---------------- method ---------------- */

function methodPage(settings) {
  const data = packs();
  const bc = breadcrumb(settings, [
    { name: 'Home', path: '/' },
    { name: 'Rarity Tower', path: '/rarity-tower' },
    { name: 'Method', path: '/rarity-tower/method' }
  ]);

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Rarity Tower method: how rarity tiers are calculated',
      url: `${settings.domain}/rarity-tower/method`,
      description:
        'How Rarity Tower assigns Common, Uncommon, Rare, Epic and Legendary tiers, the pageview source, the answer set, and the limits of the method.',
      isPartOf: { '@type': 'WebSite', name: settings.siteName, url: settings.domain + '/' }
    },
    bc.json
  ];

  const body = `
<div class="wrap">
  ${bc.html}
  <header class="rt-hero">
    <div class="rt-hero-copy">
      <div class="kicker">Rarity Tower · Method</div>
      <h1>How the tiers are calculated</h1>
      <p class="rt-lead">Public pageviews, percentile cuts, and a closed answer set. No live polling, no hidden difficulty.</p>
    </div>
  </header>

  <section class="rt-prose">
    <h2>1. The answer set</h2>
    <p>Every prompt has a closed list of valid countries: <b>${data.answerCount} states</b> — UN members plus Taiwan, Kosovo, Palestine and the Holy See. Territories (Puerto Rico, Greenland, Hong Kong, French Guiana) are not accepted. Country names, official names and common aliases are matched, so “USA”, “Holland” and “Burma” resolve to the same answer.</p>
    <p>The set is deliberately checkable. If an answer is rejected, it is because it is outside the list, not because a model guessed.</p>

    <h2>2. The familiarity signal</h2>
    <p>Each country’s English Wikipedia article is queried through the Wikimedia Pageviews API: monthly, user access only (bots excluded), summed across <b>December 2024 – October 2025</b>. That number stands in for how often English-speaking players encounter the country — a public, reproducible familiarity proxy.</p>
    <p>It is not a poll of Rarity Tower players, and it is not a measure of importance. A country can spike because of a news event; a tiny state can be famous out of proportion to its size. The game treats the number as a ranking signal, nothing more.</p>

    <h2>3. The percentile cut</h2>
    <p>Within each prompt, valid answers are sorted from least-viewed to most-viewed. Tiers are assigned by position in that list, not by an absolute view threshold — which guarantees that every floor has answers at every tier.</p>
    <table class="rt-table">
      <thead><tr><th>Tier</th><th>Position in the prompt’s answer list</th><th>Points</th></tr></thead>
      <tbody>
        ${data.tiers
          .map(
            (t) =>
              `<tr><td><span class="rt-tier" data-tier="${esc(t.key)}">${esc(TIER_LABEL[t.key])}</span></td><td>${pctShare(t.key)}</td><td>${t.points}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>
    <p>Because the cut is per prompt, a country’s tier changes with the question. Luxembourg is a household name on a “European microstates” floor and an obscure pick on “name any country”.</p>

    <h2>4. The floor minimum</h2>
    <p>Floors demand an increasing minimum: Uncommon on the first two, Rare in the middle, Epic on the last. A valid answer below the minimum collapses the floor. Repeating a country, timing out, or naming a territory also ends the run; a spelling error alone does not.</p>

    <h2>5. Known limits</h2>
    <ul>
      <li><b>Pageviews are not free association.</b> They measure lookups, so recent news and travel seasons can move a country up.</li>
      <li><b>The snapshot is fixed.</b> Data was pulled ${esc(String(data.generatedAt).slice(0, 10))}; tiers will drift as pageviews change, and are rebuilt deliberately rather than daily.</li>
      <li><b>English Wikipedia skews.</b> Countries with large non-English readerships may look rarer than they are to a global audience.</li>
      <li><b>No player data is used.</b> The daily tower is not a popularity contest, and results are not sent to a server.</li>
    </ul>
    <p class="rt-muted">Rebuild source: <code>scripts/build-rarity-packs.mjs</code> in the site repository. Questions, corrections or a country you think is mis-tiered: <a href="mailto:${esc(settings.contactEmail)}">${esc(settings.contactEmail)}</a>.</p>
  </section>

  <p><a class="btn-ghost rt-back" href="/rarity-tower">← Back to Rarity Tower</a></p>
</div>`;

  return layout({
    settings,
    body,
    title: 'Rarity Tower method — how rarity tiers work',
    description:
      'The full method behind Rarity Tower: the 194-country answer set, Wikipedia pageview source, per-prompt percentile tiers, floor minimums and known limits.',
    canonical: `${settings.domain}/rarity-tower/method`,
    ogImage: `${settings.domain}/assets/og/rarity-tower.png`,
    bodyClass: 'hype hype-static hype-rarity',
    head: `<link rel="stylesheet" href="/assets/rarity.css?v=1">${schema.map(jsonLd).join('')}`
  });
}

function sitemapEntries(domain) {
  const data = packs();
  return [
    { loc: `${domain}/rarity-tower`, pri: '0.9', freq: 'daily' },
    { loc: `${domain}/rarity-tower/method`, pri: '0.5', freq: 'monthly' },
    ...data.themes.map((t) => ({
      loc: `${domain}/rarity-tower/${t.slug}`,
      pri: '0.8',
      freq: 'daily'
    }))
  ];
}

module.exports = { hubPage, themePage, methodPage, sitemapEntries, packs };
