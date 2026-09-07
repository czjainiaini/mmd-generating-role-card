#!/usr/bin/env node
// 校验「导入正则」JSON：形状、平台上限、作者常见坑。零依赖。
// 用法: node .cursor/skills/generating-role-card/scripts/validate.mjs <file.json>
// 退出码 0 = 无 error（可能有 warn），1 = 有 error。

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LIMITS = {
  rules: 130,
  scriptName: 20,
  findRegex: 1000,
  replaceString: 20000,
  statusbar: 200,
  beginning: 10240,
  personality: 10000,
};

const TOP_KEYS = [
  'chatVersion',
  'pageDepth',
  'statusbar',
  'beginning',
  'personality',
  'regex_scripts',
];
const UNSUPPORTED_TOP_KEYS = new Map([
  ['role', 'authoring/example-card/card.json 的 role 是文档回归夹具，不是「导入正则」字段'],
  ['presentation', 'presentation.transforms 是 authoring 回归夹具字段，不是「导入正则」格式'],
  ['worldbook', '世界书不能放进「导入正则」；请另存为根对象仅含 entries 的独立 JSON'],
  ['world_book', '世界书不能放进「导入正则」；请另存为根对象仅含 entries 的独立 JSON'],
  ['lorebook', 'lorebook 不能放进「导入正则」；请标准化为独立世界书 JSON'],
  ['lore_book', 'lorebook 不能放进「导入正则」；请标准化为独立世界书 JSON'],
  ['entries', 'entries 属于独立世界书入口，不属于「导入正则」'],
  ['characterBook', 'characterBook 不能放进「导入正则」；请标准化为独立世界书 JSON'],
  ['character_book', 'character_book 不能放进「导入正则」；请标准化为独立世界书 JSON'],
]);
const RULE_KEYS = ['id', 'scriptName', 'findRegex', 'replaceString'];
const BANNED_TAGS = ['iframe', 'link', 'meta', 'form', 'object', 'embed'];
// 创卡页文案禁的匹配式保留字。线上真卡有用 `【css】` 当匹配式的，所以只告警。
const RESERVED_IN_PATTERN = ['html', 'head', 'body', 'css'];

const errors = [];
const warnings = [];

const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

/** 与 packages/chat-render/src/transforms.ts 的 compilePattern 同一套判定 */
function classifyPattern(raw) {
  const trimmed = String(raw ?? '')
    .trim()
    .replace(/^`|`$/g, '');
  if (!trimmed) return { kind: 'empty' };
  const m = /^\/([\s\S]+)\/([gimsuy]*)$/.exec(trimmed);
  if (!m) return { kind: 'literal', literal: trimmed };
  let flags = m[2] ?? '';
  if (!flags.includes('g')) flags += 'g';
  try {
    new RegExp(m[1], flags);
    return { kind: 'regex' };
  } catch (e) {
    return { kind: 'bad-regex', message: e.message };
  }
}

function stripStyleAndScript(s) {
  return s.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
}

function openingTagName(body) {
  const value = String(body ?? '').trim();
  if (/^角色设定\s+名字[：:]/.test(value)) return '角色设定';
  return value;
}

function checkClosedChapterTags(where, text) {
  const stack = [];
  let openings = 0;
  const lines = String(text ?? '').split(/\r?\n/);
  lines.forEach((line, index) => {
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
    const name = openingTagName(body);
    if (!name) return;
    stack.push(name);
    openings += 1;
  });
  if (stack.length) err(where, `章节标签未闭合：${stack.map((name) => `<${name}>`).join('、')}`);
  return openings;
}

function loadContract(skillRoot) {
  const file = path.join(skillRoot, 'authoring', 'contract.json');
  try {
    const contract = JSON.parse(readFileSync(file, 'utf8'));
    return {
      capabilities: new Set(Object.keys(contract.capabilities ?? {})),
      events: new Set(contract.events ?? []),
    };
  } catch {
    return null;
  }
}

