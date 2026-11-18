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

  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => {
    return `<img src="${escapeHtml(safeUrl(src))}" alt="${alt}" loading="lazy" decoding="async">`;
  });

  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    return `<a href="${escapeHtml(safeUrl(href))}">${label}</a>`;
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

function render(md) {
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
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (RE_QUOTE.test(line)) {
      const buf = [];
      while (i < lines.length && RE_QUOTE.test(lines[i].trim())) {
        buf.push(lines[i].trim().replace(RE_QUOTE, ''));
        i++;
      }
      closeList();
      out.push(`<blockquote>${render(buf.join('\n'))}</blockquote>`);
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
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i].trim())) {
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

module.exports = { render, inline, escapeHtml, plain, wordCount, readMinutes, safeUrl };
