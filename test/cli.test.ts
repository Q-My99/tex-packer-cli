import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const root = path.resolve(".");

describe("tex-packer CLI", () => {
  it("lists commands in dev mode", () => {
    const res = runDev("list", "commands");
    expect(res.stdout).toContain("pack");
    expect(res.stdout).toContain("skill install");
  });

  it("checks sharp in doctor output", () => {
    const res = runDev("doctor", "--json");
    const report = JSON.parse(res.stdout);
    expect(report.ok).toBe(true);
    expect(report.checks.some((check: { name: string }) => check.name === "sharp")).toBe(true);
  });

  it("packs sprites and splits the generated atlas", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tex-packer-cli-"));
    const sprites = path.join(tmp, "sprites");
    const atlas = path.join(tmp, "atlas");
    const split = path.join(tmp, "split");
    await fs.mkdir(sprites);

    await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } })
      .png()
      .toFile(path.join(sprites, "red.png"));
    await sharp({ create: { width: 10, height: 6, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } } })
      .extend({ top: 2, bottom: 2, left: 2, right: 2, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(sprites, "blue.png"));

    runDev("pack", "--input", sprites, "--output", atlas, "--width", "64", "--height", "64", "--padding", "1", "--extrude", "1");
    const metadata = JSON.parse(await fs.readFile(path.join(atlas, "texture.json"), "utf8"));
    expect(Object.keys(metadata.frames)).toHaveLength(2);
    expect(await exists(path.join(atlas, "texture.png"))).toBe(true);

    runDev("split", "--texture", path.join(atlas, "texture.png"), "--data", path.join(atlas, "texture.json"), "--output", split);
    expect(await exists(path.join(split, "sprites", "red.png"))).toBe(true);
    expect(await exists(path.join(split, "sprites", "blue.png"))).toBe(true);
  });
});

function runDev(...args: string[]) {
  const res = spawnSync("pnpm", ["tsx", "src/index.ts", ...args], { cwd: root, encoding: "utf8" });
  if (res.status !== 0) throw new Error(`${res.stderr}\n${res.stdout}`);
  return res;
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
