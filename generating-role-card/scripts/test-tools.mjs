#!/usr/bin/env node
// 在临时目录验证导入校验、世界书保真转换和兼容打包的关键边界。零依赖。

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scripts = dirname(fileURLToPath(import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'mmd-role-card-tools-'));
let count = 0;

function write(name, data) {
  const target = join(temp, name);
  writeFileSync(target, typeof data === 'string' ? data : `${JSON.stringify(data, null, 2)}\n`);
  return target;
}

function run(script, args, expected = 0) {
  const result = spawnSync(process.execPath, [join(scripts, script), ...args], { encoding: 'utf8' });
  const output = `${result.stdout}${result.stderr}`;
  assert.equal(result.status, expected, `${script} ${args.join(' ')}\n${output}`);
  count += 1;
  return output;
}

const persona = '<角色设定 名字：禾安>\n<关系>\n禾安是 {{user}} 的伙伴。\n</关系>\n</角色设定>';
const rule = { id: -1, scriptName: '开局按钮', findRegex: '{{intro}}', replaceString: '<button class="hello">问候</button>' };
const card = { chatVersion: 1, pageDepth: 2, statusbar: '', beginning: '{{intro}}', regex_scripts: [rule] };
const entry = {
  comment: '雨夜', disable: false, constant: false, position: 4, role: 0, depth: 4,
  order: 12, probability: '50.00', key: '["雨"]', keysecondary: '["夜"]',
  content: '<雨夜>\n仅在雨夜开启。\n</雨夜>', uid: 7,
};
const book = (value) => ({ entries: { 0: value } });

