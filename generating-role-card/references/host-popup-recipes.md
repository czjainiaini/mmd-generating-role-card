# 受控宿主弹窗：换肤配方

在用户明确要改已取证的宿主弹窗布局、状态或视觉时读取。先看[结构图谱](host-popup-structures.md)，再按本页起稿；根白名单与过滤边界以[受控宿主弹窗 CSS](host-popup.md)为准。示例颜色和尺寸只示范层级，不固定任何题材、角色、菜单或画风。

## 先选通路

| 目标 | 优先做法 |
| --- | --- |
| 底栏、输入框、白名单弹窗统一换色 | `--chat-modal-*` 主题桥，保持原生布局 |
| 模型、人设、设置等已取证组件的状态 / 卡片 | `[data-host="…"]` 根 + 已核对后代 |
| 受控根需要居中和固定头尾 | 先确认定位祖先与动画，再使用有界 flex 布局 |
| 选择指令 / 舞台内菜单 | `data-chat` / `data-slot`，不是宿主弹窗 |
| 剧情总结 / 记忆管理 | [总结面板结构与模板](summary-panel.md) |

## 配色与真实状态

先定义背景、正文、次要文字、边框、强调、选中背景和选中文字；普通态与选中态分开写，选中态置于普通态之后。所有选择器均从开放根起：

```css
[data-host="model-setting"] .mp-card {
  background: #23342e;
  color: #f0ead9;
  border: 1px solid #78927b;
  border-radius: 12px;
}
[data-host="model-setting"] .mp-token-btn.selected {
  background: #405f4d !important;
  color: #fff7e6 !important;
  border-color: #405f4d !important;
}
[data-host="style"] .cs-style-item.active {
  background: #405f4d !important;
  color: #fff7e6 !important;
}
[data-host="persona"] .gender-item.active {
  background: #405f4d !important;
  color: #fff7e6 !important;
}
```

不要把 `.selected` / `.active` 推广为所有组件的通用状态；尤其用户人设顶部三模式不能靠 `:has()` 猜选中父项。保留 `[disabled]`、权限锁、原生开关位移和业务文案，不通过 `pointer-events` 或 CSS 伪造已保存 / 已解锁。

## 有界布局：头尾固定、正文滚动

仅在用户要求重排且已实开根后使用。先确认祖先定位和弹窗动画；不要清除宿主 `transform` 来强行居中，也不要修改平台遮罩、z-index 或未打开的备用编辑器。

```css
[data-host="model-setting"] {
  position: fixed !important;
  top: max(16px, calc((100dvh - min(680px, 82dvh)) / 2)) !important;
  bottom: auto !important;
  left: 0 !important;
  right: 0 !important;
  margin: 0 auto !important;
  width: min(920px, calc(100vw - 32px)) !important;
  height: min(680px, 82dvh) !important;
  max-height: 82dvh !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}
[data-host="model-setting"] .mp-top,
[data-host="model-setting"] .mp-info-bar,
[data-host="model-setting"] .bottom {
  flex: 0 0 auto !important;
}
[data-host="model-setting"] .mp-setting-body {
  flex: 1 1 0% !important;
  min-height: 0 !important;
  height: 0 !important;
  max-height: none !important;
}
```

其他根不能照抄同一正文 class：`models` 使用 `.model-list`，`style` 使用 `.cs-modal-content` 内的滚动区，`persona` 使用 `.role-setting`，`conversations` 使用 `.conversation-list`，`instructions` 两种视图各自使用 `.content-scope`。未知根只做整体配色，待现场取证后再改布局。

## 过滤、业务与验收

- 只写平铺 CSS；宿主规则不使用 `:has()`、`url(` 或原生嵌套，也不使用裸内部 class / `.sandbox-host`。
- 不能复制、隐藏后替换、或重绑平台模型列表、表单、保存、收费、权限和图标；CSS 只调整已存在的原生控件外观与布局。
- 宿主根 CSS 与沙盒 CSS 是不同通路。可以在沙盒用卡自己的 class / ID 管理游戏抽屉和舞台，但不能借此越过宿主过滤。
- 静态夹具通过后仍须实际打开使用到的入口，检查标题、正文、关闭、选中、禁用、长内容、窄屏和键盘 / 焦点；具体项见[验收契约](acceptance.md)。
