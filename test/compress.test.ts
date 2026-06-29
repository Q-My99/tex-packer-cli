import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const tinifyState = vi.hoisted(() => ({ key: "", calls: 0 }));
const originalTinifyKey = process.env.TINIFY_KEY;
const originalConfigFile = process.env.TEX_PACKER_CONFIG_FILE;

vi.mock("tinify", () => ({
  default: {
    set key(value: string) {
      tinifyState.key = value;
    },
    get key() {
      return tinifyState.key;
    },
    fromBuffer(buffer: Buffer) {
      tinifyState.calls += 1;
      return {
        async toBuffer() {
          return Buffer.concat([buffer, Buffer.from("-tiny")]);
        }
      };
    }
  }
}));

const { compressCommand } = await import("../src/commands/compress.js");
const { resolveTinifyKey, saveTinifyKey } = await import("../src/core/tinify.js");

describe("TinyPNG compression", () => {
  afterEach(() => {
    tinifyState.key = "";
    tinifyState.calls = 0;
    restoreEnv("TINIFY_KEY", originalTinifyKey);
    restoreEnv("TEX_PACKER_CONFIG_FILE", originalConfigFile);
  });

  it("resolves configured TinyPNG keys after environment keys", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tex-packer-cli-"));
    process.env.TEX_PACKER_CONFIG_FILE = path.join(tmp, "config.json");
    delete process.env.TINIFY_KEY;

    await saveTinifyKey("configured-key");
    expect(await resolveTinifyKey()).toBe("configured-key");

    process.env.TINIFY_KEY = "env-key";
    expect(await resolveTinifyKey()).toBe("env-key");
    expect(await resolveTinifyKey("cli-key")).toBe("cli-key");
  });

  it("explains how to configure a missing TinyPNG key", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tex-packer-cli-"));
    process.env.TEX_PACKER_CONFIG_FILE = path.join(tmp, "missing-config.json");
    delete process.env.TINIFY_KEY;

    await expect(resolveTinifyKey()).rejects.toThrow("Send the key to your assistant");
    await expect(resolveTinifyKey()).rejects.toThrow("tex-packer tinify set-key <key>");
    await expect(resolveTinifyKey()).rejects.toThrow("熊猫压缩");
  });

  it("rejects empty TinyPNG keys with compression keywords", async () => {
    await expect(saveTinifyKey(" ")).rejects.toThrow("TinyPNG/Tinify");
    await expect(saveTinifyKey(" ")).rejects.toThrow("熊猫压缩");
  });

  it("compresses multiple images into an output directory", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tex-packer-cli-"));
    const input = path.join(tmp, "input");
    const output = path.join(tmp, "output");
    await fs.mkdir(input);
    process.env.TINIFY_KEY = "env-key";

    await sharp({ create: { width: 4, height: 4, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } })
      .png()
      .toFile(path.join(input, "red.png"));
    await sharp({ create: { width: 4, height: 4, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } } })
      .png()
      .toFile(path.join(input, "blue.png"));

    const result = await compressCommand({ input: [input], output });

    expect(result.images).toBe(2);
    expect(result.files).toEqual(["input/blue.png", "input/red.png"]);
    expect(tinifyState.key).toBe("env-key");
    expect(tinifyState.calls).toBe(2);
    expect(await exists(path.join(output, "input", "red.png"))).toBe(true);
    expect(await exists(path.join(output, "input", "blue.png"))).toBe(true);
  });
});

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
