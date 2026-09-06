import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const failures = [];
const expectedPackageName = '@blackswampai/n8n-nodes-studiocms';
const expectedRepository = 'https://github.com/BlackSwampAI/n8n-nodes-studiocms';

function fail(message) {
	failures.push(message);
}

function read(path) {
	return readFileSync(resolve(root, path), 'utf8');
}

function hasPlaceholder(value) {
	return typeof value === 'string' && /<\.\.\.|TODO|CHANGEME/i.test(value);
}

const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));
const publishWorkflow = read('.github/workflows/publish.yml');
const readme = read('README.md');
const nodeMetadata = JSON.parse(read('nodes/StudioCms/StudioCms.node.json'));
const credentialSource = read('credentials/StudioCmsApi.credentials.ts');
const changelog = read('CHANGELOG.md');
const npmConfig = read('.npmrc');
let templateMarker;
try {
	templateMarker = JSON.parse(read('.blackswamp/template.json'));
} catch {
	fail('.blackswamp/template.json must exist and contain valid JSON');
}

if (packageJson.name !== expectedPackageName) {
	fail(`package.json name must be ${expectedPackageName}`);
}
if (
	packageLock.name !== expectedPackageName ||
	packageLock.packages?.['']?.name !== expectedPackageName
) {
	fail('package-lock.json package identity must match package.json');
}

for (const [label, value] of [
	['description', packageJson.description],
	['homepage', packageJson.homepage],
	['repository.url', packageJson.repository?.url],
	['author.name', packageJson.author?.name],
	['author.email', packageJson.author?.email],
]) {
	if (!value || hasPlaceholder(value))
		fail(`package.json ${label} is missing or still a placeholder`);
}

if (packageJson.private === true) fail('package.json must not be private');
if (packageJson.license !== 'MIT') fail('package.json license must be MIT for n8n verification');
if (!packageJson.keywords?.includes('n8n-community-node-package')) {
	fail('package.json keywords must contain n8n-community-node-package');
}
if (Object.keys(packageJson.dependencies ?? {}).length > 0) {
	fail('runtime dependencies require explicit n8n verification review; remove or justify them');
}
if (packageJson.peerDependencies?.['n8n-workflow'] !== '*') {
	fail('n8n-workflow must remain a host-provided peer dependency');
}
if (packageJson.n8n?.strict !== true) fail('package.json n8n.strict must be true');
if (packageJson.n8n?.nodes?.length !== 1) fail('package.json must register the StudioCMS node');
if (packageJson.n8n?.credentials?.length !== 1)
	fail('package.json must register StudioCMS credentials');
if (packageJson.publishConfig?.access !== 'public') fail('publishConfig.access must be public');
if (packageJson.engines?.node !== '>=22.22.0') fail('engines.node must match >=22.22.0');
if (packageJson.packageManager !== 'npm@11.19.0') fail('packageManager must pin npm@11.19.0');
if (/^\s*engine-strict\s*=\s*true\s*$/im.test(npmConfig)) {
	fail('engine-strict must remain disabled so the Node 22 CI lane can install dev-only tooling');
}
if (packageJson.scripts?.release !== 'n8n-node release') fail('release must use n8n-node release');
if (packageJson.scripts?.prepublishOnly !== 'n8n-node prerelease') {
	fail('prepublishOnly must use the n8n-node prerelease guard');
}

if (nodeMetadata.node !== `${expectedPackageName}.studioCms`) {
	fail('StudioCMS codex metadata must use the fully qualified scoped node type');
}
if (nodeMetadata.codexVersion !== '1.0' || !nodeMetadata.categories?.length) {
	fail('StudioCMS codex metadata must declare a version and category');
}
if (!/\btest:\s*ICredentialTestRequest\s*=/.test(credentialSource)) {
	fail('StudioCMS API credentials must retain an n8n credential test');
}

if (!publishWorkflow.includes("- 'v*.*.*'")) fail('publish workflow must trigger on version tags');
if (!/id-token:\s*write/.test(publishWorkflow)) fail('publish workflow needs id-token: write');
if (!publishWorkflow.includes('node-version: 24')) fail('publish workflow must use Node 24');
if (!publishWorkflow.includes('npm@11.19.0')) fail('publish workflow must pin npm 11.19.0');
if (!publishWorkflow.includes('npm run release')) fail('publish workflow must run npm run release');
if (publishWorkflow.includes('secrets.NPM_TOKEN'))
	fail('established package must publish with tokenless OIDC');
