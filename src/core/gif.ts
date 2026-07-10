import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { encode } from "modern-gif";
import { collectImages } from "./images.js";
import { IMAGE_FITS, IMAGE_POSITIONS, toSharpPosition, type ImageFit, type ImagePosition } from "./image-transform.js";

export interface SequenceGifOptions {
  input: string[];
  output: string;
  fps: number;
  loop: number;
  width?: number;
  height?: number;
  fit: ImageFit;
  position: ImagePosition;
  background?: string;
}

export interface GifCommandResult {
  operation: "gif";
  source: "sequence" | "video";
  output: string;
  frames: number | null;
  fps: number;
  loop: number;
}

export async function createSequenceGif(options: SequenceGifOptions): Promise<GifCommandResult> {
  validatePositiveNumber(options.fps, "fps");
  validateNonNegativeInteger(options.loop, "loop");
  const requestedWidth = optionalPositiveInteger(options.width, "width");
  const requestedHeight = optionalPositiveInteger(options.height, "height");
  validateAllowed(options.fit, IMAGE_FITS, "fit");
  validateAllowed(options.position, IMAGE_POSITIONS, "position");

  const output = path.resolve(options.output);
  if (path.extname(output).toLowerCase() !== ".gif") throw new Error("Sequence GIF output must use a .gif file extension.");

  const images = (await collectImages(options.input || [])).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  );
  if (!images.length) throw new Error("Sequence GIF requires at least one image input.");

  const firstMetadata = await sharp(images[0].buffer, { animated: false }).metadata();
  if (!firstMetadata.width || !firstMetadata.height) throw new Error(`Cannot determine dimensions for ${images[0].name}.`);
  const { width, height } = canvasSize(firstMetadata.width, firstMetadata.height, requestedWidth, requestedHeight);
  const fixedCanvasFit = options.fit === "inside" ? "contain" : options.fit === "outside" ? "cover" : options.fit;
  const frameData: Uint8ClampedArray<ArrayBuffer>[] = [];

  for (const image of images) {
    const buffer = await sharp(image.buffer, { animated: false })
      .resize({
        width,
        height,
        fit: fixedCanvasFit,
        position: toSharpPosition(options.position),
        background: options.background || "#00000000"
      })
      .ensureAlpha()
      .raw()
      .toBuffer();
    const pixels = new Uint8ClampedArray(new ArrayBuffer(buffer.length));
    pixels.set(buffer);
    frameData.push(pixels);
  }

  const delay = Math.max(1, Math.round(1000 / options.fps));
  const gif = await encode({
    width,
    height,
    looped: true,
    loopCount: options.loop === 0 ? 0 : options.loop - 1,
    maxColors: 255,
    frames: frameData.map((data) => ({ data, delay }))
  });
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, Buffer.from(gif));

  return { operation: "gif", source: "sequence", output, frames: images.length, fps: options.fps, loop: options.loop };
}

function canvasSize(sourceWidth: number, sourceHeight: number, width?: number, height?: number): { width: number; height: number } {
  if (width && height) return { width, height };
  if (width) return { width, height: Math.max(1, Math.round(sourceHeight * width / sourceWidth)) };
  if (height) return { width: Math.max(1, Math.round(sourceWidth * height / sourceHeight)), height };
  return { width: sourceWidth, height: sourceHeight };
}

function optionalPositiveInteger(value: number | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
  return value;
}

function validatePositiveNumber(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number.`);
}

function validateNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer.`);
}

function validateAllowed<T extends string>(value: T, allowed: readonly T[], name: string): void {
  if (!allowed.includes(value)) throw new Error(`${name} must be one of: ${allowed.join("|")}.`);
}
