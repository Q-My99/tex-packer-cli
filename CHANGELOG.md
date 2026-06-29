# Changelog

## 0.2.0

- Added `tex-packer compress` for TinyPNG/Tinify image compression.
- Added reusable TinyPNG/Tinify key configuration via `tex-packer tinify set-key`.
- Improved CLI help and skill routing for TinyPNG, Tinify, and 熊猫压缩 requests.

## 0.1.1

- Added a project-level npm registry config and npm publish registry metadata.
- Improved release scripts to avoid repeated checks and builds during one publish command.
- Added a `sharp` runtime check to `tex-packer doctor`.
- Documented fixed-size atlas packing and GitHub Actions npm publishing options.

## 0.1.0

- Initial public CLI structure.
- Added texture atlas packing, splitting, `.ftpp` projects, exporters, and skill installation.
