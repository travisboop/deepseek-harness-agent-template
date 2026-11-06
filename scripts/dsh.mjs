import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const home = resolve(process.env.DSH_HOME || join(root, ".dsh"));
const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve("@deepseek-ai/dsh/package.json")), "lib/bin.js");

export function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    env: { ...process.env, DSH_HOME: home },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`DSH exited: ${result.signal || result.status}`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  run(process.argv.slice(2));
}