for (const command of [
	'npm run scan:source',
	'npm run package:check',
	'npm run smoke:load',
	'npm run smoke:install',
])
	if (!publishWorkflow.includes(command)) fail(`publish workflow is missing ${command}`);
if (!publishWorkflow.includes('timeout-minutes: 30')) fail('publish job needs a 30-minute timeout');
const [publishJob, verifyPublishedJob = ''] = publishWorkflow.split(/\n  verify-published:\s*\n/);
if (
	!/needs:\s*publish/.test(verifyPublishedJob) ||
	!verifyPublishedJob.includes('npm run scan:published')
)
	fail('verify-published must depend on publish and run the published scanner');
if (publishJob.includes('npm run scan:published') || verifyPublishedJob.includes('npm run release'))
	fail('publication and published-package verification must remain separate jobs');
if (/id-token:\s*write/.test(verifyPublishedJob))
	fail('verify-published must not receive id-token: write');

if (
	process.env.GITHUB_REF_TYPE === 'tag' &&
	process.env.GITHUB_REF_NAME !== `v${packageJson.version}`
)
	fail(`GitHub tag must exactly match package version v${packageJson.version}`);
if (!new RegExp(`^## ${packageJson.version}(?: |$)`, 'm').test(changelog))
	fail('CHANGELOG needs a heading for the current package version');

if (
	templateMarker?.schemaVersion !== 1 ||
	templateMarker?.templateVersion !== '2.0.0' ||
	templateMarker?.sourceRepository !==
		'https://github.com/christopherjnelson/n8n-community-node-template'
)
	fail('Template v2 marker is invalid');

for (const heading of [
	'## Installation',
	'## Compatibility',
	'## Credentials',
	'## Operations',
	'## License',
]) {
	if (!readme.includes(heading)) fail(`README is missing ${heading}`);
}
if (hasPlaceholder(readme)) fail('README still contains a placeholder');

for (const path of [
	'LICENSE.md',
	'CHANGELOG.md',
	'RELEASING.md',
	'docs/api-matrix.md',
	'docs/testing.md',
	'docs/branding.md',
	'docs/BATCH_HANDOFF_TEMPLATE.md',
	'docs/TEMPLATE_MIGRATIONS.md',
	'.github/pull_request_template.md',
]) {
	if (!existsSync(resolve(root, path))) fail(`${path} is required`);
}

const expectedIconHashes = {
	'nodes/StudioCms/studioCms.svg':
		'5276da8af87725a949a580e824a9ce771de68c4a4560a1e81938687b9db49af6',
	'nodes/StudioCms/studioCms.dark.svg':
		'e3931df40a46753f93cbcd6197f7e972dde2c322920cc95c40730412333aa5fc',
};
for (const [path, expectedHash] of Object.entries(expectedIconHashes)) {
	const hash = createHash('sha256')
		.update(readFileSync(resolve(root, path)))
		.digest('hex');
	if (hash !== expectedHash) fail(`StudioCMS icon hash changed: ${path}`);
}

try {
	const origin = execFileSync('git', ['remote', 'get-url', 'origin'], {
		cwd: root,
		encoding: 'utf8',
	}).trim();
	const normalizedOrigin = origin
		.replace(/^git@github\.com:/, 'https://github.com/')
		.replace(/\.git$/, '');
	const normalizedRepository = String(packageJson.repository?.url ?? '')
		.replace(/^git\+/, '')
		.replace(/\.git$/, '');
	if (normalizedOrigin.toLowerCase() !== normalizedRepository.toLowerCase()) {
		fail(`repository.url must match origin (${expectedRepository})`);
	}
} catch (error) {
	// Some restricted runners return EPERM after git has already produced stdout.
	const origin = String(error?.stdout ?? '').trim();
	const normalizedOrigin = origin
		.replace(/^git@github\.com:/, 'https://github.com/')
		.replace(/\.git$/, '');
	if (!origin || normalizedOrigin.toLowerCase() !== expectedRepository.toLowerCase()) {
		fail('unable to verify the GitHub origin');
	}
}

if (failures.length) {
	console.error('Release audit failed:\n');
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log(`Release audit passed for ${packageJson.name}@${packageJson.version}`);
