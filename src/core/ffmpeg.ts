import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { IMAGE_FITS, IMAGE_POSITIONS, type ImageFit, type ImagePosition } from "./image-transform.js";
import type { GifCommandResult } from "./gif.js";

export interface VideoGifOptions {
  video: string;
  output: string;
  fps: number;
  loop: number;
  width?: number;
  height?: number;
  fit: ImageFit;
  position: ImagePosition;
  background?: string;
  start?: number;
  duration?: number;
}

export interface FfmpegCheck {
  name: "ffmpeg";
  ok: boolean;
  optional: true;
  detail: string;
}

export function buildVideoGifArgs(options: VideoGifOptions, temporaryOutput: string): string[] {
  validateVideoOptions(options);
  const args = ["-hide_banner", "-loglevel", "error", "-y"];
  if (options.start !== undefined) args.push("-ss", String(options.start));
  args.push("-i", path.resolve(options.video));
  if (options.duration !== undefined) args.push("-t", String(options.duration));
  args.push("-filter_complex", videoFilter(options));
  args.push("-loop", String(options.loop === 0 ? 0 : options.loop - 1));
  args.push(temporaryOutput);
  return args;
}

export async function createVideoGif(options: VideoGifOptions): Promise<GifCommandResult> {
  validateVideoOptions(options);
  const output = path.resolve(options.output);
  if (path.extname(output).toLowerCase() !== ".gif") throw new Error("Video GIF output must use a .gif file extension.");
  if (!checkFfmpeg().ok) {
    throw new Error("ffmpeg is required for video-to-GIF input but was not found. Install FFmpeg and run tex-packer doctor to verify it.");
  }
  await fs.access(path.resolve(options.video));
  await fs.mkdir(path.dirname(output), { recursive: true });
  const temporaryOutput = path.join(path.dirname(output), `.${path.basename(output, ".gif")}.${process.pid}-${Date.now()}.tmp.gif`);

  try {
    const result = spawnSync("ffmpeg", buildVideoGifArgs(options, temporaryOutput), {
      encoding: "utf8",
      stdio: ["ignore", "ignore", "pipe"]
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(result.stderr.trim() || `ffmpeg exited with status ${result.status}.`);
    }
    await fs.rename(temporaryOutput, output);
  } finally {
    await fs.rm(temporaryOutput, { force: true });
  }

  return { operation: "gif", source: "video", output, frames: null, fps: options.fps, loop: options.loop };
}

export function checkFfmpeg(): FfmpegCheck {
  const result = spawnSync("ffmpeg", ["-version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status === 0) {
    const detail = result.stdout.split(/\r?\n/, 1)[0] || "ffmpeg available";
    return { name: "ffmpeg", ok: true, optional: true, detail };
  }
  const detail = result.error instanceof Error
    ? `${result.error.message}; optional, required only for image gif --video`
    : "not found; optional, required only for image gif --video";
  return { name: "ffmpeg", ok: false, optional: true, detail };
}

function videoFilter(options: VideoGifOptions): string {
  const filters = [`fps=${options.fps}`];
  if (options.width && options.height) {
    const fit = options.fit === "inside" ? "contain" : options.fit === "outside" ? "cover" : options.fit;
    if (fit === "cover") {
      const { x, y } = ffmpegOffset(options.position, "iw-ow", "ih-oh");
      filters.push(`scale=${options.width}:${options.height}:force_original_aspect_ratio=increase`);
      filters.push(`crop=${options.width}:${options.height}:${x}:${y}`);
    } else if (fit === "contain") {
      const { x, y } = ffmpegOffset(options.position, "ow-iw", "oh-ih");
      filters.push(`scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease`);
      filters.push(`pad=${options.width}:${options.height}:${x}:${y}:color=${ffmpegColor(options.background || "#00000000")}`);
    } else {
      filters.push(`scale=${options.width}:${options.height}`);
    }
  } else if (options.width) {
    filters.push(`scale=${options.width}:-1`);
  } else if (options.height) {
    filters.push(`scale=-1:${options.height}`);
  }
  return `${filters.join(",")},split[s0][s1];[s0]palettegen=reserve_transparent=1[p];[s1][p]paletteuse=dither=sierra2_4a`;
}

function ffmpegOffset(position: ImagePosition, horizontalSpace: string, verticalSpace: string): { x: string; y: string } {
  const horizontal = position.includes("left") || position === "left" ? "left" : position.includes("right") || position === "right" ? "right" : "center";
  const vertical = position.includes("top") || position === "top" ? "top" : position.includes("bottom") || position === "bottom" ? "bottom" : "center";
  return {
    x: horizontal === "left" ? "0" : horizontal === "right" ? horizontalSpace : `(${horizontalSpace})/2`,
    y: vertical === "top" ? "0" : vertical === "bottom" ? verticalSpace : `(${verticalSpace})/2`
  };
}

function ffmpegColor(color: string): string {
  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color)) return `0x${color.slice(1)}`;
  if (/^[a-z]+(@(?:0(?:\.\d+)?|1(?:\.0+)?))?$/i.test(color)) return color;
  throw new Error("background must be a hex color or FFmpeg color name.");
}

function validateVideoOptions(options: VideoGifOptions): void {
  validatePositiveNumber(options.fps, "fps");
  if (!Number.isInteger(options.loop) || options.loop < 0) throw new Error("loop must be a non-negative integer.");
  optionalPositiveInteger(options.width, "width");
  optionalPositiveInteger(options.height, "height");
  optionalNonNegativeNumber(options.start, "start");
  if (options.duration !== undefined) validatePositiveNumber(options.duration, "duration");
  if (!IMAGE_FITS.includes(options.fit)) throw new Error(`fit must be one of: ${IMAGE_FITS.join("|")}.`);
  if (!IMAGE_POSITIONS.includes(options.position)) throw new Error(`position must be one of: ${IMAGE_POSITIONS.join("|")}.`);
}

function optionalPositiveInteger(value: number | undefined, name: string): void {
  if (value !== undefined && (!Number.isInteger(value) || value <= 0)) throw new Error(`${name} must be a positive integer.`);
}

function optionalNonNegativeNumber(value: number | undefined, name: string): void {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new Error(`${name} must be a non-negative number.`);
}

function validatePositiveNumber(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number.`);
}
