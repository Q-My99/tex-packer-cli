# Image Processing Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add self-describing resize, positional crop, format conversion, sequence-to-GIF, and optional video-to-GIF commands without changing existing atlas behavior.

**Architecture:** A new `image` Commander group delegates static batch work to `src/core/image-transform.ts`, sequence animation work to `src/core/gif.ts`, and video execution to `src/core/ffmpeg.ts`. Existing image collection, sorting, ZIP writing, and Sharp infrastructure are reused; only video input depends on a system FFmpeg executable.

**Tech Stack:** TypeScript, Commander 12, Sharp 0.33, JSZip 3, modern-gif 2, Vitest 4, Vite 7, optional system FFmpeg.

## Global Constraints

- Requires Node.js 20 or newer.
- Use pnpm for dependency and project commands, Vite for bundling, and Bun only for one-off TypeScript scripts.
- PNG, JPEG, WebP, AVIF, and GIF are the supported image formats for this feature.
- Sequence-to-GIF must work without FFmpeg; video-to-GIF must use an optional system `ffmpeg` executable.
- Crop performs extraction without scaling and supports nine positional anchors; exact coordinates and aspect-ratio presets are out of scope.
- Preserve relative directory paths for directory and ZIP batch workflows.
- Keep `--help`, `list`, `cli-manifest.json`, `llms.txt`, English/Chinese README files, and the bundled Agent Skill synchronized.

---

### Task 1: Shared image collection and static transforms

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src/constants.ts`
- Modify: `src/core/images.ts`
- Create: `src/core/image-transform.ts`
- Create: `test/image-transform.test.ts`

**Interfaces:**
- Produces: `collectImages(inputs: string[]): Promise<CollectedImage[]>` where `CollectedImage` is `{ name: string; buffer: Buffer }`.
- Produces: `resizeImages(options: ResizeImagesOptions): Promise<ImageCommandResult>`.
- Produces: `cropImages(options: CropImagesOptions): Promise<ImageCommandResult>`.
- Produces: `convertImages(options: ConvertImagesOptions): Promise<ImageCommandResult>`.
- Produces: allowlists `IMAGE_FORMATS`, `IMAGE_FITS`, and `IMAGE_POSITIONS`.

- [ ] **Step 1: Add failing transform tests**

Create deterministic Sharp fixtures and assertions equivalent to:

```ts
const resized = await resizeImages({ input: [source], output, width: 4, fit: "inside", allowUpscale: false });
expect(await sharp(output).metadata()).toMatchObject({ width: 4, height: 2, format: "png" });

const cropped = await cropImages({ input: [source], output, width: 2, height: 2, position: "right" });
expect(Array.from((await sharp(output).raw().toBuffer()).subarray(0, 3))).toEqual([0, 0, 255]);

const converted = await convertImages({ input: [source], output: outDir, format: "webp", quality: 82 });
expect(await sharp(path.join(outDir, "input", "photo.webp")).metadata()).toMatchObject({ format: "webp" });
```

Also assert invalid dimensions, crop rectangles larger than the source, unknown formats/fits/positions, multiple inputs targeting a file, and ZIP-relative path preservation.

- [ ] **Step 2: Run the transform tests and observe RED**

Run: `pnpm vitest run test/image-transform.test.ts`

Expected: FAIL because `src/core/image-transform.ts` does not exist.

- [ ] **Step 3: Add the minimal transform implementation**

Add `modern-gif` with `pnpm add modern-gif@^2.1.0`, expand `IMAGE_EXTENSIONS`, export raw collection, and implement these exact option shapes:

```ts
export type ImageFormat = "png" | "jpeg" | "webp" | "avif" | "gif";
export type ImageFit = "cover" | "contain" | "fill" | "inside" | "outside";
export type ImagePosition = "center" | "top" | "top-right" | "right" | "bottom-right" | "bottom" | "bottom-left" | "left" | "top-left";

