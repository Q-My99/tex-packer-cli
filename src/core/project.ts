import fs from "node:fs/promises";
import path from "node:path";
import { APP_INFO, applyDefaults } from "../constants.js";
import type { PackOptions } from "../types.js";

export interface ProjectData {
  meta: { version: string };
  savePath: string;
  images: Array<{ name: string; path: string; folder: string }>;
  folders: string[];
  packOptions: PackOptions;
}

export async function loadProject(file: string): Promise<{ inputs: string[]; options: PackOptions; raw: ProjectData }> {
  const raw = JSON.parse(await fs.readFile(file, "utf8")) as ProjectData;
  return {
    inputs: [...(raw.images || []).map((item) => item.path).filter(Boolean), ...(raw.folders || [])],
    options: applyDefaults(raw.packOptions || {}),
    raw
  };
}

export async function saveProject(file: string, inputs: string[], options: Partial<PackOptions> = {}): Promise<ProjectData> {
  const images: ProjectData["images"] = [];
  const folders: string[] = [];
  for (const input of inputs) {
    const resolved = path.resolve(input);
    try {
      const stat = await fs.stat(resolved);
      if (stat.isDirectory()) folders.push(resolved);
      else images.push({ name: path.basename(resolved), path: resolved, folder: "" });
    } catch {
      images.push({ name: path.basename(resolved), path: resolved, folder: "" });
    }
  }
  const data: ProjectData = { meta: { version: APP_INFO.version }, savePath: options.savePath || "", images, folders, packOptions: applyDefaults(options) };
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
  return data;
}
