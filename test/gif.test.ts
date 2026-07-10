import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { createSequenceGif } from "../src/core/gif.js";

describe("sequence GIF creation", () => {
  it("encodes naturally sorted frames with timing and loop metadata", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tex-packer-gif-"));
    const frames = path.join(tmp, "frames");
    const output = path.join(tmp, "animation.gif");
    await fs.mkdir(frames);
    await solidFrame(path.join(frames, "frame-10.png"), 4, 2, { r: 255, g: 0, b: 0, alpha: 1 });
    await solidFrame(path.join(frames, "frame-2.png"), 4, 2, { r: 0, g: 0, b: 255, alpha: 1 });

    const result = await createSequenceGif({
      input: [frames],
      output,
      fps: 10,
      loop: 0,
      fit: "contain",
      position: "center",
      background: "#00000000"
    });

    const metadata = await sharp(output, { animated: true }).metadata();
    const pixels = await sharp(output, { animated: true }).ensureAlpha().raw().toBuffer();
    expect(result).toMatchObject({ operation: "gif", source: "sequence", frames: 2, fps: 10, loop: 0 });
    expect(metadata).toMatchObject({ format: "gif", width: 4, pageHeight: 2, pages: 2, loop: 0 });
    expect(metadata.delay).toEqual([100, 100]);
    expect([...pixels.subarray(0, 4)]).toEqual([0, 0, 255, 255]);
  });

  it("uses the first frame as the default canvas and contains differently sized frames", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tex-packer-gif-canvas-"));
    const first = path.join(tmp, "1.png");
    const second = path.join(tmp, "2.png");
    const output = path.join(tmp, "animation.gif");
    await solidFrame(first, 6, 4, { r: 255, g: 0, b: 0, alpha: 1 });
    await solidFrame(second, 2, 6, { r: 0, g: 255, b: 0, alpha: 1 });

    await createSequenceGif({
      input: [first, second],
      output,
      fps: 20,
      loop: 3,
      fit: "contain",
      position: "center",
      background: "#00000000"
    });

    expect(await sharp(output, { animated: true }).metadata()).toMatchObject({
      width: 6,
      pageHeight: 4,
      pages: 2,
      delay: [50, 50],
      loop: 3
    });
  });

  it("supports an explicit canvas size", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tex-packer-gif-size-"));
    const frame = path.join(tmp, "frame.png");
    const output = path.join(tmp, "animation.gif");
    await solidFrame(frame, 8, 4, { r: 100, g: 100, b: 100, alpha: 1 });

    await createSequenceGif({
      input: [frame],
      output,
      fps: 10,
      loop: 0,
      width: 4,
      height: 4,
      fit: "contain",
      position: "center",
      background: "#00000000"
    });

    expect(await sharp(output).metadata()).toMatchObject({ width: 4, height: 4, format: "gif" });
  });

  it("validates inputs, output, fps, loop, fit, position, and dimensions", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tex-packer-gif-errors-"));
    const frame = path.join(tmp, "frame.png");
    await solidFrame(frame, 2, 2, { r: 0, g: 0, b: 0, alpha: 1 });
    const base = { input: [frame], output: path.join(tmp, "animation.gif"), fps: 10, loop: 0, fit: "contain" as const, position: "center" as const };

    await expect(createSequenceGif({ ...base, input: [] })).rejects.toThrow("at least one image");
    await expect(createSequenceGif({ ...base, output: path.join(tmp, "animation.webp") })).rejects.toThrow(".gif");
    await expect(createSequenceGif({ ...base, fps: 0 })).rejects.toThrow("fps");
    await expect(createSequenceGif({ ...base, loop: -1 })).rejects.toThrow("loop");
    await expect(createSequenceGif({ ...base, width: 0 })).rejects.toThrow("width");
    await expect(createSequenceGif({ ...base, fit: "wide" as never })).rejects.toThrow("cover|contain|fill|inside|outside");
    await expect(createSequenceGif({ ...base, position: "middle" as never })).rejects.toThrow("top-right");
  });
});

async function solidFrame(file: string, width: number, height: number, background: { r: number; g: number; b: number; alpha: number }): Promise<void> {
  await sharp({ create: { width, height, channels: 4, background } }).png().toFile(file);
}
