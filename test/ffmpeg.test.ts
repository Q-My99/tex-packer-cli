import { afterEach, describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";
import { buildVideoGifArgs, createVideoGif } from "../src/core/ffmpeg.js";
import { doctor } from "../src/commands/doctor.js";

const originalPath = process.env.PATH;

describe("optional FFmpeg video GIF support", () => {
  afterEach(() => {
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
  });

  it("builds a shell-free palette-aware argument array", () => {
    const video = path.join(os.tmpdir(), "clip with spaces.mp4");
    const temporaryOutput = path.join(os.tmpdir(), "clip.tmp.gif");

    const args = buildVideoGifArgs({
      video,
      output: path.join(os.tmpdir(), "clip.gif"),
      fps: 12,
      loop: 3,
      start: 2,
      duration: 4,
      width: 320,
      height: 180,
      fit: "cover",
      position: "top-right",
      background: "#00000000"
    }, temporaryOutput);

    expect(args).toEqual([
      "-hide_banner",
      "-loglevel", "error",
      "-y",
      "-ss", "2",
      "-i", path.resolve(video),
      "-t", "4",
      "-filter_complex",
      "fps=12,scale=320:180:force_original_aspect_ratio=increase,crop=320:180:iw-ow:0,split[s0][s1];[s0]palettegen=reserve_transparent=1[p];[s1][p]paletteuse=dither=sierra2_4a",
      "-loop", "2",
      temporaryOutput
    ]);
  });

  it("fails with actionable guidance when FFmpeg is unavailable", async () => {
    process.env.PATH = "";

    await expect(createVideoGif({
      video: path.join(os.tmpdir(), "missing.mp4"),
      output: path.join(os.tmpdir(), "missing.gif"),
      fps: 10,
      loop: 0,
      fit: "contain",
      position: "center",
      background: "#00000000"
    })).rejects.toThrow("ffmpeg");
    await expect(createVideoGif({
      video: path.join(os.tmpdir(), "missing.mp4"),
      output: path.join(os.tmpdir(), "missing.gif"),
      fps: 10,
      loop: 0,
      fit: "contain",
      position: "center",
      background: "#00000000"
    })).rejects.toThrow("tex-packer doctor");
  });

  it("reports missing FFmpeg as optional without failing doctor", async () => {
    process.env.PATH = "";

    const report = await doctor();
    const ffmpeg = report.checks.find((check) => check.name === "ffmpeg");

    expect(ffmpeg).toMatchObject({ ok: false, optional: true });
    expect(report.ok).toBe(true);
  });
});
