import { randomUUID } from "node:crypto";
import { LlmAdapter } from "@deepseek-ai/dsh-llm";

export const name = "template-test-fixture";
export const inject = ["llm", "agents", "connection"];
const textOf = (message) => (message?.content ?? []).filter((block) => block.type === "text").map((block) => block.text).join("\n");
const argumentsOf = (call) => typeof call.arguments === "string" ? JSON.parse(call.arguments) : call.arguments;
function* response(text, tool, args) {
  yield { type: "block-start", index: 0, blockType: tool ? "tool-call" : "text" };
  yield { type: "block-end", index: 0, block: tool
    ? { type: "tool-call", id: randomUUID(), name: tool, arguments: JSON.stringify(args) }
    : { type: "text", text } };
  yield { type: "usage", usage: { inputTokens: 10, outputTokens: 10 } };
  yield { type: "finish", reason: { kind: tool ? "tool-calls" : "stop" } };
}

export function apply(ctx) {
  const calls = [], errors = [];
  ctx.on("agent/error", ({ agent, error }) => errors.push({ session: agent.id, error: String(error) }));
  class Fixture extends LlmAdapter {
    async listModels() {
      return [{ id: "fixture", name: "Offline fixture", contextWindow: 32768, maxOutputTokens: 2048 }];
    }
    async resolveModel(provider, model) {
      return { provider, id: model, name: "Offline fixture", context: { contextWindow: 32768 }, defaultMaxTokens: 2048 };
    }
    async *stream(options) {
      options.signal?.throwIfAborted();
      if (options.purpose === "session-title") { yield* response("Template fixture"); return; }
      const start = options.messages.findLastIndex((message) => message.role === "user" && textOf(message).startsWith("fixture:"));
      const command = textOf(options.messages[start]);
      const turn = options.messages.slice(start + 1);
      const toolCalls = turn.filter((message) => message.role === "assistant")
        .flatMap((message) => message.content ?? []).filter((block) => block.type === "tool-call");
      calls.push({ session: options.sessionId, preset: ctx.agents.get(options.sessionId)?.session.header.agentPreset,
        tools: (options.tools ?? []).map((tool) => tool.name) });
      if (command === "fixture:probe") { yield* response("PROBE_COMPLETE"); return; }
      if (command !== "fixture:collect") throw new Error(`Unknown fixture command: ${command}`);
      if (!toolCalls.some((call) => call.name === "skill")) {
        yield* response(undefined, "skill", { name: "my-agent-workflow" }); return;
      }
      for (const record of ["alpha", "beta"]) {
        if (!toolCalls.some((call) => call.name === "my_agent_lookup" && argumentsOf(call).record === record)) {
          yield* response(undefined, "my_agent_lookup", { record }); return;
        }
      }
      const records = toolCalls.filter((call) => call.name === "my_agent_lookup").map((call) => {
        const result = turn.find((message) => message.role === "tool" && message.toolCallId === call.id);
        if (!result || result.isError) throw new Error("Native lookup failed");
        return JSON.parse(textOf(result)).record;
      });
      yield* response(`AGENT_RESULT ${JSON.stringify({
        quantity: records.reduce((sum, record) => sum + record.quantity, 0),
        total: records.reduce((sum, record) => sum + record.quantity * record.unit_price, 0),
        synthetic: records.every((record) => record.synthetic),
        sources: records.map((record) => record.source),
      })}`);
    }
  }
  ctx.llm.registerAdapter(["template-test"], new Fixture());
  ctx.connection.fetch.register({ path: "/api/template-test/state", methods: ["GET"], requestBody: "buffered",
    fetch: async () => Response.json({ calls, errors }) });
}
