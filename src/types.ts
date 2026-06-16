export type TextureFormat = "png" | "jpg";
export type FilterType = "none" | "mask" | "grayscale";
export type TrimMode = "trim" | "crop";
export type PackerType = "MaxRectsBin" | "MaxRectsPacker" | "OptimalPacker";

export interface ImageInput {
  name: string;
  buffer: Buffer;
  width: number;
  height: number;
  hash: string;
}

export interface RectLike {
  name: string;
  file: string;
  image: ImageInput;
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  packWidth: number;
  packHeight: number;
  originalFile?: string;
  skipRender?: boolean;
  cloned?: boolean;
}

export interface PackOptions {
  textureName: string;
  textureFormat: TextureFormat;
  removeFileExtension: boolean;
  prependFolderName: boolean;
  scale: number;
  filter: FilterType;
  exporter: string;
  base64Export: boolean;
  tinify: boolean;
  tinifyKey: string;
  fileName: string;
  savePath: string;
  width: number;
  height: number;
  fixedSize: boolean;
  powerOfTwo: boolean;
  padding: number;
  extrude: number;
  allowRotation: boolean;
  allowTrim: boolean;
  trimMode: TrimMode;
  alphaThreshold: number;
  detectIdentical: boolean;
  packer: PackerType;
  packerMethod: string;
  customTemplate?: string;
  customExt?: string;
}

export interface ExporterInfo {
  type: string;
  description: string;
  allowTrim: boolean;
  allowRotation: boolean;
  template: string;
  fileExt: string;
  predefined?: boolean;
}

export interface OutputFile {
  name: string;
  content: string | Buffer;
}
