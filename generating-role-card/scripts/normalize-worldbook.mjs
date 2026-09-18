#!/usr/bin/env node
// 把常见 lorebook / worldbook JSON 规范成独立世界书导入格式。零依赖。

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function usage() {
  console.log('用法: node normalize-worldbook.mjs --in <source.json> --out <worldbook.json> [--character <真实角色名>] [--repair-tags]');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--help' || key === '-h') return { help: true };
    if (key === '--repair-tags') {
      args.repairTags = true;
      continue;
    }
    if (!['--in', '--out', '--character'].includes(key)) throw new Error(`不认识的参数 ${key}`);
    if (!key.startsWith('--')) throw new Error(`不认识的参数 ${key}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`${key} 缺值`);
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

function integer(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean' || (typeof value === 'string' && !value.trim()))
    throw new Error('整数配置不能是空白或布尔值');
  const number = Number(value);
  if (!Number.isInteger(number)) throw new Error(`无效整数配置 ${value}`);
  return number;
}

function boolean(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new Error(`开关值无法判断：${value}`);
}

const KNOWN_FIELDS = new Set(
  'comment title name id _sourceId disable enabled constant alwaysActive always_active position role depth order priority probability key keys keywords keysecondary secondaryKeys secondary_keys content text value description uid'.split(' '),
);

function assertKnown(entry) {
  for (const field of Object.keys(entry)) {
    if (!KNOWN_FIELDS.has(field))
      throw new Error(`未知扩展字段 ${field}；停止转换以免丢失配置，请先确认目标导入协议`);
  }
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
  if (!Array.isArray(data) && data && typeof data === 'object') {
    const extra = Object.keys(data).filter((key) => key !== 'entries');
    if (extra.length) throw new Error(`未知根字段 ${extra.join('、')}；停止转换以免丢失配置`);
  }
  const source = Array.isArray(data) ? data : data?.entries;
  if (Array.isArray(source)) {
    return source.map((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`条目 ${index} 不是对象`);
      return { _sourceId: index, ...entry };
    });
  }
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
  if (typeof value === 'boolean' || value === '' || !Number.isFinite(number) || number < 0 || number > 100)
    throw new Error(`无效概率 ${value}；应为 0–100`);
  return number.toFixed(2);
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
  const reservedUids = new Set(
    rawEntries
      .filter((entry) => entry.uid != null)
      .map((entry) => integer(entry.uid, -1))
      .filter((value) => value >= 0),
  );

  function uidFor(entry) {
    const preferred = integer(entry.uid, -1);
    if (preferred >= 0 && !usedUids.has(preferred)) {
      usedUids.add(preferred);
      nextUid = Math.max(nextUid, preferred + 1);
      return preferred;
    }
    while (usedUids.has(nextUid) || reservedUids.has(nextUid)) nextUid += 1;
    const value = nextUid;
    usedUids.add(value);
    nextUid += 1;
    return value;
  }

  const normalized = [];
  rawEntries.forEach((entry, index) => {
    assertKnown(entry);
    const rawContent = normalizeText(entry.content ?? entry.text ?? entry.value ?? entry.description, character);
    if (!rawContent) throw new Error(`条目 ${index} 内容为空；停止转换，避免静默丢条目`);
    const keys = keyList(entry.key ?? entry.keys ?? entry.keywords);
    const secondaryKeys = keyList(entry.keysecondary ?? entry.secondaryKeys ?? entry.secondary_keys);
    const explicitConstant = entry.constant ?? entry.alwaysActive ?? entry.always_active;
    const constant = boolean(explicitConstant, keys.length === 0);
    const comment = normalizeText(
      entry.comment ?? entry.title ?? entry.name ?? entry.id ?? entry._sourceId ?? `设定 ${index + 1}`,
      character,
    ).replace(/[\r\n]+/g, ' ');
    const content = args.repairTags
      ? ensureClosedChapterTags(rawContent, comment || `设定 ${index + 1}`)
      : rawContent;
    const disable = boolean(entry.disable, !boolean(entry.enabled, true));
    normalized.push({
      comment: comment || `设定 ${index + 1}`,
      disable,
      constant,
      position: integer(entry.position, 4),
      role: integer(entry.role, 0),
      depth: integer(entry.depth, 4),
      order: integer(entry.order ?? entry.priority, constant ? 9999 : 0),
      probability: probability(entry.probability),
      key: JSON.stringify(keys),
      keysecondary: JSON.stringify(secondaryKeys),
      content,
      uid: uidFor(entry),
    });
  });

  if (!normalized.length) throw new Error('没有可输出的非空世界书条目');
  const output = { entries: Object.fromEntries(normalized.map((entry, index) => [String(index), entry])) };
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`OK 输出 ${normalized.length} 条；保留全部非空条目；根字段 entries`);
}

try {
  main();
} catch (error) {
  console.error(`ERROR ${error.message}`);
  process.exit(1);
}
