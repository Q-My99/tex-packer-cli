import { Command } from "commander";
import { convertImages, cropImages, resizeImages, type ImageFit, type ImageFormat, type ImagePosition } from "../core/image-transform.js";
import { createSequenceGif } from "../core/gif.js";
import { createVideoGif } from "../core/ffmpeg.js";

export function addImageCommands(program: Command): void {
  const image = program.command("image").description("Resize, crop, convert, or create animated GIF images.");

  image.command("resize")
    .description("Resize one or more images while controlling aspect ratio and enlargement.")
    .requiredOption("--input <path...>", "image files, folders, or ZIP files")
    .requiredOption("--output <dir|zip|file>", "output directory, ZIP file, or single image file")
    .option("--width <n>", "target width in pixels", number)
    .option("--height <n>", "target height in pixels", number)
    .option("--fit <mode>", "cover|contain|fill|inside|outside", "inside")
    .option("--position <anchor>", "center|top|top-right|right|bottom-right|bottom|bottom-left|left|top-left", "center")
    .option("--background <color>", "background color used by contain", "#00000000")
    .option("--allow-upscale", "allow images to grow beyond their source dimensions")
    .addHelpText("after", `
Examples:
  tex-packer image resize --input ./photos --output ./small --width 512
  tex-packer image resize --input hero.png --output hero-square.webp --width 256 --height 256 --fit cover --position top
`)
    .action(async (cmd) => printJson(await resizeImages({
      input: cmd.input,
      output: cmd.output,
      width: cmd.width,
      height: cmd.height,
      fit: cmd.fit as ImageFit,
      position: cmd.position as ImagePosition,
      background: cmd.background,
      allowUpscale: !!cmd.allowUpscale
    })));

  image.command("crop")
    .description("Crop a fixed rectangle from one or more images without scaling.")
    .requiredOption("--input <path...>", "image files, folders, or ZIP files")
    .requiredOption("--output <dir|zip|file>", "output directory, ZIP file, or single image file")
    .requiredOption("--width <n>", "crop width in pixels", number)
    .requiredOption("--height <n>", "crop height in pixels", number)
    .option("--position <anchor>", "center|top|top-right|right|bottom-right|bottom|bottom-left|left|top-left", "center")
    .addHelpText("after", `
Examples:
  tex-packer image crop --input photo.png --output avatar.png --width 256 --height 256 --position center
  tex-packer image crop --input ./screenshots --output ./top-left --width 800 --height 600 --position top-left
`)
    .action(async (cmd) => printJson(await cropImages({
      input: cmd.input,
      output: cmd.output,
      width: cmd.width,
      height: cmd.height,
      position: cmd.position as ImagePosition
    })));

  image.command("convert")
    .description("Convert images between PNG, JPEG, WebP, AVIF, and GIF.")
    .requiredOption("--input <path...>", "image files, folders, or ZIP files")
    .requiredOption("--output <dir|zip|file>", "output directory, ZIP file, or single image file")
    .requiredOption("--format <type>", "png|jpeg|webp|avif|gif")
    .option("--quality <n>", "JPEG, WebP, or AVIF quality from 1 to 100", number)
    .addHelpText("after", `
Examples:
  tex-packer image convert --input photo.png --output photo.webp --format webp --quality 82
  tex-packer image convert --input ./icons --output ./avif --format avif --quality 70
`)
    .action(async (cmd) => printJson(await convertImages({
      input: cmd.input,
      output: cmd.output,
      format: cmd.format as ImageFormat,
      quality: cmd.quality
    })));

  image.command("gif")
    .description("Create an animated GIF from ordered image frames or a video (video requires FFmpeg).")
    .option("--input <path...>", "ordered image files or a frame directory")
    .option("--video <file>", "video input; requires the optional system FFmpeg executable")
    .requiredOption("--output <file.gif>", "output GIF file")
    .option("--fps <n>", "frames per second", number, 10)
    .option("--loop <n>", "animation iterations; 0 loops forever", number, 0)
    .option("--width <n>", "output width in pixels", number)
    .option("--height <n>", "output height in pixels", number)
    .option("--fit <mode>", "cover|contain|fill|inside|outside", "contain")
    .option("--position <anchor>", "center|top|top-right|right|bottom-right|bottom|bottom-left|left|top-left", "center")
    .option("--background <color>", "canvas background color", "#00000000")
    .option("--start <seconds>", "video start time in seconds", number)
    .option("--duration <seconds>", "video clip duration in seconds", number)
    .addHelpText("after", `
Examples:
  tex-packer image gif --input ./frames --output animation.gif --fps 12 --loop 0
  tex-packer image gif --video clip.mp4 --output clip.gif --fps 12 --start 2 --duration 4

Video input requires FFmpeg. Run "tex-packer doctor --json" to check availability.
`)
    .action(async (cmd) => {
      const hasInput = Array.isArray(cmd.input) && cmd.input.length > 0;
      const hasVideo = typeof cmd.video === "string" && cmd.video.length > 0;
      if (hasInput === hasVideo) throw new Error("image gif requires exactly one of --input or --video.");
      const shared = {
        output: cmd.output,
        fps: cmd.fps,
        loop: cmd.loop,
        width: cmd.width,
        height: cmd.height,
        fit: cmd.fit as ImageFit,
        position: cmd.position as ImagePosition,
        background: cmd.background
      };
      if (hasInput) printJson(await createSequenceGif({ ...shared, input: cmd.input }));
      else printJson(await createVideoGif({ ...shared, video: cmd.video, start: cmd.start, duration: cmd.duration }));
    });
}

function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function number(value: string): number {
  return Number(value);
}
