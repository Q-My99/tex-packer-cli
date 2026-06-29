import type { ExporterInfo, PackOptions } from "./types.js";

export const APP_INFO = {
  displayName: "Tex Packer CLI",
  version: "0.2.0",
  url: "https://github.com/Q-My99/tex-packer-cli"
};

export const EXPORTERS: ExporterInfo[] = [
  { type: "JSON (hash)", description: "Json hash", allowTrim: true, allowRotation: true, template: "JsonHash.mst", fileExt: "json" },
  { type: "JSON (array)", description: "Json array", allowTrim: true, allowRotation: true, template: "JsonArray.mst", fileExt: "json" },
  { type: "XML", description: "Plain XML format", allowTrim: true, allowRotation: true, template: "XML.mst", fileExt: "xml" },
  { type: "css (modern)", description: "css format", allowTrim: true, allowRotation: true, template: "Css.mst", fileExt: "css" },
  { type: "css (old)", description: "old css format", allowTrim: false, allowRotation: false, template: "OldCss.mst", fileExt: "css" },
  { type: "pixi.js", description: "pixi.js format", allowTrim: true, allowRotation: true, template: "JsonHash.mst", fileExt: "json" },
  { type: "Godot (atlas)", description: "Godot Atlas format", allowTrim: true, allowRotation: true, template: "GodotAtlas.mst", fileExt: "tpsheet" },
  { type: "Godot (tileset)", description: "Godot Tileset format", allowTrim: true, allowRotation: true, template: "GodotTileset.mst", fileExt: "tpset" },
  { type: "Phaser (hash)", description: "Phaser (json hash)", allowTrim: true, allowRotation: true, template: "JsonHash.mst", fileExt: "json" },
  { type: "Phaser (array)", description: "Phaser (json array)", allowTrim: true, allowRotation: true, template: "JsonArray.mst", fileExt: "json" },
  { type: "Phaser 3", description: "Phaser 3", allowTrim: true, allowRotation: true, template: "Phaser3.mst", fileExt: "json" },
  { type: "Spine", description: "Spine atlas", allowTrim: true, allowRotation: true, template: "Spine.mst", fileExt: "atlas" },
  { type: "cocos2d", description: "cocos2d format", allowTrim: true, allowRotation: true, template: "Cocos2d.mst", fileExt: "plist" },
  { type: "UnrealEngine", description: "UnrealEngine - Paper2d", allowTrim: true, allowRotation: true, template: "Unreal.mst", fileExt: "paper2dsprites" },
  { type: "Starling", description: "Starling format", allowTrim: true, allowRotation: true, template: "Starling.mst", fileExt: "xml" },
  { type: "UIKit", description: "UIKit sprite sheet", allowTrim: true, allowRotation: false, template: "UIKit.mst", fileExt: "plist", predefined: true },
  { type: "Unity3D", description: "Unity3D sprite sheet", allowTrim: true, allowRotation: false, template: "Unity3D.mst", fileExt: "tpsheet", predefined: true },
  { type: "Egret2D", description: "Egret2D sprite sheet", allowTrim: false, allowRotation: false, template: "Egret2D.mst", fileExt: "json", predefined: true },
  { type: "custom", description: "Custom format", allowTrim: true, allowRotation: true, template: "", fileExt: "" }
];

export const PACKERS = {
  MaxRectsBin: ["BestShortSideFit", "BestLongSideFit", "BestAreaFit", "BottomLeftRule", "ContactPointRule"],
  MaxRectsPacker: ["Smart", "SmartArea", "Square", "SquareArea"],
  OptimalPacker: ["Automatic"]
} as const;

export const SPLITTERS = ["Grid", "JSON (hash)", "JSON (array)", "XML", "UIKit", "Spine"] as const;
export const FILTERS = ["none", "mask", "grayscale"] as const;
export const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif"]);

export const DEFAULT_OPTIONS: PackOptions = {
  textureName: "texture",
  textureFormat: "png",
  removeFileExtension: false,
  prependFolderName: true,
  scale: 1,
  filter: "none",
  exporter: "JSON (hash)",
  base64Export: false,
  tinify: false,
  tinifyKey: "",
  fileName: "pack-result",
  savePath: "",
  width: 2048,
  height: 2048,
  fixedSize: false,
  powerOfTwo: false,
  padding: 0,
  extrude: 0,
  allowRotation: true,
  allowTrim: true,
  trimMode: "trim",
  alphaThreshold: 0,
  detectIdentical: true,
  packer: "MaxRectsBin",
  packerMethod: "BestShortSideFit"
};

export function getExporter(type: string): ExporterInfo | undefined {
  return EXPORTERS.find((item) => item.type === type);
}

export function applyDefaults(input: Partial<PackOptions> = {}): PackOptions {
  const merged: PackOptions = { ...DEFAULT_OPTIONS, ...stripUndefined(input) };
  merged.textureFormat = merged.textureFormat === "jpg" ? "jpg" : "png";
  merged.scale = Number(merged.scale) || 1;
  merged.width = Number(merged.width) || 0;
  merged.height = Number(merged.height) || 0;
  merged.padding = Number(merged.padding) || 0;
  merged.extrude = Number(merged.extrude) || 0;
  merged.alphaThreshold = Math.max(0, Math.min(255, Number(merged.alphaThreshold) || 0));
  if (!getExporter(merged.exporter)) merged.exporter = DEFAULT_OPTIONS.exporter;
  if (!(merged.packer in PACKERS)) merged.packer = DEFAULT_OPTIONS.packer;
  if (!PACKERS[merged.packer].includes(merged.packerMethod as never)) {
    merged.packerMethod = PACKERS[merged.packer][0];
  }
  if (!FILTERS.includes(merged.filter)) merged.filter = "none";
  if (merged.trimMode !== "crop") merged.trimMode = "trim";
  return merged;
}

function stripUndefined<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
