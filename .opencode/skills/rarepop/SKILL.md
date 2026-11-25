---
name: rarepop
description: Maintain and extend RarePop, the self-hosted pop-culture rare-answer arcade game on Play Hype Games. Use when adding prompts, answers, hints or categories, changing rarity tiers, tuning the space UI, wiring the server-side LLM judge, or deploying the game.
---

# RarePop

A self-hosted arcade game at `playhypegames.com/rarepop`. Pop-culture prompts (movies, music, games, anime), ten jumps, no timer. A correct answer moves the ship across eight rings by rarity; a wrong answer shakes the ship and shows a Void card for three seconds, then the same prompt is playable again.

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

## Hints, runs and wrong answers

- Hint button: free, once per prompt, resets next prompt. Implementation in the game's `useHint()` / `state.hintUsed`.
- Ten jumps per run, then an INTERSTELLAR VOYAGE REPORT card (total AU, rank, rarity log). No timer, no lives, no score.
- Every submit (including gibberish) plays the full COCKPIT // JUMP PREP overlay. A miss then shows a red Void card for ~3 seconds and the same prompt stays playable. Reusing an answer is allowed and lands on another planet.
- Never put hints in the client only — they live in packs so they can be edited with the questions.

## LLM fuzzy judge

- Endpoint: `POST /api/rarepop/judge` with `{theme, questionId, answer}`.
- Flow: local exact/alias match first; on miss, the server calls an OpenAI-compatible chat endpoint and maps the input to one canonical name from the prompt's list. The returned name is re-validated before the client uses it.
- Env (Render → Environment; never commit):
  - `LLM_API_KEY` (required; without it the endpoint returns `{match:null}`)
  - `LLM_BASE_URL` — the 4sapi gateway splits endpoints by network. Overseas (Render US-East) uses `https://4sapi.top/v1` (fallback `https://4sapi.com/v1`); China local dev behind a proxy can use `https://4sapi.org/v1` or `https://4stoken.com/v1`. The code's built-in default is `.com`.
  - `LLM_MODEL` (default `deepseek-v4.1-flash`; a reasoning model that accepts `response_format: {type:'json_object'}`)
- Rate limit: 24 requests/minute per IP, 3000/day global, judge 8s / lore 12s timeout, 6h judge / 24h lore result cache.
- Render env-var changes (dashboard or REST PUT) only reach the Node process on a **fresh deploy** — a plain restart is not enough; run `render deploys create <service-id> --confirm` after rotating the key.
- Never put the key in the game, page, data or repo. The browser must only see `/api/rarepop/judge`.

## Planet lore

- On a correct answer the client calls `POST /api/rarepop/lore` with `{theme, questionId, answer}`.
- The server generates a 2–3 word planet name and one-sentence description via the same LLM, cached 24h per answer; without a key it returns a local fallback.
- The client generates a planet name/description itself and shows that immediately. The lore response only replaces it when `source` is an LLM result; `source:"fallback"` responses are ignored so names stay consistent across the card, HUD and in-scene label.
- Keep the lore prompt playful and fictional; no real-world claims, no endorsements.

## Routes

- `/rarepop` game page (embeds the game)
- `/rarepop/method` tier method and limits
- `/rarepop/packs.json` runtime data
- `/game/rarepop` catalogue entry
- `/rarity-tower*` and `/assets/games/rarity-tower*` are deleted and 301 to `/rarepop*`.

## Visual

Cockpit framing around the same solar-system scene: steel viewport border, corner brackets, scanlines, side instrument rails (fuel/plasma/shield gauges), and a riveted bottom console with jump progress + fuel meters.
- Boot: `#boot` pre-flight card with the animated Star-Navigator Fish and 5 checklist steps (`BOOT_STEPS`: charting lanes, refueling, calibrating, sealing canopy, opening hailing frequencies); packs must load before it closes, otherwise `#boot-err` shows.
- Prompts appear only inside the `#ask` INCOMING TRANSMISSION modal: a generated alien (`makeAlien`/`alienSVG`, random name/skin/eyes) asks the question; input + HINT + CONFIRM live there, not on the console.
- Eight dashed elliptical rings (NEAR 01 → VOID 08), ~62 numbered planets, central sun with rotating dashed rings, nebula blobs, starfield, grid.
- Rocket flies a quadratic Bezier with rotation and a cyan dot trail; landing plays a target bracket + particle burst and an in-scene planet label.
- COCKPIT // JUMP PREP overlay (4 steps, progress bar), right-side arrival card (red `.fail` variant for Void), HUD chips.
- End of run: INTERSTELLAR VOYAGE REPORT card with a per-rarity RARITY LOG (bars + counts/percent), jump/farthest/total/rarest stats, rank title, FLY AGAIN.
- Responsive blocks, bottom of the stylesheet in order: `max-width:860px`, `max-height:560px`, `max-height:430px`, `max-width:560px` (stacked answer row), `max-height:300px` (ultra-compact 16/9 phone iframe ~390×219: alien hidden, screws hidden, one-line ellipsis console). The sky SVG is sized via `#sky`; never use a bare `svg` selector — it would also catch the fish/alien/planet SVGs inside overlays.
- Single-file CSS/JS in `public/games/rarepop/index.html`; keep the compact rules at the bottom of the stylesheet for short viewports.

## QA checklist

1. `node scripts/build-rarity-packs.mjs` exits 0 and prints 4 themes.
2. `/rarepop` and `/rarepop/method` return 200; `/rarity-tower` returns 301.
3. Boot first: the fish pre-flight card runs its 5 steps, then the alien transmission modal opens with a question; no question UI is visible before boot finishes.
4. Play one prompt: a correct answer runs the 4-step overlay, Bezier flight and arrival card; HUD TOTAL/JUMPS update and the planet stays lit.
5. Gibberish runs the same overlay, then the red Void card (~3s) with no jump counted; the same prompt remains and the input is cleared and re-enabled.
6. HINT is free, works once per prompt at any score, greys out until the next prompt.
7. Typo triggers the judge; a match proceeds as a normal jump, a miss shows the Void card.
8. Ten jumps show the INTERSTELLAR VOYAGE REPORT with rarity-log bars; FLY AGAIN rebuilds the system and resets to 0.
9. Check 1280×720, 390×844 and 390×219 (real 16/9 iframe height) with no horizontal scroll; at 390×219 the transmission modal fits without inner scrolling and console text is not clipped.
10. Confirm the fish, alien and arrival-card planet SVGs actually render (regression: a bare `svg{position:absolute}` rule hid all three).
11. Sitemap includes `/rarepop` and `/rarepop/method` only.
12. Deploy (push to `main`), wait for Render, re-check the live game.
