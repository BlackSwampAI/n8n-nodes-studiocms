# StudioCMS API matrix

Accessed 2026-09-06. The integration targets the public authenticated REST v1 base
`/studiocms_api/rest/v1`. Existing automated tests freeze request paths, methods, bodies, list
normalization, limits, and errors. No destructive live test was run during this migration.

| Resource   | Operations                            | Public paths                      | Minimum inputs      | Evidence                    |
| ---------- | ------------------------------------- | --------------------------------- | ------------------- | --------------------------- |
| Connection | Check                                 | `GET /categories`                 | Credential          | Credential/unit contract    |
| Category   | Create, Delete, Get, Get Many, Update | `/categories`, `/categories/{id}` | Create fields or ID | Unit request/response tests |
| Folder     | Create, Delete, Get, Get Many, Update | `/folders`, `/folders/{id}`       | Create fields or ID | Unit request/response tests |
| Page       | Create, Delete, Get, Get Many, Update | `/pages`, `/pages/{id}`           | Create fields or ID | Unit request/response tests |
| Tag        | Create, Delete, Get, Get Many, Update | `/tags`, `/tags/{id}`             | Create fields or ID | Unit request/response tests |

StudioCMS 0.4.4 is the recorded compatibility baseline. Current hosted/self-hosted differences
and later REST schema changes remain unverified until exercised in a disposable instance.
