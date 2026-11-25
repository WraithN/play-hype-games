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
  <span class="rt-card-meta">${t.questions.length} prompts · ${uniqueCountries(t)} ${esc(t.unit || 'answers')}</span>
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
  const feature = themeBySlug('movies') || data.themes[0];
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
      q: 'Why did a correct answer make me fall?',
      a: 'Because it was too obvious for that floor. Valid is not enough: every floor sets a minimum tier, and a Common answer on a floor that needs Uncommon or better collapses the slab.'
    },
    {
      q: 'What counts as a valid answer?',
      a: 'Each tower has a closed list: Pixar features, Ghibli films, Beatles albums, Grand Theft Auto entries, Kanto Pokémon, and so on. Every list is printed on its theme page, including how many answers each prompt accepts. Spelling and common aliases are matched locally; a server-side pass maps nicknames and typos onto the same list.'
    },
    {
      q: 'Is Rarity Tower a Krillion or Rarefind alternative?',
      a: 'It is in the same family of rare-answer trivia games — you get scored on how obscure your answer is — but this one is a pop-culture climb rather than a geography dive. The answer sets cover movies, music, games and anime. It is an original Play Hype game, not affiliated with Krillion or Rarefind.'
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
        'A daily pop-culture trivia game: seven floors, one answer per floor, and only the rarer answers keep the slab standing.',
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
      <div class="kicker">Daily pop-culture trivia</div>
      <h1>Rarity Tower</h1>
      <p class="rt-lead">Seven floors. One answer per floor. The obvious answer is the trap.</p>
      <p>Each floor names a pop-culture constraint — a studio, a franchise, an album era, a type chart — and asks for an answer that fits. Your answer is ranked by how obscure it is. Clear the floor’s minimum and the climber jumps; pick the one everyone would think of, and the slab collapses under you.</p>
      <div class="rt-stats">
        <span><b>${data.themes.length}</b> towers</span>
        <span><b>${data.themes.reduce((n, t) => n + t.questions.length, 0)}</b> prompts</span>
        <span><b>${data.themes.length}</b> categories</span>
        <span><b>~2 min</b> a run</span>
      </div>
    </div>
    ${ladderRow(feature)}
  </header>

  ${gameFrame(feature, settings.domain, 'Rarity Tower — play the daily rare-answer trivia game')}

  <section class="rt-prose">
    <h2>How the climb works</h2>
    <p>Every floor asks for something that satisfies a pop-culture constraint: a studio, a franchise, an album, a game series, an anime. There is never one right answer — there are dozens. What separates them is how quickly they come to mind.</p>
    <ul>
      <li><b>Type an answer.</b> Spelling and common aliases are matched (Sorcerer’s Stone, White Album, GTA V, Kanto names).</li>
      <li><b>Meet the floor’s minimum.</b> Floor 1 asks for Uncommon or better; later floors demand Rare and then Epic. The required tier is printed above the input.</li>
      <li><b>Climb or fall.</b> A passing answer jumps one floor and scores 10–100 points by tier. A too-common answer, a repeated answer or a timeout ends the run. A hint costs 10 points once per floor.</li>
    </ul>
    <p>Every tower has a closed answer set, so a rejected answer is a spelling or set problem, not a judgement call. The lists are printed on each theme page; a server-side pass maps nicknames and typos onto the same list without ever exposing a key to the browser.</p>
  </section>

  <section>
    <div class="section-head">
      <div><div class="kicker">Pick a tower</div><h2>${data.themes.length} themed ladders</h2></div>
      <a class="more-link" href="/rarity-tower/prompts">Every prompt →</a>
    </div>
    <div class="rt-grid">${data.themes.map(themeCard).join('')}</div>
  </section>

  <section class="rt-prose">
    <h2>What the tiers mean</h2>
    <p>Tiers are computed inside each question, not across the whole catalogue. “Rare” means rarer than most valid answers to <em>that</em> prompt — so a title can be Common on “name any film in the series” and Legendary on a narrower prompt about one award or one console generation.</p>
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

  <p class="rt-muted rt-foot">Rarity Tower is an original game built by ${esc(settings.siteName)}. It is not affiliated with Krillion, Rarefind or any other daily trivia game. Answer lists are curated per tower; rarity comes from English Wikipedia pageviews.</p>
</div>`;

  return layout({
    settings,
    body,
    title: 'Rarity Tower — the daily pop-culture rarity game',
    description:
      'A free daily pop-culture trivia game: seven floors, one answer per floor, and the obvious answers collapse. Movies, music, games and anime — scored by how rare your answer is.',
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
  const unit = theme.unit || 'answers';
  const others = packs().themes.filter((t) => t.slug !== theme.slug);

  const faq = [
    {
      q: `How many answers count in the ${theme.name} tower?`,
      a: `The prompts here draw from ${countries} ${unit}. ${
        theme.kind === 'country'
          ? 'Territories are not accepted; the full answer set is the 194 states used across Rarity Tower.'
          : 'The list is curated and closed — the floor list below shows how many answers each prompt accepts.'
      }`
    },
    {
      q: `What is the rarest answer in the ${theme.name} tower?`,
      a: `${rarestList[0].name} (${TIER_LABEL[rarestList[0].tier]}) has the fewest English Wikipedia pageviews of any answer used here: ${nf.format(rarestList[0].views)} views over the snapshot period.`
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
      description: `A ${theme.floors}-floor rare-answer trivia tower themed around ${theme.name.toLowerCase()}. ${theme.tagline}.`,
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
        <span><b>${countries}</b> ${esc(unit)}</span>
        <span><b>${answers}</b> accepted answers</span>
      </div>
    </div>
    ${ladderRow(theme)}
  </header>

  ${gameFrame(theme, settings.domain, `Rarity Tower: ${theme.name} — play the rare-answer tower`)}

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
    <p>Lowest English Wikipedia pageviews among the ${esc(unit)} used here. These are the answers that keep a floor standing when the floor asks for Epic.</p>
    <table class="rt-table">
      <thead><tr><th>Answer</th><th>Floor</th><th>Tier</th><th>Pageviews</th></tr></thead>
      <tbody>
        ${rarestList
          .map(
            (a) =>
              `<tr><td>${esc(a.name)}</td><td>F${a.floor}</td><td><span class="rt-tier" data-tier="${esc(a.tier)}">${esc(TIER_LABEL[a.tier])}</span></td><td>${nf.format(a.views)}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>
    <p class="rt-muted">Tiers are relative to each prompt, so the same title can sit in a different tier on a different floor. <a href="/rarity-tower/method">How it is calculated →</a></p>
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
    title: `Rarity Tower: ${theme.name} — daily rare-answer trivia`,
    description: `${theme.tagline}. Play the ${theme.name} tower: ${theme.floors} prompts, ${countries} ${unit}, and a rarity minimum on every floor. Free, no download.`,
    canonical: `${settings.domain}/rarity-tower/${theme.slug}`,
    ogType: 'website',
    ogImage: `${settings.domain}/assets/og/rarity-tower.png`,
    bodyClass: 'hype hype-static hype-rarity',
    head: `<link rel="stylesheet" href="/assets/rarity.css?v=1">${schema.map(jsonLd).join('')}`
  });
}

