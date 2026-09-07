<!-- GENERATED. Do not edit. -->
<!-- 由 authoring/scripts/generate-reference.mjs 从 contract.json 生成。 -->

# 契约参考

SDK 版本 `1`。人话版在[手册](README.md)里，这一页是穷举表。

「瘦预览」一列说的是创卡页里那个预览环境的待遇。

## 能力

| 能力 | 参数 | 返回 | 瘦预览 | 说明 |
| --- | --- | --- | --- | --- |
| `input.get` | — | `string` | 回空串 | 读输入框当前草稿。 |
| `input.set` | `text: string` | `void` | NOT_SUPPORTED | 整段替换草稿。 |
| `input.add` | `text: string` | `void` | NOT_SUPPORTED | 追加到草稿末尾。 |
| `input.insert` | `text: string` | `void` | NOT_SUPPORTED | 插到当前光标处；取不到光标时落在末尾。 |
| `input.clear` | — | `void` | NOT_SUPPORTED | 清空草稿。 |
| `input.focus` | — | `void` | NOT_SUPPORTED | 聚焦输入框，通常会拉起软键盘。 |
| `input.blur` | — | `void` | NOT_SUPPORTED | 收起软键盘。 |
| `input.getCursor` | — | `number` | 回 0 | 光标位置。进阶用法。 |
| `input.setCursor` | `n: number` | `void` | NOT_SUPPORTED | 移动光标。进阶用法。 |
| `composer.show` | — | `void` | NOT_SUPPORTED | 显示底部输入区（覆盖卡片配置）。 |
| `composer.hide` | — | `void` | NOT_SUPPORTED | 隐藏底部输入区，并顺手收键盘。 |
| `composer.visible` | — | `boolean` | 回 false | 当前是否显示输入区。 |
| `message.send` | `text?: string` | `Promise<void>` | NOT_SUPPORTED | 以用户身份发一条消息；不传 text 就发当前草稿。非用户手势触发时会先弹授权。前一次未结束时再次调用会立即 BUSY，不会排队。 |
| `message.edit` | `id: string`, `text: string` | `Promise<void>` | NOT_SUPPORTED | 改写一条已有消息的正文。id 取气泡上的 data-msg-id。 |
| `cache.get` | `key: string` | `unknown` | 可用 | 读内存缓存。刷新即失。 |
| `cache.set` | `key: string`, `value: unknown` | `void` | 可用 | 写内存缓存。适合面板开合、滚动位置这类临时态。 |
| `cache.remove` | `key: string` | `void` | 可用 | 删一条缓存。 |
| `save.get` | `key: string` | `unknown` | NOT_SUPPORTED | 读存档（同步，读的是预载进来的内存副本）。 |
| `save.set` | `key: string`, `value: unknown` | `Promise<void>` | NOT_SUPPORTED | 写存档，落到宿主。value 要可 JSON 序列化。 |
| `save.remove` | `key: string` | `Promise<void>` | NOT_SUPPORTED | 删一条存档。 |
| `save.keys` | — | `string[]` | NOT_SUPPORTED | 已用的存档 key。 |
| `stage.open` | `mode?: 'content' \| 'full'` | `void` | 可用 | 打开作者舞台。content 盖住消息区，full 盖住整屏 chrome。不传默认 content。 |
| `stage.close` | — | `void` | 可用 | 自己收工关掉舞台。不会触发 stage:close（那条是平台关时才发）。 |
| `stage.el` | — | `HTMLElement \| null` | 可用 | 舞台容器节点，往里挂你的画布 / 引擎根节点。平台不动它的内部。 |
| `stage.visible` | — | `boolean` | 可用 | 舞台是否开着。 |
| `role.get` | — | `{ name: string; avatarUrl: string }` | 可用 | 当前角色卡的名字与头像。 |
| `user.get` | — | `{ nickname: string; avatarUrl: string }` | 可用 | 当前用户的昵称与头像。游客态是占位值。 |
| `on` | `event: string`, `cb: (payload) => void` | `void` | 可用 | 订阅事件。订阅在整个会话内存活，脚本源被替换时才清。 |
| `debug.log` | `...args: unknown[]` | `void` | 可用 | 写进页内调试面板（带 ?sdkDebug=1 时可见）。 |
| `version` | — | `string` | 可用 | SDK 版本号，当前恒为 '1'。它是个值，不是函数。 |

