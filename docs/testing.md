# Testing

The default suite is strict TypeScript with Vitest and mocks the public REST contract. It covers
credentials, transport, all resources, pagination/limits, output lineage, and error handling.

The release ladder is: format, n8n lint, production plus test typecheck, Vitest, source AST review,
build, official source/built scanner preflight, dry-run package allowlist, compiled node/credential
load, and an isolated packed install. Registry provenance scanning occurs only after publication.

The registry scanner waits 60 seconds before its first attempt, then retries only narrowly
recognized propagation failures up to eleven attempts total, with 30 seconds between attempts (up
to 360 seconds of scheduled waiting, excluding scanner execution time). This includes the
short-lived 404 that can occur while npm provenance is already available but its newly attested
GitHub source is not yet fetchable by the scanner; policy and lint failures still fail immediately.

Live StudioCMS testing requires an explicitly disposable site, run-scoped fixtures, exact cleanup,
and absence verification. No live credentials belong in the repository. A disposable live smoke
against StudioCMS 0.6.1 exercised the compiled node through real HTTP; its pinned setup,
methods/statuses, wire observations, cleanup, and limits are recorded in
[`live-smoke-2026-10-05.md`](live-smoke-2026-10-05.md). This does not qualify the n8n editor or
other StudioCMS versions. A representative actual n8n editor smoke should still verify the
credential UI, visible/required controls, execution, and both icon themes before each release.

For Creator Portal qualification, submit only the exact published version and visually record its
card version and logo. On 2026-09-06 the portal still showed 0.1.0 with a generic icon while npm
latest was 0.1.1 and both published tarballs contained their referenced SVGs. Portal presentation
therefore remains an independent manual gate.

## StudioCMS page response fixtures

Page response fixtures are JSON so tests exercise the wire representation consumed by the node.
The legacy fixture is the safe embedded-user shape, not a complete user object: it follows
`StudioCMSUsersTable.Select` with `email` and
`password` omitted in StudioCMS 0.4.4 (tag commit
[`a17e6b2`](https://github.com/withstudiocms/studiocms/tree/a17e6b2496567851894ecdc80df08110125cbde7));
the reduced fixture follows the same schema omitting `updatedAt`, `createdAt`, `emailVerified`, and
`notifications` in 0.5.0 (API spec 0.4.0, tag commit
[`55aa386`](https://github.com/withstudiocms/studiocms/tree/55aa3862f44ada3ed0695cd13df94fd82576ea64))
and 0.6.1 (tag commit
[`0e65b27`](https://github.com/withstudiocms/studiocms/tree/0e65b274120ed08b1e40f638b80b63f292ec6b3a)).
The 0.4.4 API schema is in immutable
[`schemas.ts`](https://github.com/withstudiocms/studiocms/blob/a17e6b2496567851894ecdc80df08110125cbde7/packages/%40withstudiocms/api-spec/src/rest-api/schemas.ts),
the 0.5.0 API schema is in immutable
[`schemas.ts`](https://github.com/withstudiocms/studiocms/blob/55aa3862f44ada3ed0695cd13df94fd82576ea64/packages/%40withstudiocms/api-spec/src/rest-api/schemas.ts),
and the 0.6.1 API schema is in immutable
[`schemas.ts`](https://github.com/withstudiocms/studiocms/blob/0e65b274120ed08b1e40f638b80b63f292ec6b3a/packages/%40withstudiocms/api-spec/src/rest-api/schemas.ts);
`StudioCMSUsersTable` is defined in immutable
[`tables.ts`](https://github.com/withstudiocms/studiocms/blob/0e65b274120ed08b1e40f638b80b63f292ec6b3a/packages/%40withstudiocms/sdk/src/tables.ts).
That table uses `DateFromString`, `CreatedAtDate`, and `BooleanFromNumber` from the pinned
[`kysely` schema source](https://github.com/withstudiocms/studiocms/blob/0e65b274120ed08b1e40f638b80b63f292ec6b3a/packages/%40withstudiocms/kysely/src/core/schema.ts),
which encode dates as strings and booleans as 0/1.
Both page GET endpoints declare `PublicV1GetPagesSelect` as their success schema in
[`public/pages.ts`](https://github.com/withstudiocms/studiocms/blob/0e65b274120ed08b1e40f638b80b63f292ec6b3a/packages/%40withstudiocms/api-spec/src/rest-api/v1/public/pages.ts)
and the authenticated secure API in
[`secure/pages.ts`](https://github.com/withstudiocms/studiocms/blob/0e65b274120ed08b1e40f638b80b63f292ec6b3a/packages/%40withstudiocms/api-spec/src/rest-api/v1/secure/pages.ts);
the released public handler returns those SDK results through `HttpApiBuilder` in
[`public.ts`](https://github.com/withstudiocms/studiocms/blob/0e65b274120ed08b1e40f638b80b63f292ec6b3a/packages/studiocms/frontend/pages/studiocms_api/_handlers/rest-api/v1/public.ts)
and secure results through
[`secure.ts`](https://github.com/withstudiocms/studiocms/blob/0e65b274120ed08b1e40f638b80b63f292ec6b3a/packages/studiocms/frontend/pages/studiocms_api/_handlers/rest-api/v1/secure.ts),
which schema-encodes JSON responses. Tests load the pinned JSON fixtures and JSON-roundtrip
complete pages before validation. These checks establish fixture compatibility only; the separate
disposable live smoke is recorded in [`live-smoke-2026-10-05.md`](live-smoke-2026-10-05.md).
