---
name: tex-packer-cli
description: Pack, split, and compress texture images from AI coding assistants. Use when Codex, Claude Code, OpenClaw, or another agent needs to create sprite sheets, export game metadata formats, split existing atlases, convert Free Texture Packer .ftpp projects, render custom Mustache atlas templates, or automate PNG/JPG/GIF/folder/ZIP texture workflows, including TinyPNG/Tinify/熊猫压缩 image compression, with a deterministic CLI.
---

# Tex Packer CLI

## Use the CLI First

Prefer the deterministic CLI over ad hoc image scripting:

```bash
npx tex-packer-cli list commands
npx tex-packer-cli pack --input ./sprites --output ./atlas
npx tex-packer-cli compress --input ./image.png --output ./image.tiny.png
npx tex-packer-cli split --texture ./atlas/texture.png --data ./atlas/texture.json --output ./sprites-out
```

From this installed skill directory, the wrapper is also available:

```bash
node scripts/tex-packer-cli/bin/tex-packer.js list exporters
```

Use absolute paths when the caller's working directory is unclear.

## Common Workflows

- Pack images/folders/ZIPs: `tex-packer pack --input <path...> --output <dir|zip>`.
- Pack a `.ftpp` project: `tex-packer pack --project <file.ftpp> --output <dir|zip>`.
- Split an atlas: `tex-packer split --texture <image> --data <metadata> --output <dir|zip>`.
- Compress images with TinyPNG/Tinify (熊猫压缩): `tex-packer compress --input <path...> --output <dir|zip|file>`.
- Save a TinyPNG/Tinify key: `tex-packer tinify set-key <key>`.
- If the user asks to "用熊猫压缩图片", "TinyPNG compress", or "Tinify images", route to `tex-packer compress`.
- If no key is configured, ask the user to send the key so you can configure `TINIFY_KEY`, or tell them to run `tex-packer tinify set-key <key>`.
- Discover options: `tex-packer list exporters|packers|splitters|filters|options --json`.
- Create a reusable project: `tex-packer project init --images <path...> --output game.ftpp`.
- Verify setup: `tex-packer doctor --json`.

## Defaults

Use app-compatible defaults unless the user specifies otherwise:

- texture name `texture`, texture format `png`, exporter `JSON (hash)`.
- atlas size `2048x2048`, scale `1`.
- trim, rotation, identical detection, and folder-name metadata are enabled.
- fixed size, power-of-two, base64 metadata, and TinyPNG/Tinify (熊猫压缩) are disabled.

## References

- Read `references/cli.md` for command examples and option details.
- Read `references/formats.md` when choosing exporters, splitters, filters, or custom templates.
- Read `references/publishing.md` only when maintaining or publishing the npm package.
