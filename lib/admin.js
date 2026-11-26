'use strict';

/** 管理后台：登录页、列表、编辑、批量导入、分类、设置 */

const { esc, icon } = require('./render');
const { collectTags } = require('./store');
const { wordCount } = require('./markdown');
const feeds = require('./feeds');

function adminLayout(settings, opts) {
  const active = opts.active || '';
  const nav = [
    { href: '/admin/dashboard', label: 'Games', key: 'games' },
    { href: '/admin/game/new', label: 'Add game', key: 'add' },
    { href: '/admin/import', label: 'Bulk import', key: 'import' },
    { href: '/admin/feeds', label: 'Catalog', key: 'feeds' },
    { href: '/admin/posts', label: 'Journal', key: 'posts' },
    { href: '/admin/categories', label: 'Categories', key: 'categories' },
    { href: '/admin/tags', label: 'Tags', key: 'tags' },
    { href: '/admin/settings', label: 'Settings', key: 'settings' }
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(opts.title)} — Admin</title>
<link rel="stylesheet" href="/assets/admin.css?v=4">
</head>
<body>
<header class="adm-header">
  <div class="adm-header-inner">
    <a class="adm-brand" href="/admin/dashboard">
      <span class="adm-mark">${icon('play', 14)}</span>
      <span>${esc(settings.siteName)}</span>
      <em>admin</em>
    </a>
    <nav class="adm-nav">
      ${nav
        .map((n) => `<a href="${n.href}" class="adm-nav-item${active === n.key ? ' is-active' : ''}">${esc(n.label)}</a>`)
        .join('')}
    </nav>
    <div class="adm-header-actions">
      <a href="/" target="_blank" class="adm-btn adm-btn-ghost">View site</a>
      <button class="adm-btn adm-btn-ghost" onclick="logout()">Log out</button>
    </div>
  </div>
</header>
<main class="adm-main">
${opts.body}
</main>
<script>
async function logout(){
  await fetch('/api/admin/logout',{method:'POST'});
  location.href='/admin';
}
${opts.script || ''}
</script>
</body>
</html>`;
}

/* ---------------- 登录 ---------------- */

function loginPage(settings, error) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Sign in — ${esc(settings.siteName)} Admin</title>
<link rel="stylesheet" href="/assets/admin.css?v=4">
</head>
<body class="adm-login-body">
<form class="adm-login" method="POST" action="/api/admin/login">
  <div class="adm-login-brand">
    <span class="adm-mark">${icon('play', 16)}</span>
    <div>
      <strong>${esc(settings.siteName)}</strong>
      <span>Content admin</span>
    </div>
  </div>
  <label>Username
    <input type="text" name="username" autocomplete="username" autofocus required placeholder="Enter admin username">
  </label>
  <label>Password
    <input type="password" name="password" autocomplete="current-password" required placeholder="Enter admin password">
  </label>
  ${error ? `<p class="adm-error">${esc(error)}</p>` : ''}
  <button type="submit" class="adm-btn adm-btn-primary">Sign in</button>
  <p class="adm-login-hint">Credentials are managed in Settings after sign-in.</p>
</form>
</body>
</html>`;
}

/* ---------------- 列表 ---------------- */

function statusBadge(status) {
  return status === 'published'
    ? '<span class="badge badge-live">Published</span>'
    : '<span class="badge badge-draft">Draft</span>';
}

function gamesTable(games, settings, params) {
  const q = (params.q || '').toLowerCase();
  const statusFilter = params.status || '';
  const catFilter = params.category || '';

  let list = games;
  if (q) {
    list = list.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.slug.includes(q) ||
        (g.tags || []).some((t) => String(t).toLowerCase().includes(q))
    );
  }
  if (statusFilter) list = list.filter((g) => g.status === statusFilter);
  if (catFilter) list = list.filter((g) => g.category === catFilter);

  list = [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const rows = list
    .map(
      (g) => `<tr>
  <td class="cell-title">
    <div class="row-title">${esc(g.title)}</div>
    ${(g.badges || []).length || g.featured ? `<div class="row-badges">${g.featured ? '<span class="adm-mini-badge adm-mb-featured">FEATURED</span>' : ''}${(g.badges || [])
      .map((b) => `<span class="adm-mini-badge adm-mb-${esc(b)}">${esc(String(b).toUpperCase())}</span>`)
      .join('')}</div>` : ''}
    <div class="row-slug">/game/${esc(g.slug)}</div>
  </td>
  <td>${esc(
        (settings.categories.find((c) => c.slug === g.category) || {}).name || g.category || '—'
      )}</td>
  <td>${esc((g.tags || []).slice(0, 3).join(', ') || '—')}</td>
  <td>${statusBadge(g.status)}</td>
  <td class="cell-num">${Number(g.views) || 0}</td>
  <td class="row-actions">
    <a class="adm-btn adm-btn-sm" href="/admin/game/${g.id}/edit">Edit</a>
    <a class="adm-btn adm-btn-sm adm-btn-ghost" href="/game/${esc(g.slug)}" target="_blank">View</a>
    <button class="adm-btn adm-btn-sm adm-btn-ghost" onclick="toggleStatus(${g.id})">${
        g.status === 'published' ? 'Unpublish' : 'Publish'
      }</button>
    <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="removeGame(${g.id})">Delete</button>
  </td>
</tr>`
    )
    .join('');

  return `${
    rows
      ? `<table class="adm-table">
    <thead><tr><th style="width:34%">Game</th><th style="width:14%">Category</th><th style="width:16%">Tags</th><th style="width:10%">Status</th><th style="width:7%">Views</th><th style="width:19%">Actions</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`
      : `<div class="adm-empty">No games match this filter. <a href="/admin/game/new">Add one</a> or try clearing the search.</div>`
  }`;
}

