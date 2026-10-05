import { describe, expect, it } from 'vitest';
import { createDevProcessOptions, DEV_PORT, DEV_USER_FOLDER } from '../scripts/dev.mjs';

describe('development launcher', () => {
	it('forces the disposable n8n port while preserving the environment', () => {
		const options = createDevProcessOptions({ PATH: '/bin', N8N_PORT: '5678' }, [
			'--custom-user-folder',
			'/workspace/custom-user',
		]);
		expect(DEV_PORT).toBe('5690');
		expect(options.environment).toMatchObject({ PATH: '/bin', N8N_PORT: '5690' });
		expect(options.arguments).toEqual(['dev', '--custom-user-folder', '/workspace/custom-user']);
	});

	it('defaults the user folder to an isolated workspace path', () => {
		const options = createDevProcessOptions({ PATH: '/bin' }, []);
		expect(options.arguments).toEqual(['dev', '--custom-user-folder', DEV_USER_FOLDER]);
		expect(DEV_USER_FOLDER).toContain('/.codex-scratch/n8n-dev');
	});

	it('preserves an explicitly assigned custom user folder', () => {
		const options = createDevProcessOptions({ PATH: '/bin' }, [
			'--custom-user-folder=/workspace/n8n',
		]);
		expect(options.arguments).toEqual(['dev', '--custom-user-folder=/workspace/n8n']);
	});
});
