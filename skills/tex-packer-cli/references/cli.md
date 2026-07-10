# CLI Reference

For the complete live option list, run `tex-packer <command> --help`.

## Image Resize

Resize a folder to width 512 without enlarging smaller images:

```bash
tex-packer image resize --input ./assets --output ./resized --width 512
```

Use `--allow-upscale` to permit enlargement. Fits are `cover`, `contain`, `fill`, `inside`, and `outside`. Nine-grid positions include `center`, `top-right`, and `bottom-left`.

## Image Crop

Crop pixels without scaling:

```bash
tex-packer image crop --input ./photo.png --output ./avatar.png --width 256 --height 256 --position center
```

The crop fails when its dimensions exceed the source. Exact `left`/`top` rectangles and ratio presets are not available in this version.

## Image Convert

Convert a folder while preserving relative paths:

```bash
tex-packer image convert --input ./assets --output ./webp --format webp --quality 82
```

Formats are `png`, `jpeg`, `webp`, `avif`, and `gif`. Quality applies to JPEG, WebP, and AVIF. Use a file output only for one input image; use a directory or ZIP for batches.

Directory output includes the input directory basename. For example, `--input ./assets --output ./out` writes `./out/assets/...`. In a multi-command pipeline, use `./out/assets` as the next `--input` to avoid accumulating wrapper directories.

## Animated GIF

Naturally sort sequence frames and encode without FFmpeg:

```bash
tex-packer image gif --input ./frames --output ./animation.gif --fps 12 --loop 0
```

Convert a bounded video clip with optional FFmpeg:

```bash
tex-packer image gif --video ./clip.mp4 --output ./clip.gif --fps 12 --start 2 --duration 4
tex-packer doctor --json
```

Use exactly one of `--input` or `--video`. Loop `0` means forever. Sequence input uses the built-in encoder; only video input requires FFmpeg.

## Pack

```bash
tex-packer pack --input ./sprites --output ./atlas --exporter "JSON (hash)"
```

Fixed-size animation atlas without rotation or transparent-edge trimming:

```bash
tex-packer pack --input ./sprites --output ./atlas-4096 --texture-name sprites_4096 --width 4096 --height 4096 --fixed-size --no-allow-rotation --no-allow-trim
```

Useful options:

- `--texture-name <name>`
- `--texture-format png|jpg`
- `--exporter <type>`
- `--custom-template <file> --custom-ext <ext>`
- `--width <n> --height <n>`
- `--fixed-size`
- `--power-of-two`
- `--padding <n>`
- `--extrude <n>`
- `--no-allow-trim`
- `--no-allow-rotation`
- `--trim-mode trim|crop`
- `--alpha-threshold <0-255>`
- `--no-detect-identical`
- `--scale <n>`
- `--filter none|mask|grayscale`
- `--base64-export`
- `--tinify --tinify-key <key>` for TinyPNG/Tinify (熊猫压缩)

TinyPNG/Tinify (熊猫压缩) keys are resolved in this order:

1. `--tinify-key <key>`
2. `TINIFY_KEY` environment variable
3. `tex-packer tinify set-key <key>` config

If no key is configured, ask the user to send the key so you can configure `TINIFY_KEY`, or tell them to run:

```bash
tex-packer tinify set-key <key>
```

## Split

```bash
tex-packer split --texture ./atlas/texture.png --data ./atlas/texture.json --output ./sprites-out
```

Use `--format auto` by default. For grid splitting, pass:

```bash
tex-packer split --texture sheet.png --format Grid --cell-width 32 --cell-height 32 --padding 0 --output cells
```

## Compress

Compress one image to a target file with TinyPNG/Tinify (熊猫压缩):

```bash
tex-packer compress --input ./image.png --output ./image.tiny.png
```

Compress multiple files, a folder, or a ZIP to an output directory or ZIP:

```bash
tex-packer compress --input ./sprites --output ./compressed
tex-packer compress --input ./sprites --output ./compressed.zip
```

Save a reusable TinyPNG/Tinify key:

```bash
tex-packer tinify set-key <key>
```

Natural language routing keywords: `compress`, `TinyPNG`, `Tinify`, `熊猫压缩`, `用熊猫压缩图片`.

## Agent-Friendly Discovery

```bash
tex-packer list commands --json
tex-packer list image-formats --json
tex-packer list options --json
tex-packer inspect ./atlas/texture.png --json
```
