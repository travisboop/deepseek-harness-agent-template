# 测试范围

`npm test` 先运行各 Workspace 的专业测试，再运行 [integration.test.mjs](integration.test.mjs)。

- 本包 [native.test.mjs](../packages/my-agent/test/native.test.mjs)：通过 DSH 原生 ToolRuntime 校验参数、读取合成记录，检查 Skill、Tool 的 scope，以及卸载一个实例后另一个实例仍可用。
- 集成测试：临时目录安装官方 `web` Profile 和专业 Bundle，重复 setup 不重复登记；默认入口及用户覆盖保留；专业入口实际加载 Skill、调用 Tool 并返回 7 件、69 CNY；官方入口保持隔离；官方 Web 认证有效；重启后原 Session 可继续。

[index.js](fixtures/dsh/index.js)提供确定性模型，仅通过测试安装，不随普通 `setup` 启用。自动测试不调用真实模型；Profile 依赖安装可能访问 npm registry。

测试使用独立 `DSH_HOME` 和 `DSH_AGENTS_HOME`，结束后停止测试进程并清理临时目录。业务数据、真实 Provider 质量和生产负载由专业负责人另行验证。

## 模板初始验证

2026-11-06 在 macOS arm64、Node `24.21.0`、npm `11.11.0` 下，干净 `npm ci`、3 项测试、文档链接检查通过，`npm audit --audit-level=moderate` 为 0 vulnerabilities。本机 Chrome 实际打开官方 Web，确认模式菜单展示 `yiwu.my-agent` 对应的“我的专业 Agent”。测试使用确定性模型，真实 DeepSeek 模型效果由开发者配置自己的 Provider 后验证。
