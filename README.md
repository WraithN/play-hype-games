# PlayHypeGames

海外 HTML5 小游戏聚合站，零依赖 Node 服务，前台渲染和管理后台在同一个进程里。
不用 `npm install`，`node server.js` 直接跑。

## 启动

```bash
cd D:\拓墟造界核心业务\游戏独立站\playhypegames
node server.js
```

或者双击 `start.bat`。

- 前台：http://localhost:4180
- 后台：http://localhost:4180/admin
- 默认后台密码：`playhype2026`（在 后台 → Settings 里改）

改端口：`set PORT=9000 && node server.js`
端口 4180 是特意避开的：3000 在本机已被 draw.io 占用（IPv6），用 `localhost:3000` 会打开错误页面。如果 4180 也被占用，服务会自动往后试到 4181、4182，启动日志里会打印实际端口。

## 目录

```
server.js          HTTP 服务、路由、后台 API
lib/store.js       数据读写（JSON 文件，原子写 + 内存缓存）
lib/site.js        前台页面渲染
lib/admin.js       后台页面渲染
lib/render.js      公共模板与组件
public/style.css   前台样式
public/admin.css   后台样式
data/games.json    游戏数据
data/settings.json 站点配置（首次启动自动生成）
preview/           当前运行效果的截图
```

## 日常操作（这就是你说的“追新词”流程）

### 1. 单条加游戏
后台 → **Add game**，填四样东西就能发布：

| 字段 | 说明 |
|---|---|
| Title | 游戏名，同时生成 URL |
| Embed URL | iframe 的 src，从 GameDistribution / GamePix 后台复制 |
| Category | 选一个分类 |
| Tags | 逗号分隔，每个标签自动生成 `/tag/xxx` 页面 |

保存后状态是 Draft，点列表里的 **Publish** 才对外可见。建议先预览确认能玩再发布。

### 2. 批量铺页（追新词的主力）
后台 → **Bulk import**，一行一个游戏：

```
标题 | iframe地址 | 分类slug | 标签,标签
Slime IO 2 | https://html5.gamedistribution.com/xxx/ | io-games | io, unblocked
```

- 只填 `标题 | 地址` 也可以，分类用页面下方选的默认分类
- 只贴一个 URL 也能识别，标题会从 URL 自动推断
- 默认建成草稿，确认后再批量发布

一次贴 50–200 行没问题，几千条建议分批（每批 200 条左右）。

### 3.5 热度（Heat score）

后台 → 任意游戏的 **Edit** 页，字段 **Heat score**（`data/games.json` 里的 `heat`）。

- 首页 `Trending now` 与 `/trending` 都按 `heat` 从高到低排，分数相同才看 `views`
- 想推某款新游，把它的 heat 调到比现有最高的更大（比如 1000+），它立刻排到第一
- 想让某款掉下去，调小即可，不用下架
- 只影响排序，不影响是否上架（那是 Status）

已实测：heat 改 50 → 首页首位换人；改回 982 → 原游戏回位，无需重启。

### 4. 分类
后台 → **Categories**，新增/改名/删除。删除分类时，该分类下的游戏变成未分类，不会丢失。
新增分类后要手动改 `lib/render.js` 的 `ICON_PATHS` 加图标，或者直接在 settings 里给 `icon` 填已有的键（`io` / `idle` / `action` / `strategy` / `2p` / `chromebook` / `grid`）。

### 4. SEO 相关都是自动的
- `/sitemap.xml`：所有已发布游戏 + 分类 + 标签，实时生成
- `/robots.txt`：屏蔽 `/admin` 和 `/api`
- 每个游戏页带 `VideoGame` + `BreadcrumbList` 结构化数据
- 每个页面有 canonical、OG、meta description
- 搜索页 `noindex`，避免被抓成重复内容

上线后第一件事：把域名填进 Settings → Canonical domain，再去 GSC 提交 sitemap。

### 站内 SEO 规则（代码里已经生效，不用手工维护）

