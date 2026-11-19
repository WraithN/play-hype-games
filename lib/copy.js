/* ============================================================
   站点文案层
   - 分类页 / 列表页的常青介绍（被抓取、也给 AdSense 看）
   - 游戏详情页的结构化说明（模板化但按品类区分，避免整站雷同）
   所有文案事实保守，不声称未验证的数据。
   ============================================================ */

const CATEGORY_INTROS = {
  'io-games': {
    title: 'About .io games',
    paras: [
      'A .io game is the shortest path from a link to actual play. There is nothing to install, no launcher, no account — the page loads, and within a couple of seconds you are moving around a shared arena with everyone else who opened it at the same time.',
      'Most titles in this genre follow the same loop: you start small, collect whatever the map offers, grow, and try to stay alive while bigger players hunt you. A round can last thirty seconds or thirty minutes, and losing costs you nothing except the progress you just made.',
      'That short loop is why .io games are so easy to come back to. Matches do not ask for a commitment, so they fit into a gap between classes, a commute, or a queue.',
      'We do not list every .io title we find. Games are dropped when they stop loading reliably, when a server sits empty for long stretches, or when the build has not been touched in over a year. What stays is the set that still works today on a normal laptop browser.'
    ],
    bullets: [
      'Pick a room with players still joining if you want a fair start.',
      'Growth beats aggression early — a bigger body survives more mistakes.',
      'If a title feels dead, try its newest server; older rooms empty out over time.'
    ]
  },
  'idle-games': {
    title: 'About idle games',
    paras: [
      'Idle games — also called clickers or incremental games — are built on one idea: progress continues while you are not looking. You buy a mine, a farm or a factory, it earns on a timer, and you spend that income on the next upgrade.',
      'The interesting part is not the clicking. It is the curve. Good idle games keep the next upgrade just barely out of reach, so there is always one more thing to buy before you close the tab. Bad ones flatten out and turn into a spreadsheet.',
      'Because they reward checking in rather than constant attention, idle games work well in the background. Start one, leave it running in a second tab, and come back when the counter has moved.',
      'The category is deliberately mixed: short clickers you can finish in an evening sit next to longer builders that take weeks of check-ins. If you are new to the genre, start with something that shows visible movement within the first two minutes — it makes the upgrade loop easier to read.'
    ],
    bullets: [
      'Upgrade the income source first, the multiplier second.',
      'Prestige systems reset your progress on purpose — they are usually worth it.',
      'If progress stalls for more than a day, you likely missed a mechanic, not a purchase.'
    ]
  },
  'action-games': {
    title: 'About browser action games',
    paras: [
      'Action games on the web are arcade games first: short levels, tight controls, and a scoring loop you can repeat without loading screens.',
      'These titles are built for keyboard and mouse, not for a controller. That keeps the input latency low and means the game reacts the moment you press a key — which matters more here than raw visual fidelity.',
      'Most rounds run under five minutes, so they suit a quick break rather than a long session. Difficulty usually ramps within a single run, which makes early deaths part of the design.',
      'A note on what gets listed: many browser action games are re-releases of arcade formulas that have existed for decades. That is not a problem — the originals were good — but we avoid titles that are visibly unfinished, that ship without a control explanation, or that hide the actual game behind a paywall prompt.'
    ],
    bullets: [
      'Learn the first thirty seconds of a level before chasing a high score.',
      'Keyboard input is usually more precise than touch on these titles.',
      'Check the in-game control overlay — schemes differ between games.'
    ]
  },
  'strategy-games': {
    title: 'About browser strategy games',
    paras: [
      'Strategy games ask you to plan before you act: place buildings, manage a resource chain, defend a line, or out-position an opponent who is doing the same thing on the other side of the map.',
      'Browser strategy titles tend to be lighter than their desktop counterparts — smaller maps, shorter tech trees, sessions measured in minutes rather than hours. That makes them readable in one sitting, which is the point.',
      'The skill ceiling is usually in the opening. A good start compounds; a bad one is hard to recover from, so the first two minutes decide most matches.',
      'We favour titles that explain their own rules without a tutorial wall. If a strategy game needs ten minutes of reading before the first meaningful decision, it usually does not belong on this list — browser strategy works best when the first choice arrives fast.'
    ],
    bullets: [
      'Secure income before you build defenses — an undefended economy still loses.',
      'Watch what the opponent invests in; scouting is cheaper than guessing.',
      'Long sessions are rare here; plan for ten to twenty minute runs.'
    ]
  },
  '2-player-games': {
    title: 'About 2 player games',
    paras: [
      'Two-player games here are played on one device: one keyboard, one screen, two people. No lobby, no invites, no accounts — you sit down and start.',
      'That constraint shapes the design. Controls are split across opposite sides of the keyboard, turns are short, and rounds end fast enough that losing does not feel like a commitment.',
      'They are the easiest category to pick up with someone who does not usually play games, because the rules have to fit on one screen.',
      'Every title here is checked on a single standard keyboard, since two players sharing a layout is the whole point. Games that need two mice, two controllers or a touchscreen are not included, however good they are elsewhere.'
    ],
    bullets: [
      'Check which side of the keyboard each player uses before you start.',
      'Short rounds mean rematches are cheap — play best of five.',
      'Most titles work better on a laptop keyboard than on a touchscreen.'
    ]
  },
  'chromebook-games': {
    title: 'About Chromebook games',
    paras: [
      'A Chromebook runs ChromeOS, which means the browser is the operating system. Nothing can be installed, local storage is small, and the machine runs on integrated graphics.',
      'Every game on this site is a browser build, so every one of them runs on a Chromebook. This page collects the full catalogue under a single entry point for people who search for it — most of that traffic comes from school-issued laptops.',
      'The limits sit in the device rather than in the games: a dozen open tabs will exhaust the memory pool, and school-managed machines filter traffic at the network level, which can block an embed host even when the title itself is fine.',
      'Games stream from their publisher instead of downloading an asset package, so load times stay short and nothing accumulates locally.'
    ],
    bullets: [
      'If a game stutters, close other tabs — Chromebooks share one small pool of memory across everything.',
      'Keyboard and trackpad both work here; there are no touch-only control schemes in this catalogue.',
      'Managed devices may block some embed hosts — that is a network policy, not a broken game.'
    ]
  }
};

