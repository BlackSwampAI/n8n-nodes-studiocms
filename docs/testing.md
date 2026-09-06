# Testing

The default suite is strict TypeScript with Vitest and mocks the public REST contract. It covers
credentials, transport, all resources, pagination/limits, output lineage, and error handling.

The release ladder is: format, n8n lint, production plus test typecheck, Vitest, build, official
source/built scanner preflight, dry-run package allowlist, compiled node/credential load, and an
isolated packed install. Registry provenance scanning occurs only after publication.

Live StudioCMS testing requires an explicitly disposable site, run-scoped fixtures, exact cleanup,
and absence verification. No live credentials belong in the repository. A representative actual
n8n editor smoke should verify the credential UI, visible/required controls, execution, and both
icon themes before each release.

For Creator Portal qualification, submit only the exact published version and visually record its
card version and logo. On 2026-09-06 the portal still showed 0.1.0 with a generic icon while npm
latest was 0.1.1 and both published tarballs contained their referenced SVGs. Portal presentation
therefore remains an independent manual gate.
