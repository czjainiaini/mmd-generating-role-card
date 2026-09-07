# RPG 套件骨架（新页）

结构照抄，CSS / 文案按用户主题写。**不要**把完整样式和脚本墙贴进产物当「官方模板」。

三块可拆：只说骰子就只出骰子规则 + 人设那一句约定。

## 禁止

- `【侧边栏1】`…`【侧边栏14】`
- 把 `[status]` 拆成 `[sta` + `tus]`
- teapot：`onerror` 图、`window.teapot*`、CoC 注入
- 作者 HTML 上的 `data-*`
- `message:done` 里无条件 `message.send`
- `message:mount` 里读 `message-body` 当回复（空气泡是「消息生成中」）

## 顶层

```
chatVersion: 1
pageDepth: 2
statusbar: {{hud}}
beginning: <一句戏>{{intro}}   // intro 可选
```

## 规则名（可少不可乱拆）

| scriptName | findRegex | 干什么 |
| --- | --- | --- |
| hud | `{{hud}}` | 1～3 个按钮：状态 / 背包 / 骰子（按口语改名） |
| skin | `{{卡-skin}}` | 只放 `<style>`，谁都不引用 |
| kit | `{{卡-kit}}` | 只放 `<script>`，谁都不引用 |
| status | `/\[status\]([\s\S]*?)\[\/status\]/` | 整块换成气泡里的状态卡 |
| check | `/〖检定=([^|〗]+)\|([^|〗]+)\|([^|〗]+)\|([^|〗]+)\|([^|〗]+)\|([^〗]+)〗/` | 判定卡 `$1`…`$6` |

`scriptName` ≤ 20 字。`skin` / `kit` 的匹配式不要带 `css` / `html` / `body`。

## HUD → 舞台

```
[data-slot="statusbar"]  {{hud}}
  └─ .xx-hud
       button.xx-stat   → openPane('stat')
       button.xx-bag    → openPane('bag')   // 用户没要背包就省略
       button.xx-check  → fillCheck()       // 只填舞台输入框，不 send
```

```
function openPane(kind) {
  sdk.stage.open('content');
  var el = sdk.stage.el();
  if (!el) return;
  var board = el.querySelector('.xx-board');
  if (!board) {
    el.innerHTML = '<div class="xx-board"><div class="xx-pane xx-pane-stat"></div><div class="xx-pane xx-pane-bag"></div></div>';
    board = el.querySelector('.xx-board');
  }
  // 只改当前页 display / innerHTML，不要整板重建
}
```

`[data-slot="left"]` / `right` 有宽度再考虑挂轨，窄屏当它不存在。

## 状态标记

默认四键，用户没点名不要加：

```
[status]
hp=70
mp=30
loc=客栈
gold=12
[/status]
```

`message:done` 解析同一块 → `sdk.save.set`（进度）+ `sdk.cache.set`（展示）→ 若舞台开着就刷新状态页。`conversation:switch` 清 cache、重读 save。

气泡卡用 `$1` 整块或脚本填 `.xx-hp` 等 class，不要自写 `data-*`。

## 行动检定标记

```
〖检定=行动|属性|难度|目标|掷骰|结果〗
```

前端一次检定（用户手势）：

```
var n = 1 + Math.floor(Math.random() * 100);
var target = Math.max(5, Math.min(95, /* 属性 + 难度 / 环境修正 */ 50));
var text = '〖检定=推开石门|力量|困难|' + target + '|' + n + '|' + (n <= target ? '成功' : '失败') + '〗';
var input = sdk.stage.el().querySelector('#game-action-input');
input.value = text;
input.focus();
```

不要调用 `sdk.input.set` 改宿主输入框，也不要在 `message:done` 里 `message.send`。兼容旧卡时可以只读旧 `〖骰=...〗`，新输出只用上面的六字段格式。

## 人设输出约定（有哪块写哪句）

状态块：

```
每轮正文结束后另起一块，不要包进代码块：
[status]
hp=数字
mp=数字
loc=地点
gold=数字
[/status]
键名必须是这四个。不要解释标记是干什么的。
```

行动检定：

```
玩家消息里已有 〖检定=行动|属性|难度|目标|掷骰|结果〗 时，沿用其中数值与结果结算，不要重掷或改判。
你发起检定时也输出同一格式，一行一条；玩家可读纪事不要显示原始标签。
```
