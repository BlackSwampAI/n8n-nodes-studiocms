# Template migrations

This repository tracks reviewed changes from
[`christopherjnelson/n8n-community-node-template`](https://github.com/christopherjnelson/n8n-community-node-template).
Generated repositories do not inherit later template changes automatically; future versions must
be reviewed and adopted explicitly, with the marker and this log updated together.

## 2.0.0 — 2026-09-06

Original template adoption recorded for StudioCMS `0.1.3`; that release contained no template
migration.

## 2.2.0 — 2026-10-05

The pinned source commit identifies the `2.2.0` baseline. This migration also adopts the following
unversioned changes present on template `main` at that commit: isolated `dev` launcher, AST source
review, release-tag guard, scanner retry policy, and optional Discord notifier. Adaptations were
reviewed against the product instead of copying the template wholesale. Source commit:
[`596e784cfe69cd8894529b8a81c491921cde9773`](https://github.com/christopherjnelson/n8n-community-node-template/commit/596e784cfe69cd8894529b8a81c491921cde9773).

- Added the source AST placeholder guard, strict filename-matched compiled registration checks,
  and isolated port 5690 development launcher with workspace-owned user data.
- Added annotated release-tag/HEAD/reviewed-main ancestry verification before Node setup and
  tokenless OIDC publication guards.
- Pinned scanner `0.38.0` and `release-it` `20.2.0`, retained project TypeScript `5.9.3`, and
  bounded published-scan propagation retries to an initial 60-second wait plus eleven attempts.
- Added an optional fake-fetch-tested Discord notifier, operation-level API matrix, and
  workspace-scratch guidance. Existing package boundary, StudioCMS credential checks, icon hashes,
  and `THIRD_PARTY_NOTICES.md` distribution adaptation remain product-specific.
- Declarative-style conversion was deferred at the user's direction. This migration does not
  claim that the existing programmatic implementation is technically impossible to express with
  declarative routing; later assessment should compare routing, expressions, pagination, and
  `preSend`/`postReceive` hooks against the concrete shared preflight and error behavior.

The October 5 page response fix and disposable StudioCMS 0.6.1 compiled-node HTTP smoke are
separate product changes documented in the changelog and
[`live-smoke-2026-10-05.md`](live-smoke-2026-10-05.md).
