# Releasing StudioCMS for n8n

Publication is tag-driven through `.github/workflows/publish.yml`; never publish locally. After `publish` succeeds, a separate dependent `verify-published` job runs registry/provenance scanning. If only verification fails, GitHub Actions **Re-run failed jobs** reruns the verifier without invoking `npm run release`; never rerun a successful publish job for an immutable version.

Before tagging, confirm the repository is public, CI is green on the exact commit, npm Trusted
Publisher is configured for `BlackSwampAI/n8n-nodes-studiocms` and `publish.yml`, and no legacy
`NPM_TOKEN` secret remains. Run:

```sh
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run scan:source
npm run release:check
npm run package:check
npm run smoke:load
npm run smoke:install
git diff --check
```

Create an annotated `v<version>` tag only when it exactly matches `package.json`, then push only
that tag. The workflow publishes with OIDC/provenance and runs `scan:published`. The scanner must
print `Package <exact-name>@<exact-version> has passed all security checks`; exit status alone is
not sufficient. Only exact, bounded registry/provenance propagation failures are retried.

After success, verify npm version/latest metadata and SLSA provenance, then create the matching
GitHub release. Submit the exact published version to n8n and separately inspect the Creator
Portal card version and logo. The portal can remain stale even when npm and the tarball are
correct; do not publish an empty version to guess at cache invalidation.
