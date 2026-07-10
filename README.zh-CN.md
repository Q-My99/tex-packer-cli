# Tex Packer CLI

> 面向 AI 的纹理图集打包、拆图与常用图片处理 CLI。它既是一个可自解释的命令行工具，也提供一条 `npx` 命令安装 Agent Skill，适配 Codex、Claude Code、OpenClaw 和其他编程助手。

[English README](./README.md)

## 它能做什么

Tex Packer CLI 可以把精灵图打包成游戏可用的纹理图集，把已有图集拆回单张图片，也能完成图片缩放、方位剪裁、格式互转、GIF 和压缩工作流。它面向人类和 AI Agent 共同设计：

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

如果包管理器提示 `sharp` 的构建脚本被忽略，安装命令本身可能仍然成功。
请运行 `tex-packer doctor --json` 确认；如果 `sharp` 检查失败，先用包管理器
批准构建脚本（`npm approve-scripts sharp` 或 `pnpm approve-builds`），然后重新安装
或 rebuild 这个包。

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

打包固定 4096x4096 图集，并禁止旋转、保留透明边缘：

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

拆图：

```bash
tex-packer split --texture ./atlas/texture.png --data ./atlas/texture.json --output ./sprites-out
```

保存 TinyPNG/Tinify key 并压缩图片，也就是“熊猫压缩”工作流：

```bash
tex-packer tinify set-key YOUR_TINIFY_KEY
tex-packer compress --input ./image.png --output ./image.tiny.png
tex-packer compress --input ./sprites --output ./compressed
tex-packer pack --input ./sprites --output ./atlas --tinify
```

也可以通过 `--tinify-key <key>` 临时传入，或在环境变量里设置 `TINIFY_KEY`。如果没有配置 key，可以把 key 发给助手由它配置，或自己运行 `tex-packer tinify set-key <key>` 配置。

不放大小图地批量缩放、按方位做纯剪裁，或在保留相对目录结构的同时转换格式：

```bash
tex-packer image resize --input ./assets --output ./resized --width 512
tex-packer image crop --input ./photo.png --output ./avatar.png --width 256 --height 256 --position center
tex-packer image convert --input ./assets --output ./webp --format webp --quality 82
```

按自然文件名顺序把序列帧合成动画 GIF；这条路径不需要 FFmpeg：

```bash
tex-packer image gif --input ./frames --output ./animation.gif --fps 12 --loop 0
```

视频转 GIF 使用可选的系统 FFmpeg，`--start` 和 `--duration` 用于截取片段：

```bash
tex-packer image gif --video ./clip.mp4 --output ./clip.gif --fps 12 --start 2 --duration 4
tex-packer doctor --json
```

格式互转支持 PNG、JPEG、WebP、AVIF 和 GIF。尺寸、适配方式、方位、质量和背景色等完整参数请运行相应子命令的 `--help` 查看。

目录输出会保留输入目录 basename：`--input ./assets --output ./out` 会写入 `./out/assets/`。连续执行多个命令时，下一步应把这个嵌套目录作为 `--input`，避免重复叠加目录层级。

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

`release:npm` 会先运行 `release:check`，然后在这次 publish 调用里禁用 npm
lifecycle scripts，避免 dry-run 的构建被重复执行。直接运行 `npm publish` 时仍然
会被 `prepublishOnly` 保护。

4. 验证发布后的包：

```bash
npx tex-packer-cli list commands
npx tex-packer-cli skill install --target codex
```

5. 创建 GitHub tag 和 Release：

```bash
git tag v0.2.0
git push origin main --tags
gh release create v0.2.0 --title "v0.2.0" --notes "Release v0.2.0."
```

## GitHub Actions npm 发布规划

这个包后续可以通过 GitHub Actions 发布到 npm，但当前版本仍然按手动发布处理。

推荐路径：

1. 先添加 CI workflow，在 pull request 和 push 时运行
   `pnpm install --frozen-lockfile`、`pnpm typecheck`、`pnpm test` 和
   `pnpm pack:dry`。
2. 在 npm 包设置里为这个包配置 Trusted Publishing，绑定 GitHub 仓库和 workflow
   路径；发布 workflow 从 tag 或 GitHub Release 触发，并设置
   `permissions: { id-token: write, contents: read }`。
3. 发布 workflow 中使用 npm registry URL，启用 Corepack，用 pnpm 安装依赖，运行
   `pnpm release:check`，最后执行 `npm publish --access public`。
4. 只有 Trusted Publishing 不可用时才使用 `NPM_TOKEN` secret 作为兜底。这个 token
   必须是有发布权限、并启用 bypass 2FA 的 granular access token。

参考：[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)、
[npm 2FA 发布要求](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/)、
[GitHub Node.js Actions 指南](https://docs.github.com/actions/guides/building-and-testing-nodejs)。

## 鸣谢

Tex Packer CLI 是一个独立的 TypeScript CLI，灵感来自 [Free Texture Packer](https://github.com/odrick/free-tex-packer)。感谢 Alexander Norinchak 和所有贡献者提供原始应用、导出模板思路和纹理打包工作流。

仓库结构也参考了 [OpenCLI](https://github.com/jackwener/opencli)：自解释 CLI 元数据、面向 Agent 的 Skill、`llms.txt` 和 CLI-first 的项目布局。

## 许可证

MIT。第三方鸣谢和 Free Texture Packer 的许可证说明见 [NOTICE.md](./NOTICE.md)。
