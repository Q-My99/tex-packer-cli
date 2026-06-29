import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { Command } from "commander";
import { APP_INFO, DEFAULT_OPTIONS, EXPORTERS, FILTERS, PACKERS, SPLITTERS } from "./constants.js";
import { saveProject } from "./core/project.js";
import { splitAtlas } from "./core/splitter.js";
import { installSkill, type SkillTarget } from "./skill/install.js";
import { packCommand, optionsFrom } from "./commands/pack.js";
import { compressCommand } from "./commands/compress.js";
import { doctor } from "./commands/doctor.js";
import { saveTinifyKey } from "./core/tinify.js";

const program = new Command();

program
  .name("tex-packer")
  .description("AI-friendly texture atlas packer, splitter, and TinyPNG/Tinify (熊猫压缩) image compressor.")
  .version(APP_INFO.version);

program.command("list")
  .description("List commands, exporters, packers, splitters, filters, or default options.")
  .argument("<kind>", "commands|exporters|packers|splitters|filters|options")
  .option("--json", "print JSON")
  .action((kind, cmd) => print(listKind(kind), cmd.json));

addPackOptions(
  program.command("pack")
    .description("Pack images, folders, ZIPs, or .ftpp projects into atlas files.")
    .option("--input <path...>", "image files, folders, or ZIP files")
    .option("--project <file>", "load a Free Texture Packer .ftpp project")
    .requiredOption("--output <dir|zip>", "output directory or ZIP file")
).action(async (cmd) => print(await packCommand(cmd), true));

program.command("compress")
  .description("Compress one or more images with TinyPNG/Tinify (熊猫压缩).")
  .requiredOption("--input <path...>", "image files, folders, or ZIP files")
  .requiredOption("--output <dir|zip|file>", "output directory, ZIP file, or single image file")
  .option("--tinify-key <key>", "TinyPNG/Tinify API key")
  .action(async (cmd) => print(await compressCommand(cmd), true));

program.command("split")
  .description("Split an atlas texture back into individual sprite images.")
  .requiredOption("--texture <file>", "atlas image")
  .option("--data <file>", "metadata file")
  .requiredOption("--output <dir|zip>", "output directory or ZIP file")
  .option("--format <type>", "auto|Grid|JSON (hash)|JSON (array)|XML|UIKit|Spine", "auto")
  .option("--cell-width <n>", "grid cell width", number, 32)
  .option("--cell-height <n>", "grid cell height", number, 32)
  .option("--padding <n>", "grid padding", number, 0)
  .option("--hold-trim", "write trimmed sprite rectangles")
  .action(async (cmd) => print(await splitAtlas({ texture: path.resolve(cmd.texture), data: cmd.data ? path.resolve(cmd.data) : undefined, output: path.resolve(cmd.output), format: cmd.format, cellWidth: cmd.cellWidth, cellHeight: cmd.cellHeight, padding: cmd.padding, holdTrim: !!cmd.holdTrim }), true));

program.command("inspect")
  .description("Inspect image, metadata, project, or any file.")
  .argument("<path>")
  .option("--json", "print JSON")
  .action(async (input, cmd) => print(await inspect(input), !!cmd.json));

const project = program.command("project").description("Project file helpers.");
addPackOptions(
  project.command("init")
    .description("Create a reusable .ftpp project file.")
    .requiredOption("--images <path...>", "image files, folders, or ZIP files")
    .requiredOption("--output <file>", "output .ftpp file")
).action(async (cmd) => {
  const data = await saveProject(path.resolve(cmd.output), cmd.images, optionsFrom(cmd));
  print({ output: path.resolve(cmd.output), images: data.images.length, folders: data.folders.length }, true);
});

const skill = program.command("skill").description("Install and locate the bundled agent skill.");
skill.command("install")
  .description("Install the bundled skill into Codex, Claude Code, OpenClaw, generic, or custom directory.")
  .option("--target <target>", "codex|claude|openclaw|generic|all", "all")
  .option("--dest <path>", "custom destination directory")
  .option("--dry-run", "print actions without changing files")
  .option("--no-deps", "copy skill without installing runtime dependencies")
  .action(async (cmd) => print({ installed: await installSkill({ target: cmd.target as SkillTarget, dest: cmd.dest, dryRun: cmd.dryRun, noDeps: cmd.deps === false }) }, true));

