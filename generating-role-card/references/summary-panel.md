# 剧情总结 / 记忆管理：受控宿主面板

当用户要美化独立“剧情总结 / 记忆管理”面板时读取。本资料来自 2026-09-18 官方 ZIP；它描述受控宿主 CSS 的根、当时观察到的结构和一个可改写模板。此同步没有在每个目标站重新实开验证，因此不能把资料存在当成目标角色已注入、保存或移动端全部通过的证明。

## 根与通路

总结面板的真实根属性与 class 在同一元素：

```css
[data-host="summary"].summary-sheet { /* 根本身 */ }
```

因此可写 `[data-host="summary"]` 或 `[data-host="summary"].summary-sheet`，**不能**写 `[data-host="summary"] .summary-sheet`。后者假设了一个不存在的子元素，容易完全不命中。

这条路径属于[受控宿主弹窗 CSS](host-popup.md)：每个规则从开放根开始，写平铺 CSS，不使用 `:has()`、`url(`、原生嵌套、裸 `.summary-sheet` 或跨源 DOM 脚本。`summary` 通路只提供样式定位，不能读取或更改 MMD 自动总结、平台记忆、容量、模型、价格、权限或保存业务。

## 可复用模板

[summary-popup.example.css](../assets/summary-popup.example.css) 是完整、可改写的候选主题：它覆盖主面板、正文滚动、固定标题 / 保存区、选中态、正文编辑层、添加锚点层，以及窄屏与短屏。把其内容放进完整正则包一条规则的 `<style>` 中；它不是独立导入 JSON。

模板使用纸墨色只是示例。按当前卡的游戏类型、美学和主色重新设定颜色、圆角、字体和尺寸，不把该风格套给所有角色。根布局使用有界 flex 列，正文 `flex:1; min-height:0; height:0`，保留头尾；不要为了居中清除宿主动画 / 键盘避让所用的 `transform`。

使用前确认当前目标站仍具有相同根、定位祖先和子层；若不满足，保留原生定位并报告，而不是跨根改全站弹窗。

## ZIP 中观察到的结构

```text
[data-host="summary"].summary-sheet
  .summary-top                         标题与关闭
  .summary-body                        主滚动区
    .summary-master-bar                总开关与说明
    .summary-auto-bar                  自动总结、轮数与开关
    .summary-section                   正文、容量、模型、提示词、锚点等分组
      .summary-card
      .summary-tier.selected
      .summary-preset-item.selected
  .summary-footer                      费用说明与保存
  .summary-overlay.summary-ov-edit     正文编辑层
  .summary-overlay.summary-ov-anchor   添加锚点层
```

两种 overlay 都在 `summary` 根内，原生通常以 absolute 覆盖主面板。改主根的尺寸、溢出或层级时必须保留该关系；不能把 overlay 当成另一个 `data-host` 根。锚点编辑 / 删除确认、自定义预设编辑、恢复确认、软键盘和保存持久化在 ZIP 资料中没有作为完整回归链路保证，按真实目标分别验收。

容量、轮数、模型、预设、价格、锚点数量与字数限制都是平台运行时数据。不要把 ZIP 的演示样本写进角色卡，也不要以 DOM `maxlength` 推断平台业务额度。

## 验收与故障分流

1. 确认角色规则存在、样式被抽取，且实际打开的根命中 `[data-host="summary"]`。
2. 查看根和真实绘制子层的计算样式；不要只在聊天 iframe 或 CSS 文本中找到规则就报告通过。
3. 检查主面板、正文编辑、添加锚点、选中 / 禁用状态、长内容、窄屏 / 短屏；保存和会改变用户数据的操作只在明确授权范围内测试。
4. 若根没有注入或不命中，不用额外 `!important`、虚假面板或 parent DOM 绕过。记录目标域名、聊天版本、入口与现象，等待平台路径可用或退回主题桥。

完整隐藏表面验收见[验收契约](acceptance.md)。`sdk.save` 是作者舞台游戏存档，不能作为该面板的替代或测试平台记忆持久化。