try {
  const personaPath = write('persona.txt', persona);
  const basicCard = write('card.json', card);

  // 正则导入：严格版本、负整数且不重复的 id、具名根标签和可单独交付的第一句话/功能栏。
  run('validate.mjs', [basicCard]);
  run('validate.mjs', [write('version-string.json', { ...card, chatVersion: '1' })], 1);
  run('validate.mjs', [write('fraction-id.json', { ...card, regex_scripts: [{ ...rule, id: -1.5 }] })], 1);
  run('validate.mjs', [write('duplicate-id.json', { ...card, regex_scripts: [rule, { ...rule, id: -1, findRegex: '{{next}}' }] })], 1);
  run('validate.mjs', [write('beginning-only.json', { chatVersion: 1, pageDepth: 2, beginning: '可单独交付的第一句话。', statusbar: '', regex_scripts: [] })]);
  run('validate.mjs', [write('statusbar-only.json', { chatVersion: 1, pageDepth: 2, beginning: '', statusbar: '{{hud}}', regex_scripts: [] })]);
  run('validate.mjs', ['--persona', personaPath]);
  run('validate.mjs', [write('mismatched-copy.json', { ...card, personality: persona.replace('伙伴', '邻居') }), '--persona', personaPath], 1);
  run('validate.mjs', ['--persona', write('bad-persona.txt', `${persona}\n<补充>\n额外根节点\n</补充>`)], 1);
  run('validate.mjs', [write('4000.json', { ...card, beginning: '字'.repeat(4000) })]);
  run('validate.mjs', [write('4001.json', { ...card, beginning: '字'.repeat(4001) })], 1);
  const varsOutput = run(
    'validate.mjs',
    [write('unverified-vars.json', { ...card, regex_scripts: [{ ...rule, replaceString: '<script>sdk.vars.get();</script>' }] })],
    1,
  );
  assert.match(varsOutput, /contract\.json/);

  // 受控宿主 CSS：合法 [data-host] 根通过；裸父层 class、未知根、原生嵌套与 summary 误写都会被拦下。
  const hostCard = (name, css) => write(`${name}.json`, {
    ...card,
    regex_scripts: [{ ...rule, scriptName: '宿主皮肤', findRegex: `{{${name}}}`, replaceString: `<style>${css}</style>` }],
  });
  run('validate.mjs', [hostCard('host-valid', '[data-host="models"] .model-list{color:#eee}@media(max-width:600px){[data-host="summary"].summary-sheet{border:1px solid #789}}')]);
  run('validate.mjs', [hostCard('summary-template', readFileSync(join(scripts, '..', 'assets', 'summary-popup.example.css'), 'utf8'))]);
  run('validate.mjs', [hostCard('host-raw', '.model-setting-scope{color:#eee}')], 1);
  run('validate.mjs', [hostCard('host-unknown', '[data-host="recharge"]{color:#eee}')], 1);
  run('validate.mjs', [hostCard('host-nested', '[data-host="models"]{.model-item{color:#eee}}')], 1);
  run('validate.mjs', [hostCard('host-summary-child', '[data-host="summary"] .summary-sheet{color:#eee}')], 1);
  run('validate.mjs', [hostCard('host-has', '[data-host="models"]:has(.model-item){color:#eee}')], 1);

  // 公开审核：固定人设 + 可稳定注入的常驻世界书才计入 2000–15000 字范围。
  const publishPersona = `<角色设定 名字：禾安>\n<规则>\n${'字'.repeat(2100)} {{user}}\n</规则>\n</角色设定>`;
  run('validate.mjs', [write('publish.json', { ...card, personality: publishPersona, beginning: '字'.repeat(200) }), '--publish']);
  run('validate.mjs', [write('publish-short-first.json', { ...card, personality: publishPersona, beginning: '字'.repeat(199) }), '--publish'], 1);
  const shortPersonaCard = write('short-persona.json', { ...card, personality: persona, beginning: '字'.repeat(200) });
  const fixedBook = write('fixed-book.json', book({ ...entry, constant: true, probability: '100.00', content: '字'.repeat(2000) }));
  run('validate.mjs', [shortPersonaCard, '--publish', '--worldbook', fixedBook]);

  // 世界书：未知字段拒绝、纯文本保留为警告、长度和字段范围被限制。
  run('validate-worldbook.mjs', [write('valid-book.json', book(entry))]);
  const plainOutput = run('validate-worldbook.mjs', [write('plain-book.json', book({ ...entry, content: '保留的既有纯文本。' }))]);
  assert.match(plainOutput, /纯文本/);
  run('validate-worldbook.mjs', [write('unknown-field.json', book({ ...entry, variableCondition: { path: '阶段' } }))], 1);
  run('validate-worldbook.mjs', [write('long-book.json', book({ ...entry, content: '字'.repeat(3001) }))], 1);

  // 世界书转换默认保守：不认识的配置、模糊开关、非法概率和空条目均不能静默丢失；标签修复仅在显式选项下进行。
  const normalized = join(temp, 'normalized.json');
  const source = book({ ...entry, constant: 'true', disable: 'true', content: '既有纯文本 {{user}}' });
  run('normalize-worldbook.mjs', ['--in', write('source.json', source), '--out', normalized]);
  const normalizedEntry = JSON.parse(readFileSync(normalized, 'utf8')).entries[0];
  assert.equal(normalizedEntry.constant, true);
  assert.equal(normalizedEntry.disable, true);
  assert.equal(normalizedEntry.content, '既有纯文本 {{user}}');
  assert.equal(normalizedEntry.key, entry.key);
  run('normalize-worldbook.mjs', ['--in', write('unknown-root.json', { entries: { 0: entry }, extra: true }), '--out', join(temp, 'ignored.json')], 1);
  run('normalize-worldbook.mjs', ['--in', write('unknown-entry.json', book({ ...entry, variableCondition: true })), '--out', join(temp, 'ignored.json')], 1);
  run('normalize-worldbook.mjs', ['--in', write('ambiguous-boolean.json', book({ ...entry, disable: 'nope' })), '--out', join(temp, 'ignored.json')], 1);
  run('normalize-worldbook.mjs', ['--in', write('invalid-probability.json', book({ ...entry, probability: 101 })), '--out', join(temp, 'ignored.json')], 1);
  run('normalize-worldbook.mjs', ['--in', write('empty-entry.json', book({ ...entry, content: '' })), '--out', join(temp, 'ignored.json')], 1);
  const tagSource = write('tag-source.json', book({ ...entry, content: '<雨夜>\n下雨。' }));
  const unrepaired = join(temp, 'unrepaired.json');
  run('normalize-worldbook.mjs', ['--in', tagSource, '--out', unrepaired]);
  assert.equal(JSON.parse(readFileSync(unrepaired, 'utf8')).entries[0].content, '<雨夜>\n下雨。');
  run('validate-worldbook.mjs', [unrepaired], 1);
  const repaired = join(temp, 'repaired.json');
  run('normalize-worldbook.mjs', ['--in', tagSource, '--out', repaired, '--repair-tags']);
  run('validate-worldbook.mjs', [repaired]);
  const uidOutput = join(temp, 'uids.json');
  const missingUid = { ...entry };
  delete missingUid.uid;
  run('normalize-worldbook.mjs', ['--in', write('uid-source.json', { entries: [missingUid, { ...entry, uid: 0 }] }), '--out', uidOutput]);
  const uidEntries = Object.values(JSON.parse(readFileSync(uidOutput, 'utf8')).entries);
  assert.equal(uidEntries[1].uid, 0);
  assert.notEqual(uidEntries[0].uid, 0);

  // 兼容打包：超限时默认拒绝，只有显式允许部分合并才输出；结果仍保留单一角色主根。
  const packed = join(temp, 'packed.txt');
  const packBook = write('pack-book.json', { entries: {
    0: entry,
    1: { ...entry, uid: 8, content: '不可静默截断的重要规则。'.repeat(120) },
  } });
  run('pack-worldbook.mjs', ['--persona', personaPath, '--worldbook', packBook, '--out', packed, '--limit', '500'], 1);
  assert.equal(existsSync(packed), false);
  run('pack-worldbook.mjs', ['--persona', personaPath, '--worldbook', packBook, '--out', packed, '--limit', '500', '--allow-partial']);
  const packedText = readFileSync(packed, 'utf8');
  assert.match(packedText, /<补充世界设定>/);
  assert.equal(packedText.trim().endsWith('</角色设定>'), true);
  assert.doesNotMatch(packedText, /不可静默截断/);
  run('pack-worldbook.mjs', ['--persona', personaPath, '--worldbook', write('pack-unknown.json', book({ ...entry, variableCondition: true })), '--out', join(temp, 'bad-pack.txt')], 1);

  console.log(`PASS ${count} 条 CLI 回归：导入、公开审核、世界书保真与兼容打包。`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
