# 回接 Yiwu-harness

模板生成的私有仓库用于个人开发。完成专业包后，将 `packages/<agent-id>/` 集成到 [Yiwu-harness](https://github.com/travisboop/Yiwu-harness)。该主仓库的当前 [CONTRIBUTING.md](https://github.com/travisboop/Yiwu-harness/blob/main/CONTRIBUTING.md)和 [AGENT_INTEGRATION.md](https://github.com/travisboop/Yiwu-harness/blob/main/docs/AGENT_INTEGRATION.md)决定登记、审核和启用流程。

## 提交范围

1. 在主仓库取得访问权限并基于最新 `main` 创建 `<type>/<short-description>` 分支。
2. 加入自己的专业包，登记负责人、GitHub 账号、目录、包名、Preset ID 和说明；不要用模板根配置覆盖主仓库。
3. 本包依赖留在本包；主仓库运行 `npm install --package-lock-only --ignore-scripts`，提交必要根锁文件变化。
4. 验证本包及受影响的公共接入，提交 `feat(<agent-id>)(review): 接入……` 等符合命名规则的 PR。新增专业包属于harness负责人审核范围。

模板仓库有独立历史，向主仓库交付时在其分支提交专业包。后续纯业务修改是否需要harness负责人审核，以主仓库审核清单为准。修改他人实现先由对应负责人确认。

## 安装和委派

专业包安装到主 Harness 的同一官方 `web` Profile 后，可以直接选择自己的 Preset。目标运行环境由harness负责人或指定人员安装：

```sh
npm run dsh -- plugin --profile web add ./packages/<agent-id>
```

如需 Host 委派，交付材料写明 Preset ID、输入、输出、缺项和失败语义，由主 Harness 按当前接入指南配置 Host 的 `allowedAgentPresets`。直接入口和委派入口使用同一专业 Preset。此模板不会自动修改主 Harness 的运行配置。

专业包的最终答复需包含任务结果、来源及仍待补充的信息。受委派时 Host 接收该答复并决定下一步；后续消息和中断复用原生 Sub-agent 机制。

## 验证记录

交付时提供问题、改动范围、依赖版本、验证命令和结果、数据来源、需要的运行配置。工程验证至少覆盖专业直接入口、Tools 和 Skills 可见范围、正常输入、缺项和错误处理；按实际用途增加 Host 委派和取消测试。

业务验收通过后由指定人员停机备份、装配、重启并新建会话验证，补记实际启用版本。合并代码和运行环境启用分别记录。
