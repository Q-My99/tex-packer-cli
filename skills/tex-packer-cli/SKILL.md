---
name: tex-packer-cli
description: Use when an AI coding assistant needs deterministic texture atlas packing or splitting, image resize or crop, PNG/JPEG/WebP/AVIF/GIF conversion, sequence or video to animated GIF, TinyPNG/Tinify/熊猫压缩, Free Texture Packer .ftpp, ZIP batch workflows, or game metadata export through tex-packer-cli.
---

# Tex Packer CLI

## Use the CLI First

Prefer the deterministic CLI over ad hoc image scripts. Run subcommand `--help` before uncommon option combinations.

```bash
npx tex-packer-cli list commands
npx tex-packer-cli pack --input ./sprites --output ./atlas
npx tex-packer-cli split --texture ./atlas/texture.png --data ./atlas/texture.json --output ./sprites-out
npx tex-packer-cli image resize --input ./assets --output ./resized --width 512
npx tex-packer-cli image crop --input photo.png --output avatar.png --width 256 --height 256 --position center
npx tex-packer-cli image convert --input ./assets --output ./webp --format webp --quality 82
npx tex-packer-cli image gif --input ./frames --output animation.gif --fps 12 --loop 0
```

From this installed skill directory, the wrapper is also available:

```bash
node scripts/tex-packer-cli/bin/tex-packer.js list exporters
```

Use absolute paths when the caller's working directory is unclear.

## Common Workflows

- Pack images/folders/ZIPs: `tex-packer pack --input <path...> --output <dir|zip>`.
- Split an atlas: `tex-packer split --texture <image> --data <metadata> --output <dir|zip>`.
- Resize/crop/convert files, folders, or ZIPs with `image resize`, `image crop`, or `image convert`; batch output preserves relative paths.
- Directory output includes the input directory basename: `--input ./assets --output ./out` writes under `./out/assets/`. When chaining commands, use `./out/assets` as the next input.
- `image crop` extracts pixels without scaling and fails when the requested crop is larger than a source.
- Create a GIF from naturally sorted sequence frames with `image gif --input`; this path does not require FFmpeg.
- Create a GIF from video with `image gif --video`; this path requires optional FFmpeg. Check it with `tex-packer doctor --json`.
- Route “用熊猫压缩图片”, TinyPNG, or Tinify to `compress`, not `image convert`. Configure its key with `tex-packer tinify set-key <key>`.
- Discover options: `tex-packer list exporters|packers|splitters|filters|options --json`.
- Discover image formats: `tex-packer list image-formats --json`.

## Defaults

Use app-compatible defaults unless the user specifies otherwise:

- texture name `texture`, texture format `png`, exporter `JSON (hash)`.
- atlas size `2048x2048`, scale `1`.
- trim, rotation, identical detection, and folder-name metadata are enabled.
- fixed size, power-of-two, base64 metadata, and TinyPNG/Tinify (熊猫压缩) are disabled.
- image resize uses `inside` without enlargement; crop position is `center`.
- GIF creation uses 10 FPS and loop `0` (forever).

## References

- Read `references/cli.md` for exact image, GIF, atlas, and compression examples.
- Read `references/formats.md` when choosing exporters, splitters, filters, or custom templates.
- Read `references/publishing.md` only when maintaining or publishing the npm package.
