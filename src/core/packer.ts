import sharp from "sharp";
import maxrects from "maxrects-packer";
import type { ImageInput, PackOptions, RectLike } from "../types.js";
import { PACKERS } from "../constants.js";

const { MaxRectsPacker, PACKING_LOGIC } = maxrects;

interface Combo {
  method: string;
  smart: boolean;
  square: boolean;
  allowRotation: boolean;
  logic: number;
}

export async function packImages(images: ImageInput[], options: PackOptions): Promise<RectLike[][]> {
  let rects: RectLike[] = [];
  const padding = options.padding || 0;
  const extrude = options.extrude || 0;
  let maxWidth = 0;
  let maxHeight = 0;
  let minWidth = 0;
  let minHeight = 0;

  for (const img of images) {
    const trim = options.allowTrim ? await trimImage(img, options.alphaThreshold) : undefined;
    const spriteSourceSize = trim || { x: 0, y: 0, w: img.width, h: img.height };
    const frame = { x: 0, y: 0, w: spriteSourceSize.w, h: spriteSourceSize.h };
    maxWidth += img.width;
    maxHeight += img.height;
    minWidth = Math.max(minWidth, frame.w + padding * 2 + extrude * 2);
    minHeight = Math.max(minHeight, frame.h + padding * 2 + extrude * 2);
    rects.push({
      name: img.name.split(".").slice(0, -1).join(".") || img.name,
      file: img.name,
      image: img,
      frame,
      rotated: false,
      trimmed: !!trim,
      spriteSourceSize,
      sourceSize: { w: img.width, h: img.height },
      packWidth: frame.w + padding * 2 + extrude * 2,
      packHeight: frame.h + padding * 2 + extrude * 2
    });
  }

  let width = options.width || maxWidth || 1;
  let height = options.height || maxHeight || 1;
  if (options.powerOfTwo) {
    width = nextPowerOfTwo(width);
    height = nextPowerOfTwo(height);
  }
  if (width < minWidth || height < minHeight) {
    throw new Error(`Invalid atlas size. Minimum required size is ${minWidth}x${minHeight}.`);
  }

  const identical: RectLike[] = [];
  if (options.detectIdentical) {
    const seen = new Map<string, RectLike>();
    rects = rects.filter((rect) => {
      const prior = seen.get(rect.image.hash);
      if (prior) {
        identical.push({ ...rect, originalFile: rect.file, skipRender: true, cloned: true, image: rect.image, name: rect.name, file: prior.file });
        return false;
      }
      seen.set(rect.image.hash, rect);
      return true;
    });
  }

  let best: { sheets: RectLike[][]; efficiency: number } | undefined;
  for (const combo of getCombos(options)) {
    const candidate = packWithCombo(cloneRects(rects), cloneRects(identical), width, height, options, combo);
    if (!best || candidate.sheets.length < best.sheets.length || (candidate.sheets.length === best.sheets.length && candidate.efficiency > best.efficiency)) {
      best = candidate;
    }
  }
  return best?.sheets || [];
}

export function getSheetSize(data: RectLike[], options: PackOptions): { width: number; height: number } {
  let width = options.width || 0;
  let height = options.height || 0;
  if (!options.fixedSize) {
    width = 0;
    height = 0;
    for (const item of data) {
      width = Math.max(width, item.rotated ? item.frame.x + item.frame.h : item.frame.x + item.frame.w);
      height = Math.max(height, item.rotated ? item.frame.y + item.frame.w : item.frame.y + item.frame.h);
    }
    width += options.padding + options.extrude;
    height += options.padding + options.extrude;
  }
  if (options.powerOfTwo) {
    width = nextPowerOfTwo(width);
    height = nextPowerOfTwo(height);
  }
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

async function trimImage(img: ImageInput, threshold: number): Promise<RectLike["spriteSourceSize"] | undefined> {
  const raw = await sharp(img.buffer).ensureAlpha().raw().toBuffer();
  let left = img.width;
  let right = -1;
  let top = img.height;
  let bottom = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const alpha = raw[(y * img.width + x) * 4 + 3];
      if (alpha > threshold) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left || bottom < top) return { x: 0, y: 0, w: 1, h: 1 };
  if (left === 0 && top === 0 && right === img.width - 1 && bottom === img.height - 1) return undefined;
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
}

