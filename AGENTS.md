# Orchestrator and builder workflow

- The human and primary agent are co-orchestrators; exactly one builder implements bounded work.
- The builder is Galileo using `gpt-5.6-sol` with low reasoning effort. Do not delegate recursively.
- Preserve unrelated changes and ask before dependencies, architecture, API, or release scope changes.
- Tests are strict `*.test.ts` Vitest files. Reserve `.mjs` for direct operational/release tooling.
- Run repository scripts before handoff. Do not publish, tag, push, or open/merge PRs without explicit authorization.
- Follow `RELEASING.md` for releases and record Template migrations explicitly.
- Keep operational fixtures, synthetic Git repositories, npm caches, and n8n user data under a
  unique `.codex-scratch/<task>` directory in this disk-backed workspace. Do not put clones,
  worktrees, dependency trees, or test-owned Git repositories in `/tmp`; set `TMPDIR` and cache
  paths into workspace scratch for resource-heavy commands. Remove task-owned scratch before handoff.
- Run `npm run review:source` before building, scanning, or packing. It rejects operation modules
  containing only typed empty `INodeProperties[]` placeholders and scaffolding.
- Compiled registration smoke requires one constructible export whose name matches each registered
  filename, rejects orphan credentials and icon paths outside the package, and retains the
  StudioCMS credential-test, required-wiring, and both-theme icon checks.
- Keep the tokenless npm OIDC release flow. The publish job fetches full history and verifies an
  annotated `v<version>` tag equals HEAD and is an ancestor of `origin/main` before Node setup.
- `npm run dev` binds port 5690 and uses `.codex-scratch/n8n-dev` as its default custom user folder;
  preserve any explicitly supplied `--custom-user-folder` argument.
- Preserve the intentional package file list (`dist` and `THIRD_PARTY_NOTICES.md`) and the
  StudioCMS icon-source hash guards when updating template tooling.
- Keep project typechecks pinned to `node_modules/typescript/bin/tsc`; npm may give a scanner's
  TypeScript 6 alias the generic `.bin/tsc` launcher, while this project remains on TypeScript 5.9.3.
