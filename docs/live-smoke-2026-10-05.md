# StudioCMS 0.6.1 live page smoke

On 2026-10-05, the compiled `StudioCms.execute()` implementation was exercised against a
temporary production build of StudioCMS 0.6.1 bound to `127.0.0.1:4321`. The isolated site used
Astro 7.3.5, `@astrojs/node` 11.1.6, `@withstudiocms/api-spec` 0.4.1,
`@withstudiocms/sdk` 0.4.2, `@libsql/client` 0.18.0, and `@studiocms/md` 0.5.0. The site used a
fresh local SQLite file. The canonical URL was a placeholder; all smoke requests went to loopback.
The renderer and Astro versions are recorded to make the tested environment reproducible, not as a
claim that they are required production dependencies for this node.

The database migrations were run using StudioCMS 0.6.1. A disposable owner and API token were
seeded only into this new database to avoid an interactive login. The node's compiled
`StudioCms.execute()` method then ran with an HTTP helper shim that applied the credential's
`Authorization: Bearer {{$credentials.apiToken}}` expression and issued real HTTP requests. The
shim recorded only method, path, and status. This verifies the compiled node and its real HTTP
contract; it does not represent an n8n editor or full n8n runtime test.

## Results

The node created two run-scoped Pages and retrieved them through Page Get Many and Page Get.
StudioCMS returned populated `authorData` and `contributorsData`. Each embedded user had exactly
the keys `avatar`, `id`, `name`, `url`, and `username`; `createdAt`, `updatedAt`, `emailVerified`,
`notifications`, `email`, and `password` were absent. Both Page Get Many and Page Get accepted
these JSON responses.

The first Update attempt returned HTTP 500 with an empty response body. A subsequent Get Many
showed that the title had already changed. Inspection of the pinned 0.6.1 secure page handler
showed that it updates the Page before looking up site configuration, then returns an error when
that configuration is missing. This was a disposable-site bootstrap issue, not evidence that the
node had blocked a failed mutation. StudioCMS's own first-time setup endpoint,
`POST /studiocms_api/dashboard/step-1`, then returned HTTP 200 and initialized the site
configuration.

After rebuilding with setup mode disabled, Page Update returned HTTP 200. A refetch confirmed the
new title and unchanged description, content, categories, tags, package, and slug. Page Delete
returned HTTP 200. The two Page Get Many queries each returned zero results after deletion, and
SQLite reported zero corresponding rows in both `StudioCMSPageData` and `StudioCMSPageContent`.
An additional run-scoped diagnostic Page created during investigation was also deleted through
the compiled node and verified absent through Get Many and both table counts. Final whole-table
counts were zero for Page data and Page content.

Sanitized request trace for the successful workflow (the two created Pages each followed the
same Get Many/Get sequence):

| Method | Path                                | Status | Purpose                            |
| ------ | ----------------------------------- | -----: | ---------------------------------- |
| POST   | `/studiocms_api/rest/v1/pages`      |    200 | Page Create                        |
| GET    | `/studiocms_api/rest/v1/pages`      |    200 | Get Many by run-scoped slug        |
| GET    | `/studiocms_api/rest/v1/pages/{id}` |    200 | Page Get                           |
| GET    | `/studiocms_api/rest/v1/pages/{id}` |    200 | Update preflight                   |
| PATCH  | `/studiocms_api/rest/v1/pages/{id}` |    200 | Page Update                        |
| GET    | `/studiocms_api/rest/v1/pages/{id}` |    200 | Refetch and preservation check     |
| GET    | `/studiocms_api/rest/v1/pages/{id}` |    200 | Delete preflight                   |
| DELETE | `/studiocms_api/rest/v1/pages/{id}` |    200 | Page Delete                        |
| GET    | `/studiocms_api/rest/v1/pages`      |    200 | Post-delete Get Many; zero matches |

The two initial Page records and the investigation's additional diagnostic record were each
deleted and checked by exact run-scoped slug. Each had zero Get Many results and zero matching
SQLite page/content rows; final whole-table counts were also zero. The initial pre-bootstrap
PATCH 500 was followed by a refetch that proved the write had happened; it is documented above to
distinguish the server's post-write setup error from a rejected mutation.

## Limits

This is a fixture-free live check against the pinned StudioCMS 0.6.1 release environment only. It
does not establish compatibility with every StudioCMS release or current upstream versions. The
node was invoked directly through its compiled `execute()` method; no n8n editor was launched.
The owner, token, database, dependencies, build output, and server were task-local and removed or
stopped after the run. No live credentials were retained.
