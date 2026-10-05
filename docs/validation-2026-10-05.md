# Validation record — 2026-10-05

Validation ran against a workspace scratch copy of the final source tree, preserving the shared root `node_modules` and `dist`. Commands used `timeout --signal=TERM --kill-after=10s 10m npm run <script>` for each script. Temporary files, package caches, and test repositories were kept under `.codex-scratch/template-migration-20261005`.

The full ladder passed on both installed Node runtimes:

| Node    | npm on PATH | Result              |
| ------- | ----------- | ------------------- |
| 24.18.0 | 11.19.0     | All commands passed |
| 22.23.2 | 10.9.8      | All commands passed |

For each runtime, the full ladder ran these commands:

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run review:source
npm run release:check
npm run build
npm run scan:source
npm run package:check
npm run smoke:load
npm run smoke:install
```

The final Node 24 run invoked each command as `timeout --signal=TERM --kill-after=10s 10m node "$NPM_CLI" run <script>`, with Node 24.18.0 first on `PATH` and `NPM_CLI` set to the already-cached npm 11.19.0 CLI at `.codex-scratch/template-migration-20261005/npm-cache/_npx/81d468605400e209/node_modules/npm/bin/npm-cli.js`. It printed `node=v24.18.0` and `npm=11.19.0` before the ladder. The Node 22 run used `npm run <script>` with Node 22.23.2/npm 10.9.8. An earlier Node 24 full ladder also passed with npm 11.16.0; the fresh offline install below used npm 11.19.0.

Vitest passed **253 tests in 16 files** on each runtime. Source review covered 7 TypeScript node files. The local official scanner source and built-package preflights passed. The package boundary check included 32 intended files (28,781 bytes); the packed package installed and loaded in an isolated consumer, and compiled registration smoke loaded one node and its wired credential.

A fresh offline `npm ci` using npm 11.19.0 also passed earlier in the task scratch. Its install layout kept project TypeScript 5.9.3 at `node_modules/typescript` and `.bin/tsc` linked to that compiler; scanner TypeScript aliases remained nested under the scanner dependency. The lockfile pins `@n8n/scan-community-package` 0.38.0 and `release-it` 20.2.0.

The test output includes existing Vite config-loader and dependency sourcemap warnings; they did not fail validation. The scanner’s published-package mode was not run because this change was not published. No GitHub Actions run, release, Discord notification, or actual n8n editor installation was performed. Node 22.22.0, the exact CI runtime, was unavailable; Node 22.23.2 was used instead. The local package scan and packed-consumer smoke are checks of this built artifact, not a claim of broad StudioCMS latest-version compatibility. The selected live StudioCMS 0.6.1 HTTP execution evidence is documented in [the live smoke report](live-smoke-2026-10-05.md).

## Changed files

- Package, workflow, and repository guidance: `.blackswamp/template.json`, `.github/pull_request_template.md`, `.github/workflows/ci.yml`, `.github/workflows/publish.yml`, `.gitignore`, `.prettierignore`, `AGENTS.md`, `CHANGELOG.md`, `README.md`, `RELEASING.md`, `package.json`, `package-lock.json`.
- Documentation and evidence: `docs/BATCH_HANDOFF_TEMPLATE.md`, `docs/TEMPLATE_MIGRATIONS.md`, `docs/api-matrix.md`, `docs/testing.md`, `docs/live-smoke-2026-10-05.md`, `docs/validation-2026-10-05.md`.
- Product implementation and tests: `nodes/StudioCms/resources/page.ts`, `test/page.test.ts`, `test/project-scaffold.test.ts`, `test/release-hardening.test.ts`, `test/fixtures/page-user-0.4.4.json`, `test/fixtures/page-user-0.6.1.json`, `test/icon-package.test.ts`, `test/node-review.test.ts`, `test/dev.test.ts`, `test/notify-discord.test.ts`, `test/release-tag.test.ts`, `test/scan-published.test.ts`.
- Tooling: `scripts/dev.mjs`, `scripts/dev.d.mts`, `scripts/node-load-smoke.mjs`, `scripts/node-load-smoke.d.mts`, `scripts/release-check.mjs`, `scripts/scan-policy.mjs`, `scripts/scan-published.mjs`, `scripts/scan-published.d.mts`, `scripts/notify-discord.mjs`, `scripts/notify-discord.d.mts`, `scripts/review-node-source.mjs`, `scripts/review-node-source.d.mts`, `scripts/verify-release-tag.mjs`, `scripts/verify-release-tag.d.mts`.

## Draft PR

**Title:** Fix reduced StudioCMS page users and align template tooling

**Body:** Page operations accept supported reduced embedded-user responses while retaining required identity and security checks and the supported legacy full embedded-user shape. Adds released-schema fixtures and a disposable StudioCMS 0.6.1 HTTP execution report. Aligns release, scanner, source-review, package-smoke, and documentation tooling with template baseline `596e784cfe69cd8894529b8a81c491921cde9773` plus documented unversioned follow-ups. Declarative conversion is deferred by request. Validation passed on Node 24.18.0/npm 11.19.0 and Node 22.23.2/npm 10.9.8; no publish or n8n editor smoke was performed.
