import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const readJson = async (path: string): Promise<Record<string, unknown>> =>
	JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8')) as Record<string, unknown>;

describe('project scaffold', () => {
	it('publishes the expected package identity and node registration', async () => {
		const manifest = await readJson('package.json');

		expect(manifest).toMatchObject({
			name: 'n8n-nodes-studiocms',
			version: '0.1.0',
			license: 'MIT',
			repository: {
				type: 'git',
				url: 'https://github.com/blackswampai/n8n-nodes-studiocms.git',
			},
			engines: { node: '>=22.22.0' },
			scripts: {
				build: 'n8n-node build',
				lint: 'n8n-node lint',
				test: 'vitest run',
			},
			publishConfig: { access: 'public' },
			n8n: {
				n8nNodesApiVersion: 1,
				strict: true,
				credentials: [],
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

	it('uses strict TypeScript compiler settings', async () => {
		const tsconfig = await readJson('tsconfig.json');

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
