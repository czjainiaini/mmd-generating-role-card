# 3. 页面结构

平台自己的 class 名会变，**不要抄页面上看到的** `.xxx` **去当选择器**。能写进样式和脚本、以后也不会偷偷改名的，是下面这些 `data-chat` / `data-slot`。

你自己画的 HTML，用你自己起的 class（见[第 1 章](01-style.md)）。不要在自己的标签上写 `data-*`，净化会删掉。

## 整页长什么样

```
[data-chat="root"]                    整页。上面还有 data-theme（light/dark）、data-composer
  ├─ [data-chat="header"]             顶栏
  │    ├─ [data-chat="header-back"]   返回
  │    ├─ [data-chat="header-title"]  头像 + 角色名
  │    ├─ [data-chat="header-actions"] 评论 / 分享 / 收藏 / 同步
  │    └─ [data-slot="header-extra"]  给你留的空位
  ├─ [data-slot="statusbar"]          功能栏。statusbar 为空则整块不存在
  ├─ [data-chat="messages"]           可滚动的消息区
  │    └─ [data-chat="list"]
  │         └─ [data-chat="message-frame"]  一条的外框
  │              └─ [data-chat="message"]   一条消息（data-from / data-state / data-msg-id）
  │                   ├─ [data-chat="message-body"]   你的消息 HTML 在这里
  │                   ├─ [data-slot="message-extra"]
  │                   └─ [data-chat="message-actions"]  重新生成 / 编辑
  ├─ [data-slot="left"] / [data-slot="right"]
  ├─ [data-chat="author-stage"]        舞台：长期面板挂这里
  └─ [data-chat="composer"]            底部输入区。卡片关掉输入时整块不存在
       ├─ [data-slot="toolbar"]
       ├─ [data-chat="input"]
       └─ [data-chat="send"]
```

舞台怎么开、往里挂什么：见[第 2 章](02-script.md)「一直在的面板：挂舞台」那节；能力清单在[第 4 章](04-sdk.md)。

## 你自己能写哪些标签

消息和功能栏里的 HTML 会过一遍净化，白名单之外的标签会被丢掉（里面的文字保留）。

- **能用**：`div` `span` `p` `b` `i` `strong` `em` `br` `hr`、`h1`–`h6`、`ul` `ol` `li`、`table` `tr` `th` `td`、`pre` `code` `blockquote`、`button` `input` `textarea` `label` `select` `option`、`img` `video`、`details` `summary`、`svg` 及 `path` `circle` `rect` `line` `text` 等一套绘图标签
- **会被删**：`iframe` `link` `meta` `form` `object` `embed`
- **`<style>` 和 `<script>` 不算被删**，它们会被抽出来单独生效，见第 1、2 章
- 普通标签上的 `onclick="tap()"` 能用；写在 `svg` 里的 `onclick` 会被删
- 你自己写的 `data-*` 会被删，按钮请用 class 或 id

## 改某一块：直接抄

只改 AI 气泡：

<!-- fixture:dom-bubble-ai -->

```html
<style>
[data-chat="message"][data-from="ai"] [data-chat="message-body"] {
  --chat-bubble-ai-bg: #1b2430;
  --chat-bubble-text: #e6f0ff;
}
</style>
```

只改用户气泡：

<!-- fixture:dom-bubble-user -->

```html
<style>
[data-chat="message"][data-from="user"] [data-chat="message-body"] {
  --chat-bubble-user-bg: #24344a;
  --chat-bubble-text: #e6f0ff;
}
</style>
```

改输入框：

<!-- fixture:dom-input -->

```html
<style>
[data-chat="input"] {
  font-size: 16px;
}
</style>
```

改顶栏背景：

<!-- fixture:dom-header -->

```html
<style>
[data-chat="header"] {
  background: #1b2430;
}
</style>
```

功能栏、自己的 `.my-hud` 写法见[第 1 章](01-style.md)。

## 消息上还能读的属性


| 属性              | 在哪                      | 值                                     |
| --------------- | ----------------------- | ------------------------------------- |
| `data-from`     | `[data-chat="message"]` | `user` 或 `ai`                         |
| `data-state`    | 同上                      | 如 `done`、`streaming`                  |
| `data-msg-id`   | 同上                      | 服务端认得这条时才有。改写消息用它，见[第 4 章](04-sdk.md) |
| `data-theme`    | `[data-chat="root"]`    | `light` / `dark`                      |
| `data-composer` | 根上                      | 底部输入区开着还是关着                           |


查整页（功能栏、舞台）不要用 `message:mount` 里的 `document.querySelector`——那里被收成「只看当前气泡」。从 `document.body` 出发，或用 `sdk.stage.el()`。

生成中、还没字时，`[data-chat="message-body"]` 里是「消息生成中」，不是模型回的字。读回复用 `message:done` / `message:stream` 的 `msg.content`，见[第 2 章](02-script.md)「别把「消息生成中」当回复」。