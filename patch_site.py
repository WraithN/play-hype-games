import re, io, os

p = r"D:\拓墟造界核心业务\游戏独立站\playhypegames\lib\site.js"
src = open(p, encoding="utf-8").read()

# 1) 引入新组件
src = src.replace(
    "const { esc, jsonLd, fmtDate, icon, layout, gameCard, sectionHead, pagination, thumbBox } = require('./render');",
    "const { esc, jsonLd, fmtDate, icon, layout, gameCard, sectionHead, pagination, thumbBox, heroBlock, hypeTabs } = require('./render');",
    1
)

# 2) 替换 homePage 的 body
new_body = """  const body = `
${heroBlock(settings)}
${hypeTabs(settings)}

<section class="hsection">
  <div class="hwrap">
    ${sectionHead('Trending now', 'Popular this week', '/trending', 'See more')}
    <div class="hgrid">${trending.slice(0, 12).map((g) => gameCard(g)).join('')}</div>
  </div>
</section>

<section class="hsection">
  <div class="hwrap">
    ${sectionHead('New releases', 'Fresh this week', '/new', 'All new games')}
    <div class="hgrid">${newest.slice(0, 12).map((g) => gameCard(g)).join('')}</div>
  </div>
</section>
`;
"""

start = src.index("  const body = `")
end = src.index("`;\n\n  return layout({", start) + len("`;\n")
src = src[:start] + new_body + src[end:]

# 3) 首页给 body 加 class，用于挂背景
src = src.replace("    active: 'home',\n", "    active: 'home',\n    bodyClass: 'hype-home',\n", 1)

open(p, "w", encoding="utf-8").write(src)
print("site.js patched, bytes =", len(src))
print("heroBlock used:", "heroBlock(settings)" in src)
print("bodyClass:", "hype-home" in src)
