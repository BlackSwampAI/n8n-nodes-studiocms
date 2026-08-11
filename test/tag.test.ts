import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import { StudioCms } from '../nodes/StudioCms/StudioCms.node';
import { createExecuteContext } from './helpers';

const tag = {
	id: 123,
	description: 'Product announcements',
	name: 'Announcements',
	slug: 'announcements',
	meta: '{"featured":true}',
};

async function execute(context: ReturnType<typeof createExecuteContext>) {
	return await new StudioCms().execute.call(context);
}

function tagParameters(operation: string, values: Record<string, unknown> = {}) {
	return { resource: 'tag', operation, ...values };
}

describe('Tag operations', () => {
	it('exposes only the contracted tag operations', () => {
		const properties = new StudioCms().description.properties;
		const resource = properties.find((property) => property.name === 'resource');
		const operation = properties.find(
			(property) =>
				property.name === 'operation' && property.displayOptions?.show?.resource?.includes('tag'),
		);
		const filters = properties.find(
			(property) =>
				property.name === 'filters' && property.displayOptions?.show?.resource?.includes('tag'),
		);

		expect(resource?.options).toEqual([
			expect.objectContaining({ name: 'Category', value: 'category' }),
			expect.objectContaining({ name: 'Connection', value: 'connection' }),
			expect.objectContaining({ name: 'Tag', value: 'tag' }),
		]);
		expect(operation?.options).toEqual([
			expect.objectContaining({ value: 'create' }),
			expect.objectContaining({ value: 'delete' }),
			expect.objectContaining({ value: 'get' }),
			expect.objectContaining({ value: 'getMany' }),
			expect.objectContaining({ value: 'update' }),
		]);
		expect(filters?.options).toEqual([
			expect.objectContaining({ name: 'name', displayName: 'Name' }),
		]);
	});

	it('creates a tag with the StudioCMS 0.4.4 payload shape', async () => {
		const httpRequest = vi.fn().mockResolvedValue(tag);
		const context = createExecuteContext({
			httpRequest,
			parameters: [
				tagParameters('create', {
					name: 'Announcements',
					slug: 'announcements',
					description: 'Product announcements',
					meta: '{"featured":true}',
				}),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: tag, pairedItem: { item: 0 } }]);
		expect(httpRequest).toHaveBeenCalledWith('studioCmsApi', {
			method: 'POST',
			url: 'https://cms.example.com/studiocms_api/rest/v1/tags',
			headers: { Accept: 'application/json' },
			body: {
				name: 'Announcements',
				slug: 'announcements',
				description: 'Product announcements',
				meta: '{"featured":true}',
			},
			timeout: 30_000,
			json: true,
		});
	});

	it('gets a tag by numeric ID', async () => {
		const httpRequest = vi.fn().mockResolvedValue(tag);
		const context = createExecuteContext({
			httpRequest,
			parameters: [tagParameters('get', { tagId: 123 })],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: tag, pairedItem: { item: 0 } }]);
		expect(httpRequest.mock.calls[0][1]).toMatchObject({
			method: 'GET',
			url: 'https://cms.example.com/studiocms_api/rest/v1/tags/123',
		});
	});

	it('gets name-filtered tags, applies the requested limit, and pairs every result', async () => {
		const secondTag = { ...tag, id: 456, name: 'More Announcements' };
		const httpRequest = vi.fn().mockResolvedValue([tag, secondTag]);
		const context = createExecuteContext({
			httpRequest,
			inputItems: [{ json: { input: 1 } }],
			parameters: [
				tagParameters('getMany', {
					filters: { name: 'Announcements' },
					returnAll: false,
					limit: 1,
				}),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: tag, pairedItem: { item: 0 } }]);
		expect(httpRequest.mock.calls[0][1]).toMatchObject({
			method: 'GET',
			url: 'https://cms.example.com/studiocms_api/rest/v1/tags',
			qs: { name: 'Announcements' },
		});
	});

	it('sends no unsupported filters when getting all tags', async () => {
		const httpRequest = vi.fn().mockResolvedValue([tag]);
		const context = createExecuteContext({
			httpRequest,
			parameters: [tagParameters('getMany', { filters: {}, returnAll: true })],
		});

		await execute(context);

		expect(httpRequest.mock.calls[0][1]).toMatchObject({ qs: {} });
	});

	it('updates only selected fields and encodes metadata for StudioCMS', async () => {
		const updated = { ...tag, name: 'Updates', meta: '{"featured":false}' };
		const httpRequest = vi.fn().mockResolvedValue(updated);
		const context = createExecuteContext({
			httpRequest,
			parameters: [
				tagParameters('update', {
					tagId: 123,
					updateFields: { name: 'Updates', meta: { featured: false } },
				}),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: updated, pairedItem: { item: 0 } }]);
		expect(httpRequest.mock.calls[0][1]).toMatchObject({
			method: 'PATCH',
			url: 'https://cms.example.com/studiocms_api/rest/v1/tags/123',
			body: { name: 'Updates', meta: '{"featured":false}' },
		});
	});

	it('reconciles an updated tag into stale Get Many results during the StudioCMS cache window', async () => {
		const updated = {
			...tag,
			name: 'Fresh Name',
			slug: 'fresh-name',
			description: 'Fresh description',
		};
		const stale = { ...tag };
		const updateRequest = vi.fn().mockResolvedValue(updated);
		const updateContext = createExecuteContext({
			httpRequest: updateRequest,
			siteUrls: ['https://cache.example.com'],
			parameters: [
				tagParameters('update', {
					tagId: 123,
					updateFields: {
						name: 'Fresh Name',
						slug: 'fresh-name',
						description: 'Fresh description',
					},
				}),
			],
		});

		await execute(updateContext);

		const getManyRequest = vi.fn().mockResolvedValue([stale]);
		const getManyContext = createExecuteContext({
			httpRequest: getManyRequest,
			siteUrls: ['https://cache.example.com'],
			parameters: [
				tagParameters('getMany', { filters: {}, returnAll: true }),
			],
		});

		const [output] = await execute(getManyContext);

		expect(output).toEqual([{ json: updated, pairedItem: { item: 0 } }]);
		expect(getManyRequest.mock.calls[0][1]).toMatchObject({
			qs: {},
		});
	});

	it('deletes a tag and returns the contracted success object', async () => {
		const httpRequest = vi.fn().mockResolvedValue({ success: true });
		const context = createExecuteContext({
			httpRequest,
			parameters: [tagParameters('delete', { tagId: 123 })],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: { success: true }, pairedItem: { item: 0 } }]);
		expect(httpRequest.mock.calls[0][1]).toMatchObject({
			method: 'DELETE',
			url: 'https://cms.example.com/studiocms_api/rest/v1/tags/123',
		});
	});

	it('executes multiple tag input items with their own parameters and pairing', async () => {
		const secondTag = { ...tag, id: 456, name: 'Guides', slug: 'guides' };
		const httpRequest = vi.fn().mockResolvedValueOnce(tag).mockResolvedValueOnce(secondTag);
		const context = createExecuteContext({
			httpRequest,
			inputItems: [{ json: { input: 1 } }, { json: { input: 2 } }],
			parameters: [
				tagParameters('get', { tagId: 123 }),
				tagParameters('get', { tagId: 456 }),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([
			{ json: tag, pairedItem: { item: 0 } },
			{ json: secondTag, pairedItem: { item: 1 } },
		]);
		expect(httpRequest.mock.calls.map((call) => call[1].url)).toEqual([
			'https://cms.example.com/studiocms_api/rest/v1/tags/123',
			'https://cms.example.com/studiocms_api/rest/v1/tags/456',
		]);
	});

	it.each([
		['create', { name: 'News', slug: 'news', description: 'News', meta: '{}' }],
		['delete', { tagId: 123 }],
		['get', { tagId: 123 }],
		['getMany', { filters: {}, returnAll: true }],
		['update', { tagId: 123, updateFields: { name: 'Updates' } }],
	])(
		'returns a paired sanitized API error for %s when continueOnFail is enabled',
		async (operation, values) => {
			const httpRequest = vi.fn().mockRejectedValue({
				config: { headers: { Authorization: 'Bearer forbidden-token' } },
				response: { status: 400, data: { error: 'Invalid tag request' } },
			});
			const context = createExecuteContext({
				continueOnFail: true,
				httpRequest,
				parameters: [tagParameters(operation, values)],
			});

			const [output] = await execute(context);

			expect(output).toEqual([
				{ json: { error: 'StudioCMS rejected the request' }, pairedItem: { item: 0 } },
			]);
			expect(JSON.stringify(output)).not.toContain('forbidden-token');
		},
	);

	it.each([
		['create', { name: 'News', slug: 'news', description: 'News', meta: '{}' }, []],
		['delete', { tagId: 123 }, { success: 'yes' }],
		['get', { tagId: 123 }, { id: 123 }],
		['getMany', { filters: {}, returnAll: true }, [{ id: 123 }]],
		['update', { tagId: 123, updateFields: { name: 'Updates' } }, { id: 123 }],
	])('rejects a malformed successful response for %s', async (operation, values, response) => {
		const context = createExecuteContext({
			httpRequest: vi.fn().mockResolvedValue(response),
			parameters: [tagParameters(operation, values)],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS returned a malformed response' });
		expect((error as NodeApiError).context.itemIndex).toBe(0);
	});

	it.each([
		['create', { name: 'News', slug: 'news', description: 'News', meta: '[]' }],
		['update', { tagId: 123, updateFields: { meta: 'not-json' } }],
	])('rejects invalid metadata for %s before making a request', async (operation, values) => {
		const httpRequest = vi.fn();
		const context = createExecuteContext({
			httpRequest,
			parameters: [tagParameters(operation, values)],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).toMatchObject({ message: 'Tag Metadata must be a valid JSON object' });
		expect(httpRequest).not.toHaveBeenCalled();
	});

	it('rejects an empty update before making a request', async () => {
		const httpRequest = vi.fn();
		const context = createExecuteContext({
			httpRequest,
			parameters: [tagParameters('update', { tagId: 123, updateFields: {} })],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).toMatchObject({ message: 'Add at least one field to update' });
		expect(httpRequest).not.toHaveBeenCalled();
	});

	it('continues with later tag items after an API failure when continueOnFail is enabled', async () => {
		const secondTag = { ...tag, id: 456 };
		const httpRequest = vi
			.fn()
			.mockRejectedValueOnce({ response: { status: 500, data: { error: 'Database failed' } } })
			.mockResolvedValueOnce(secondTag);
		const context = createExecuteContext({
			continueOnFail: true,
			httpRequest,
			inputItems: [{ json: { input: 1 } }, { json: { input: 2 } }],
			parameters: [
				tagParameters('get', { tagId: 123 }),
				tagParameters('get', { tagId: 456 }),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([
			{ json: { error: 'StudioCMS service failure' }, pairedItem: { item: 0 } },
			{ json: secondTag, pairedItem: { item: 1 } },
		]);
		expect(httpRequest).toHaveBeenCalledTimes(2);
	});

	it('stops tag execution on the first failure when continueOnFail is disabled', async () => {
		const httpRequest = vi
			.fn()
			.mockRejectedValueOnce({ response: { status: 500, data: { error: 'Database failed' } } })
			.mockResolvedValueOnce(tag);
		const context = createExecuteContext({
			httpRequest,
			inputItems: [{ json: { input: 1 } }, { json: { input: 2 } }],
			parameters: [
				tagParameters('get', { tagId: 123 }),
				tagParameters('get', { tagId: 456 }),
			],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS service failure' });
		expect(httpRequest).toHaveBeenCalledTimes(1);
	});
});
