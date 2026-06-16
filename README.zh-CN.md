# Tex Packer CLI

> 面向 AI 的纹理图集打包与拆图 CLI。它既是一个可自解释的命令行工具，也提供一条 `npx` 命令安装 Agent Skill，适配 Codex、Claude Code、OpenClaw 和其他编程助手。

[English README](./README.md)

## 它能做什么

Tex Packer CLI 可以把精灵图打包成游戏可用的纹理图集，也可以把已有图集拆回单张图片。它面向人类和 AI Agent 共同设计：

- 确定性 CLI：不需要浏览器或 GUI。
- AI 友好发现能力：`list`、`inspect`、`doctor`、`cli-manifest.json`、`llms.txt`。
- 内置 Agent Skill：一条 `npx` 命令安装。
- 兼容 Free Texture Packer 的核心工作流：裁剪、旋转、多图集、导出模板、拆图、`.ftpp` 项目文件、ZIP 输入输出和 TinyPNG。

## 安装

需要 Node.js 20+。

```bash
npm install -g tex-packer-cli
tex-packer doctor
```

不安装直接使用：

```bash
npx tex-packer-cli list commands
```

## 快速开始

打包文件夹：

```bash
tex-packer pack --input ./sprites --output ./atlas
```

打包成 ZIP：

```bash
tex-packer pack --input ./sprites --output ./atlas.zip --exporter "Phaser 3"
```

拆图：

```bash
tex-packer split --texture ./atlas/texture.png --data ./atlas/texture.json --output ./sprites-out
```

查看支持能力：

```bash
tex-packer list exporters
tex-packer list splitters
tex-packer list options --json
```

## 安装 Agent Skill

安装到 Codex、Claude Code、OpenClaw 和通用 AI Skill 目录：

```bash
npx tex-packer-cli skill install --target all
```

只安装到 Codex：

```bash
npx tex-packer-cli skill install --target codex
```

安装到自定义目录：

```bash
npx tex-packer-cli skill install --dest ~/.ai-skills/tex-packer-cli
```

## 命令

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

## 导出格式

内置导出器包括 JSON hash/array、XML、CSS、Pixi.js、Godot、Phaser、Spine、Cocos2d、UnrealEngine、Starling、UIKit、Unity3D、Egret2D，以及自定义 Mustache 模板。

自定义模板示例：

```bash
tex-packer pack \
  --input ./sprites \
  --output ./atlas \
  --exporter custom \
  --custom-template ./template.mst \
  --custom-ext json
```

## 开发

```bash
pnpm install
pnpm dev -- list commands
pnpm typecheck
pnpm test
pnpm build
```

如果后续添加一次性的 TypeScript 维护脚本，按本地约定使用 Bun 执行：

```bash
bun scripts/some-script.ts
```

## npm 发布流程

1. 更新 `package.json` 版本号。
2. 运行检查：

```bash
pnpm release:check
```

3. 登录并发布：

```bash
npm login
pnpm release:npm
```

4. 验证发布后的包：

```bash
npx tex-packer-cli list commands
npx tex-packer-cli skill install --target codex
```

5. 创建 GitHub tag 和 Release：

```bash
git tag v0.1.0
git push origin main --tags
gh release create v0.1.0 --title "v0.1.0" --notes "Initial public release."
```

## 鸣谢

Tex Packer CLI 是一个独立的 TypeScript CLI，灵感来自 [Free Texture Packer](https://github.com/odrick/free-tex-packer)。感谢 Alexander Norinchak 和所有贡献者提供原始应用、导出模板思路和纹理打包工作流。

仓库结构也参考了 [OpenCLI](https://github.com/jackwener/opencli)：自解释 CLI 元数据、面向 Agent 的 Skill、`llms.txt` 和 CLI-first 的项目布局。

## 许可证

MIT。第三方鸣谢和 Free Texture Packer 的许可证说明见 [NOTICE.md](./NOTICE.md)。
