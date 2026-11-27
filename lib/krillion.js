'use strict';

/* ============================================================
   /krillion —— Krillion 游戏主入口页
   - krillion.io 明确禁止被第三方嵌入（X-Frame-Options: SAMEORIGIN、
     CSP frame-ancestors 'self'），因此可玩区不能用官方游戏
   - 页面提供：官方玩法规则、评分表、模式说明、去官方站的 CTA，
     以及站内自有可玩的稀有答案游戏 RarePop（明确标注不是 Krillion）
   - 不复制官方题库、不使用官方名称做自有游戏
   ============================================================ */

const { esc, jsonLd, layout, icon } = require('./render');

const FAQ = [
  {
    q: 'Is Krillion free to play?',
    a: 'Yes. The Daily Dive is free, with no account required. The paid unlock, Krillion Unlimited, removes the one-dive-per-day limit and is sold as a one-time purchase on krillion.io.'
  },
  {
    q: 'Can I play Krillion on this page?',
    a: 'No. Krillion blocks third-party embedding, so its puzzle only runs on krillion.io. The play button here opens the official site in a new tab. The game further down this page is RarePop, our own rare-answer game, not Krillion.'
  },
  {
    q: 'How many prompts are in a Krillion dive?',
    a: 'Seven. Each prompt gives you 25 seconds to type an answer that is valid for the prompt, and the rarer that answer is in the game\u2019s answer set, the more points it scores.'
  },
  {
    q: 'What is a good Krillion score?',
    a: 'The theoretical maximum is 700, which needs a One in a Krillion answer on all seven prompts. A dive of ordinary Schooler-level answers lands around 210; mixing in Rare and Deep Cut answers pushes a run past 400.'
  },
  {
    q: 'When does Krillion reset?',
    a: 'The daily puzzle rolls over at midnight US Eastern time, which is 05:00 UTC in winter and 04:00 UTC during daylight saving. Streaks are counted per daily puzzle, not per calendar day in your own timezone.'
  },
  {
    q: 'Is this page affiliated with Krillion?',
    a: 'No. PLAY HYPE GAMES is an independent browser-game directory. This page explains the rules and links to the official site; it is not endorsed by or connected to the Krillion developer.'
  }
];

const TIERS = [
  ['Plankton', '10', 'A common answer the whole school thought of.'],
  ['Too Clever', '15', 'Technically correct, but a stretch for the prompt.'],
  ['Schooler', '30', 'The solid mid-tier answer most players land on.'],
  ['Rare', '60', 'Uncommon but obviously valid once you see it.'],
  ['Deep Cut', '85', 'An answer most players never think of in 25 seconds.'],
  ['One in a Krillion', '100', 'The rarest accepted answer in the prompt\u2019s answer set.']
];

