# 受控宿主弹窗 CSS

用户要求美化新版 MMD 的模型、设置、人设、会话、指令或记忆管理弹窗时读取。本资料处理的是平台过滤后注入的 CSS，不是 SDK、跨源脚本权限或宿主数据接口。

## 资料来源与验证边界

本资料选择性整理自用户提供的 `最新写卡skill.zip`（SHA-256：`F642D593FDA69070E08F78923F2339FC851D2647C5C8D5A31A22F233BFE50D86`，文件时间 2026-09-18）。该压缩包描述了开放根、样式过滤和当时的内部结构记录。

本次同步只完成了资料、夹具和静态检查；**没有**把 ZIP 中的说明当作任意目标站已经实际注入的证据。要把某个入口标为真实通过，仍须在目标聊天页实际打开它，确认根命中、计算样式、正常 / 选中 / 禁用态、滚动与窄屏表现。

## 使用路线

- 只需统一底栏、输入框或白名单弹窗颜色：优先读[宿主主题桥](host-theme-bridge.md)并使用 `--chat-modal-*`。
- 需要修改已打开弹窗的局部布局、卡片或状态：读[结构图谱](host-popup-structures.md)的对应根，再读[换肤配方](host-popup-recipes.md)。
- 涉及剧情总结 / 记忆管理：读[总结面板](summary-panel.md)；它的根就是 `[data-host="summary"].summary-sheet`。
- 只改聊天 iframe、功能栏、舞台或选择指令：继续使用 `data-chat` / `data-slot`，见[页面结构](../authoring/03-dom.md)。选择指令不是宿主自定义指令管理弹窗。

## 开放根目录（ZIP 资料）

下表是 ZIP 列出的根名。根名属于平台过滤白名单的资料记录；它们不保证当前域名、每个账号状态或每个内部组件都已实测。

| 根名 | 对应入口 | 当前资料程度 |
| --- | --- | --- |
| `conversations` | 会话列表、创建新的聊天 | 有结构记录 |
| `conv-delete` / `conv-rename` / `conv-limit` | 会话删除、改名、上限确认 | 仅根名资料 |
| `models` | 对话模型选择与模型帮助 | 有结构记录 |
| `model-setting` | 模型设置 | 有结构记录 |
| `persona` / `persona-confirm` | 用户人设、未保存确认 | 前者有结构记录；后者独立根 |
| `extra` | 设定补充 | 仅根名资料 |
| `style` | 对话设置 | 有结构记录 |
| `instructions` | 自定义指令管理 | 有结构记录 |
| `reset` / `background` / `assistant-intro` | 重置角色、背景、帮聊介绍 | 仅根名资料 |
| `message-edit` / `message-delete` / `message-backtrack` | 消息编辑、删除、回溯 | 编辑有隐藏结构记录；其余仅根名资料 |
| `share-role` / `share-records` | 分享角色、分享聊天记录 | 仅根名资料 |
| `summary` | 剧情总结 / 记忆管理 | 有主面板和部分子层记录 |

ZIP 明确排除 `recharge`、`sdk-prompt`、`sandbox-lost`、`boot-loading` 与登录页。支付、授权、系统安全页和未开放根保持原生，不能以 CSS 伪造其功能。

## 写法与过滤边界

作者把宿主样式放在正则规则的 `<style>` 内；平台从中抽取、过滤后再注入宿主。每个选择器必须从一个精确开放根开始，再写经过当前页面取证的后代：

```css
[data-host="model-setting"] .mp-card { border-radius: 12px; }
[data-host="persona"] .gender-item.active { color: #fff7e6; }
```

- 不允许裸 `.sandbox-host`、`.model-setting-scope`、`.mp-card`、`.btn` 等父页面 / 内部选择器；它们没有开放根，不能计为有效覆盖。
- 作者 HTML 中的自写 `data-*` 会被净化。`data-host` 是宿主根属性，不能自己输出或用 JS 创建。
- 宿主 CSS 使用平铺规则。已知过滤会拒绝 `:has()`、`url(` 和 CSS 原生嵌套；不要尝试用复杂父选择器规避。
- 不调用 `window.parent.document`、`document.domain`、猜测 `postMessage` 或私有业务方法。样式注入不赋予读取、点击、保存、付费或修改宿主数据的权限。
- 内部 class 只用于当前实现定位；不要把它们写进 SDK 契约或据此编造模型、人设、记忆管理 API。
- `persona-confirm` 不在 `persona` 后代中；`models` 还可能承载模型帮助层；`summary` 根本身就是 `.summary-sheet`，不要再加一个虚构的 `.summary-sheet` 后代。

## 交付与验收

规则仍放在完整正则包的替换内容中，世界书仍是独立 JSON；不要只交一段 CSS 冒充角色卡。静态夹具能证明示例与文档没有漂移，不能证明当前平台已运行。真实验收至少记录目标域名 / 聊天版本 / 打开入口 / 根与计算样式 / 视口，并遵循[验收契约](acceptance.md)的隐藏表面检查。
