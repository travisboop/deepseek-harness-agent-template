# 我的专业 Agent

可运行的合成资料查询示例。开始业务开发前替换以下身份及业务范围。

| 项目 | 当前值 |
| --- | --- |
| 负责人 / GitHub 账号 | 待填写 |
| 目录 | `packages/my-agent/` |
| 包名 | `@yiwu-harness/my-agent` |
| Preset ID | `yiwu.my-agent` |
| Tool | `my_agent_lookup` |
| Skill | `my-agent-workflow` |
| 数据 | 固定合成记录 alpha、beta，无外部服务 |

从仓库根运行 `npm run setup`、`npm start`，新建会话选择“我的专业 Agent”。示例汇总为 **7 件、69 CNY**；来源为 `fixture://catalog/alpha` 和 `fixture://catalog/beta`。

实现入口：[cordis.patch.yml](cordis.patch.yml)、[records.js](resources/records.js)、[lookup.js](tools/lookup.js)、[SKILL.md](skills/my-agent-workflow/SKILL.md)。测试命令：`npm test --workspace @yiwu-harness/my-agent`。

修改方法见 [DEVELOPMENT.md](../../docs/DEVELOPMENT.md)，交付方法见 [INTEGRATION.md](../../docs/INTEGRATION.md)。独立开发完成后，本包将按正式登记身份迁入主 Harness。