function krillionPage(settings) {
  const url = `${settings.domain}/krillion`;
  const title = 'Krillion — Play Today\u2019s Puzzle & How to Play';
  const description =
    'Krillion in one page: the seven-prompt daily dive, the six rarity tiers, modes, reset time and where to play today\u2019s puzzle. Independent guide, official link.';

  const cta = (label) => `<div class="ext-cta">
    <a class="btn btn-primary ext-cta-btn" href="https://krillion.io" target="_blank" rel="noopener">
      ${icon('play', 18)}<span>${esc(label)}</span>
    </a>
    <p class="ext-cta-note">Opens <strong>krillion.io</strong> in a new tab. Free daily dive, no download, no account.</p>
  </div>`;

  const tierRows = TIERS.map(
    ([tier, pts, note]) => `<tr><td><strong>${esc(tier)}</strong></td><td>${pts}</td><td>${esc(note)}</td></tr>`
  ).join('');

  const body = `
<div class="wrap ext-page kr-page">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span class="sep">/</span><span>Krillion</span>
  </nav>

  <header class="ext-head">
    <div class="kicker">Daily rare-answer game</div>
    <h1>Krillion: play today\u2019s puzzle and learn the rules</h1>
    <div class="game-sub">
      <span class="pill pill-accent">Daily puzzle</span>
      <span class="pill">7 prompts</span>
      <span class="pill">25 seconds each</span>
      <span class="pill">Free</span>
      <span class="pill">Browser</span>
    </div>
    <p class="ext-intro">Krillion is a free browser trivia game built on one idea: the correct answer is not enough, the <em>rare</em> correct answer is what scores. You get seven open prompts, 25 seconds each and one dive per day, and the depth you reach is the score. This page explains exactly how that works and links to the official puzzle.</p>
  </header>

  ${cta('Play today\u2019s Krillion dive on krillion.io')}

  <div class="kr-note">
    <strong>Why the game is not embedded here:</strong> krillion.io sends <code>X-Frame-Options: SAMEORIGIN</code> and a <code>frame-ancestors 'self'</code> policy, so the puzzle cannot run inside another site. The button above and the mode links below open the official pages. The playable game further down is our own, clearly labelled.
  </div>

  <div class="post-body ext-body kr-body">
    <h2>What Krillion is — and what it is not</h2>
    <p>Krillion runs at <a href="https://krillion.io" target="_blank" rel="noopener">krillion.io</a>, built by a solo developer who publishes as &ldquo;kp&rdquo; and launched in August 2026. Each day it publishes one seven-prompt dive. Prompts are open-ended — name a fruit, name a country, name a film — and every prompt ships with a curated answer set ranked by rarity. The rarer your valid answer, the deeper your dive goes.</p>
    <p>It is not the &ldquo;one in a krillion&rdquo; line from <em>Happy Feet Two</em>, not Krillion Ventures and not the Dragon Ball character Krillin. The <a href="/guides/one-in-a-krillion-meaning">tier-name explainer</a> covers where the top tier&rsquo;s name comes from.</p>

    <h2>How a dive works</h2>
    <ol>
      <li><strong>Seven prompts, one at a time.</strong> You see the prompt and a 25-second countdown.</li>
      <li><strong>Type any valid answer.</strong> Exact names and common aliases are matched; a typo or nickname can still be judged correct.</li>
      <li><strong>Rarity sets the score.</strong> The answer &ldquo;apple&rdquo; is Plankton. The answer nobody else thought of is One in a Krillion.</li>
      <li><strong>Your seven scores add up.</strong> The maximum is 700 — the trench. A miss scores nothing, and the prompt does not come back.</li>
    </ol>

    <h3>The six rarity tiers</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>Tier</th><th>Points</th><th>What it means</th></tr></thead>
      <tbody>${tierRows}</tbody>
    </table></div>
    <p>Two tiers deserve a note. <strong>Too Clever</strong> is the game&rsquo;s way of scoring a technically valid answer that stretches the prompt — you get some credit, but the set does not treat it as the intended read. <strong>One in a Krillion</strong> is the top tier: the rarest accepted answer in that prompt&rsquo;s set, worth 100.</p>

    <h2>Score benchmarks</h2>
    <p>Seven Schooler answers add up to about 210. A run that mixes Rare (60) and Deep Cut (85) answers clears 400. To reach the 700 maximum you would need the top-tier answer on every prompt, which is why most shared dives sit in the 200–400 band. If you want a target: beat 300 and you are already reading the prompts the way the game intends.</p>

    <h2>Modes</h2>
    <ul>
      <li><strong>Daily Dive</strong> — one free dive per day, the standard seven-prompt run.</li>
      <li><strong>Unlimited</strong> — a paid one-time unlock that removes the daily limit; our <a href="/guides/krillion-unlimited">Krillion Unlimited guide</a> covers price and what it includes.</li>
      <li><strong>Archive</strong> — past dives, for players who want to catch up or practise.</li>
      <li><strong>Themed packs</strong> — focused prompt sets sold on the site.</li>
      <li><strong>Puffer Party</strong> — a limited-time multiplayer mode listed in beta.</li>
    </ul>
    <p>Every mode lives on krillion.io; this page does not mirror them. If you are weighing the free loop against the paid one, read the <a href="/guides/what-is-krillion">full rules guide</a> and the <a href="/guides/games-like-krillion">alternatives list</a> before you buy.</p>

    <h2>When it resets</h2>
    <p>The daily puzzle rolls over at midnight US Eastern — 05:00 UTC in winter, 04:00 UTC during daylight saving. A streak counts daily puzzles, not your local calendar, so a player in Europe usually sees the new dive mid-morning.</p>

    <h2>Why answers feel hard</h2>
    <p>The prompts are deliberately broad. Broad prompts produce long answer sets, and long answer sets make the obvious answer common. The way to score deeper is to move one step past the first thing you think of: not &ldquo;apple&rdquo; but a specific cultivar, not &ldquo;France&rdquo; but a region, not &ldquo;Titanic&rdquo; but a lesser-known film with the same theme. That is a skill you can practise — and the closest way to practise it on this site is RarePop, below.</p>
  </div>

  <section class="kr-play" aria-label="Play RarePop">
    <div class="kr-play-head">
      <div>
        <div class="kicker">Playable here</div>
        <h2>Practise the format: RarePop</h2>
      </div>
      <span class="kr-badge">Not Krillion</span>
    </div>
    <p class="kr-play-intro">RarePop is our own rare-answer game — ten prompts, a rarity ring and no timer. It is a different game with different questions; it is here so the page has something you can actually play before you spend your one Krillion dive.</p>
    <div class="kr-frame">
      <iframe src="/assets/games/rarepop/index.html" title="RarePop — rare-answer browser game by Play Hype" loading="lazy" allowfullscreen allow="fullscreen; autoplay"></iframe>
    </div>
    <p class="kr-frame-note">Free browser game, no download. Sound starts after your first tap; use fullscreen for a larger view. <a href="/rarepop">RarePop details</a></p>
  </section>

  <div class="post-body ext-body kr-body">
    <h2>Frequently asked questions</h2>
    <div class="faq-list">${FAQ.map(
      (f) => `<div class="faq-item"><h4>${esc(f.q)}</h4><p>${esc(f.a)}</p></div>`
    ).join('')}</div>
  </div>

  ${cta('Open krillion.io and start the dive')}

  <p class="ext-affil">Krillion is operated independently at krillion.io. PLAY HYPE GAMES is an independent browser-game directory and is not affiliated with, endorsed by or connected to the Krillion developer. All trademarks belong to their respective owners.</p>
  <p class="ext-back"><a href="/guides/what-is-krillion">← Read the full Krillion rules guide</a></p>
</div>`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'Krillion',
    description,
    url,
    sameAs: 'https://krillion.io',
    applicationCategory: 'Game',
    gamePlatform: 'Web Browser',
    operatingSystem: 'Any modern desktop or mobile web browser',
    genre: ['Trivia', 'Puzzle', 'Daily game'],
    inLanguage: 'en',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${settings.domain}/` },
      { '@type': 'ListItem', position: 2, name: 'Krillion', item: url }
    ]
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };

  return layout({
    settings,
    body,
    canonical: url,
    title,
    description,
    ogType: 'website',
    bodyClass: 'hype hype-static hype-krillion',
    head: jsonLd(schema) + jsonLd(breadcrumb) + jsonLd(faqLd)
  });
}

function sitemapEntries(domain) {
  return [{ loc: `${domain}/krillion`, pri: '0.9', freq: 'daily' }];
}

module.exports = { krillionPage, sitemapEntries };
