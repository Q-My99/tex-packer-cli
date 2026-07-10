# Image Processing Commands Design

## Context

Tex Packer CLI already uses `sharp` for texture packing, atlas splitting, image inspection, and static image loading. It also has established conventions for processing one file, multiple files, directories, and ZIP archives. The new image-processing features should extend those conventions without turning the atlas commands into a generic pipeline language.

## Goals

- Add discoverable commands for image resizing, positional cropping, and common format conversion.
- Create animated GIFs from ordered image sequences without requiring FFmpeg.
- Create animated GIFs from video when the optional system `ffmpeg` executable is available.
- Preserve existing relative directory structure for batch and ZIP workflows.
- Keep command help, machine-readable discovery files, English and Chinese documentation, and the bundled Agent Skill synchronized.

## Non-goals

- Exact rectangle cropping with `left` and `top` coordinates.
- Aspect-ratio presets such as `1:1` or `16:9`.
- General-purpose ordered transform pipelines.
- Video editing beyond selecting a start time, duration, frame rate, and output size for GIF creation.
- Bundling an FFmpeg binary in the npm package.

## CLI Structure

The new commands live under an `image` command group:

```bash
tex-packer image resize --input ./images --output ./resized --width 512
tex-packer image crop --input ./photo.png --output ./avatar.png --width 256 --height 256 --position center
tex-packer image convert --input ./images --output ./webp --format webp --quality 82
tex-packer image gif --input ./frames --output ./animation.gif --fps 12 --loop 0
tex-packer image gif --video ./clip.mp4 --output ./clip.gif --fps 12 --start 2 --duration 4
```

This keeps image utilities discoverable without adding four unrelated top-level commands. A single `transform` command was rejected because it would require operation ordering and conflict rules that are unnecessary for the requested first version. Separate top-level commands were rejected because they would make the root command list increasingly crowded.

## Shared Input and Output Behavior

- `resize`, `crop`, and `convert` accept one or more image files, directories, or ZIP archives through `--input <path...>`.
- A single input may target one image file. Multiple inputs must target a directory or ZIP archive.
- Directory and ZIP outputs preserve normalized relative input paths.
- Batch conversion replaces file extensions with the selected canonical extension. JPEG output uses `.jpg`.
- Commands collect and validate all inputs before writing output files.
- Successful commands print JSON containing the operation, absolute output path, processed image count, and written file names.
- PNG, JPEG, WebP, AVIF, and GIF are recognized as image inputs. Existing packing behavior continues to consume supported static images as before.

## Resize

`image resize` requires at least one of `--width` or `--height`.

- Default fit: `inside`.
- Supported fits: `cover`, `contain`, `fill`, `inside`, and `outside`.
- Default behavior does not enlarge an image; `--allow-upscale` opts into enlargement.
- `--position` controls `cover` cropping or `contain` placement.
- Supported positions are `center`, `top`, `top-right`, `right`, `bottom-right`, `bottom`, `bottom-left`, `left`, and `top-left`.
- `--background` accepts a Sharp-compatible color for `contain`; the default is transparent.
- Batch output keeps each source format. A single output file may use a supported extension to select its output format.

## Crop

`image crop` requires positive integer `--width` and `--height` values.

- Cropping extracts pixels without scaling.
- `--position` uses the same nine positions as `resize` and defaults to `center`.
- If the crop rectangle is larger than a source frame, the command fails before writing any files.
- Animated GIF/WebP inputs are cropped frame-by-frame when the output format supports animation.

## Convert

`image convert` requires `--format png|jpeg|webp|avif|gif`.

- `--quality <1-100>` applies to JPEG, WebP, and AVIF. GIF output uses a fixed 256-color palette in this version.
- Animated GIF or WebP input retains frames and timing when the output is GIF or WebP.
- Converting an animated input to PNG, JPEG, or AVIF writes the first frame and reports `animatedInput: true` and `framesWritten: 1` in the JSON result.
- Static images converted to GIF produce a valid single-frame GIF.

## Animated GIF Creation

`image gif` accepts exactly one source mode:

- `--input <path...>` for image files or one directory containing an ordered frame sequence.
- `--video <file>` for a video decoded by FFmpeg.

Shared options:

