/**
 * Builds the Rarity Tower question packs.
 *
 * Rarity tier = percentile of English Wikipedia pageviews for that answer,
 * computed inside the question's own valid answer set. The pageview numbers
 * are a public, citable familiarity proxy, not a live poll.
 *
 * Run: node scripts/build-rarity-packs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import CUSTOM_THEMES from '../data/rarity/custom-sources.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(ROOT, '.cache', 'rarity');
fs.mkdirSync(CACHE, { recursive: true });

const UA = 'PlayHypeGames-RarityTower/1.0 (https://www.playhypegames.com; nathon.wang713@gmail.com)';
const PV_START = '20241101';
const PV_END = '20251031';

async function cached(name, fn) {
  const file = path.join(CACHE, name);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const data = await fn();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return data;
}

async function getJSON(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

/* ---------- 1. country data ---------- */

const countries = await cached('countries.json', () =>
  getJSON('https://raw.githubusercontent.com/mledoze/countries/master/countries.json')
);

const population = await cached('population.json', async () => {
  const j = await getJSON('https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&date=2023&per_page=400');
  const map = {};
  for (const row of j[1] || []) if (row.value) map[row.countryiso3code] = row.value;
  return map;
});

/* ---------- 2. states we accept as answers ---------- */

const EXTRA = new Set(['TWN', 'XKX', 'PSE', 'VAT']); // widely named as countries, no UN seat
const states = countries
  .filter((c) => c.independent === true && (c.unMember === true || EXTRA.has(c.cca3)))
  .filter((c) => c.cca3 !== 'ATA')
  .map((c) => ({
    code: c.cca3,
    name: c.name.common,
    official: c.name.official,
    alt: c.altSpellings || [],
    region: c.region,
    subregion: c.subregion,
    area: c.area,
    landlocked: c.landlocked,
    borders: c.borders || [],
    latlng: c.latlng,
    capital: (c.capital || [])[0] || '',
    unMember: c.unMember === true,
    population: population[c.cca3] || null
  }));

console.log('states:', states.length);
console.log('no population:', states.filter((s) => !s.population).map((s) => s.name).join(', ') || 'none');

/* ---------- 3. resolve Wikipedia article titles ---------- */

const ARTICLE_OVERRIDES = {
  Georgia: 'Georgia (country)',
  Ireland: 'Republic of Ireland',
  'DR Congo': 'Democratic Republic of the Congo',
  Congo: 'Republic of the Congo',
  'Czechia': 'Czech Republic',
  Turkey: 'Turkey',
  'Ivory Coast': 'Ivory Coast',
  'East Timor': 'East Timor',
  Swaziland: 'Eswatini',
  Macedonia: 'North Macedonia',
  Bahamas: 'The Bahamas',
  Gambia: 'The Gambia',
  'United States': 'United States',
  'Saint Kitts and Nevis': 'Saint Kitts and Nevis',
  'Vatican City': 'Vatican City',
  Palestine: 'State of Palestine',
  Kosovo: 'Kosovo',
  Taiwan: 'Taiwan'
};

const titles = states.map((s) => ARTICLE_OVERRIDES[s.name] || s.name);
const resolved = await cached('wiki-titles.json', async () => {
  const out = {};
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const url =
      'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles=' +
      encodeURIComponent(batch.join('|'));
    const data = await getJSON(url);
    const q = data.query || {};
    const map = {};
    for (const n of q.normalized || []) map[n.from] = n.to;
    for (const r of q.redirects || []) map[r.from] = r.to;
    for (const t of batch) {
      let cur = t;
      for (let hop = 0; hop < 3; hop++) {
        if (map[cur]) cur = map[cur];
        else break;
      }
      out[t] = cur;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
});

/* ---------- 4. pageviews ---------- */

async function pageviews(title) {
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(
    title.replace(/ /g, '_')
  )}/monthly/${PV_START}/${PV_END}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 404) return { missing: true, views: 0 };
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      return { missing: false, views: (data.items || []).reduce((sum, i) => sum + i.views, 0) };
    } catch (e) {
      if (attempt === 4) return { failed: true, views: null };
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  return { failed: true, views: null };
}

const viewsFile = path.join(CACHE, 'pageviews.json');
const views = fs.existsSync(viewsFile) ? JSON.parse(fs.readFileSync(viewsFile, 'utf8')) : {};
const missing = [];
const failed = [];
let queue = states.filter((s) => !views[s.code]);

