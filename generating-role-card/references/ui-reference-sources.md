# 游戏与高端网页 UI 参考入口

仅在完整舞台、高要求视觉界面、用户需要审美推荐或用户没有明确参考时读取。链接会变化；在发给用户前用网页搜索确认当前可访问，不要凭旧截图声称某个页面仍存在。

## 优先入口

| 入口 | 适合查什么 | 网址 |
| --- | --- | --- |
| Game UI Database | 按游戏、类型和页面类别查 HUD、背包、任务、地图、设置、开始页 | https://www.gameuidatabase.com/ |
| Interface In Game | 可按 RPG、Simulation、Horror、Mobile，以及 Dialogue、Inventory、Map、Quest、Settings 等过滤截图与视频 | https://interfaceingame.com/screenshots/ |
| HUDS+GUIS | 科幻、工业、复古未来、电影屏幕、HUD 与动态图形语言 | https://www.hudsandguis.com/ |
| Awwwards Web & Interactive | 高端网页的交互、滚动、微动效、WebGL / 3D 和排版；只借动效与层级，不把落地页结构硬套进游戏 | https://www.awwwards.com/websites/web-interactive/ |
| Mobbin | 手机 / Web 产品的设置、筛选、表单、导航、弹层和完整交互流程；部分内容可能需要账户 | https://mobbin.com/ |
| Land-book | 网页构图、卡片、深色主题、可见边框、渐变、排版与页面区块 | https://land-book.com/ |
| Godly | 实验性、高冲击力的网页视觉与动效方向 | https://godly.website/ |

## 检索和呈现流程

1. 从题材提取三组词：`游戏类型`、`需要参考的页面`、`视觉气质`。例如：`武侠 RPG + inventory / quest / map + ink / parchment / rain`。
2. 先查游戏界面库的同类型真实页面，再查网页 / 产品库补充设置、表单、移动端与微交互；不要只看一张首页图。
3. 最多整理 3 个方向，每个方向写清：
   - 可点击的来源页面
   - 借鉴内容：信息层级、容器形状、排版、色彩、动效或导航
   - 需要改造：如何中文化、如何适配 LLM 长文本、如何兼顾手机
   - 不照搬：原作标识、受版权保护的美术资源、品牌字体和独特图标
4. 用户想选时让他在 2～3 个方向中选；用户不确定时推荐一个并说明理由，然后直接形成设计令牌、模块结构与动效预算。
5. 页面打不开、需要登录或无法核实详情时，明确标注，不编造截图内容。搜索失败不能阻塞实现；改用同题材游戏的官方截图或已核实入口。

## 题材快捷路由

- 武侠 / 历史：查 `RPG + Inventory / Map / Quest`，借鉴卷宗、地图和信息层级；视觉材质另从书籍装帧、宣纸、铜器和篆刻抽象，不照搬具体游戏资产
- GAL / 互动小说：查 `Dialogue + Character + Menu + Settings`，重点看文本宽度、角色层级、自动 / 历史 / 跳过等控制
- 模拟经营：查 `Simulation + Stats + Store + Progress`，重点看资源总览、异常告警、升级路径和批量操作
- 恐怖：查 `Horror + In game + Map + Inventory`，再用 HUDS+GUIS 找监控、扫描、终端与低可见度信息设计
- 科幻 / 赛博：查 `Sci-Fi + HUD + Overlay + Map`，控制发光面积，优先保证文字对比和长时间阅读舒适度