### 别这么写

- `input.get`：别轮询它来判断用户在打字，用 input:change 事件。
- `input.set`：IME 组合期调用会抛 INVALID_ARGS，别在 compositionupdate 里调。
- `input.add`：拼长文本时别一个字一个字 add，光标与事件会被刷屏。
- `input.insert`：别假设插入后光标停在原处。
- `input.clear`：发送之后不用自己清，平台已经清了。
- `input.focus`：别在页面刚加载时调，键盘会盖住你刚画的东西。
- `input.setCursor`：别拿它模拟选区，没有选区 API。
- `composer.hide`：藏了就要自己给用户一条发消息的路，否则他只能退出。
- `message.send`：别在发送尚未结束时重复调用；第二次会 BUSY。也别在 message:done 里无条件再 send，那是一个自问自答的死循环。
- `message.edit`：本地刚插入、服务端还不认得的消息没有 id，别拿 null 拼字符串。
- `cache.get`：别拿它存进度，用 save。
- `cache.set`：同上。
- `save.set`：别在每帧或每次输入都写，有限频；把状态攒起来再写一次。
- `stage.open`：别每次打开都重建里面的 DOM，关掉再开内容还在。
- `stage.el`：别把它当消息容器用，它在虚拟化列表之外，不随消息滚动。
- `user.get`：别拿它当登录态判断，游客也有值。
- `on`：事件名打错不会报错，只是永远不触发——照 events 名单抄。
- `version`：别拿它做能力探测，平台只维护一份 SDK。

## 事件

订阅不存在的事件名不会报错，只是永远不触发。全部合法名字：

- `ready`
- `message:new`
- `message:done`
- `message:stream`
- `message:mount`
- `message:unmount`
- `input:change`
- `conversation:switch`
- `theme:change`
- `back`
- `stage:close`
- `dispose`

## 错误码

- `UNAUTHORIZED`
- `RATE_LIMITED`
- `INVALID_ARGS`
- `HOST_DENIED`
- `NETWORK`
- `NOT_SUPPORTED`
- `BUSY`

## 限额

| 项 | 值 |
| --- | --- |
| `SAVE_MAX_KEYS` | 10 |
| `CACHE_QUOTA_BYTES` | 1048576 |

## 限频

| 能力 | 次数 | 窗口 |
| --- | --- | --- |
| `save.set` | 20 | 60 秒 |
| `message.send.gesture` | 3 | 60 秒 |
| `message.send.auto.minute` | 3 | 60 秒 |
| `message.edit` | 10 | 60 秒 |

## 选择器

平台自己的 class 名会变，用这些 `data-*`。你自己的 HTML 用自己起的 class。

| 选择器 | 说明 |
| --- | --- |
| `[data-chat="root"]` | 整页根节点。上面还有 data-theme（浅/深色）、data-composer（底栏开没开） |
| `[data-chat="header"]` | 顶栏 |
| `[data-chat="header-back"]` | 返回按钮 |
| `[data-chat="header-title"]` | 头像 + 角色名 |
| `[data-chat="header-actions"]` | 评论 / 分享 / 收藏 / 同步 |
| `[data-chat="messages"]` | 可滚动的消息区 |
| `[data-chat="list"]` | 消息列表 |
| `[data-chat="message-frame"]` | 一条消息的外框 |
| `[data-chat="message"]` | 一条消息。上面还有 data-from、data-state、data-msg-id |
| `[data-chat="message-body"]` | 气泡正文。你的消息 HTML 在这里 |
| `[data-chat="message-actions"]` | 重新生成 / 编辑 |
| `[data-chat="composer"]` | 底部输入区。卡片关掉输入时整块不存在 |
| `[data-chat="input"]` | 输入框本体 |
| `[data-chat="send"]` | 发送按钮 |
| `[data-chat="author-stage"]` | 舞台容器。长期面板挂这里，见手册第 2、4 章 |

