# 4. SDK

`sdk` 是平台挂在页面上的对象。下面每一段都是完整的 `<script>`，贴进替换内容即可。

创卡页里的预览是瘦环境：改输入框、发送、存档会报 `NOT_SUPPORTED`。样式和舞台可以试。要验完整行为，回聊天页。

手机上看日志：聊天页 URL 加上 `?sdkDebug=1`，再用 `sdk.debug.log`。

点按钮时调用下面这些 `function`：HTML 写 `onclick="fillHello()"`，或在 `message:mount` 里 `addEventListener`。

## 输入框

底部那一条，用户打字的地方。最常见：点选项 → 把话填进去 → 用户自己按发送。

### `sdk.input.get()` — 读现在框里的字

<!-- fixture:sdk-input-get -->

```html
<script>
// 读输入框里现在的字
function readDraft() {
  return sdk.input.get();
}
</script>
```

### `sdk.input.set(文字)` — 整段换成这句（不发送）

<!-- fixture:sdk-input-set -->

```html
<script>
// 把输入框整段换成指定文字（不发送）
function fillHello() {
  sdk.input.set('你好');
}
</script>
```

### `sdk.input.add(文字)` — 接到现在这句后面

<!-- fixture:sdk-input-add -->

```html
<script>
// 在输入框末尾接上一段字
function appendThanks() {
  sdk.input.add('谢谢');
}
</script>
```

### `sdk.input.insert(文字)` — 插在光标处

取不到光标就落到末尾。

<!-- fixture:sdk-input-insert -->

```html
<script>
// 在光标处插入；取不到光标就接到末尾
function insertAtCursor() {
  sdk.input.insert('（插入）');
}
</script>
```

### `sdk.input.clear()` — 清空

用户点发送之后平台会清，不必自己再清一次。

<!-- fixture:sdk-input-clear -->

```html
<script>
// 清空输入框。用户点发送后平台会清，一般不用自己调
function clearDraft() {
  sdk.input.clear();
}
</script>
```

### `sdk.input.focus()` / `blur()` — 拉起 / 收起键盘

别在页面刚打开时 `focus`，手机上会盖住你刚画的东西。

<!-- fixture:sdk-input-focus -->

```html
<script>
// 点输入框并拉起手机键盘。别在页面刚打开时调
function openKeyboard() {
  sdk.input.focus();
}
</script>
```

<!-- fixture:sdk-input-blur -->

```html
<script>
// 收起键盘
function closeKeyboard() {
  sdk.input.blur();
}
</script>
```

### `sdk.input.getCursor()` / `setCursor(位置)` — 光标在第几个字

一般用不到。

<!-- fixture:sdk-input-getCursor -->

```html
<script>
// 光标在第几个字。一般用不到
function readCursor() {
  return sdk.input.getCursor();
}
</script>
```

<!-- fixture:sdk-input-setCursor -->

```html
<script>
// 把光标移到指定位置。一般用不到
function cursorToStart() {
  sdk.input.setCursor(0);
}
</script>
```

`set` / `add` / `insert` / `clear` 在用户正在用拼音打字、字还没上屏时会失败。点按钮时不会撞上。

## 底部输入区

整块底栏：输入框 + 发送按钮。卡片可以关掉它；你也可以临时打开或藏起来。藏了就要自己给用户一条发消息的路。

### `sdk.composer.show()` — 把底栏显示出来

<!-- fixture:sdk-composer-show -->

```html
<script>
// 把底部输入区显示出来
function showComposer() {
  sdk.composer.show();
}
</script>
```

### `sdk.composer.hide()` — 把底栏藏起来

<!-- fixture:sdk-composer-hide -->

```html
<script>
// 藏掉底部输入区。藏了要自己给用户一条发消息的路
function hideComposer() {
  sdk.composer.hide();
}
</script>
```

### `sdk.composer.visible()` — 底栏现在看不看得见

<!-- fixture:sdk-composer-visible -->

```html
<script>
// 底部输入区现在看不看得见
function composerIsOpen() {
  return sdk.composer.visible();
}
</script>
```

