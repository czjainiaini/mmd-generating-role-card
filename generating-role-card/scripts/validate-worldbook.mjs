#!/usr/bin/env node
// 校验独立世界书导入 JSON。零依赖。

import { readFileSync } from 'node:fs';
import path from 'node:path';

const REQUIRED = [
  'comment', 'disable', 'constant', 'position', 'role', 'depth', 'order',
  'probability', 'key', 'keysecondary', 'content', 'uid',
];

let errors = 0;
let warnings = 0;

function err(where, message) {
  errors += 1;
  console.error(`ERROR ${where}: ${message}`);
}

function warn(where, message) {
  warnings += 1;
  console.warn(`WARN ${where}: ${message}`);
}

function parseKeys(where, field, value) {
  if (typeof value !== 'string') {
    err(where, `${field} 必须是 JSON 字符串，不能直接写数组`);
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
      err(where, `${field} 解码后必须是字符串数组`);
      return [];
    }
    if (parsed.some((item) => !item.trim())) warn(where, `${field} 含空关键词`);
    if (new Set(parsed).size !== parsed.length) warn(where, `${field} 含重复关键词`);
    return parsed;
  } catch (error) {
    err(where, `${field} 不是有效 JSON 字符串：${error.message}`);
    return [];
  }
}

function openingTagName(body) {
  const value = String(body ?? '').trim();
  if (/^角色设定\s+名字[：:]/.test(value)) return '角色设定';
  return value;
}

function checkClosedChapterTags(where, text) {
  const stack = [];
  let openings = 0;
  String(text ?? '').split(/\r?\n/).forEach((line, index) => {
    const match = /^\s*<([^<>]+)>\s*$/.exec(line);
    if (!match) return;
    const body = match[1].trim();
    if (!body || body.startsWith('!') || body.startsWith('?')) return;
    if (body.startsWith('/')) {
      const closing = body.slice(1).trim();
      const expected = stack.pop();
      if (!expected) err(where, `第 ${index + 1} 行出现多余闭合标签 </${closing}>`);
      else if (closing !== expected)
        err(where, `第 ${index + 1} 行闭合标签 </${closing}> 与待闭合的 <${expected}> 不匹配`);
      return;
    }
    if (body.endsWith('/')) return;
    stack.push(openingTagName(body));
    openings += 1;
  });
  if (stack.length) err(where, `章节标签未闭合：${stack.map((name) => `<${name}>`).join('、')}`);
  if (!openings) err(where, 'content 必须至少包含一组成对章节标签');
}

function main() {
  const target = process.argv[2];
  if (!target || target === '--help' || target === '-h') {
    console.log('用法: node validate-worldbook.mjs <worldbook.json>');
    process.exit(target ? 0 : 2);
  }

  let data;
  try {
    data = JSON.parse(readFileSync(path.resolve(target), 'utf8'));
  } catch (error) {
    console.error(`JSON 读不了或解析失败: ${error.message}`);
    process.exit(1);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    console.error('顶层不是对象');
    process.exit(1);
  }
  const topKeys = Object.keys(data);
  if (topKeys.length !== 1 || topKeys[0] !== 'entries') {
    err('顶层', '独立世界书根对象只能包含 entries');
  }
  if (!data.entries || typeof data.entries !== 'object' || Array.isArray(data.entries)) {
    err('顶层', 'entries 必须是对象映射，不能是数组');
    return report();
  }

  const rows = Object.entries(data.entries);
  if (!rows.length) err('顶层', 'entries 不能为空');
  const uids = new Map();

  rows.forEach(([id, entry], index) => {
    const where = `条目 ${id}`;
    if (!/^\d+$/.test(id)) warn(where, '映射键建议使用连续数字字符串');
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      err(where, '条目必须是对象');
      return;
    }
    REQUIRED.forEach((field) => {
      if (!(field in entry)) err(where, `缺少字段 ${field}`);
    });
    Object.keys(entry).forEach((field) => {
      if (!REQUIRED.includes(field)) warn(where, `多余字段 ${field}`);
    });
    if (typeof entry.comment !== 'string' || !entry.comment.trim()) err(where, 'comment 必须是非空字符串');
    if (typeof entry.disable !== 'boolean') err(where, 'disable 必须是 boolean');
    if (typeof entry.constant !== 'boolean') err(where, 'constant 必须是 boolean');
    for (const field of ['position', 'role', 'depth', 'order', 'uid']) {
      if (!Number.isInteger(entry[field])) err(where, `${field} 必须是整数`);
    }
    if (typeof entry.probability !== 'string' || !/^\d+(?:\.\d{2})$/.test(entry.probability)) {
      err(where, 'probability 必须是两位小数字符串，例如 "100.00"');
    } else if (Number(entry.probability) < 0 || Number(entry.probability) > 100) {
      err(where, 'probability 必须在 0.00–100.00');
    }
    const keys = parseKeys(where, 'key', entry.key);
    parseKeys(where, 'keysecondary', entry.keysecondary);
    if (entry.constant === false && keys.length === 0) warn(where, '条件条目没有主关键词，可能永远不会触发');
    if (entry.constant === true && keys.length > 0) warn(where, '常驻条目仍配置了主关键词，请确认是否需要 constant: false');
    if (typeof entry.content !== 'string' || !entry.content.trim()) err(where, 'content 必须是非空字符串');
    else checkClosedChapterTags(where, entry.content);
    if (/\$#char#\$|\$#user#\$|\{\{char\}\}/.test(String(entry.content ?? ''))) {
      err(where, 'content 含旧占位符；角色写真名，玩家只用 {{user}}');
    }
    if (Number.isInteger(entry.uid)) {
      if (uids.has(entry.uid)) err(where, `uid ${entry.uid} 与条目 ${uids.get(entry.uid)} 重复`);
      else uids.set(entry.uid, id);
    }
    if (entry.disable === true) warn(where, '条目当前停用；导入后不会生效');
    if (index > 10000) err('顶层', '条目数量异常');
  });

  return report();
}

function report() {
  console.log(`\n${errors} error, ${warnings} warn`);
  process.exit(errors ? 1 : 0);
}

main();
