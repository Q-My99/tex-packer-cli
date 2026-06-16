import sharp, { type Sharp } from "sharp";
import type { PackOptions, RectLike } from "../types.js";
import { getSheetSize } from "./packer.js";

export async function renderSheet(sheet: RectLike[], options: PackOptions): Promise<Buffer> {
  const size = getSheetSize(sheet, options);
  const composites = [];
  for (const item of sheet) {
    if (item.skipRender) continue;
    const e = options.extrude || 0;
    let sprite = sharp(item.image.buffer)
      .extract({ left: item.spriteSourceSize.x, top: item.spriteSourceSize.y, width: item.spriteSourceSize.w, height: item.spriteSourceSize.h })
      .ensureAlpha();
    if (e) sprite = sprite.extend({ top: e, bottom: e, left: e, right: e, extendWith: "copy" });
    if (item.rotated) sprite = sprite.rotate(90);
    composites.push({ input: await sprite.png().toBuffer(), left: Math.max(0, item.frame.x - e), top: Math.max(0, item.frame.y - e) });
  }

  let image: Sharp = sharp({
    create: { width: size.width, height: size.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite(composites);

  if (options.scale !== 1) {
    image = image.resize({ width: Math.max(1, Math.round(size.width * options.scale)), height: Math.max(1, Math.round(size.height * options.scale)) });
  }
  image = await applyFilter(image, options.filter);
  return options.textureFormat === "jpg" ? image.flatten({ background: "#000000" }).jpeg().toBuffer() : image.png().toBuffer();
}

async function applyFilter(image: Sharp, filter: PackOptions["filter"]): Promise<Sharp> {
  if (filter === "none") return image;
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (filter === "grayscale") {
      const value = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    } else if (filter === "mask") {
      const value = data[i + 3] === 0 ? 0 : 255;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }
  }
  return sharp(data, { raw: info });
}