const tinify = program.command("tinify").description("Configure TinyPNG/Tinify (熊猫压缩) image compression.");
tinify.command("set-key")
  .description("Save a TinyPNG/Tinify API key for future compress and pack --tinify runs.")
  .argument("<key>", "TinyPNG/Tinify API key")
  .action(async (key) => print(await saveTinifyKey(key), true));

program.command("doctor")
  .description("Check runtime dependencies, package paths, templates, and bundled skill.")
  .option("--json", "print JSON")
  .action(async (cmd) => print(await doctor(), !!cmd.json));

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

function addPackOptions(command: Command): Command {
  return command
    .option("--texture-name <name>", "texture basename")
    .option("--texture-format <format>", "png or jpg")
    .option("--exporter <type>", "metadata exporter type")
    .option("--custom-template <file>", "custom Mustache template")
    .option("--custom-ext <ext>", "custom exporter file extension")
    .option("--width <n>", "atlas width", number)
    .option("--height <n>", "atlas height", number)
    .option("--fixed-size", "keep configured atlas size")
    .option("--power-of-two", "round output dimensions to powers of two")
    .option("--padding <n>", "sprite padding", number)
    .option("--extrude <n>", "edge extrusion", number)
    .option("--allow-rotation", "allow rotation")
    .option("--no-allow-rotation", "disable rotation")
    .option("--allow-trim", "allow transparent edge trimming")
    .option("--no-allow-trim", "disable trimming")
    .option("--trim-mode <mode>", "trim or crop")
    .option("--alpha-threshold <n>", "trim alpha threshold", number)
    .option("--detect-identical", "detect identical sprites")
    .option("--no-detect-identical", "disable identical detection")
    .option("--packer <type>", "MaxRectsBin|MaxRectsPacker|OptimalPacker")
    .option("--packer-method <method>", "packer method")
    .option("--scale <n>", "output scale", number)
    .option("--filter <type>", "none|mask|grayscale")
    .option("--base64-export", "embed base64 image in supported metadata")
    .option("--remove-file-extension", "strip sprite name extensions")
    .option("--prepend-folder-name", "keep folder names in metadata")
    .option("--no-prepend-folder-name", "use basename metadata names")
    .option("--tinify", "compress atlas image with TinyPNG/Tinify (熊猫压缩)")
    .option("--tinify-key <key>", "TinyPNG/Tinify API key");
}

function listKind(kind: string) {
  if (kind === "commands") return ["pack", "compress", "split", "inspect", "list", "project init", "skill install", "tinify set-key", "doctor"];
  if (kind === "exporters") return EXPORTERS.map((item) => item.type);
  if (kind === "packers") return PACKERS;
  if (kind === "splitters") return SPLITTERS;
  if (kind === "filters") return FILTERS;
  if (kind === "options") return DEFAULT_OPTIONS;
  throw new Error(`Unknown list kind: ${kind}`);
}

async function inspect(input: string) {
  const file = path.resolve(input);
  const ext = path.extname(file).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
    const meta = await sharp(file).metadata();
    return { type: "image", path: file, format: meta.format, width: meta.width, height: meta.height };
  }
  if (ext === ".ftpp") {
    const data = JSON.parse(await fs.readFile(file, "utf8"));
    return { type: "project", path: file, images: (data.images || []).length, folders: (data.folders || []).length, packOptions: data.packOptions || {} };
  }
  return { type: "file", path: file, bytes: (await fs.stat(file)).size };
}

function print(data: unknown, json?: boolean): void {
  if (json || typeof data !== "object" || data === null) {
    console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));
    return;
  }
  if (Array.isArray(data)) console.log(data.join("\n"));
  else console.log(JSON.stringify(data, null, 2));
}

function number(value: string): number {
  return Number(value);
}