function packWithCombo(rects: RectLike[], identical: RectLike[], width: number, height: number, options: PackOptions, combo: Combo): { sheets: RectLike[][]; efficiency: number } {
  const sheets: RectLike[][] = [];
  let remaining = rects;
  while (remaining.length) {
    const packer = new MaxRectsPacker(width, height, 0, {
      smart: combo.smart,
      pot: false,
      square: combo.square,
      allowRotation: combo.allowRotation,
      logic: combo.logic
    });
    packer.addArray(remaining.map((rect) => ({ width: rect.packWidth, height: rect.packHeight, data: rect })) as any);
    const packed = (packer.bins[0]?.rects || []).map((item: any) => {
      const rect = item.data as RectLike;
      rect.frame.x = item.x + options.padding + options.extrude;
      rect.frame.y = item.y + options.padding + options.extrude;
      rect.rotated = !!item.rot;
      return rect;
    });
    if (!packed.length) throw new Error(`Could not pack any sprites into ${width}x${height}.`);
    sheets.push(applyIdentical(packed, identical));
    const names = new Set(packed.map((rect) => rect.name));
    remaining = remaining.filter((rect) => !names.has(rect.name));
  }
  const sourceArea = rects.reduce((sum, rect) => sum + rect.sourceSize.w * rect.sourceSize.h, 0);
  const sheetArea = sheets.reduce((sum, sheet) => {
    const size = getSheetSize(sheet, options);
    return sum + size.width * size.height;
  }, 0) || 1;
  return { sheets, efficiency: sourceArea / sheetArea };
}

function applyIdentical(sheet: RectLike[], identical: RectLike[]): RectLike[] {
  const byHash = new Map(sheet.map((rect) => [rect.image.hash, rect]));
  const clones = identical.flatMap((item) => {
    const original = byHash.get(item.image.hash);
    if (!original) return [];
    return [{
      ...original,
      name: item.name,
      file: item.originalFile || item.name,
      image: item.image,
      originalFile: item.originalFile,
      skipRender: true,
      cloned: true,
      frame: { ...original.frame },
      spriteSourceSize: { ...original.spriteSourceSize },
      sourceSize: { ...original.sourceSize }
    }];
  });
  return [...sheet, ...clones];
}

function getCombos(options: PackOptions): Combo[] {
  const edge = PACKING_LOGIC.MAX_EDGE as number;
  const area = PACKING_LOGIC.MAX_AREA as number;
  const bin = PACKERS.MaxRectsBin.map((method) => ({ method, smart: method !== "BestAreaFit", square: false, logic: method === "BestAreaFit" ? area : edge }));
  const modern = [
    { method: "Smart", smart: true, square: false, logic: edge },
    { method: "SmartArea", smart: true, square: false, logic: area },
    { method: "Square", smart: false, square: true, logic: edge },
    { method: "SquareArea", smart: false, square: true, logic: area }
  ];
  const base = options.packer === "MaxRectsPacker" ? modern : options.packer === "OptimalPacker" ? [...bin, ...modern] : bin;
  const selected = options.packer === "OptimalPacker" ? base : base.filter((item) => item.method === options.packerMethod);
  return (selected.length ? selected : base).flatMap((item) => options.allowRotation
    ? [{ ...item, allowRotation: false }, { ...item, allowRotation: true }]
    : [{ ...item, allowRotation: false }]);
}

function cloneRects(rects: RectLike[]): RectLike[] {
  return rects.map((rect) => ({ ...rect, frame: { ...rect.frame }, spriteSourceSize: { ...rect.spriteSourceSize }, sourceSize: { ...rect.sourceSize } }));
}

function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(Math.max(1, value)));
}
