import path from "node:path";
import sharp from "sharp";
import { collectImages, type CollectedImage } from "./images.js";
import { writeOutputs } from "../utils.js";
import type { OutputFile } from "../types.js";

export const IMAGE_FORMATS = ["png", "jpeg", "webp", "avif", "gif"] as const;
export const IMAGE_FITS = ["cover", "contain", "fill", "inside", "outside"] as const;
export const IMAGE_POSITIONS = [
  "center",
  "top",
  "top-right",
  "right",
  "bottom-right",
  "bottom",
  "bottom-left",
  "left",
  "top-left"
] as const;

export type ImageFormat = typeof IMAGE_FORMATS[number];
export type ImageFit = typeof IMAGE_FITS[number];
export type ImagePosition = typeof IMAGE_POSITIONS[number];

interface BatchOptions {
  input: string[];
  output: string;
}

export interface ResizeImagesOptions extends BatchOptions {
  width?: number;
  height?: number;
  fit: ImageFit;
  position?: ImagePosition;
  background?: string;
  allowUpscale?: boolean;
}

export interface CropImagesOptions extends BatchOptions {
  width: number;
  height: number;
  position: ImagePosition;
}

export interface ConvertImagesOptions extends BatchOptions {
  format: ImageFormat;
  quality?: number;
}

export interface ImageCommandResult {
  operation: "resize" | "crop" | "convert";
  output: string;
  images: number;
  files: string[];
  animatedInputs: number;
  framesWritten: number;
}

interface PreparedBatch {
  images: CollectedImage[];
  output: string;
  outputIsImage: boolean;
}

interface TransformedImage {
  file: OutputFile;
  inputFrames: number;
  outputFrames: number;
}

export async function resizeImages(options: ResizeImagesOptions): Promise<ImageCommandResult> {
  const width = optionalPositiveInteger(options.width, "width");
  const height = optionalPositiveInteger(options.height, "height");
  if (!width && !height) throw new Error("image resize requires width or height (--width/--height).");
  validateAllowed(options.fit, IMAGE_FITS, "fit");
  const position = options.position || "center";
  validateAllowed(position, IMAGE_POSITIONS, "position");
  const batch = await prepareBatch(options);
  const transformed: TransformedImage[] = [];

  for (const image of batch.images) {
    const outputName = targetName(image.name, batch.output, batch.outputIsImage);
    const format = batch.outputIsImage ? requiredFormatFromName(outputName) : requiredFormatFromName(image.name);
    const inputMetadata = await sharp(image.buffer, { animated: true }).metadata();
    const inputFrames = inputMetadata.pages || 1;
    const animated = isAnimatedFormat(format);
    const pipeline = sharp(image.buffer, { animated }).resize({
      width,
      height,
      fit: options.fit,
      position: toSharpPosition(position),
      background: options.background || "#00000000",
      withoutEnlargement: !options.allowUpscale
    });
    transformed.push({
      file: { name: outputName, content: await encode(pipeline, format) },
      inputFrames,
      outputFrames: animated ? inputFrames : 1
    });
  }

  return finishBatch("resize", batch, transformed);
}

export async function cropImages(options: CropImagesOptions): Promise<ImageCommandResult> {
  const width = positiveInteger(options.width, "width");
  const height = positiveInteger(options.height, "height");
  validateAllowed(options.position, IMAGE_POSITIONS, "position");
  const batch = await prepareBatch(options);
  const prepared: Array<{ image: CollectedImage; outputName: string; format: ImageFormat; inputFrames: number; left: number; top: number }> = [];

  for (const image of batch.images) {
    const outputName = targetName(image.name, batch.output, batch.outputIsImage);
    const format = batch.outputIsImage ? requiredFormatFromName(outputName) : requiredFormatFromName(image.name);
    const metadata = await sharp(image.buffer, { animated: true }).metadata();
    const sourceWidth = metadata.width || 0;
    const sourceHeight = metadata.pageHeight || metadata.height || 0;
    if (width > sourceWidth || height > sourceHeight) {
      throw new Error(`Crop ${width}x${height} is larger than source ${image.name} (${sourceWidth}x${sourceHeight}).`);
    }
    const offset = cropOffset(sourceWidth, sourceHeight, width, height, options.position);
    prepared.push({ image, outputName, format, inputFrames: metadata.pages || 1, ...offset });
  }

  const transformed: TransformedImage[] = [];
  for (const item of prepared) {
    const animated = isAnimatedFormat(item.format);
    const pipeline = sharp(item.image.buffer, { animated }).extract({ left: item.left, top: item.top, width, height });
    transformed.push({
      file: { name: item.outputName, content: await encode(pipeline, item.format) },
      inputFrames: item.inputFrames,
      outputFrames: animated ? item.inputFrames : 1
    });
  }

  return finishBatch("crop", batch, transformed);
}

