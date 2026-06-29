# CLI Reference

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
tex-packer list options --json
tex-packer inspect ./atlas/texture.png --json
```
