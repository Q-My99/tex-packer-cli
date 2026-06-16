# Publishing

Use pnpm for package management.

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
npm pack --dry-run
npm login
npm publish --access public
```

After publishing, verify npx:

```bash
npx tex-packer-cli list commands
npx tex-packer-cli skill install --target codex
```

Create a GitHub release after npm publish:

```bash
git tag v0.1.0
git push origin v0.1.0
gh release create v0.1.0 --title "v0.1.0" --notes "Initial public release."
```