function dashboardPage(games, settings, params) {
  const total = games.length;
  const live = games.filter((g) => g.status === 'published').length;
  const draft = total - live;
  const tags = collectTags(games).length;

  const body = `
<div class="adm-wrap">
  <div class="adm-page-head">
    <div>
      <h1>Games</h1>
      <p>Manage every page on the site. Drafts stay invisible until you publish them.</p>
    </div>
    <div class="adm-head-actions">
      <a class="adm-btn adm-btn-primary" href="/admin/game/new">+ Add game</a>
      <a class="adm-btn" href="/admin/import">Bulk import</a>
    </div>
  </div>

  <div class="adm-stats">
    <div class="adm-stat"><span>Total games</span><strong>${total}</strong></div>
    <div class="adm-stat"><span>Published</span><strong>${live}</strong></div>
    <div class="adm-stat"><span>Drafts</span><strong>${draft}</strong></div>
    <div class="adm-stat"><span>Tags</span><strong>${tags}</strong></div>
  </div>

  <form class="adm-filters" method="GET" action="/admin/dashboard">
    <input type="search" name="q" value="${esc(params.q || '')}" placeholder="Search title, slug or tag">
    <select name="status">
      <option value="">All status</option>
      <option value="published"${params.status === 'published' ? ' selected' : ''}>Published</option>
      <option value="draft"${params.status === 'draft' ? ' selected' : ''}>Draft</option>
    </select>
    <select name="category">
      <option value="">All categories</option>
      ${settings.categories
        .map(
          (c) =>
            `<option value="${c.slug}"${params.category === c.slug ? ' selected' : ''}>${esc(c.name)}</option>`
        )
        .join('')}
    </select>
    <button class="adm-btn" type="submit">Filter</button>
    <a class="adm-btn adm-btn-ghost" href="/admin/dashboard">Reset</a>
  </form>

  ${gamesTable(games, settings, params)}
</div>`;

  return adminLayout(settings, {
    title: 'Games',
    active: 'games',
    body,
    script: `
async function toggleStatus(id){
  const res = await fetch('/api/admin/games/'+id+'/toggle',{method:'POST'});
  if(res.ok) location.reload(); else alert('Failed');
}
async function removeGame(id){
  if(!confirm('Delete this game page? This cannot be undone.')) return;
  const res = await fetch('/api/admin/games/'+id,{method:'DELETE'});
  if(res.ok) location.reload(); else alert('Failed');
}`
  });
}

/* ---------------- 新增 / 编辑 ---------------- */

function gameFormPage(game, settings, opts) {
  const isNew = !game;
  const g = game || {
    title: '',
    slug: '',
    description: '',
    content: '',
    embedUrl: '',
    thumb: '',
    category: settings.categories[0] ? settings.categories[0].slug : 'io-games',
    tags: [],
    badges: [],
    rating: '',
    heat: 0,
    source: 'GameDistribution',
    seoTitle: '',
    seoDescription: '',
    status: 'draft',
    featured: false
  };

  const body = `
<div class="adm-wrap adm-wrap-narrow">
  <div class="adm-page-head">
    <div>
      <h1>${isNew ? 'Add game' : 'Edit game'}</h1>
      <p>${isNew ? 'Paste the embed URL from GameDistribution or GamePix. The page is generated automatically.' : `/game/${esc(g.slug)}`}</p>
    </div>
    ${!isNew ? `<a class="adm-btn adm-btn-ghost" href="/game/${esc(g.slug)}" target="_blank">Preview</a>` : ''}
  </div>

  <form class="adm-form" id="game-form">
    <div class="adm-field">
      <label for="f-title">Title <em>*</em></label>
      <input id="f-title" name="title" value="${esc(g.title)}" required placeholder="Slime IO 2" oninput="syncSlug(this.value)">
      <small>The exact game name. This becomes the page title and the URL.</small>
    </div>

    <div class="adm-field">
      <label for="f-slug">URL slug</label>
      <div class="adm-slug-row">
        <span class="adm-slug-prefix">/game/</span>
        <input id="f-slug" name="slug" value="${esc(g.slug)}" placeholder="slime-io-2" oninput="this.dataset.touched=1">
      </div>
      <small>Leave empty to generate from the title. Must be unique.</small>
    </div>

    <div class="adm-field">
      <label for="f-embed">Game embed URL (iframe source) <em>*</em></label>
      <input id="f-embed" name="embedUrl" value="${esc(g.embedUrl)}" placeholder="https://html5.gamedistribution.com/xxxx/?gd_sdk_referrer_url=..." required>
      <small>Paste the iframe src, not the whole HTML tag.</small>
    </div>

    <div class="adm-grid-2">
      <div class="adm-field">
        <label for="f-category">Category</label>
        <select id="f-category" name="category">
          ${settings.categories
            .map((c) => `<option value="${c.slug}"${g.category === c.slug ? ' selected' : ''}>${esc(c.name)}</option>`)
            .join('')}
        </select>
      </div>
      <div class="adm-field">
        <label for="f-source">Source</label>
        <input id="f-source" name="source" value="${esc(g.source || '')}" list="source-list" placeholder="GameDistribution">
        <datalist id="source-list">
          <option value="GameDistribution">
          <option value="GamePix">
          <option value="CrazyGames">
          <option value="Other">
        </datalist>
      </div>
    </div>

    <div class="adm-field">
      <label for="f-tags">Tags</label>
      <input id="f-tags" name="tags" value="${esc((g.tags || []).join(', '))}" placeholder="io, unblocked, 2 player">
      <small>Comma separated. Each tag gets its own landing page at /tag/&lt;tag&gt;.</small>
    </div>

    <div class="adm-field">
      <label for="f-thumb">Thumbnail URL</label>
      <input id="f-thumb" name="thumb" value="${esc(g.thumb)}" placeholder="https://.../cover.jpg">
      <small>Optional. If empty, a generated gradient card is used.</small>
    </div>

    <div class="adm-field">
      <label for="f-heat">Heat score</label>
      <input id="f-heat" name="heat" value="${esc(g.heat != null ? g.heat : 0)}" type="number" step="1" min="0" placeholder="982">
      <small>首页与 Trending 按这个分数从高到低排序。改大就直接往前排，改小就往后掉。</small>
    </div>

    <div class="adm-field">
      <label>Card badges</label>
      <div class="adm-checks">
        <label class="adm-check"><input type="checkbox" name="badges" value="hot"${(g.badges || []).includes('hot') ? ' checked' : ''}><span>HOT — 红色火焰角标</span></label>
        <label class="adm-check"><input type="checkbox" name="badges" value="new"${(g.badges || []).includes('new') ? ' checked' : ''}><span>NEW — 绿色闪电角标</span></label>
        <label class="adm-check"><input type="checkbox" name="badges" value="original"${(g.badges || []).includes('original') ? ' checked' : ''}><span>ORIGINAL — 紫色星标，同时进 /originals 菜单</span></label>
      </div>
      <small>角标显示在卡片右上角，最多三个全选。热度下去后取消 HOT，或直接 Unpublish 下架。</small>
    </div>

    <div class="adm-field">
      <label class="adm-check-label"><input type="checkbox" name="featured" value="on"${g.featured ? ' checked' : ''}> <span>Featured — 首页首屏 "Hot right now" 推荐位（最多保留 3 款）</span></label>
      <small>勾选后固定出现在首页第一屏的大三卡区域；不勾选时该区域按热度自动取前三。</small>
    </div>

    <div class="adm-grid-2">
      <div class="adm-field">
        <label for="f-rating">Rating (0–5)</label>
        <input id="f-rating" name="rating" value="${esc(g.rating)}" placeholder="4.6" type="number" step="0.1" min="0" max="5">
      </div>
      <div class="adm-field">
        <label for="f-status">Status</label>
        <select id="f-status" name="status">
          <option value="draft"${g.status === 'draft' ? ' selected' : ''}>Draft (hidden)</option>
          <option value="published"${g.status === 'published' ? ' selected' : ''}>Published (live)</option>
        </select>
      </div>
    </div>

    <div class="adm-field">
      <label for="f-desc">Short description</label>
      <textarea id="f-desc" name="description" rows="3" placeholder="One or two sentences shown under the title and in search results.">${esc(g.description)}</textarea>
      <small>Also used as the meta description. 120–160 characters is ideal.</small>
    </div>

    <div class="adm-field">
      <label for="f-controls">Controls (optional)</label>
      <textarea id="f-controls" name="controls" rows="3" placeholder="WASD to move, mouse to aim, Space to jump.">${esc(g.controls)}</textarea>
      <small>Publisher or first-hand control notes. Shown as a Controls section, not used as an SEO claim.</small>
    </div>

    <div class="adm-field">
      <label for="f-content">Long content (HTML allowed)</label>
      <textarea id="f-content" name="content" rows="8" placeholder="&lt;h2&gt;How to play&lt;/h2&gt;&lt;p&gt;...&lt;/p&gt;">${esc(g.content)}</textarea>
      <small>Extra body copy for SEO. Use &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt; only.</small>
    </div>

    <div class="adm-grid-2">
      <div class="adm-field">
        <label for="f-seo-title">SEO title override</label>
        <input id="f-seo-title" name="seoTitle" value="${esc(g.seoTitle)}" placeholder="Slime IO 2 — Play Free Online">
      </div>
      <div class="adm-field">
        <label for="f-seo-desc">SEO description override</label>
        <input id="f-seo-desc" name="seoDescription" value="${esc(g.seoDescription)}" placeholder="Play Slime IO 2 free in your browser...">
      </div>
    </div>

    <div class="adm-form-footer">
      <button type="submit" class="adm-btn adm-btn-primary">${isNew ? 'Create game' : 'Save changes'}</button>
      <a class="adm-btn adm-btn-ghost" href="/admin/dashboard">Cancel</a>
      <span class="adm-save-note" id="save-note"></span>
    </div>
  </form>
</div>`;

  return adminLayout(settings, {
    title: isNew ? 'Add game' : 'Edit game',
    active: 'games',
    body,
    script: `
const GAME_ID = ${isNew ? 'null' : Number(g.id)};

function slugify(v){
  return String(v||'').toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70);
}
function syncSlug(title){
  const el = document.getElementById('f-slug');
  if(el.dataset.touched) return;
  el.value = slugify(title);
}

document.getElementById('game-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const form = new FormData(e.target);
  const payload = Object.fromEntries(form.entries());
  payload.tags = String(payload.tags||'').split(',').map(s=>s.trim()).filter(Boolean);
  payload.badges = form.getAll('badges');
  payload.featured = form.has('featured');

  const url = GAME_ID ? '/api/admin/games/'+GAME_ID : '/api/admin/games';
  const method = GAME_ID ? 'PUT' : 'POST';
  const note = document.getElementById('save-note');
  note.textContent = 'Saving...';

  const res = await fetch(url, {
    method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  const data = await res.json().catch(()=>({}));
  if(res.ok){
    note.textContent = 'Saved.';
    if(!GAME_ID) location.href = '/admin/game/'+data.game.id+'/edit';
  } else {
    note.textContent = data.error || 'Save failed.';
    note.style.color = '#ff6b8a';
  }
});`
  });
}

