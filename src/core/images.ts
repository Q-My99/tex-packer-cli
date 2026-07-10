import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import JSZip from "jszip";
import { IMAGE_EXTENSIONS } from "../constants.js";
import type { ImageInput } from "../types.js";
import { normalizeName, smartSort } from "../utils.js";

export interface CollectedImage {
  name: string;
  buffer: Buffer;
}

export async function loadImages(inputs: string[]): Promise<ImageInput[]> {
  const images: ImageInput[] = [];
  for (const file of await collectImages(inputs)) {
    const meta = await sharp(file.buffer, { animated: false }).ensureAlpha().metadata();
    if (!meta.width || !meta.height) continue;
    images.push({
      name: file.name,
      buffer: file.buffer,
      width: meta.width,
      height: meta.height,
      hash: crypto.createHash("sha256").update(file.buffer).digest("hex")
    });
  }
  return images;
}

export async function collectImages(inputs: string[]): Promise<CollectedImage[]> {
  const files: CollectedImage[] = [];
  for (const input of inputs) files.push(...await collectInput(path.resolve(input)));

  const unique = new Map<string, CollectedImage>();
  for (const file of files) {
    const name = uniqueName(unique, normalizeName(file.name));
    unique.set(name, { ...file, name });
  }

  return [...unique.values()].sort((a, b) => smartSort(a.name, b.name));
}

async function collectInput(input: string): Promise<CollectedImage[]> {
  const stat = await fs.stat(input);
  if (stat.isDirectory()) return collectDir(input);
  if (path.extname(input).toLowerCase() === ".zip") return collectZip(input);
  if (IMAGE_EXTENSIONS.has(path.extname(input).toLowerCase())) {
    return [{ name: path.basename(input), buffer: await fs.readFile(input) }];
  }
  return [];
}

async function collectDir(dir: string): Promise<CollectedImage[]> {
  const rootName = path.basename(dir);
  const results: CollectedImage[] = [];
  async function walk(current: string): Promise<void> {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!full.toUpperCase().includes("__MACOSX")) await walk(full);
      } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        results.push({ name: `${rootName}/${normalizeName(path.relative(dir, full))}`, buffer: await fs.readFile(full) });
      }
    }
  }
  await walk(dir);
  return results;
}

async function collectZip(input: string): Promise<CollectedImage[]> {
  const zip = await JSZip.loadAsync(await fs.readFile(input));
  const results: CollectedImage[] = [];
  for (const name of Object.keys(zip.files).sort(smartSort)) {
    const file = zip.files[name];
    if (file.dir || name.toUpperCase().includes("__MACOSX")) continue;
    if (!IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase())) continue;
    results.push({ name: normalizeName(name), buffer: await file.async("nodebuffer") });
  }
  return results;
}

function uniqueName(map: Map<string, CollectedImage>, name: string): string {
  if (!map.has(name)) return name;
  const ext = path.extname(name);
  const base = name.slice(0, -ext.length);
  let index = 1;
  while (map.has(`${base}-${index}${ext}`)) index++;
  return `${base}-${index}${ext}`;
}
