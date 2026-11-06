import { readdir, readFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const excluded = new Set(["node_modules", ".git", ".dsh", ".agents", ".test-artifacts", ".backups", "coverage"]);
async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name) || entry.name.startsWith(".dsh.backup")) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile() && path.endsWith(".md")) files.push(path);
  }
  return files;
}
const markdown = await walk(root);
const errors = [];
for (const path of markdown) {
  for (const match of (await readFile(path, "utf8")).matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(match[1])) continue;
    const target = decodeURIComponent(match[1].split("#")[0]);
    try { await access(resolve(dirname(path), target)); }
    catch { errors.push(`${path.slice(root.length)} -> ${target}`); }
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else console.log(`Checked local links in ${markdown.length} Markdown files.`);
