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
		'5276da8af87725a949a580e824a9ce771de68c4a4560a1e81938687b9db49af6',
	'nodes/StudioCms/studioCms.dark.svg':
		'e3931df40a46753f93cbcd6197f7e972dde2c322920cc95c40730412333aa5fc',
	'dist/nodes/StudioCms/studioCms.svg':
		'5276da8af87725a949a580e824a9ce771de68c4a4560a1e81938687b9db49af6',
	'dist/nodes/StudioCms/studioCms.dark.svg':
		'e3931df40a46753f93cbcd6197f7e972dde2c322920cc95c40730412333aa5fc',
};
for (const [path, expected] of Object.entries(hashes)) {
	const actual = createHash('sha256')
		.update(readFileSync(resolve(root, path)))
		.digest('hex');
	if (actual !== expected) throw new Error(`Official StudioCMS icon hash changed: ${path}`);
}
console.log(`Package boundary passed (${files.length} intended files, ${pack.size} bytes packed)`);
