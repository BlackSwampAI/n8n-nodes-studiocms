import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prepareNpmAuth } from './prepare-npm-auth.mjs';
import { isDeterministicSecurityFailure, isLikelyPropagationFailure } from './scan-policy.mjs';

const root = resolve(import.meta.dirname, '..');
prepareNpmAuth(process.env);
const { name, version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const packageSpec = `${name}@${version}`;
for (let attempt = 1; attempt <= 6; attempt += 1) {
	const result = spawnSync('npx', ['--yes', '@n8n/scan-community-package@0.34.0', packageSpec], {
		cwd: root,
		encoding: 'utf8',
	});
	const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
	process.stdout.write(output);
	if (output.includes(`Package ${packageSpec} has passed all security checks`)) process.exit(0);
	if (
		isDeterministicSecurityFailure(output, packageSpec) ||
		!isLikelyPropagationFailure(output, packageSpec)
	)
		process.exit(1);
	if (attempt < 6) await new Promise((resolveDelay) => setTimeout(resolveDelay, 10_000));
}
process.exit(1);