const LIST_INTROS = {
  '/new': {
    title: 'How we track new releases',
    paras: [
      'This page is the raw feed: every title we have indexed, newest first, with no editorial filtering. It exists because the fastest way to find a playable browser game is to look at what shipped in the last few days, not at a list that was curated six months ago.',
      'We check distribution catalogues and publisher feeds, then publish a page for each game once we can confirm it actually loads and is playable without an install. Titles that fail that check do not go live.'
    ]
  },
  '/trending': {
    title: 'What trending means here',
    paras: [
      'Trending is ordered by an internal heat score, not by raw lifetime views. A game that everyone played last year but nobody opens today should not sit at the top of a page called "trending", so older titles decay while recent activity counts for more.',
      'The ranking is recalculated as play data comes in, which means this page can look different week to week. If a title jumps, it is because people are actually opening it.'
    ]
  },
  '/categories': {
    title: 'How the catalogue is organised',
    paras: [
      'Every game gets exactly one primary category so the catalogue stays navigable, plus any number of tags for cross-cutting attributes like "clicker", "survival" or "racing".',
      'Categories answer "what kind of game is this", tags answer "what is it about". If you are browsing rather than searching, start with a category and use the tag chips on a game page to move sideways.'
    ]
  }
};

/* 游戏详情页：按品类生成结构化说明，避免整站同一段话 */
const GAME_SECTIONS = {
  'io-games': (g) => [
    {
      h: `How to play ${g.title}`,
      paras: [
        `${g.title} runs entirely in the browser. Open this page, press play, and the match starts loading — there is no download step and no account to create.`,
        'Movement is usually WASD or the arrow keys, with the mouse handling direction or aiming. Exact bindings are shown on the in-game overlay during the first few seconds, so watch for it before you commit to a strategy.',
        'Rounds are drop-in: you can leave at any time and rejoin a fresh server later without losing anything permanent.'
      ],
      bullets: [
        'Start by collecting rather than fighting — early growth is the safest investment.',
        'Keep an escape route; getting boxed in is the most common way to lose.',
        'If the server feels crowded, wait for a reset instead of fighting uphill.'
      ]
    }
  ],
  'idle-games': (g) => [
    {
      h: `How ${g.title} works`,
      paras: [
        `${g.title} is an incremental game: you invest in production, production generates income, and income buys the next tier of upgrades. Nothing here needs fast reflexes.`,
        'The loop is built to run in the background. Start it, leave the tab open, and return when the counter has moved enough to afford something meaningful.',
        'Most idle games gate progress behind a milestone rather than a timer, so if the numbers stop moving it usually means a system has not been unlocked yet.'
      ],
      bullets: [
        'Buy the cheapest upgrade that increases income per second first.',
        'Save for multipliers instead of spreading purchases thin.',
        'Check back after a few minutes rather than clicking constantly.'
      ]
    }
  ],
  'action-games': (g) => [
    {
      h: `How to play ${g.title}`,
      paras: [
        `${g.title} is an arcade-style action game built for keyboard input. It loads in the browser and starts without a menu detour.`,
        'Controls are keyboard-first — arrows or WASD to move, with one or two action keys. Because the game runs on web input, response is immediate; there is no controller pairing step.',
        'Levels are short by design. Dying is expected on a first run, and the difficulty curve is usually tuned so that a second attempt feels noticeably easier.'
      ],
      bullets: [
        'Learn the level layout on a throwaway run before chasing a score.',
        'Keep moving — standing still is usually the fastest way to take damage.',
        'If input feels delayed, close other tabs; browser games are sensitive to CPU load.'
      ]
    }
  ],
  'strategy-games': (g) => [
    {
      h: `How to play ${g.title}`,
      paras: [
        `${g.title} is a browser strategy game: you build, manage and defend against an opposing side, all inside one web session.`,
        'The opening matters most. Establishing income early compounds into everything else, while an early defenses-first approach tends to leave you behind on resources.',
        'Sessions are shorter than desktop strategy games, so the tech tree is compressed and decisions arrive quickly. Expect a full run to take minutes, not hours.'
      ],
      bullets: [
        'Build economy before walls — defense without income stalls out.',
        'Scout before committing; information is cheaper than a rebuild.',
        'Keep one reserve for emergencies rather than spending to zero.'
      ]
    }
  ],
  '2-player-games': (g) => [
    {
      h: `How to play ${g.title} with two players`,
      paras: [
        `${g.title} is played locally by two people on one keyboard. No lobby, no invitations — both players just need to be at the same device.`,
        'Controls are split across the keyboard, typically one side for each player. Check the on-screen control hint before the first round so nobody is guessing mid-match.',
        'Rounds are deliberately short, which makes rematches easy and keeps the score close.'
      ],
      bullets: [
        'Agree on best-of-five before starting so rounds stay meaningful.',
        'A laptop keyboard is more comfortable than a touchscreen for this layout.',
        'Short rounds favour aggressive play — passivity rarely pays off.'
      ]
    }
  ],
  'chromebook-games': (g) => [
    {
      h: `Playing ${g.title} on a Chromebook`,
      paras: [
        `${g.title} is a browser build, which is exactly what a Chromebook needs: nothing to install, no storage cost, and no dependency on a dedicated graphics card.`,
        'Load times are short because the game streams from its publisher rather than downloading an asset package first. Once it is running, an integrated GPU is enough.',
        'School-managed devices may restrict some embed hosts at the network level. If a page refuses to load while other games work, that is usually a policy block rather than a broken title.'
      ],
      bullets: [
        'Close extra tabs before playing — Chromebooks share memory across everything.',
        'Keyboard controls work out of the box; a mouse is optional.',
        'Low-power mode may throttle frame rate; plug in if a game feels choppy.'
      ]
    }
  ]
};

