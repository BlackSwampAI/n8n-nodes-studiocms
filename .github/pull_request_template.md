## Summary

- Describe the user-visible or release-infrastructure change.
- Document a declarative-style assessment or an explicitly user-directed deferment when applicable;
  do not claim technical impossibility without concrete evidence.

## Validation

- [ ] Format, lint, strict typecheck, and Vitest pass
- [ ] Build and official source/built scanner preflight pass
- [ ] AST source review passes before build and scan
- [ ] Package boundary, compiled load, and isolated install smokes pass
- [ ] Icons have authoritative provenance, ship in the tarball, and render on light/dark backgrounds
- [ ] README, API matrix, testing, branding, and changelog remain accurate
- [ ] Template migration notes and marker match the reviewed source commit
- [ ] No secrets, local publishing, or unrelated changes

## Release qualification

- [ ] Tag/version match is reviewed; publication remains tag-only
- [ ] Published exact version is scanned and provenance-verified
- [ ] Creator Portal card version and logo are visually checked separately
