import { readdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { load, dump } from "js-yaml";
import { entryListSchema } from "@deepseek-ai/cordis-plugin-include";
import { root, home, run } from "./dsh.mjs";

if (process.argv.length > 2) throw new Error("用法：npm run setup");

// Native Bundle installation follows package metadata, including after a rename.
const packages = [];
for (const entry of (await readdir(join(root, "packages"), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isDirectory()) continue;
  const directory = join(root, "packages", entry.name);
  const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
  if (manifest.dsh?.bundle) packages.push(directory);
}
if (!packages.length) throw new Error("packages/ 中没有声明 dsh.bundle 的专业包");
run(["plugin", "--profile", "web", "add", ...packages]);

const path = join(home, "profiles/web/cordis.patch.yml");
let source = "";
try { source = await readFile(path, "utf8"); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const rows = load(source, { schema: entryListSchema }) ?? [];
if (!Array.isArray(rows)) throw new Error("web Profile patch 必须为 YAML 数组");
// Existing registry overrides belong to the user; retain them verbatim in meaning.
if (!rows.some((row) => row.id === "agent-preset-registry")) {
  rows.push({ id: "agent-preset-registry", config: { default: "cordis" } });
}
const updated = dump(rows, { schema: entryListSchema, lineWidth: -1, noRefs: true });
if (updated !== source) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, updated, { mode: 0o600 });
  await rename(temporary, path);
}
console.log("专业 Bundle 已装配到官方 Web。运行 npm start，新建会话选择你的 Agent。");
