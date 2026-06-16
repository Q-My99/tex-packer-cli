import path from "node:path";
import sharp from "sharp";
import { pathExists } from "../utils.js";
import { bundledSkillDir, packageRoot, templateDir } from "../paths.js";

interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export async function doctor(): Promise<{ ok: boolean; checks: DoctorCheck[] }> {
  const checks = [
    { name: "node", ok: Number(process.versions.node.split(".")[0]) >= 20, detail: process.versions.node },
    { name: "package-root", ok: await pathExists(packageRoot()), detail: packageRoot() },
    await checkSharp(),
    { name: "templates", ok: await pathExists(path.join(templateDir(), "JsonHash.mst")), detail: templateDir() },
    { name: "skill", ok: await pathExists(path.join(bundledSkillDir(), "SKILL.md")), detail: bundledSkillDir() }
  ];
  return { ok: checks.every((check) => check.ok), checks };
}

async function checkSharp(): Promise<DoctorCheck> {
  try {
    await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    }).png().toBuffer();
    return { name: "sharp", ok: true, detail: sharp.versions.sharp || "available" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { name: "sharp", ok: false, detail: message };
  }
}
