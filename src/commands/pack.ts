import path from "node:path";
import { applyDefaults } from "../constants.js";
import { loadImages } from "../core/images.js";
import { loadProject } from "../core/project.js";
import { packImages } from "../core/packer.js";
import { renderSheet } from "../core/render.js";
import { maybeTinify, renderMetadata } from "../core/exporter.js";
import { writeOutputs } from "../utils.js";
import type { PackOptions, OutputFile } from "../types.js";

export async function packCommand(raw: any): Promise<{ output: string; images: number; sheets: number; files: string[] }> {
  let inputs: string[] = raw.input || [];
  let baseOptions: Partial<PackOptions> = {};
  if (raw.project) {
    const project = await loadProject(path.resolve(raw.project));
    inputs = project.inputs;
    baseOptions = project.options;
  }
  if (!inputs.length) throw new Error("pack requires --input or --project.");
  const options = applyDefaults({ ...baseOptions, ...optionsFrom(raw) });
  const images = await loadImages(inputs);
  if (!images.length) throw new Error("No input images found.");
  const sheets = await packImages(images, options);
  const files: OutputFile[] = [];
  for (let index = 0; index < sheets.length; index++) {
    const imageName = options.textureName + (sheets.length > 1 ? `-${index}` : "");
    let image = await renderSheet(sheets[index], options);
    image = await maybeTinify(image, options);
    files.push({ name: `${imageName}.${options.textureFormat}`, content: image });
    files.push(await renderMetadata(options.exporter, sheets[index], options, image, imageName));
  }
  const output = path.resolve(raw.output);
  await writeOutputs(files, output);
  return { output, images: images.length, sheets: sheets.length, files: files.map((file) => file.name) };
}

export function optionsFrom(raw: any): Partial<PackOptions> {
  return {
    textureName: raw.textureName,
    textureFormat: raw.textureFormat,
    exporter: raw.exporter,
    customTemplate: raw.customTemplate ? path.resolve(raw.customTemplate) : undefined,
    customExt: raw.customExt,
    width: raw.width,
    height: raw.height,
    fixedSize: raw.fixedSize,
    powerOfTwo: raw.powerOfTwo,
    padding: raw.padding,
    extrude: raw.extrude,
    allowRotation: raw.allowRotation,
    allowTrim: raw.allowTrim,
    trimMode: raw.trimMode,
    alphaThreshold: raw.alphaThreshold,
    detectIdentical: raw.detectIdentical,
    packer: raw.packer,
    packerMethod: raw.packerMethod,
    scale: raw.scale,
    filter: raw.filter,
    base64Export: raw.base64Export,
    removeFileExtension: raw.removeFileExtension,
    prependFolderName: raw.prependFolderName,
    tinify: raw.tinify,
    tinifyKey: raw.tinifyKey
  };
}