async function worker() {
  while (queue.length) {
    const s = queue.shift();
    const title = resolved[ARTICLE_OVERRIDES[s.name] || s.name] || s.name;
    const r = await pageviews(title);
    if (r.failed) {
      failed.push(`${s.name} -> ${title}`);
      continue; // do not cache a transient failure
    }
    if (r.missing) missing.push(`${s.name} -> ${title}`);
    views[s.code] = r.views;
    if (Object.keys(views).length % 20 === 0) {
      fs.writeFileSync(viewsFile, JSON.stringify(views, null, 2));
      console.log('fetched', Object.keys(views).length);
    }
    await new Promise((res) => setTimeout(res, 80));
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
fs.writeFileSync(viewsFile, JSON.stringify(views, null, 2));
console.log('pageviews done, missing articles:', missing.length, 'failed:', failed.length);
if (missing.length) console.log(missing.slice(0, 10).join('\n'));
if (failed.length) {
  console.log(failed.join('\n'));
  throw new Error('some pageview requests failed; rerun to retry');
}

for (const s of states) s.views = views[s.code] || 0;

/* ---------- 5. question builders ---------- */

const byCode = Object.fromEntries(states.map((s) => [s.code, s]));
const codes = (...list) => list.map((c) => byCode[c]).filter(Boolean);

const EU = codes('AUT','BEL','BGR','HRV','CYP','CZE','DNK','EST','FIN','FRA','DEU','GRC','HUN','IRL','ITA','LVA','LTU','LUX','MLT','NLD','POL','PRT','ROU','SVK','SVN','ESP','SWE');
const BALKANS = codes('ALB','BIH','BGR','HRV','GRC','XKX','MNE','MKD','ROU','SRB','SVN');
const NORDIC = codes('DNK','FIN','ISL','NOR','SWE');
const MIDDLE_EAST = codes('BHR','CYP','EGY','IRN','IRQ','ISR','JOR','KWT','LBN','OMN','PSE','QAT','SAU','SYR','TUR','ARE','YEM');
const WEST_AFRICA = states.filter((s) => s.subregion === 'Western Africa');
const NORTH_AFRICA = states.filter((s) => s.subregion === 'Northern Africa');
const SOUTH_AMERICA = states.filter((s) => s.subregion === 'South America');
const CENTRAL_AMERICA = states.filter((s) => s.subregion === 'Central America');
const CARIBBEAN = states.filter((s) => s.subregion === 'Caribbean');
const SOUTHERN_EUROPE = states.filter((s) => s.subregion === 'Southern Europe');
const SOUTHEAST_ASIA = states.filter((s) => s.subregion === 'South-Eastern Asia');

function q(id, prompt, list, note) {
  const uniq = [...new Map(list.filter(Boolean).map((s) => [s.code, s])).values()];
  return { id, prompt, note: note || '', answers: uniq };
}

const world = [
  q('world-any', 'Name any country', states),
  q('world-small', 'Name a country with fewer than 1 million people', states.filter((s) => s.population && s.population < 1e6)),
  q('world-landlocked', 'Name a landlocked country', states.filter((s) => s.landlocked)),
  q('world-noborders', 'Name a country with no land borders', states.filter((s) => s.borders.length === 0)),
  q('world-south', 'Name a country in the Southern Hemisphere', states.filter((s) => s.latlng[0] < 0)),
  q('world-s', 'Name a country whose name starts with S', states.filter((s) => s.name.startsWith('S'))),
  q('world-big', 'Name a country larger than 2 million km²', states.filter((s) => s.area > 2e6)),
  q('world-oneborder', 'Name a country that borders exactly one other country', states.filter((s) => s.borders.length === 1)),
  q('world-bigpop', 'Name a country with more than 50 million people', states.filter((s) => s.population > 5e7))
];

const europe = [
  q('eu-any', 'Name a European country', states.filter((s) => s.region === 'Europe')),
  q('eu-eu', 'Name a country in the European Union', EU),
  q('eu-landlocked', 'Name a landlocked European country', states.filter((s) => s.region === 'Europe' && s.landlocked)),
  q('eu-small', 'Name a European country with fewer than 1 million people', states.filter((s) => s.region === 'Europe' && s.population && s.population < 1e6)),
  q('eu-germany', 'Name a country that borders Germany', codes('FRA','POL','CZE','AUT','CHE','LUX','BEL','NLD','DNK')),
  q('eu-balkans', 'Name a country in the Balkans', BALKANS),
  q('eu-nordic', 'Name a Nordic country', NORDIC),
  q('eu-russia', 'Name a European country that borders Russia', codes('FIN','EST','LVA','LTU','POL','BLR','UKR','MDA','NOR')),
  q('eu-tiny', 'Name a European country smaller than 5,000 km²', states.filter((s) => s.region === 'Europe' && s.area < 5000))
];

const asia = [
  q('as-any', 'Name an Asian country', states.filter((s) => s.region === 'Asia')),
  q('as-sea', 'Name a Southeast Asian country', SOUTHEAST_ASIA),
  q('as-landlocked', 'Name a landlocked Asian country', states.filter((s) => s.region === 'Asia' && s.landlocked)),
  q('as-bigpop', 'Name an Asian country with more than 100 million people', states.filter((s) => s.region === 'Asia' && s.population > 1e8)),
  q('as-china', 'Name a country that borders China', codes('IND','PAK','AFG','NPL','BTN','MMR','LAO','VNM','MNG','RUS','KAZ','KGZ','TJK','PRK')),
  q('as-mideast', 'Name a country in the Middle East', MIDDLE_EAST),
  q('as-island', 'Name an Asian country with no land borders', states.filter((s) => s.region === 'Asia' && s.borders.length === 0)),
  q('as-central', 'Name a Central Asian country', states.filter((s) => s.subregion === 'Central Asia')),
  q('as-south', 'Name a South Asian country', states.filter((s) => s.subregion === 'Southern Asia'))
];

const africa = [
  q('af-any', 'Name an African country', states.filter((s) => s.region === 'Africa')),
  q('af-north', 'Name a North African country', NORTH_AFRICA),
  q('af-landlocked', 'Name a landlocked African country', states.filter((s) => s.region === 'Africa' && s.landlocked)),
  q('af-west', 'Name a West African country', WEST_AFRICA),
  q('af-small', 'Name an African country with fewer than 2 million people', states.filter((s) => s.region === 'Africa' && s.population && s.population < 2e6)),
  q('af-south', 'Name a country that borders South Africa', codes('BWA','LSO','MOZ','NAM','SWZ','ZWE')),
  q('af-island', 'Name an African country with no land borders', states.filter((s) => s.region === 'Africa' && s.borders.length === 0)),
  q('af-east', 'Name an East African country', states.filter((s) => s.subregion === 'Eastern Africa')),
  q('af-bigpop', 'Name an African country with more than 40 million people', states.filter((s) => s.region === 'Africa' && s.population > 4e7)),
  q('af-bigarea', 'Name an African country larger than 1 million km²', states.filter((s) => s.region === 'Africa' && s.area > 1e6))
];

const americas = [
  q('am-any', 'Name a country in the Americas', states.filter((s) => s.region === 'Americas')),
  q('am-south', 'Name a South American country', SOUTH_AMERICA),
  q('am-central', 'Name a Central American country', CENTRAL_AMERICA),
  q('am-caribbean', 'Name a Caribbean country', CARIBBEAN),
  q('am-brazil', 'Name a country that borders Brazil', codes('ARG','BOL','COL','GUF','GUY','PRY','PER','SUR','URY','VEN')),
  q('am-small', 'Name a South American country with fewer than 1 million people', SOUTH_AMERICA.filter((s) => s.population < 1e6)),
  q('am-island', 'Name a country in the Americas with no land borders', states.filter((s) => s.region === 'Americas' && s.borders.length === 0)),
  q('am-bigpop', 'Name a country in the Americas with more than 30 million people', states.filter((s) => s.region === 'Americas' && s.population > 3e7)),
  q('am-bigarea', 'Name a country in the Americas larger than 1 million km²', states.filter((s) => s.region === 'Americas' && s.area > 1e6))
];

const islands = [
  q('is-any', 'Name a country with no land borders', states.filter((s) => s.borders.length === 0)),
  q('is-pacific', 'Name a Pacific island country', states.filter((s) => s.region === 'Oceania')),
  q('is-caribbean', 'Name a Caribbean country', CARIBBEAN),
  q('is-indian', 'Name an island country in the Indian Ocean', codes('MDG','MUS','SYC','COM','MDV','LKA')),
  q('is-small', 'Name a country with no land borders and fewer than 1 million people', states.filter((s) => s.borders.length === 0 && s.population < 1e6)),
  q('is-europe', 'Name a European country with no land borders', states.filter((s) => s.region === 'Europe' && s.borders.length === 0)),
  q('is-atlantic', 'Name an island country in the Atlantic', codes('ISL','IRL','GBR','CPV','STP','BHS','BRB','CUB','JAM','HTI','DOM','TTO','ATG','DMA','GRD','KNA','LCA','VCT')),
  q('is-pacific-small', 'Name a Pacific island country with fewer than 500,000 people', states.filter((s) => s.region === 'Oceania' && s.population < 5e5)),
  q('is-big', 'Name a country with no land borders and more than 5 million people', states.filter((s) => s.borders.length === 0 && s.population > 5e6))
];

const landlocked = [
  q('ll-any', 'Name a landlocked country', states.filter((s) => s.landlocked)),
  q('ll-africa', 'Name a landlocked country in Africa', states.filter((s) => s.region === 'Africa' && s.landlocked)),
  q('ll-europe', 'Name a landlocked country in Europe', states.filter((s) => s.region === 'Europe' && s.landlocked)),
  q('ll-asia', 'Name a landlocked country in Asia', states.filter((s) => s.region === 'Asia' && s.landlocked)),
  q('ll-southamerica', 'Name a landlocked country in South America', SOUTH_AMERICA.filter((s) => s.landlocked)),
  q('ll-small', 'Name a landlocked country with fewer than 2 million people', states.filter((s) => s.landlocked && s.population < 2e6)),
  q('ll-oneborder', 'Name a landlocked country that borders exactly one country', states.filter((s) => s.landlocked && s.borders.length === 1)),
  q('ll-bigpop', 'Name a landlocked country with more than 20 million people', states.filter((s) => s.landlocked && s.population > 2e7))
];

const micro = [
  q('mi-any', 'Name a country smaller than 5,000 km²', states.filter((s) => s.area > 0 && s.area < 5000)),
  q('mi-europe', 'Name a European country smaller than 5,000 km²', states.filter((s) => s.region === 'Europe' && s.area < 5000)),
  q('mi-caribbean', 'Name a Caribbean country smaller than 5,000 km²', CARIBBEAN.filter((s) => s.area < 5000)),
  q('mi-africa', 'Name an African country smaller than 5,000 km²', states.filter((s) => s.region === 'Africa' && s.area < 5000)),
  q('mi-1000', 'Name a country smaller than 1,000 km²', states.filter((s) => s.area > 0 && s.area < 1000)),
  q('mi-500', 'Name a country smaller than 500 km²', states.filter((s) => s.area > 0 && s.area < 500)),
  q('mi-noborders', 'Name a country smaller than 5,000 km² with no land borders', states.filter((s) => s.area < 5000 && s.borders.length === 0)),
  q('mi-landlocked', 'Name a landlocked microstate', states.filter((s) => s.landlocked && s.area < 5000))
];

const ALIASES = {
  'United States': ['US', 'USA', 'United States of America', 'America'],
  'United Kingdom': ['UK', 'Britain', 'Great Britain'],
  'United Arab Emirates': ['UAE', 'Emirates'],
  'DR Congo': ['DRC', 'Congo-Kinshasa', 'Democratic Republic of Congo'],
  Congo: ['Republic of Congo', 'Congo-Brazzaville'],
  Czechia: ['Czech Republic'],
  Turkey: ['Türkiye'],
  Netherlands: ['Holland'],
  'South Korea': ['Korea', 'Republic of Korea'],
  'North Korea': ['DPRK'],
  Russia: ['Russian Federation'],
  'Ivory Coast': ["Cote d'Ivoire", "Côte d'Ivoire"],
  'East Timor': ['Timor-Leste'],
  Myanmar: ['Burma'],
  Eswatini: ['Swaziland'],
  'Cape Verde': ['Cabo Verde'],
  'Vatican City': ['Vatican', 'Holy See'],
  Micronesia: ['Federated States of Micronesia', 'FSM'],
  Laos: ['Lao PDR'],
  Syria: ['Syrian Arab Republic'],
  Iran: ['Islamic Republic of Iran'],
  Moldova: ['Republic of Moldova'],
  Tanzania: ['United Republic of Tanzania'],
  Bolivia: ['Plurinational State of Bolivia'],
  Venezuela: ['Bolivarian Republic of Venezuela'],
  Brunei: ['Brunei Darussalam'],
  Vietnam: ['Viet Nam'],
  Bahamas: ['The Bahamas'],
  Gambia: ['The Gambia']
};

function aliasesFor(s) {
  const set = new Set(ALIASES[s.name] || []);
  for (const a of s.alt) {
    if (a && a.length >= 4 && a.length <= 40) set.add(a);
  }
  set.delete(s.name);
  return [...set];
}

/* ---------- 6. tiers ---------- */

const TIERS = [
  { key: 'legendary', label: 'LEGENDARY', upTo: 0.15, points: 100 },
  { key: 'epic', label: 'EPIC', upTo: 0.35, points: 75 },
  { key: 'rare', label: 'RARE', upTo: 0.6, points: 50 },
  { key: 'uncommon', label: 'UNCOMMON', upTo: 0.8, points: 25 },
  { key: 'common', label: 'COMMON', upTo: 1, points: 10 }
];

function tierFor(frac) {
  return TIERS.find((t) => frac <= t.upTo) || TIERS[TIERS.length - 1];
}

function buildQuestion(raw) {
  const list = raw.answers.filter((s) => s.views > 0);
  if (list.length < 6) {
    console.log('  drop', raw.id, 'answers:', list.length);
    return null;
  }
  const sorted = [...list].sort((a, b) => a.views - b.views);
  const answers = sorted.map((s, i) => {
    const frac = (i + 1) / sorted.length;
    const tier = tierFor(frac);
    return {
      name: s.name,
      code: s.code,
      aliases: aliasesFor(s),
      views: s.views,
      tier: tier.key,
      points: tier.points,
      share: Math.round(frac * 100)
    };
  });
  return {
    id: raw.id,
    prompt: raw.prompt,
    note: raw.note,
    answers
  };
}

const themeDefs = [
  {
    slug: 'world',
    name: 'World',
    tagline: 'Every country counts',
    blurb: 'The full 197-country board. Start here if you want the widest spread of answers — and the widest spread of things that can go wrong.',
    questions: world
  },
  {
    slug: 'europe',
    name: 'Europe',
    tagline: 'Small continent, famous answers',
    blurb: 'Europe punishes autopilot. France and Germany are the first words most players type, which is exactly why they are the fastest way to fall.',
    questions: europe
  },
  {
    slug: 'asia',
    name: 'Asia',
    tagline: 'Half the world, one ladder',
    blurb: 'Asia runs from the Mediterranean to the Pacific. The easy answers are huge and obvious; the safe ones are the countries you have to think twice to name.',
    questions: asia
  },
  {
    slug: 'africa',
    name: 'Africa',
    tagline: 'Fifty-four countries, five defaults',
    blurb: 'Most players can name five African countries without thinking. The tower only lets you use the ones that take a second pass.',
    questions: africa
  },
  {
    slug: 'americas',
    name: 'Americas',
    tagline: 'Two continents, one long tail',
    blurb: 'From Canada down to Tierra del Fuego. The Caribbean is where the rarity lives — if you can get past the obvious picks.',
    questions: americas
  },
  {
    slug: 'islands',
    name: 'Islands',
    tagline: 'No land borders, no easy exits',
    blurb: 'Every answer here is a country you cannot walk into. The famous islands are traps; the safe ones are specks with a UN seat.',
    questions: islands
  },
  {
    slug: 'landlocked',
    name: 'Landlocked',
    tagline: 'No coast, no cover',
    blurb: 'Forty-four countries with no sea access. Switzerland and Austria are the reflex answers, and the tower knows it.',
    questions: landlocked
  },
  {
    slug: 'microstates',
    name: 'Microstates',
    tagline: 'Tiny countries, sharp edges',
    blurb: 'Under 5,000 square kilometres. At this size the whole answer pool is obscure — which means the tiers are decided by inches.',
    questions: micro
  }
];

const RARITY_LADDER = ['uncommon', 'uncommon', 'rare', 'rare', 'epic', 'epic', 'epic'];

for (const t of themeDefs) {
  Object.assign(t, {
    kind: 'country',
    unit: 'countries',
    one: 'country',
    placeholder: 'Type a country…'
  });
}

const themes = themeDefs
  .map((t) => {
    const questions = t.questions.map(buildQuestion).filter(Boolean);
    if (questions.length < 5) {
      console.warn('SKIP theme', t.slug, 'only', questions.length, 'questions');
      return null;
    }
    const pool = questions.slice(0, 7);
    return {
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      blurb: t.blurb,
      kind: t.kind,
      unit: t.unit,
      one: t.one,
      placeholder: t.placeholder,
      floors: pool.length,
      ladder: RARITY_LADDER.slice(0, pool.length),
      questions: pool
    };
  })
  .filter(Boolean);

/* ---------- 6b. custom themes (films, music, NFL, football, space, history) ---------- */

const searchFile = path.join(CACHE, 'wiki-search.json');
const searchCache = fs.existsSync(searchFile) ? JSON.parse(fs.readFileSync(searchFile, 'utf8')) : {};
const customViewsFile = path.join(CACHE, 'custom-pageviews.json');
const customViews = fs.existsSync(customViewsFile) ? JSON.parse(fs.readFileSync(customViewsFile, 'utf8')) : {};

/** Plain names that collide with a different article. */
const WIKI_FIX = {
  'Mercury|planet': 'Mercury (planet)',
  'Aries|constellation': 'Aries (constellation)',
  'Taurus|constellation': 'Taurus (constellation)',
  'Gemini|constellation': 'Gemini (constellation)',
  'Cancer|constellation': 'Cancer (constellation)',
  'Leo|constellation': 'Leo (constellation)',
  'Virgo|constellation': 'Virgo (constellation)',
  'Libra|constellation': 'Libra (constellation)',
  'Sagittarius|constellation': 'Sagittarius (constellation)',
  'Aquarius|constellation': 'Aquarius (constellation)',
  'Pisces|constellation': 'Pisces (constellation)',
  'Spirit|Mars mission': 'Spirit (rover)',
  'Opportunity|Mars mission': 'Opportunity (rover)',
  'Curiosity|Mars mission': 'Curiosity (rover)',
  'Perseverance|Mars mission': 'Perseverance (rover)',
  'Phoenix|Mars mission': 'Phoenix (spacecraft)',
  'Ingenuity|Mars mission': 'Ingenuity (helicopter)',
  'Georgia|US state': 'Georgia (U.S. state)',
  'New York|US state': 'New York (state)',
  'Manchester United|football club': 'Manchester United F.C.',
  'Manchester City|football club': 'Manchester City F.C.',
  'Liverpool|football club': 'Liverpool F.C.',
  'Arsenal|football club': 'Arsenal F.C.',
  'Chelsea|football club': 'Chelsea F.C.',
  'Barcelona|football club': 'FC Barcelona',
  'Ajax|football club': 'AFC Ajax',
  'Benfica|football club': 'S.L. Benfica',
  'Porto|football club': 'FC Porto',
  'Celtic|football club': 'Celtic F.C.',
  'Marseille|football club': 'Olympique de Marseille',
  'Aston Villa|football club': 'Aston Villa F.C.',
  'Nottingham Forest|football club': 'Nottingham Forest F.C.',
  'Leicester City|football club': 'Leicester City F.C.',
  'Blackburn Rovers|football club': 'Blackburn Rovers F.C.',
  'Steaua București|football club': 'FCSB',
  'Ronaldo|footballer': 'Ronaldo (Brazilian footballer)'
};

async function withRetry(fn, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
}

async function searchTitle(name, context) {
  const key = `${name}|${context || ''}`;
  if (searchCache[key]) return searchCache[key];
  const q = `${name} ${context || ''}`.trim();
  const data = await withRetry(() =>
    getJSON(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=1&format=json`
    )
  );
  const title =
    (data.query && data.query.search && data.query.search[0] && data.query.search[0].title) || name;
  searchCache[key] = title;
  fs.writeFileSync(searchFile, JSON.stringify(searchCache, null, 2));
  return title;
}

const customTasks = [];
for (const t of CUSTOM_THEMES) {
  for (const p of t.prompts) {
    for (const a of p.answers) customTasks.push({ a, p });
  }
}

const titleFor = new Map();

/* Resolve redirects so pageviews count the canonical article, not a stub. */
const baseTitles = [...new Set(customTasks.map((x) => x.a.wiki || WIKI_FIX[`${x.a.name}|${x.p.context || ''}`] || x.a.name))];
const resolveMap = {};
for (let i = 0; i < baseTitles.length; i += 40) {
  const batch = baseTitles.slice(i, i + 40);
  const data = await withRetry(() =>
    getJSON(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles=${encodeURIComponent(batch.join('|'))}`
    )
  );
  const q = (data && data.query) || {};
  const map = {};
  for (const n of q.normalized || []) map[n.from] = n.to;
  for (const r of q.redirects || []) map[r.from] = r.to;
  for (const base of batch) {
    let cur = base;
    for (let hop = 0; hop < 3; hop++) {
      if (map[cur]) cur = map[cur];
      else break;
    }
    resolveMap[base] = cur;
  }
  await new Promise((r) => setTimeout(r, 150));
}

async function fetchTask(item) {
  const { a, p } = item;
  const key = `${a.name}|${p.context || ''}`;
  if (titleFor.has(key)) return true;
  const base = a.wiki || WIKI_FIX[key] || a.name;
  let title = resolveMap[base] || base;
  let r = await pageviews(title);
  if (r.failed) return false;
  if (r.missing) {
    const found = await searchTitle(a.name, p.context);
    if (found && found !== title) {
      title = found;
      r = await pageviews(title);
      if (r.failed) return false;
    }
  }
  customViews[title] = r.views || 0;
  titleFor.set(key, title);
  return true;
}

let customQueue = [...customTasks];
for (let pass = 0; pass < 3 && customQueue.length; pass++) {
  const failed = [];
  let cursor = 0;
  async function worker() {
    while (cursor < customQueue.length) {
      const item = customQueue[cursor++];
      const ok = await fetchTask(item);
      if (!ok) failed.push(item);
      await new Promise((res) => setTimeout(res, 90));
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker));
  fs.writeFileSync(customViewsFile, JSON.stringify(customViews, null, 2));
  console.log('pageview pass', pass + 1, 'failed:', failed.length);
  customQueue = failed;
}
if (customQueue.length) {
  console.log(customQueue.map((x) => `${x.a.name} -> ${titleFor.get(`${x.a.name}|${x.p.context || ''}`) || ''}`).join('\n'));
  throw new Error('custom pageview fetch failed; rerun to retry');
}
console.log('custom titles:', titleFor.size);

function buildCustomPrompt(p) {
  const seen = new Set();
  const rows = p.answers
    .map((a) => {
      const title = titleFor.get(`${a.name}|${p.context || ''}`) || a.wiki || a.name;
      return { ...a, title, views: customViews[title] || 0 };
    })
    .filter((a) => a.views > 0)
    .filter((a) => (seen.has(a.title) ? false : seen.add(a.title)));
  if (rows.length < 6) {
    console.log('  drop custom', p.id, 'answers:', rows.length);
    return null;
  }
  const sorted = [...rows].sort((a, b) => a.views - b.views);
  const answers = sorted.map((a, i) => {
    const frac = (i + 1) / sorted.length;
    const tier = tierFor(frac);
    return {
      name: a.name,
      code: a.title,
      aliases: a.aliases || [],
      views: a.views,
      tier: tier.key,
      points: tier.points,
      share: Math.round(frac * 100)
    };
  });
  return { id: p.id, prompt: p.prompt, note: '', answers };
}

const customThemes = CUSTOM_THEMES.map((t) => {
  const questions = t.prompts.map(buildCustomPrompt).filter(Boolean);
  if (questions.length < 5) {
    console.warn('SKIP custom theme', t.slug, 'only', questions.length, 'questions');
    return null;
  }
  const pool = questions.slice(0, 7);
  return {
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    blurb: t.blurb,
    kind: t.kind,
    unit: t.unit,
    one: t.one,
    placeholder: t.placeholder,
    floors: pool.length,
    ladder: RARITY_LADDER.slice(0, pool.length),
    questions: pool
  };
}).filter(Boolean);

const allThemes = [...customThemes, ...themes];

/* ---------- 7. output ---------- */

const out = {
  generatedAt: new Date().toISOString(),
  source: 'English Wikipedia pageviews (Dec 2024 - Oct 2025), monthly, user access',
  answerCount: states.length,
  tiers: TIERS.map(({ key, label, upTo, points }) => ({ key, label, upTo, points })),
  themes: allThemes
};

const dest = path.join(ROOT, 'data', 'rarity', 'packs.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2));

for (const t of allThemes) {
  console.log(
    t.slug,
    'floors', t.floors,
    '| questions', t.questions.length,
    '| answers', t.questions.map((x) => x.answers.length).join(',')
  );
}
console.log('wrote', dest, (fs.statSync(dest).size / 1024).toFixed(0) + 'KB');
