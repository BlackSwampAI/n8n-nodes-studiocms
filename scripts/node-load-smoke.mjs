import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, relative, resolve, sep } from 'node:path';

const packageRoot = process.argv[2] ? resolve(process.argv[2]) : resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
const { StudioCms } = require(resolve(packageRoot, manifest.n8n.nodes[0]));
const { StudioCmsApi } = require(resolve(packageRoot, manifest.n8n.credentials[0]));
const node = new StudioCms();
const credential = new StudioCmsApi();
if (node.description.name !== 'studioCms' || typeof node.execute !== 'function')
	throw new Error('Compiled StudioCMS node is invalid');
if (
	node.description.credentials?.[0]?.name !== credential.name ||
	!node.description.credentials[0].required
)
	throw new Error('StudioCMS credential is not wired to the node');
if (credential.test?.request?.method !== 'GET')
	throw new Error('StudioCMS credential test is missing');
for (const [registration, owner, icon] of [
	[manifest.n8n.nodes[0], node.description.name, node.description.icon],
	[manifest.n8n.credentials[0], credential.name, credential.icon],
]) {
	const references = typeof icon === 'string' ? [icon] : [icon?.light, icon?.dark];
	if (typeof icon === 'string' ? !icon : references.some((reference) => !reference)) {
		throw new Error(`Every packaged icon variant is required for ${owner}`);
	}
	for (const reference of references) {
		if (!reference.startsWith('file:'))
			throw new Error(`Icon must use a packaged file: reference for ${owner}`);
		const path = resolve(packageRoot, registration, '..', reference.slice(5));
		const fromRoot = relative(packageRoot, path);
		if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot))
			throw new Error(`Icon escapes package root: ${reference}`);
		if (!existsSync(path) || statSync(path).size === 0 || !/\.(?:svg|png)$/i.test(path))
			throw new Error(`Packaged SVG/PNG icon is missing or invalid: ${reference}`);
	}
}
console.log('Compiled StudioCMS node, credential, test, wiring, and icons loaded successfully');
