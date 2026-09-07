# MMD 新版角色卡与同层文字游戏 Skill

面向 MMD **新版对话页面**的 Codex Skill，用于规划、制作、检查和验收标签人设、独立世界书、导入正则、宿主换肤，以及挂载在 `sdk.stage` 上的 LLM 文字互动游戏。

本仓库正式支持新版页面（`chatVersion: 1`）。它可以分析旧卡并给出迁移建议，但不承诺直接生成可在旧版页面运行的完整界面。

## 能做什么

- 标签化角色人设、开场白与独立世界书
- HUD、侧栏、消息气泡、输入区与官方主题桥换肤
- `sdk.stage` 全屏或内容区文字游戏
- 选项与自由输入、任务、线索、背包、关系、地图和行动检定
- 自动存档与多手动槽、续档上下文、状态纠错与单步撤销
- 桌面与手机响应式、软键盘视口、减弱动效和性能验收
- 开局美化与布局需求表、视觉参考推荐和多样性设计检查
- 正则、SDK 能力名、世界书结构与真实宿主行为验收

## 设计原则

- 用户决定玩法与重要取舍；AI 提供建议、选项、收益和代价，不把推荐冒充授权。
- 新复杂项目在视觉信息不足时提供已预填的“美化与布局需求表”；用户委托 AI 决定时，AI 披露采用的方案。
- 布局由题材、核心循环、信息层级和设备推导，不使用固定页面模板批量换色。
- 完整舞台的选项默认填入舞台内部输入框，玩家编辑并确认后才发送。
- WebGL、Three.js 和长期画布挂载到 `sdk.stage.el()`，不写进消息气泡。
- 正式交付不依赖 Stylus、本地 userstyle 或开发者工具临时样式。

## 安装

### 下载 ZIP

1. 从 GitHub 的 **Releases** 下载源码包并解压。
2. 把其中的 `generating-role-card` 文件夹复制到 Codex 的 skills 目录。
3. Windows 默认安装位置是 `%USERPROFILE%\.codex\skills\generating-role-card`。
4. 重新打开 Codex 会话，或启动一个新任务。

### Git 克隆

```powershell
git clone https://github.com/czjainiaini/mmd-generating-role-card.git
$target = Join-Path $env:USERPROFILE '.codex\skills\generating-role-card'
Copy-Item -Recurse -Force '.\mmd-generating-role-card\generating-role-card' $target
```

如果目标目录已存在，上述命令会更新同名文件；重要的本地自定义内容请先自行备份。

## 使用

可以显式调用：

```text
$generating-role-card 查看功能
$generating-role-card 规划一个武侠文字游戏，我想先选视觉方向
$generating-role-card 制作已经确定的界面
$generating-role-card 检查隐藏弹窗和输入框的美化漏项
$generating-role-card 验收当前版本
```

也可以直接用自然语言描述角色卡、世界书、界面或同层游戏需求。

## 项目结构

```text
generating-role-card/
├─ SKILL.md                 Skill 入口与核心约束
├─ agents/                  Codex 界面元数据
├─ authoring/               MMD 新版作者手册、SDK 契约与可执行夹具
├─ references/              工作流、完整舞台、验收与平台边界
├─ kits/                    RPG 等组合套件
└─ scripts/                 正则与世界书处理、校验工具
```

## 本地校验

仓库根目录执行：

```bash
npm test
```

它会检查 Skill 结构、相对链接、SDK 契约生成结果、手册代码夹具、示例正则和示例世界书，并扫描常见凭据与本机绝对路径。

## 平台边界

- 本仓库不是酒馆角色卡工具，不会把 Tavern Helper、MVU 或 STScript 当成 MMD API。
- MMD 的父页面弹窗只能通过官方开放的主题桥接收支持的颜色变量；角色 CSS 不能跨源任意修改父页面。
- MMD 存档只能恢复游戏快照，不能删除、截断或分叉宿主聊天历史。
- 官方接口可能更新；制作或验收时应以目标站当前公开文档和真实页面为准。

## 来源与许可

本项目基于 MMD 官方发布的新版对话框 Skill 与作者资料，经许可整理、修改和公开分发。来源与本地增量见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

本仓库原创扩展与修改采用 [MIT License](LICENSE)。MMD 名称、网站、官方资料及相关标识的原始权利归其各自权利人所有；MIT 条款不覆盖第三方另行保留的权利。

本项目是社区维护工具，不代表 MMD 官方背书。

