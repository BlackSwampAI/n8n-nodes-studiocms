# Branding provenance

On 2026-09-06 the official StudioCMS branding page and its source repository were checked. The
packaged icons copy the official SVG content from `withstudiocms/studiocms.dev` commit
`1fd414444e9e7736f23872f4a7ebf2013881a71e` under `www/public/press/logomarks/`:

- `studioCms.svg`: official `studiocms-logomark-dark.svg` (black mark for light n8n UI), SHA-256
  `5276da8af87725a949a580e824a9ce771de68c4a4560a1e81938687b9db49af6`.
- `studioCms.dark.svg`: official `studiocms-logomark-light.svg` (white mark for dark n8n UI),
  SHA-256 `e3931df40a46753f93cbcd6197f7e972dde2c322920cc95c40730412333aa5fc`.

Source: <https://studiocms.dev/branding> and the immutable official repository commit above.
The only mechanical difference from the downloaded upstream bytes is a terminal newline.

Both 108×108 square SVGs resolve from the compiled node and credential and are included in the npm
tarball. Light/dark rendering and the Creator Portal card require separate human inspection.
