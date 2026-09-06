/* eslint-disable @n8n/community-nodes/no-restricted-imports -- release-tool tests */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { prepareNpmAuth } from '../scripts/prepare-npm-auth.mjs';
import {
	isDeterministicSecurityFailure,
	isLikelyPropagationFailure,
} from '../scripts/scan-policy.mjs';

const temporaryDirectories: string[] = [];
afterEach(() =>
	temporaryDirectories.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })),
);

describe('release hardening', () => {
	it('removes only setup-node empty auth while preserving token mode', () => {
		const directory = mkdtempSync(join(tmpdir(), 'studiocms-auth-'));
		temporaryDirectories.push(directory);
		const config = join(directory, '.npmrc');
		writeFileSync(
			config,
			'registry=https://registry.npmjs.org/\n//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}\n',
		);
		expect(prepareNpmAuth({ NPM_CONFIG_USERCONFIG: config })).toBe('oidc');
		expect(readFileSync(config, 'utf8')).toBe('registry=https://registry.npmjs.org/\n');
	});

	it('retries only known propagation failures for the exact package version', () => {
		const spec = '@blackswampai/n8n-nodes-studiocms@0.1.2';
		expect(
			isLikelyPropagationFailure('Reason: No package metadata found for version 0.1.2', spec),
		).toBe(true);
		expect(
			isLikelyPropagationFailure('Reason: No package metadata found for version 0.1.1', spec),
		).toBe(false);
		expect(
			isLikelyPropagationFailure(
				"Reason: Could not fetch the source repository recorded in the package's npm provenance (Request failed with status code 404). The scan lints the attested source, so it must be reachable",
				spec,
			),
		).toBe(true);
		expect(
			isLikelyPropagationFailure(
				"Reason: Could not fetch the source repository recorded in the package's npm provenance (Request failed with status code 403).",
				spec,
			),
		).toBe(false);
		expect(
			isDeterministicSecurityFailure(
				`Package ${spec} has failed security checks\nESLint violations found`,
				spec,
			),
		).toBe(true);
	});
});
