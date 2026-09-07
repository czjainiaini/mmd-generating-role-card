#!/usr/bin/env node
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderReference } from '../generating-role-card/authoring/scripts/generate-reference.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillRoot = join(repoRoot, 'generating-role-card');
const failures = [];
const required = [
  'SKILL.md',
  'agents/openai.yaml',
  'authoring/contract.json',
  'authoring/reference.md',
  'references/workflows.md',
  'references/stage-game-brief.md',
  'references/frameworks-and-effects.md',
  'references/acceptance.md',
];

const normalize = (value) => String(value).replaceAll('\r\n', '\n').replace(/\n+$/, '');

async function exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name === '.git') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else if (entry.isFile()) out.push(path);
  }
  return out;
}

for (const file of required) {
  if (!await exists(join(skillRoot, file))) failures.push(`缺少 ${file}`);
}

const skillText = await readFile(join(skillRoot, 'SKILL.md'), 'utf8');
if (!skillText.startsWith('---\n')) failures.push('SKILL.md 缺少 YAML frontmatter');
if (!/^name:\s*generating-role-card\s*$/m.test(skillText)) failures.push('Skill 名称不正确');
if (!/^description:\s*\S.+$/m.test(skillText)) failures.push('Skill description 为空');

const contractText = await readFile(join(skillRoot, 'authoring/contract.json'), 'utf8');
let contract;
try {
  contract = JSON.parse(contractText);
} catch (error) {
  failures.push(`contract.json 无法解析：${error.message}`);
}

if (contract) {
  const expected = normalize(renderReference(contract));
  const actual = normalize(await readFile(join(skillRoot, 'authoring/reference.md'), 'utf8'));
  if (actual !== expected) failures.push('authoring/reference.md 与 contract.json 不一致');
}

const textExtensions = new Set(['.md', '.mjs', '.js', '.json', '.yaml', '.yml', '.html', '.txt']);
const secretPatterns = [
  ['GitHub token', /\b(?:ghp|gho|github_pat)_[A-Za-z0-9_]{12,}\b/g],
  ['通用密钥', /\b(?:api[_-]?key|secret|password)\s*[:=]\s*["'][^"'\n]{8,}["']/gi],
  ['本机用户路径', /[A-Za-z]:\\Users\\(?!<|%USERPROFILE%)[^\\\s]+\\/g],
  ['本机工作盘路径', /[A-Za-z]:\\(?:下载|mmd新版页面)\\/gi],
];

const files = await walk(repoRoot);
for (const path of files) {
  if (!textExtensions.has(extname(path).toLowerCase()) && !['LICENSE'].includes(relative(repoRoot, path))) continue;
  const text = await readFile(path, 'utf8');
  for (const [label, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) failures.push(`${relative(repoRoot, path)} 命中${label}`);
  }

  if (extname(path).toLowerCase() !== '.md') continue;
  const prose = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '');
  for (const match of prose.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, '');
    if (!target || /^(?:https?:|mailto:|#)/i.test(target)) continue;
    const clean = decodeURIComponent(target.split('#')[0]);
    if (clean && !await exists(resolve(dirname(path), clean))) {
      failures.push(`${relative(repoRoot, path)} 的链接不存在：${target}`);
    }
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log(`release package: PASS (${files.length} files)`);