export interface ImageCommandResult {
  operation: "resize" | "crop" | "convert";
  output: string;
  images: number;
  files: string[];
  animatedInputs: number;
  framesWritten: number;
}
```

Use `sharp(buffer, { animated: outputFormat === "gif" || outputFormat === "webp" })`, Sharp `resize`, computed positional `extract`, explicit encoder selection, and existing `writeOutputs`. Validate the entire batch before calling `writeOutputs`.

- [ ] **Step 4: Run transform tests and the existing suite**

Run: `pnpm vitest run test/image-transform.test.ts test/cli.test.ts test/compress.test.ts`

Expected: all selected tests PASS.

- [ ] **Step 5: Commit the static transform slice**

```bash
git add package.json pnpm-lock.yaml src/constants.ts src/core/images.ts src/core/image-transform.ts test/image-transform.test.ts
git commit -m "feat: add static image transforms"
```

### Task 2: Sequence-to-GIF encoding

**Files:**
- Create: `src/core/gif.ts`
- Create: `test/gif.test.ts`

**Interfaces:**
- Consumes: `collectImages`, `ImageFit`, and `ImagePosition` from Task 1.
- Produces: `createSequenceGif(options: SequenceGifOptions): Promise<GifCommandResult>`.
- Produces: `GifCommandResult` with `{ operation: "gif"; source: "sequence" | "video"; output: string; frames: number | null; fps: number; loop: number }`.

- [ ] **Step 1: Add a failing multi-frame GIF test**

Create `frame-1.png` and `frame-2.png` with different colors, call:

```ts
const result = await createSequenceGif({
  input: [framesDir],
  output,
  fps: 10,
  loop: 0,
  fit: "contain",
  position: "center",
  background: "#00000000"
});
const metadata = await sharp(output, { animated: true }).metadata();
expect(result.frames).toBe(2);
expect(metadata.pages).toBe(2);
expect(metadata.delay).toEqual([100, 100]);
expect(metadata.loop).toBe(0);
```

Add cases for natural ordering (`frame-2` before `frame-10`), first-frame canvas sizing, explicit dimensions, invalid FPS/loop values, and non-GIF output paths.

- [ ] **Step 2: Run the GIF tests and observe RED**

Run: `pnpm vitest run test/gif.test.ts`

Expected: FAIL because `src/core/gif.ts` does not exist.

- [ ] **Step 3: Implement sequence normalization and encoding**

Decode each naturally sorted frame with Sharp into same-size RGBA data, then encode exactly one frame delay per input:

```ts
const delay = Math.max(1, Math.round(1000 / options.fps));
const output = await encode({
  width,
  height,
  looped: true,
  loopCount: options.loop,
  maxColors: 255,
  frames: frames.map((data) => ({ data: new Uint8ClampedArray(data), delay }))
});
await fs.writeFile(target, Buffer.from(output));
```

Ensure parent directories exist and return the exact `GifCommandResult` interface.

- [ ] **Step 4: Run GIF and transform tests**

Run: `pnpm vitest run test/gif.test.ts test/image-transform.test.ts`

Expected: all selected tests PASS.

- [ ] **Step 5: Commit sequence GIF support**

```bash
git add src/core/gif.ts test/gif.test.ts
git commit -m "feat: create gifs from image sequences"
```

### Task 3: Optional FFmpeg video GIF support and diagnostics

**Files:**
- Create: `src/core/ffmpeg.ts`
- Modify: `src/commands/doctor.ts`
- Create: `test/ffmpeg.test.ts`
- Modify: `test/cli.test.ts`

**Interfaces:**
- Produces: `buildVideoGifArgs(options: VideoGifOptions, temporaryOutput: string): string[]`.
- Produces: `createVideoGif(options: VideoGifOptions): Promise<GifCommandResult>`.
- Produces: `checkFfmpeg(): DoctorCheck` with `optional: true`.

- [ ] **Step 1: Add failing FFmpeg argument and doctor tests**

Assert a bounded video request generates an argument array containing separate `-ss`, `-t`, `-i`, `-vf`, `-loop`, and output entries, never a shell-composed command. Assert a missing executable rejects with both `ffmpeg` and `tex-packer doctor`, and that `doctor().ok` ignores a failed optional check.

- [ ] **Step 2: Run the FFmpeg tests and observe RED**

Run: `pnpm vitest run test/ffmpeg.test.ts test/cli.test.ts`

Expected: FAIL because the FFmpeg module and optional doctor check do not exist.

- [ ] **Step 3: Implement safe video execution**

Use `spawnSync("ffmpeg", args, { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"] })`, validate numeric fields, construct a palette-aware GIF filter, write to a unique sibling temporary path, rename on success, and remove the temporary file in `finally`. Add `optional?: boolean` to `DoctorCheck` and calculate overall health with `checks.every((check) => check.optional || check.ok)`.

- [ ] **Step 4: Run FFmpeg, doctor, and existing tests**

Run: `pnpm vitest run test/ffmpeg.test.ts test/cli.test.ts test/compress.test.ts`

Expected: all selected tests PASS whether or not FFmpeg is installed.

- [ ] **Step 5: Commit optional video support**

```bash
git add src/core/ffmpeg.ts src/commands/doctor.ts test/ffmpeg.test.ts test/cli.test.ts
git commit -m "feat: create gifs from video with ffmpeg"
```

### Task 4: Self-describing CLI wiring

**Files:**
- Create: `src/commands/image.ts`
- Modify: `src/index.ts`
- Modify: `cli-manifest.json`
- Modify: `test/cli.test.ts`

**Interfaces:**
- Consumes: all command functions from Tasks 1–3.
- Produces: Commander subcommands `image resize`, `image crop`, `image convert`, and `image gif`.
- Produces: `list image-formats` machine-readable output.

- [ ] **Step 1: Add failing CLI discovery and help tests**

Assert `list commands` contains all four qualified command names, `list image-formats --json` returns the five formats, every subcommand help page contains its required options and an example, and mutually exclusive GIF source modes fail before processing.

- [ ] **Step 2: Run CLI tests and observe RED**

Run: `pnpm vitest run test/cli.test.ts`

Expected: FAIL because the image command group is not registered.

- [ ] **Step 3: Register commands and update the manifest**

Create an `addImageCommands(program: Command): void` function that defines typed options, numeric parsers, `.addHelpText("after", ...)` examples, and delegates to the core functions. Update the root description, `list` argument help, `listKind`, and manifest entries with representative `usage` strings.

- [ ] **Step 4: Run CLI tests and smoke each help page**

Run: `pnpm vitest run test/cli.test.ts`

Run: `pnpm dev -- image resize --help`

Run: `pnpm dev -- image crop --help`

Run: `pnpm dev -- image convert --help`

Run: `pnpm dev -- image gif --help`

Expected: tests PASS and each command exits 0 with its options and examples visible.

- [ ] **Step 5: Commit CLI discovery**

```bash
git add src/commands/image.ts src/index.ts cli-manifest.json test/cli.test.ts
git commit -m "feat: expose image processing commands"
```

### Task 5: Agent Skill and user documentation

**Files:**
- Modify: `skills/tex-packer-cli/SKILL.md`
- Modify: `skills/tex-packer-cli/references/cli.md`
- Modify: `skills/tex-packer-cli/agents/openai.yaml`
- Modify: `llms.txt`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `package.json`
- Modify: `skills/tex-packer-cli/scripts/tex-packer-cli/package.json`
- Create: `test/docs.test.ts`

**Interfaces:**
- Produces: matching routing examples and terminology across all human and agent discovery surfaces.

- [ ] **Step 1: Add a failing documentation consistency test**

Read each discovery file and assert it contains `image resize`, `image crop`, `image convert`, `image gif`, sequence frames, optional FFmpeg, and the supported formats. Assert the Skill stays below 500 words and directs detailed flag discovery to `--help` or `references/cli.md`.

- [ ] **Step 2: Run the documentation test and observe RED**

Run: `pnpm vitest run test/docs.test.ts`

Expected: FAIL because the new commands are absent from existing documentation.

- [ ] **Step 3: Update all documentation surfaces**

Add concise quick-start examples, batch behavior, GIF source-mode guidance, and optional FFmpeg diagnostics. Update package descriptions and the installed skill wrapper description without changing the package version.

- [ ] **Step 4: Run documentation and CLI tests**

Run: `pnpm vitest run test/docs.test.ts test/cli.test.ts`

Expected: all selected tests PASS.

- [ ] **Step 5: Commit documentation**

```bash
git add skills/tex-packer-cli/SKILL.md skills/tex-packer-cli/references/cli.md skills/tex-packer-cli/agents/openai.yaml llms.txt README.md README.zh-CN.md package.json skills/tex-packer-cli/scripts/tex-packer-cli/package.json test/docs.test.ts
git commit -m "docs: explain image processing workflows"
```

### Task 6: Full verification and packaging

**Files:**
- Verify: all files changed by Tasks 1–5.

**Interfaces:**
- Consumes: the complete implementation and documentation.
- Produces: a buildable, testable npm package with a synchronized bundled Skill.

- [ ] **Step 1: Run static and behavioral verification**

Run: `pnpm typecheck`

Run: `pnpm test`

Run: `pnpm build`

Expected: all commands exit 0.

- [ ] **Step 2: Run built-binary smoke tests**

Run: `node bin/tex-packer.js list image-formats --json`

Run: `node bin/tex-packer.js image resize --help`

Run: `node bin/tex-packer.js image crop --help`

Run: `node bin/tex-packer.js image convert --help`

Run: `node bin/tex-packer.js image gif --help`

Run: `node bin/tex-packer.js doctor --json`

Expected: all commands exit 0; formats are machine-readable and doctor labels FFmpeg optional.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff --check`

Run: `git status --short`

Expected: no whitespace errors and only planned feature files are changed. If verification fails, return to the task that owns the failing behavior, add or tighten its regression test, apply the smallest correction, rerun that task's focused test, and then repeat Task 6 from Step 1.
