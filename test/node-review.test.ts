/* eslint-disable @n8n/community-nodes/no-restricted-imports -- disposable source/package fixtures */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { cwd } from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';
import {
	assertRegisteredCredentialsAreWired,
	loadRegistration,
	runNodeLoadSmoke,
} from '../scripts/node-load-smoke.mjs';
import { findEmptyPropertyPlaceholders, reviewNodeSource } from '../scripts/review-node-source.mjs';

const roots: string[] = [];

afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function temporaryRoot(prefix: string) {
	const scratchRoot = join(cwd(), '.codex-scratch');
	mkdirSync(scratchRoot, { recursive: true });
	const root = mkdtempSync(join(scratchRoot, prefix));
	roots.push(root);
	return root;
}

function write(path: string, contents: string) {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, contents);
}

function registrationFixture(nodeModule: string, credentialModule?: string) {
	const root = temporaryRoot('node-registration-review-');
	write(join(root, 'dist/nodes/TestNode.node.js'), nodeModule);
	write(
		join(root, 'dist/credentials/TestApi.credentials.js'),
		credentialModule ??
			`class TestApi { constructor() { this.name = 'testApi'; this.icon = 'file:test.svg'; } } module.exports = { TestApi };`,
	);
	write(join(root, 'dist/nodes/test.svg'), '<svg viewBox="0 0 32 32"></svg>');
	write(join(root, 'dist/credentials/test.svg'), '<svg viewBox="0 0 32 32"></svg>');
	write(
		join(root, 'package.json'),
		JSON.stringify({
			n8n: {
				nodes: ['dist/nodes/TestNode.node.js'],
				credentials: ['dist/credentials/TestApi.credentials.js'],
			},
		}),
	);
	return root;
}

const validNode = `class TestNode { constructor() { this.description = { name: 'testNode', displayName: 'Test Node', version: 1, icon: 'file:test.svg', credentials: [{ name: 'testApi' }] }; } } module.exports = { TestNode, metadata: { stable: true }, helper: () => true };`;

function studioCmsFixture({
	required = true,
	execute = true,
	credentialTestMethod = 'GET',
	nodeDark = 'file:studioCms.dark.svg',
	credentialDark = 'file:studioCmsApi.dark.svg',
}: {
	required?: boolean;
	execute?: boolean;
	credentialTestMethod?: string | undefined;
	nodeDark?: string | undefined;
	credentialDark?: string | undefined;
} = {}) {
	const root = temporaryRoot('studiocms-registration-review-');
	write(
		join(root, 'dist/nodes/StudioCms.node.js'),
		`class StudioCms { constructor() { ${execute ? 'this.execute = () => {};' : ''} this.description = { name: 'studioCms', displayName: 'StudioCMS', version: 1, credentials: [{ name: 'studioCmsApi', required: ${required} }], icon: { light: 'file:studioCms.svg', dark: '${nodeDark}' } }; } } module.exports = { StudioCms };`,
	);
	write(
		join(root, 'dist/credentials/StudioCmsApi.credentials.js'),
		`class StudioCmsApi { constructor() { this.name = 'studioCmsApi'; this.icon = { light: 'file:studioCmsApi.svg', dark: '${credentialDark}' }; this.test = { request: { method: '${credentialTestMethod}' } }; } } module.exports = { StudioCmsApi };`,
	);
	write(join(root, 'dist/nodes/studioCms.svg'), '<svg viewBox="0 0 32 32"></svg>');
	write(join(root, 'dist/nodes/studioCms.dark.svg'), '<svg viewBox="0 0 32 32"></svg>');
	write(join(root, 'dist/credentials/studioCmsApi.svg'), '<svg viewBox="0 0 32 32"></svg>');
	write(join(root, 'dist/credentials/studioCmsApi.dark.svg'), '<svg viewBox="0 0 32 32"></svg>');
	write(
		join(root, 'package.json'),
		JSON.stringify({
			name: '@blackswampai/n8n-nodes-studiocms',
			n8n: {
				nodes: ['dist/nodes/StudioCms.node.js'],
				credentials: ['dist/credentials/StudioCmsApi.credentials.js'],
			},
		}),
	);
	return root;
}

