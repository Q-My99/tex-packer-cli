# Publishing

Use pnpm for package management.

## Automated publishing

Pushes to `main` run `.github/workflows/publish.yml`. The workflow installs
dependencies, runs the full release check, and publishes only when the version
in `package.json` does not already exist on npm.

Publishing uses npm Trusted Publishing with GitHub Actions OIDC. Configure the
`tex-packer-cli` package on npmjs.com with this trusted publisher:

- Provider: GitHub Actions
- Organization or user: `Q-My99`
- Repository: `tex-packer-cli`
- Workflow filename: `publish.yml`
- Environment: none
- Allowed action: `npm publish`

No `NPM_TOKEN` GitHub secret is required. The workflow needs `contents: read`
and `id-token: write`, uses a GitHub-hosted runner, and publishes with Node 24.

To publish a new patch version:

```bash
pnpm version patch --no-git-tag-version
git add package.json pnpm-lock.yaml
git commit -m "chore: release v$(node -p \"require('./package.json').version\")"
git push origin main
```

Use `minor` or `major` instead of `patch` when appropriate. A push that does
not change the package version still runs all checks and safely skips publish.

After verifying the first OIDC publish, set npm package publishing access to
"Require two-factor authentication and disallow tokens", then revoke any old
automation token.

## Manual fallback

```bash
pnpm install
pnpm release:check
npm login
pnpm release:npm
```

After publishing, verify npx:

```bash
npx tex-packer-cli list commands
npx tex-packer-cli skill install --target codex
```

Create a GitHub release after npm publish:

```bash
git tag v0.2.0
git push origin v0.2.0
gh release create v0.2.0 --title "v0.2.0" --notes "Release v0.2.0."
```
