import path from "node:path";
import { loadImages } from "../core/images.js";
import { tinifyBuffer } from "../core/tinify.js";
import { writeOutputs } from "../utils.js";
import type { OutputFile } from "../types.js";

interface CompressOptions {
  input: string[];
  output: string;
  tinifyKey?: string;
}

export async function compressCommand(raw: CompressOptions): Promise<{ output: string; images: number; files: string[] }> {
  const images = await loadImages(raw.input || []);
  if (!images.length) throw new Error("compress requires at least one image input.");

  const output = path.resolve(raw.output);
  const outputIsImage = isImageOutput(output);
  if (outputIsImage && images.length > 1) throw new Error("compress can write to an image file only when exactly one input image is provided.");

  const files: OutputFile[] = [];
  for (const image of images) {
    files.push({ name: outputIsImage ? path.basename(output) : image.name, content: await tinifyBuffer(image.buffer, raw.tinifyKey) });
  }

  await writeOutputs(files, outputIsImage ? path.dirname(output) : output);
  return { output, images: images.length, files: files.map((file) => outputIsImage ? path.basename(output) : file.name) };
}

function isImageOutput(output: string): boolean {
  return [".png", ".jpg", ".jpeg"].includes(path.extname(output).toLowerCase());
}
