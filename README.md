# Tex Packer CLI

> AI-friendly texture atlas packer, splitter, and image processor. A self-describing CLI plus one-command agent skill installation for Codex, Claude Code, OpenClaw, and other assistants.

[中文文档](./README.zh-CN.md)

## What It Does

Tex Packer CLI turns sprite images into game-ready texture atlases, splits atlases back into sprites, and handles common resize, crop, format conversion, GIF, and compression workflows. It is designed for both humans and AI agents:

- Deterministic CLI: no browser or GUI required.
- AI-friendly discovery: `list`, `inspect`, `doctor`, `cli-manifest.json`, and `llms.txt`.
- Built-in agent skill: install with one `npx` command.
- Compatible workflow ideas from Free Texture Packer: trimming, rotation, multipack, exporter templates, splitting, `.ftpp` project files, ZIP input/output, and TinyPNG.

## Install

Requires Node.js 20+.

```bash
npm install -g tex-packer-cli
tex-packer doctor
```

If your package manager warns that `sharp` build scripts were ignored, the
install may still finish successfully. Run `tex-packer doctor --json`; if the
`sharp` check fails, approve build scripts with your package manager
(`npm approve-scripts sharp` or `pnpm approve-builds`) and then reinstall or
rebuild the package.

Use without installing:

```bash
npx tex-packer-cli list commands
```

## Quick Start

Pack a folder:

```bash
tex-packer pack --input ./sprites --output ./atlas
```

Pack to a ZIP:

```bash
tex-packer pack --input ./sprites --output ./atlas.zip --exporter "Phaser 3"
```

Pack a fixed 4096x4096 atlas without rotation or transparent-edge trimming:

```bash
tex-packer pack \
  --input ./sprites \
  --output ./atlas-4096 \
  --texture-name sprites_4096 \
  --width 4096 \
  --height 4096 \
  --fixed-size \
  --no-allow-rotation \
  --no-allow-trim
```

Split an atlas:

```bash
tex-packer split --texture ./atlas/texture.png --data ./atlas/texture.json --output ./sprites-out
```

Save a TinyPNG/Tinify key and compress images. This is also the "熊猫压缩" workflow:

```bash
tex-packer tinify set-key YOUR_TINIFY_KEY
tex-packer compress --input ./image.png --output ./image.tiny.png
tex-packer compress --input ./sprites --output ./compressed
tex-packer pack --input ./sprites --output ./atlas --tinify
```

You can also pass `--tinify-key <key>` or set `TINIFY_KEY` in the environment. If no key is configured, provide the key to your assistant so they can configure it, or run `tex-packer tinify set-key <key>` yourself.

Resize images without enlarging smaller inputs, crop pixels from a positional anchor, or convert a batch while preserving relative paths:

```bash
tex-packer image resize --input ./assets --output ./resized --width 512
tex-packer image crop --input ./photo.png --output ./avatar.png --width 256 --height 256 --position center
tex-packer image convert --input ./assets --output ./webp --format webp --quality 82
```

Create an animated GIF from naturally sorted sequence frames without FFmpeg:

```bash
tex-packer image gif --input ./frames --output ./animation.gif --fps 12 --loop 0
```

Video-to-GIF uses optional FFmpeg. `--start` and `--duration` select a bounded clip:

```bash
tex-packer image gif --video ./clip.mp4 --output ./clip.gif --fps 12 --start 2 --duration 4
tex-packer doctor --json
```

Supported conversion formats are PNG, JPEG, WebP, AVIF, and GIF. Run the relevant subcommand with `--help` for fit, position, size, quality, and background options.

Directory output includes the input directory basename: `--input ./assets --output ./out` writes under `./out/assets/`. When chaining commands, point the next `--input` at that nested directory.

Inspect available formats:

```bash
tex-packer list exporters
tex-packer list splitters
tex-packer list options --json
```

## Install the Agent Skill

Install into Codex, Claude Code, OpenClaw, and a generic AI skills folder:

```bash
npx tex-packer-cli skill install --target all
```

Install only into Codex:

```bash
npx tex-packer-cli skill install --target codex
```

