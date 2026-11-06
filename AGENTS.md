# Agent 开发约定

- 先阅读 [README.md](README.md)和本专业包说明，定位问题及影响范围，再做完整的最小修正，避免重复逻辑和补丁叠加。
- DSH 精确锁定 `0.2.1-rc.2`。使用官方 `web` Profile；优先通过 Preset、Persona、Skill 和官方 Plugin 配置扩展，确认能力缺口后增加小型 Plugin。保留原生 Loop、Session、Permission 和配置机制，不修改 `node_modules`。
- 专业实现放在 `packages/<agent-id>/`。只在本专业 Preset 内装配专属能力，Service 和消费者放入同一个隔离组。开发前检查主 Harness 的 Shared Capabilities，复用时保持既有使用方可用。
- 业务依赖声明在本包，固定官方 Plugin 兼容版本，npm 生成的根锁文件同步提交。日常安装使用 `npm ci`；添加 Workspace 或依赖后用 `npm install --package-lock-only --ignore-scripts` 同步锁文件。
- 默认开发入口为 `cordis`，保留官方 Preset、用户默认设置和已有 Session。业务编排由模型按 Persona 和 Skill 完成；确定性校验和计算由代码实现。
- 运行目录、Credential、Token、真实业务资料、数据库和备份不提交。修改运行配置前停机备份。验证使用独立 `DSH_HOME` 和合成数据；自动测试使用确定性模型，不调用付费 API。
- 按影响验证本专业和公共接入；依赖变化运行 `npm ci`、`npm audit`，启动和界面变化实际打开官方 Web。文档检查用 `npm run check:docs`、`git diff --check`。
- 向主 Harness 交付时按其当前 [CONTRIBUTING.md](https://github.com/travisboop/Yiwu-harness/blob/main/CONTRIBUTING.md)登记专业包并提交 PR。分支用 `<type>/<short-description>`，PR 标题用 `<type>(<scope>)(<tag>): <具体变更>`，`tag` 为 `review` 或 `exempt`。新增专业包需要harness负责人审核；业务负责人确认业务效果，维护者合并，指定人员启用。
- 项目背景、职责和需求以飞书[一带一路项目知识库](https://hvqos9agqzi.feishu.cn/wiki/PhCRwfsp0iAuoWkhCnsciAVonhJ)为准；负责人方案按暂定计划使用。业务数据接入前确认来源、授权、字段和时效。
- 中文表达直接准确。英文术语直接使用，本地文件链接显示原文件名；避免不必要的否定对比和凑词。
