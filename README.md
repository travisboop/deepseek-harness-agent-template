# DeepSeek Harness Agent Template

供义乌项目组员独立开发专业 Agent 的模板。使用 **DSH `0.2.1-rc.2`**，和 [Yiwu-harness](https://github.com/travisboop/Yiwu-harness) 当前锁定版本一致。提供官方 Web、一个可运行的专业 Preset、Service / Tool / Skill 示例及离线测试。

专业代码集中在 `packages/my-agent/`，完成后可按主仓库接入规范迁入 `packages/<agent-id>/`。主 Harness 的 Host 和其他组员业务包由主仓库维护。

## 创建自己的私有仓库

取得此模板的读取权限后，点击 **Use this template → Create a new repository**，选择自己的账号和 **Private**。随后 Clone 自己的仓库。

生成的仓库有独立的提交历史和访问权限。模板后续更新需要主动迁入；向主 Harness 交付专业包时，按 [INTEGRATION.md](docs/INTEGRATION.md)操作。

## 安装和启动

需要 Git、Node.js 24+ 和 npm；建议 Node 版本见 [.nvmrc](.nvmrc)。在自己仓库的根目录执行：

```sh
npm ci
npm run setup
npm start
```

`npm ci` 安装锁定依赖，包括 DSH Profile 使用的 pnpm。首次 `setup` 需要访问 npm registry；它会将 `packages/` 中声明 `dsh.bundle` 的包安装到官方 `web` Profile。

打开启动日志中的本机认证链接。在官方 Web 配置自己的 Provider、Credential 和支持 Tool Calling 的模型；使用 DeepSeek 时选择其 Provider 并填写自己的 API Key。随后新建会话，点击输入框上方的模式菜单（初始显示“创造模式”），选择 **我的专业 Agent**（`yiwu.my-agent`）。已有的 `cordis`、`standard` 入口保留，开发默认入口为 `cordis`。

示例问题：

> 请查询 alpha 和 beta，给出各自的数量、单价、来源，以及总件数和总额。

预期：alpha 为 4 件 × 12 CNY，beta 为 3 件 × 7 CNY，共 **7 件、69 CNY**。两项都属于合成资料，回答应包含来源。真实模型调用使用个人 Provider 额度。

端口被占用时执行 `npm start -- --host 127.0.0.1 --port 3081`。

## 从哪里开发

| 位置 | 修改内容 |
| --- | --- |
| [cordis.patch.yml](packages/my-agent/cordis.patch.yml) | Preset 身份、Persona 和本专业装配的能力 |
| [SKILL.md](packages/my-agent/skills/my-agent-workflow/SKILL.md) | 业务方法、判断步骤、异常处理和结果要求 |
| [lookup.js](packages/my-agent/tools/lookup.js) | Tool 参数、返回结构、执行入口 |
| [records.js](packages/my-agent/resources/records.js) | 确定性业务逻辑或数据服务 |
| [package.json](packages/my-agent/package.json) | 本包依赖、子路径导出和测试命令 |
| [native.test.mjs](packages/my-agent/test/native.test.mjs) | 参数校验、scope 和生命周期测试 |

先跑通示例，再按 [DEVELOPMENT.md](docs/DEVELOPMENT.md)统一命名并替换业务逻辑。运行机制继续使用 DSH 原生 Loop、Session、Permission、Tools 和 Skills。

## 验证

```sh
npm test
npm run check:docs
npm audit --audit-level=moderate
git diff --check
```

测试使用临时 `DSH_HOME`、合成资料和确定性模型，不需要真实 API Key；首次安装测试 Profile 仍需网络。`npm test` 同时运行本包测试和官方 Web 集成测试。测试范围见 [README.md](test/README.md)。

## 本地配置

运行目录默认为当前仓库的 `.dsh/`，保存 Provider 配置、Credential、Session 和 Attachment，已被 Git 忽略。可用 `DSH_HOME` 指定独立目录；每个实例使用自己的运行目录。

修改运行配置或重新执行 `setup` 前，停止该实例并备份运行目录。改动 Plugin 代码后重启，新建会话验证；改了包名、Bundle 或依赖时重新执行安装和 `setup`。日常命令：

```sh
npm run dsh -- --version
npm run config
npm run test:agent
```

`config` 输出仅在本机核对。Credential、运行目录、数据库、业务原始数据和备份均不提交。

## 基线和交付

工程基线核对于 **2026-11-06（Asia/Shanghai）**：主仓库 `main` 提交 [`ef7e8e5`](https://github.com/travisboop/Yiwu-harness/commit/ef7e8e5daf1f1660f5f77cb31ec60960554aa8a1)。依赖锁定策略、原生装配和示例接入方式沿用该基线；本模板仅提取通用开发内容。

开发约定见 [AGENTS.md](AGENTS.md)，回接主仓库见 [INTEGRATION.md](docs/INTEGRATION.md)。项目需求及职责以飞书[一带一路项目知识库](https://hvqos9agqzi.feishu.cn/wiki/PhCRwfsp0iAuoWkhCnsciAVonhJ)为准，负责人方案按暂定计划阅读。