/* ---------------- 批量导入 ---------------- */

function importPage(settings, result) {
  const body = `
<div class="adm-wrap adm-wrap-narrow">
  <div class="adm-page-head">
    <div>
      <h1>Bulk import</h1>
      <p>One game per line. Paste embed URLs straight from the distribution dashboard and you get a draft page for each.</p>
    </div>
  </div>

  <div class="adm-callout">
    <strong>Format</strong>
    <code>Title | Embed URL | Category | Tags</code>
    <p>Only the first two fields are required. Category must be one of the slugs on the right. Tags are comma separated.</p>
    <p>Example: <code>Slime IO 2 | https://html5.gamedistribution.com/xxx/ | io-games | io, unblocked</code></p>
  </div>

  <form class="adm-form" id="import-form">
    <div class="adm-field">
      <label for="f-bulk">Paste rows</label>
      <textarea id="f-bulk" name="raw" rows="14" placeholder="Slime IO 2 | https://html5.gamedistribution.com/xxx/ | io-games | io, unblocked"></textarea>
    </div>
    <div class="adm-grid-2">
      <div class="adm-field">
        <label for="f-default-cat">Default category</label>
        <select id="f-default-cat" name="defaultCategory">
          ${settings.categories.map((c) => `<option value="${c.slug}">${esc(c.name)}</option>`).join('')}
          <option value="">Leave empty</option>
        </select>
      </div>
      <div class="adm-field">
        <label for="f-publish">Publish immediately</label>
        <select id="f-publish" name="publish">
          <option value="draft">No — create drafts</option>
          <option value="published">Yes — publish now</option>
        </select>
      </div>
    </div>
    <div class="adm-form-footer">
      <button type="submit" class="adm-btn adm-btn-primary">Import</button>
      <a class="adm-btn adm-btn-ghost" href="/admin/dashboard">Back to games</a>
      <span class="adm-save-note" id="import-note"></span>
    </div>
  </form>

  ${
    result
      ? `<div class="adm-callout adm-callout-success">
    <strong>Import finished</strong>
    <p>Created ${result.created} game(s), skipped ${result.skipped}, ${result.published} published.</p>
    ${
      result.errors && result.errors.length
        ? `<ul>${result.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`
        : ''
    }
  </div>`
      : ''
  }
</div>`;

  return adminLayout(settings, {
    title: 'Bulk import',
    active: 'import',
    body,
    script: `
document.getElementById('import-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const note = document.getElementById('import-note');
  note.textContent = 'Importing...';
  const payload = {
    raw: document.getElementById('f-bulk').value,
    defaultCategory: document.getElementById('f-default-cat').value,
    publish: document.getElementById('f-publish').value
  };
  const res = await fetch('/api/admin/games/import', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  const data = await res.json().catch(()=>({}));
  if(res.ok){ location.href = '/admin/import?created='+data.created+'&skipped='+data.skipped+'&errors='+encodeURIComponent((data.errors||[]).length); }
  else { note.textContent = data.error || 'Import failed.'; note.style.color = '#ff6b8a'; }
});`
  });
}

