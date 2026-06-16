import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import type { OutputFile } from "./types.js";

export function normalizeName(name: string): string {
  return name.split(path.sep).join("/").replace(/^\/+/, "");
}

export function smartSort(a: string, b: string): number {
  const ap = a.split("/");
  const bp = b.split("/");
  const an = ap.pop() || "";
  const bn = bp.pop() || "";
  if (ap.join("/") === bp.join("/")) {
    const ai = Number.parseInt(an.split(".").slice(0, -1).join("."), 10);
    const bi = Number.parseInt(bn.split(".").slice(0, -1).join("."), 10);
    if (!Number.isNaN(ai) && !Number.isNaN(bi)) return ai - bi;
  }
  return a.localeCompare(b);
}

export async function pathExists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeOutputs(files: OutputFile[], output: string): Promise<void> {
  if (output.toLowerCase().endsWith(".zip")) {
    const zip = new JSZip();
    for (const file of files) zip.file(file.name, file.content);
    await ensureDir(path.dirname(output));
    await fs.writeFile(output, await zip.generateAsync({ type: "nodebuffer" }));
    return;
  }
  await ensureDir(output);
  for (const file of files) {
    const outFile = path.join(output, file.name);
    await ensureDir(path.dirname(outFile));
    await fs.writeFile(outFile, file.content);
  }
}

export function fixImageFileName(name: string): string {
  const ext = path.extname(name).toLowerCase();
  return [".png", ".jpg", ".jpeg"].includes(ext) ? name : `${name}.png`;
}
