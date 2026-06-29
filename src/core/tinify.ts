import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import tinify from "tinify";
import { ensureDir } from "../utils.js";

interface TinifyConfig {
  tinifyKey?: string;
}

export function tinifyConfigPath(): string {
  if (process.env.TEX_PACKER_CONFIG_FILE) return path.resolve(process.env.TEX_PACKER_CONFIG_FILE);
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configHome, "tex-packer-cli", "config.json");
}

export async function saveTinifyKey(key: string): Promise<{ path: string; saved: boolean }> {
  const trimmed = key.trim();
  if (!trimmed) throw new Error("TinyPNG/Tinify (熊猫压缩) API key cannot be empty.");
  const file = tinifyConfigPath();
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, `${JSON.stringify({ tinifyKey: trimmed }, null, 2)}\n`, { mode: 0o600 });
  return { path: file, saved: true };
}

export async function resolveTinifyKey(key?: string): Promise<string> {
  const resolved = key?.trim() || process.env.TINIFY_KEY?.trim() || (await readTinifyKey());
  if (!resolved) {
    throw new Error("TinyPNG/Tinify (熊猫压缩) compression requires an API key. Send the key to your assistant so they can configure TINIFY_KEY for you, or run `tex-packer tinify set-key <key>` yourself. You can also pass --tinify-key or set TINIFY_KEY.");
  }
  return resolved;
}

export async function tinifyBuffer(image: Buffer, key?: string): Promise<Buffer> {
  tinify.key = await resolveTinifyKey(key);
  return Buffer.from(await tinify.fromBuffer(image).toBuffer());
}

async function readTinifyKey(): Promise<string> {
  const file = tinifyConfigPath();
  try {
    const config = JSON.parse(await fs.readFile(file, "utf8")) as TinifyConfig;
    return config.tinifyKey?.trim() || "";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw new Error(`Invalid TinyPNG config at ${file}.`);
  }
}