const CATEGORY_FAQ = {
  'io-games': [
    {
      q: 'Do .io games need a download or install?',
      a: 'No. Every title here runs inside the browser tab. There is no installer, no launcher and no update step — closing the tab is the only uninstall you will ever need.'
    },
    {
      q: 'Can I play .io games on a school Chromebook?',
      a: 'Usually yes, as long as the network allows the embed host. The games are light web builds, so an integrated GPU is enough. A managed device may block the host itself, which no game setting can override.'
    },
    {
      q: 'Why do some .io servers feel empty?',
      a: 'Rooms empty out over time. A title that was busy last year may now have a handful of players. We keep the page up only while the game still loads and is playable, not while it is popular.'
    }
  ],
  'idle-games': [
    {
      q: 'Do idle games keep running when I close the tab?',
      a: 'Most calculate offline progress when you return, rather than running in the background. Closing the tab is usually safe; the game credits the elapsed time on your next visit.'
    },
    {
      q: 'Are idle games actually playable without paying?',
      a: 'The titles listed here are free to start. Some offer optional speed-ups, but none require payment to reach the next upgrade tier — if one does, it does not belong in this category.'
    },
    {
      q: 'How long does a typical idle game last?',
      a: 'Short clickers wrap up in a session or two. Longer builders run for weeks of short check-ins, especially once a prestige loop resets your progress on purpose.'
    }
  ],
  'action-games': [
    {
      q: 'What controls do browser action games use?',
      a: 'Keyboard first: arrows or WASD to move, plus one or two action keys. Mouse support varies by title. The exact scheme is shown on screen when the game starts, so check it before your first run.'
    },
    {
      q: 'Why do browser action games feel harder than desktop ones?',
      a: 'They are tuned for short sessions, so difficulty ramps faster than a console game would allow. Dying early is part of the design, not a sign that you are playing it wrong.'
    },
    {
      q: 'Do these games work on a phone?',
      a: 'Some do, but keyboard titles are noticeably better on a laptop. Touch controls add input lag and most of these games were built around a physical key layout.'
    }
  ],
  'strategy-games': [
    {
      q: 'How long does one browser strategy match take?',
      a: 'Typically ten to twenty minutes. The tech trees are compressed compared with desktop strategy games, so decisions arrive quickly and a full run fits into a single sitting.'
    },
    {
      q: 'Do I need experience with strategy games to start?',
      a: 'No. The titles here explain their rules on screen within the first minute. If a game needs a long tutorial before the first real decision, it usually does not make this list.'
    },
    {
      q: 'Is there any multiplayer in this category?',
      a: 'Some titles include a skirmish mode against an AI opponent, and a few support local two-player. Online matchmaking is rare because browser strategy sessions are short.'
    },
    {
      q: 'Do these games save my progress between sessions?',
      a: 'Most keep a save in the browser itself rather than on a server. Clearing site data or switching devices will usually reset a run, so finish a session before you clear your browser.'
    }
  ],
  '2-player-games': [
    {
      q: 'Can two people play on one keyboard?',
      a: 'Yes — that is the entire format here. Controls are split across opposite halves of the keyboard, so both players use the same device with no extra hardware.'
    },
    {
      q: 'Do 2 player games need a controller?',
      a: 'No. A standard keyboard is enough, and most titles are easier to read on a laptop screen than on a phone. Controllers are not supported by the majority of these builds.'
    },
    {
      q: 'What is a fair way to decide a winner?',
      a: 'Best of five works well. Rounds are short by design, so a series keeps the score meaningful without turning one match into an endurance test.'
    },
    {
      q: 'Can two players use a tablet instead of a keyboard?',
      a: 'No. These builds map controls to physical key positions on opposite sides of the layout, and a touchscreen has no equivalent. Two people on one tablet would also fight over the same on-screen controls.'
    }
  ],
  'chromebook-games': [
    {
      q: 'Why do some games not load on a school Chromebook?',
      a: 'Managed devices filter network traffic, so an embed host can be blocked even when the game itself is fine. If other titles load but one does not, the block is usually at the host level.'
    },
    {
      q: 'Do these games work offline?',
      a: 'No. They stream from the publisher, which is what keeps them small. An offline mode would require downloading assets locally, and that is exactly what this category avoids.'
    },
    {
      q: 'Will playing games slow down my Chromebook?',
      a: 'A single browser game is light. The slowdown usually comes from too many open tabs sharing memory, so close unused ones before you start.'
    },
    {
      q: 'Do these games ask for extra permissions?',
      a: 'No. They run inside a normal browser tab and should never request filesystem access, notifications or background installation. If a page does, it is not one of ours.'
    }
  ]
};

function categoryIntro(slug) {
  return CATEGORY_INTROS[slug] || null;
}

function categoryFaq(slug) {
  return CATEGORY_FAQ[slug] || null;
}

function listIntro(baseUrl) {
  const key = baseUrl.split('?')[0];
  return LIST_INTROS[key] || null;
}

function gameSections(game) {
  const fn = GAME_SECTIONS[game.category];
  if (!fn) return [];
  return fn(game);
}

module.exports = { categoryIntro, categoryFaq, listIntro, gameSections };
