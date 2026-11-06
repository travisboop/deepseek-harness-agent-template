import assert from "node:assert/strict";
import test from "node:test";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createDsh, runtime } from "./helpers/dsh.mjs";

const contains = (history, text) => JSON.stringify(history.records).includes(text);

test("clean setup, scoped tools, official Web and persisted sessions", { timeout: 240_000 }, async (t) => {
  const dsh = await createDsh(t);
  assert.equal(runtime.version, "0.2.1-rc.2");
  await dsh.setup();
  const patchPath = join(dsh.dshHome, "profiles/web/cordis.patch.yml");
  const original = await readFile(patchPath, "utf8");
  assert.match(original, /default: cordis/);
  await dsh.setup();
  assert.equal(await readFile(patchPath, "utf8"), original);
  const profile = JSON.parse(await readFile(join(dsh.dshHome, "profiles/web/package.json"), "utf8"));
  assert.equal(profile.dsh.profile.bundles.filter((name) => name === "@yiwu-harness/my-agent").length, 1);

  await dsh.install("test/fixtures/dsh");
  await dsh.start();
  const presets = (await dsh.rpc("agentPresets/list")).presets;
  assert.ok(presets.every((preset) => preset.broken === undefined));
  for (const id of ["cordis", "standard", "yiwu.my-agent"]) assert.ok(presets.some((preset) => preset.id === id));
  assert.equal(presets.find((preset) => preset.id === "cordis").isDefault, true);
  assert.equal((await dsh.request("/")).status, 200);
  const unauthenticated = await fetch(`${dsh.origin()}/api/agentPresets/list`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "client-request", rpcId: "unauthenticated", method: "agentPresets/list", payload: { args: {} } }),
  });
  assert.equal(unauthenticated.status, 401);

  const session = await dsh.create("yiwu.my-agent", "fixture:collect");
  const result = await dsh.waitFor(() => dsh.history(session), (history) => contains(history, "AGENT_RESULT"), "sample must complete through the native loop");
  assert.match(JSON.stringify(result.records), /total\\?":69/);
  assert.match(JSON.stringify(result.records), /quantity\\?":7/);
  assert.ok(contains(result, "fixture://catalog/alpha"));
  assert.ok(contains(result, "fixture://catalog/beta"));
  const skills = await dsh.rpc("skills/list", { request: { sessionId: session } });
  assert.deepEqual(skills.skills.map((skill) => skill.name), ["my-agent-workflow"]);

  const official = await dsh.create("cordis", "fixture:probe");
  await dsh.waitFor(() => dsh.history(official), (history) => contains(history, "PROBE_COMPLETE"), "official preset must remain usable");
  const state = await dsh.state();
  assert.deepEqual(state.errors, []);
  assert.ok(state.calls.filter((call) => call.session === session).every((call) => call.tools.includes("my_agent_lookup")));
  assert.ok(state.calls.filter((call) => call.session === official).every((call) => !call.tools.includes("my_agent_lookup")));

  await dsh.stop();
  const patch = await readFile(patchPath, "utf8");
  await writeFile(patchPath, patch.replace("default: cordis", "default: standard") + '\n- id: template-test-fixture\n  config:\n    sentinel: !!js "\'preserve me\'"\n');
  await dsh.setup();
  const preserved = await readFile(patchPath, "utf8");
  assert.match(preserved, /default: standard/);
  assert.match(preserved, /!!js/);
  await dsh.start();
  assert.equal((await dsh.rpc("agentPresets/list")).presets.find((preset) => preset.id === "standard").isDefault, true);
  assert.deepEqual((await dsh.history(session)).records, result.records);
  await dsh.prompt(session, "fixture:collect");
  await dsh.waitFor(() => dsh.history(session), (history) => JSON.stringify(history.records).split("AGENT_RESULT").length >= 3, "stored session must continue after restart");
  assert.deepEqual((await dsh.state()).errors, []);
});
