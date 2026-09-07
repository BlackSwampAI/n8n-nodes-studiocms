# Branding provenance

On 2026-09-06 the official StudioCMS branding page and its source repository were checked. The
packaged icons copy the official SVG content from `withstudiocms/studiocms.dev` commit
`1fd414444e9e7736f23872f4a7ebf2013881a71e` under `www/public/press/logomarks/`:

- `studioCms.svg`: official `studiocms-logomark-dark.svg` (black mark for light n8n UI), SHA-256
  `cd64401241cb17d12aa34ed042ec609bf586f80fe07ce1b6e4b8fd90893ef201`.
- `studioCms.dark.svg`: official `studiocms-logomark-light.svg` (white mark for dark n8n UI),
  SHA-256 `0262581346822dde3c93fd6e62332afe53967c2b5e9afc424b751d19e302da31`.

Source: <https://studiocms.dev/branding> and the immutable official repository commit above.
Version 0.1.3 removed two shell-error lines accidentally prepended to each 0.1.2 icon. The cleaned
files contain only the upstream SVG markup followed by a terminal newline.

Both 108×108 square SVGs resolve from the compiled node and credential and are included in the npm
tarball. Light/dark rendering and the Creator Portal card require separate human inspection.
