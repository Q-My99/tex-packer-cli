# Publishing

Use pnpm for package management.

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

## GitHub Actions Publishing Plan

Manual publishing remains the current release flow. For CI/CD publishing later,
prefer npm Trusted Publishing with GitHub Actions OIDC over a long-lived npm
token.

Planned workflow:

1. Add CI for `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`,
   and `pnpm pack:dry`.
2. Configure npm Trusted Publishing for the package, repository, and publish
   workflow path.
3. Trigger publishing from tags or GitHub Releases with
   `permissions: { id-token: write, contents: read }`.
4. Run `pnpm release:check`, then `npm publish --access public`.
5. Use an `NPM_TOKEN` secret only as a fallback. It must be a granular token
   with publish permission and bypass 2FA enabled.