- **规范域名**：`data/settings.json` 与 `lib/store.js` 都固定为 `https://www.playhypegames.com`；非 www 的 `SITE_DOMAIN` 也会被自动改写成 www，避免 canonical / sitemap / OG 混用两套主机。
- **标签页质量门**（`lib/seo.js`）：游戏数 ≥ 11 的标签可索引；5–10 个的必须有至少 150 字符人工导语；少于 5 个的返回 `noindex,follow` 且不进 sitemap。近义标签（`io-games` → `io`、`kid` → `kids` 等）会 301 归并。
- **描述**：feed 原文可能被上游截断，页面只用完整句子；meta description 统一裁到 160–170 字符，不再出现半句或 `&mdash;` 这类未解码实体。
- **标题**：导入和编辑时折叠多余空格，避免 “Skibidi War   Toilets Attack” 这种双空格标题。
- **内容边界**：不根据分类模板编造键位、加载时间、设备兼容或评分；`VideoGame` 结构化数据不带没有真实来源的 `aggregateRating`。需要补充时用后台的 **Controls** 与 **Long content** 字段。
- **字体**：Baloo 2 改为 `public/fonts/baloo-2-latin.woff2` 自托管并 preload，不再阻塞加载 `miaoda.feishu.cn` 的跨域 CSS。
- **信任页**：`/about`、`/contact`、`/editorial-policy` 说明内容来源、测试口径与排名口径；文章署名统一指向编辑政策。

### ?????????? 79 ??

- `data/editorial.json` 是手写的编辑判断：`why` / `loop` / `fit` / `verdict`。只写能从游戏描述、发布方说明和实际构建观察到的东西。
- `data/game-audits.json` 由 `node scripts/audit-games.js` 生成：无浏览器缓存地抓取 embed 文档、页面引用的脚本和 `data.json`，记录冷加载耗时、初始负载大小、viewport 声明和键盘/触摸代码是否存在。
- 页面上的 “Test log” 只展示这些真实抓取值；静态扫描到输入代码不等于完整试玩，文案里已明确区分。游戏改版或 CDN 变化后重新跑脚本即可。
- ????????? **79 ??????**?????????????? `editorial.json` ?????????
- ?????????`node scripts/audit-games.js 20 20` ???? 21 ???? 20 ?????????? 20 ?????? slug ??? `data/game-audits.json`???????????? 79 ???????? audit?

### 分析 / GSC

- 后台 **Settings → GA4 measurement ID**（或环境变量 `GA4_ID`）填入 `G-...` 后，前台才会加载 gtag；留空时不会请求任何分析脚本。
- 同一处可填 **Google site verification**（或 `GOOGLE_SITE_VERIFICATION`），输出 `<meta name="google-site-verification">`，用于 GSC 的 HTML 标签验证。
- 启用 GA4 后，页面会在 `pagehide` / 切到后台时发送 `web_vitals` 事件，包含 `metric_lcp`、`metric_cls`、`metric_inp` 和 `page_path`，用于看真实用户的 p75。
- PSI/CrUX 是外部测量工具，不需要站点代码；GSC 的索引与查询数据必须由站点所有者在 Search Console 里查看。

### 性能与缓存
- HTML 响应默认 `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=600`，并带 ETag；正文超过 1 KB 时按 `Accept-Encoding` gzip。
- CSS/JS/字体使用版本化查询串（如 `hype.css?v=7`）并设置一年 immutable 缓存；图片 30 天。
- Render 免费实例的冷启动仍在，代码层无法消除。要让 Cloudflare 真正缓存 HTML，需要在 Cloudflare 侧加一条 Cache Rule（缓存 `/`、`/game/*`、`/category/*`、`/tag/*`），这是站点代码之外的配置。

## 上线部署

### 环境变量（推荐）

| 变量 | 作用 |
| --- | --- |
| `ADMIN_PASSWORD` | 覆盖后台密码；设置后后台 Settings 页不可再改密码，避免公开仓库里的默认密码 `playhype2026` 直接生效 |
| `SITE_DOMAIN` | 覆盖 canonical 域名（sitemap / RSS / OG 用） |
| `PORT` | 监听端口，平台自动注入；本地默认 4180 |

### Render（$0 免费方案，推荐起步）

仓库已带 `render.yaml`，两种方式任选：

1. **Blueprint（推荐）**：Render 控制台 → New → Blueprint → 选择本仓库 → Apply，环境变量 `ADMIN_PASSWORD` 按提示填写
2. **手动建 Web Service**：连仓库后 Runtime 选 Node，Start Command 填 `node server.js`，Plan 选 Free

