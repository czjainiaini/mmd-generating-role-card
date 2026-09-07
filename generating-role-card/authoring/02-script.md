# 2. 脚本

把下面整段贴进某条规则的**替换内容**。平台会把所有 `<script>` 按规则顺序收集起来，**整张卡只跑一次**（不是每条消息一次）。

`<script>` 在装卡那一刻就被抽出来了，**所以这条规则有没有匹配到，都不影响脚本跑**。常见做法：专门开一条规则只放 `<script>`，匹配式随便填一个正文里用不到的词（官方示例卡就是这么写的）。

## 气泡里的按钮

脚本只跑一次，气泡会滚走再滚回来。绑点击写在 `message:mount` 里。回调里的 `document.querySelector` 只在**当前这条**气泡里找。

先在消息 HTML 里放按钮（另一条规则的替换内容即可）：

```html
<button class="hello-btn">打个招呼</button>
```

再写脚本：

<!-- fixture:hello-mount -->

```html
<script>
sdk.on('message:mount', function () {
  const btn = document.querySelector('.hello-btn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    sdk.input.set('你好');
  });
});
</script>
```

## 给 HTML 的 onclick 用

顶层的 `function` / `const` / `class` 会挂到 `window` 上，`onclick="tap()"` 找得到。

```html
<button onclick="tap()">点我</button>
```

<!-- fixture:once-and-export -->

```html
<script>
const store = { count: 0 };

class Counter {
  constructor(state) {
    this.state = state;
  }
  bump() {
    this.state.count += 1;
    return this.state.count;
  }
}

const counter = new Counter(store);

function tap() {
  sdk.input.set('第 ' + counter.bump() + ' 次');
}
</script>
```

## AI 说完了

正文已经完整。要读最终那句话，用 `message:done` 的 `msg.content`，别去读气泡 DOM。

<!-- fixture:message-done -->

```html
<script>
// AI 说完了。读 msg.content，不要去读气泡 body（生成中那会儿是「消息生成中」）
sdk.on('message:done', function (msg) {
  sdk.debug.log('说完了', msg && msg.content);
});
</script>
```

## 别把「消息生成中」当回复

用户一点发送（或你调了 `message.send`），平台立刻挂一条空的 AI 气泡，`message:mount` 马上会来。这时：

- `msg.content` 是空的
- `[data-chat="message-body"]` 里写的是平台占位「消息生成中」，不是模型回的字
- 接口的 stream 可能已经在吐字，占位还在

舞台、打字机、选项推进要跟事件里的原文：跟字用 `message:stream` 的 `msg.content`（已攒起来的原文），收尾用 `message:done` 的 `msg.content`。`message:mount` 只给**这条气泡里的按钮**绑点击。

「消息生成中」「消息生成超时…」「……」都不是正文。content 空时也不要退回去读 DOM——读到占位再清等待态，后面的 stream / done 就丢掉了。

<!-- fixture:follow-reply-not-body -->

```html
<script>
// 跟字读 stream 的 msg.content，收尾读 done 的 msg.content。
// 不要在 mount 里读 [data-chat="message-body"]：空 AI 气泡一挂上，
// 那里写的是「消息生成中」，不是模型回的字。
function isReplyText(s) {
  s = String(s == null ? '' : s).replace(/^\s+|\s+$/g, '');
  if (!s) return false;
  if (s.indexOf('消息生成') === 0 || s === '……') return false;
  return true;
}
sdk.on('message:stream', function (msg) {
  if (!msg || msg.role !== 'ai') return;
  if (!isReplyText(msg.content)) return;
  sdk.debug.log('跟字', msg.content);
});
sdk.on('message:done', function (msg) {
  if (!isReplyText(msg && msg.content)) return;
  sdk.debug.log('说完了', msg.content);
});
</script>
```

## 一直在的面板：挂舞台

气泡滚出屏幕会被销毁，画布挂在气泡里等于随时会没。舞台不跟消息走。

<!-- fixture:stage-canvas -->

```html
<script>
function openBoard() {
  sdk.stage.open('content');
  const el = sdk.stage.el();
  if (!el || el.querySelector('canvas')) return;
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  el.appendChild(canvas);
}

sdk.on('stage:close', function () {
  sdk.debug.log('舞台被平台关了');
});
</script>
```

- `content`：盖住消息区，顶栏和输入框还能用
- `full`：盖住整屏（盖不住授权 / 充值那种系统弹窗）
- 用户按返回键时平台会关舞台，并发 `stage:close`。你自己调 `sdk.stage.close()` 不发这条

## 外链库

按你写的顺序加载，前一个加载完才跑后面的代码；同一个地址只加载一次。

- 地址必须是 `https://` 开头，`http://` 的会被直接跳过
- 加载失败不会中断整张卡，会在调试面板留一行（URL 加 `?sdkDebug=1` 看）
- 域名还要在平台白名单里，自建域名先问平台

<!-- fixture:external-lib -->

```html
<!-- 外链按你写的顺序加载，同一个 URL 只加载一次；上一条没落地不会跑下一条。 -->
<script src="https://cdn.example.com/tiny-engine.min.js"></script>
<script>
  sdk.on('message:mount', function () {
    const box = document.querySelector('.engine-box');
    if (!box || !window.TinyEngine) return;
    TinyEngine.mount(box);
  });
</script>
```

## 注意

- **`sdk.on` 写在脚本体，不要写进 `message:mount`。** 否则每挂一条气泡就多订一份，同一件事会触发很多次。
- **不要在 `message:mount` 里读 `message-body` 当回复。** 空气泡一挂上那里是「消息生成中」。跟字用 `message:stream` 的 `msg.content`，收尾用 `message:done`。
- 晚订阅也没问题：`ready` 这类只发一次的事件会补发给后来的订阅。
- 切会话不会清掉你的订阅，也不会重跑脚本。属于某个会话的计数，要自己在 `conversation:switch` 里清。
- 你 HTML 里的 `data-*` 会被删掉，按钮用 class。
- 一段脚本报错只废掉它自己，后面几条规则的脚本照跑。报错内容不弹窗，在调试面板里（URL 加 `?sdkDebug=1`）。