## 发送和改写

默认请用 `input.set` 把话填进输入框，让用户自己按发送。下面这两个会以用户的身份说话，有授权、有限频。

用户点按钮的当帧里 `send`，不会弹授权。定时器里发会先问用户。点了之后不要 `await` 再 `send`，那已经不算手势了。

超出下面的次数会拿到 `RATE_LIMITED`，不是静默失败：

| 什么 | 上限 |
| --- | --- |
| 用户点出来的发送 | 1 分钟 3 条 |
| 你自己（定时器等）发的 | 1 分钟 3 条 |
| 改写消息 | 1 分钟 10 次 |
| 写存档 | 1 分钟 20 次 |

### `sdk.message.send(文字)` — 直接替用户发出去

不传文字就发当前输入框里的内容。一次发送尚未结束时再次调用不会排队，第二次会立即以 `BUSY` 失败；按钮应在等待期间禁用或用发送锁防重复点击。不要在 `message:done` 里无条件再 `send`，会变成自问自答。

<!-- fixture:sdk-message-send -->

```html
<script>
// 以用户身份直接发出去。点按钮的当帧里调才不会弹授权
function sendNow() {
  sdk.message.send('我准备好了').catch(function (err) {
    sdk.debug.log('发送失败', err.code);
  });
}
</script>
```

### `sdk.message.edit(id, 文字)` — 改一条已经发出去的消息

`id` 来自气泡上的 `data-msg-id`。刚出现、还没落库的消息没有 id。消息 HTML 里放 `<button class="rewrite-btn">改写</button>`。

<!-- fixture:sdk-message-edit -->

```html
<script>
// 改写一条已经发出去的消息。id 来自气泡上的 data-msg-id
sdk.on('message:mount', function () {
  const btn = document.querySelector('.rewrite-btn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    const body = document.querySelector('[data-chat="message-body"]');
    const card = body && body.closest('[data-chat="message"]');
    const id = card && card.getAttribute('data-msg-id');
    if (!id) return;
    sdk.message.edit(id, '改过的正文').catch(function (err) {
      sdk.debug.log('没改成', err.code);
    });
  });
});
</script>
```

## 临时缓存

刷新页面就没。只适合「面板开着还是关着」这种当场要用的状态。进度、血量用下面的 `save`。

### `sdk.cache.get(名字)` — 读一条临时值

<!-- fixture:sdk-cache-get -->

```html
<script>
// 读这次打开页面期间的临时值。刷新就没
function readPanelOpen() {
  return sdk.cache.get('panel-open');
}
</script>
```

### `sdk.cache.set(名字, 值)` — 记下一条临时值

<!-- fixture:sdk-cache-set -->

```html
<script>
// 记下临时值，比如面板开着。刷新就没，进度请用 save
function rememberPanelOpen() {
  sdk.cache.set('panel-open', true);
}
</script>
```

### `sdk.cache.remove(名字)` — 删掉一条临时值

<!-- fixture:sdk-cache-remove -->

```html
<script>
// 删掉一条临时值
function forgetPanelOpen() {
  sdk.cache.remove('panel-open');
}
</script>
```

## 存档

落到服务端，换设备还在。一分钟最多写 20 次。

- 名字最多 **10 个**，所以把整套状态打成一包（一个对象）再存
- 名字长度 ≤ 64 个字符，**里面不能有冒号**（`hp:cur` 这种会被拒），用 `hp_cur`
- 值要能 `JSON.stringify`：函数、`Map`、循环引用存不进去

**游客身上写了不报错，退出就没。** 游客的存档只留在本地，他登录时会被丢掉、不会迁移；你的代码在游客和登录用户上表现一模一样，**自己永远测不出这个差别**（你自己是登录状态）。平台会在游客第一次写存档时提示他登录。所以别把「必须攒进度」做成这张卡唯一的玩法。

`get` 是同步的，读的是进页时那份。`set` / `remove` 要 `.catch`，失败时页面上不会有提示。

