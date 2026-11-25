---
name: rarity-tower
description: Maintain and extend Rarity Tower, the self-hosted pop-culture rare-answer game on Play Hype Games. Use when adding prompts, answers, hints, categories, changing rarity tiers, tuning the pixel UI, wiring the server-side LLM judge, or deploying this game.
---

# Rarity Tower

A self-hosted pixel game on `playhypegames.com/rarity-tower`. Four pop-culture towers (movies, music, games, anime). Each floor asks for an answer from a closed list; the rarer the answer, the safer the floor. Too-common answers collapse the slab and the run ends.

## Files

| Path | Role |
| --- | --- |
| `data/rarity/custom-sources.mjs` | Prompts, closed answer lists, aliases, per-prompt hints |
| `scripts/build-rarity-packs.mjs` | Builds `data/rarity/packs.json` from sources + Wikipedia pageviews |
| `data/rarity/packs.json` | Runtime data; served at `/rarity-tower/packs.json` |
| `public/games/rarity-tower/index.html` | Game shell + pixel CSS |
| `public/games/rarity-tower/game.js` | Engine: floors, timer, hints, tiers, share |
| `lib/rarity.js` | Hub, theme pages, prompt archive, method page |
| `lib/judge.js` | Server-side fuzzy judge (LLM); key stays server-side |
| `server.js` | Routes, retired-theme 301s, `POST /api/rarity/judge` |
| `public/rarity.css` | Page styles for hub/theme/archive/method |

## Adding a prompt

1. Open `data/rarity/custom-sources.mjs`.
2. Add to a theme's `prompts`:
   ```js
   {
     id: 'mu-example',
     prompt: 'Name a …',
     context: 'Wikipedia search context',
     hint: 'One line, the clarification a quizmaster would give.',
     answers: [
       { name: 'Display name', wiki: 'Canonical Wikipedia title', aliases: ['Optional alias'] }
     ]
   }
   ```
3. Use `wiki` for any title that collides with another article (`Up (2009 film)`, `Mercury (planet)`, `Georgia (U.S. state)`). Otherwise the builder resolves the plain name and follows redirects.
4. Keep at least 6 answers per prompt and at least 5 prompts per theme, or the build drops them.
5. Rebuild:
   ```powershell
   $env:NODE_USE_ENV_PROXY="1"; $env:HTTPS_PROXY="http://127.0.0.1:10009"
   node scripts/build-rarity-packs.mjs
   ```
   (Proxy vars only if Node cannot reach Wikipedia directly.)
6. Bump the cache-buster in `public/games/rarity-tower/index.html` (`game.js?v=N`) if `game.js` changed.

Tiers are computed per prompt from English Wikipedia pageviews (Dec 2024–Oct 2025), percentiles: bottom 15% Legendary, 15–35% Epic, 35–60% Rare, 60–80% Uncommon, top 20% Common. Do not hand-edit tiers in `packs.json`.

## Hints

- Each prompt's `hint` appears in-game via the **HINT -10** button.
- Rules: 10 points, once per question, disabled when score < 10, resets on the next question.
- Implementation: `state.hintUsed`, `useHint()`, `els.hintBtn` in `game.js`.
- If a prompt has no hint, the button shows “No hint for this floor.” Add real hints instead.

## LLM fuzzy judge

- Endpoint: `POST /api/rarity/judge` with `{theme, questionId, answer}`.
- Flow: local exact/alias match first; on miss, the server calls an OpenAI-compatible chat endpoint and maps the input to one canonical name from the prompt’s list. The returned name is re-validated before the client uses it.
- Env (Render → Environment; never commit):
  - `LLM_API_KEY` (required; without it the endpoint returns `{match:null}`)
  - `LLM_BASE_URL` (default `https://4sapi.com/v1`; use `https://4sapi.org/v1` for testing)
  - `LLM_MODEL` (default `deepseek-v4.1-flash`)
- Rate limit: 24 requests/minute per IP, 8s timeout, 6h result cache.
- Never put the key in `game.js`, `index.html`, `data/`, or the repo. The browser must only see `/api/rarity/judge`.

## Routes

- `/rarity-tower` hub (embeds the movies tower)
- `/rarity-tower/movies|music|games|anime`
- `/rarity-tower/prompts` full prompt archive
- `/rarity-tower/method` tier method and limitations
- `/rarity-tower/packs.json` runtime data
- Retired geography/sport/space/history theme URLs 301 to `/rarity-tower` in `server.js`.

## Visual and caching

- Floor zones: `data-zone` lobby/mid/upper/high/roof in `buildTower()`; textures in `index.html`.
- Guide line, ground shadow, goal star, pixel moon, aurora are in the same CSS block.
- `index.html` is `max-age=0, must-revalidate`; `game.js` and `rarity.css` are long-cached. Bump `?v=` after editing them.

## QA checklist

1. `node scripts/build-rarity-packs.mjs` exits 0 and prints 4 themes.
2. Open `/rarity-tower` and `/rarity-tower/movies`; both 200.
3. Play one floor: common answer → fall; legendary answer → jump.
4. HINT: costs 10, once, disabled at score < 10, resets next floor.
5. Invalid/typo answer triggers the judge; a match proceeds, a miss shows “Not in this set”.
6. Sitemap includes the four theme pages, `/prompts`, `/method`.
7. Deploy (push to `main`), wait for Render, re-check the live game.
