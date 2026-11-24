/* Rarity Tower — pixel climbing trivia.
   Data: /rarity-tower/packs.json, served from data/rarity/packs.json. */
(function () {
  'use strict';

  var TIER_ORDER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
  var TIER_LABEL = { common: 'COMMON', uncommon: 'UNCOMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY' };
  var TIER_EMOJI = { common: '⬜', uncommon: '🟩', rare: '🟦', epic: '🟪', legendary: '🟨', fail: '⬛' };
  var FLOOR_NAMES = ['LOBBY', 'ALLEY', 'PIPES', 'SERVERS', 'ANTENNA', 'CLOUD', 'ORBIT', 'ROOF'];
  var TIME_LIMIT = 35;
  var STORE_BEST = 'rt_best_';
  var STORE_MUTE = 'rt_mute';

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    app: $('app'), stage: $('stage'), sky: $('sky'), world: $('world'), tower: $('tower'),
    player: $('player'), splat: $('splat'),
    hudTheme: $('hudTheme'), hudFloor: $('hudFloor'), hudTotal: $('hudTotal'), hudScore: $('hudScore'),
    muteBtn: $('muteBtn'), fsBtn: $('fsBtn'),
    needBox: $('needBox'), timerWrap: $('timerWrap'), timerBar: $('timerBar'),
    prompt: $('prompt'), hint: $('hint'), reveal: $('reveal'),
    form: $('answerForm'), input: $('answer'), jumpBtn: $('jumpBtn'), suggest: $('suggest'),
    intro: $('intro'), introBadge: $('introBadge'), introTag: $('introTag'), introFloors: $('introFloors'),
    introLadder: $('introLadder'), introThemes: $('introThemes'), introNote: $('introNote'),
    startBtn: $('startBtn'), practiceBtn: $('practiceBtn'),
    result: $('result'), resBadge: $('resBadge'), resTitle: $('resTitle'), resMeta: $('resMeta'),
    resGrid: $('resGrid'), resKiller: $('resKiller'), resScore: $('resScore'),
    retryBtn: $('retryBtn'), shareBtn: $('shareBtn'), resThemes: $('resThemes'), resNote: $('resNote')
  };

  var packs = null;
  var theme = null;
  var state = null;
  var layout = { fh: 66, stageH: 300, n: 7 };
  var audio = null;
  var muted = localStorage.getItem(STORE_MUTE) === '1';
  var raf = null;
  var lastTick = 0;

  /* ---------- utils ---------- */

  function norm(s) {
    return String(s || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function dayNumber() {
    var now = new Date();
    var utc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return Math.floor((utc - Date.UTC(2026, 0, 1)) / 86400000) + 1;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function shuffled(arr, seed) {
    var r = mulberry32(seed), a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ---------- sound ---------- */

  function ac() {
    if (muted) return null;
    if (!audio) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audio = new Ctx();
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }

  function beep(freq, dur, type, vol, delay) {
    var a = ac();
    if (!a) return;
    var t0 = a.currentTime + (delay || 0);
    var o = a.createOscillator();
    var g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol == null ? 0.06 : vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  var sfx = {
    start: function () { beep(392, 0.08, 'square', 0.05); beep(523, 0.1, 'square', 0.05, 0.09); },
    jump: function (tier) {
      var base = 420 + (TIER_ORDER[tier] || 0) * 70;
      beep(base, 0.07, 'square', 0.05);
      beep(base * 1.5, 0.1, 'square', 0.045, 0.06);
    },
    invalid: function () { beep(150, 0.09, 'sawtooth', 0.04); },
    tick: function () { beep(880, 0.03, 'square', 0.025); },
    fail: function () {
      beep(300, 0.12, 'sawtooth', 0.05);
      beep(190, 0.18, 'sawtooth', 0.05, 0.1);
      beep(90, 0.34, 'sawtooth', 0.06, 0.22);
    },
    win: function () {
      [523, 659, 784, 1046].forEach(function (f, i) { beep(f, 0.12, 'square', 0.05, i * 0.1); });
    }
  };

  /* ---------- layout ---------- */

  function computeLayout() {
    var n = state ? state.questions.length : 7;
    var stageH = els.stage.clientHeight || 300;
    var fh = clamp(Math.round((stageH - 26) / 3.4), 44, 76);
    layout = { fh: fh, stageH: stageH, n: n };
    document.documentElement.style.setProperty('--fh', fh + 'px');
    if (state) {
      positionFloors();
      updateCamera(true);
      els.player.style.setProperty('--py', playerY(state.floor) + 'px');
    }
  }

  function playerY(floor) {
    return (floor - 1) * layout.fh + 13;
  }

  function positionFloors() {
    var n = layout.n;
    for (var k = 1; k <= n + 1; k++) {
      var el = els.tower.querySelector('[data-k="' + k + '"]');
      if (el) el.style.bottom = ((k - 1) * layout.fh) + 'px';
    }
    els.tower.style.height = (n * layout.fh + 120) + 'px';
  }

  function updateCamera(instant) {
    if (!state) return;
    var py = playerY(state.floor) + 13;
    var maxT = Math.max(0, layout.n * layout.fh + 90 - layout.stageH);
    var t = clamp(py - layout.stageH * 0.46, 0, maxT);
    var prev = els.world.style.transition;
    if (instant) els.world.style.transition = 'none';
    els.world.style.transform = 'translateY(' + Math.round(t) + 'px)';
    if (instant) {
      void els.world.offsetHeight;
      els.world.style.transition = prev || '';
    }
  }

  /* ---------- tower ---------- */

  function buildTower() {
    var n = layout.n;
    var html = '<div class="ground"></div>';
    for (var k = 1; k <= n; k++) {
      html += '<div class="floor" data-k="' + k + '">' +
        '<span class="name">' + (FLOOR_NAMES[k - 1] || ('FLOOR ' + k)) + '</span>' +
        '<span class="tag">' + String(k).padStart(2, '0') + '</span>' +
        '<span class="slab"></span></div>';
    }
    html += '<div class="floor roof" data-k="' + (n + 1) + '">' +
      '<span class="name">ROOF</span><span class="tag">GOAL</span><span class="slab"></span></div>';
    els.tower.innerHTML = html;
    positionFloors();
    els.hudTotal.textContent = n;
  }

  function setFloorVisual(k, cls) {
    var el = els.tower.querySelector('[data-k="' + k + '"]');
    if (!el) return;
    el.classList.remove('is-current', 'is-cleared', 'is-collapsed');
    if (cls) el.classList.add(cls);
  }

  function stars() {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 42; i++) {
      var s = document.createElement('i');
      s.className = 'star';
      s.style.left = (Math.random() * 100).toFixed(2) + '%';
      s.style.top = (Math.random() * 62).toFixed(2) + '%';
      s.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';
      s.style.opacity = (0.25 + Math.random() * 0.6).toFixed(2);
      if (i === 0) s.style.width = s.style.height = '3px';
      frag.appendChild(s);
    }
    var moon = document.createElement('div');
    moon.className = 'moon';
    frag.appendChild(moon);
    var city = document.createElement('div');
    city.className = 'city';
    frag.appendChild(city);
    els.sky.appendChild(frag);
  }

  /* ---------- game ---------- */

  function themeIndex(slug) {
    for (var i = 0; i < packs.themes.length; i++) if (packs.themes[i].slug === slug) return i;
    return 0;
  }

  function pickQuestions(practice) {
    var seed;
    if (practice) seed = (Date.now() ^ 0x9e3779b9) >>> 0;
    else seed = (dayNumber() * 7919 + themeIndex(theme.slug) * 131) >>> 0;
    return shuffled(theme.questions, seed).slice(0, 7);
  }

  function startRun(practice) {
    state = {
      practice: !!practice,
      questions: pickQuestions(practice),
      floor: 1,
      cleared: 0,
      score: 0,
      used: {},
      results: [],
      status: 'playing',
      answer: null,
      deadline: 0,
      timeLeft: TIME_LIMIT
    };
    els.intro.classList.remove('on');
    els.result.classList.remove('on');
    els.reveal.classList.remove('on');
    els.reveal.textContent = '';
    els.hudScore.textContent = '0';
    els.player.classList.remove('falling');
    els.player.classList.add('idle');
    els.player.style.setProperty('--py', playerY(1) + 'px');
    els.splat.classList.remove('on');
    buildTower();
    setFloorVisual(1, 'is-current');
    computeLayout();
    updateCamera(true);
    els.hudFloor.textContent = '1';
    sfx.start();
    askQuestion();
  }

  function askQuestion() {
    var q = state.questions[state.floor - 1];
    var need = theme.ladder[state.floor - 1];
    state.answer = null;
    state.status = 'playing';
    state.timeLeft = TIME_LIMIT;

    els.prompt.textContent = q.prompt;
    els.needBox.textContent = 'NEED: ' + TIER_LABEL[need] + '+';
    els.needBox.dataset.tier = need;
    els.reveal.classList.remove('on');
    els.reveal.textContent = '';
    els.input.value = '';
    els.input.disabled = false;
    els.jumpBtn.disabled = false;
    els.input.classList.remove('bad');
    els.suggest.classList.remove('on');
    els.hint.textContent = 'Type a country and press Enter. Wrong spelling is free — obvious answers are not.';
    els.input.focus({ preventScroll: true });
    setFloorVisual(state.floor, 'is-current');
    els.hudFloor.textContent = state.floor;

    state.deadline = performance.now() + TIME_LIMIT * 1000;
    lastTick = Math.ceil(TIME_LIMIT) + 1;
    updateTimer();
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(timerLoop);
  }

  function timerLoop(now) {
    if (!state || state.status !== 'playing') return;
    var left = Math.max(0, state.deadline - now) / 1000;
    state.timeLeft = left;
    updateTimer();
    var whole = Math.ceil(left);
    if (whole <= 5 && whole !== lastTick) {
      lastTick = whole;
      if (whole > 0) sfx.tick();
    }
    if (left <= 0) {
      fall('timeout', null);
      return;
    }
    raf = requestAnimationFrame(timerLoop);
  }

  function updateTimer() {
    var frac = clamp(state.timeLeft / TIME_LIMIT, 0, 1);
    els.timerBar.style.transform = 'scaleX(' + frac + ')';
    els.timerWrap.classList.toggle('low', state.timeLeft <= 8);
  }

  function matches(q, text) {
    var n = norm(text);
    if (!n) return null;
    for (var i = 0; i < q.answers.length; i++) {
      var a = q.answers[i];
      if (norm(a.name) === n) return a;
      if (a.aliases) {
        for (var j = 0; j < a.aliases.length; j++) if (norm(a.aliases[j]) === n) return a;
      }
    }
    return null;
  }

  function submit(text) {
    if (!state || state.status !== 'playing') return;
    var q = state.questions[state.floor - 1];
    var answer = matches(q, text);
    if (!answer) {
      els.input.classList.add('bad');
      setTimeout(function () { els.input.classList.remove('bad'); }, 320);
      els.hint.innerHTML = 'Not a valid answer here. <b>Countries only — territories do not count.</b>';
      sfx.invalid();
      return;
    }
    if (state.used[answer.code]) {
      els.input.classList.add('bad');
      setTimeout(function () { els.input.classList.remove('bad'); }, 320);
      els.hint.innerHTML = 'You already used <b>' + answer.name + '</b>. Pick a different one.';
      sfx.invalid();
      return;
    }

    var need = theme.ladder[state.floor - 1];
    if (TIER_ORDER[answer.tier] >= TIER_ORDER[need]) {
      pass(answer, need);
    } else {
      fall('too-obvious', answer, need);
    }
  }

  function pass(answer, need) {
    state.status = 'jumping';
    state.used[answer.code] = true;
    state.cleared += 1;
    state.score += answer.points;
    state.results.push(answer.tier);
    els.hudScore.textContent = state.score;
    els.input.disabled = true;
    els.jumpBtn.disabled = true;
    els.suggest.classList.remove('on');

    els.reveal.dataset.tier = answer.tier;
    els.reveal.innerHTML = '<span>' + TIER_LABEL[answer.tier] + ' · ' + answer.name + '</span>' +
      '<span class="pts">+' + answer.points + '</span>';
    els.reveal.classList.add('on');
    els.hint.innerHTML = 'Rarer than <b>' + Math.max(1, 100 - answer.share) + '%</b> of valid answers.';
    sfx.jump(answer.tier);
    sparkBurst();

    var from = state.floor;
    var to = state.floor + 1;
    setTimeout(function () {
      els.player.classList.remove('idle');
      els.player.classList.add('squash');
      setTimeout(function () { els.player.classList.remove('squash'); }, 160);
      els.player.style.setProperty('--py', playerY(to) + 'px');
      setFloorVisual(from, 'is-cleared');
      setFloorVisual(to, 'is-current');
      state.floor = to;
      els.hudFloor.textContent = Math.min(to, layout.n);
      setTimeout(function () {
        updateCamera(false);
        if (from >= layout.n) return win();
        askQuestion();
      }, 470);
    }, 620);
  }

  function fall(reason, answer, need) {
    if (!state || state.status === 'falling' || state.status === 'over') return;
    state.status = 'falling';
    if (raf) cancelAnimationFrame(raf);
    els.input.disabled = true;
    els.jumpBtn.disabled = true;
    els.suggest.classList.remove('on');
    els.timerWrap.classList.remove('low');
    els.reveal.classList.remove('on');
    els.player.classList.remove('idle');

    var k = state.floor;
    setFloorVisual(k, 'is-collapsed');
    els.stage.classList.add('shake');
    setTimeout(function () { els.stage.classList.remove('shake'); }, 460);
    sfx.fail();

    if (answer) {
      state.results.push('fail');
      els.player.style.setProperty('--py', (playerY(k) - 240) + 'px');
      els.player.classList.add('falling');
    } else {
      state.results.push('fail');
      els.player.style.setProperty('--py', (playerY(k) - 240) + 'px');
      els.player.classList.add('falling');
    }

    setTimeout(function () {
      els.splat.style.bottom = '16px';
      els.splat.style.left = '50%';
      els.splat.classList.add('on');
    }, 780);

    setTimeout(function () {
      showResult(false, {
        reason: reason,
        answer: answer,
        need: need,
        floor: k
      });
    }, 1150);
  }

  function win() {
    state.status = 'over';
    setFloorVisual(layout.n + 1, 'is-current');
    els.player.style.setProperty('--py', playerY(layout.n + 1) + 'px');
    updateCamera(false);
    sfx.win();
    setTimeout(function () { showResult(true, {}); }, 750);
  }

  /* ---------- result ---------- */

  function showResult(didWin, info) {
    if (raf) cancelAnimationFrame(raf);
    state.status = 'over';
    els.result.classList.add('on');
    var n = state.questions.length;
    var reached = didWin ? n : Math.max(0, info.floor - 1);
    var bestKey = STORE_BEST + theme.slug;
    var best = Number(localStorage.getItem(bestKey) || 0);
    var isBest = state.score > best;
    if (isBest) localStorage.setItem(bestKey, String(state.score));

    els.resBadge.textContent = didWin ? 'ROOFTOP REACHED' : 'RUN OVER';
    els.resTitle.textContent = didWin ? 'TOP FLOOR' : 'YOU FELL';
    els.resTitle.classList.toggle('win', didWin);
    els.resMeta.textContent = 'FLOOR ' + (didWin ? n : info.floor) + ' / ' + n;

    var grid = '';
    for (var i = 0; i < n; i++) {
      var r = state.results[i];
      if (r === 'fail') grid += '<i class="fail"></i>';
      else if (r) grid += '<i data-tier="' + r + '"></i>';
      else grid += '<i></i>';
    }
    els.resGrid.innerHTML = grid;

    if (didWin) {
      els.resKiller.innerHTML = 'All ' + n + ' floors cleared. The roof is real estate now.';
    } else if (info.reason === 'timeout') {
      els.resKiller.innerHTML = 'Out of time on floor <b>' + info.floor + '</b>. The slab gave way while you were thinking.';
    } else if (info.answer) {
      els.resKiller.innerHTML = '<b>' + esc(info.answer.name) + '</b> is <b>' + TIER_LABEL[info.answer.tier] +
        '</b> — this floor needed <span class="vs">' + TIER_LABEL[info.need] + '+</span>. The obvious answer is the trap.';
    } else {
      els.resKiller.innerHTML = 'The floor gave way.';
    }

    els.resScore.innerHTML =
      '<span>SCORE <b>' + state.score + '</b></span>' +
      '<span>FLOORS <b>' + reached + '/' + n + '</b></span>' +
      '<span>BEST <b>' + Math.max(best, state.score) + '</b></span>' +
      (isBest ? '<span style="color:var(--yellow)">NEW BEST</span>' : '');

    buildThemeLinks(els.resThemes, theme.slug);
    els.resNote.innerHTML = state.practice
      ? 'Practice run — the daily tower is the same for everyone.'
      : 'Daily Tower #' + dayNumber() + ' — same questions for everyone today. Practice runs are unlimited.';
    els.shareBtn.textContent = 'SHARE RESULT';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; });
  }

  /* ---------- share ---------- */

  function shareText() {
    var n = state.questions.length;
    var line = '';
    for (var i = 0; i < n; i++) {
      var r = state.results[i];
      line += r ? (r === 'fail' ? TIER_EMOJI.fail : TIER_EMOJI[r] || '⬜') : '⬛';
    }
    var won = state.results.length === n && state.results.indexOf('fail') === -1;
    var reached = state.results.filter(function (x) { return x && x !== 'fail'; }).length;
    return 'RARITY TOWER — ' + theme.name + '\n' + line + '\n' +
      (won ? 'Cleared all ' + n + ' floors' : 'Fell on floor ' + reached + '/' + n) +
      ' · ' + state.score + ' pts\n' +
      'playhypegames.com/rarity-tower/' + theme.slug;
  }

  function copyShare() {
    var text = shareText();
    function done() {
      els.shareBtn.textContent = 'COPIED!';
      setTimeout(function () { els.shareBtn.textContent = 'SHARE RESULT'; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      done();
    }
  }

  /* ---------- suggestions ---------- */

  function renderSuggestions() {
    if (!state || state.status !== 'playing') return;
    var q = state.questions[state.floor - 1];
    var v = norm(els.input.value);
    els.suggest.innerHTML = '';
    if (!v) { els.suggest.classList.remove('on'); return; }
    var starts = [], contains = [];
    for (var i = 0; i < q.answers.length; i++) {
      var a = q.answers[i];
      if (state.used[a.code]) continue;
      var n = norm(a.name);
      if (n.indexOf(v) === 0) starts.push(a);
      else if (n.indexOf(v) > 0) contains.push(a);
      else if (a.aliases) {
        for (var j = 0; j < a.aliases.length; j++) {
          var al = norm(a.aliases[j]);
          if (al.indexOf(v) === 0) { starts.push(a); break; }
          if (al.indexOf(v) > 0) { contains.push(a); break; }
        }
      }
    }
    var list = starts.concat(contains).slice(0, 6);
    if (!list.length) { els.suggest.classList.remove('on'); return; }
    list.forEach(function (a, idx) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.dataset.name = a.name;
      li.innerHTML = '<span>' + esc(a.name) + '</span><span class="iso">' + (idx === 0 ? '↵' : '') + '</span>';
      li.addEventListener('mousedown', function (e) {
        e.preventDefault();
        els.input.value = a.name;
        els.suggest.classList.remove('on');
        submit(a.name);
      });
      els.suggest.appendChild(li);
    });
    els.suggest.classList.add('on');
  }

  /* ---------- theme links ---------- */

  function buildThemeLinks(el, active) {
    el.innerHTML = '';
    packs.themes.forEach(function (t) {
      var a = document.createElement('a');
      a.href = '/rarity-tower/' + t.slug;
      a.target = '_top';
      a.textContent = t.name.toUpperCase();
      if (t.slug === active) a.className = 'on';
      el.appendChild(a);
    });
  }

  /* ---------- intro ---------- */

  function renderIntro() {
    var ladder = theme.ladder;
    els.introBadge.textContent = 'DAILY TOWER · ' + theme.name.toUpperCase() + ' · #' + dayNumber();
    els.introTag.textContent = theme.tagline;
    els.introFloors.textContent = ladder.length;
    els.introLadder.innerHTML = ladder.map(function (t, i) {
      return '<span data-tier="' + t + '" title="Floor ' + (i + 1) + ' needs ' + TIER_LABEL[t] + '+">' +
        TIER_LABEL[t].charAt(0) + '</span>';
    }).join('');
    els.startBtn.textContent = 'START DAILY TOWER';
    els.hudTheme.textContent = theme.name;
    buildThemeLinks(els.introThemes, theme.slug);
    var best = Number(localStorage.getItem(STORE_BEST + theme.slug) || 0);
    els.introNote.innerHTML = 'Tiers come from English Wikipedia pageviews (Dec 2024 – Oct 2025), ranked inside each question\'s valid answers — a public familiarity proxy, not a live poll. ' +
      (best ? 'Your best on this tower: <b style="color:var(--yellow)">' + best + ' pts</b>. ' : '') +
      '<a href="/rarity-tower/method" target="_top">How the tiers work →</a>';
  }

  /* ---------- effects ---------- */

  function sparkBurst() {
    var y = playerY(state.floor);
    for (var i = 0; i < 6; i++) {
      var s = document.createElement('i');
      s.className = 'spark';
      s.style.left = (50 + (Math.random() * 12 - 6)) + '%';
      s.style.bottom = (y + 8) + 'px';
      s.style.background = i % 2 ? '#ffd166' : '#22d3ee';
      els.world.appendChild(s);
      (function (el) { setTimeout(function () { el.remove(); }, 650); })(s);
    }
  }

  /* ---------- boot ---------- */

  function bind() {
    els.form.addEventListener('submit', function (e) {
      e.preventDefault();
      submit(els.input.value);
    });
    els.input.addEventListener('input', renderSuggestions);
    els.input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') els.suggest.classList.remove('on');
    });
    els.startBtn.addEventListener('click', function () { startRun(false); });
    els.practiceBtn.addEventListener('click', function () { startRun(true); });
    els.retryBtn.addEventListener('click', function () { startRun(state ? state.practice : false); });
    els.shareBtn.addEventListener('click', copyShare);
    els.muteBtn.addEventListener('click', function () {
      muted = !muted;
      localStorage.setItem(STORE_MUTE, muted ? '1' : '0');
      els.muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
      els.muteBtn.textContent = muted ? 'MUTE' : 'SND';
    });
    els.fsBtn.addEventListener('click', function () {
      if (!document.fullscreenElement) {
        (document.documentElement.requestFullscreen || function () {}).call(document.documentElement);
      } else {
        (document.exitFullscreen || function () {}).call(document);
      }
    });
    window.addEventListener('resize', computeLayout);
    var hiddenAt = 0;
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        hiddenAt = performance.now();
      } else if (hiddenAt && state && state.status === 'playing') {
        state.deadline += performance.now() - hiddenAt;
        hiddenAt = 0;
      }
    });
  }

  async function boot() {
    els.muteBtn.textContent = muted ? 'MUTE' : 'SND';
    els.muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    stars();
    bind();

    var params = new URLSearchParams(location.search);
    var slug = params.get('theme') || 'world';
    try {
      var res = await fetch('/rarity-tower/packs.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      packs = await res.json();
    } catch (e) {
      els.prompt.textContent = 'Could not load the tower data.';
      els.hint.textContent = 'Refresh the page, or open the game page again.';
      return;
    }
    theme = packs.themes.filter(function (t) { return t.slug === slug; })[0] || packs.themes[0];
    state = { questions: theme.questions, floor: 1, cleared: 0, score: 0, used: {}, results: [], status: 'intro' };
    layout.n = theme.questions.length;
    buildTower();
    computeLayout();
    renderIntro();
    els.hudFloor.textContent = '1';
    els.hudTotal.textContent = theme.ladder.length;
    els.needBox.textContent = 'NEED: ' + TIER_LABEL[theme.ladder[0]] + '+';
    els.needBox.dataset.tier = theme.ladder[0];
  }

  boot();
})();
