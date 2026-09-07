# 1. 样式

把下面整段贴进某条规则的**替换内容**。所有规则里的 `<style>` 会合成一张全页样式表，后写的盖住先写的。

## 改气泡颜色

用变量，深浅色切换时会跟着变。不要写死 `#fff`。

<!-- fixture:style-bubble -->

```html
<style>
[data-chat="root"] {
  --chat-bubble-ai-bg: #1b2430;
  --chat-bubble-text: #e6f0ff;
  --chat-accent: #7cc0ff;
}
</style>
```

## 改自己画的块

消息或功能栏里的 HTML，class 你自己起。建议加前缀，免得撞上平台内部名字。

<!-- fixture:style-hud -->

```html
<div class="my-hud">状态：<b class="my-hp">10</b></div>
<style>
.my-hud {
  padding: 6px 10px;
  font-size: 13px;
}
.my-hp {
  color: var(--chat-accent);
}
</style>
```

## 改功能栏

`[data-slot="statusbar"]` 平台没给它写样式，背景、高度、粘在顶部都要你自己填。`statusbar` 留空的话，这个节点不会出现。

<!-- fixture:style-statusbar -->

```html
<style>
[data-slot="statusbar"] {
  position: sticky;
  top: 0;
  padding: 8px 12px;
  background: linear-gradient(90deg, #1b2430, #24344a);
  color: var(--chat-text);
}
</style>
```

功能栏的 HTML 由平台按 `statusbar` 字段整块写进去。改里面已有节点的文字、class 没问题；**用 JS 往里塞新节点留不住**——创卡页里你每改一次规则这块就重画一次，插进去的东西会一起没。会变的内容写进规则，长期面板放舞台，见[第 2 章](02-script.md)。

## 只跟着某个节点走

进度条宽度、血条颜色这种算出来的值，写在标签的 `style=""` 上。

<!-- fixture:style-inline -->

```html
<div class="my-bar" style="width: 70%; background: var(--chat-accent); height: 8px; border-radius: 4px;"></div>
```

注意：内联 `style=""` 压过上面 `<style>` 里的规则。颜色仍尽量用 `var(--chat-accent)`，才会跟主题走。

## 藏掉底部输入区

只是视觉上藏。用户还要能发消息的话，用 SDK 的 `composer.hide`，并自己给一条发送的路，见[第 4 章](04-sdk.md)。

<!-- fixture:style-hide-composer -->

```html
<style>
[data-chat="composer"] {
  display: none;
}
</style>
```

## 浮层别盖住平台按钮

你的面板用 `1000–1999`。再高会挡住长按菜单和提示。

<!-- fixture:style-zindex -->

```html
<style>
.my-panel {
  position: absolute;
  z-index: 1200;
}
</style>
```

## 改底栏和弹窗颜色

2026-09-05 根据[在线新版文档](https://sexyai.ai/#/pages/docs/ChatVersionGuide)第 1 章复核。底栏、快捷按钮、输入框，以及会话列表 / 模型 / 角色资料 / 记忆管理这一类白名单弹窗，有独立的 18 个变量；只改 `--chat-bg` 不会带动它们。以下是一组配色示例，制作时按用户选定风格调整。

```html
<style>
[data-chat="root"] {
  --chat-composer-bg: #101a1b;
  --chat-composer-text: #ede8da;
  --chat-shortcut-bg: #233330;
  --chat-shortcut-text: #e6d3ac;
  --chat-input-bg: #142223;
  --chat-input-text: #f2eddf;
  --chat-input-placeholder: #b6b6a7;
  --chat-input-border: #887247;
  --chat-modal-bg: #101a1b;
  --chat-modal-surface: #1c2b2b;
  --chat-modal-text: #ede8da;
  --chat-modal-muted: #b8b9ac;
  --chat-modal-accent: #8f713e;
  --chat-modal-input-bg: #0d1718;
  --chat-modal-input-text: #f2eddf;
  --chat-modal-cancel-bg: #30413d;
  --chat-modal-btn-bg: #2b403b;
  --chat-modal-btn-border: #887247;
}
</style>
```

变量用途见[契约参考](reference.md#底栏和白名单弹窗)。这是颜色入口，不替换平台图标或重排父页面布局，也不等于一个面板的全部二级状态都已覆盖。完整换肤还须逐面板验证文字、选中和禁用状态；记忆面板的历史与当前实测见[宿主主题桥](../references/host-theme-bridge.md)。

## 能改的颜色变量

`--chat-bg`、`--chat-surface`、`--chat-text`、`--chat-text-muted`、`--chat-border`、`--chat-accent`、`--chat-bubble-user-bg`、`--chat-bubble-ai-bg`、`--chat-bubble-text`、`--chat-viewport-height`。

上面是 10 个基础语义变量（包含高度变量），不是新版的全部列表；底栏和白名单弹窗另有上节的 18 个。机器可读清单分别在 `contract.json` 的 `cssVariables.semantic` 与 `cssVariables.host`。

气泡那三个默认等于页面的背景和文字，只改其中一个也不会和整页脱节。

页面上还能选中哪些块，见[第 3 章](03-dom.md)。
