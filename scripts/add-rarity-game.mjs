import fs from 'node:fs';

const gamesPath = 'data/games.json';
const settingsPath = 'data/settings.json';

const games = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

if (!settings.categories.some((c) => c.slug === 'puzzle-games')) {
  settings.categories.push({
    slug: 'puzzle-games',
    name: 'Puzzle Games',
    short: 'Think & solve',
    icon: 'spark'
  });
  settings.updatedAt = new Date().toISOString();
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  console.log('added category puzzle-games');
}

if (games.some((g) => g.slug === 'rarity-tower')) {
  console.log('game already present');
} else {
  const now = new Date().toISOString();
  games.push({
    id: Math.max(...games.map((g) => g.id)) + 1,
    title: 'Rarity Tower',
    slug: 'rarity-tower',
    description:
      'A daily country-climbing game: seven floors, one country per floor, and only the rarer answers keep the slab standing. Free, no download.',
    content:
      '<p>Rarity Tower is an original Play Hype game. Every floor asks for a country that fits a constraint; the closer your answer sits to the least-viewed countries on English Wikipedia, the higher its tier. Clear the floor minimum and you jump one slab up. Pick a country everyone would think of and the floor collapses.</p>' +
      '<p>It runs with sound off, needs no account, and has eight themed towers. <a href="/rarity-tower">Open the tower hub</a> for the Europe, Asia, Africa, Americas, islands, landlocked and microstate ladders, or read <a href="/rarity-tower/method">how the rarity tiers are calculated</a>.</p>',
    embedUrl: '/assets/games/rarity-tower/index.html?theme=world',
    thumb: '/assets/thumbs/rarity-tower.png',
    category: 'puzzle-games',
    tags: ['trivia', 'geography', 'daily', 'pixel', 'quiz', 'country'],
    rating: null,
    heat: 12,
    source: 'Play Hype Studio',
    externalId: '',
    releasedAt: now.slice(0, 10),
    seoTitle: 'Rarity Tower — daily country trivia game',
    seoDescription:
      'Climb seven floors of country trivia. Each answer is scored by rarity; the obvious ones collapse the floor. Free browser game, eight themed towers.',
    status: 'published',
    featured: true,
    views: 0,
    createdAt: now,
    updatedAt: now
  });
  fs.writeFileSync(gamesPath, JSON.stringify(games, null, 2) + '\n');
  console.log('added game rarity-tower');
}
