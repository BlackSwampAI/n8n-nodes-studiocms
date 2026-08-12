# n8n-nodes-studiocms

An n8n community node for the authenticated StudioCMS REST API v1.

This repository is under active development. Version 0.1.0 targets Node.js 22.22 or newer,
n8n 2.34.4, and StudioCMS 0.4.4 or newer.

## Supported operations

- Connection: Check
- Category: Create, Delete, Get, Get Many, Update
- Folder: Create, Delete, Get, Get Many, Update
- Page: Get, Get Many
- Tag: Create, Delete, Get, Get Many, Update

## Development

```sh
npm ci
npm test
npm run lint
npm run build
```

## License

[MIT](LICENSE.md)
