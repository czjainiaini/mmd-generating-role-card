#!/usr/bin/env node
/**
 * 把手册打成一份可点的 PDF：目录 / 章间链接跳到对应标题，侧边书签跟标题走。
 *
 * 用法：
 *   node .cursor/skills/generating-role-card/authoring/scripts/export-pdf.mjs
 *   node .cursor/skills/generating-role-card/authoring/scripts/export-pdf.mjs --out /tmp/手册.pdf
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHAPTERS = ['README.md', '01-style.md', '02-script.md', '03-dom.md', '04-sdk.md', 'reference.md'];

function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\p{Mark}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

function headingText(raw) {
  return raw.replace(/[`*_~]/g, '').trim();
}

function firstHeadingSlug(md) {
  const m = /^#\s+(.+)$/m.exec(md);
  if (!m) throw new Error('缺一级标题');
  return slugify(headingText(m[1]));
}

function rewriteChapterLinks(md, fileToSlug) {
  return md
    .replace(/\]\(([^)\s]+\.md)(#[^)]*)?\)/g, (full, file) => {
      const base = file.split('/').pop();
      const slug = fileToSlug.get(base);
      return slug ? `](#${slug})` : full;
    })
    .replace(/\[(`?[^\]`]+`?)\]\(([^)\s]+)\)/g, (full, text, href) => {
      if (href.startsWith('#') || /^(https?:|mailto:)/i.test(href)) return full;
      return text.startsWith('`') ? text : `\`${text}\``;
    });
}

function stripNoise(md) {
  return md
    .replace(/^<!-- GENERATED\. Do not edit\. -->\n?/m, '')
    .replace(/^<!-- 由 .* -->\n?/m, '')
    .replace(/^<!-- fixture:[A-Za-z0-9-]+ -->\n?/gm, '')
    .replace(/可点的 PDF：.*\n/, '');
}

function buildMarkdown() {
  const bodies = CHAPTERS.map((name) => ({
    name,
    text: stripNoise(readFileSync(join(root, name), 'utf8')),
  }));
  const fileToSlug = new Map(bodies.map(({ name, text }) => [name, firstHeadingSlug(text)]));
  return bodies.map(({ text }) => rewriteChapterLinks(text, fileToSlug)).join('\n\n');
}

function renderHtml(md) {
  const used = new Map();
  const mdit = new MarkdownIt({ html: false, linkify: false, breaks: false });
  mdit.core.ruler.push('heading-ids', (state) => {
    for (const token of state.tokens) {
      if (token.type !== 'heading_open') continue;
      const inline = state.tokens[state.tokens.indexOf(token) + 1];
      const text = inline?.children?.map((c) => c.content).join('') ?? '';
      let id = slugify(headingText(text)) || 'section';
      const n = used.get(id) ?? 0;
      used.set(id, n + 1);
      if (n > 0) id = `${id}-${n + 1}`;
      token.attrSet('id', id);
    }
  });

  const body = mdit.render(md);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>角色卡制作手册</title>
<style>
  @page { size: A4; margin: 18mm 16mm 20mm; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: "PingFang SC", "Hiragino Sans GB", "Songti SC", "Noto Sans CJK SC", sans-serif;
    font-size: 11.5pt;
    line-height: 1.55;
    color: #1a1a1a;
  }
  h1 { font-size: 22pt; margin: 0 0 0.8em; break-after: avoid; }
  h1:not(:first-of-type) { break-before: page; padding-top: 0.2em; }
  h2 { font-size: 15pt; margin: 1.4em 0 0.5em; break-after: avoid; }
  h3 { font-size: 12.5pt; margin: 1.1em 0 0.4em; break-after: avoid; }
  p, li { orphans: 3; widows: 3; }
  a { color: #0b57d0; text-decoration: underline; }
  code, pre {
    font-family: "SF Mono", Menlo, Monaco, "Courier New", monospace;
    font-size: 9.5pt;
  }
  code { background: #f4f4f5; padding: 0.1em 0.3em; border-radius: 3px; }
  pre {
    background: #f4f4f5;
    padding: 10px 12px;
    border-radius: 6px;
    white-space: pre-wrap;
    word-break: break-word;
    break-inside: avoid;
  }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; font-size: 10pt; margin: 0.8em 0; }
  th, td { border: 1px solid #d4d4d8; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f4f4f5; }
  blockquote { margin: 0.8em 0; padding-left: 0.8em; border-left: 3px solid #d4d4d8; color: #3f3f46; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

const outArg = process.argv.indexOf('--out');
const outPath =
  outArg >= 0 && process.argv[outArg + 1]
    ? process.argv[outArg + 1]
    : join(root, '角色卡制作手册.pdf');

const html = renderHtml(buildMarkdown());
const htmlPath = join(mkdtempSync(join(tmpdir(), 'authoring-pdf-')), 'handbook.html');
writeFileSync(htmlPath, html);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: 'load' });
  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    tagged: true,
    outline: true,
    margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
    displayHeaderFooter: true,
    headerTemplate: `<div></div>`,
    footerTemplate: `<div style="width:100%;font-size:9px;font-family:PingFang SC,sans-serif;color:#71717a;padding:0 14mm;display:flex;justify-content:space-between;">
      <span>角色卡制作手册</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`,
  });
} finally {
  await browser.close();
}

console.log(`PDF: ${outPath}`);
