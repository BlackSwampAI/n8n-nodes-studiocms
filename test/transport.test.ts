import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import {
	normalizeSiteUrl,
	studioCmsCollectionRequest,
} from '../nodes/StudioCms/transport/request';
import { createExecuteContext } from './helpers';

function responseError(status: number, message: string): unknown {
	return {
		config: { headers: { Authorization: 'Bearer should-never-appear' } },
		response: { status, data: { error: message } },
	};
}

describe('StudioCMS transport', () => {
	it.each([
		['https://cms.example.com', 'https://cms.example.com'],
		['https://cms.example.com/', 'https://cms.example.com'],
		[' https://cms.example.com/// ', 'https://cms.example.com'],
		['http://localhost:4321/cms/', 'http://localhost:4321/cms'],
	])('normalizes the site URL %s', (input, expected) => {
		const context = createExecuteContext();
		expect(normalizeSiteUrl(input, context.getNode())).toBe(expected);
	});

	it.each([
		['', 'required'],
		['cms.example.com', 'valid HTTP or HTTPS'],
		['ftp://cms.example.com', 'use HTTP or HTTPS'],
		['https://user:secret@cms.example.com', 'username or password'],
		['https://cms.example.com/?draft=true', 'query string or fragment'],
	])('rejects the unsafe site URL %s', (input, expectedMessage) => {
		const context = createExecuteContext();
		expect(() => normalizeSiteUrl(input, context.getNode())).toThrow(expectedMessage);
	});

	it('uses the shared authenticated helper and normalized REST API v1 URL', async () => {
		const httpRequest = vi.fn().mockResolvedValue([]);
		const context = createExecuteContext({
			httpRequest,
			siteUrls: ['https://cms.example.com///'],
		});

		await studioCmsCollectionRequest.call(context, {
			method: 'GET',
			path: '/categories',
			itemIndex: 0,
		});

		expect(httpRequest).toHaveBeenCalledWith('studioCmsApi', {
			method: 'GET',
			url: 'https://cms.example.com/studiocms_api/rest/v1/categories',
			headers: { Accept: 'application/json' },
			timeout: 30_000,
			json: true,
		});
	});

	it.each([
		[401, 'Invalid API token', 'StudioCMS authentication failed'],
		[403, 'Unauthorized', 'StudioCMS request forbidden'],
		[404, 'Endpoint not found', 'StudioCMS API endpoint not found'],
		[422, 'Invalid request', 'StudioCMS rejected the request'],
		[500, 'Database query failed', 'StudioCMS service failure'],
	])('maps HTTP %i API errors consistently', async (status, apiMessage, expectedMessage) => {
		const context = createExecuteContext({
			httpRequest: vi.fn().mockRejectedValue(responseError(status, apiMessage)),
		});

		const error = await studioCmsCollectionRequest
			.call(context, { method: 'GET', path: '/categories', itemIndex: 4 })
			.catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: expectedMessage, httpCode: String(status) });
		expect((error as NodeApiError).context.itemIndex).toBe(4);
		expect(JSON.stringify(error)).not.toContain('should-never-appear');
	});

	it('maps the empty HTTP 500 returned by StudioCMS 0.4.4 for invalid tokens', async () => {
		const context = createExecuteContext({
			httpRequest: vi.fn().mockRejectedValue({ response: { status: 500, data: '' } }),
		});

		const error = await studioCmsCollectionRequest
			.call(context, { method: 'GET', path: '/categories', itemIndex: 1 })
			.catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS authentication failed', httpCode: '500' });
		expect((error as NodeApiError).context.itemIndex).toBe(1);
	});

	it('maps network failures without exposing authorization data', async () => {
		const failure = Object.assign(new Error('socket failed'), {
			config: { headers: { Authorization: 'Bearer should-never-appear' } },
		});
		const context = createExecuteContext({ httpRequest: vi.fn().mockRejectedValue(failure) });

		const error = (await studioCmsCollectionRequest
			.call(context, { method: 'GET', path: '/categories', itemIndex: 2 })
			.catch((caught: unknown) => caught)) as NodeApiError;

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error.message).toBe('Unable to reach StudioCMS');
		expect(error.context.itemIndex).toBe(2);
		expect(JSON.stringify(error)).not.toContain('should-never-appear');
	});

	it.each([null, {}, 'not-json', [{ id: 1 }, null]])(
		'rejects malformed successful responses: %j',
		async (response) => {
			const context = createExecuteContext({
				httpRequest: vi.fn().mockResolvedValue(response),
			});

			const error = await studioCmsCollectionRequest
				.call(context, { method: 'GET', path: '/categories', itemIndex: 3 })
				.catch((caught: unknown) => caught);

			expect(error).toBeInstanceOf(NodeApiError);
			expect(error).toMatchObject({ message: 'StudioCMS returned a malformed response' });
			expect((error as NodeApiError).context.itemIndex).toBe(3);
		},
	);

	it('reports invalid credential site URLs as item-scoped operation errors', async () => {
		const context = createExecuteContext({ siteUrls: ['cms.example.com'] });

		const error = await studioCmsCollectionRequest
			.call(context, { method: 'GET', path: '/categories', itemIndex: 5 })
			.catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).toMatchObject({ message: 'StudioCMS Site URL must be a valid HTTP or HTTPS URL' });
		expect((error as NodeOperationError).context.itemIndex).toBe(5);
	});
});