/* ---------------- 分类管理 ---------------- */

function categoriesPage(settings, games) {
  const body = `
<div class="adm-wrap adm-wrap-narrow">
  <div class="adm-page-head">
    <div>
      <h1>Categories</h1>
      <p>Each category generates a landing page at <code>/category/&lt;slug&gt;</code>.</p>
    </div>
  </div>

  <table class="adm-table">
    <thead><tr><th style="width:30%">Name</th><th style="width:26%">Slug</th><th style="width:22%">Games</th><th style="width:22%">Actions</th></tr></thead>
    <tbody>
      ${settings.categories
        .map((c) => {
          const count = games.filter((g) => g.category === c.slug).length;
          return `<tr>
        <td><input class="adm-inline-input" value="${esc(c.name)}" data-cat="${esc(c.slug)}" data-field="name"></td>
        <td><code>${esc(c.slug)}</code></td>
        <td class="cell-num">${count}</td>
        <td class="row-actions">
          <button class="adm-btn adm-btn-sm" onclick="saveCat('${esc(c.slug)}')">Save</button>
          <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="delCat('${esc(c.slug)}')">Delete</button>
        </td>
      </tr>`;
        })
        .join('')}
    </tbody>
  </table>

  <form class="adm-form adm-inline-form" onsubmit="addCat(event)">
    <div class="adm-field">
      <label>New category name</label>
      <input id="new-cat-name" placeholder="Puzzle Games" required>
    </div>
    <div class="adm-field">
      <label>Slug (optional)</label>
      <input id="new-cat-slug" placeholder="puzzle-games">
    </div>
    <button class="adm-btn adm-btn-primary" type="submit">Add category</button>
  </form>
</div>`;

  return adminLayout(settings, {
    title: 'Categories',
    active: 'categories',
    body,
    script: `
async function saveCat(slug){
  const inputs = Array.from(document.querySelectorAll('[data-cat="'+slug+'"]'));
  const payload = { slug, name: inputs.find(i=>i.dataset.field==='name').value };
  const res = await fetch('/api/admin/categories/'+encodeURIComponent(slug), {
    method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  if(res.ok) location.reload(); else alert('Failed');
}
async function delCat(slug){
  if(!confirm('Delete category "'+slug+'"? Games in it will be uncategorised.')) return;
  const res = await fetch('/api/admin/categories/'+encodeURIComponent(slug), {method:'DELETE'});
  if(res.ok) location.reload(); else alert('Failed');
}
async function addCat(e){
  e.preventDefault();
  const payload = {
    name: document.getElementById('new-cat-name').value,
    slug: document.getElementById('new-cat-slug').value
  };
  const res = await fetch('/api/admin/categories', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  if(res.ok) location.reload(); else alert('Failed');
}`
  });
}

/* ---------------- 标签一览 ---------------- */

function tagsPage(settings, games) {
  const tags = collectTags(games);
  const body = `
<div class="adm-wrap adm-wrap-narrow">
  <div class="adm-page-head">
    <div>
      <h1>Tags</h1>
      <p>Tags are created automatically from the games. Each one gets a page at <code>/tag/&lt;tag&gt;</code>.</p>
    </div>
  </div>
  ${
    tags.length
      ? `<div class="adm-tag-cloud">
      ${tags
        .map(
          (t) =>
            `<a class="adm-tag" href="/tag/${encodeURIComponent(t.slug)}" target="_blank">${esc(t.slug)} <b>${t.count}</b></a>`
        )
        .join('')}
    </div>
    <p class="adm-hint">${tags.length} tag pages. Tags with a single game add thin pages — merge or remove them from the game editor if Google starts ignoring them.</p>`
      : `<div class="adm-empty">No tags yet. Add some in the game editor.</div>`
  }
</div>`;

  return adminLayout(settings, { title: 'Tags', active: 'tags', body });
}

/* ---------------- 站点设置 ---------------- */

function settingsPage(settings) {
  const body = `
<div class="adm-wrap adm-wrap-narrow">
  <div class="adm-page-head">
    <div>
      <h1>Settings</h1>
      <p>Branding, canonical domain, analytics and AdSense. Changes apply immediately — no rebuild.</p>
    </div>
  </div>

  <form class="adm-form" id="settings-form">
    <div class="adm-grid-2">
      <div class="adm-field">
        <label for="s-name">Site name</label>
        <input id="s-name" name="siteName" value="${esc(settings.siteName)}" required>
      </div>
      <div class="adm-field">
        <label for="s-tag">Tagline</label>
        <input id="s-tag" name="tagline" value="${esc(settings.tagline)}">
      </div>
    </div>

    <div class="adm-field">
      <label for="s-domain">Canonical domain</label>
      <input id="s-domain" name="domain" value="${esc(settings.domain)}" placeholder="https://www.playhypegames.com">
      <small>Used for canonical tags, sitemap and Open Graph. No trailing slash.</small>
    </div>

    <div class="adm-field">
      <label for="s-desc">Site description</label>
      <textarea id="s-desc" name="description" rows="3">${esc(settings.description)}</textarea>
      <small>Shown on the homepage and used as the default meta description.</small>
    </div>

    <div class="adm-grid-2">
      <div class="adm-field">
        <label for="s-email">Contact email</label>
        <input id="s-email" name="contactEmail" value="${esc(settings.contactEmail)}" type="email">
      </div>
      <div class="adm-field">
        <label for="s-ads">AdSense client ID</label>
        <input id="s-ads" name="adsenseClient" value="${esc(settings.adsenseClient)}" placeholder="ca-pub-0000000000000000">
        <small>Leave empty until your account is approved.</small>
      </div>
    </div>

    <div class="adm-grid-2">
      <div class="adm-field">
        <label for="s-ga4">GA4 measurement ID</label>
        <input id="s-ga4" name="ga4Id" value="${esc(settings.ga4Id)}" placeholder="G-XXXXXXXXXX">
        <small>Enables GA4 and web-vitals events. Leave empty to load no analytics script.</small>
      </div>
      <div class="adm-field">
        <label for="s-gsv">Google site verification</label>
        <input id="s-gsv" name="googleSiteVerification" value="${esc(settings.googleSiteVerification)}" placeholder="Verification token">
        <small>Paste the content token from Search Console's HTML tag method.</small>
      </div>
    </div>

    <div class="adm-grid-2">
      <div class="adm-field">
        <label for="s-user">Admin username</label>
        ${process.env.ADMIN_USERNAME
          ? '<input id="s-user" value="Managed by ADMIN_USERNAME environment variable" disabled><small>Env var is set, so the username cannot be changed from this page.</small>'
          : `<input id="s-user" name="adminUser" value="${esc(settings.adminUser || '')}" autocomplete="off">
          <small>Shown on the /admin sign-in page as the username field.</small>`}
      </div>
      <div class="adm-field">
        <label for="s-pass">Admin password</label>
        ${process.env.ADMIN_PASSWORD
          ? '<input id="s-pass" value="Managed by ADMIN_PASSWORD environment variable" disabled><small>Env var is set, so the password cannot be changed from this page.</small>'
          : `<input id="s-pass" name="adminPassword" value="${esc(settings.adminPassword)}" autocomplete="off">
          <small>The only credential pair protecting /admin. Use a long random string.</small>`}
      </div>
    </div>

    <div class="adm-form-footer">
      <button type="submit" class="adm-btn adm-btn-primary">Save settings</button>
      <span class="adm-save-note" id="settings-note"></span>
    </div>
  </form>

  <div class="adm-callout" style="margin-top:26px">
    <strong>Deploy notes</strong>
    <p>Static output lives at <code>/sitemap.xml</code> and <code>/robots.txt</code>, generated from the current domain. After you change the domain, resubmit the sitemap in Search Console.</p>
    <p>Backups: every write keeps a copy under <code>data/</code>. Zip the <code>data</code> folder before large imports.</p>
  </div>
</div>`;

  return adminLayout(settings, {
    title: 'Settings',
    active: 'settings',
    body,
    script: `
document.getElementById('settings-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const note = document.getElementById('settings-note');
  note.textContent = 'Saving...';
  const payload = Object.fromEntries(new FormData(e.target).entries());
  const res = await fetch('/api/admin/settings', {
    method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  if(res.ok){ note.textContent = 'Saved.'; note.style.color = '#34d399'; }
  else { note.textContent = 'Save failed.'; note.style.color = '#ff6b8a'; }
});`
  });
}

