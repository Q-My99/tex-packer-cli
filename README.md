# Tex Packer CLI

> AI-friendly texture atlas packer and splitter. A self-describing CLI plus one-command agent skill installation for Codex, Claude Code, OpenClaw, and other assistants.

[中文文档](./README.zh-CN.md)

## What It Does

Tex Packer CLI turns sprite images into game-ready texture atlases and can split existing atlases back into sprites. It is designed for both humans and AI agents:

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

Split an atlas:

```bash
tex-packer split --texture ./atlas/texture.png --data ./atlas/texture.json --output ./sprites-out
```

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
tex-packer split --texture <atlas.png> --data <metadata> --output <dir|zip>
tex-packer project init --images <paths...> --output game.ftpp
tex-packer inspect <path> --json
tex-packer skill install --target codex
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

4. Verify published package:

```bash
npx tex-packer-cli list commands
npx tex-packer-cli skill install --target codex
```

5. Tag and publish a GitHub release:

```bash
git tag v0.1.0
git push origin main --tags
gh release create v0.1.0 --title "v0.1.0" --notes "Initial public release."
```

## Acknowledgements

Tex Packer CLI is an independent TypeScript CLI inspired by [Free Texture Packer](https://github.com/odrick/free-tex-packer). We gratefully acknowledge Alexander Norinchak and contributors for the original app, exporter template ideas, and texture packing workflow.

The repository structure is also inspired by [OpenCLI](https://github.com/jackwener/opencli): self-describing CLI metadata, agent-facing skills, `llms.txt`, and a CLI-first layout.

## License

MIT. See [NOTICE.md](./NOTICE.md) for third-party acknowledgements and Free Texture Packer license notice.