- `--output <file.gif>` is required.
- `--fps <n>` defaults to `10` and must be positive.
- `--loop <n>` defaults to `0`, meaning infinite looping.
- Optional `--width`, `--height`, `--fit`, `--position`, and `--background` normalize frame dimensions.
- When no size is supplied, the first sequence frame determines the canvas size.
- Differently sized sequence frames default to `contain` on a transparent canvas so content is not silently lost.

Sequence frames are naturally sorted with the project's existing smart filename ordering. `sharp` decodes and normalizes each frame to RGBA data, and the typed, pure-JavaScript `modern-gif` package encodes the animation. This path does not require FFmpeg.

Video input is passed to the system `ffmpeg` executable using argument arrays rather than a shell command. `--start <seconds>` and `--duration <seconds>` allow bounded clips; frame rate and resize/crop behavior are expressed as FFmpeg filters. FFmpeg writes to a uniquely named temporary sibling of the requested output; the command renames it only after success and removes it in a `finally` block after failure.

## Optional FFmpeg Capability

FFmpeg remains optional for the package:

- Static image processing and sequence-to-GIF work without it.
- `image gif --video` fails with an actionable message when `ffmpeg` is unavailable.
- `doctor` reports an `ffmpeg` check with `optional: true`.
- A missing optional FFmpeg check does not make the overall doctor report fail.

## Code Organization

- `src/commands/image.ts` registers and orchestrates the four image subcommands.
- `src/core/image-transform.ts` owns validation, format selection, resize, crop, convert, and shared batch behavior.
- `src/core/gif.ts` owns sequence normalization and GIF encoding.
- `src/core/ffmpeg.ts` owns executable detection, safe argument construction, and video-to-GIF execution.
- `src/core/images.ts` exposes reusable image collection data and recognizes the expanded image extension set.
- `src/index.ts` only wires the `image` command group into Commander and updates discovery output.

The new modules reuse `writeOutputs`, path normalization, smart sorting, and existing `sharp` infrastructure. Atlas packing and TinyPNG compression semantics remain unchanged.

## Validation and Errors

- Dimensions, quality, frame rate, loop count, start time, and duration are validated before processing.
- Formats, fit modes, and positions use explicit allowlists and list accepted values in error messages.
- Empty image collections fail clearly.
- A file output with multiple inputs fails before encoding.
- `image gif` rejects using `--input` and `--video` together or omitting both.
- Video errors include FFmpeg stderr without invoking a shell and without exposing unrelated environment data.
- Partial output is avoided by completing transformations in memory before `writeOutputs`; video output uses a temporary target followed by a final rename.

## Self-description and Documentation

The implementation updates all user and agent discovery surfaces:

- Root and subcommand `--help`, including short examples after option help.
- `list commands` and a new `list image-formats` discovery kind.
- `cli-manifest.json` command descriptions and representative usage.
- `llms.txt` routing guidance and examples.
- `README.md` and `README.zh-CN.md`.
- `skills/tex-packer-cli/SKILL.md` and `skills/tex-packer-cli/references/cli.md`.

The Skill stays concise and routes detailed flags to CLI help and the CLI reference. It must explicitly distinguish sequence GIF creation from video GIF creation and explain the optional FFmpeg requirement.

## Testing Strategy

- CLI tests verify command listing, root help, every image subcommand help page, formats discovery, and actionable FFmpeg guidance.
- Core tests create deterministic pixel fixtures with `sharp` and verify output dimensions, crop position, encoded format, quality validation, natural frame ordering, GIF frame count, GIF delay, and loop metadata.
- Batch tests cover directory and ZIP inputs and confirm relative path preservation and canonical extensions.
- FFmpeg tests verify availability handling and exact argument construction without requiring FFmpeg to be installed.
- Existing atlas, split, TinyPNG, skill installation, and doctor tests remain green.
- Final verification runs `pnpm typecheck`, `pnpm test`, `pnpm build`, and representative CLI smoke commands against the built binary.

## Success Criteria

The feature is complete when all four `image` subcommands perform the documented operations, sequence GIFs retain multiple frames and timing without FFmpeg, video GIFs work when FFmpeg is present and fail clearly otherwise, all self-description surfaces agree, and the complete verification suite passes.
