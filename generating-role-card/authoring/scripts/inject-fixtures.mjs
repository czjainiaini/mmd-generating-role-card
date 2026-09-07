#!/usr/bin/env node
/**
 * 把 `authoring/fixtures/` 里的夹具正文灌进手册的代码围栏。
 *
 * 手册里的每段示例都必须先是一个**真跑得起来的文件**：手写在 md 里的代码没有任何
 * 东西验，能力改名之后它照样躺在那里，作者抄走才发现调不通。
 *
 * 用法：
 *   node .cursor/skills/generating-role-card/authoring/scripts/inject-fixtures.mjs
 *   node .cursor/skills/generating-role-card/authoring/scripts/inject-fixtures.mjs --check
 *
 * 标记写法（md 里）：
 *   <!-- fixture:hello-mount -->
 *   ```js
 *   （这里的内容由本脚本覆盖）
 *   ```
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixturesDir = join(root, 'fixtures');

const fixtures = new Map();
for (const file of readdirSync(fixturesDir)) {
  const dot = file.lastIndexOf('.');
  fixtures.set(file.slice(0, dot), { file, body: readFileSync(join(fixturesDir, file), 'utf8') });
}

const MARK = /^<!-- fixture:([A-Za-z0-9-]+) -->$/;

/** 返回 { text, missing[] }。围栏必须紧跟标记，中间只许空行。 */
export function injectInto(text) {
  const lines = text.split('\n');
  const out = [];
  const missing = [];
  for (let i = 0; i < lines.length; i += 1) {
    const mark = MARK.exec(lines[i]);
    out.push(lines[i]);
    if (!mark) continue;

    const name = mark[1];
    const fixture = fixtures.get(name);
    if (!fixture) {
      missing.push(name);
      continue;
    }

    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') {
      out.push(lines[j]);
      j += 1;
    }
    if (!lines[j]?.startsWith('```')) {
      missing.push(`${name}（标记后面没有围栏）`);
      i = j - 1;
      continue;
    }
    out.push(lines[j]);
    const close = lines.indexOf('```', j + 1);
    if (close === -1) {
      missing.push(`${name}（围栏没闭合）`);
      i = j;
      continue;
    }
    out.push(...fixture.body.replace(/\n$/, '').split('\n'));
    out.push('```');
    i = close;
  }
  return { text: out.join('\n'), missing };
}

const check = process.argv.includes('--check');
let drifted = 0;
let broken = 0;

for (const file of readdirSync(root)) {
  if (!file.endsWith('.md')) continue;
  const path = join(root, file);
  const before = readFileSync(path, 'utf8');
  const { text, missing } = injectInto(before);
  for (const name of missing) {
    console.error(`${file}: 找不到夹具 ${name}`);
    broken += 1;
  }
  if (text === before) continue;
  drifted += 1;
  if (check) {
    console.error(`${file}: 围栏正文与夹具不一致`);
    continue;
  }
  writeFileSync(path, text);
  console.log(`${file}: 已回填`);
}

if (broken > 0 || (check && drifted > 0)) process.exit(1);