### `sdk.save.get(名字)` — 读存档

<!-- fixture:sdk-save-get -->

```html
<script>
// 读存档。同步返回，进页时已经加载好
function loadGame() {
  return sdk.save.get('game');
}
</script>
```

### `sdk.save.set(名字, 值)` — 写入存档

<!-- fixture:sdk-save-set -->

```html
<script>
// 写入存档，换设备还在。一分钟最多 20 次，失败要 .catch
function persistGame(game) {
  sdk.save.set('game', game).catch(function (err) {
    sdk.debug.log('存档没写成', err.code);
  });
}
</script>
```

### `sdk.save.remove(名字)` — 删掉一条存档

<!-- fixture:sdk-save-remove -->

```html
<script>
// 删掉一条存档
function clearGame() {
  sdk.save.remove('game').catch(function (err) {
    sdk.debug.log('没删成', err.code);
  });
}
</script>
```

### `sdk.save.keys()` — 已经用了哪些存档名

<!-- fixture:sdk-save-keys -->

```html
<script>
// 已经用了哪些存档名。最多 10 个
function listSaveKeys() {
  return sdk.save.keys();
}
</script>
```

## 舞台

一块盖在聊天页上的空盒子，专门放要一直在的界面（地图、背包、小游戏）。别把这些挂在气泡里——气泡滚走就会被拆掉。关掉再开，盒子里的东西还在，不必每次重建。

### `sdk.stage.open()` — 打开舞台

`content` 只盖消息区，顶栏和输入框还能用。`full` 盖整屏（盖不住授权 / 充值那种系统弹窗）。

<!-- fixture:sdk-stage-open -->

```html
<script>
// 打开舞台。content 盖消息区，full 盖整屏
function openBoard() {
  sdk.stage.open('content');
}
</script>
```

`sdk.stage.open('full')` 盖住整屏。

### `sdk.stage.close()` — 自己关掉舞台

不会触发下面的 `stage:close`（那条是平台关的时候才发）。

<!-- fixture:sdk-stage-close -->

```html
<script>
// 自己关掉舞台。不会触发 stage:close
function closeBoard() {
  sdk.stage.close();
}
</script>
```

### `sdk.stage.el()` — 拿到舞台这个空盒子

打开之后往返回的节点里挂画布、面板。没打开时是 `null`。

<!-- fixture:sdk-stage-el -->

```html
<script>
// 拿到舞台这个空盒子，往里挂画布 / 面板。没打开时是 null
function stageRoot() {
  return sdk.stage.el();
}
</script>
```

### `sdk.stage.visible()` — 舞台现在开没开

<!-- fixture:sdk-stage-visible -->

```html
<script>
// 舞台现在开没开
function stageIsOpen() {
  return sdk.stage.visible();
}
</script>
```

更完整的画布例子见[第 2 章](02-script.md)。

## 角色和用户

### `sdk.role.get()` — 当前这张卡的名字和头像

<!-- fixture:sdk-role-get -->

```html
<script>
// 当前角色卡的名字和头像
function roleInfo() {
  return sdk.role.get();
}
</script>
```

### `sdk.user.get()` — 当前玩家的昵称和头像

游客也有值，别拿它判断登没登录。

<!-- fixture:sdk-user-get -->

```html
<script>
// 当前用户的昵称和头像。游客也有值，不能用来判断登没登录
function userInfo() {
  return sdk.user.get();
}
</script>
```

## 订阅事件

用 `sdk.on('名字', 函数)` 等某件事发生。名字写错不会报错，只是永远不触发。

### 先看用哪个

| 你想做的事 | 用这个 |
| --- | --- |
| 页面刚开好：读存档、第一次画界面 | `ready` |
| 给这条气泡里的按钮绑点击 | `message:mount`（不要在这里读 body 当回复） |
| AI 说完了，读完整回复、按结局切剧情 | `message:done` 的 `msg.content` |
| 气泡滚走了，停掉定时器 | `message:unmount` |
| 用户换了一个会话，清掉上一场的计数 | `conversation:switch` |
| 用户切了深浅色 | `theme:change` |
| 平台把舞台关了（例如按了返回） | `stage:close` |
| 聊天页要关掉了，最后收尾 | `dispose` |
| 输入框里的字变了，更新预览 | `input:change` |
| 用户按了返回 | `back` |
| 新消息刚出现，正文还是空的 | `message:new`（很少用） |
| 跟着一个字一个字往外蹦做动画 | `message:stream` 的 `msg.content`（很密） |