/* ---------------- prompts archive ---------------- */

function promptsPage(settings) {
  const data = packs();
  const bc = breadcrumb(settings, [
    { name: 'Home', path: '/' },
    { name: 'Rarity Tower', path: '/rarity-tower' },
    { name: 'All prompts', path: '/rarity-tower/prompts' }
  ]);

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Every Rarity Tower prompt',
      url: `${settings.domain}/rarity-tower/prompts`,
      description:
        'The full prompt list for Rarity Tower: every tower, every floor, how many answers each prompt accepts and the rarity minimum it asks for.',
      isPartOf: { '@type': 'WebSite', name: settings.siteName, url: settings.domain + '/' }
    },
    bc.json
  ];

  const body = `
<div class="wrap">
  ${bc.html}
  <header class="rt-hero">
    <div class="rt-hero-copy">
      <div class="kicker">Rarity Tower · Prompt archive</div>
      <h1>Every prompt in the tower</h1>
      <p class="rt-lead">All ${data.themes.reduce((n, t) => n + t.questions.length, 0)} prompts, the number of accepted answers, and the rarity each floor asks for.</p>
      <p>Use this page to study a tower before a run, or to see which answers a prompt accepts. The prompts are fixed per tower — the daily run only changes their order.</p>
    </div>
  </header>

  ${data.themes
    .map(
      (t) => `<section class="rt-prose rt-archive">
    <h2><a href="/rarity-tower/${esc(t.slug)}">${esc(t.name)} tower</a></h2>
    <p>${esc(t.tagline)}. ${t.floors} floors, ${uniqueCountries(t)} ${esc(t.unit || 'answers')}.</p>
    <ol class="rt-floors">
      ${t.questions
        .map(
          (q, i) =>
            `<li><span class="rt-fnum">F${i + 1}</span><div><b>${esc(q.prompt)}</b><small>${q.answers.length} accepted answers · needs ${TIER_LABEL[t.ladder[i]]}+</small></div></li>`
        )
        .join('')}
    </ol>
  </section>`
    )
    .join('')}

  <p class="rt-muted rt-foot">Rarity Tower is an original game by ${esc(settings.siteName)}. Answer sets are curated per tower; rarity comes from English Wikipedia pageviews. <a href="/rarity-tower/method">How the tiers work →</a></p>
</div>`;

  return layout({
    settings,
    body,
    title: 'Every Rarity Tower prompt — full question list',
    description:
      'The full Rarity Tower question list: every tower, every prompt, accepted answer counts and the rarity minimum for each floor.',
    canonical: `${settings.domain}/rarity-tower/prompts`,
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
    <h2>1. The answer sets</h2>
    <p>Every prompt has a closed answer list: Pixar features, Ghibli films, Beatles albums, Grand Theft Auto entries, Call of Duty titles, Kanto Pokémon, Makoto Shinkai films. Each theme page prints its floors and how many answers every prompt accepts.</p>
    <p>Names and common aliases are matched locally. If a player uses a nickname, abbreviation, translation or typo, a server-side pass asks an LLM to map it onto one exact item from that prompt’s list. The model never invents an answer: anything it returns is checked against the list before it counts.</p>
    <p>The lists are deliberately checkable. If an answer is rejected, it is because it is outside the set, not because a model guessed.</p>

    <h2>2. The familiarity signal</h2>
    <p>Each answer’s English Wikipedia article is queried through the Wikimedia Pageviews API: monthly, user access only (bots excluded), summed across <b>December 2024 – October 2025</b>. That number stands in for how often English-speaking players encounter the title — a public, reproducible familiarity proxy.</p>
    <p>It is not a poll of Rarity Tower players, and it is not a measure of importance. A film can spike because of a release or an awards season; a niche game can be famous out of proportion to its sales. The game treats the number as a ranking signal, nothing more.</p>

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
    <p>Because the cut is per prompt, the same title can sit in different tiers. A franchise entry that is Common on “name any film in the series” can be Legendary on a narrower prompt.</p>

    <h2>4. The floor minimum</h2>
    <p>Floors demand an increasing minimum: Uncommon on the first two, Rare in the middle, Epic on the last. A valid answer below the minimum collapses the floor. Repeating an answer, timing out, or naming something outside the set also ends the run; a spelling error alone does not, because the server-side pass gets a chance to map it.</p>

    <h2>5. Known limits</h2>
    <ul>
      <li><b>Pageviews are not free association.</b> They measure lookups, so release news and awards seasons can move a title up.</li>
      <li><b>The snapshot is fixed.</b> Data was pulled ${esc(String(data.generatedAt).slice(0, 10))}; tiers will drift as pageviews change, and are rebuilt deliberately rather than daily.</li>
      <li><b>English Wikipedia skews.</b> Answers with large non-English readerships may look rarer than they are to a global audience.</li>
      <li><b>No player data is used.</b> The daily tower is not a popularity contest, and results are not sent to a server.</li>
    </ul>
    <p class="rt-muted">Rebuild source: <code>scripts/build-rarity-packs.mjs</code> in the site repository. Questions, corrections or an answer you think is mis-tiered: <a href="mailto:${esc(settings.contactEmail)}">${esc(settings.contactEmail)}</a>.</p>
  </section>

  <p><a class="btn-ghost rt-back" href="/rarity-tower">← Back to Rarity Tower</a></p>
</div>`;

  return layout({
    settings,
    body,
    title: 'Rarity Tower method — how rarity tiers work',
    description:
      'The full method behind Rarity Tower: the closed answer sets, Wikipedia pageview source, per-prompt percentile tiers, floor minimums and known limits.',
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
    { loc: `${domain}/rarity-tower/prompts`, pri: '0.6', freq: 'weekly' },
    { loc: `${domain}/rarity-tower/method`, pri: '0.5', freq: 'monthly' },
    ...data.themes.map((t) => ({
      loc: `${domain}/rarity-tower/${t.slug}`,
      pri: '0.8',
      freq: 'daily'
    }))
  ];
}

module.exports = { hubPage, themePage, promptsPage, methodPage, sitemapEntries, packs };
