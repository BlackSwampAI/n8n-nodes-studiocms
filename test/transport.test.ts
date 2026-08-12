import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import {
	normalizeSiteUrl,
	studioCmsCollectionRequest,
	studioCmsObjectRequest,
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

	it('passes optional query parameters and bodies through the shared authenticated helper', async () => {
		const httpRequest = vi.fn().mockResolvedValue({ id: 123 });
		const context = createExecuteContext({ httpRequest });

		await studioCmsObjectRequest.call(context, {
			method: 'PATCH',
			path: '/categories/123',
			itemIndex: 0,
			body: { name: 'News' },
			qs: { preview: true },
		});

		expect(httpRequest.mock.calls[0][1]).toMatchObject({
			method: 'PATCH',
			body: { name: 'News' },
			qs: { preview: true },
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

	it.each([
		['tags', 'tag'],
		['categories', 'category'],
	])(
		'maps an empty HTTP 500 for missing %s after confirming authentication',
		async (path, resource) => {
			const httpRequest = vi
				.fn()
				.mockRejectedValueOnce({ response: { status: 500, data: '' } })
				.mockResolvedValueOnce([]);
			const context = createExecuteContext({ httpRequest });

			const error = await studioCmsObjectRequest
				.call(context, { method: 'GET', path: `/${path}/987`, itemIndex: 2 })
				.catch((caught: unknown) => caught);

			expect(error).toBeInstanceOf(NodeApiError);
			expect(error).toMatchObject({
				message: `StudioCMS ${resource} not found`,
				httpCode: '404',
			});
			expect((error as NodeApiError).context.itemIndex).toBe(2);
			expect((error as NodeApiError).description).toBe(
				`No ${resource} exists with ID 987.`,
			);
			expect(httpRequest).toHaveBeenCalledTimes(2);
			expect(httpRequest.mock.calls[1][1]).toMatchObject({
				method: 'GET',
				url: 'https://cms.example.com/studiocms_api/rest/v1/categories',
			});
		},
	);

	it('preserves invalid-token mapping when the missing-tag authentication probe also fails', async () => {
		const httpRequest = vi
			.fn()
			.mockRejectedValue({ response: { status: 500, data: '' } });
		const context = createExecuteContext({ httpRequest });

		const error = await studioCmsObjectRequest
			.call(context, { method: 'GET', path: '/tags/987', itemIndex: 3 })
			.catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS authentication failed', httpCode: '500' });
		expect((error as NodeApiError).context.itemIndex).toBe(3);
		expect(httpRequest).toHaveBeenCalledTimes(2);
	});

	it('maps an empty HTTP 500 for a missing folder GET after confirming authentication', async () => {
		const httpRequest = vi
			.fn()
			.mockRejectedValueOnce({ response: { status: 500, data: '' } })
			.mockResolvedValueOnce([]);
		const context = createExecuteContext({ httpRequest });

		const error = await studioCmsObjectRequest
			.call(context, { method: 'GET', path: '/folders/folder%2Fid', itemIndex: 6 })
			.catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS folder not found', httpCode: '404' });
		expect((error as NodeApiError).context.itemIndex).toBe(6);
		expect((error as NodeApiError).description).toBe('No folder exists with ID folder/id.');
		expect(httpRequest).toHaveBeenCalledTimes(2);
	});

	it.each(['DELETE', 'PATCH'] as const)(
		'maps an empty HTTP 500 for a missing folder on %s after verifying the target is absent',
		async (method) => {
			const httpRequest = vi
				.fn()
				.mockRejectedValueOnce({ response: { status: 500, data: '' } })
				.mockResolvedValueOnce([])
				.mockRejectedValueOnce({ response: { status: 500, data: '' } });
			const context = createExecuteContext({ httpRequest });

			const error = await studioCmsObjectRequest
				.call(context, { method, path: '/folders/missing', itemIndex: 6 })
				.catch((caught: unknown) => caught);

			expect(error).toBeInstanceOf(NodeApiError);
			expect(error).toMatchObject({ message: 'StudioCMS folder not found', httpCode: '404' });
			expect(httpRequest).toHaveBeenCalledTimes(3);
			expect(httpRequest.mock.calls[2][1]).toMatchObject({
				method: 'GET',
				url: 'https://cms.example.com/studiocms_api/rest/v1/folders/missing',
			});
		},
	);

	it('reports the child-folder constraint when StudioCMS returns an empty 500 for delete', async () => {
		const httpRequest = vi
			.fn()
			.mockRejectedValueOnce({ response: { status: 500, data: '' } })
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce({ id: 'parent-id', name: 'Parent', parent: null })
			.mockResolvedValueOnce([{ id: 'child-id', name: 'Child', parent: 'parent-id' }]);
		const context = createExecuteContext({ httpRequest });

		const error = await studioCmsObjectRequest
			.call(context, { method: 'DELETE', path: '/folders/parent-id', itemIndex: 8 })
			.catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({
			message: 'StudioCMS folder cannot be deleted',
			httpCode: '500',
		});
		expect((error as NodeApiError).description).toBe(
			'Remove its child folders before deleting it.',
		);
		expect(httpRequest).toHaveBeenCalledTimes(4);
		expect(httpRequest.mock.calls[3][1]).toMatchObject({
			method: 'GET',
			url: 'https://cms.example.com/studiocms_api/rest/v1/folders',
			qs: { parent: 'parent-id' },
		});
	});

	it('preserves invalid-token mapping when the missing-folder authentication probe also fails', async () => {
		const httpRequest = vi.fn().mockRejectedValue({ response: { status: 500, data: '' } });
		const context = createExecuteContext({ httpRequest });

		const error = await studioCmsObjectRequest
			.call(context, { method: 'GET', path: '/folders/missing', itemIndex: 7 })
			.catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS authentication failed', httpCode: '500' });
		expect((error as NodeApiError).context.itemIndex).toBe(7);
		expect(httpRequest).toHaveBeenCalledTimes(2);
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

	it.each([null, [], 'not-json'])(
		'rejects malformed successful object responses: %j',
		async (response) => {
			const context = createExecuteContext({
				httpRequest: vi.fn().mockResolvedValue(response),
			});

			const error = await studioCmsObjectRequest
				.call(context, { method: 'GET', path: '/categories/1', itemIndex: 3 })
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
