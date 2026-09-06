# @blackswampai/n8n-nodes-studiocms

[![npm version](https://img.shields.io/npm/v/%40blackswampai%2Fn8n-nodes-studiocms.svg)](https://www.npmjs.com/package/@blackswampai/n8n-nodes-studiocms)
[![CI](https://github.com/BlackSwampAI/n8n-nodes-studiocms/actions/workflows/ci.yml/badge.svg)](https://github.com/BlackSwampAI/n8n-nodes-studiocms/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) ·
[Usage](#usage) · [Troubleshooting](#troubleshooting) · [Black Swamp AI](https://blackswampai.com/n8n-nodes/studiocms/)

An n8n community integration for the authenticated StudioCMS REST API v1.

This is an independent Black Swamp AI community integration. It is not affiliated with,
endorsed by, sponsored by, or maintained by StudioCMS. The StudioCMS name and logo belong to
their respective owners and are used only to identify compatibility.

## Installation

On the n8n canvas, open the nodes panel, search for **StudioCMS**, select it under **More from the
community**, and choose **Install**. On self-hosted n8n, administrators may alternatively install
the exact package name `@blackswampai/n8n-nodes-studiocms` through Community Nodes settings.

## Compatibility

| Component | Supported/tested baseline            |
| --------- | ------------------------------------ |
| Node.js   | 22.22.0 or newer                     |
| n8n       | 2.34.4 or newer                      |
| StudioCMS | 0.4.4 or newer with REST API enabled |

The 0.1 line was developed against this baseline. Later compatible versions should work, but
breaking upstream API changes may require an integration update.

## Credentials

Create a **StudioCMS API** credential with:

- **Site URL**: the public root URL of the StudioCMS site
- **API Token**: a token created in the StudioCMS user profile

The credential test performs a harmless authenticated category-list request.

## Operations

- Connection: Check
- Category: Create, Delete, Get, Get Many, Update
- Folder: Create, Delete, Get, Get Many, Update
- Page: Create, Delete, Get, Get Many, Update
- Tag: Create, Delete, Get, Get Many, Update

Posts and user/settings administration are not included.

## Usage

Add **StudioCMS**, select a resource and operation, choose the StudioCMS API credential, then map
input values with ordinary n8n expressions. Get Many operations support **Return All** and
**Limit**. IDs can be taken from preceding list results.

## Troubleshooting

- Confirm the Site URL is the public application root, without a REST path suffix.
- Confirm the REST API is enabled and the token remains active.
- A 401 indicates invalid credentials; a 404 usually indicates the selected object or API route
  is unavailable on that StudioCMS installation.

## Resources

- [StudioCMS REST API documentation](https://docs.studiocms.dev/en/how-it-works/restapi/)
- [Issue tracker](https://github.com/BlackSwampAI/n8n-nodes-studiocms/issues)
- [API contract and validation evidence](docs/api-matrix.md)
- [Testing](docs/testing.md)
- [Branding provenance](docs/branding.md)
- [Release procedure](RELEASING.md)

## Release provenance

Releases are published only from immutable version tags through GitHub Actions with npm
provenance. The source and built package are checked with the official n8n community-package
scanner before publication, then the registry package and attested source are checked afterward.

## License

The integration code is available under the [MIT License](LICENSE.md). See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for StudioCMS logo attribution.
