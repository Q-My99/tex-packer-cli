import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import mustache from "mustache";
import wax from "@jvitela/mustache-wax";
import { APP_INFO, getExporter } from "../constants.js";
import { templateDir } from "../paths.js";
import { tinifyBuffer } from "./tinify.js";
import type { PackOptions, RectLike } from "../types.js";

wax(mustache);

(mustache as typeof mustache & { Formatters: Record<string, (...args: any[]) => any> }).Formatters = {
  add: (v1, v2) => v1 + v2,
  subtract: (v1, v2) => v1 - v2,
  multiply: (v1, v2) => v1 * v2,
  divide: (v1, v2) => v1 / v2,
  offsetLeft: (start, size1, size2) => start + size1 / 2 - size2 / 2,
  offsetRight: (start, size1, size2) => size2 / 2 - (start + size1 / 2),
  mirror: (start, size1, size2) => size2 - start - size1,
  escapeName: (name) => String(name).replace(/%/g, "%25").replace(/#/g, "%23").replace(/:/g, "%3A").replace(/;/g, "%3B").replace(/\\/g, "-").replace(/\//g, "-")
};

export async function maybeTinify(image: Buffer, options: PackOptions): Promise<Buffer> {
  if (!options.tinify) return image;
  return tinifyBuffer(image, options.tinifyKey);
}

export async function renderMetadata(exporterType: string, sheet: RectLike[], options: PackOptions, imageBuffer: Buffer, imageName: string): Promise<{ name: string; content: string }> {
  const exporter = getExporter(exporterType);
  if (!exporter) throw new Error(`Unknown exporter: ${exporterType}`);
  const imageMeta = await sharp(imageBuffer).metadata();
  const ext = exporterType === "custom" ? options.customExt || "txt" : exporter.fileExt;
  const config = {
    imageName,
    imageFile: `${imageName}.${options.textureFormat}`,
    imageData: imageBuffer.toString("base64"),
    format: options.textureFormat === "png" ? "RGBA8888" : "RGB888",
    textureFormat: options.textureFormat,
    imageWidth: imageMeta.width || 1,
    imageHeight: imageMeta.height || 1,
    removeFileExtension: options.removeFileExtension,
    prependFolderName: options.prependFolderName,
    base64Export: options.base64Export,
    base64Prefix: options.textureFormat === "png" ? "data:image/png;base64," : "data:image/jpeg;base64,",
    scale: options.scale,
    trimMode: options.trimMode
  };
  const template = await loadTemplate(exporterType, exporter.template, options.customTemplate);
  return {
    name: `${imageName}.${ext}`,
    content: mustache.render(template, { rects: prepareRects(sheet, config), config, appInfo: APP_INFO })
  };
}

async function loadTemplate(type: string, template: string, customTemplate?: string): Promise<string> {
  if (type === "custom") {
    if (!customTemplate) throw new Error("Custom exporter requires --custom-template.");
    return fs.readFile(customTemplate, "utf8");
  }
  return fs.readFile(path.join(templateDir(), template), "utf8");
}

function prepareRects(sheet: RectLike[], config: any) {
  const rects = sheet.map((item) => {
    let name = item.originalFile || item.file;
    if (config.removeFileExtension) {
      const parts = name.split(".");
      if (parts.length > 1) parts.pop();
      name = parts.join(".");
    }
    if (!config.prependFolderName) name = name.split("/").pop() || name;
    const frame = { x: item.frame.x, y: item.frame.y, w: item.frame.w, h: item.frame.h, hw: item.frame.w / 2, hh: item.frame.h / 2 };
    const spriteSourceSize = { ...item.spriteSourceSize };
    const sourceSize = { ...item.sourceSize };
    let trimmed = item.trimmed;
    if (item.trimmed && config.trimMode === "crop") {
      trimmed = false;
      spriteSourceSize.x = 0;
      spriteSourceSize.y = 0;
      sourceSize.w = spriteSourceSize.w;
      sourceSize.h = spriteSourceSize.h;
    }
    if (config.scale !== 1) {
      for (const key of Object.keys(frame)) frame[key as keyof typeof frame] *= config.scale;
      for (const key of Object.keys(spriteSourceSize)) spriteSourceSize[key as keyof typeof spriteSourceSize] *= config.scale;
      sourceSize.w *= config.scale;
      sourceSize.h *= config.scale;
    }
    return { name, frame, spriteSourceSize, sourceSize, rotated: item.rotated, trimmed };
  });
  if (rects.length) {
    (rects[0] as any).first = true;
    (rects[rects.length - 1] as any).last = true;
  }
  return rects;
}
