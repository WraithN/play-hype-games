'use strict';

/**
 * 零依赖 Markdown → HTML。
 * 只覆盖写文章真正用得到的语法，先转义再解析，杜绝 Markdown 正文注入 HTML。
 * 支持：# 标题、段落、- / 1. 列表、> 引用、``` 代码块、行内 `code`、
 *      **粗体**、*斜体*、[链接](url)、![图片](src)、--- 分隔线。
 */

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 只放行 http/https/站内相对地址，挡掉 javascript: 之类的伪协议 */
function safeUrl(raw) {
  const url = String(raw || '').trim();
  if (!url) return '#';
  if (/^(https?:\/\/|\/|#|mailto:)/i.test(url)) return url;
  return '#';
}

function inline(text) {
  let t = escapeHtml(text);

  // 可选标题：![alt](url "800x450") 里的 WxH 会输出 width/height，防止 CLS；普通标题输出 title 属性
  // 注意：到这一步文本已过 escapeHtml，引号形态是 &quot;，两种引号都兼容
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+(?:"|&quot;)(.*?)(?:"|&quot;))?\)/g, (_, alt, src, title) => {
    const size = String(title || '').match(/^(\d+)x(\d+)$/i);
    const dims = size ? ` width="${size[1]}" height="${size[2]}"` : '';
    const titleAttr = title && !size ? ` title="${title}"` : '';
    return `<img src="${escapeHtml(safeUrl(src))}" alt="${alt}"${dims}${titleAttr} loading="lazy" decoding="async">`;
  });

  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const safe = safeUrl(href);
    // 站外 http(s) 链接新标签打开并阻断 window.opener；站内相对链接保持原地跳转
    const ext = /^https?:\/\//i.test(safe) ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${escapeHtml(safe)}"${ext}>${label}</a>`;
  });

  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');

  return t;
}

const RE_LIST_UL = /^[-*+]\s+/;
const RE_LIST_OL = /^\d+[.)]\s+/;
const RE_HEADING = /^(#{1,6})\s+/;
const RE_QUOTE = /^>\s?/;
const RE_RULE = /^(-{3,}|\*{3,}|_{3,})$/;
const RE_TABLE_DELIM = /^\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?$/;

function isBlockStart(line) {
  return (
    RE_HEADING.test(line) ||
    RE_QUOTE.test(line) ||
    RE_LIST_UL.test(line) ||
    RE_LIST_OL.test(line) ||
    RE_RULE.test(line) ||
    /^```/.test(line)
  );
}

/** 标题转锚点 slug，同文档内重复时追加 -2/-3 保证唯一 */
function slugifyHeading(raw, used) {
  const base = String(raw || '')
    .toLowerCase()
    .replace(/[`*_[\]()!]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'section';
  let id = base;
  let n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
}

/** GFM 管道表格：当前行含 | 且下一行是 --- 分隔行 */
function isTableStart(lines, i) {
  const a = lines[i] && lines[i].trim();
  const b = lines[i + 1] && lines[i + 1].trim();
  return Boolean(a) && a.includes('|') && Boolean(b) && RE_TABLE_DELIM.test(b);
}

function splitRow(line) {
  let s = String(line).trim().replace(/\\\|/g, '\u0001');
  if (s.charAt(0) === '|') s = s.slice(1);
  if (s.charAt(s.length - 1) === '|') s = s.slice(0, -1);
  return s.split('|').map((c) => c.replace(/\u0001/g, '|').trim());
}

function cellAlign(cell) {
  const c = String(cell).trim();
  const left = c.charAt(0) === ':';
  const right = c.charAt(c.length - 1) === ':';
  if (left && right) return 'center';
  if (right) return 'right';
  return 'left';
}

function renderTable(header, aligns, rows) {
  const alignAttr = (i) => (aligns[i] && aligns[i] !== 'left' ? ` style="text-align:${aligns[i]}"` : '');
  const th = header.map((cell, i) => `<th${alignAttr(i)}>${inline(cell)}</th>`).join('');
  const body = rows
    .map(
      (r) =>
        `<tr>${r
          .map((cell, i) => `<td${alignAttr(i)}>${inline(cell)}</td>`)
          .join('')}</tr>`
    )
    .join('');
  return `<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/** 抽取标题树（跳过代码块），供文章页 TOC 使用，id 与 render() 保持同一套规则 */
function headings(md) {
  const lines = String(md == null ? '' : md).replace(/\r\n?/g, '\n').split('\n');
  const used = new Set();
  const out = [];
  let inFence = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (!m) continue;
    out.push({ level: m[1].length, text: plain(m[2]), id: slugifyHeading(m[2], used) });
  }
  return out;
}

function render(md, ctx) {
  const context = ctx || { used: new Set() };
  const lines = String(md == null ? '' : md).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let listType = null;
  let i = 0;

  function closeList() {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  }

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    // 代码块
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      i++;
      const buf = [];
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        buf.push(lines[i]);
        i++;
      }
      i++; // 跳过结束的 ```
      closeList();
      out.push(
        `<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${escapeHtml(buf.join('\n'))}</code></pre>`
      );
      continue;
    }

    if (!line) {
      closeList();
      i++;
      continue;
    }

    if (RE_RULE.test(line)) {
      closeList();
      out.push('<hr>');
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      const id = slugifyHeading(heading[2], context.used);
      out.push(`<h${level} id="${id}">${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // GFM 表格
    if (isTableStart(lines, i)) {
      closeList();
      const header = splitRow(lines[i]);
      const aligns = splitRow(lines[i + 1]).map(cellAlign);
      i += 2;
      const rows = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        lines[i].includes('|') &&
        !RE_HEADING.test(lines[i].trim()) &&
        !/^```/.test(lines[i].trim())
      ) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push(renderTable(header, aligns, rows));
      continue;
    }

    if (RE_QUOTE.test(line)) {
      const buf = [];
      while (i < lines.length && RE_QUOTE.test(lines[i].trim())) {
        buf.push(lines[i].trim().replace(RE_QUOTE, ''));
        i++;
      }
      closeList();
      out.push(`<blockquote>${render(buf.join('\n'), context)}</blockquote>`);
      continue;
    }

    const ul = line.match(RE_LIST_UL);
    const ol = line.match(RE_LIST_OL);
    if (ul || ol) {
      const want = ul ? 'ul' : 'ol';
      if (listType !== want) {
        closeList();
        out.push(`<${want}>`);
        listType = want;
      }
      const content = line.replace(ul ? RE_LIST_UL : RE_LIST_OL, '');
      out.push(`<li>${inline(content)}</li>`);
      i++;
      continue;
    }

    // 段落：合并连续非块起始行
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isBlockStart(lines[i].trim()) &&
      !isTableStart(lines, i)
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    closeList();
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }

  closeList();
  return out.join('\n');
}

/** 去掉标记取纯文本，用于摘要/字数统计 */
function plain(md) {
  return String(md == null ? '' : md)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(md) {
  const text = plain(md);
  if (!text) return 0;
  return text.split(/\s+/).length;
}

/** 阅读时长：按 200 词/分钟粗估 */
function readMinutes(md) {
  return Math.max(1, Math.round(wordCount(md) / 200));
}

module.exports = { render, inline, escapeHtml, plain, wordCount, readMinutes, safeUrl, headings, slugifyHeading };
