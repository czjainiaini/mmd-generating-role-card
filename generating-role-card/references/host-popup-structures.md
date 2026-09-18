# 受控宿主弹窗：结构图谱

按当前项目要美化的入口定向读取。资料来自 2026-09-18 ZIP 的当时 DOM 记录，内部 class 不是稳定 API；每次在新的目标站使用前都要打开对应弹窗复核。根、过滤规则与授权边界以[受控宿主弹窗 CSS](host-popup.md)为准。

缩进表示可观察的包含关系，不保证是 CSS 直接子元素。列表条数、模型、档位、价格、人设和指令均由平台运行时提供，不能写成卡片固定数据。

## 模型选择与帮助：`models`

```text
[data-host="models"].model-switch-scope
  .title-row / .title / .close-btn
  .model-filter-tabs
  .model-list
    .model-item / .model-item-active
      .model-title / .model-intro / .model-bottom-scope

[data-host="models"].model-help-scope
  .title / .content / .bottom .btn
```

模型列表和帮助层共用根，但高度与内容不同。只为模型列表做网格时限定 `.model-list`；不要给根写统一固定高度而把帮助层拉坏。模型切换属于原生事件，不通过 CSS 触发或复制模型条目。

## 模型设置：`model-setting`

```text
[data-host="model-setting"].model-setting-scope
  .mp-top / .mp-title / .mp-close
  .mp-info-bar / .mp-model-name
  .mp-setting-body
    .mp-card / .mp-card-head / .mp-card-title
    .mp-tokens .mp-token-btn.selected
    .mp-switch-row .u-switch
    .mp-preset-card .mp-preset-item.selected
  .bottom .btn
```

根重排时用有界 flex 列：顶部、信息条和底部保持可见，`.mp-setting-body` 承担剩余滚动高度并保留 `min-height:0`。不要清除开关的位置 / transform 或帮助按钮的原生点击区域；ZIP 资料不证明温度、top-p 等未出现字段存在。

## 对话设置：`style`

```text
[data-host="style"].conv-style-modal
  .cs-modal-header / .cs-header-left / .cs-header-center / .cs-header-right
  .cs-modal-content
    .outer-scroll-view
      .cs-group-card
        .cs-section-header / .cs-collapsible.is-open
        .cs-style-grid .cs-style-item.active
        .cs-custom-textarea / .char-count
```

资料曾观察到总结剧情、抢话、文风、人称、字数和推进等配置样本，但它们不是每张卡都有的固定分组。对话设置中的“总结剧情”也不同于独立的[总结面板](summary-panel.md)。保留原生折叠与内层滚动，不因空态强造配置。

## 用户人设：`persona` 与 `persona-confirm`

```text
[data-host="persona"].role-profile-modal
  .header-scope / .page-title / .complete-btn
  .role-setting
    .switch-card .radio-group .radio-item .uni-radio-input
    .card .input-wrapper input
    .gender-box .gender-item.active
    textarea / .count-text

[data-host="persona-confirm"]
  独立确认树；不是 persona 的后代
```

性别项曾有 `.gender-item.active`，但顶部三模式没有可稳定假定的父级选中 class。不要以 `:has(svg)` 推断它，也不要用全局 `.uni-radio-input` 背景覆盖原生勾选状态。保留禁用、只读、字数限制和键盘适配；颜色增强只针对当前实际存在的后代。

## 新的聊天：`conversations`

```text
[data-host="conversations"].conversation-list-scope
  .title-row / .title / .close-btn
  .conversation-list
    .conversation-item
      .left-scope / .center-scope / .right-scope
  .bottom .btn
```

“新的聊天”先显示会话列表，再由原生创建按钮处理。检查长标题时让正文 `min-width:0`、条目自然扩展，不裁剪原操作区；不要为了视觉验收创建、删除或改名真实会话。

## 自定义指令管理：`instructions`

```text
[data-host="instructions"].custom-instruction-scope
  .list-scope .header-scope / .content-scope .item
  或 .edit-scope .header-scope / .content-scope .form-item
```

列表与编辑视图都需要自己的有界高度和滚动。它与聊天 iframe 内的“选择指令”不同；后者使用 `data-chat="instruction-bar"`，仍应在沙盒树中处理。图标的业务动作、保存、删除和重置不得按顺序猜测或重绑。

## 剧情总结 / 记忆管理：`summary`

```text
[data-host="summary"].summary-sheet
  .summary-top / .summary-body / .summary-footer
  .summary-overlay.summary-ov-edit
  .summary-overlay.summary-ov-anchor
```

根属性与 `.summary-sheet` 在同一元素上，因此写 `[data-host="summary"]`，**不能**写 `[data-host="summary"] .summary-sheet`。编辑与锚点层是根内覆盖层，主根的高度、正文滚动和这些 overlay 的 absolute 关系要一起保留。细节、模板与未验收分支见[总结面板](summary-panel.md)。

## 未实开或条件分支

`message-edit` 在 ZIP 资料中只有隐藏结构记录；`conv-delete`、`conv-rename`、`conv-limit`、`reset`、`background`、`assistant-intro`、`message-delete`、`message-backtrack`、`share-role`、`share-records` 等仅有根名。对这些入口只可做整体根配色或现场取证，不能假装已有通用结构配方。