日常做卡，**`ready` + `message:mount` + `message:done` 三个就够**。

订阅写在脚本体里，不要写进 `message:mount`，否则每挂一条气泡就多订一份。

### `sdk.on` — 怎么订

<!-- fixture:sdk-on -->

```html
<script>
// 订阅一件事。名字写错不会报错，只是永远不触发
sdk.on('ready', function () {
  sdk.debug.log('页面好了');
});
</script>
```

### `ready` — 页面准备好了

读存档、第一次画界面。只发一次；你订晚了也会补发一次。

<!-- fixture:sdk-event-ready -->

```html
<script>
// 页面准备好了。读存档、第一次画界面用这个。只发一次，晚订阅也会补一次
sdk.on('ready', function () {
  sdk.debug.log('页面好了');
});
</script>
```

### `message:new` — 一条新消息刚出现

此时正文通常还是空的，气泡也不一定已经在。空 AI 气泡若已经挂上，body 里是「消息生成中」，不是模型回的字。几乎用不到。要等说完，用 `message:done`。

<!-- fixture:sdk-event-message-new -->

```html
<script>
// 一条新消息刚出现，正文通常还是空的。空 AI 气泡的 body 是「消息生成中」。
// 几乎用不到；要等说完请用 message:done
sdk.on('message:new', function (msg) {
  sdk.debug.log('新消息开始', msg && msg.id);
});
</script>
```

### `message:done` — AI 说完了

正文已经完整。读最终回复用 `msg.content`，按关键词切剧情。不要去读气泡 `message-body`：生成中那会儿那里是「消息生成中」。

<!-- fixture:sdk-event-message-done -->

```html
<script>
// AI 说完了。读 msg.content，不要去读气泡 body（生成中那会儿是「消息生成中」）
sdk.on('message:done', function (msg) {
  sdk.debug.log('说完了', msg && msg.content);
});
</script>
```

### `message:stream` — 正在一个字一个字往外蹦

做打字机伴随动画才用。跟字读 `msg.content`（已攒原文）。触发非常密，回调里别查 DOM、别算布局。想读最终正文，用 `message:done`。空 AI 气泡刚挂上时 body 是「消息生成中」，那不是模型回的字。

<!-- fixture:sdk-event-message-stream -->

```html
<script>
// 正在一个字一个字往外蹦。跟字读 msg.content（已攒原文）。别在这里查 DOM
sdk.on('message:stream', function (msg) {
  if (!msg || !msg.content) return;
  sdk.debug.log('流式片段', msg.content);
});
</script>
```

### `message:mount` — 这条气泡出现在屏幕上了

滚出屏幕再滚回来会再发一次，所以绑点击写在这里。回调里的 `document.querySelector` 只找**当前这条**气泡。

用户一点发送，空 AI 气泡也会立刻 mount。这时 body 是「消息生成中」。**不要在这里读 `message-body` 当回复**——跟字用 `message:stream` 的 `msg.content`，收尾用 `message:done`。见[第 2 章](02-script.md)「别把「消息生成中」当回复」。

<!-- fixture:sdk-event-message-mount -->

```html
<script>
// 这条气泡出现在屏幕上了（滚回来也会再发）。给里面的按钮绑点击用这个
sdk.on('message:mount', function () {
  const btn = document.querySelector('.hello-btn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    sdk.input.set('你好');
  });
});
</script>
```

### `message:unmount` — 这条气泡被拆掉了

滚出屏幕时会发。定时器、`ResizeObserver` 在这里停掉。

<!-- fixture:sdk-event-message-unmount -->

