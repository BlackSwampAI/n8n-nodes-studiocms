import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const [pack] = JSON.parse(
	execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: root, encoding: 'utf8' }),
);
const files = pack.files.map(({ path }) => path);
const required = [
	'README.md',
	'LICENSE.md',
	'package.json',
	...manifest.n8n.nodes,
	...manifest.n8n.credentials,
	'dist/nodes/StudioCms/studioCms.svg',
	'dist/nodes/StudioCms/studioCms.dark.svg',
];
const missing = required.filter((path) => !files.includes(path));
const unexpected = files.filter(
	(path) =>
		!['README.md', 'LICENSE.md', 'package.json', 'THIRD_PARTY_NOTICES.md'].includes(path) &&
		!path.startsWith('dist/'),
);
if (missing.length || unexpected.length)
	throw new Error(
		`Package boundary failed. Missing: ${missing.join(', ')}; unexpected: ${unexpected.join(', ')}`,
	);
const hashes = {
	'nodes/StudioCms/studioCms.svg':
		'cd64401241cb17d12aa34ed042ec609bf586f80fe07ce1b6e4b8fd90893ef201',
	'nodes/StudioCms/studioCms.dark.svg':
		'0262581346822dde3c93fd6e62332afe53967c2b5e9afc424b751d19e302da31',
	'dist/nodes/StudioCms/studioCms.svg':
		'cd64401241cb17d12aa34ed042ec609bf586f80fe07ce1b6e4b8fd90893ef201',
	'dist/nodes/StudioCms/studioCms.dark.svg':
		'0262581346822dde3c93fd6e62332afe53967c2b5e9afc424b751d19e302da31',
};
for (const [path, expected] of Object.entries(hashes)) {
	const icon = readFileSync(resolve(root, path), 'utf8');
	if (!/^<svg\b[^]*<\/svg>\n?$/.test(icon)) {
		throw new Error(`StudioCMS icon must contain only SVG markup: ${path}`);
	}
	const actual = createHash('sha256').update(icon).digest('hex');
	if (actual !== expected) throw new Error(`Official StudioCMS icon hash changed: ${path}`);
}
console.log(`Package boundary passed (${files.length} intended files, ${pack.size} bytes packed)`);