/* ---------------- Journal：文章列表 ---------------- */

function postsTable(posts, settings, params) {
  const q = (params.q || '').toLowerCase();
  const statusFilter = params.status || '';

  let list = posts;
  if (q) list = list.filter((p) => p.title.toLowerCase().includes(q) || p.slug.includes(q));
  if (statusFilter) list = list.filter((p) => p.status === statusFilter);
  list = [...list].sort((a, b) => new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0));

  const rows = list
    .map(
      (p) => `<tr>
  <td class="cell-title">
    <div class="row-title">${esc(p.title)}</div>
    <div class="row-slug">/blog/${esc(p.slug)}</div>
  </td>
  <td>${esc(String(p.publishedAt || '').slice(0, 10) || '—')}</td>
  <td class="cell-num">${wordCount(p.body)}</td>
  <td>${statusBadge(p.status)}${p.noindex ? '<div class="row-badges"><span class="adm-mini-badge adm-mb-noindex">NOINDEX</span></div>' : ''}</td>
  <td class="row-actions">
    <a class="adm-btn adm-btn-sm" href="/admin/post/${p.id}/edit">Edit</a>
    <a class="adm-btn adm-btn-sm adm-btn-ghost" href="/blog/${esc(p.slug)}" target="_blank">View</a>
    <button class="adm-btn adm-btn-sm adm-btn-ghost" onclick="togglePost(${p.id})">${
        p.status === 'published' ? 'Unpublish' : 'Publish'
      }</button>
    <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="removePost(${p.id})">Delete</button>
  </td>
</tr>`
    )
    .join('');

  return `${
    rows
      ? `<table class="adm-table">
    <thead><tr><th style="width:46%">Article</th><th style="width:14%">Published</th><th style="width:10%">Words</th><th style="width:12%">Status</th><th style="width:18%">Actions</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`
      : `<div class="adm-empty">No articles yet. <a href="/admin/post/new">Write the first one</a>.</div>`
  }`;
}

function postsPage(posts, settings, params) {
  const live = posts.filter((p) => p.status === 'published').length;
  const total = posts.length;

  const body = `
<div class="adm-wrap">
  <div class="adm-page-head">
    <div>
      <h1>Journal</h1>
      <p>Markdown articles. They feed /blog, the sitemap and the RSS feed.</p>
    </div>
    <div class="adm-head-actions">
      <a class="adm-btn adm-btn-primary" href="/admin/post/new">+ New article</a>
    </div>
  </div>

  <div class="adm-stats">
    <div class="adm-stat"><span>Articles</span><strong>${total}</strong></div>
    <div class="adm-stat"><span>Published</span><strong>${live}</strong></div>
    <div class="adm-stat"><span>Drafts</span><strong>${total - live}</strong></div>
    <div class="adm-stat"><span>RSS</span><strong><a href="/rss.xml" target="_blank" style="font-size:14px">/rss.xml</a></strong></div>
  </div>

  <form class="adm-filters" method="GET" action="/admin/posts">
    <input type="search" name="q" value="${esc(params.q || '')}" placeholder="Search title or slug">
    <select name="status">
      <option value="">All status</option>
      <option value="published"${params.status === 'published' ? ' selected' : ''}>Published</option>
      <option value="draft"${params.status === 'draft' ? ' selected' : ''}>Draft</option>
    </select>
    <button class="adm-btn" type="submit">Filter</button>
    <a class="adm-btn adm-btn-ghost" href="/admin/posts">Reset</a>
  </form>

  ${postsTable(posts, settings, params)}
</div>`;

  return adminLayout(settings, {
    title: 'Journal',
    active: 'posts',
    body,
    script: `
async function togglePost(id){
  const res = await fetch('/api/admin/posts/'+id+'/toggle',{method:'POST'});
  if(res.ok) location.reload(); else alert('Failed');
}
async function removePost(id){
  if(!confirm('Delete this article? This cannot be undone.')) return;
  const res = await fetch('/api/admin/posts/'+id,{method:'DELETE'});
  if(!res.ok){ alert('Delete failed'); return; }
  location.reload();
}`
  });
}

/* ---------------- Journal：Markdown 编辑器 ---------------- */

