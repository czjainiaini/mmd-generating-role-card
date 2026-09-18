#!/usr/bin/env node
// 在目标入口不支持独立世界书时，把启用条目压进标签化 personality。零依赖。

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function usage() {
  console.log('用法: node pack-worldbook.mjs --persona <persona.txt> --worldbook <worldbook.json> --out <packed.txt> [--character <角色名>] [--limit 9500] [--allow-partial]');
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--help' || key === '-h') return { help: true };
    if (key === '--allow-partial') {
      args.allowPartial = true;
      continue;
    }
    if (!['--persona', '--worldbook', '--out', '--character', '--limit'].includes(key))
      throw new Error(`不认识的参数 ${key}`);
    if (!key.startsWith('--')) throw new Error(`不认识的参数 ${key}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`${key} 缺值`);
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

function compact(value) {
  return String(value ?? '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function tagName(value, fallback = '补充设定') {
  const clean = compact(value)
    .replace(/[<>\r\n]/g, '')
    .replace(/^【|】$/g, '')
    .trim();
  return clean || fallback;
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

function ensureClosedChapterTags(text, fallback = '补充设定') {
  const source = compact(text);
  const lines = source.split(/\r?\n/);
  const tagLines = lines.filter((line) => /^\s*<[^<>]+>\s*$/.test(line));
  if (tagLines.some((line) => /^\s*<\//.test(line))) {
    assertBalancedTags(source);
    return source;
  }
  const openingLines = tagLines.filter((line) => !/^\s*<\//.test(line));
  if (!openingLines.length) {
    const name = tagName(fallback);
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
  const result = compact(output.join('\n'));
  assertBalancedTags(result);
  return result;
}

function entryArray(data) {
  const source = Array.isArray(data) ? data : data?.entries;
  if (Array.isArray(source)) return source;
  if (source && typeof source === 'object') {
    return Object.entries(source).map(([id, value]) =>
      value && typeof value === 'object' ? { id, ...value } : { id, content: value },
    );
  }
  throw new Error('世界书 JSON 里没找到 entries 数组 / 对象');
}

function keyList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean);
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

function normalizeEntry(entry, index) {
  const content = compact(entry?.content ?? entry?.text ?? entry?.value ?? entry?.description);
  const rawKeys = entry?.keys ?? entry?.keywords ?? entry?.key;
  const keys = keyList(rawKeys);
  const secondaryKeys = keyList(entry?.keysecondary ?? entry?.secondaryKeys ?? entry?.secondary_keys);
  const title = tagName(entry?.title ?? entry?.name ?? entry?.comment ?? entry?.id ?? keys[0], `设定 ${index + 1}`);
  const priority = Number(entry?.priority ?? entry?.order ?? entry?.position ?? 0) || 0;
  const constant = entry?.constant === true || entry?.alwaysActive === true || entry?.always_active === true;
  const disabled = entry?.disable === true || entry?.enabled === false;
  const probability = Math.max(0, Math.min(100, Number(entry?.probability ?? 100) || 0));
  return { title, content, priority, constant, disabled, probability, keys, secondaryKeys, index };
}

function normalizePersona(raw, explicitCharacter) {
  let persona = compact(raw).replace(/^【([^】\r\n]+)】$/gm, '<$1>');
  const taggedCharacter = persona.match(/^<角色设定\s+名字[：:]\s*([^>\r\n]+)>$/m)?.[1]?.trim();
  const character = compact(explicitCharacter || taggedCharacter);

  persona = persona.replaceAll('$#user#$', '{{user}}');
  if (character) persona = persona.replaceAll('$#char#$', character).replaceAll('{{char}}', character);
  if (/\$#char#\$/.test(persona)) {
    throw new Error('原人设仍含 $#char#$，请传入 --character <真实角色名>');
  }
  if (/\$#user#\$|\{\{char\}\}/.test(persona)) {
    throw new Error('原人设仍含旧占位符，请改用真实角色名与 {{user}}');
  }
  if (!taggedCharacter) {
    if (!character) throw new Error('人设缺少 <角色设定 名字：真实角色名>，且未传入 --character');
    persona = `<角色设定 名字：${character}>\n${persona}\n</角色设定>`;
  }
  persona = ensureClosedChapterTags(persona, `角色设定 名字：${character}`);
  return { persona, character };
}

function normalizeContent(content, character) {
  let normalized = compact(content).replace(/^【([^】\r\n]+)】$/gm, '<$1>');
  normalized = normalized.replaceAll('$#user#$', '{{user}}');
  if (character) normalized = normalized.replaceAll('$#char#$', character).replaceAll('{{char}}', character);
  if (/\$#char#\$|\$#user#\$|\{\{char\}\}/.test(normalized)) {
    throw new Error('世界书条目含无法转换的旧占位符');
  }
  return normalized;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    usage();
    process.exit(2);
  }
  if (args.help) {
    usage();
    return;
  }
  if (!args.persona || !args.worldbook || !args.out) {
    usage();
    process.exit(2);
  }

  const limit = Math.min(10000, Math.max(500, Number(args.limit ?? 9500) || 9500));
  const personaPath = path.resolve(args.persona);
  const worldbookPath = path.resolve(args.worldbook);
  const outPath = path.resolve(args.out);
  const normalizedPersona = normalizePersona(readFileSync(personaPath, 'utf8'), args.character);
  const persona = normalizedPersona.persona;
  const character = normalizedPersona.character;
  const worldbook = JSON.parse(readFileSync(worldbookPath, 'utf8'));

  if (
    !worldbook ||
    typeof worldbook !== 'object' ||
    Array.isArray(worldbook) ||
    Object.keys(worldbook).some((key) => key !== 'entries')
  ) {
    throw new Error('请先规范化为根节点仅有 entries 的独立世界书');
  }
  const allowedFields = new Set(
    'comment disable constant position role depth order probability key keysecondary content uid'.split(' '),
  );
  for (const entry of entryArray(worldbook)) {
    for (const key of Object.keys(entry)) {
      if (key !== 'id' && !allowedFields.has(key))
        throw new Error(`未知扩展字段 ${key}；不能丢弃其条件后压入人设`);
    }
    if (
      typeof entry.disable !== 'boolean' ||
      typeof entry.constant !== 'boolean' ||
      typeof entry.probability !== 'string' ||
      !/^\d+\.\d{2}$/.test(entry.probability) ||
      Number(entry.probability) < 0 ||
      Number(entry.probability) > 100 ||
      typeof entry.content !== 'string' ||
      !entry.content.trim()
    ) {
      throw new Error('请先规范化并校验世界书，不能猜测开关、概率或空内容');
    }
  }

  if (persona.length > limit) throw new Error(`原人设 ${persona.length} 字，已经超过目标上限 ${limit}`);

  const normalizedEntries = entryArray(worldbook)
    .map(normalizeEntry)
    .map((entry) => {
      const title = tagName(normalizeContent(entry.title, character), `设定 ${entry.index + 1}`);
      const content = ensureClosedChapterTags(normalizeContent(entry.content, character), title);
      return { ...entry, title, content };
    })
    .filter((entry) => entry.content);
  const disabledEntries = normalizedEntries.filter((entry) => entry.disabled || entry.probability === 0);
  const entries = normalizedEntries
    .filter((entry) => !entry.disabled && entry.probability > 0)
    .sort((a, b) => Number(b.constant) - Number(a.constant) || b.priority - a.priority || a.index - b.index);

  const seen = new Set();
  const selected = [];
  const skipped = disabledEntries.map((entry) => `${entry.title}（停用或零概率）`);
  const omitted = [];
  if (!/^<角色设定\s+名字[：:]\s*[^>\r\n]+>\n[\s\S]*\n<\/角色设定>$/.test(persona))
    throw new Error('请先将完整人设整理成一个角色主标签根节点');
  const personaPrefix = persona.slice(0, -'</角色设定>'.length).trimEnd();
  const personaClose = '\n</角色设定>';
  const blocks = [];
  const headingOpen = '\n\n<补充世界设定>\n';
  const headingClose = '\n</补充世界设定>';

  for (const entry of entries) {
    const ownHeading = `<${entry.title}>`;
    const ownClosing = `</${openingTagName(entry.title)}>`;
    const content = entry.content.startsWith(`${ownHeading}\n`) && entry.content.endsWith(`\n${ownClosing}`)
      ? entry.content.slice(ownHeading.length + 1, -ownClosing.length - 1).trim()
      : entry.content;
    const signature = JSON.stringify([
      content.replace(/\s+/g, ''),
      entry.constant,
      entry.keys,
      entry.secondaryKeys,
      entry.probability,
    ]);
    if (seen.has(signature)) {
      skipped.push(entry.title);
      continue;
    }
    seen.add(signature);
    const primary = entry.keys.length ? `主要关键词任意一个（${entry.keys.join('、')}）` : '';
    const secondary = entry.secondaryKeys.length ? `次要关键词组（${entry.secondaryKeys.join('、')}）` : '';
    const triggerNote = entry.constant
      ? ''
      : primary
        ? `- 触发条件：近期对话满足${primary}${secondary ? `，并且同时满足${secondary}` : ''}时参考本节。\n`
        : '- 触发条件：原条目为非常驻且无主关键词，原触发行为不可等价保留，只在用户明确提及时参考。\n';
    const probabilityNote = entry.probability < 100
      ? `- 原触发概率：${entry.probability.toFixed(2)}%；文字说明不能执行平台概率采样，不应视为每轮必然生效。\n`
      : '';
    const body = `${triggerNote}${probabilityNote}${content}`.trim();
    const blockOpen = `<${entry.title}>\n`;
    const blockClose = `\n</${openingTagName(entry.title)}>`;
    const block = `${blockOpen}${body}${blockClose}`;
    const separatorLength = blocks.length ? 2 : 0;
    const used = personaPrefix.length + personaClose.length + headingOpen.length + headingClose.length + blocks.join('\n\n').length;
    if (used + separatorLength + block.length <= limit) {
      blocks.push(block);
      selected.push(entry.title);
      continue;
    }

    omitted.push(entry.title);
    skipped.push(`${entry.title}（超出长度）`);
  }

  if (omitted.length && !args.allowPartial)
    throw new Error(`长度不足，以下条目未合并：${omitted.join('、')}。先做语义压缩；明确允许部分合并时才加 --allow-partial`);
  if (!selected.length) throw new Error('没有可合并的世界设定条目');
  const output = `${personaPrefix}${headingOpen}${blocks.join('\n\n')}${headingClose}${personaClose}`;
  if (!/{{user}}/.test(output)) console.warn('WARN 合并后人设没有 {{user}}，请确认设定是否需要指代玩家');
  if (/\$#char#\$|\$#user#\$|\{\{char\}\}/.test(output)) {
    throw new Error('合并结果含旧占位符');
  }
  assertBalancedTags(output);

  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${output}\n`);
  console.warn('WARN 压入人设仅保留文字设定，不能等价保留平台触发、概率和插入机制');
  console.log(`OK ${output.length}/${limit} 字；角色 ${character}；合并 ${selected.length} 条；跳过 ${skipped.length} 条`);
  console.log(`INCLUDED ${selected.join(' | ')}`);
  if (skipped.length) console.log(`SKIPPED ${skipped.join(' | ')}`);
}

try {
  main();
} catch (error) {
  console.error(`ERROR ${error.message}`);
  process.exit(1);
}
