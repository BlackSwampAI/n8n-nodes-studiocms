import { NodeApiError } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import { StudioCms } from '../nodes/StudioCms/StudioCms.node';
import { createExecuteContext } from './helpers';

async function execute(context: ReturnType<typeof createExecuteContext>) {
	return await new StudioCms().execute.call(context);
}

describe('Connection: Check', () => {
	it('checks every input item and preserves pairing', async () => {
		const httpRequest = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 1 }]);
		const context = createExecuteContext({
			httpRequest,
			inputItems: [{ json: { input: 1 } }, { json: { input: 2 } }],
			siteUrls: ['https://one.example.com/', 'https://two.example.com'],
		});

		const [output] = await execute(context);

		expect(output).toEqual([
			{ json: { connected: true }, pairedItem: { item: 0 } },
			{ json: { connected: true }, pairedItem: { item: 1 } },
		]);
		expect(httpRequest).toHaveBeenCalledTimes(2);
		expect(httpRequest.mock.calls.map((call) => call[1].url)).toEqual([
			'https://one.example.com/studiocms_api/rest/v1/categories',
			'https://two.example.com/studiocms_api/rest/v1/categories',
		]);
	});

	it('continues after an item failure and sanitizes the paired error output', async () => {
		const httpRequest = vi
			.fn()
			.mockRejectedValueOnce({
				config: { headers: { Authorization: 'Bearer forbidden-token' } },
				response: { status: 401, data: { error: 'Invalid API token' } },
			})
			.mockResolvedValueOnce([]);
		const context = createExecuteContext({
			continueOnFail: true,
			httpRequest,
			inputItems: [{ json: { input: 1 } }, { json: { input: 2 } }],
		});

		const [output] = await execute(context);

		expect(output).toEqual([
			{ json: { error: 'StudioCMS authentication failed' }, pairedItem: { item: 0 } },
			{ json: { connected: true }, pairedItem: { item: 1 } },
		]);
		expect(httpRequest).toHaveBeenCalledTimes(2);
		expect(JSON.stringify(output)).not.toContain('forbidden-token');
	});

	it('stops on the first failure when continueOnFail is disabled', async () => {
		const httpRequest = vi
			.fn()
			.mockRejectedValueOnce({ response: { status: 500, data: { error: 'Database failed' } } });
		const context = createExecuteContext({
			httpRequest,
			inputItems: [{ json: { input: 1 } }, { json: { input: 2 } }],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS service failure' });
		expect((error as NodeApiError).context.itemIndex).toBe(0);
		expect(httpRequest).toHaveBeenCalledTimes(1);
	});
});
