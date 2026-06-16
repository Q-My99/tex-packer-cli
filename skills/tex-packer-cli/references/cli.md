# CLI Reference

## Pack

```bash
tex-packer pack --input ./sprites --output ./atlas --exporter "JSON (hash)"
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
- `--tinify --tinify-key <key>`

## Split

```bash
tex-packer split --texture ./atlas/texture.png --data ./atlas/texture.json --output ./sprites-out
```

Use `--format auto` by default. For grid splitting, pass:

```bash
tex-packer split --texture sheet.png --format Grid --cell-width 32 --cell-height 32 --padding 0 --output cells
```

## Agent-Friendly Discovery

```bash
tex-packer list commands --json
tex-packer list options --json
tex-packer inspect ./atlas/texture.png --json
```
