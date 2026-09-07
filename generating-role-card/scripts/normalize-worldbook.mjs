#!/usr/bin/env node
// 把常见 lorebook / worldbook JSON 规范成独立世界书导入格式。零依赖。

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function usage() {
  console.log('用法: node normalize-worldbook.mjs --in <source.json> --out <worldbook.json> [--character <真实角色名>]');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--help' || key === '-h') return { help: true };
    if (!key.startsWith('--')) throw new Error(`不认识的参数 ${key}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`${key} 缺值`);
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

function integer(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

function keyList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item ?? '').trim()).filter(Boolean))];
  }
  if (typeof value === 'string') {
    const source = value.trim();
    if (!source) return [];
    try {
      const parsed = JSON.parse(source);
      if (Array.isArray(parsed)) return keyList(parsed);
    } catch {
      // 普通单关键词字符串继续走下方。
    }
    return [source];
  }
  return value == null ? [] : [String(value).trim()].filter(Boolean);
}

function entriesFrom(data) {
  const source = Array.isArray(data) ? data : data?.entries;
  if (Array.isArray(source)) return source.map((entry, index) => ({ _sourceId: index, ...entry }));
  if (source && typeof source === 'object') {
    return Object.entries(source).map(([id, entry]) =>
      entry && typeof entry === 'object' && !Array.isArray(entry)
        ? { _sourceId: id, ...entry }
        : { _sourceId: id, content: entry },
    );
  }
  throw new Error('没有找到 entries 数组 / 对象');
}

function normalizeText(value, character) {
  let text = String(value ?? '').replace(/\r/g, '').trim();
  text = text.replaceAll('$#user#$', '{{user}}');
  if (character) {
    text = text.replaceAll('$#char#$', character).replaceAll('{{char}}', character);
  }
  if (/\$#char#\$|\$#user#\$|\{\{char\}\}/.test(text)) {
    throw new Error('存在旧角色占位符；请传入 --character <真实角色名>');
  }
  return text;
}

function safeTagName(value, fallback = '世界设定') {
  const name = String(value ?? '')
    .replace(/[<>\r\n]/g, '')
    .replace(/^\/+/, '')
    .trim();
  return name || fallback;
}

function openingTagName(body) {
  const value = String(body ?? '').trim();
  if (/^角色设定\s+名字[：:]/.test(value)) return '角色设定';
  return value;
}

function assertBalancedTags(text) {
  const stack = [];
  String(text ?? '').split(/\r?\n/).forEach((line, index) => {
    const match = /^\s*<([^<>]+)>\s*$/.exec(line);
    if (!match) return;
    const body = match[1].trim();
    if (!body || body.startsWith('!') || body.startsWith('?') || body.endsWith('/')) return;
    if (body.startsWith('/')) {
      const closing = body.slice(1).trim();
      const expected = stack.pop();
      if (!expected || closing !== expected)
        throw new Error(`第 ${index + 1} 行闭合标签 </${closing}> 与章节结构不匹配`);
      return;
    }
    stack.push(openingTagName(body));
  });
  if (stack.length) throw new Error(`章节标签未闭合：${stack.join('、')}`);
}

function ensureClosedChapterTags(text, fallbackTitle) {
  const source = String(text ?? '').trim();
  const lines = source.split(/\r?\n/);
  const tagLines = lines.filter((line) => /^\s*<[^<>]+>\s*$/.test(line));
  const hasClosing = tagLines.some((line) => /^\s*<\//.test(line));
  if (hasClosing) {
    assertBalancedTags(source);
    return source;
  }
  const openingLines = tagLines.filter((line) => !/^\s*<\//.test(line));
  if (!openingLines.length) {
    const name = safeTagName(fallbackTitle);
    return `<${name}>\n${source}\n</${name}>`;
  }

  const output = [];
  const stack = [];
  let activeContainer = '';
  lines.forEach((line) => {
    const match = /^\s*<([^<>]+)>\s*$/.exec(line);
    if (!match) {
      output.push(line);
      return;
    }
    const name = openingTagName(match[1].trim());
    const isContainer = name === '角色设定' || name === '补充世界设定';
    if (isContainer) {
      while (stack.length) output.push(`</${stack.pop()}>`);
      activeContainer = name;
    } else if (activeContainer && stack[0] === activeContainer) {
      while (stack.length > 1) output.push(`</${stack.pop()}>`);
    } else {
      while (stack.length) output.push(`</${stack.pop()}>`);
    }
    output.push(line.trim());
    stack.push(name);
  });
  while (stack.length) output.push(`</${stack.pop()}>`);
  const result = output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  assertBalancedTags(result);
  return result;
}

function probability(value) {
  const number = Number(value ?? 100);
  if (!Number.isFinite(number)) return '100.00';
  return Math.max(0, Math.min(100, number)).toFixed(2);
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`ERROR ${error.message}`);
    usage();
    process.exit(2);
  }
  if (args.help) return usage();
  if (!args.in || !args.out) {
    usage();
    process.exit(2);
  }

  const inputPath = path.resolve(args.in);
  const outputPath = path.resolve(args.out);
  const character = String(args.character ?? '').trim();
  const source = JSON.parse(readFileSync(inputPath, 'utf8'));
  const rawEntries = entriesFrom(source);
  const usedUids = new Set();
  let nextUid = 0;
  let skipped = 0;

  function uidFor(entry) {
    const preferred = integer(entry.uid, -1);
    if (preferred >= 0 && !usedUids.has(preferred)) {
      usedUids.add(preferred);
      nextUid = Math.max(nextUid, preferred + 1);
      return preferred;
    }
    while (usedUids.has(nextUid)) nextUid += 1;
    const value = nextUid;
    usedUids.add(value);
    nextUid += 1;
    return value;
  }

  const normalized = [];
  rawEntries.forEach((entry, index) => {
    const rawContent = normalizeText(entry.content ?? entry.text ?? entry.value ?? entry.description, character);
    if (!rawContent) {
      skipped += 1;
      return;
    }
    const keys = keyList(entry.key ?? entry.keys ?? entry.keywords);
    const secondaryKeys = keyList(entry.keysecondary ?? entry.secondaryKeys ?? entry.secondary_keys);
    const explicitConstant = entry.constant ?? entry.alwaysActive ?? entry.always_active;
    const constant = typeof explicitConstant === 'boolean' ? explicitConstant : keys.length === 0;
    const comment = normalizeText(
      entry.comment ?? entry.title ?? entry.name ?? entry.id ?? entry._sourceId ?? `设定 ${index + 1}`,
      character,
    ).replace(/[\r\n]+/g, ' ');
    const content = ensureClosedChapterTags(rawContent, comment || `设定 ${index + 1}`);
    const disable = typeof entry.disable === 'boolean' ? entry.disable : entry.enabled === false;
    normalized.push({
      comment: comment || `设定 ${index + 1}`,
      disable,
      constant,
      position: integer(entry.position, 4),
      role: integer(entry.role, 0),
      depth: integer(entry.depth, 4),
      order: integer(entry.order ?? entry.priority, constant ? 9999 : 0),
      probability: probability(entry.probability),
      key: JSON.stringify(constant ? [] : keys),
      keysecondary: JSON.stringify(constant ? [] : secondaryKeys),
      content,
      uid: uidFor(entry),
    });
  });

  if (!normalized.length) throw new Error('没有可输出的非空世界书条目');
  const output = { entries: Object.fromEntries(normalized.map((entry, index) => [String(index), entry])) };
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`OK 输出 ${normalized.length} 条；跳过空条目 ${skipped} 条；根字段 entries`);
}

try {
  main();
} catch (error) {
  console.error(`ERROR ${error.message}`);
  process.exit(1);
}
