import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(".");

describe("image processing documentation", () => {
  it("keeps user and agent discovery surfaces synchronized", async () => {
    const files = [
      "README.md",
      "README.zh-CN.md",
      "llms.txt",
      "skills/tex-packer-cli/SKILL.md",
      "skills/tex-packer-cli/references/cli.md"
    ];

    for (const file of files) {
      const content = await fs.readFile(path.join(root, file), "utf8");
      for (const command of ["image resize", "image crop", "image convert", "image gif"]) {
        expect(content, `${file} should mention ${command}`).toContain(command);
      }
      expect(content, `${file} should mention optional FFmpeg`).toMatch(/optional FFmpeg|可选.*FFmpeg/i);
    }
  });

  it("keeps the Skill concise, discoverable, and progressively disclosed", async () => {
    const skill = await fs.readFile(path.join(root, "skills/tex-packer-cli/SKILL.md"), "utf8");
    const description = skill.match(/^description:\s*(.+)$/m)?.[1] || "";
    const body = skill.replace(/^---[\s\S]*?---\s*/, "");

    expect(description).toMatch(/^Use when/);
    expect(description).toMatch(/resize|crop|convert|GIF/i);
    expect(body.trim().split(/\s+/).length).toBeLessThan(500);
    expect(skill).toContain("references/cli.md");
    expect(skill).toContain("--help");
    expect(skill).toMatch(/sequence|序列帧/i);
    expect(skill).toMatch(/video.*FFmpeg|FFmpeg.*video/i);
    expect(skill).toContain("input directory basename");
  });

  it("keeps skill UI metadata and package descriptions current", async () => {
    const openai = await fs.readFile(path.join(root, "skills/tex-packer-cli/agents/openai.yaml"), "utf8");
    const packageJson = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
    const wrapper = JSON.parse(await fs.readFile(path.join(root, "skills/tex-packer-cli/scripts/tex-packer-cli/package.json"), "utf8"));

    expect(openai).toContain("$tex-packer-cli");
    expect(openai).toMatch(/resize|crop|convert|image/i);
    expect(openai).toContain("allow_implicit_invocation: true");
    expect(packageJson.description).toMatch(/resize|crop|convert|image processing/i);
    expect(wrapper.description || "").toMatch(/image processing/i);
  });
});