describe('StudioCMS compiled product-specific registration checks', () => {
	it('requires execute, a required wired credential, harmless GET test, and both icon themes', () => {
		expect(runNodeLoadSmoke(studioCmsFixture())).toEqual({ nodeCount: 1, credentialCount: 1 });
	});

	it('rejects an optional StudioCMS credential', () => {
		expect(() => runNodeLoadSmoke(studioCmsFixture({ required: false }))).toThrow(
			'StudioCMS credential is not wired to the node as required',
		);
	});

	it('rejects a StudioCMS constructor without execute', () => {
		expect(() => runNodeLoadSmoke(studioCmsFixture({ execute: false }))).toThrow(
			'Compiled StudioCMS node must expose its execute method',
		);
	});

	it('rejects a missing StudioCMS credential test', () => {
		expect(() => runNodeLoadSmoke(studioCmsFixture({ credentialTestMethod: 'POST' }))).toThrow(
			'StudioCMS credential test must retain its harmless GET request',
		);
	});

	it('requires both light and dark StudioCMS node and credential icon references', () => {
		expect(() => runNodeLoadSmoke(studioCmsFixture({ nodeDark: '' }))).toThrow(
			'Both StudioCMS node icon variants are required',
		);
		expect(() => runNodeLoadSmoke(studioCmsFixture({ credentialDark: '' }))).toThrow(
			'Both StudioCMS credential icon variants are required',
		);
	});
});

describe('compiled registration constructor contract', () => {
	it('rejects registered credentials that no registered node uses', () => {
		expect(() => assertRegisteredCredentialsAreWired([], [{ name: 'orphanApi' }])).toThrow(
			'Registered credential types are not referenced by a node: orphanApi',
		);
	});

	it('loads valid filename-matching node and credential constructors', () => {
		const root = registrationFixture(validNode);
		expect(runNodeLoadSmoke(root)).toEqual({ nodeCount: 1, credentialCount: 1 });
	});

	it('rejects a module with no constructible exports', () => {
		const root = registrationFixture(`module.exports = { metadata: { stable: true } };`);
		expect(() => loadRegistration(root, 'dist/nodes/TestNode.node.js', 'node')).toThrow(
			'must export constructible TestNode; constructible exports: none',
		);
	});

	it('rejects a missing expected export despite a usable alternate node constructor', () => {
		const root = registrationFixture(validNode.replace(/TestNode/g, 'AlternateNode'));
		expect(() => loadRegistration(root, 'dist/nodes/TestNode.node.js', 'node')).toThrow(
			'must export constructible TestNode; constructible exports: AlternateNode',
		);
	});

	it('rejects a redundant alias even when it references the expected constructor', () => {
		const root = registrationFixture(
			`class TestNode {} module.exports = { TestNode, TestNodeAlias: TestNode };`,
		);
		expect(() => loadRegistration(root, 'dist/nodes/TestNode.node.js', 'node')).toThrow(
			'redundant or unrelated constructible exports: TestNodeAlias; export only TestNode',
		);
	});

	it('rejects an unrelated constructor without instantiating it', () => {
		const root = registrationFixture(
			`class TestNode {} class Explodes { constructor() { throw new Error('constructor ran'); } } module.exports = { TestNode, Explodes };`,
		);
		expect(() => loadRegistration(root, 'dist/nodes/TestNode.node.js', 'node')).toThrow(
			'redundant or unrelated constructible exports: Explodes',
		);
	});

	it('rejects wrong-case constructor names', () => {
		const root = registrationFixture(validNode.replace(/TestNode/g, 'Testnode'));
		expect(() => loadRegistration(root, 'dist/nodes/TestNode.node.js', 'node')).toThrow(
			'must export constructible TestNode; constructible exports: Testnode',
		);
	});

	it('enforces filename matching for usable credential constructors', () => {
		const root = registrationFixture(
			validNode,
			`class AlternateApi { constructor() { this.name = 'testApi'; this.icon = 'file:test.svg'; } } module.exports = { AlternateApi };`,
		);
		expect(() =>
			loadRegistration(root, 'dist/credentials/TestApi.credentials.js', 'credential'),
		).toThrow('must export constructible TestApi; constructible exports: AlternateApi');
	});

	it('rejects the expected constructor when it does not produce the registered kind', () => {
		const root = registrationFixture(`class TestNode {} module.exports = { TestNode };`);
		expect(() => loadRegistration(root, 'dist/nodes/TestNode.node.js', 'node')).toThrow(
			'export TestNode is not a usable node',
		);
	});
});

