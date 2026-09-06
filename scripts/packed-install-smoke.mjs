import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'studiocms-package-smoke-'));
try {
	const [{ filename }] = JSON.parse(
		execFileSync('npm', ['pack', '--json', '--pack-destination', temporaryRoot], {
			cwd: root,
			encoding: 'utf8',
		}),
	);
	const consumer = join(temporaryRoot, 'consumer');
	mkdirSync(consumer);
	writeFileSync(
		join(consumer, 'package.json'),
		'{"name":"studiocms-install-smoke","private":true}\n',
	);
	execFileSync(
		'npm',
		[
			'install',
			'--ignore-scripts',
			'--no-package-lock',
			'--omit=peer',
			'--no-audit',
			'--no-fund',
			join(temporaryRoot, filename),
		],
		{ cwd: consumer, stdio: 'pipe' },
	);
	const installed = join(consumer, 'node_modules', '@blackswampai', 'n8n-nodes-studiocms');
	execFileSync(process.execPath, [resolve(root, 'scripts/node-load-smoke.mjs'), installed], {
		cwd: consumer,
		stdio: 'inherit',
		env: { ...process.env, NODE_PATH: resolve(root, 'node_modules') },
	});
	console.log('Packed package installed and loaded in an isolated consumer');
} finally {
	rmSync(temporaryRoot, { recursive: true, force: true });
}
