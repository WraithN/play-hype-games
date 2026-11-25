---
name: rarepop
description: Maintain and extend RarePop, the self-hosted pop-culture rare-answer arcade game on Play Hype Games. Use when adding prompts, answers, hints or categories, changing rarity tiers, tuning the space UI, wiring the server-side LLM judge, or deploying the game.
---

# RarePop

A self-hosted arcade game at `playhypegames.com/rarepop`. Pop-culture prompts (movies, music, games, anime), three lives, 40 seconds per prompt. A correct answer scores by rarity and moves the ship 1–5 rings out; a wrong answer or timeout costs a life.

## Files

| Path | Role |
| --- | --- |
| `data/rarity/custom-sources.mjs` | Prompts, closed answer lists, aliases, per-prompt hints |
| `scripts/build-rarity-packs.mjs` | Builds `data/rarity/packs.json` from sources + Wikipedia pageviews |
| `data/rarity/packs.json` | Runtime data; served at `/rarepop/packs.json` |
| `public/games/rarepop/index.html` | Game shell, CSS, engine (single file) |
| `lib/rarepop.js` | RarePop page, method page, sitemap entries |
| `lib/judge.js` | Server-side fuzzy judge (LLM); key stays server-side |
| `server.js` | `/rarepop`, `/rarepop/method`, `/rarepop/packs.json`, `POST /api/rarepop/judge`, retired `/rarity-tower*` 301s |
| `public/rarepop.css` | Shared page styles |

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
6. The game is a single HTML file with `must-revalidate`; no cache-buster bump needed. Bump `public/rarepop.css?v=` if that file changes.

Tiers are computed per prompt from English Wikipedia pageviews (Dec 2024–Oct 2025), percentiles: bottom 15% Legendary, 15–35% Epic, 35–60% Rare, 60–80% Uncommon, top 20% Common. Do not hand-edit tiers in `packs.json`.

## Hints and lives

- Hint button: 10 points, once per prompt, always available (cost floors at 0), resets next prompt. Implementation in the game's `useHint()` / `state.hintUsed`.
- Three lives. A wrong answer or a 40-second timeout costs one. Reusing an answer is rejected but free.
- Never put hints in the client only — they live in packs so they can be edited with the questions.

## LLM fuzzy judge

- Endpoint: `POST /api/rarepop/judge` with `{theme, questionId, answer}`.
- Flow: local exact/alias match first; on miss, the server calls an OpenAI-compatible chat endpoint and maps the input to one canonical name from the prompt's list. The returned name is re-validated before the client uses it.
- Env (Render → Environment; never commit):
  - `LLM_API_KEY` (required; without it the endpoint returns `{match:null}`)
  - `LLM_BASE_URL` (default `https://4sapi.com/v1`; use `https://4sapi.org/v1` for testing)
  - `LLM_MODEL` (default `deepseek-v4.1-flash`; the gateway has no `deepseek-chat`)
- Rate limit: 24 requests/minute per IP, 3000/day global, 8s timeout, 6h result cache.
- Never put the key in the game, page, data or repo. The browser must only see `/api/rarepop/judge`.

## Planet lore

- On a correct answer the client calls `POST /api/rarepop/lore` with `{theme, questionId, answer}`.
- The server generates a 2–3 word planet name and one-sentence description via the same LLM, cached 24h per answer; without a key it returns a local fallback.
- The card shows the fallback immediately after the jump animation, then swaps in the AI text when it arrives.
- Keep the lore prompt playful and fictional; no real-world claims, no endorsements.

## Routes

- `/rarepop` game page (embeds the game)
- `/rarepop/method` tier method and limits
- `/rarepop/packs.json` runtime data
- `/game/rarepop` catalogue entry
- `/rarity-tower*` and `/assets/games/rarity-tower*` are deleted and 301 to `/rarepop*`.

## Visual

- SVG elliptical rings, planets, sun glow, starfield, ship with trail, arrival card, HUD chips, 16:9 layout.
- Single-file CSS/JS in `public/games/rarepop/index.html`; keep the compact rules at the bottom of the stylesheet for short viewports.

## QA checklist

1. `node scripts/build-rarity-packs.mjs` exits 0 and prints 4 themes.
2. `/rarepop` and `/rarepop/method` return 200; `/rarity-tower` returns 301.
3. Play one prompt: correct answer jumps a ring; wrong answer loses a life.
4. HINT costs 10, once, disabled at score < 10, resets next prompt.
5. Typo triggers the judge; a match proceeds, a miss costs a life.
6. Sitemap includes `/rarepop` and `/rarepop/method` only.
7. Deploy (push to `main`), wait for Render, re-check the live game.
