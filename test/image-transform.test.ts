import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import sharp from "sharp";
import { convertImages, cropImages, resizeImages } from "../src/core/image-transform.js";

describe("static image transforms", () => {
  it("resizes while preserving aspect ratio and does not upscale by default", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tex-packer-resize-"));
    const source = path.join(tmp, "source.png");
    const smallSource = path.join(tmp, "small.png");
    const output = path.join(tmp, "resized.png");
    const smallOutput = path.join(tmp, "small-resized.png");
    await solidImage(source, 8, 4, { r: 255, g: 0, b: 0, alpha: 1 });
    await solidImage(smallSource, 2, 1, { r: 0, g: 255, b: 0, alpha: 1 });

    const result = await resizeImages({ input: [source], output, width: 4, fit: "inside", allowUpscale: false });
    await resizeImages({ input: [smallSource], output: smallOutput, width: 4, fit: "inside", allowUpscale: false });

    expect(result).toMatchObject({ operation: "resize", images: 1, files: ["resized.png"] });
    expect(await sharp(output).metadata()).toMatchObject({ width: 4, height: 2, format: "png" });
    expect(await sharp(smallOutput).metadata()).toMatchObject({ width: 2, height: 1 });
  });

  it("maps nine-grid positions to Sharp resize gravity", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tex-packer-resize-position-"));
    const source = path.join(tmp, "source.png");
    const output = path.join(tmp, "resized.png");
    await solidImage(source, 4, 4, { r: 255, g: 0, b: 0, alpha: 1 });

    await resizeImages({ input: [source], output, width: 2, height: 2, fit: "cover", position: "top-right" });

    expect(await sharp(output).metadata()).toMatchObject({ width: 2, height: 2 });
  });

  it("crops pixels from the requested positional anchor without scaling", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tex-packer-crop-"));
    const source = path.join(tmp, "source.png");
    const output = path.join(tmp, "right.png");
    const pixels = Buffer.from([
      255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255, 255,
      255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255, 255
    ]);
    await sharp(pixels, { raw: { width: 4, height: 2, channels: 4 } }).png().toFile(source);

    await cropImages({ input: [source], output, width: 2, height: 2, position: "right" });

    const raw = await sharp(output).raw().toBuffer();
    expect(await sharp(output).metadata()).toMatchObject({ width: 2, height: 2 });
    expect([...raw]).toEqual([
      0, 0, 255, 255, 0, 0, 255, 255,
      0, 0, 255, 255, 0, 0, 255, 255
    ]);
  });

  it("converts a directory and preserves relative paths with canonical extensions", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tex-packer-convert-"));
    const input = path.join(tmp, "input");
    const nested = path.join(input, "nested");
    const output = path.join(tmp, "output");
    await fs.mkdir(nested, { recursive: true });
    await solidImage(path.join(nested, "photo.png"), 3, 2, { r: 40, g: 80, b: 120, alpha: 1 });

    const result = await convertImages({ input: [input], output, format: "webp", quality: 82 });
    const target = path.join(output, "input", "nested", "photo.webp");

    expect(result.files).toEqual(["input/nested/photo.webp"]);
    expect(await sharp(target).metadata()).toMatchObject({ format: "webp", width: 3, height: 2 });
  });

  it("converts ZIP input to ZIP output", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tex-packer-convert-zip-"));
    const source = await sharp({
      create: { width: 2, height: 2, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 1 } }
    }).png().toBuffer();
    const inputZip = new JSZip();
    inputZip.file("nested/photo.png", source);
    const input = path.join(tmp, "input.zip");
    const output = path.join(tmp, "output.zip");
    await fs.writeFile(input, await inputZip.generateAsync({ type: "nodebuffer" }));

    await convertImages({ input: [input], output, format: "jpeg", quality: 90 });

    const resultZip = await JSZip.loadAsync(await fs.readFile(output));
    const converted = await resultZip.file("nested/photo.jpg")?.async("nodebuffer");
    expect(converted).toBeDefined();
    expect((await sharp(converted).metadata()).format).toBe("jpeg");
  });

  it("validates dimensions, crop bounds, options, and file output cardinality", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "tex-packer-transform-errors-"));
    const first = path.join(tmp, "first.png");
    const second = path.join(tmp, "second.png");
    await solidImage(first, 2, 2, { r: 255, g: 0, b: 0, alpha: 1 });
    await solidImage(second, 2, 2, { r: 0, g: 0, b: 255, alpha: 1 });

    await expect(resizeImages({ input: [first], output: path.join(tmp, "out.png"), fit: "inside" }))
      .rejects.toThrow("width or height");
    await expect(resizeImages({ input: [first], output: path.join(tmp, "out.png"), width: 1, fit: "diagonal" as never }))
      .rejects.toThrow("cover|contain|fill|inside|outside");
    await expect(cropImages({ input: [first], output: path.join(tmp, "crop.png"), width: 3, height: 2, position: "center" }))
      .rejects.toThrow("larger than source");
    await expect(cropImages({ input: [first], output: path.join(tmp, "crop.png"), width: 1, height: 1, position: "middle" as never }))
      .rejects.toThrow("top-right");
    await expect(convertImages({ input: [first], output: path.join(tmp, "out.bin"), format: "bmp" as never }))
      .rejects.toThrow("png|jpeg|webp|avif|gif");
    await expect(convertImages({ input: [first, second], output: path.join(tmp, "out.webp"), format: "webp" }))
      .rejects.toThrow("only when exactly one input image");
  });
});

async function solidImage(file: string, width: number, height: number, background: { r: number; g: number; b: number; alpha: number }): Promise<void> {
  await sharp({ create: { width, height, channels: 4, background } }).png().toFile(file);
}
