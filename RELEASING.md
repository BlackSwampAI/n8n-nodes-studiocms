# Releasing the StudioCMS community node

This package is published only by `.github/workflows/publish.yml`. Do not run `npm publish`
locally for a version intended for n8n verification.

## Release gate

Before creating a release tag, confirm CI is green on the exact commit and run:

```sh
npm ci
npm test
npm run lint
npm run build
npm run release:check
npm pack --dry-run
git diff --check
```

Install the packed tarball in a disposable n8n instance and smoke-test credentials, operations,
outputs, and errors. Package versions and release tags are immutable; never reuse or move one
after publication.

## First publication: 0.1.0

npm requires `@blackswampai/n8n-nodes-studiocms` to exist before Trusted Publishing can be
configured. Bootstrap the first release from GitHub Actions:

1. In npm, create a temporary granular access token with read/write access to packages in the
   `@blackswampai` organization and bypass 2FA enabled for CI.
2. Add the token to this GitHub repository as an Actions secret named `NPM_TOKEN`.
3. Confirm `package.json` is `0.1.0`, the release gate passes, and CI is green on `main`.
4. Create an annotated `v0.1.0` tag on that exact commit and push only the tag.
5. Watch the **Publish** workflow through its final publish step.
6. Verify npm reports version `0.1.0`, the `latest` dist-tag, the GitHub repository, and a SLSA
   provenance attestation.
7. Create the matching GitHub release only after npm verification succeeds.

The temporary token authenticates the first publication. The n8n CLI still enables npm
provenance when it publishes from GitHub Actions.

## Switch to npm Trusted Publishing immediately

After 0.1.0 exists, configure its npm Trusted Publisher with these exact values:

- Provider: GitHub Actions
- Organization or user: `BlackSwampAI`
- Repository: `n8n-nodes-studiocms`
- Workflow filename: `publish.yml`
- Environment: blank
- Allowed action: `npm publish`

Then delete the repository's `NPM_TOKEN` secret and revoke the temporary npm token. Later tag
publishes will authenticate with short-lived OIDC credentials and generate provenance
automatically.

## Later releases

1. Update the package version and changelog.
2. Run the complete release gate and merge the release state to `main`.
3. Create and push the matching annotated `v<version>` tag.
4. Verify the Publish workflow, npm version and `latest` tag, provenance attestation, and GitHub
   release.