function postFormPage(post, settings, games) {
  const isNew = !post;
  const p = post || {
    title: '',
    slug: '',
    excerpt: '',
    body: '',
    cover: '',
    author: settings.siteName,
    section: '',
    lastChecked: '',
    tags: [],
    relatedGames: [],
    faqs: [],
    howto: [],
    seoTitle: '',
    seoDescription: '',
    noindex: false,
    status: 'draft',
    publishedAt: new Date().toISOString().slice(0, 10)
  };

  const faqRowHtml = (f) => `<div class="adm-repeat-row faq-row">
    <input name="faq_q" placeholder="Question (e.g. How many people can play?)" value="${esc(f.q || '')}">
    <textarea name="faq_a" rows="2" placeholder="Direct, complete answer — this can become a featured snippet">${esc(f.a || '')}</textarea>
    <button type="button" class="adm-btn adm-btn-sm adm-row-del">Remove</button>
  </div>`;

  const howtoRowHtml = (s) => `<div class="adm-repeat-row howto-row">
    <input name="howto_name" placeholder="Step name (e.g. Gather 3–12 players)" value="${esc(s.name || '')}">
    <textarea name="howto_text" rows="2" placeholder="Step detail — what happens and what to say">${esc(s.text || '')}</textarea>
    <button type="button" class="adm-btn adm-btn-sm adm-row-del">Remove</button>
  </div>`;

  const livePrefix = p.section ? `/${p.section}/` : '/blog/';

  const gameChecks = games
    .filter((g) => g.status === 'published')
    .map(
      (g) => `<label class="adm-check">
      <input type="checkbox" name="relatedGames" value="${g.id}"${
        (p.relatedGames || []).includes(g.id) ? ' checked' : ''
      }>
      <span>${esc(g.title)}</span>
    </label>`
    )
    .join('');

  const body = `
<div class="adm-wrap adm-wrap-wide">
  <div class="adm-page-head">
    <div>
      <h1>${isNew ? 'New article' : 'Edit article'}</h1>
      <p>${isNew ? 'Markdown. The preview panel renders exactly what visitors will see.' : `/blog/${esc(p.slug)} · ${wordCount(p.body)} words`}</p>
    </div>
    ${!isNew ? `<a class="adm-btn adm-btn-ghost" href="${esc(livePrefix)}${esc(p.slug)}" target="_blank">View live</a>` : ''}
  </div>

  <form class="adm-form" id="post-form">
    <div class="adm-field">
      <label for="f-title">Title <em>*</em></label>
      <input id="f-title" name="title" value="${esc(p.title)}" required placeholder="New browser games this week" oninput="syncSlug(this.value)">
    </div>

    <div class="adm-grid-2">
      <div class="adm-field">
        <label for="f-slug">URL slug</label>
        <div class="adm-slug-row">
          <span class="adm-slug-prefix" id="slug-prefix">${esc(livePrefix)}</span>
          <input id="f-slug" name="slug" value="${esc(p.slug)}" placeholder="new-browser-games-this-week" oninput="this.dataset.touched=1">
        </div>
      </div>
      <div class="adm-field">
        <label for="f-published">Publish date</label>
        <input id="f-published" name="publishedAt" type="date" value="${esc(String(p.publishedAt || '').slice(0, 10))}">
      </div>
    </div>

    <div class="adm-grid-2">
      <div class="adm-field">
        <label for="f-section">Section</label>
        <select id="f-section" name="section">
          <option value=""${!p.section ? ' selected' : ''}>Journal</option>
          <option value="news"${p.section === 'news' ? ' selected' : ''}>News</option>
          <option value="codes"${p.section === 'codes' ? ' selected' : ''}>Codes</option>
          <option value="modding"${p.section === 'modding' ? ' selected' : ''}>Modding</option>
          <option value="guides"${p.section === 'guides' ? ' selected' : ''}>Guides</option>
        </select>
        <small>Section pages are /news, /codes, /modding and /guides. Journal posts stay at /blog.</small>
      </div>
      <div class="adm-field">
        <label for="f-last-checked">Last checked (optional)</label>
        <input id="f-last-checked" name="lastChecked" type="date" value="${esc(String(p.lastChecked || '').slice(0, 10))}">
        <small>Shown on codes and verification pages. Leave blank for evergreen articles.</small>
      </div>
    </div>

    <div class="adm-field">
      <label for="f-excerpt">Excerpt</label>
      <textarea id="f-excerpt" name="excerpt" rows="2" placeholder="One or two sentences for the index card and meta description.">${esc(p.excerpt)}</textarea>
      <small>Shown on /blog cards and as the meta description. 120–160 characters reads best.</small>
    </div>

    <div class="adm-field">
      <label for="f-author-slug">Author slug</label>
      <input id="f-author-slug" name="authorSlug" value="${esc(p.authorSlug)}" placeholder="wraithn">
      <small>Matches an entry in data/authors.json. Leave blank to use the site name.</small>
    </div>

    <div class="adm-field">
      <label for="f-body">Body <em>*</em> <span class="adm-md-note">Markdown · <strong id="wc">${wordCount(p.body)}</strong> words · <strong id="rt">${Math.max(1, Math.round(wordCount(p.body) / 200))}</strong> min read</span></label>
      <div class="adm-split">
        <textarea id="f-body" name="body" class="adm-md" spellcheck="false" placeholder="# Heading

Paragraph text here. **Bold**, *italic*, [link](/game/slime-io-2).

## Section

- bullet
- bullet

> Quote">${esc(p.body)}</textarea>
        <div class="adm-preview" id="preview"><div class="adm-preview-empty">Preview appears here</div></div>
      </div>
      <small>Headings use #, ##. Lists use -. Links can point to any /game/&lt;slug&gt; page and will render as normal anchors. Pipe tables (| a | b |) become responsive HTML tables. Add "800x450" after an image URL to emit width/height.</small>
    </div>

    <div class="adm-grid-2 adm-repeat-grid">
      <div class="adm-field">
        <label>FAQ entries</label>
        <div id="faq-rows">${(p.faqs || []).map(faqRowHtml).join('')}</div>
        <button type="button" class="adm-btn adm-btn-sm" id="faq-add">+ Add FAQ</button>
        <small>Renders a visible FAQ section and FAQPage schema. Keep questions close to real search phrasing.</small>
      </div>
      <div class="adm-field">
        <label>How-to steps</label>
        <div id="howto-rows">${(p.howto || []).map(howtoRowHtml).join('')}</div>
        <button type="button" class="adm-btn adm-btn-sm" id="howto-add">+ Add step</button>
        <small>Emits HowTo schema for pillar guides. Leave empty for normal articles.</small>
      </div>
    </div>

    <div class="adm-grid-2">
      <div class="adm-field">
        <label for="f-tags">Tags</label>
        <input id="f-tags" name="tags" value="${esc((p.tags || []).join(', '))}" placeholder="weekly, io">
      </div>
      <div class="adm-field">
        <label for="f-status">Status</label>
        <select id="f-status" name="status">
          <option value="draft"${p.status === 'draft' ? ' selected' : ''}>Draft (hidden)</option>
          <option value="published"${p.status === 'published' ? ' selected' : ''}>Published (live)</option>
        </select>
      </div>
    </div>

    <div class="adm-field">
      <label for="f-cover">Cover image URL</label>
      <input id="f-cover" name="cover" value="${esc(p.cover)}" placeholder="https://.../cover.webp">
      <small>Optional. Without it the card uses a generated colour block.</small>
    </div>

    <div class="adm-field">
      <label>Games to feature under the article</label>
      <div class="adm-checks">${gameChecks || '<small>No published games yet.</small>'}</div>
      <small>These render as playable cards at the bottom of the article. Also used for internal linking.</small>
    </div>

    <div class="adm-grid-2">
      <div class="adm-field">
        <label for="f-seo-title">SEO title override</label>
        <input id="f-seo-title" name="seoTitle" value="${esc(p.seoTitle)}" placeholder="New browser games this week — PLAY HYPE GAMES">
      </div>
      <div class="adm-field">
        <label for="f-seo-desc">SEO description override</label>
        <input id="f-seo-desc" name="seoDescription" value="${esc(p.seoDescription)}" placeholder="Eleven additions this week...">
      </div>
    </div>

    <div class="adm-field">
      <label class="adm-check-label"><input type="checkbox" name="noindex" value="on"${p.noindex ? ' checked' : ''}> <span>noindex</span></label>
      <small>Keep the page live and crawlable, but ask search engines not to index it and remove it from the sitemap. Use for off-topic articles that pull in irrelevant queries.</small>
    </div>

    <div class="adm-form-footer">
      <button type="submit" class="adm-btn adm-btn-primary">${isNew ? 'Create article' : 'Save changes'}</button>
      <button type="button" class="adm-btn" onclick="renderPreview(true)">Refresh preview</button>
      <a class="adm-btn adm-btn-ghost" href="/admin/posts">Cancel</a>
      <span class="adm-save-note" id="save-note"></span>
    </div>
  </form>
</div>`;

  return adminLayout(settings, {
    title: isNew ? 'New article' : 'Edit article',
    active: 'posts',
    body,
    script: `
const POST_ID = ${isNew ? 'null' : Number(p.id)};

function slugify(v){
  return String(v||'').toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70);
}
function syncSlug(title){
  const el = document.getElementById('f-slug');
  if(el.dataset.touched) return;
  el.value = slugify(title);
}

let timer = null;
const bodyEl = document.getElementById('f-body');
const prevEl = document.getElementById('preview');

async function renderPreview(force){
  const text = bodyEl.value;
  if(!text.trim()){
    prevEl.innerHTML = '<div class="adm-preview-empty">Preview appears here</div>';
    document.getElementById('wc').textContent = '0';
    document.getElementById('rt').textContent = '1';
    return;
  }
  try {
    const res = await fetch('/api/admin/posts/preview', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ body: text })
    });
    const data = await res.json();
    prevEl.innerHTML = data.html || '';
    document.getElementById('wc').textContent = data.words;
    document.getElementById('rt').textContent = data.minutes;
  } catch(e){ if(force) prevEl.textContent = 'Preview failed.'; }
}

bodyEl.addEventListener('input', ()=>{
  clearTimeout(timer);
  timer = setTimeout(renderPreview, 500);
});
renderPreview();

/* slug 前缀跟随 Section 选择 */
const sectionSel = document.getElementById('f-section');
const slugPrefix = document.getElementById('slug-prefix');
function syncSlugPrefix(){
  slugPrefix.textContent = '/' + (sectionSel.value || 'blog') + '/';
}
sectionSel.addEventListener('change', syncSlugPrefix);

/* FAQ / HowTo 重复条目 */
function bindRepeater(addId, containerId, rowHtml){
  const addBtn = document.getElementById(addId);
  const box = document.getElementById(containerId);
  addBtn.addEventListener('click', ()=>{
    const wrap = document.createElement('div');
    wrap.innerHTML = rowHtml.trim();
    box.appendChild(wrap.firstChild);
  });
  box.addEventListener('click', (e)=>{
    if(e.target.classList.contains('adm-row-del')) e.target.closest('.adm-repeat-row').remove();
  });
}
bindRepeater('faq-add', 'faq-rows',
  '<div class="adm-repeat-row faq-row">' +
  '<input name="faq_q" placeholder="Question">' +
  '<textarea name="faq_a" rows="2" placeholder="Answer"></textarea>' +
  '<button type="button" class="adm-btn adm-btn-sm adm-row-del">Remove</button></div>');
bindRepeater('howto-add', 'howto-rows',
  '<div class="adm-repeat-row howto-row">' +
  '<input name="howto_name" placeholder="Step name">' +
  '<textarea name="howto_text" rows="2" placeholder="Step detail"></textarea>' +
  '<button type="button" class="adm-btn adm-btn-sm adm-row-del">Remove</button></div>');

document.getElementById('post-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const form = new FormData(e.target);
  const payload = Object.fromEntries(form.entries());
  payload.tags = String(payload.tags||'').split(',').map(s=>s.trim()).filter(Boolean);
  payload.relatedGames = Array.from(form.getAll('relatedGames')).map(Number);
  payload.faqs = Array.from(document.querySelectorAll('#faq-rows .faq-row')).map((row)=>({
    q: row.querySelector('[name=faq_q]').value,
    a: row.querySelector('[name=faq_a]').value
  })).filter((f)=>f.q.trim() && f.a.trim());
  payload.howto = Array.from(document.querySelectorAll('#howto-rows .howto-row')).map((row)=>({
    name: row.querySelector('[name=howto_name]').value,
    text: row.querySelector('[name=howto_text]').value
  })).filter((s)=>s.name.trim() || s.text.trim());

  const url = POST_ID ? '/api/admin/posts/'+POST_ID : '/api/admin/posts';
  const method = POST_ID ? 'PUT' : 'POST';
  const note = document.getElementById('save-note');
  note.textContent = 'Saving...';
  note.style.color = '';

  const res = await fetch(url, {
    method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  const data = await res.json().catch(()=>({}));
  if(res.ok){
    note.textContent = 'Saved.';
    if(!POST_ID) location.href = '/admin/post/'+data.post.id+'/edit';
  } else {
    note.textContent = data.error || 'Save failed.';
    note.style.color = '#ff6b8a';
  }
});`
  });
}

