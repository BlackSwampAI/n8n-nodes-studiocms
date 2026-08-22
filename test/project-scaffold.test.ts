import { describe, expect, it } from 'vitest';

import manifest from '../package.json';
import tsconfig from '../tsconfig.json';

describe('project scaffold', () => {
	it('publishes the expected package identity and node registration', () => {
		expect(manifest).toMatchObject({
			name: '@blackswampai/n8n-nodes-studiocms',
			// Asserting a literal here breaks the suite on every release without
			// adding protection: package.json is the source of truth for the
			// version. Check the shape instead.
			version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
			license: 'MIT',
			author: {
				name: 'BlackSwamp AI',
				email: 'root@chris.guru',
			},
			repository: {
				type: 'git',
				url: 'https://github.com/BlackSwampAI/n8n-nodes-studiocms.git',
			},
			engines: { node: '>=22.22.0' },
			scripts: {
				build: 'n8n-node build',
				lint: 'n8n-node lint',
				test: 'vitest run',
				release: 'n8n-node release',
				prepublishOnly: 'n8n-node prerelease',
				'release:check': 'node scripts/release-check.mjs',
			},
			publishConfig: { access: 'public' },
			n8n: {
				n8nNodesApiVersion: 1,
				strict: true,
				credentials: ['dist/credentials/StudioCmsApi.credentials.js'],
				nodes: ['dist/nodes/StudioCms/StudioCms.node.js'],
			},
			devDependencies: {
				'@n8n/node-cli': '0.43.2',
				vitest: '4.1.10',
			},
			peerDependencies: {
				'n8n-workflow': '*',
			},
		});
	});

	it('uses strict TypeScript compiler settings', () => {
		expect(tsconfig.compilerOptions).toMatchObject({
			strict: true,
			noImplicitAny: true,
			noImplicitReturns: true,
			noUnusedLocals: true,
			strictNullChecks: true,
			forceConsistentCasingInFileNames: true,
		});
	});
});