槽位：

| 选择器 | 说明 |
| --- | --- |
| `[data-slot="header-extra"]` | 顶栏给你留的空位 |
| `[data-slot="statusbar"]` | 功能栏。角色卡 statusbar 为空则整块不存在 |
| `[data-slot="left"]` | 页面左侧给你留的空位 |
| `[data-slot="right"]` | 页面右侧给你留的空位 |
| `[data-slot="toolbar"]` | 输入区上方给你留的空位 |
| `[data-slot="message-extra"]` | 气泡上给你留的空位 |

消息上的属性：

| 属性 | 说明 |
| --- | --- |
| `data-from` | 这条是用户还是 AI：user / ai |
| `data-state` | 这条现在的状态，如 done、streaming |
| `data-msg-id` | 服务端认得这条时才有。改写消息用它 |

根节点上的属性：

| 属性 | 说明 |
| --- | --- |
| `data-theme` | 浅色 / 深色：light / dark |
| `data-composer` | 底部输入区开着还是关着 |

## CSS 变量

改配色改变量，别写死颜色，深浅色切换才会跟着变。

| 变量 | 说明 |
| --- | --- |
| `--chat-bg` | 整页背景 |
| `--chat-surface` | 卡片、面板这类块的底色 |
| `--chat-text` | 正文颜色 |
| `--chat-text-muted` | 次要文字，比正文淡 |
| `--chat-border` | 边框颜色 |
| `--chat-accent` | 强调色，按钮高亮、血条可以用 |
| `--chat-bubble-user-bg` | 用户气泡背景 |
| `--chat-bubble-ai-bg` | AI 气泡背景 |
| `--chat-bubble-text` | 气泡里的字 |
| `--chat-viewport-height` | 可视区域高度 |

### 底栏和白名单弹窗

定义在 `[data-chat="root"]`；与气泡变量独立，不替换平台图标，也不代表所有父层弹窗都已接入。
来源：[在线新版文档](https://sexyai.ai/#/pages/docs/ChatVersionGuide)，核对日期 2026-09-05；[同步范围](../references/official-doc-sync.md)。

| 变量 | 说明 |
| --- | --- |
| `--chat-composer-bg` | 底栏整块背景 |
| `--chat-composer-text` | 底栏文字 |
| `--chat-shortcut-bg` | 快捷钮、指令 chip、展开工具条底 |
| `--chat-shortcut-text` | 快捷钮和工具条字 |
| `--chat-input-bg` | 输入框底 |
| `--chat-input-text` | 输入框字 |
| `--chat-input-placeholder` | 输入框占位字 |
| `--chat-input-border` | 输入框描边 |
| `--chat-modal-bg` | 更多面板壳、宿主列表弹窗底 |
| `--chat-modal-surface` | 更多行、菜单、选记录底栏、确认壳 |
| `--chat-modal-text` | 弹窗正文 |
| `--chat-modal-muted` | 弹窗次要字 |
| `--chat-modal-accent` | 帮聊 tip、指令返回、弹窗强调色 |
| `--chat-modal-input-bg` | 弹窗输入底 |
| `--chat-modal-input-text` | 弹窗输入字 |
| `--chat-modal-cancel-bg` | 弹窗取消钮底 |
| `--chat-modal-btn-bg` | 弹窗按钮底 |
| `--chat-modal-btn-border` | 弹窗按钮边 |

## z-index 分段

分段是约定，平台不执法：越界不会被拦，只会盖错东西。

| 段 | 归谁 |
| --- | --- |
| 1000–1999 | 作者内容 |
| 2000 | 舞台 `content` |
| 3000 | 舞台 `full` |
| 8000–8999 | 平台 chrome |
| 9000–9999 | 平台模态 |