function checkSdkNames(where, code, contract) {
  if (!contract) return;
  for (const m of code.matchAll(/\bsdk\.([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)/g)) {
    const name = m[1];
    if (contract.capabilities.has(name)) continue;
    // 两段名不在表里时，退一步看第一段是否单独成立（如 sdk.version.length）
    const head = name.split('.')[0];
    if (contract.capabilities.has(head)) continue;
    err(where, `contract.json 里没有 sdk.${name} 这个能力`);
  }
  for (const m of code.matchAll(/\bsdk\.on\(\s*['"]([^'"]+)['"]/g)) {
    if (!contract.events.has(m[1])) err(where, `contract.json 里没有 '${m[1]}' 这个事件`);
  }
  for (const m of code.matchAll(/\bsdk\.role\.get\(\)\s*\.\s*([A-Za-z_$][\w$]*)/g)) {
    if (!['name', 'avatarUrl'].includes(m[1]))
      err(where, `sdk.role.get() 只有 name / avatarUrl，没有 ${m[1]}`);
  }
  for (const m of code.matchAll(/\bsdk\.user\.get\(\)\s*\.\s*([A-Za-z_$][\w$]*)/g)) {
    if (!['nickname', 'avatarUrl'].includes(m[1]))
      err(where, `sdk.user.get() 只有 nickname / avatarUrl，没有 ${m[1]}`);
  }
}

function checkAuthoringPitfalls(where, replaceString) {
  const visible = stripStyleAndScript(replaceString);

  if (/<[a-zA-Z][^>]*\sdata-[a-zA-Z-]+\s*=/.test(visible))
    warn(where, '标签上自写了 data-*，净化会删掉它；按钮用 class 或 id');

  for (const tag of BANNED_TAGS) {
    if (new RegExp(`<\\s*${tag}(?![A-Za-z0-9_-])`, 'i').test(visible))
      warn(where, `<${tag}> 在白名单外，会被删掉`);
  }

  if (/^ {4,}</m.test(replaceString))
    warn(where, 'HTML 缩进了四个空格，会被 Markdown 当代码块原样显示');

  if (/(^|[\s,};])(\*|html|body|:root)\s*\{/.test(replaceString))
    warn(where, '出现全局 CSS（*{} / html{} / body{} / :root{}），改用 [data-chat="root"]');

  for (const m of replaceString.matchAll(/sdk\.on\(\s*['"]message:mount['"]/g)) {
    const block = replaceString.slice(m.index + m[0].length, m.index + m[0].length + 1200);
    if (/\bsdk\.on\(/.test(block))
      warn(where, 'sdk.on 疑似写在 message:mount 回调里，每挂一条气泡会多订一份；订阅写脚本体');
  }

  if (/message:done/.test(replaceString) && /sdk\.message\.send\(/.test(replaceString))
    warn(where, '同条里既订阅 message:done 又调 message.send，注意别做成自问自答死循环');

  if (
    /sdk\.on\(\s*['"]message:mount['"]/.test(replaceString) &&
    /\[data-chat=["']message-body["']\]/.test(replaceString) &&
    (/sdk\.message\.send\(/.test(replaceString) || /message:stream/.test(replaceString))
  ) {
    warn(
      where,
      '空 AI 气泡一挂上，message-body 是「消息生成中」不是模型回的字；读回复用 message:done / message:stream 的 msg.content，不要在 mount 里读 body 当回复',
    );
  }
}

function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('用法: node validate.mjs <file.json>');
    process.exit(2);
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const skillRoot = path.resolve(scriptDir, '..');
  const contract = loadContract(skillRoot);
  if (!contract) warnings.push('contract.json 没读到，跳过 SDK 名核对');

  let data;
  try {
    data = JSON.parse(readFileSync(path.resolve(target), 'utf8'));
  } catch (e) {
    console.error(`JSON 读不了或解析失败: ${e.message}`);
    process.exit(1);
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    console.error('顶层不是一个对象');
    process.exit(1);
  }

  for (const key of Object.keys(data)) {
    if (TOP_KEYS.includes(key)) continue;
    if (UNSUPPORTED_TOP_KEYS.has(key)) err('顶层', `${key}：${UNSUPPORTED_TOP_KEYS.get(key)}`);
    else warn('顶层', `多了一个键 ${key}，导入页不认`);
  }

  if (Number(data.chatVersion) !== 1)
    err('顶层', 'chatVersion 必须是 1，否则导入新建卡会落到旧聊天页，SDK 与 data-* 选择器全部失效');

  if (data.pageDepth !== 2) warn('顶层', 'pageDepth 建议固定 2（只对旧页有意义）');

  for (const key of ['statusbar', 'beginning', 'personality']) {
    const value = data[key];
    if (value === undefined) {
      if (key !== 'personality') warn('顶层', `没有 ${key}`);
      continue;
    }
    if (typeof value !== 'string') {
      err('顶层', `${key} 必须是字符串`);
      continue;
    }
    if (value.length > LIMITS[key]) err('顶层', `${key} ${value.length} 字，超上限 ${LIMITS[key]}`);
  }

  const persona = typeof data.personality === 'string' ? data.personality : '';
  if (persona) {
    if (/<(script|style)\b/i.test(persona) || /\bsdk\./.test(persona))
      warn('顶层', 'personality 是喂给模型的人设，不要写 HTML/脚本/sdk');
    if (/\$#char#\$|\$#user#\$|\{\{char\}\}/.test(persona))
      err('顶层', 'personality 含旧占位符：角色请直接写真实名称，玩家只用 {{user}}');
    if (!/^<角色设定\s+名字[：:]\s*[^>\r\n]+>$/m.test(persona))
      err('顶层', 'personality 必须包含 <角色设定 名字：真实角色名>');
    const sectionCount = checkClosedChapterTags('顶层', persona);
    if (!/{{user}}/.test(persona))
      warn('顶层', 'personality 没有 {{user}}；涉及玩家时必须使用这个占位符');
    if (sectionCount < 3)
      warn('顶层', 'personality 的标签章节少于 3 个，建议按设定类型补充分区');
  }

  const rules = data.regex_scripts;
  if (rules !== undefined && !Array.isArray(rules)) {
    err('顶层', 'regex_scripts 必须是数组');
    return report();
  }
  const list = Array.isArray(rules) ? rules : [];
  if (list.length === 0 && !persona.trim()) {
    err('顶层', 'personality 和 regex_scripts 都空，没有可交付物');
    return report();
  }
  if (list.length > LIMITS.rules)
    err('顶层', `${list.length} 条规则，超上限 ${LIMITS.rules}（导入时会被直接截断）`);

  const triggerSoup = [data.statusbar, data.beginning]
    .concat(list.map((r) => (typeof r?.replaceString === 'string' ? r.replaceString : '')))
    .filter((s) => typeof s === 'string')
    .join('\n');

  const seenLiteral = new Map();
  const seenName = new Map();

  list.forEach((rule, i) => {
    const where = `规则 ${i + 1}（${rule?.scriptName ?? '无名'}）`;

    if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) {
      err(where, '不是一个对象');
      return;
    }
    for (const key of RULE_KEYS) if (!(key in rule)) err(where, `缺字段 ${key}`);
    for (const key of Object.keys(rule)) if (!RULE_KEYS.includes(key)) warn(where, `多了字段 ${key}`);

    if (typeof rule.id !== 'number' || rule.id >= 0)
      err(where, 'id 要用负数（-1、-2 …），导入时会重编号');

    const name = rule.scriptName;
    if (typeof name !== 'string' || name.trim() === '') err(where, 'scriptName 不能为空');
    else {
      if (name.length > LIMITS.scriptName)
        err(where, `scriptName ${name.length} 字，超上限 ${LIMITS.scriptName}`);
      if (seenName.has(name)) warn(where, `scriptName 与规则 ${seenName.get(name) + 1} 重名`);
      else seenName.set(name, i);
    }

    const find = rule.findRegex;
    if (typeof find !== 'string' || find.trim() === '') {
      err(where, 'findRegex 不能为空');
    } else {
      if (find.length > LIMITS.findRegex)
        err(where, `findRegex ${find.length} 字，超上限 ${LIMITS.findRegex}`);
      if (/<[a-zA-Z/]/.test(find)) warn(where, 'findRegex 里有 HTML 标签，平台不建议');
      for (const word of RESERVED_IN_PATTERN) {
        if (new RegExp(`(^|[^A-Za-z])${word}([^A-Za-z]|$)`, 'i').test(find))
          warn(where, `findRegex 含保留字 ${word}，平台文案不建议`);
      }

      const kind = classifyPattern(find);
      if (kind.kind === 'bad-regex')
        err(where, `写成 /…/ 但编不过（${kind.message}），这条会被整条静默丢弃`);
      if (kind.kind === 'literal') {
        if (seenLiteral.has(kind.literal))
          err(
            where,
            `字面量匹配式与规则 ${seenLiteral.get(kind.literal) + 1} 重复；前一条会把全文换完，这条永远匹配不到`,
          );
        else seenLiteral.set(kind.literal, i);
      }
    }

    const body = rule.replaceString;
    if (typeof body !== 'string') {
      err(where, 'replaceString 必须是字符串');
      return;
    }
    if (body.length > LIMITS.replaceString)
      err(where, `replaceString ${body.length} 字，超编辑器上限 ${LIMITS.replaceString}，拆成多条`);

    checkSdkNames(where, body, contract);
    checkAuthoringPitfalls(where, body);

    // 可见产出的触发串必须在别处出现过，否则永远不显示
    const kind = classifyPattern(find);
    if (kind.kind === 'literal' && stripStyleAndScript(body).trim() !== '') {
      const elsewhere = triggerSoup.split(kind.literal).length - 1;
      if (elsewhere === 0)
        warn(
          where,
          `会产出可见内容，但触发串 ${kind.literal} 不在 statusbar / beginning / 其他规则的替换内容里，页面上永远不出现`,
        );
    }
  });

  if (persona) {
    const ruleText = list
      .map((r) => `${r?.findRegex ?? ''}\n${r?.replaceString ?? ''}`)
      .join('\n')
      .replace(/\\/g, '');
    if (/\[status\]/i.test(ruleText) && !/\[status\]/.test(persona))
      warn('顶层', '规则里有 [status] 标记，人设输出约定没写到，模型打不出这块状态块就是空壳');
    if (/〖骰=/.test(ruleText) && !/〖骰=/.test(persona))
      warn('顶层', '规则里有 〖骰= 标记，人设输出约定没写到，判定卡不会出现');
  }

  report();
}

function report() {
  for (const line of warnings) console.log(`WARN  ${line}`);
  for (const line of errors) console.log(`ERROR ${line}`);
  console.log(`\n${errors.length} error, ${warnings.length} warn`);
  process.exit(errors.length > 0 ? 1 : 0);
}

main();