/* ---------------- Catalog sync（外部目录同步） ---------------- */

function feedsPage(settings, games) {
  const all = feeds.getFeeds(settings);
  const cards = Object.keys(feeds.PROVIDERS)
    .map((key) => {
      const meta = feeds.PROVIDERS[key];
      const cfg = all[key];
      return `<div class="adm-feed-card" data-provider="${key}">
  <div class="adm-feed-head">
    <div>
      <h3>${esc(meta.label)}</h3>
      <p>${esc(meta.hint)}</p>
    </div>
    <label class="adm-check"><input type="checkbox" class="fd-enabled"${cfg.enabled ? ' checked' : ''}><span>Enabled</span></label>
  </div>

  <div class="adm-field">
    <label>Endpoint (JSON)</label>
    <input class="fd-endpoint" value="${esc(cfg.endpoint)}" placeholder="${esc(meta.endpointPlaceholder)}">
  </div>

  <div class="adm-grid-2">
    <div class="adm-field">
      <label>API key ${meta.needsKey ? '' : '<small>(optional)</small>'}</label>
      <input class="fd-key" value="${esc(cfg.apiKey)}" placeholder="Bearer token">
    </div>
    <div class="adm-field">
      <label>Array path</label>
      <input class="fd-path" value="${esc(cfg.listPath)}" placeholder="games.data (leave empty if the response is an array)">
    </div>
  </div>

  <div class="adm-grid-3">
    <div class="adm-field">
      <label>Max per sync</label>
      <input class="fd-limit" type="number" min="1" max="200" value="${esc(cfg.limit)}">
    </div>
    <div class="adm-field">
      <label>Only newer than (days)</label>
      <input class="fd-age" type="number" min="0" value="${esc(cfg.maxAgeDays)}">
      <small>0 = no date filter</small>
    </div>
    <div class="adm-field">
      <label>Fallback category</label>
      <select class="fd-cat">
        <option value="">— none —</option>
        ${settings.categories
          .map((c) => `<option value="${c.slug}"${cfg.defaultCategory === c.slug ? ' selected' : ''}>${esc(c.name)}</option>`)
          .join('')}
      </select>
    </div>
  </div>

  <div class="adm-field">
    <label class="adm-check"><input type="checkbox" class="fd-brand"${cfg.skipBrandIp !== false ? ' checked' : ''}><span>Skip titles that reference a known brand or game IP</span></label>
    <small>Filters out web ports of Subway Surfers, Minecraft, Candy Crush and similar. Turn off only if you can verify the licence.</small>
  </div>

  <div class="adm-field">
    <label>Mapping reference</label>
    <div class="adm-feed-alias">
      title ← <code>${feeds.ALIASES.title.slice(0, 3).join(', ')}</code><br>
      embed ← <code>${feeds.ALIASES.embedUrl.slice(0, 4).join(', ')}</code><br>
      thumb ← <code>${feeds.ALIASES.thumb.slice(0, 3).join(', ')}</code>
    </div>
  </div>

  <div class="adm-form-footer">
    <button type="button" class="adm-btn" onclick="saveFeed('${key}')">Save config</button>
    <button type="button" class="adm-btn adm-btn-ghost" onclick="runSync('${key}', true)">Dry run</button>
    <button type="button" class="adm-btn adm-btn-primary" onclick="runSync('${key}', false)">Run sync</button>
    <span class="adm-save-note fd-note"></span>
  </div>
</div>`;
    })
    .join('');

  const body = `
<div class="adm-wrap">
  <div class="adm-page-head">
    <div>
      <h1>Catalog sync</h1>
      <p>Pull a JSON catalog from your distribution partner. Everything lands as a draft so nothing goes live unreviewed.</p>
    </div>
    <div class="adm-head-actions">
      <span class="adm-stat-inline">${games.filter((g) => g.status === 'draft').length} drafts waiting</span>
    </div>
  </div>

  <div class="adm-empty" style="margin-bottom:18px;text-align:left">
    <strong>How this works</strong><br>
    1. Register as a publisher on the partner site and copy the catalog / games JSON endpoint from your dashboard.<br>
    2. Paste it below, add the API key if they gave you one.<br>
    3. Use <em>Dry run</em> first — it reports what would be imported without writing anything.<br>
    4. Then <em>Run sync</em>. Duplicates are skipped by embed URL, external id and slug.
  </div>

  <div class="adm-feed-list">${cards}</div>
</div>`;

  return adminLayout(settings, {
    title: 'Catalog sync',
    active: 'feeds',
    body,
    script: `
function cardOf(provider){ return document.querySelector('.adm-feed-card[data-provider="'+provider+'"]'); }
function noteOf(card, text, ok){
  const note = card.querySelector('.fd-note');
  note.textContent = text;
  note.style.color = ok ? '#34d399' : '#ff6b8a';
}

async function saveFeed(provider){
  const card = cardOf(provider);
  const payload = {
    provider,
    enabled: card.querySelector('.fd-enabled').checked,
    endpoint: card.querySelector('.fd-endpoint').value,
    apiKey: card.querySelector('.fd-key').value,
    listPath: card.querySelector('.fd-path').value,
    limit: Number(card.querySelector('.fd-limit').value),
    maxAgeDays: Number(card.querySelector('.fd-age').value),
    skipBrandIp: card.querySelector('.fd-brand').checked,
    defaultCategory: card.querySelector('.fd-cat').value
  };
  noteOf(card, 'Saving...', true);
  const res = await fetch('/api/admin/feeds', {
    method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  const data = await res.json().catch(()=>({}));
  noteOf(card, res.ok ? 'Config saved.' : (data.error || 'Save failed'), res.ok);
}

async function runSync(provider, dryRun){
  const card = cardOf(provider);
  noteOf(card, dryRun ? 'Dry run...' : 'Syncing...', true);
  const res = await fetch('/api/admin/feeds/sync', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ provider, dryRun })
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok){ noteOf(card, data.error || 'Sync failed', false); return; }
  const r = data.result;
  noteOf(card, (dryRun ? 'Dry run: ' : 'Imported ') + r.added + ' / fetched ' + r.fetched + ', skipped ' + r.skipped, true);
  if(r.samples && r.samples.length){
    console.log(r.samples);
  }
  if(!dryRun && r.added > 0){
    setTimeout(()=>location.reload(), 900);
  }
}`
  });
}

module.exports = {
  adminLayout,
  loginPage,
  dashboardPage,
  gameFormPage,
  importPage,
  categoriesPage,
  tagsPage,
  settingsPage,
  postsPage,
  postFormPage,
  feedsPage
};