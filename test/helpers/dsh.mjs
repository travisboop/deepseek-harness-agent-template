import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const require = createRequire(import.meta.url);
export const root = fileURLToPath(new URL("../../", import.meta.url));
const runtimeManifest = require.resolve("@deepseek-ai/dsh/package.json");
export const runtime = JSON.parse(await readFile(runtimeManifest, "utf8"));
const cli = join(dirname(runtimeManifest), runtime.bin.dsh);
const redact = (value) => String(value).replace(/https?:\/\/\S+/g, "[URL redacted]");

export async function createDsh(t) {
  const scratch = await mkdtemp(join(tmpdir(), "dsh-template-test-"));
  const workspace = join(scratch, "workspace");
  const dshHome = join(scratch, "dsh");
  const agentsHome = join(scratch, "agents");
  await Promise.all([mkdir(workspace), mkdir(agentsHome)]);
  const env = Object.fromEntries(["PATH", "HOME", "TMPDIR", "SystemRoot", "PATHEXT"]
    .filter((key) => process.env[key]).map((key) => [key, process.env[key]]));
  Object.assign(env, {
    PATH: [dirname(process.execPath), join(root, "node_modules/.bin"), env.PATH ?? ""].join(delimiter),
    DSH_HOME: dshHome,
    DSH_AGENTS_HOME: agentsHome,
    CI: "true",
    NO_COLOR: "1",
  });
  let server, exited, origin, cookie, output = "";

  async function run(...args) {
    try {
      return await execute(process.execPath, [cli, ...args], { cwd: workspace, env, timeout: 90_000, maxBuffer: 4 * 1024 * 1024 });
    } catch (error) {
      throw new Error(redact(`DSH command failed: ${error.message}\n${error.stdout ?? ""}\n${error.stderr ?? ""}`));
    }
  }
  async function stop() {
    if (!server || server.exitCode !== null) return;
    server.kill("SIGTERM");
    const force = setTimeout(() => server.kill("SIGKILL"), 5_000);
    await exited;
    clearTimeout(force);
  }
  t.after(async () => {
    await stop();
    await rm(scratch, { recursive: true, force: true });
  });

  async function start() {
    output = "";
    server = spawn(process.execPath, [cli, "web", "--host", "127.0.0.1", "--port", "0", "--no-open"], {
      cwd: workspace, env, stdio: ["ignore", "pipe", "pipe"],
    });
    let spawnError;
    exited = new Promise((resolve) => {
      server.once("close", resolve);
      server.once("error", (error) => { spawnError = error; resolve(); });
    });
    for (const stream of [server.stdout, server.stderr]) {
      stream.setEncoding("utf8");
      stream.on("data", (chunk) => { output = (output + chunk).slice(-100_000); });
    }
    let launch;
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      assert.equal(server.exitCode, null, `DSH exited before startup: ${redact(output)}`);
      launch = output.match(/dsh web: (http:\/\/\S+)/)?.[1];
      if (launch) break;
      await delay(100);
    }
    assert.ok(launch, `DSH did not become ready: ${redact(output)}`);
    const auth = await fetch(launch, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
    assert.equal(auth.status, 303);
    origin = new URL(launch).origin;
    assert.equal(new URL(auth.headers.get("location"), launch).href, `${origin}/`);
    cookie = auth.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    assert.ok(cookie, "native authentication must establish a browser session");
  }
  async function request(path, options = {}) {
    return fetch(`${origin}${path}`, {
      ...options,
      headers: { cookie, ...options.headers },
      signal: AbortSignal.timeout(10_000),
    });
  }
  async function rpc(method, args = {}) {
    const result = await request(`/api/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "client-request", rpcId: randomUUID(), method, payload: { args } }),
    });
    assert.equal(result.status, 200, `${method} HTTP response`);
    const envelope = await result.json();
    assert.equal(envelope.result.ok, true, `${method}: ${JSON.stringify(envelope)}`);
    return envelope.result.value;
  }
  async function prompt(sessionId, text) {
    return rpc("session/prompt", { request: {
      sessionId, requestId: randomUUID(), mode: "queue", content: [{ type: "text", text }],
    } });
  }
  async function create(preset, text) {
    const session = await rpc("session/create", { request: { cwd: workspace, agentPreset: preset } });
    if (text) await prompt(session.sessionId, text);
    return session.sessionId;
  }
  async function history(sessionId, parentSessionId) {
    const projections = await rpc("session/projections", { request: { sessionId } });
    const page = await rpc("session/page", { request: {
      address: parentSessionId
        ? { kind: "subagent", parentSessionId, childSessionId: sessionId, mode: "continuable" }
        : { kind: "session", sessionId },
      throughSeq: projections.asOfSeq, maxMessages: 100,
    } });
    assert.equal(page.hasMore, false, "fixture history must fit in the requested page");
    return { records: page.records, projections };
  }
  async function children(parentSessionId) {
    return (await rpc("session/projections", { request: { sessionId: parentSessionId } })).values.subagentCatalog ?? [];
  }
  async function state() {
    const response = await request("/api/template-test/state");
    const body = await response.text();
    assert.equal(response.status, 200, `fixture diagnostics: ${body}\n${redact(output)}`);
    return JSON.parse(body);
  }
  async function waitFor(read, predicate, label, timeout = 20_000) {
    const deadline = Date.now() + timeout;
    let value;
    while (Date.now() < deadline) {
      value = await read();
      if (predicate(value)) return value;
      await delay(50);
    }
    throw new Error(`${label}\n${JSON.stringify(value)}\n${redact(output)}`);
  }
  return {
    scratch, workspace, dshHome, env, run, start, stop, request, rpc, create, prompt, history, children, state, waitFor,
    origin: () => origin,
    logs: () => redact(output),
    install: (...packages) => run("plugin", "--profile", "web", "add", ...packages.map((name) => join(root, name))),
    async setup(...args) {
      return execute(process.execPath, [join(root, "scripts/setup.mjs"), ...args], { cwd: root, env, timeout: 90_000, maxBuffer: 4 * 1024 * 1024 });
    },
  };
}
