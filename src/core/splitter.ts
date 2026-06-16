import fs from "node:fs/promises";
import sharp from "sharp";
import plist from "plist";
import xml2js from "xml2js";
import { SPLITTERS } from "../constants.js";
import { fixImageFileName, writeOutputs } from "../utils.js";

export interface SplitFrame {
  name: string;
  frame: { x: number; y: number; w: number; h: number };
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
}

export async function splitAtlas(options: {
  texture: string;
  data?: string;
  output: string;
  format: string;
  cellWidth: number;
  cellHeight: number;
  padding: number;
  holdTrim: boolean;
}): Promise<{ splitter: string; frames: number; output: string }> {
  const textureBuffer = await fs.readFile(options.texture);
  const textureMeta = await sharp(textureBuffer).metadata();
  const text = options.data ? await fs.readFile(options.data, "utf8") : "";
  const splitter = options.format === "auto" ? detectSplitter(text) : options.format;
  if (!SPLITTERS.includes(splitter as any)) throw new Error(`Unknown splitter: ${splitter}`);
  const frames = await parseFrames(splitter, text, {
    textureWidth: textureMeta.width || 1,
    textureHeight: textureMeta.height || 1,
    width: options.cellWidth || 32,
    height: options.cellHeight || 32,
    padding: options.padding || 0
  });
  const files = [];
  for (const frame of frames) {
    files.push({ name: fixImageFileName(frame.name), content: await extractFrame(textureBuffer, frame, options.holdTrim, splitter === "Spine") });
  }
  await writeOutputs(files, options.output);
  return { splitter, frames: frames.length, output: options.output };
}

export function detectSplitter(text: string): string {
  try {
    const json = JSON.parse(text);
    if (json?.frames && Array.isArray(json.frames)) return "JSON (array)";
    if (json?.frames) return "JSON (hash)";
  } catch {}
  try {
    const atlas = plist.parse(text) as any;
    const first = atlas?.frames?.[Object.keys(atlas.frames)[0]];
    if (first?.x !== undefined && first?.oW !== undefined) return "UIKit";
  } catch {}
  if (/^\s*<TextureAtlas[\s>]/.test(text)) return "XML";
  if (text.split(/\r?\n/)[2]?.trim().startsWith("size:")) return "Spine";
  return "Grid";
}

async function parseFrames(splitter: string, text: string, options: { textureWidth: number; textureHeight: number; width: number; height: number; padding: number }): Promise<SplitFrame[]> {
  if (splitter === "Grid") return gridFrames(options);
  if (splitter === "JSON (hash)") return Object.entries(JSON.parse(text).frames || {}).map(([name, item]: [string, any]) => ({ ...item, name: fixImageFileName(name) }));
  if (splitter === "JSON (array)") return (JSON.parse(text).frames || []).map((item: any) => ({ ...item, name: fixImageFileName(item.filename || item.name) }));
  if (splitter === "XML") return xmlFrames(text);
  if (splitter === "UIKit") return uiKitFrames(text);
  if (splitter === "Spine") return spineFrames(text);
  return [];
}

function gridFrames(options: { textureWidth: number; textureHeight: number; width: number; height: number; padding: number }): SplitFrame[] {
  const fw = options.width + options.padding * 2;
  const fh = options.height + options.padding * 2;
  const cols = Math.floor(options.textureWidth / fw);
  const rows = Math.floor(options.textureHeight / fh);
  const pad = String(cols * rows).length;
  const frames: SplitFrame[] = [];
  let index = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      frames.push(baseFrame(String(index).padStart(pad, "0"), x * fw + options.padding, y * fh + options.padding, options.width, options.height));
      index++;
    }
  }
  return frames;
}