export async function convertImages(options: ConvertImagesOptions): Promise<ImageCommandResult> {
  validateAllowed(options.format, IMAGE_FORMATS, "format");
  const quality = options.quality === undefined ? undefined : positiveInteger(options.quality, "quality", 100);
  const batch = await prepareBatch(options);
  if (batch.outputIsImage && requiredFormatFromName(batch.output) !== options.format) {
    throw new Error(`Output file extension must match --format ${options.format}.`);
  }
  const transformed: TransformedImage[] = [];

  for (const image of batch.images) {
    const outputName = batch.outputIsImage
      ? path.basename(batch.output)
      : replaceExtension(image.name, extensionForFormat(options.format));
    const metadata = await sharp(image.buffer, { animated: true }).metadata();
    const inputFrames = metadata.pages || 1;
    const animated = isAnimatedFormat(options.format);
    transformed.push({
      file: { name: outputName, content: await encode(sharp(image.buffer, { animated }), options.format, quality) },
      inputFrames,
      outputFrames: animated ? inputFrames : 1
    });
  }

  return finishBatch("convert", batch, transformed);
}

async function prepareBatch(options: BatchOptions): Promise<PreparedBatch> {
  const images = await collectImages(options.input || []);
  if (!images.length) throw new Error("Image command requires at least one image input.");
  const output = path.resolve(options.output);
  const outputIsImage = formatFromName(output) !== undefined;
  if (outputIsImage && images.length > 1) {
    throw new Error("An image file output can be used only when exactly one input image is provided.");
  }
  return { images, output, outputIsImage };
}

async function finishBatch(operation: ImageCommandResult["operation"], batch: PreparedBatch, transformed: TransformedImage[]): Promise<ImageCommandResult> {
  const files = transformed.map((item) => item.file);
  await writeOutputs(files, batch.outputIsImage ? path.dirname(batch.output) : batch.output);
  return {
    operation,
    output: batch.output,
    images: batch.images.length,
    files: files.map((file) => file.name),
    animatedInputs: transformed.filter((item) => item.inputFrames > 1).length,
    framesWritten: transformed.reduce((total, item) => total + item.outputFrames, 0)
  };
}

function targetName(inputName: string, output: string, outputIsImage: boolean): string {
  return outputIsImage ? path.basename(output) : inputName;
}

function replaceExtension(name: string, extension: string): string {
  const parsed = path.posix.parse(name);
  return path.posix.join(parsed.dir, `${parsed.name}.${extension}`);
}

function extensionForFormat(format: ImageFormat): string {
  return format === "jpeg" ? "jpg" : format;
}

function formatFromName(name: string): ImageFormat | undefined {
  const extension = path.extname(name).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "jpeg";
  const value = extension.slice(1);
  return IMAGE_FORMATS.includes(value as ImageFormat) ? value as ImageFormat : undefined;
}

function requiredFormatFromName(name: string): ImageFormat {
  const format = formatFromName(name);
  if (!format) throw new Error(`Cannot determine output format from ${name}. Use png|jpeg|webp|avif|gif.`);
  return format;
}

async function encode(pipeline: ReturnType<typeof sharp>, format: ImageFormat, quality?: number): Promise<Buffer> {
  if (format === "png") return pipeline.png().toBuffer();
  if (format === "jpeg") return pipeline.jpeg({ quality }).toBuffer();
  if (format === "webp") return pipeline.webp({ quality }).toBuffer();
  if (format === "avif") return pipeline.avif({ quality }).toBuffer();
  return pipeline.gif().toBuffer();
}

function isAnimatedFormat(format: ImageFormat): boolean {
  return format === "gif" || format === "webp";
}

function cropOffset(sourceWidth: number, sourceHeight: number, width: number, height: number, position: ImagePosition): { left: number; top: number } {
  const horizontal = position.includes("left") || position === "left" ? "left" : position.includes("right") || position === "right" ? "right" : "center";
  const vertical = position.includes("top") || position === "top" ? "top" : position.includes("bottom") || position === "bottom" ? "bottom" : "center";
  return {
    left: horizontal === "left" ? 0 : horizontal === "right" ? sourceWidth - width : Math.floor((sourceWidth - width) / 2),
    top: vertical === "top" ? 0 : vertical === "bottom" ? sourceHeight - height : Math.floor((sourceHeight - height) / 2)
  };
}

export function toSharpPosition(position: ImagePosition): string {
  const positions: Record<ImagePosition, string> = {
    center: "centre",
    top: "north",
    "top-right": "northeast",
    right: "east",
    "bottom-right": "southeast",
    bottom: "south",
    "bottom-left": "southwest",
    left: "west",
    "top-left": "northwest"
  };
  return positions[position];
}

function optionalPositiveInteger(value: number | undefined, name: string): number | undefined {
  return value === undefined ? undefined : positiveInteger(value, name);
}

function positiveInteger(value: number, name: string, max?: number): number {
  if (!Number.isInteger(value) || value <= 0 || (max !== undefined && value > max)) {
    throw new Error(`${name} must be a positive integer${max === undefined ? "" : ` no greater than ${max}`}.`);
  }
  return value;
}

function validateAllowed<T extends string>(value: T, allowed: readonly T[], name: string): void {
  if (!allowed.includes(value)) throw new Error(`${name} must be one of: ${allowed.join("|")}.`);
}