Use a custom location:

```bash
npx tex-packer-cli skill install --dest ~/.ai-skills/tex-packer-cli
```

## Commands

```bash
tex-packer list commands
tex-packer pack --input <files|dir|zip> --output <dir|zip>
tex-packer pack --project <file.ftpp> --output <dir|zip>
tex-packer compress --input <files|dir|zip> --output <dir|zip|file>
tex-packer image resize --input <files|dir|zip> --output <dir|zip|file> --width <n>
tex-packer image crop --input <files|dir|zip> --output <dir|zip|file> --width <n> --height <n>
tex-packer image convert --input <files|dir|zip> --output <dir|zip|file> --format <png|jpeg|webp|avif|gif>
tex-packer image gif --input <frames...> --output <file.gif>
tex-packer image gif --video <file> --output <file.gif>
tex-packer split --texture <atlas.png> --data <metadata> --output <dir|zip>
tex-packer project init --images <paths...> --output game.ftpp
tex-packer inspect <path> --json
tex-packer skill install --target codex
tex-packer tinify set-key <key>
tex-packer doctor --json
```

## Exporters

Built-in exporters include JSON hash/array, XML, CSS, Pixi.js, Godot, Phaser, Spine, Cocos2d, UnrealEngine, Starling, UIKit, Unity3D, Egret2D, and custom Mustache templates.

Custom template example:

```bash
tex-packer pack \
  --input ./sprites \
  --output ./atlas \
  --exporter custom \
  --custom-template ./template.mst \
  --custom-ext json
```

## Development

```bash
pnpm install
pnpm dev -- list commands
pnpm typecheck
pnpm test
pnpm build
```

Run one-off TypeScript scripts with Bun when you add maintenance scripts:

```bash
bun scripts/some-script.ts
```

## npm Release Flow

1. Update `package.json` version.
2. Run checks:

```bash
pnpm release:check
```

3. Log in and publish:

```bash
npm login
pnpm release:npm
```

`release:npm` runs `release:check` first and then publishes with npm lifecycle
scripts disabled for that publish call, so the dry-run build is not repeated.
Direct `npm publish` is still guarded by `prepublishOnly`.

4. Verify published package:

```bash
npx tex-packer-cli list commands
npx tex-packer-cli skill install --target codex
```

5. Tag and publish a GitHub release:

```bash
git tag v0.2.0
git push origin main --tags
gh release create v0.2.0 --title "v0.2.0" --notes "Release v0.2.0."
```

## GitHub Actions npm Publishing Plan

This package can be published from GitHub Actions later, but this release is
still intended to be published manually.

Recommended path:

1. Add a CI workflow that runs `pnpm install --frozen-lockfile`,
   `pnpm typecheck`, `pnpm test`, and `pnpm pack:dry` on pull requests and
   pushes.
2. Configure npm Trusted Publishing for this package and the GitHub workflow
   path, then publish from a tag or GitHub Release workflow with
   `permissions: { id-token: write, contents: read }`.
3. In the publish workflow, use the npm registry URL, enable Corepack, install
   with pnpm, run `pnpm release:check`, then run
   `npm publish --access public`.
4. Only use an `NPM_TOKEN` secret as a fallback when Trusted Publishing is not
   available. That token must be a granular access token with publish
   permission and bypass 2FA enabled.

References: [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/),
[npm 2FA publishing requirements](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/),
and [GitHub's Node.js Actions guide](https://docs.github.com/actions/guides/building-and-testing-nodejs).

## Acknowledgements

Tex Packer CLI is an independent TypeScript CLI inspired by [Free Texture Packer](https://github.com/odrick/free-tex-packer). We gratefully acknowledge Alexander Norinchak and contributors for the original app, exporter template ideas, and texture packing workflow.

The repository structure is also inspired by [OpenCLI](https://github.com/jackwener/opencli): self-describing CLI metadata, agent-facing skills, `llms.txt`, and a CLI-first layout.

## License

MIT. See [NOTICE.md](./NOTICE.md) for third-party acknowledgements and Free Texture Packer license notice.
