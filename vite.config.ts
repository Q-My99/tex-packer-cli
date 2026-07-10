import { defineConfig } from "vite";

const external = [
  "@jvitela/mustache-wax",
  "commander",
  "jszip",
  "maxrects-packer",
  "modern-gif",
  "mustache",
  "node:child_process",
  "node:crypto",
  "node:fs",
  "node:fs/promises",
  "node:os",
  "node:path",
  "node:url",
  "plist",
  "sharp",
  "tinify",
  "xml2js"
];

export default defineConfig({
  build: {
    target: "node20",
    ssr: true,
    sourcemap: true,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "index"
    },
    rollupOptions: {
      external,
      output: {
        banner: "#!/usr/bin/env node"
      }
    }
  }
});
