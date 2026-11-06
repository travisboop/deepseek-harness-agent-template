import { defineTool } from "@deepseek-ai/dsh-tools";

export const name = "my-agent-lookup";
export const inject = ["tools", "myAgentRecords"];

export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: "my_agent_lookup",
    description: "读取 alpha 或 beta 合成记录，返回数量、单价、币种和来源；仅供示例验证。",
    parameters: {
      record: {
        type: "string",
        enum: ["alpha", "beta"],
        required: true,
        description: "需要读取的合成记录 ID。",
      },
    },
    output: {
      schema: { type: "object", additionalProperties: true },
      render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }],
    },
    execute: ({ record }) => ({ record: ctx.myAgentRecords.lookup(record) }),
  }));
}
