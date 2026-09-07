# 贡献指南

欢迎通过 Issue 或 Pull Request 改进这个 Skill。

## 修改原则

- 正式能力面向 MMD 新版页面；旧版内容只做识别、迁移和兼容说明。
- 先查 `generating-role-card/authoring/` 的公开 SDK 契约，不编造能力名或事件名。
- 保留用户知情与决策权：建议、可选功能和用户决定必须分开。
- 视觉实现应随题材与玩法变化；复用底层可靠代码，不批量复制视觉外壳。
- WebGL、Three.js 和长期界面挂载到 `sdk.stage`，不放进气泡。
- 不提交角色私密资料、登录信息、付费接口凭据、真实存档或未经许可的美术资源。

## 提交前检查

```bash
npm test
```

修改 `authoring/contract.json` 时同步生成 `authoring/reference.md`；修改手册代码示例时同步对应 fixture。测试失败的变更不要提交为完成。

Pull Request 请说明：

- 解决的实际问题和适用页面版本
- 用户可观察到的变化
- 执行过的测试及结果
- 未验证的真实宿主、手机或付费模型边界

