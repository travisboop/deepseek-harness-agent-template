# 开发自己的 Agent

## 确定身份和范围

先明确专业范围、负责人、输入来源、允许执行的操作和输出要求。向主 Harness 登记时，目录、包名和 Preset ID 必须唯一。此模板的 `my-agent` 是待替换占位身份。

例如改成 `policy-agent` 时，统一修改下表中的引用，同时更新测试：

| 当前值 | 示例目标 |
| --- | --- |
| `packages/my-agent/` | `packages/policy-agent/` |
| `@yiwu-harness/my-agent` | `@yiwu-harness/policy-agent` |
| `yiwu.my-agent` | `yiwu.policy-agent` |
| `preset-yiwu-my-agent` | `preset-yiwu-policy-agent` |
| `my-agent-workflow`（含目录名） | `policy-workflow` |
| `my_agent_lookup` | `policy_lookup` |
| `myAgentRecords` | `policyRecords` |
| `my-agent-lookup` | `policy-lookup` |

同步中文显示名、Persona 和本包 [README.md](../packages/my-agent/README.md)，根文档中指向旧目录的链接也需更新。用全仓搜索确认旧身份仅保留在必要的说明中。

首次运行前完成重命名最省事。已有运行目录时，先停机备份，再用原生命令移除旧 Bundle：

```sh
npm run dsh -- plugin --profile web remove @yiwu-harness/my-agent
```

之后同步声明和锁文件，再安装新包：

```sh
npm install --package-lock-only --ignore-scripts
npm ci
npm run setup
npm test
npm start
```

`setup` 根据包声明发现 Bundle，不依赖 `my-agent` 目录名。旧 Session 保留旧 Preset ID，换身份后创建新会话。

## 实现业务能力

**Persona** 定义范围、输入判断和答复习惯。**Skill** 描述业务方法，包括触发条件、步骤、完成条件和失败处理。**Tool** 定义模型可调用的参数、返回值和操作。**Service** 承载可复用计算、查询或连接。

示例用 `defineTool` 和 `ctx.tools.register` 注册查询入口；`inject` 声明 Service 依赖。Tool 的 `output.schema` 负责声明结构，`output.render` 决定模型看到的内容。新增导出写进本包 [package.json](../packages/my-agent/package.json) 的 `exports`，再放入 Preset 的 `config.plugins`。

Service 和依赖它的 Tool 放在同一个 `cordis:group` 中，用 `isolate` 隔离 Service。能力只装配到本专业 Preset，避免让每个 Agent 都看到所有工具。Skill 通过原生 Registry 登记，模型调用 `skill` 按需读取。

先检查主 Harness 的 [Shared Capabilities](https://github.com/travisboop/Yiwu-harness/tree/main/packages/shared-capabilities)。需要复用已有本地包时，在自己的 Workspace 中加入必要包并声明依赖；真实业务专属能力继续留在本专业包。

## 接入外部服务

参数由代码校验，异常保留可判断的错误信息。异步 Tool 接收执行上下文，并把 `exec.signal` 传给外部请求，以便 Session 中断时取消工作。按服务需要设置超时、重试和副作用授权，连接及监听器使用 Cordis 生命周期清理。

真实 API Key 使用授权的运行配置或业务 Plugin 明确读取的环境变量；新增配置提供无真实值的示例。DSH Provider 的 Key 通过官方 Web 配置。数据返回注明来源、日期、单位和适用范围；示例 fixture 不作为真实业务依据。

业务依赖安装在本包，保持精确版本。例如：

```sh
npm install '<依赖名>@<精确版本>' --workspace @yiwu-harness/my-agent --save-exact
```

根锁文件由 npm 生成。不要删锁重建、另交子锁文件或用 `--force`、`--legacy-peer-deps` 跳过依赖冲突。

## 更新测试

先为本专业的确定性逻辑建立正常、缺项、非法参数和失败案例，再更新 Tool scope 和直接会话测试。示例集成模型只认识固定测试命令；替换业务 Tool 后，应同步 [index.js](../test/fixtures/dsh/index.js)及 [integration.test.mjs](../test/integration.test.mjs)中的调用和预期。

运行 `npm test` 验证工程接入。真实模型的业务效果另用授权数据和明确案例验证，交付时记录结果和限制。
