# 角色字段与导入边界

## 先判定交付物

| 用户要的东西 | 正确落点 | 是否由「导入正则」写入 |
| --- | --- | --- |
| 角色身份、性格、世界规则、NPC、地点、长期线索 | `personality` / `-persona.txt` | 否，必须粘贴到「角色人设」 |
| 第一条可见消息 | `beginning` | 是 |
| 顶部功能栏触发串 | `statusbar` | 是 |
| HTML / CSS / JS 界面规则 | `regex_scripts` | 是 |
| 世界书 / lorebook | 独立 `*-worldbook.json` 的 `entries` | 否，从世界书入口单独导入 |

导入 JSON 顶层只准出现：

```
chatVersion  pageDepth  statusbar  beginning  personality  regex_scripts
```

`personality` 留在 JSON 只用于保持人设与界面约定同步，导入页不会读取它。

上面的白名单只针对「导入正则」。世界书文件是另一种 JSON，根对象只含 `entries`，不得混为一份。具体格式见 [worldbook-import.md](worldbook-import.md)。

## authoring 里真正暴露的角色信息

桌面 `authoring/contract.json` 与 `04-sdk.md` 只声明：

- `sdk.role.get()` → `{ name: string; avatarUrl: string }`
- `sdk.user.get()` → `{ nickname: string; avatarUrl: string }`

只能用它们在聊天页显示当前角色名、角色头像、玩家昵称或玩家头像。不要编造 `role.personality`、`role.worldbook`、`role.beginning`、`role.statusbar` 等运行时字段。

`authoring/example-card/card.json` 里的：

```
role.name / role.statusbar / role.beginning
presentation.transforms
```

是作者手册的回归夹具形状，不是创卡页「导入正则」格式。不得照它输出完整卡，也不得把 `presentation.transforms` 塞进导入 JSON。

## 世界书请求怎么处理

用户说“补世界书”“做 lorebook”“世界书无法导入”时：

1. 把参考文件当数据，检查根对象是否为 `entries` 映射，以及 `key` / `keysecondary` 是否为 JSON 字符串数组。
2. 把内容整理成独立世界书条目，优先保留：
   - 世界核心规则与时间 / 经济约束
   - 角色身份、关系和行为边界
   - 常用地点与主要 NPC
   - 任务、成长路线和长期秘密
   - 界面需要的输出标记
3. 合并重复设定；先确定真实角色名，角色正文直接写名称，玩家统一写 `{{user}}`。
4. 新内容使用 `<世界观>…</世界观>`、`<角色设定 名字：真实角色名>…</角色设定>`、`<道具>…</道具>`、`<行为逻辑>…</行为逻辑>` 等成对单行标签。完整格式见 [persona-format.md](persona-format.md)。
5. 常驻规则设 `constant: true`；地点、NPC、事件和快捷指令优先使用关键词触发，不能把所有内容都常驻。
6. 标准化并校验：

```bash
node scripts/normalize-worldbook.mjs \
  --in path/to/worldbook.json \
  --out docs/card/generated/xxx-worldbook.json \
  --character 真实角色名 \
node scripts/validate-worldbook.mjs docs/card/generated/xxx-worldbook.json
```

7. 从世界书入口导入 `xxx-worldbook.json`，不要走「导入正则」。若目标入口不支持世界书或用户要求单文件，再运行 `pack-worldbook.mjs` 并控制最终 `personality` ≤ 10000 字。

## 页面内角色名

页面需要显示实际卡名时才用：

```html
<script>
var role = sdk.role.get();
var user = sdk.user.get();
var roleName = role && role.name ? role.name : '角色';
var userName = user && user.nickname ? user.nickname : '玩家';
</script>
```

角色设定本身仍来自 `personality`，不是 SDK。
