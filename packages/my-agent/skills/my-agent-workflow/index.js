import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const name = "my-agent-workflow";
export const inject = ["skills"];

export function apply(ctx) {
  const path = fileURLToPath(new URL("./SKILL.md", import.meta.url));
  ctx.skills.register({
    name: "my-agent-workflow",
    description: "核对材料来源、数值计算、结论与证据缺口。",
    source: "bundled",
    path,
    resourceBase: { kind: "directory", path: fileURLToPath(new URL(".", import.meta.url)) },
    content: readFileSync(path, "utf8"),
  });
}
