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
    expect(res.stdout).toContain("compress");
    expect(res.stdout).toContain("image resize");
    expect(res.stdout).toContain("image crop");
    expect(res.stdout).toContain("image convert");
    expect(res.stdout).toContain("image gif");
    expect(res.stdout).toContain("skill install");
    expect(res.stdout).toContain("tinify set-key");
  });

  it("describes image formats and every image subcommand", async () => {
    expect(JSON.parse(runDev("list", "image-formats", "--json").stdout)).toEqual(["png", "jpeg", "webp", "avif", "gif"]);

    const rootHelp = runDev("--help").stdout;
    const resizeHelp = runDev("image", "resize", "--help").stdout;
    const cropHelp = runDev("image", "crop", "--help").stdout;
    const convertHelp = runDev("image", "convert", "--help").stdout;
    const gifHelp = runDev("image", "gif", "--help").stdout;
    expect(rootHelp).toContain("image");
    expect(resizeHelp).toContain("--allow-upscale");
    expect(resizeHelp).toContain("Examples:");
    expect(cropHelp).toContain("--position");
    expect(cropHelp).toContain("Examples:");
    expect(convertHelp).toContain("png|jpeg|webp|avif|gif");
    expect(convertHelp).toContain("--quality");
    expect(gifHelp).toContain("--video");
    expect(gifHelp).toContain("--duration");
    expect(gifHelp).toContain("FFmpeg");

    const manifest = JSON.parse(await fs.readFile(path.join(root, "cli-manifest.json"), "utf8"));
    for (const name of ["image resize", "image crop", "image convert", "image gif"]) {
      expect(manifest.commands.find((command: { name: string; usage?: string }) => command.name === name)?.usage).toContain("tex-packer image");
    }
  });

  it("requires exactly one GIF source mode", () => {
    const output = path.join(os.tmpdir(), "animation.gif");
    const missing = runDevRaw("image", "gif", "--output", output);
    const conflicting = runDevRaw("image", "gif", "--input", "frames", "--video", "clip.mp4", "--output", output);

    expect(missing.status).not.toBe(0);
    expect(`${missing.stderr}\n${missing.stdout}`).toContain("exactly one of --input or --video");
    expect(conflicting.status).not.toBe(0);
    expect(`${conflicting.stderr}\n${conflicting.stdout}`).toContain("exactly one of --input or --video");
  });

  it("mentions image compression keywords in help", () => {
    const rootHelp = runDev("--help").stdout;
    const packHelp = runDev("pack", "--help").stdout;
    const compressHelp = runDev("compress", "--help").stdout;
    const tinifyHelp = runDev("tinify", "--help").stdout;
    const combined = `${rootHelp}\n${packHelp}\n${compressHelp}\n${tinifyHelp}`;

    expect(combined).toContain("compress");
    expect(combined).toContain("TinyPNG");
    expect(combined).toContain("Tinify");
    expect(combined).toContain("熊猫压缩");
  });

  it("checks sharp in doctor output", () => {
    const res = runDev("doctor", "--json");
    const report = JSON.parse(res.stdout);
    expect(report.ok).toBe(true);
    expect(report.checks.some((check: { name: string }) => check.name === "sharp")).toBe(true);
    expect(report.checks.find((check: { name: string }) => check.name === "ffmpeg")).toMatchObject({ optional: true });
  });

  it("saves a TinyPNG key without printing it", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tex-packer-cli-"));
    const config = path.join(tmp, "config.json");

    const res = runDevEnv({ TEX_PACKER_CONFIG_FILE: config }, "tinify", "set-key", "test-secret-key");
    const saved = JSON.parse(await fs.readFile(config, "utf8"));

    expect(JSON.parse(res.stdout)).toEqual({ path: config, saved: true });
    expect(res.stdout).not.toContain("test-secret-key");
    expect(saved.tinifyKey).toBe("test-secret-key");
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
  return runDevEnv({}, ...args);
}

function runDevEnv(env: NodeJS.ProcessEnv, ...args: string[]) {
  const res = runDevRawEnv(env, ...args);
  if (res.status !== 0) throw new Error(`${res.stderr}\n${res.stdout}`);
  return res;
}

function runDevRaw(...args: string[]) {
  return runDevRawEnv({}, ...args);
}

function runDevRawEnv(env: NodeJS.ProcessEnv, ...args: string[]) {
  return spawnSync("pnpm", ["tsx", "src/index.ts", ...args], { cwd: root, encoding: "utf8", env: { ...process.env, ...env } });
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