async function xmlFrames(text: string): Promise<SplitFrame[]> {
  const atlas = await xml2js.parseStringPromise(text);
  return (atlas.TextureAtlas?.sprite || []).map((node: any) => {
    const a = node.$;
    const w = Number(a.w);
    const h = Number(a.h);
    const oW = Number(a.oW || a.w);
    const oH = Number(a.oH || a.h);
    return { name: fixImageFileName(a.n), frame: { x: Number(a.x), y: Number(a.y), w, h }, spriteSourceSize: { x: Number(a.oX || 0), y: Number(a.oY || 0), w, h }, sourceSize: { w: oW, h: oH }, rotated: a.r === "y", trimmed: w < oW || h < oH };
  });
}

function uiKitFrames(text: string): SplitFrame[] {
  const atlas = plist.parse(text) as any;
  return Object.keys(atlas.frames || {}).map((name) => {
    const item = atlas.frames[name];
    return { name: fixImageFileName(name), frame: { x: Number(item.x), y: Number(item.y), w: Number(item.w), h: Number(item.h) }, spriteSourceSize: { x: Number(item.oX), y: Number(item.oY), w: Number(item.w), h: Number(item.h) }, sourceSize: { w: Number(item.oW), h: Number(item.oH) }, rotated: false, trimmed: Number(item.w) < Number(item.oW) || Number(item.h) < Number(item.oH) };
  });
}

function spineFrames(text: string): SplitFrame[] {
  const frames: any[] = [];
  let current: any = null;
  for (const line of text.split(/\r?\n/).slice(6)) {
    if (!line) continue;
    if (line[0]?.trim()) {
      if (current) frames.push(finalizeSpine(current));
      current = { name: fixImageFileName(line.trim()) };
      continue;
    }
    if (!current) continue;
    const [key, raw] = line.trim().split(":");
    const parts = (raw || "").split(",").map((v) => v.trim());
    if (key === "rotate") current.rotated = raw.trim() === "true";
    if (key === "xy") current.frame = { ...(current.frame || {}), x: Number(parts[0]), y: Number(parts[1]) };
    if (key === "size") current.frame = { ...(current.frame || {}), w: Number(parts[0]), h: Number(parts[1]) };
    if (key === "orig") current.sourceSize = { w: Number(parts[0]), h: Number(parts[1]) };
    if (key === "offset") current.offset = { x: Number(parts[0]), y: Number(parts[1]) };
  }
  if (current) frames.push(finalizeSpine(current));
  return frames;
}

function finalizeSpine(item: any): SplitFrame {
  item.sourceSize ||= { w: item.frame.w, h: item.frame.h };
  item.spriteSourceSize = item.offset ? { x: item.offset.x, y: item.offset.y, w: item.frame.w, h: item.frame.h } : { x: 0, y: 0, w: item.frame.w, h: item.frame.h };
  item.trimmed = item.frame.w !== item.sourceSize.w || item.frame.h !== item.sourceSize.h;
  item.rotated ||= false;
  return item;
}

function baseFrame(name: string, x: number, y: number, w: number, h: number): SplitFrame {
  return { name: fixImageFileName(name), frame: { x, y, w, h }, spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h }, trimmed: false, rotated: false };
}

async function extractFrame(textureBuffer: Buffer, item: SplitFrame, holdTrim: boolean, inverseRotation: boolean): Promise<Buffer> {
  const width = item.rotated ? item.frame.h : item.frame.w;
  const height = item.rotated ? item.frame.w : item.frame.h;
  let sprite = sharp(textureBuffer).extract({ left: item.frame.x, top: item.frame.y, width, height });
  if (item.rotated) sprite = sprite.rotate(inverseRotation ? 90 : -90);
  const spriteBuffer = await sprite.png().toBuffer();
  if (holdTrim && item.trimmed) return spriteBuffer;
  return sharp({ create: { width: item.sourceSize.w, height: item.sourceSize.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: spriteBuffer, left: item.trimmed ? item.spriteSourceSize.x : 0, top: item.trimmed ? item.spriteSourceSize.y : 0 }])
    .png()
    .toBuffer();
}