之后每次 `git push` 自动部署。注意免费实例 15 分钟无访问会休眠（冷启动约 1 分钟），且容器文件系统是临时的——**内容更新走「本地后台改好 → 提交 data/*.json → git push」流程**，不要依赖线上后台的写入持久化。

### Railway（不休眠，试用后约 $5/月）

仓库已带 `railway.json`，CLI 流程：

```bash
npm i -g @railway/cli
railway login
railway init        # 建 project
railway up          # 部署当前目录
railway domain      # 生成公网域名
```

在 Variables 里填 `ADMIN_PASSWORD`。需要持久化后台写入时给服务挂一个 Volume 到 `/app/data`。

### 自备 VPS

```bash
node server.js                      # 先手动确认能跑
npm i -g pm2
pm2 start server.js --name playhype
pm2 save && pm2 startup
```

前面挂 Nginx 反代到 `127.0.0.1:4180`，Cloudflare 代理 + 缓存静态资源。

**注意**：数据存在 `data/*.json`，已纳入 git；换机器或重部署前确认最新数据已提交。

**不要**把 `node server.js` 直接暴露公网端口，`/admin` 只有一个密码保护——公网部署务必设置 `ADMIN_PASSWORD` 环境变量。

## 已知限制（按优先级排）

1. **没有图片上传**：缩略图走 URL，直接填分发平台给的封面地址。要本地上传得加一个 POST 接口，现在没做。
2. **单进程、JSON 存储**：几千条游戏没问题，上万条或多人同时编辑会碰写锁。真到那一步把 `lib/store.js` 换成 Postgres/Supabase，上层不用改。
3. **没有多用户**：一个后台密码，够单人运营用。
4. **示例数据里的 embedUrl 是空的**：12 条 demo 游戏只用于看版式，点进去会提示 “Game embed not configured”。接入真实游戏后就有了。
5. **没有站点地图分索引**：游戏超过 5000 条需要拆 `sitemap-1.xml` / `sitemap-2.xml`。

## 下一步可以做的

- 接 GameDistribution catalog API，定时拉新上架游戏自动建草稿页
- 首页 hero 轮播 + 手动精选位
- 每 24 小时生成 `/new/2026-11-17` 这种日期归档页（适合抓 “new games this week”）
- 加 RSS，方便导流和收录

## 5. Journal（博客 / 内容页）

前台

- `/blog`            文章索引
- `/blog/<slug>`     单篇文章
- `/rss.xml`         RSS 2.0，取最近 20 篇

后台

- `/admin/posts`           文章列表
- `/admin/post/new`        新建
- `/admin/post/<id>/edit`  编辑（左写右预览）

编辑器的 Markdown 支持范围（`lib/markdown.js`）：

```
# / ## / ###   标题
段落            空行分隔，连续行自动合并
- * +          无序列表
1. 2.          有序列表
>              引用
```            代码块（可带语言名）
`code`         行内代码
**粗体**  *斜体*
[文字](链接)  ![图](地址)
---            分隔线
```

链接只要写 `/game/<slug>` 就是站内互链，会被当成普通 a 标签渲染。

文章字段（`data/posts.json`）：

| 字段 | 说明 |
| --- | --- |
| title / slug | 标题与 URL，编辑时留空 slug 会沿用原值，避免已发布文章改标题后旧链接 404 |
| excerpt | 卡片摘要 + meta description |
| body | Markdown 正文 |
| cover | 可选封面图 URL，留空用按 slug 派生的渐变块 |
| tags | 逗号分隔 |
| relatedGames | 游戏 id 数组，渲染成文章底部的游戏卡片 |
| status | draft / published，draft 不出现在列表、sitemap、RSS |
| publishedAt | 日期，用于排序与结构化数据 |

SEO

- 每篇输出 `BlogPosting` + `BreadcrumbList` 结构化数据
- 已发布文章自动进 `/sitemap.xml`（priority 0.7，monthly）与 `/rss.xml`
- `/blog` 输出 `Blog` 集合结构化数据

### 作者

`data/authors.json` 保存具名作者。当前编辑是 **WangNan**（`/author/wangnan`），与 `make1day.dev` 的作者页（`https://www.make1day.dev/en/author/wangnan`）和 Uncorne 通过 `sameAs` 关联；文章 byline 指向作者页，`BlogPosting.author` 输出 `Person`。要换成另一位编辑，改这个文件里的 `name`、`slug`、`bio`、`avatar`、`sameAs`，再更新 `data/posts.json` 的 `authorSlug` 即可；不要编造资历或头衔。后台文章编辑页也有 `Author slug` 字段。

## 6. 端口

默认 4180（3000 常被本机其他服务占用）。被占用时自动 +1 重试，最多 +10。

## 7. Catalog sync（外部目录同步）

后台入口：`/admin/feeds`（导航里的 Catalog）

用途：从分发平台的 JSON 目录批量拉新游，全部落成 **draft**，人工确认后再发布。

配置项（存在 `data/settings.json` 的 `feeds` 对象里）：

| 字段 | 说明 |
| --- | --- |
| endpoint | 目录 JSON 地址，必填 |
| apiKey | 有就填，会以 `Authorization: Bearer` 发送 |
| listPath | 数组在返回 JSON 里的路径，如 `games.data`；留空时自动找第一个数组字段 |
| limit | 单次最多导入多少条（1–200） |
| maxAgeDays | 只要 N 天内发布的（0 = 不按日期过滤） |
| defaultCategory | 分类认不出来时的兜底 |

字段识别：不用手写映射，按别名表自动认：

```
title      ← title / name / gameName
embed      ← embedUrl / gameUrl / url / iframeUrl / link
thumb      ← thumb / image / imageUrl / cover
category   ← category / genre / categories
date       ← publishedAt / releaseDate / date / createdAt
```

去重：按 embedUrl（尾部斜杠与大小写归一）、external id、slug 三重比对，重复的直接 skip。

分类映射：库的分类字符串先按 slug/名称精确匹配，再按关键字归类（puzzle/match → strategy-games，idle/clicker/tycoon → idle-games 等），都认不出才用兜底分类。

API：

- `GET  /api/admin/feeds`        读配置
- `PUT  /api/admin/feeds`        保存某个 provider 的配置
- `POST /api/admin/feeds/sync`   `{ provider, dryRun }` 执行同步

`public/feed-demo.json` 是测试用的示例数据（含一条故意缺 URL 的坏数据，用来验证跳过逻辑）。可以在后台把 endpoint 填 `http://127.0.0.1:4180/assets/feed-demo.json` 做连通性自测，测完把配置清空。

### 品牌 IP 过滤（默认开启）

分发库里混有大量知名 IP 的网页移植版（Subway Surfers、Minecraft、Candy Crush、Among Us 等）。这些多数是第三方上传的仿制版本，不是授权移植。同步模块默认按标题匹配品牌关键词并跳过，命中数量在返回结果里以 `riskSkipped` 报告。

- 只匹配**标题**，不匹配描述。描述里常有 "paper.io-style"、"like Minecraft" 这类类比写法，一起判断会误杀原创竞技类游戏。
- 命中后不导入，也不算 `skipped`，单独计数，方便观察库存质量。
- 后台 `Skip titles that reference a known brand or game IP` 可关闭，只在你能核实授权时关闭。
- 关键词表在 `lib/feeds.js` 的 `BRAND_RISK`，可自行增删。

## 8. News / Codes / Modding

三个独立栏目，避免和普通游戏列表混在一起：

| 栏目 | 路径 | 用途 |
| --- | --- | --- |
| News | `/news` | 官宣、发售、玩法资讯 |
| Codes | `/codes` | Roblox 兑换码，按“已确认 / 未确认 / 已过期”分区，带检查日期 |
| Modding | `/modding` | 开源移植、模组项目状态，只写技术信息 |

- 文章仍存在 `data/posts.json`，用 `section` 字段归类：`news` / `codes` / `modding`；留空就是 Journal，只在 `/blog` 出现。
- 文章 URL 是 `/<section>/<slug>`；旧的 `/blog/<slug>` 访问带 section 的文章会 301 到栏目 URL。
- 后台文章编辑页有 **Section** 和 **Last checked** 字段。Codes 页必须填检查日期，并在正文里写清楚来源和“未确认”的码。
- 版权红线：栏目只做资讯和项目状态。**不放游戏本体、破解、预置打包、网盘/磁力链接、泄露资源**。Leonida 这类项目只链接原 GitHub、记录依赖与已知问题，不提供下载或逐步破解教程。
- 首页会展示最新 3 篇 News/Codes/Modding 文章；`/sitemap.xml` 会自动加入三个栏目和栏目文章。

### 筛选器与合集

- `/find` 按一局时长、节奏、输入、设备、重玩价值和解压度筛选；筛选后的 URL 是 `noindex,follow`，基础 `/find` 可索引。
- `/collections` 是 4 个主题合集，合集页带 `CollectionPage` + `ItemList` 结构化数据，并内链到具体游戏页。
- 评分来自 `data/game-meta.json`，由 `node scripts/seed-game-meta.js` 按固定 rubric 生成，再由编辑覆盖少量特例。所有分数都是编辑估计，不是实测通关数据。
- `data/collections.json` 定义合集标题、导语、筛选标准和 pick 列表；新增合集改这个文件即可。
- 首页和页脚都有 `/find` 与 `/collections` 入口。

### 对比页 / Codes 模板 / OG / CSV

- `/compare` 是精选对比与双游戏选择器；`/compare/<slug>` 是手写对比页，动态 `?a=&b=` 组合默认 `noindex`，精选组合会 301 到固定 URL。
- Codes 文章支持结构化 `codeSets`（active / reported / expired），页面生成 Copy 按钮，并发送 GA4 `code_copy` 事件。
- `public/og-default.png` 是 1200×630 默认分享图；没有封面的页面自动使用。
- `/research/browser-game-load-times.csv` 导出 79 条冷抓取数据，研究页带 CSV 下载与引用格式。

## 9. Rarity Tower（自研游戏）

第一个自研游戏，独立于外部 feed，代码和题库都在仓库里，不依赖第三方面板。

| 路径 | 作用 |
| --- | --- |
| `/rarity-tower` | 总入口：玩法、8 个主题、分档口径 |
| `/rarity-tower/<theme>` | 主题页：`world` `europe` `asia` `africa` `americas` `islands` `landlocked` `microstates` |
| `/rarity-tower/method` | 稀有度算法、数据来源与已知局限 |
| `/game/rarity-tower` | 目录里的游戏页（iframe 默认加载 world） |
| `/rarity-tower/packs.json` | 游戏运行时读取的题库（服务端直出，短缓存） |
| `/assets/games/rarity-tower/index.html` | 游戏本体：像素前端、16:9、可全屏、音效默认关闭 |

数据与口径：

- 题库在 `data/rarity/packs.json`，由 `node scripts/build-rarity-packs.mjs` 生成。国家数据来自 mledoze/countries 与 World Bank 人口；稀有度用英文维基百科 2024-12 至 2025-10 的月浏览量，在**每道题的合法答案内部**做百分位分档。
- 答案集固定 194 个（联合国成员 + 台湾、科索沃、巴勒斯坦、梵蒂冈），不接受属地；拼写和常见别名会归一化（USA / Holland / Burma / Czech Republic 等）。
- 分档：最冷门 15% = Legendary，15–35% Epic，35–60% Rare，60–80% Uncommon，其余 Common；楼层最低要求固定在 `RARITY_LADDER`，目前最高只要求 Epic，避免小答案集必死。
- 生成脚本需要访问 Wikipedia / World Bank / GitHub。若 Node 直连失败，先设置 `NODE_USE_ENV_PROXY=1` 和 `HTTPS_PROXY`（本机代理）再跑；缓存写在 `.cache/rarity/`，已加入 .gitignore。

新增一个主题：

1. 在 `scripts/build-rarity-packs.mjs` 的题库里加一组 `q(id, prompt, list)`（至少 6 道题，每题至少 6 个有效答案，否则会被丢弃）。
2. 在 `themeDefs` 里登记 slug、名称、tagline 和导语。
3. 重跑脚本；`/rarity-tower/<slug>`、sitemap 和游戏内主题切换会自动带上。

缓存注意：`index.html` 使用 `max-age=0, must-revalidate`；`game.js` / `rarity.css` 是长缓存，改动后要手动升 `?v=`（`public/games/rarity-tower/index.html` 和 `lib/rarity.js` 里的引用）。