```html
<script>
// 气泡滚出屏幕被拆掉了。定时器、观察者在这里停掉
sdk.on('message:unmount', function () {
  sdk.debug.log('气泡没了');
});
</script>
```

### `input:change` — 输入框里的字变了

用来跟着草稿更新预览。别在这里再 `input.set`，容易和拼音输入打架，也会绕成死循环。

<!-- fixture:sdk-event-input-change -->

```html
<script>
// 输入框里的字变了。用来跟着草稿更新预览。别在这里再写回输入框
sdk.on('input:change', function () {
  sdk.debug.log('草稿', sdk.input.get());
});
</script>
```

### `conversation:switch` — 用户换了一个会话

脚本不会重跑，订阅也不会被清。属于上一场的计数、面板开合，要在这里自己清。舞台会被平台关掉。

<!-- fixture:sdk-event-conversation-switch -->

```html
<script>
// 用户换了一个会话。脚本不会重跑，属于上一场的计数要在这里清
sdk.on('conversation:switch', function () {
  sdk.debug.log('换会话了');
});
</script>
```

### `theme:change` — 用户切了深浅色

你写死的 `#fff` 不会自己变。用 CSS 变量的不用管；自己用 JS 涂的颜色听这个。

<!-- fixture:sdk-event-theme-change -->

```html
<script>
// 用户切了深浅色。你写死的颜色不会自己变，要跟着改就听这个
sdk.on('theme:change', function () {
  sdk.debug.log('主题变了');
});
</script>
```

### `back` — 用户按了返回

舞台开着时，平台会先关舞台，不一定轮到你。

<!-- fixture:sdk-event-back -->

```html
<script>
// 用户按了返回。舞台开着时平台会先关舞台，不一定轮到你
sdk.on('back', function () {
  sdk.debug.log('按了返回');
});
</script>
```

### `stage:close` — 平台把舞台关了

比如用户按了返回。你自己调 `sdk.stage.close()` **不会**发这个。

<!-- fixture:sdk-event-stage-close -->

```html
<script>
// 平台把舞台关了（比如按返回）。你自己调 stage.close() 不会发这个
sdk.on('stage:close', function () {
  sdk.debug.log('舞台被平台关了');
});
</script>
```

### `dispose` — 聊天页要关掉了

最后的收尾。

<!-- fixture:sdk-event-dispose -->

```html
<script>
// 聊天页要关掉了。最后的收尾
sdk.on('dispose', function () {
  sdk.debug.log('页面要走了');
});
</script>
```

## 调试

### `sdk.debug.log(...)` — 往页内调试面板写一行

聊天页 URL 加上 `?sdkDebug=1` 能看见。手机上没有控制台，关键路径用这个。

<!-- fixture:sdk-debug-log -->

```html
<script>
// 写一行到页内调试面板。URL 加上 ?sdkDebug=1 能看见
sdk.debug.log('hello', 1);
</script>
```

### `sdk.version` — 版本号

是值，不是函数。现在恒为 `'1'`。别拿它探测能力开没开。

<!-- fixture:sdk-version -->

```html
<script>
// SDK 版本号，是值不是函数。现在恒为 '1'
sdk.debug.log('sdk', sdk.version);
</script>
```

## 出错时看 code

| code | 常见原因 |
| --- | --- |
| `UNAUTHORIZED` | 非手势路径发消息，用户没同意 |
| `RATE_LIMITED` | 写太勤或发太勤 |
| `INVALID_ARGS` | 空消息、存档名违规、正在拼音输入时改草稿、编辑一条不存在的消息 |
| `HOST_DENIED` | 存档还没准备好、发送通道没接上、切会话把这次作废了 |
| `NETWORK` | 请求发出去了但没成 |
| `NOT_SUPPORTED` | 当前环境没有这个能力，多半是创卡页预览 |
| `BUSY` | 上一次 `sdk.message.send()` 尚未结束时再次发送；不会排队，也不是限频 |

把 `err.code` 打进 `sdk.debug.log`。未处理的失败也会进调试面板。
