# @blackswampai/n8n-nodes-studiocms

An [n8n](https://n8n.io/) community node for the authenticated StudioCMS REST API v1.

## Installation

Install `@blackswampai/n8n-nodes-studiocms` from **Settings > Community Nodes** in a
self-hosted n8n instance. Enter the complete scoped package name when prompted.

For local development:

```sh
npm ci
npm run dev
```

## Compatibility

- Node.js 22.22.0 or newer
- n8n 2.34.4 or newer
- StudioCMS 0.4.4 or newer with the REST API enabled

Version 0.1.0 has been developed and tested against these versions.

## Credentials

Create a **StudioCMS API** credential in n8n with:

- **Site URL**: the public base URL of the StudioCMS site, such as `https://cms.example.com`
- **API Token**: a token created in the API Tokens section of the StudioCMS user profile

The credential includes an n8n connection test. It requests the StudioCMS categories endpoint
and reports invalid tokens before a workflow is run.

## Operations

- Connection: Check
- Category: Create, Delete, Get, Get Many, Update
- Folder: Create, Delete, Get, Get Many, Update
- Page: Create, Delete, Get, Get Many, Update
- Tag: Create, Delete, Get, Get Many, Update

Posts and user/settings operations are not included in 0.1.0.

## Development

```sh
npm ci
npm test
npm run lint
npm run build
npm run release:check
npm pack --dry-run
```

See [RELEASING.md](RELEASING.md) for the provenance-backed release procedure. Bugs and feature
requests can be filed in the [GitHub issue tracker](https://github.com/BlackSwampAI/n8n-nodes-studiocms/issues).

## License

[MIT](LICENSE.md)
