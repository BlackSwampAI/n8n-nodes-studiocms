# Orchestrator and builder workflow

- The human and primary agent are co-orchestrators; exactly one builder implements bounded work.
- The builder is Galileo using `gpt-5.6-sol` with low reasoning effort. Do not delegate recursively.
- Preserve unrelated changes and ask before dependencies, architecture, API, or release scope changes.
- Tests are strict `*.test.ts` Vitest files. Reserve `.mjs` for direct operational/release tooling.
- Run repository scripts before handoff. Do not publish, tag, push, or open/merge PRs without explicit authorization.
- Follow `RELEASING.md` for releases and record Template migrations explicitly.
