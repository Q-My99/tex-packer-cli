import path from "node:path";
import { pathExists } from "../utils.js";
import { bundledSkillDir, packageRoot, templateDir } from "../paths.js";

export async function doctor(): Promise<{ ok: boolean; checks: Array<{ name: string; ok: boolean; detail: string }> }> {
  const checks = [
    { name: "node", ok: Number(process.versions.node.split(".")[0]) >= 20, detail: process.versions.node },
    { name: "package-root", ok: await pathExists(packageRoot()), detail: packageRoot() },
    { name: "templates", ok: await pathExists(path.join(templateDir(), "JsonHash.mst")), detail: templateDir() },
    { name: "skill", ok: await pathExists(path.join(bundledSkillDir(), "SKILL.md")), detail: bundledSkillDir() }
  ];
  return { ok: checks.every((check) => check.ok), checks };
}