describe('node source placeholder review', () => {
	it('rejects the original empty property-only operation module shape', () => {
		const root = temporaryRoot('node-source-review-');
		write(
			join(root, 'nodes/Service/resources/comment/get.ts'),
			`import type { INodeProperties } from 'n8n-workflow';\nexport const commentGetDescription: INodeProperties[] = [];\n`,
		);

		expect(findEmptyPropertyPlaceholders(root)).toEqual([
			{
				path: 'nodes/Service/resources/comment/get.ts',
				reason:
					'exports only empty INodeProperties arrays plus import/type scaffolding; remove the placeholder and its import/spread',
			},
		]);
		expect(() => reviewNodeSource(root)).toThrow(
			'nodes/Service/resources/comment/get.ts: exports only empty INodeProperties arrays',
		);
	});

	it('recognizes an ordinary named interface import used only as a type', () => {
		const root = temporaryRoot('node-source-review-interface-import-');
		write(
			join(root, 'nodes/Service/resources/page/get.ts'),
			`import { INodeProperties } from 'n8n-workflow';\nexport const pageGetDescription: INodeProperties[] = [];\n`,
		);
		expect(findEmptyPropertyPlaceholders(root)).toHaveLength(1);
	});

	it('also detects the Array<INodeProperties> spelling with type scaffolding', () => {
		const root = temporaryRoot('node-source-review-');
		write(
			join(root, 'nodes/Service/empty.ts'),
			`import type { INodeProperties } from 'n8n-workflow';\ntype Local = INodeProperties;\nexport const fields: Array<INodeProperties> = [];\n`,
		);
		expect(findEmptyPropertyPlaceholders(root)).toHaveLength(1);
	});

	it('allows imports-only modules, generic empty arrays, and meaningful modules', () => {
		const root = temporaryRoot('node-source-review-');
		write(
			join(root, 'nodes/Service/imports.ts'),
			`import type { IDataObject } from 'n8n-workflow';\n`,
		);
		write(join(root, 'nodes/Service/generic.ts'), `export const values: string[] = [];\n`);
		write(
			join(root, 'nodes/Service/logic.ts'),
			`import type { INodeProperties } from 'n8n-workflow';\nexport const fields: INodeProperties[] = [];\nexport function build() { return fields; }\n`,
		);
		write(
			join(root, 'nodes/Service/Service.node.ts'),
			`export class Service { description = { properties: [], options: [] }; }\n`,
		);
		write(
			join(root, 'nodes/Service/runtime-import.ts'),
			`import { run } from './runtime';\nimport type { INodeProperties } from 'n8n-workflow';\nexport const fields: INodeProperties[] = [];\nrun();\n`,
		);

		expect(findEmptyPropertyPlaceholders(root)).toEqual([]);
		expect(reviewNodeSource(root).fileCount).toBe(5);
	});

	it('preserves modules with runtime imports or value re-exports', () => {
		const root = temporaryRoot('node-source-review-');
		write(
			join(root, 'nodes/Service/real-operation.ts'),
			`export const operation = { value: 'get' };\n`,
		);
		write(
			join(root, 'nodes/Service/reexport.ts'),
			`import type { INodeProperties } from 'n8n-workflow';\nexport const fields: INodeProperties[] = [];\nexport { operation } from './real-operation';\n`,
		);
		write(
			join(root, 'nodes/Service/side-effect.ts'),
			`import './register-runtime';\nimport type { INodeProperties } from 'n8n-workflow';\nexport const fields: INodeProperties[] = [];\n`,
		);

		expect(findEmptyPropertyPlaceholders(root)).toEqual([]);
	});
});
