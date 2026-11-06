import assert from "node:assert/strict";
import test from "node:test";
import { Context } from "@deepseek-ai/cordis";
import { createScope } from "@deepseek-ai/dsh-scope";
import { SkillRegistry } from "@deepseek-ai/dsh-skill";
import { SystemPrompt } from "@deepseek-ai/dsh-system-prompt";
import { ToolRuntime } from "@deepseek-ai/dsh-tools";
import ExampleRecords from "../resources/records.js";
import * as lookup from "../tools/lookup.js";
import * as evidenceCheck from "../skills/my-agent-workflow/index.js";

async function fixture(t) {
  const ctx = new Context();
  const owner = ctx.plugin(function nativeTestRuntime() {});
  const runtime = owner.ctx;
  new SystemPrompt(runtime, {});
  new ToolRuntime(runtime, { mode: "native" });
  new SkillRegistry(runtime);
  t.after(async () => {
    await owner.dispose();
    while (owner.inertia !== undefined) await owner.inertia;
  });

  async function preset(id, records) {
    const key = { id };
    const scope = createScope(runtime, key);
    const fork = scope.ctx.plugin(function exampleComposition(local) {
      local.plugin(evidenceCheck);
      if (records) {
        const group = local.isolate("myAgentRecords");
        group.plugin(ExampleRecords);
        group.plugin(lookup);
      }
    });
    await fork.await();
    const agent = { id, session: { header: { agentPreset: id }, seq: 0 } };
    agent.ctx = createScope(runtime, agent, { parent: key }).ctx;
    return { agent, fork };
  }
  let sequence = 0;
  return {
    runtime, preset,
    execute: (agent, name, args = {}) => runtime.tools.execute({
      callId: `native-${++sequence}`, name, arguments: args, agent, signal: new AbortController().signal,
    }),
  };
}

test("native scope admits each specialist's Tool and Skill without exposing them globally", async (t) => {
  const f = await fixture(t);
  const collector = await f.preset("collector", true);
  const checker = await f.preset("checker", true);
  const host = await f.preset("host", false);
  const official = { id: "official", session: { header: {}, seq: 0 } };
  official.ctx = createScope(f.runtime, official).ctx;

  for (const { agent } of [collector, checker]) {
    const alpha = await f.execute(agent, "my_agent_lookup", { record: "alpha" });
    const beta = await f.execute(agent, "my_agent_lookup", { record: "beta" });
    assert.equal(alpha.isError, false);
    assert.equal(beta.isError, false);
    assert.equal(alpha.value.record.quantity * alpha.value.record.unit_price
      + beta.value.record.quantity * beta.value.record.unit_price, 69);
    assert.equal(alpha.value.record.synthetic, true);
    assert.equal(alpha.value.record.source, "fixture://catalog/alpha");
    assert.equal((await f.execute(agent, "my_agent_lookup", { record: "unknown" })).isError, true);
    assert.equal((await f.execute(agent, "my_agent_lookup", {})).isError, true);
    assert.equal((await f.execute(agent, "my_agent_lookup", { record: 1 })).isError, true);
    const skills = await f.runtime.skills.list({ scope: agent });
    assert.deepEqual(skills.map((skill) => skill.name), ["my-agent-workflow"]);
    const skill = await f.runtime.skills.get("my-agent-workflow", { scope: agent });
    assert.ok(skill.content.length > 0);
  }
  assert.deepEqual((await f.runtime.skills.list({ scope: host.agent })).map((skill) => skill.name), ["my-agent-workflow"]);
  for (const outsider of [host.agent, official]) {
    assert.equal(f.runtime.tools.get("my_agent_lookup", outsider), undefined);
    assert.equal((await f.execute(outsider, "my_agent_lookup", { record: "alpha" })).isError, true);
  }
  assert.equal(await f.runtime.skills.get("my-agent-workflow", { scope: official }), undefined);
  assert.equal(f.runtime.tools.get("my_agent_lookup"), undefined);
  assert.deepEqual(await f.runtime.skills.list(), []);
});

test("native plugin disposal removes one composition while the other remains usable", async (t) => {
  const f = await fixture(t);
  const collector = await f.preset("collector", true);
  const checker = await f.preset("checker", true);
  await collector.fork.dispose();
  while (collector.fork.inertia !== undefined) await collector.fork.inertia;

  assert.equal(f.runtime.tools.get("my_agent_lookup", collector.agent), undefined);
  assert.deepEqual(await f.runtime.skills.list({ scope: collector.agent }), []);
  const remaining = await f.execute(checker.agent, "my_agent_lookup", { record: "beta" });
  assert.equal(remaining.isError, false);
  assert.equal(remaining.value.record.id, "beta");
  assert.ok(await f.runtime.skills.get("my-agent-workflow", { scope: checker.agent }));
});
