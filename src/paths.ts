import path from "node:path";
import { fileURLToPath } from "node:url";

export function packageRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.basename(here) === "dist" ? path.dirname(here) : path.dirname(here);
}

export function templateDir(): string {
  return path.join(packageRoot(), "assets", "templates");
}

export function bundledSkillDir(): string {
  return path.join(packageRoot(), "skills", "tex-packer-cli");
}
