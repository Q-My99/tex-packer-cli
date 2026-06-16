import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { bundledSkillDir } from "../paths.js";

export type SkillTarget = "codex" | "claude" | "openclaw" | "generic" | "all";

export interface InstallSkillOptions {
  target: SkillTarget;
  dest?: string;
  dryRun?: boolean;
  noDeps?: boolean;
}

export async function installSkill(options: InstallSkillOptions): Promise<Array<{ target: string; path: string }>> {
  const source = bundledSkillDir();
  const destinations = resolveDestinations(options);
  for (const dest of destinations) {
    if (options.dryRun) {
      console.log(`[dry-run] copy ${source} -> ${dest.path}`);
    } else {
      await fsp.rm(dest.path, { recursive: true, force: true });
      await fsp.mkdir(path.dirname(dest.path), { recursive: true });
      fs.cpSync(source, dest.path, {
        recursive: true,
        force: true,
        filter: (entry) => !path.relative(source, entry).split(path.sep).includes("node_modules")
      });
      await fsp.writeFile(path.join(dest.path, "INSTALL-MANIFEST.json"), `${JSON.stringify({ name: "tex-packer-cli", target: dest.target, installedAt: new Date().toISOString() }, null, 2)}\n`);
    }
    if (!options.noDeps) installDeps(dest.path, options.dryRun);
  }
  return destinations;
}

function resolveDestinations(options: InstallSkillOptions): Array<{ target: string; path: string }> {
  if (options.dest) return [{ target: "custom", path: path.resolve(expandHome(options.dest)) }];
  const home = os.homedir();
  const roots = {
    codex: path.join(process.env.CODEX_HOME || path.join(home, ".codex"), "skills", "tex-packer-cli"),
    claude: path.join(process.env.CLAUDE_HOME || path.join(home, ".claude"), "skills", "tex-packer-cli"),
    openclaw: path.join(process.env.OPENCLAW_HOME || path.join(home, ".openclaw"), "skills", "tex-packer-cli"),
    generic: path.join(process.env.AI_SKILLS_HOME || path.join(home, ".ai-skills"), "tex-packer-cli")
  };
  const keys = options.target === "all" ? Object.keys(roots) : [options.target];
  return keys.map((key) => ({ target: key, path: roots[key as keyof typeof roots] }));
}

function installDeps(skillDir: string, dryRun?: boolean): void {
  const toolDir = path.join(skillDir, "scripts", "tex-packer-cli");
  if (dryRun) {
    console.log(`[dry-run] install dependencies in ${toolDir}`);
    return;
  }
  const command = commandExists("pnpm") ? "pnpm" : "npm";
  const args = command === "pnpm" ? ["install", "--prod"] : ["install", "--omit=dev"];
  const result = spawnSync(command, args, { cwd: toolDir, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed in ${toolDir}`);
}

function commandExists(command: string): boolean {
  return spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
}

function expandHome(input: string): string {
  if (input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}
